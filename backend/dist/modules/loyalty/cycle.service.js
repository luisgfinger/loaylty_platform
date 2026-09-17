import { prisma } from "../../lib/prisma.js";
import { calculateDailyProgress, calculateFrequencyLevel, calculateMedian, calculateRegularity, calculateValueLevel, } from "./loyalty.engine.js";
import { createPendingCustomerRewardsForProgress, } from "../rewards/customer-reward.service.js";
// =====================================================
// FUNÇÕES DE DATA
// =====================================================
/**
 * Retorna o início do dia.
 *
 * Exemplo:
 * 09/09/2026 15:32
 *
 * vira:
 * 09/09/2026 00:00
 */
function startOfDay(date) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}
/**
 * Adiciona determinada quantidade
 * de dias a uma data.
 */
function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}
/**
 * Gera uma chave YYYY-MM-DD.
 *
 * Utilizada para contar apenas
 * dias diferentes com compra.
 *
 * Várias compras no mesmo dia
 * continuam contando como 1 dia.
 */
function getDayKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
// =====================================================
// MEDIANA DA EMPRESA
// =====================================================
/**
 * Calcula a mediana de gasto dos clientes
 * da empresa exatamente dentro da janela
 * informada.
 *
 * A mesma função é utilizada tanto:
 *
 * - no cálculo diário de progresso;
 * - no fechamento definitivo do ciclo.
 *
 * Clientes sem compra no período
 * não entram no cálculo.
 */
async function getCompanyMedian(tx, companyId, periodStart, periodEnd) {
    // ==================================================
    // BUSCAR TODAS AS COMPRAS DA EMPRESA
    // NA MESMA JANELA
    // ==================================================
    const purchases = await tx.purchase.findMany({
        where: {
            purchaseDate: {
                gte: periodStart,
                lt: periodEnd,
            },
            customer: {
                companyPerson: {
                    Company_idCompany: companyId,
                },
            },
        },
        select: {
            CompanyCustomer_idCompanyCustomer: true,
            amount: true,
        },
    });
    // ==================================================
    // SOMAR O TOTAL DE CADA CLIENTE
    // ==================================================
    const customerTotals = new Map();
    for (const purchase of purchases) {
        const customerId = purchase
            .CompanyCustomer_idCompanyCustomer;
        const currentTotal = customerTotals.get(customerId) ?? 0;
        customerTotals.set(customerId, currentTotal +
            Number(purchase.amount));
    }
    const totals = Array.from(customerTotals.values()).filter((value) => value > 0);
    const sampleSize = totals.length;
    const calculatedMedian = calculateMedian(totals);
    // ==================================================
    // CONFIGURAÇÕES DA EMPRESA
    // ==================================================
    const settings = await tx
        .companyLoyaltySettings
        .findUnique({
        where: {
            Company_idCompany: companyId,
        },
    });
    const minimumCustomers = settings
        ?.minimumMedianCustomers ??
        20;
    // ==================================================
    // 1. MEDIANA DINÂMICA
    // ==================================================
    if (calculatedMedian !== null &&
        sampleSize >= minimumCustomers) {
        return {
            median: calculatedMedian,
            sampleSize,
        };
    }
    // ==================================================
    // 2. ÚLTIMA MEDIANA CONFIÁVEL
    // ==================================================
    const lastReliableCycle = await tx.customerCycle.findFirst({
        where: {
            status: "CLOSED",
            medianSampleSize: {
                gte: minimumCustomers,
            },
            companyMedian: {
                not: null,
            },
            customer: {
                companyPerson: {
                    Company_idCompany: companyId,
                },
            },
        },
        orderBy: {
            closedAt: "desc",
        },
        select: {
            companyMedian: true,
        },
    });
    if (lastReliableCycle
        ?.companyMedian !== null &&
        lastReliableCycle
            ?.companyMedian !== undefined) {
        return {
            median: Number(lastReliableCycle
                .companyMedian),
            sampleSize,
        };
    }
    // ==================================================
    // 3. MEDIANA INICIAL / FALLBACK
    // ==================================================
    if (settings?.fallbackMedian !== null &&
        settings?.fallbackMedian !== undefined) {
        return {
            median: Number(settings
                .fallbackMedian),
            sampleSize,
        };
    }
    // ==================================================
    // NENHUMA MEDIANA DISPONÍVEL
    // ==================================================
    return {
        median: null,
        sampleSize,
    };
}
// =====================================================
// PROCESSAR PROGRESSO DIÁRIO DE UM CICLO
// =====================================================
/**
 * Processa os dias com compra que já terminaram
 * e ainda não foram contabilizados no ciclo.
 *
 * Não é criada uma tabela diária.
 *
 * CustomerCycle.purchaseDays funciona como o número
 * de dias distintos com compra que já tiveram seu
 * progresso contabilizado.
 *
 * CustomerCycle.progressEarned acumula o progresso
 * já conquistado naquele ciclo.
 *
 * CustomerJourney.progress recebe somente o novo
 * progresso ainda não contabilizado.
 */
