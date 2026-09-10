import type {
  Prisma,
} from "../../generated/prisma/client.js";

import { prisma } from "../../lib/prisma.js";

import {
  calculateCycleProgress,
  calculateFrequencyLevel,
  calculateMedian,
  calculateRegularity,
  calculateValueLevel,
  type FrequencyLevelType,
  type ValueLevelType,
} from "./loyalty.engine.js";


// =====================================================
// TIPOS
// =====================================================

type CustomerCycleRecord =
  Prisma.CustomerCycleGetPayload<{}>;

type CompanyMedianResult = {
  median: number | null;
  sampleSize: number;
};


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
function startOfDay(
  date: Date
): Date {
  const result = new Date(date);

  result.setHours(
    0,
    0,
    0,
    0
  );

  return result;
}


/**
 * Adiciona determinada quantidade
 * de dias a uma data.
 */
function addDays(
  date: Date,
  days: number
): Date {
  const result = new Date(date);

  result.setDate(
    result.getDate() + days
  );

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
function getDayKey(
  date: Date
): string {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


// =====================================================
// MEDIANA DA EMPRESA
// =====================================================

/**
 * Calcula a mediana de gasto dos clientes
 * da empresa exatamente dentro da janela
 * de 30 dias do cliente que está sendo avaliado.
 *
 * Exemplo:
 *
 * ciclo do João:
 * 09/09 -> 09/10
 *
 * Pegamos todas as compras da empresa
 * entre essas mesmas datas.
 *
 * Depois:
 *
 * João    = 700
 * Maria   = 350
 * Carlos  = 900
 * Ana     = 500
 *
 * e calculamos a mediana desses totais.
 *
 * Clientes sem compra no período
 * não entram no cálculo.
 */
async function getCompanyMedian(
  tx: Prisma.TransactionClient,
  companyId: number,
  cycleStart: Date,
  cycleEnd: Date
): Promise<CompanyMedianResult> {
  // ==================================================
  // BUSCAR TODAS AS COMPRAS DA EMPRESA
  // NA MESMA JANELA DO CICLO
  // ==================================================

  const purchases =
    await tx.purchase.findMany({
      where: {
        purchaseDate: {
          gte: cycleStart,
          lt: cycleEnd,
        },

        customer: {
          companyPerson: {
            Company_idCompany:
              companyId,
          },
        },
      },

      select: {
        CompanyCustomer_idCompanyCustomer:
          true,

        amount:
          true,
      },
    });


  // ==================================================
  // SOMAR O TOTAL DE CADA CLIENTE
  // ==================================================

  const customerTotals =
    new Map<number, number>();


  for (
    const purchase
    of purchases
  ) {
    const customerId =
      purchase
        .CompanyCustomer_idCompanyCustomer;


    const currentTotal =
      customerTotals.get(
        customerId
      ) ?? 0;


    customerTotals.set(
      customerId,

      currentTotal +
        Number(
          purchase.amount
        )
    );
  }


  // ==================================================
  // REMOVER CLIENTES SEM MOVIMENTO
  //
  // Na prática eles já não aparecem no Map,
  // mas mantemos o filtro por segurança.
  // ==================================================

  const totals =
    Array.from(
      customerTotals.values()
    ).filter(
      (value) =>
        value > 0
    );


  const sampleSize =
    totals.length;


  const calculatedMedian =
    calculateMedian(
      totals
    );


  // ==================================================
  // CONFIGURAÇÕES DA EMPRESA
  // ==================================================

  const settings =
    await tx
      .companyLoyaltySettings
      .findUnique({
        where: {
          Company_idCompany:
            companyId,
        },
      });


  const minimumCustomers =
    settings
      ?.minimumMedianCustomers ??
    20;


  // ==================================================
  // 1. MEDIANA DINÂMICA
  //
  // Só utilizamos diretamente se houver
  // quantidade suficiente de clientes.
  // ==================================================

  if (
    calculatedMedian !== null &&
    sampleSize >= minimumCustomers
  ) {
    return {
      median:
        calculatedMedian,

      sampleSize,
    };
  }


  // ==================================================
  // 2. ÚLTIMA MEDIANA CONFIÁVEL
  //
  // Se a amostra atual for pequena,
  // buscamos uma mediana anterior que tenha
  // sido calculada com amostra suficiente.
  // ==================================================

  const lastReliableCycle =
    await tx.customerCycle.findFirst({
      where: {
        status:
          "CLOSED",

        medianSampleSize: {
          gte:
            minimumCustomers,
        },

        companyMedian: {
          not:
            null,
        },

        customer: {
          companyPerson: {
            Company_idCompany:
              companyId,
          },
        },
      },

      orderBy: {
        closedAt:
          "desc",
      },

      select: {
        companyMedian:
          true,
      },
    });


  if (
    lastReliableCycle
      ?.companyMedian !== null &&
    lastReliableCycle
      ?.companyMedian !== undefined
  ) {
    return {
      median:
        Number(
          lastReliableCycle
            .companyMedian
        ),

      sampleSize,
    };
  }


  // ==================================================
  // 3. MEDIANA INICIAL / FALLBACK
  //
  // Usada principalmente no começo do sistema,
  // enquanto ainda não há clientes suficientes.
  // ==================================================

  if (
    settings?.fallbackMedian !== null &&
    settings?.fallbackMedian !== undefined
  ) {
    return {
      median:
        Number(
          settings
            .fallbackMedian
        ),

      sampleSize,
    };
  }


  // ==================================================
  // NENHUMA MEDIANA DISPONÍVEL
  // ==================================================

  return {
    median:
      null,

    sampleSize,
  };
}


// =====================================================
// FECHAR CICLO
// =====================================================

/**
 * Fecha um CustomerCycle.
 *
 * Aqui acontecem os cálculos:
 *
 * - quantidade de dias com compra
 * - valor total
 * - frequência
 * - mediana da empresa
 * - nível de valor
 * - regularidade
 * - progresso conquistado
 * - atualização do CustomerJourney
 */
export async function closeCustomerCycle(
  tx: Prisma.TransactionClient,
  cycleId: bigint
): Promise<CustomerCycleRecord> {
  // ==================================================
  // BUSCAR CICLO
  // ==================================================

  const cycle =
    await tx.customerCycle.findUnique({
      where: {
        idCustomerCycle:
          cycleId,
      },

      include: {
        customer: {
          include: {
            companyPerson:
              true,
          },
        },
      },
    });


  if (!cycle) {
    throw new Error(
      "CYCLE_NOT_FOUND"
    );
  }


  // ==================================================
  // EVITA PROCESSAR DUAS VEZES
  // ==================================================

  if (
    cycle.status ===
    "CLOSED"
  ) {
    return cycle;
  }


  const customerId =
    cycle
      .CompanyCustomer_idCompanyCustomer;


  const companyId =
    cycle
      .customer
      .companyPerson
      .Company_idCompany;


  // ==================================================
  // COMPRAS DO CLIENTE NO CICLO
  //
  // Intervalo:
  //
  // cycleStart <= compra < cycleEnd
  // ==================================================

  const purchases =
    await tx.purchase.findMany({
      where: {
        CompanyCustomer_idCompanyCustomer:
          customerId,

        purchaseDate: {
          gte:
            cycle.cycleStart,

          lt:
            cycle.cycleEnd,
        },
      },

      orderBy: {
        purchaseDate:
          "asc",
      },
    });


  // ==================================================
  // CONTAR DIAS DIFERENTES COM COMPRA
  // ==================================================

  const uniqueDays =
    new Set<string>();


  for (
    const purchase
    of purchases
  ) {
    uniqueDays.add(
      getDayKey(
        purchase.purchaseDate
      )
    );
  }


  const purchaseDays =
    uniqueDays.size;


  // ==================================================
  // SOMAR VALOR TOTAL DO CICLO
  // ==================================================

  const totalAmount =
    purchases.reduce(
      (
        total,
        purchase
      ) => {
        return (
          total +
          Number(
            purchase.amount
          )
        );
      },

      0
    );


  // ==================================================
  // FREQUÊNCIA
  //
  // 0-4  = LOW
  // 5-9  = MEDIUM
  // 10+  = HIGH
  // ==================================================

  const frequencyLevel =
    calculateFrequencyLevel(
      purchaseDays
    );


  // ==================================================
  // MEDIANA DA EMPRESA
  // ==================================================

  const medianResult =
    await getCompanyMedian(
      tx,
      companyId,
      cycle.cycleStart,
      cycle.cycleEnd
    );


  // ==================================================
  // NÍVEL DE VALOR
  // ==================================================

  let medianPercentage =
    0;


  let valueLevel:
    ValueLevelType =
      "LOW";


  // Se o cliente não comprou nada,
  // permanece LOW e não precisamos
  // da mediana para fechar o ciclo.
  if (
    totalAmount > 0
  ) {
    if (
      medianResult.median === null ||
      medianResult.median <= 0
    ) {
      throw new Error(
        "LOYALTY_MEDIAN_NOT_CONFIGURED"
      );
    }


    medianPercentage =
      (
        totalAmount /
        medianResult.median
      ) * 100;


    valueLevel =
      calculateValueLevel(
        medianPercentage
      );
  }


  // ==================================================
  // CICLOS ANTERIORES
  //
  // Precisamos dos dois anteriores,
  // porque junto com o atual teremos
  // os últimos três ciclos.
  // ==================================================

  const previousCycles =
    await tx.customerCycle.findMany({
      where: {
        CompanyCustomer_idCompanyCustomer:
          customerId,

        status:
          "CLOSED",

        cycleStart: {
          lt:
            cycle.cycleStart,
        },
      },

      orderBy: {
        cycleStart:
          "desc",
      },

      take:
        2,
    });


  const previousCycle =
    previousCycles[0];


  let previousFrequency:
    FrequencyLevelType | null =
      null;


  if (
    previousCycle
      ?.frequencyLevel
  ) {
    previousFrequency =
      previousCycle
        .frequencyLevel;
  }


  // ==================================================
  // JORNADA ATUAL DO CLIENTE
  // ==================================================

  const currentJourney =
    await tx.customerJourney.findUnique({
      where: {
        CompanyCustomer_idCompanyCustomer:
          customerId,
      },
    });


  const previousRegularity =
    currentJourney
      ? Number(
          currentJourney
            .regularity
        )
      : 1;


  // ==================================================
  // ÚLTIMAS 3 FREQUÊNCIAS
  //
  // atual + até 2 ciclos anteriores
  // ==================================================

  const recentFrequencies:
    FrequencyLevelType[] =
      [
        frequencyLevel,
      ];


  for (
    const previous
    of previousCycles
  ) {
    if (
      previous.frequencyLevel
    ) {
      recentFrequencies.push(
        previous.frequencyLevel
      );
    }
  }


  // Garantia de no máximo 3.
  const lastThreeFrequencies =
    recentFrequencies.slice(
      0,
      3
    );


  // ==================================================
  // REGULARIDADE
  // ==================================================

  const regularityLevel =
    calculateRegularity(
      previousRegularity,
      previousFrequency,
      frequencyLevel,
      lastThreeFrequencies
    );


  // ==================================================
  // PROGRESSÃO DO CICLO
  //
  // Matriz atual:
  //
  //                frequência
  //
  // valor       LOW   MED   HIGH
  //
  // LOW         0.5    1     1
  // MEDIUM       1     1    2.5
  // HIGH         1    2.5   2.5
  //
  // Ciclo sem nenhuma compra:
  // 0 pontos.
  // ==================================================

  const progressEarned =
    calculateCycleProgress(
      frequencyLevel,
      valueLevel,
      purchaseDays
    );


  // ==================================================
  // FECHAR CICLO
  // ==================================================

  const closedCycle =
    await tx.customerCycle.update({
      where: {
        idCustomerCycle:
          cycle
            .idCustomerCycle,
      },

      data: {
        purchaseDays,

        totalAmount,

        frequencyLevel,

        valueLevel,

        regularityLevel,

        companyMedian:
          medianResult.median,

        medianPercentage:
          Number(
            medianPercentage.toFixed(
              2
            )
          ),

        medianSampleSize:
          medianResult.sampleSize,

        progressEarned,

        status:
          "CLOSED",

        closedAt:
          new Date(),
      },
    });


  // ==================================================
  // ATUALIZAR CUSTOMER JOURNEY
  //
  // progress nunca diminui.
  //
  // regularity pode aumentar ou diminuir.
  // ==================================================

  await tx.customerJourney.upsert({
    where: {
      CompanyCustomer_idCompanyCustomer:
        customerId,
    },

    create: {
      CompanyCustomer_idCompanyCustomer:
        customerId,

      progress:
        progressEarned,

      regularity:
        regularityLevel,
    },

    update: {
      progress: {
        increment:
          progressEarned,
      },

      regularity:
        regularityLevel,
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
export async function ensureCustomerCycle(
  tx: Prisma.TransactionClient,
  customerId: number,
  referenceDate: Date
): Promise<CustomerCycleRecord | null> {
  // ==================================================
  // PROCURAR CICLO ABERTO
  // ==================================================

  let cycle:
    CustomerCycleRecord | null =
      await tx.customerCycle.findFirst({
        where: {
          CompanyCustomer_idCompanyCustomer:
            customerId,

          status:
            "OPEN",
        },

        orderBy: {
          cycleStart:
            "desc",
        },
      });


  // ==================================================
  // PRIMEIRO CICLO DO CLIENTE
  // ==================================================

  if (!cycle) {
    // Descobrimos a primeira compra,
    // porque ela define o início da jornada.
    const firstPurchase =
      await tx.purchase.findFirst({
        where: {
          CompanyCustomer_idCompanyCustomer:
            customerId,
        },

        orderBy: {
          purchaseDate:
            "asc",
        },

        select: {
          purchaseDate:
            true,
        },
      });


    if (!firstPurchase) {
      return null;
    }


    const cycleStart:
      Date =
        startOfDay(
          firstPurchase
            .purchaseDate
        );


    const cycleEnd:
      Date =
        addDays(
          cycleStart,
          30
        );


    cycle =
      await tx.customerCycle.create({
        data: {
          CompanyCustomer_idCompanyCustomer:
            customerId,

          cycleStart,

          cycleEnd,

          status:
            "OPEN",
        },
      });
  }


  // ==================================================
  // FECHAR CICLOS VENCIDOS
  //
  // Exemplo:
  //
  // cliente ficou 90 dias sem comprar.
  //
  // O sistema fecha:
  //
  // ciclo 1
  // ciclo 2 vazio
  // ciclo 3 vazio
  //
  // até alcançar o ciclo correspondente
  // à data atual.
  // ==================================================

  while (
    referenceDate >=
    cycle.cycleEnd
  ) {
    await closeCustomerCycle(
      tx,
      cycle.idCustomerCycle
    );


    // Tipos explícitos evitam o erro:
    //
    // "'nextStart' implicitly has type 'any'..."
    const nextStart:
      Date =
        new Date(
          cycle.cycleEnd
        );


    const nextEnd:
      Date =
        addDays(
          nextStart,
          30
        );


    cycle =
      await tx.customerCycle.create({
        data: {
          CompanyCustomer_idCompanyCustomer:
            customerId,

          cycleStart:
            nextStart,

          cycleEnd:
            nextEnd,

          status:
            "OPEN",
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
 * Ela procura todos os clientes
 * que possuem ciclos vencidos e
 * atualiza cada um deles.
 */
export async function processExpiredCycles():
  Promise<void> {
  const now:
    Date =
      new Date();


  const expiredCycles =
    await prisma.customerCycle.findMany({
      where: {
        status:
          "OPEN",

        cycleEnd: {
          lte:
            now,
        },
      },

      select: {
        CompanyCustomer_idCompanyCustomer:
          true,
      },
    });


  // ==================================================
  // EVITAR PROCESSAR O MESMO CLIENTE
  // MAIS DE UMA VEZ
  // ==================================================

  const customerIds =
    Array.from(
      new Set(
        expiredCycles.map(
          (cycle) =>
            cycle
              .CompanyCustomer_idCompanyCustomer
        )
      )
    );


  // ==================================================
  // PROCESSAR CLIENTE POR CLIENTE
  // ==================================================

  for (
    const customerId
    of customerIds
  ) {
    await prisma.$transaction(
      async (
        tx
      ) => {
        await ensureCustomerCycle(
          tx,
          customerId,
          now
        );
      }
    );
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
export async function listCustomerCycles(
  companyId: number,
  cpf: string
) {
  const cleanCpf =
    cpf.replace(
      /\D/g,
      ""
    );


  // ==================================================
  // LOCALIZAR CLIENTE
  // ==================================================

  const customer =
    await prisma.companyCustomer.findFirst({
      where: {
        isActive:
          true,

        companyPerson: {
          Company_idCompany:
            companyId,

          isActive:
            true,

          person: {
            cpf:
              cleanCpf,
          },
        },
      },

      include: {
        companyPerson: {
          include: {
            person:
              true,
          },
        },
      },
    });


  if (!customer) {
    throw new Error(
      "CUSTOMER_NOT_FOUND"
    );
  }


  // ==================================================
  // BUSCAR CICLOS
  // ==================================================

  const cycles =
    await prisma.customerCycle.findMany({
      where: {
        CompanyCustomer_idCompanyCustomer:
          customer
            .idCompanyCustomer,
      },

      orderBy: {
        cycleStart:
          "desc",
      },
    });


  // ==================================================
  // RESPOSTA
  //
  // BigInt não pode ser serializado
  // diretamente em JSON.
  // Decimal também fica melhor convertido.
  // ==================================================

  return {
    customer: {
      idCompanyCustomer:
        customer
          .idCompanyCustomer,

      cpf:
        customer
          .companyPerson
          .person
          .cpf,

      name:
        customer
          .companyPerson
          .person
          .name,
    },

    cycles:
      cycles.map(
        (
          cycle
        ) => ({
          idCustomerCycle:
            cycle
              .idCustomerCycle
              .toString(),

          cycleStart:
            cycle
              .cycleStart,

          cycleEnd:
            cycle
              .cycleEnd,

          status:
            cycle
              .status,

          purchaseDays:
            cycle
              .purchaseDays,

          totalAmount:
            cycle
              .totalAmount
              ?.toString() ??
            null,

          frequencyLevel:
            cycle
              .frequencyLevel,

          valueLevel:
            cycle
              .valueLevel,

          regularityLevel:
            cycle
              .regularityLevel
              ?.toString() ??
            null,

          companyMedian:
            cycle
              .companyMedian
              ?.toString() ??
            null,

          medianPercentage:
            cycle
              .medianPercentage
              ?.toString() ??
            null,

          medianSampleSize:
            cycle
              .medianSampleSize,

          progressEarned:
            cycle
              .progressEarned
              ?.toString() ??
            null,

          closedAt:
            cycle
              .closedAt,

          createdAt:
            cycle
              .createdAt,
        })
      ),
  };
}