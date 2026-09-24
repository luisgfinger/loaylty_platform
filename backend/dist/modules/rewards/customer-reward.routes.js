import { prisma, } from "../../lib/prisma.js";
// =====================================================
// CONFIGURAÇÃO DOS MARCOS
// =====================================================
const REWARD_PROGRESS_INTERVAL = 20;
// =====================================================
// SEQUÊNCIAS DETERMINÍSTICAS
// =====================================================
const LOW_REGULARITY_SEQUENCE = [
    "LOW",
    "LOW",
    "LOW",
    "MEDIUM",
    "LOW",
    "LOW",
    "MEDIUM",
    "LOW",
    "LOW",
    "HIGH",
];
const MEDIUM_REGULARITY_SEQUENCE = [
    "LOW",
    "MEDIUM",
    "MEDIUM",
    "LOW",
    "MEDIUM",
    "HIGH",
    "MEDIUM",
    "LOW",
    "MEDIUM",
    "HIGH",
];
const HIGH_REGULARITY_SEQUENCE = [
    "MEDIUM",
    "HIGH",
    "MEDIUM",
    "HIGH",
    "MEDIUM",
    "HIGH",
    "LOW",
    "HIGH",
    "MEDIUM",
    "HIGH",
];
// =====================================================
// DATAS
// =====================================================
function startOfDay(date) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}
function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}
function parseExpirationDate(value) {
    const [yearText, monthText, dayText,] = value.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const result = new Date(year, month - 1, day, 23, 59, 59, 999);
    if (result.getFullYear() !== year ||
        result.getMonth() !== month - 1 ||
        result.getDate() !== day) {
        throw new Error("INVALID_EXPIRATION_DATE");
    }
    return result;
}
// =====================================================
// TIER PELO CUSTO
// =====================================================
export function calculateRewardTierFromCost(costAmount) {
    if (costAmount <= 10) {
        return "LOW";
    }
    if (costAmount <= 50) {
        return "MEDIUM";
    }
    return "HIGH";
}
function getRewardCostWhere(tier) {
    if (tier === "LOW") {
        return {
            lte: 10,
        };
    }
    if (tier === "MEDIUM") {
        return {
            gt: 10,
            lte: 50,
        };
    }
    return {
        gt: 50,
    };
}
// =====================================================
// TIER SUGERIDO PELO MOTOR
// =====================================================
function getSuggestedRewardTier(rewardNumber, regularity) {
    const position = (rewardNumber - 1) % 10;
    if (regularity >= 4) {
        return HIGH_REGULARITY_SEQUENCE[position];
    }
    if (regularity >= 2.5) {
        return MEDIUM_REGULARITY_SEQUENCE[position];
    }
    return LOW_REGULARITY_SEQUENCE[position];
}
// =====================================================
// GERAR PENDÊNCIAS A PARTIR DO PROGRESS
// =====================================================
/**
 * Cria uma pendência para cada marco de 20 progress
 * cruzado entre previousProgress e newProgress.
 *
 * A constraint única por cliente + progressMilestone
 * garante idempotência.
 */