async function processCycleDailyProgress(tx, cycleId, referenceDate) {
    const cycle = await tx.customerCycle.findUnique({
        where: {
            idCustomerCycle: cycleId,
        },
        include: {
            customer: {
                include: {
                    companyPerson: true,
                },
            },
        },
    });
    if (!cycle) {
        throw new Error("CYCLE_NOT_FOUND");
    }
    if (cycle.status ===
        "CLOSED") {
        return;
    }
    const customerId = cycle
        .CompanyCustomer_idCompanyCustomer;
    const companyId = cycle
        .customer
        .companyPerson
        .Company_idCompany;
    // Somente dias já encerrados podem gerar progresso.
    const todayStart = startOfDay(referenceDate);
    const processingEnd = todayStart < cycle.cycleEnd
        ? todayStart
        : cycle.cycleEnd;
    if (processingEnd <=
        cycle.cycleStart) {
        return;
    }
    // ==================================================
    // COMPRAS DO CLIENTE ATÉ O FIM DA JANELA PROCESSÁVEL
    // ==================================================
    const purchases = await tx.purchase.findMany({
        where: {
            CompanyCustomer_idCompanyCustomer: customerId,
            purchaseDate: {
                gte: cycle.cycleStart,
                lt: processingEnd,
            },
        },
        orderBy: {
            purchaseDate: "asc",
        },
    });
    if (purchases.length === 0) {
        return;
    }
    // ==================================================
    // DIAS DISTINTOS COM COMPRA
    // ==================================================
    const uniquePurchaseDays = [];
    const seenDays = new Set();
    for (const purchase of purchases) {
        const dayKey = getDayKey(purchase.purchaseDate);
        if (seenDays.has(dayKey)) {
            continue;
        }
        seenDays.add(dayKey);
        uniquePurchaseDays.push(startOfDay(purchase.purchaseDate));
    }
    const alreadyProcessedDays = Math.min(cycle.purchaseDays ?? 0, uniquePurchaseDays.length);
    if (alreadyProcessedDays >=
        uniquePurchaseDays.length) {
        return;
    }
    // ==================================================
    // CALCULAR SOMENTE OS NOVOS DIAS
    // ==================================================
    let purchaseCursor = 0;
    let cumulativeAmount = 0;
    let progressToAdd = 0;
    let finalFrequencyLevel = "LOW";
    let finalValueLevel = "LOW";
    let finalMedian = null;
    let finalMedianPercentage = 0;
    let finalMedianSampleSize = 0;
    for (let index = 0; index < uniquePurchaseDays.length; index += 1) {
        const purchaseDay = uniquePurchaseDays[index];
        const dayEnd = addDays(purchaseDay, 1);
        // Soma todas as compras do cliente
        // desde o início do ciclo até o fim
        // deste dia.
        while (purchaseCursor <
            purchases.length &&
            purchases[purchaseCursor].purchaseDate < dayEnd) {
            cumulativeAmount +=
                Number(purchases[purchaseCursor].amount);
            purchaseCursor += 1;
        }
        // Os dias anteriores já foram
        // contabilizados em execuções passadas.
        if (index <
            alreadyProcessedDays) {
            continue;
        }
        const purchaseDays = index + 1;
        const frequencyLevel = calculateFrequencyLevel(purchaseDays);
        const medianResult = await getCompanyMedian(tx, companyId, cycle.cycleStart, dayEnd);
        if (medianResult.median === null ||
            medianResult.median <= 0) {
            throw new Error("LOYALTY_MEDIAN_NOT_CONFIGURED");
        }
        const medianPercentage = (cumulativeAmount /
            medianResult.median) * 100;
        const valueLevel = calculateValueLevel(medianPercentage);
        const dailyProgress = calculateDailyProgress(frequencyLevel, valueLevel);
        progressToAdd +=
            dailyProgress;
        finalFrequencyLevel =
            frequencyLevel;
        finalValueLevel =
            valueLevel;
        finalMedian =
            medianResult.median;
        finalMedianPercentage =
            medianPercentage;
        finalMedianSampleSize =
            medianResult.sampleSize;
    }
    if (progressToAdd <= 0) {
        return;
    }
    const currentCycleProgress = Number(cycle.progressEarned ?? 0);
    const updatedCycleProgress = Number((currentCycleProgress +
        progressToAdd).toFixed(2));
    // ==================================================
    // ATUALIZAR JORNADA
    // ==================================================
    const updatedJourney = await tx.customerJourney.upsert({
        where: {
            CompanyCustomer_idCompanyCustomer: customerId,
        },
        create: {
            CompanyCustomer_idCompanyCustomer: customerId,
            progress: progressToAdd,
            regularity: 1,
        },
        update: {
            progress: {
                increment: progressToAdd,
            },
        },
    });
    // ==================================================
    // GERAR RECOMPENSAS PENDENTES POR MARCO
    // ==================================================
    const newJourneyProgress = Number(updatedJourney.progress);
    const previousJourneyProgress = Number((newJourneyProgress -
        progressToAdd).toFixed(2));
    await createPendingCustomerRewardsForProgress(tx, customerId, previousJourneyProgress, newJourneyProgress, Number(updatedJourney.regularity));
    // ==================================================
    // ATUALIZAR ESTADO DO CICLO
    // ==================================================
    await tx.customerCycle.update({
        where: {
            idCustomerCycle: cycle.idCustomerCycle,
        },
        data: {
            purchaseDays: uniquePurchaseDays.length,
            totalAmount: cumulativeAmount,
            frequencyLevel: finalFrequencyLevel,
            valueLevel: finalValueLevel,
            companyMedian: finalMedian,
            medianPercentage: Number(finalMedianPercentage.toFixed(2)),
            medianSampleSize: finalMedianSampleSize,
            progressEarned: updatedCycleProgress,
        },
    });
}
// =====================================================
// PROCESSAR PROGRESSO DIÁRIO
// =====================================================
/**
 * Processa todos os ciclos OPEN.
 *
 * O scheduler chama esta função de hora em hora,
 * porém apenas dias que já terminaram são considerados.
 *
 * Como purchaseDays registra quantos dias distintos
 * já foram contabilizados, execuções repetidas não
 * voltam a somar os mesmos dias.
 */
