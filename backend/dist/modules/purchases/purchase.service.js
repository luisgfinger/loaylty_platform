import { prisma, } from "../../lib/prisma.js";
import { ensureCustomerCycle, } from "../loyalty/cycle.service.js";
import { calculateRewardFundContribution, creditRewardFund, } from "../rewards/reward.fund.service.js";
// =====================================================
// CRIAR COMPRA / VENDA
// =====================================================
export async function createPurchase(companyId, employeeId, data) {
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
                    cpf: data.cpf,
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
    // CALCULAR CONTRIBUIÇÃO PARA O FUNDO
    //
    // 0,5% do valor da venda.
    //
    // Exemplo:
    //
    // R$ 250,00
    // x 0,005
    // = R$ 1,2500
    // ==================================================
    const rewardFundContribution = calculateRewardFundContribution(data.amount);
    // ==================================================
    // TRANSAÇÃO
    // ==================================================
    return prisma.$transaction(async (tx) => {
        // ===============================================
        // VALIDAR FUNCIONÁRIO RESPONSÁVEL
        // ===============================================
        const responsibleEmployee = await tx.companyEmployee.findFirst({
            where: {
                idCompanyEmployee: employeeId,
                isActive: true,
                companyPerson: {
                    Company_idCompany: companyId,
                    isActive: true,
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
        if (!responsibleEmployee) {
            throw new Error("EMPLOYEE_NOT_AUTHORIZED");
        }
        // ===============================================
        // REGISTRAR VENDA
        // ===============================================
        const purchase = await tx.purchase.create({
            data: {
                CompanyCustomer_idCompanyCustomer: customer
                    .idCompanyCustomer,
                RegisteredByEmployee_idCompanyEmployee: employeeId,
                fiscalDocumentNumber: data
                    .fiscalDocumentNumber,
                amount: data.amount,
                rewardFundContribution,
            },
        });
        // ===============================================
        // CREDITAR 0,5% NO FUNDO DE RECOMPENSAS
        //
        // Está dentro da mesma transação da compra.
        //
        // Portanto:
        //
        // compra + fundo são confirmados juntos
        // ou ambos sofrem rollback.
        // ===============================================
        await creditRewardFund(tx, companyId, rewardFundContribution);
        // ===============================================
        // GARANTIR CICLO DO CLIENTE
        // ===============================================
        const cycle = await ensureCustomerCycle(tx, customer
            .idCompanyCustomer, purchase
            .purchaseDate);
        // ===============================================
        // RESPOSTA
        // ===============================================
        return {
            idPurchase: purchase
                .idPurchase
                .toString(),
            fiscalDocumentNumber: purchase
                .fiscalDocumentNumber,
            amount: purchase
                .amount
                .toString(),
            rewardFundContribution: purchase
                .rewardFundContribution
                .toString(),
            purchaseDate: purchase
                .purchaseDate,
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
            registeredBy: {
                idCompanyEmployee: responsibleEmployee
                    .idCompanyEmployee,
                cpf: responsibleEmployee
                    .companyPerson
                    .person
                    .cpf,
                name: responsibleEmployee
                    .companyPerson
                    .person
                    .name,
            },
            cycle: cycle
                ? {
                    idCustomerCycle: cycle
                        .idCustomerCycle
                        .toString(),
                    cycleStart: cycle
                        .cycleStart,
                    cycleEnd: cycle
                        .cycleEnd,
                    status: cycle
                        .status,
                }
                : null,
        };
    });
}
// =====================================================
// LISTAR COMPRAS DO CLIENTE
// =====================================================
export async function listCustomerPurchases(companyId, cpf) {
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
    // BUSCAR COMPRAS
    // ==================================================
    const purchases = await prisma.purchase.findMany({
        where: {
            CompanyCustomer_idCompanyCustomer: customer
                .idCompanyCustomer,
        },
        include: {
            registeredByEmployee: {
                include: {
                    companyPerson: {
                        include: {
                            person: true,
                        },
                    },
                },
            },
        },
        orderBy: {
            purchaseDate: "desc",
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
        purchases: purchases.map((purchase) => ({
            idPurchase: purchase
                .idPurchase
                .toString(),
            fiscalDocumentNumber: purchase
                .fiscalDocumentNumber,
            amount: purchase
                .amount
                .toString(),
            rewardFundContribution: purchase
                .rewardFundContribution
                .toString(),
            purchaseDate: purchase
                .purchaseDate,
            registeredBy: purchase
                .registeredByEmployee
                ? {
                    idCompanyEmployee: purchase
                        .registeredByEmployee
                        .idCompanyEmployee,
                    cpf: purchase
                        .registeredByEmployee
                        .companyPerson
                        .person
                        .cpf,
                    name: purchase
                        .registeredByEmployee
                        .companyPerson
                        .person
                        .name,
                }
                : null,
        })),
    };
}
//# sourceMappingURL=purchase.service.js.map