export async function createPendingCustomerRewardsForProgress(tx, customerId, previousProgress, newProgress, regularity) {
    if (newProgress <=
        previousProgress) {
        return;
    }
    const firstRewardNumber = Math.floor(previousProgress /
        REWARD_PROGRESS_INTERVAL) + 1;
    const lastRewardNumber = Math.floor(newProgress /
        REWARD_PROGRESS_INTERVAL);
    if (firstRewardNumber >
        lastRewardNumber) {
        return;
    }
    const rows = [];
    for (let rewardNumber = firstRewardNumber; rewardNumber <= lastRewardNumber; rewardNumber += 1) {
        const milestone = rewardNumber *
            REWARD_PROGRESS_INTERVAL;
        rows.push({
            CompanyCustomer_idCompanyCustomer: customerId,
            status: "PENDING",
            suggestedTier: getSuggestedRewardTier(rewardNumber, regularity),
            progressMilestone: milestone,
            regularityAtEarned: regularity,
        });
    }
    if (rows.length === 0) {
        return;
    }
    await tx.customerReward.createMany({
        data: rows,
        skipDuplicates: true,
    });
}
// =====================================================
// VALIDAR FUNCIONÁRIO DA EMPRESA
// =====================================================
async function ensureEmployeeBelongsToCompany(tx, companyId, employeeId) {
    const employee = await tx.companyEmployee.findFirst({
        where: {
            idCompanyEmployee: employeeId,
            isActive: true,
            companyPerson: {
                Company_idCompany: companyId,
                isActive: true,
            },
        },
        select: {
            idCompanyEmployee: true,
        },
    });
    if (!employee) {
        throw new Error("EMPLOYEE_NOT_AUTHORIZED");
    }
}
// =====================================================
// VALIDAR EXPIRAÇÃO
// =====================================================
function resolveExpirationDate(expiresOn, timing, approvedAt) {
    if (!expiresOn) {
        return null;
    }
    const expiresAt = parseExpirationDate(expiresOn);
    if (expiresAt < approvedAt) {
        throw new Error("INVALID_EXPIRATION_DATE");
    }
    if (timing ===
        "NEXT_PURCHASE_DAY") {
        const firstPossibleDay = addDays(startOfDay(approvedAt), 1);
        if (expiresAt <
            firstPossibleDay) {
            throw new Error("EXPIRATION_BEFORE_REDEMPTION");
        }
    }
    return expiresAt;
}
// =====================================================
// LISTAR PENDENTES
// =====================================================
export async function listPendingCustomerRewards(companyId) {
    const company = await prisma.company.findFirst({
        where: {
            idCompany: companyId,
            isActive: true,
        },
        select: {
            rewardFundBalance: true,
        },
    });
    if (!company) {
        throw new Error("COMPANY_NOT_FOUND");
    }
    const pendingRewards = await prisma.customerReward.findMany({
        where: {
            status: "PENDING",
            customer: {
                companyPerson: {
                    Company_idCompany: companyId,
                },
            },
        },
        include: {
            customer: {
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
            earnedAt: "asc",
        },
    });
    return {
        rewardFundBalance: company
            .rewardFundBalance
            .toString(),
        pendingRewards: pendingRewards.map((customerReward) => ({
            idCustomerReward: customerReward
                .idCustomerReward
                .toString(),
            progressMilestone: customerReward
                .progressMilestone
                ?.toString() ??
                null,
            regularityAtEarned: customerReward
                .regularityAtEarned
                ?.toString() ??
                null,
            suggestedTier: customerReward
                .suggestedTier,
            earnedAt: customerReward
                .earnedAt,
            customer: {
                idCompanyCustomer: customerReward
                    .customer
                    .idCompanyCustomer,
                cpf: customerReward
                    .customer
                    .companyPerson
                    .person
                    .cpf,
                name: customerReward
                    .customer
                    .companyPerson
                    .person
                    .name,
            },
        })),
    };
}
// =====================================================
// APROVAR PENDÊNCIA
// =====================================================
export async function approveCustomerReward(companyId, employeeId, customerRewardId, data) {
    return prisma.$transaction(async (tx) => {
        await ensureEmployeeBelongsToCompany(tx, companyId, employeeId);
        const pendingReward = await tx.customerReward.findFirst({
            where: {
                idCustomerReward: customerRewardId,
                status: "PENDING",
                customer: {
                    companyPerson: {
                        Company_idCompany: companyId,
                    },
                },
            },
        });
        if (!pendingReward) {
            throw new Error("PENDING_CUSTOMER_REWARD_NOT_FOUND");
        }
        const approvedAt = new Date();
        const expiresAt = resolveExpirationDate(data.expiresOn, data.redemptionTiming, approvedAt);
        let rewardId = null;
        let rewardCategoryId = null;
        let reservedAmount = 0;
        let costAmountSnapshot = null;
        if (data.rewardType ===
            "DIRECT") {
            const reward = await tx.reward.findFirst({
                where: {
                    idReward: data.rewardId,
                    Company_idCompany: companyId,
                    isActive: true,
                },
            });
            if (!reward) {
                throw new Error("REWARD_NOT_FOUND");
            }
            const rewardCost = Number(reward.costAmount);
            const rewardTier = calculateRewardTierFromCost(rewardCost);
            if (rewardTier !==
                data.finalTier) {
                throw new Error("REWARD_TIER_MISMATCH");
            }
            rewardId =
                reward.idReward;
            rewardCategoryId =
                reward
                    .RewardCategory_idRewardCategory;
            reservedAmount =
                rewardCost;
            costAmountSnapshot =
                rewardCost;
        }
        else {
            const rewards = await tx.reward.findMany({
                where: {
                    Company_idCompany: companyId,
                    isActive: true,
                    costAmount: getRewardCostWhere(data.finalTier),
                },
                select: {
                    costAmount: true,
                },
            });
            if (rewards.length === 0) {
                throw new Error("NO_ACTIVE_REWARDS_FOR_TIER");
            }
            reservedAmount =
                Math.max(...rewards.map((reward) => Number(reward.costAmount)));
        }
        // ==================================================
        // DEBITAR O CUSTO DO FUNDO DE RECOMPENSAS
        //
        // O saldo pode ficar negativo.
        //
        // Assim, rewardFundBalance passa a representar
        // o resultado acumulado do programa:
        //
        // contribuições das compras
        // - recompensas comprometidas
        // + valores devolvidos por expiração
        // ==================================================
        const fundUpdate = await tx.company.updateMany({
            where: {
                idCompany: companyId,
                isActive: true,
            },
            data: {
                rewardFundBalance: {
                    decrement: reservedAmount,
                },
            },
        });
        if (fundUpdate.count !== 1) {
            throw new Error("COMPANY_NOT_FOUND");
        }
        const updated = await tx.customerReward.updateMany({
            where: {
                idCustomerReward: customerRewardId,
                status: "PENDING",
            },
            data: {
                ReviewedByEmployee_idCompanyEmployee: employeeId,
                rewardType: data.rewardType,
                status: "AVAILABLE",
                finalTier: data.finalTier,
                Reward_idReward: rewardId,
                RewardCategory_idRewardCategory: rewardCategoryId,
                redemptionTiming: data.redemptionTiming,
                reservedAmount,
                costAmountSnapshot,
                reviewedAt: approvedAt,
                approvedAt,
                selectedAt: null,
                expiresAt,
                decisionNote: data.decisionNote ??
                    null,
            },
        });
        if (updated.count !== 1) {
            throw new Error("PENDING_CUSTOMER_REWARD_NOT_FOUND");
        }
        const result = await tx.customerReward.findUnique({
            where: {
                idCustomerReward: customerRewardId,
            },
            include: {
                reward: true,
                rewardCategory: true,
            },
        });
        return {
            idCustomerReward: result
                .idCustomerReward
                .toString(),
            status: result
                .status,
            rewardType: result
                .rewardType,
            suggestedTier: result
                .suggestedTier,
            finalTier: result
                .finalTier,
            redemptionTiming: result
                .redemptionTiming,
            reservedAmount: result
                .reservedAmount
                ?.toString() ??
                null,
            costAmountSnapshot: result
                .costAmountSnapshot
                ?.toString() ??
                null,
            approvedAt: result
                .approvedAt,
            expiresAt: result
                .expiresAt,
            reward: result.reward
                ? {
                    idReward: result
                        .reward
                        .idReward,
                    name: result
                        .reward
                        .name,
                    costAmount: result
                        .reward
                        .costAmount
                        .toString(),
                }
                : null,
        };
    });
}
// =====================================================
// NEGAR PENDÊNCIA
// =====================================================
export async function denyCustomerReward(companyId, employeeId, customerRewardId, data) {
    return prisma.$transaction(async (tx) => {
        await ensureEmployeeBelongsToCompany(tx, companyId, employeeId);
        const now = new Date();
        const updated = await tx.customerReward.updateMany({
            where: {
                idCustomerReward: customerRewardId,
                status: "PENDING",
                customer: {
                    companyPerson: {
                        Company_idCompany: companyId,
                    },
                },
            },
            data: {
                ReviewedByEmployee_idCompanyEmployee: employeeId,
                status: "CANCELLED",
                reviewedAt: now,
                decisionNote: data.decisionNote ??
                    null,
            },
        });
        if (updated.count !== 1) {
            throw new Error("PENDING_CUSTOMER_REWARD_NOT_FOUND");
        }
        return {
            idCustomerReward: customerRewardId
                .toString(),
            status: "CANCELLED",
            reviewedAt: now,
        };
    });
}
// =====================================================
// EXPIRAR E DEVOLVER RESERVA
// =====================================================
async function expireCustomerRewardInTransaction(tx, customerRewardId, now) {
    const customerReward = await tx.customerReward.findUnique({
        where: {
            idCustomerReward: customerRewardId,
        },
        include: {
            customer: {
                include: {
                    companyPerson: true,
                },
            },
        },
    });
    if (!customerReward ||
        customerReward.status !== "AVAILABLE" ||
        !customerReward.expiresAt ||
        customerReward.expiresAt > now) {
        return false;
    }
    const updated = await tx.customerReward.updateMany({
        where: {
            idCustomerReward: customerRewardId,
            status: "AVAILABLE",
        },
        data: {
            status: "EXPIRED",
        },
    });
    if (updated.count !== 1) {
        return false;
    }
    const reservedAmount = Number(customerReward
        .reservedAmount ??
        0);
    if (reservedAmount > 0) {
        await tx.company.update({
            where: {
                idCompany: customerReward
                    .customer
                    .companyPerson
                    .Company_idCompany,
            },
            data: {
                rewardFundBalance: {
                    increment: reservedAmount,
                },
            },
        });
    }
    return true;
}
export async function processExpiredCustomerRewards() {
    const now = new Date();
    const expiredRewards = await prisma.customerReward.findMany({
        where: {
            status: "AVAILABLE",
            expiresAt: {
                lte: now,
            },
        },
        select: {
            idCustomerReward: true,
        },
    });
    for (const customerReward of expiredRewards) {
        await prisma.$transaction(async (tx) => {
            await expireCustomerRewardInTransaction(tx, customerReward.idCustomerReward, now);
        });
    }
}
// =====================================================
// CLIENTE ESCOLHE A RECOMPENSA
// =====================================================
export async function selectCustomerReward(companyId, customerRewardId, data) {
    return prisma.$transaction(async (tx) => {
        const now = new Date();
        const customerReward = await tx.customerReward.findFirst({
            where: {
                idCustomerReward: customerRewardId,
                status: "AVAILABLE",
                customer: {
                    companyPerson: {
                        Company_idCompany: companyId,
                    },
                },
            },
        });
        if (!customerReward) {
            throw new Error("CUSTOMER_REWARD_NOT_FOUND");
        }
        if (customerReward.expiresAt &&
            customerReward.expiresAt <= now) {
            throw new Error("CUSTOMER_REWARD_EXPIRED");
        }
        if (customerReward.rewardType !==
            "CHOICE") {
            throw new Error("CUSTOMER_REWARD_NOT_CHOICE");
        }
        if (customerReward.Reward_idReward !==
            null) {
            throw new Error("CUSTOMER_REWARD_ALREADY_SELECTED");
        }
        if (!customerReward.finalTier) {
            throw new Error("CUSTOMER_REWARD_TIER_NOT_DEFINED");
        }
        const reward = await tx.reward.findFirst({
            where: {
                idReward: data.rewardId,
                Company_idCompany: companyId,
                isActive: true,
            },
        });
        if (!reward) {
            throw new Error("REWARD_NOT_FOUND");
        }
        const rewardCost = Number(reward.costAmount);
        if (calculateRewardTierFromCost(rewardCost) !==
            customerReward.finalTier) {
            throw new Error("REWARD_TIER_MISMATCH");
        }
        const currentlyReserved = Number(customerReward
            .reservedAmount ??
            0);
        const difference = Number((currentlyReserved -
            rewardCost).toFixed(2));
        if (difference > 0) {
            await tx.company.update({
                where: {
                    idCompany: companyId,
                },
                data: {
                    rewardFundBalance: {
                        increment: difference,
                    },
                },
            });
        }
        if (difference < 0) {
            const additionalAmount = Math.abs(difference);
            // O saldo pode ficar negativo.
            // Portanto, não verificamos se existe
            // saldo suficiente antes de debitar.
            await tx.company.update({
                where: {
                    idCompany: companyId,
                },
                data: {
                    rewardFundBalance: {
                        decrement: additionalAmount,
                    },
                },
            });
        }
        const updated = await tx.customerReward.update({
            where: {
                idCustomerReward: customerRewardId,
            },
            data: {
                Reward_idReward: reward.idReward,
                RewardCategory_idRewardCategory: reward
                    .RewardCategory_idRewardCategory,
                selectedAt: now,
                costAmountSnapshot: rewardCost,
                reservedAmount: rewardCost,
            },
            include: {
                reward: true,
            },
        });
        return {
            idCustomerReward: updated
                .idCustomerReward
                .toString(),
            selectedAt: updated
                .selectedAt,
            reservedAmount: updated
                .reservedAmount
                ?.toString() ??
                null,
            reward: {
                idReward: updated
                    .reward
                    .idReward,
                name: updated
                    .reward
                    .name,
                costAmount: updated
                    .reward
                    .costAmount
                    .toString(),
            },
        };
    });
}
// =====================================================
// VERIFICAR SE JÁ PODE RESGATAR
// =====================================================
async function canRedeemCustomerReward(tx, customerId, approvedAt, timing) {
    if (timing ===
        "IMMEDIATE") {
        return true;
    }
    const purchase = await tx.purchase.findFirst({
        where: {
            CompanyCustomer_idCompanyCustomer: customerId,
            purchaseDate: timing ===
                "NEXT_PURCHASE"
                ? {
                    gt: approvedAt,
                }
                : {
                    gte: addDays(startOfDay(approvedAt), 1),
                },
        },
        select: {
            idPurchase: true,
        },
    });
    return Boolean(purchase);
}
// =====================================================
// RESGATAR
// =====================================================
export async function redeemCustomerReward(companyId, customerRewardId) {
    return prisma.$transaction(async (tx) => {
        const now = new Date();
        const customerReward = await tx.customerReward.findFirst({
            where: {
                idCustomerReward: customerRewardId,
                status: "AVAILABLE",
                customer: {
                    companyPerson: {
                        Company_idCompany: companyId,
                    },
                },
            },
            include: {
                reward: true,
            },
        });
        if (!customerReward) {
            throw new Error("CUSTOMER_REWARD_NOT_FOUND");
        }
        if (customerReward.expiresAt &&
            customerReward.expiresAt <= now) {
            throw new Error("CUSTOMER_REWARD_EXPIRED");
        }
        if (customerReward.rewardType === "CHOICE" &&
            customerReward.Reward_idReward === null) {
            throw new Error("CUSTOMER_REWARD_SELECTION_REQUIRED");
        }
        if (!customerReward.approvedAt ||
            !customerReward.redemptionTiming) {
            throw new Error("CUSTOMER_REWARD_NOT_APPROVED");
        }
        const canRedeem = await canRedeemCustomerReward(tx, customerReward
            .CompanyCustomer_idCompanyCustomer, customerReward
            .approvedAt, customerReward
            .redemptionTiming);
        if (!canRedeem) {
            throw new Error("CUSTOMER_REWARD_NOT_REDEEMABLE_YET");
        }
        const updated = await tx.customerReward.updateMany({
            where: {
                idCustomerReward: customerRewardId,
                status: "AVAILABLE",
            },
            data: {
                status: "REDEEMED",
                redeemedAt: now,
            },
        });
        if (updated.count !== 1) {
            throw new Error("CUSTOMER_REWARD_NOT_FOUND");
        }
        return {
            idCustomerReward: customerRewardId
                .toString(),
            status: "REDEEMED",
            redeemedAt: now,
        };
    });
}
// =====================================================
// LISTAR RECOMPENSAS DE UM CLIENTE
// =====================================================
export async function listCustomerRewards(companyId, cpf) {
    const customer = await prisma.companyCustomer.findFirst({
        where: {
            companyPerson: {
                Company_idCompany: companyId,
                person: {
                    cpf,
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
    const customerRewards = await prisma.customerReward.findMany({
        where: {
            CompanyCustomer_idCompanyCustomer: customer.idCompanyCustomer,
        },
        include: {
            reward: true,
            rewardCategory: true,
        },
        orderBy: {
            earnedAt: "desc",
        },
    });
    const now = new Date();
    const rewardItems = await Promise.all(customerRewards.map(async (customerReward) => {
        let isRedeemable = false;
        const hasSelectedReward = customerReward.rewardType !== "CHOICE" ||
            customerReward.Reward_idReward !== null;
        const isNotExpired = !customerReward.expiresAt ||
            customerReward.expiresAt > now;
        if (customerReward.status === "AVAILABLE" &&
            customerReward.approvedAt &&
            customerReward.redemptionTiming &&
            hasSelectedReward &&
            isNotExpired) {
            isRedeemable =
                await canRedeemCustomerReward(prisma, customer.idCompanyCustomer, customerReward.approvedAt, customerReward.redemptionTiming);
        }
        return {
            idCustomerReward: customerReward
                .idCustomerReward
                .toString(),
            status: customerReward
                .status,
            rewardType: customerReward
                .rewardType,
            suggestedTier: customerReward
                .suggestedTier,
            finalTier: customerReward
                .finalTier,
            progressMilestone: customerReward
                .progressMilestone
                ?.toString() ??
                null,
            regularityAtEarned: customerReward
                .regularityAtEarned
                ?.toString() ??
                null,
            redemptionTiming: customerReward
                .redemptionTiming,
            isRedeemable,
            reservedAmount: customerReward
                .reservedAmount
                ?.toString() ??
                null,
            costAmountSnapshot: customerReward
                .costAmountSnapshot
                ?.toString() ??
                null,
            earnedAt: customerReward
                .earnedAt,
            approvedAt: customerReward
                .approvedAt,
            selectedAt: customerReward
                .selectedAt,
            redeemedAt: customerReward
                .redeemedAt,
            expiresAt: customerReward
                .expiresAt,
            decisionNote: customerReward
                .decisionNote,
            reward: customerReward.reward
                ? {
                    idReward: customerReward
                        .reward
                        .idReward,
                    name: customerReward
                        .reward
                        .name,
                    costAmount: customerReward
                        .reward
                        .costAmount
                        .toString(),
                }
                : null,
        };
    }));
    return {
        customer: {
            idCompanyCustomer: customer.idCompanyCustomer,
            cpf: customer
                .companyPerson
                .person
                .cpf,
            name: customer
                .companyPerson
                .person
                .name,
        },
        rewards: rewardItems,
    };
}
//# sourceMappingURL=customer-reward.routes.js.map