export async function processDailyProgress() {
    const now = new Date();
    const todayStart = startOfDay(now);
    const openCycles = await prisma.customerCycle.findMany({
        where: {
            status: "OPEN",
            cycleStart: {
                lt: todayStart,
            },
        },
        select: {
            idCustomerCycle: true,
        },
    });
    for (const cycle of openCycles) {
        await prisma.$transaction(async (tx) => {
            await processCycleDailyProgress(tx, cycle.idCustomerCycle, now);
        });
    }
}
// =====================================================
// FECHAR CICLO
// =====================================================
/**
 * Fecha um CustomerCycle.
 *
 * O progresso já foi conquistado diariamente.
 * No fechamento calculamos e congelamos:
 *
 * - quantidade final de dias com compra;
 * - valor total final;
 * - frequência final;
 * - mediana final da empresa;
 * - nível de valor final;
 * - regularidade;
 * - status CLOSED.
 *
 * O fechamento NÃO adiciona progresso novamente.
 */
export async function closeCustomerCycle(tx, cycleId) {
    // ==================================================
    // BUSCAR CICLO
    // ==================================================
    const initialCycle = await tx.customerCycle.findUnique({
        where: {
            idCustomerCycle: cycleId,
        },
        include: {
            customer: {
                include: {
                    companyPerson: true,
                },
            },
        },
    });
    if (!initialCycle) {
        throw new Error("CYCLE_NOT_FOUND");
    }
    if (initialCycle.status ===
        "CLOSED") {
        return initialCycle;
    }
    // Antes de fechar, garante que todos os dias
    // do ciclo tiveram seu progresso processado.
    // Isso também protege o catch-up feito por
    // ensureCustomerCycle().
    await processCycleDailyProgress(tx, cycleId, initialCycle.cycleEnd);
    // Rebusca o ciclo porque o processamento diário
    // pode ter atualizado progressEarned e outras
    // métricas provisórias.
    const cycle = await tx.customerCycle.findUnique({
        where: {
            idCustomerCycle: cycleId,
        },
        include: {
            customer: {
                include: {
                    companyPerson: true,
                },
            },
        },
    });
    if (!cycle) {
        throw new Error("CYCLE_NOT_FOUND");
    }
    const customerId = cycle
        .CompanyCustomer_idCompanyCustomer;
    const companyId = cycle
        .customer
        .companyPerson
        .Company_idCompany;
    // ==================================================
    // COMPRAS DO CLIENTE NO CICLO
    // ==================================================
    const purchases = await tx.purchase.findMany({
        where: {
            CompanyCustomer_idCompanyCustomer: customerId,
            purchaseDate: {
                gte: cycle.cycleStart,
                lt: cycle.cycleEnd,
            },
        },
        orderBy: {
            purchaseDate: "asc",
        },
    });
    // ==================================================
    // CONTAR DIAS DIFERENTES COM COMPRA
    // ==================================================
    const uniqueDays = new Set();
    for (const purchase of purchases) {
        uniqueDays.add(getDayKey(purchase.purchaseDate));
    }
    const purchaseDays = uniqueDays.size;
    // ==================================================
    // SOMAR VALOR TOTAL DO CICLO
    // ==================================================
    const totalAmount = purchases.reduce((total, purchase) => {
        return (total +
            Number(purchase.amount));
    }, 0);
    // ==================================================
    // FREQUÊNCIA FINAL
    // ==================================================
    const frequencyLevel = calculateFrequencyLevel(purchaseDays);
    // ==================================================
    // MEDIANA FINAL DA EMPRESA
    // ==================================================
    const medianResult = await getCompanyMedian(tx, companyId, cycle.cycleStart, cycle.cycleEnd);
    // ==================================================
    // NÍVEL DE VALOR FINAL
    // ==================================================
    let medianPercentage = 0;
    let valueLevel = "LOW";
    if (totalAmount > 0) {
        if (medianResult.median === null ||
            medianResult.median <= 0) {
            throw new Error("LOYALTY_MEDIAN_NOT_CONFIGURED");
        }
        medianPercentage =
            (totalAmount /
                medianResult.median) * 100;
        valueLevel =
            calculateValueLevel(medianPercentage);
    }
    // ==================================================
    // CICLOS ANTERIORES
    // ==================================================
    const previousCycles = await tx.customerCycle.findMany({
        where: {
            CompanyCustomer_idCompanyCustomer: customerId,
            status: "CLOSED",
            cycleStart: {
                lt: cycle.cycleStart,
            },
        },
        orderBy: {
            cycleStart: "desc",
        },
        take: 2,
    });
    const previousCycle = previousCycles[0];
    let previousFrequency = null;
    if (previousCycle
        ?.frequencyLevel) {
        previousFrequency =
            previousCycle
                .frequencyLevel;
    }
    // ==================================================
    // JORNADA ATUAL DO CLIENTE
    // ==================================================
    const currentJourney = await tx.customerJourney.findUnique({
        where: {
            CompanyCustomer_idCompanyCustomer: customerId,
        },
    });
    const previousRegularity = currentJourney
        ? Number(currentJourney
            .regularity)
        : 1;
    // ==================================================
    // ÚLTIMAS 3 FREQUÊNCIAS
    // ==================================================
    const recentFrequencies = [
        frequencyLevel,
    ];
    for (const previous of previousCycles) {
        if (previous.frequencyLevel) {
            recentFrequencies.push(previous.frequencyLevel);
        }
    }
    const lastThreeFrequencies = recentFrequencies.slice(0, 3);
    // ==================================================
    // REGULARIDADE
    // ==================================================
    const regularityLevel = calculateRegularity(previousRegularity, previousFrequency, frequencyLevel, lastThreeFrequencies);
    // ==================================================
    // FECHAR CICLO
    // ==================================================
    const closedCycle = await tx.customerCycle.update({
        where: {
            idCustomerCycle: cycle
                .idCustomerCycle,
        },
        data: {
            purchaseDays,
            totalAmount,
            frequencyLevel,
            valueLevel,
            regularityLevel,
            companyMedian: medianResult.median,
            medianPercentage: Number(medianPercentage.toFixed(2)),
            medianSampleSize: medianResult.sampleSize,
            // progressEarned NÃO é alterado aqui.
            // Ele já foi acumulado diariamente.
            status: "CLOSED",
            closedAt: new Date(),
        },
    });
    // ==================================================
    // ATUALIZAR CUSTOMER JOURNEY
    //
    // progress NÃO é alterado no fechamento.
    // regularity é atualizada somente por ciclo.
    // ==================================================
    await tx.customerJourney.upsert({
        where: {
            CompanyCustomer_idCompanyCustomer: customerId,
        },
        create: {
            CompanyCustomer_idCompanyCustomer: customerId,
            progress: 0,
            regularity: regularityLevel,
        },
        update: {
            regularity: regularityLevel,
        },
    });
    return closedCycle;
}
// =====================================================
// GARANTIR CICLO ATUAL
// =====================================================
/**
 * Garante que o cliente possui um ciclo OPEN
 * correspondente à data informada.
 *
 * É chamado quando uma compra é registrada.
 *
 * Também faz catch-up caso existam
 * ciclos antigos vencidos.
 */
export async function ensureCustomerCycle(tx, customerId, referenceDate) {
    // ==================================================
    // PROCURAR CICLO ABERTO
    // ==================================================
    let cycle = await tx.customerCycle.findFirst({
        where: {
            CompanyCustomer_idCompanyCustomer: customerId,
            status: "OPEN",
        },
        orderBy: {
            cycleStart: "desc",
        },
    });
    // ==================================================
    // PRIMEIRO CICLO DO CLIENTE
    // ==================================================
    if (!cycle) {
        const firstPurchase = await tx.purchase.findFirst({
            where: {
                CompanyCustomer_idCompanyCustomer: customerId,
            },
            orderBy: {
                purchaseDate: "asc",
            },
            select: {
                purchaseDate: true,
            },
        });
        if (!firstPurchase) {
            return null;
        }
        const cycleStart = startOfDay(firstPurchase
            .purchaseDate);
        const cycleEnd = addDays(cycleStart, 30);
        cycle =
            await tx.customerCycle.create({
                data: {
                    CompanyCustomer_idCompanyCustomer: customerId,
                    cycleStart,
                    cycleEnd,
                    status: "OPEN",
                },
            });
    }
    // ==================================================
    // FECHAR CICLOS VENCIDOS
    // ==================================================
    while (referenceDate >=
        cycle.cycleEnd) {
        await closeCustomerCycle(tx, cycle.idCustomerCycle);
        const nextStart = new Date(cycle.cycleEnd);
        const nextEnd = addDays(nextStart, 30);
        cycle =
            await tx.customerCycle.create({
                data: {
                    CompanyCustomer_idCompanyCustomer: customerId,
                    cycleStart: nextStart,
                    cycleEnd: nextEnd,
                    status: "OPEN",
                },
            });
    }
    return cycle;
}
// =====================================================
// PROCESSAR TODOS OS CICLOS VENCIDOS
// =====================================================
/**
 * Essa função será chamada pelo scheduler.
 *
 * Ela procura todos os clientes que possuem ciclos
 * vencidos e faz o catch-up até o ciclo atual.
 */
export async function processExpiredCycles() {
    const now = new Date();
    const expiredCycles = await prisma.customerCycle.findMany({
        where: {
            status: "OPEN",
            cycleEnd: {
                lte: now,
            },
        },
        select: {
            CompanyCustomer_idCompanyCustomer: true,
        },
    });
    const customerIds = Array.from(new Set(expiredCycles.map((cycle) => cycle
        .CompanyCustomer_idCompanyCustomer)));
    for (const customerId of customerIds) {
        await prisma.$transaction(async (tx) => {
            await ensureCustomerCycle(tx, customerId, now);
        });
    }
}
// =====================================================
// LISTAR CICLOS DE UM CLIENTE
// =====================================================
/**
 * Utilizada pela rota:
 *
 * GET
 * /companies/:companyId/customers/:cpf/cycles
 */
export async function listCustomerCycles(companyId, cpf) {
    const cleanCpf = cpf.replace(/\D/g, "");
    // ==================================================
    // LOCALIZAR CLIENTE
    // ==================================================
    const customer = await prisma.companyCustomer.findFirst({
        where: {
            isActive: true,
            companyPerson: {
                Company_idCompany: companyId,
                isActive: true,
                person: {
                    cpf: cleanCpf,
                },
            },
        },
        include: {
            companyPerson: {
                include: {
                    person: true,
                },
            },
        },
    });
    if (!customer) {
        throw new Error("CUSTOMER_NOT_FOUND");
    }
    // ==================================================
    // BUSCAR CICLOS
    // ==================================================
    const cycles = await prisma.customerCycle.findMany({
        where: {
            CompanyCustomer_idCompanyCustomer: customer
                .idCompanyCustomer,
        },
        orderBy: {
            cycleStart: "desc",
        },
    });
    // ==================================================
    // RESPOSTA
    // ==================================================
    return {
        customer: {
            idCompanyCustomer: customer
                .idCompanyCustomer,
            cpf: customer
                .companyPerson
                .person
                .cpf,
            name: customer
                .companyPerson
                .person
                .name,
        },
        cycles: cycles.map((cycle) => ({
            idCustomerCycle: cycle
                .idCustomerCycle
                .toString(),
            cycleStart: cycle
                .cycleStart,
            cycleEnd: cycle
                .cycleEnd,
            status: cycle
                .status,
            purchaseDays: cycle
                .purchaseDays,
            totalAmount: cycle
                .totalAmount
                ?.toString() ??
                null,
            frequencyLevel: cycle
                .frequencyLevel,
            valueLevel: cycle
                .valueLevel,
            regularityLevel: cycle
                .regularityLevel
                ?.toString() ??
                null,
            companyMedian: cycle
                .companyMedian
                ?.toString() ??
                null,
            medianPercentage: cycle
                .medianPercentage
                ?.toString() ??
                null,
            medianSampleSize: cycle
                .medianSampleSize,
            progressEarned: cycle
                .progressEarned
                ?.toString() ??
                null,
            closedAt: cycle
                .closedAt,
            createdAt: cycle
                .createdAt,
        })),
    };
}
//# sourceMappingURL=cycle.service.js.map