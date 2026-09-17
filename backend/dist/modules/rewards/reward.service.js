import { prisma, } from "../../lib/prisma.js";
// =====================================================
// VALIDAR EMPRESA
// =====================================================
async function ensureCompanyExists(companyId) {
    const company = await prisma.company.findFirst({
        where: {
            idCompany: companyId,
            isActive: true,
        },
        select: {
            idCompany: true,
        },
    });
    if (!company) {
        throw new Error("COMPANY_NOT_FOUND");
    }
}
// =====================================================
// CRIAR CATEGORIA
// =====================================================
export async function createRewardCategory(companyId, data) {
    await ensureCompanyExists(companyId);
    const existingCategory = await prisma.rewardCategory.findFirst({
        where: {
            Company_idCompany: companyId,
            name: data.name,
        },
        select: {
            idRewardCategory: true,
        },
    });
    if (existingCategory) {
        throw new Error("REWARD_CATEGORY_ALREADY_EXISTS");
    }
    const category = await prisma.rewardCategory.create({
        data: {
            Company_idCompany: companyId,
            name: data.name,
            description: data.description ??
                null,
        },
    });
    return {
        idRewardCategory: category
            .idRewardCategory,
        name: category
            .name,
        description: category
            .description,
        isActive: category
            .isActive,
        createdAt: category
            .createdAt,
    };
}
// =====================================================
// LISTAR CATEGORIAS
// =====================================================
export async function listRewardCategories(companyId) {
    await ensureCompanyExists(companyId);
    const categories = await prisma.rewardCategory.findMany({
        where: {
            Company_idCompany: companyId,
        },
        orderBy: [
            {
                isActive: "desc",
            },
            {
                name: "asc",
            },
        ],
    });
    return categories.map((category) => ({
        idRewardCategory: category
            .idRewardCategory,
        name: category
            .name,
        description: category
            .description,
        isActive: category
            .isActive,
        createdAt: category
            .createdAt,
    }));
}
// =====================================================
// ATUALIZAR CATEGORIA
// =====================================================
export async function updateRewardCategory(companyId, categoryId, data) {
    const category = await prisma.rewardCategory.findFirst({
        where: {
            idRewardCategory: categoryId,
            Company_idCompany: companyId,
        },
    });
    if (!category) {
        throw new Error("REWARD_CATEGORY_NOT_FOUND");
    }
    if (data.name !== undefined &&
        data.name !== category.name) {
        const existingCategory = await prisma.rewardCategory.findFirst({
            where: {
                Company_idCompany: companyId,
                name: data.name,
                NOT: {
                    idRewardCategory: categoryId,
                },
            },
            select: {
                idRewardCategory: true,
            },
        });
        if (existingCategory) {
            throw new Error("REWARD_CATEGORY_ALREADY_EXISTS");
        }
    }
    const updatedCategory = await prisma.rewardCategory.update({
        where: {
            idRewardCategory: categoryId,
        },
        data: {
            ...(data.name !== undefined
                ? {
                    name: data.name,
                }
                : {}),
            ...(data.description !== undefined
                ? {
                    description: data.description,
                }
                : {}),
            ...(data.isActive !== undefined
                ? {
                    isActive: data.isActive,
                }
                : {}),
        },
    });
    return {
        idRewardCategory: updatedCategory
            .idRewardCategory,
        name: updatedCategory
            .name,
        description: updatedCategory
            .description,
        isActive: updatedCategory
            .isActive,
        createdAt: updatedCategory
            .createdAt,
    };
}
// =====================================================
// VALIDAR CATEGORIA DA EMPRESA
// =====================================================
async function ensureRewardCategory(companyId, categoryId) {
    const category = await prisma.rewardCategory.findFirst({
        where: {
            idRewardCategory: categoryId,
            Company_idCompany: companyId,
            isActive: true,
        },
        select: {
            idRewardCategory: true,
        },
    });
    if (!category) {
        throw new Error("REWARD_CATEGORY_NOT_FOUND");
    }
}
// =====================================================
// CRIAR RECOMPENSA
// =====================================================
export async function createReward(companyId, data) {
    await ensureCompanyExists(companyId);
    if (data.categoryId !== undefined &&
        data.categoryId !== null) {
        await ensureRewardCategory(companyId, data.categoryId);
    }
    const reward = await prisma.reward.create({
        data: {
            Company_idCompany: companyId,
            RewardCategory_idRewardCategory: data.categoryId ??
                null,
            name: data.name,
            description: data.description ??
                null,
            costAmount: data.costAmount,
        },
        include: {
            category: true,
        },
    });
    return {
        idReward: reward
            .idReward,
        name: reward
            .name,
        description: reward
            .description,
        costAmount: reward
            .costAmount
            .toString(),
        isActive: reward
            .isActive,
        createdAt: reward
            .createdAt,
        category: reward.category
            ? {
                idRewardCategory: reward
                    .category
                    .idRewardCategory,
                name: reward
                    .category
                    .name,
            }
            : null,
    };
}
// =====================================================
// LISTAR RECOMPENSAS
// =====================================================
export async function listRewards(companyId) {
    await ensureCompanyExists(companyId);
    const rewards = await prisma.reward.findMany({
        where: {
            Company_idCompany: companyId,
        },
        include: {
            category: true,
        },
        orderBy: [
            {
                isActive: "desc",
            },
            {
                name: "asc",
            },
        ],
    });
    return rewards.map((reward) => ({
        idReward: reward
            .idReward,
        name: reward
            .name,
        description: reward
            .description,
        costAmount: reward
            .costAmount
            .toString(),
        isActive: reward
            .isActive,
        createdAt: reward
            .createdAt,
        category: reward.category
            ? {
                idRewardCategory: reward
                    .category
                    .idRewardCategory,
                name: reward
                    .category
                    .name,
            }
            : null,
    }));
}
// =====================================================
// BUSCAR RECOMPENSA
// =====================================================
export async function findRewardById(companyId, rewardId) {
    const reward = await prisma.reward.findFirst({
        where: {
            idReward: rewardId,
            Company_idCompany: companyId,
        },
        include: {
            category: true,
        },
    });
    if (!reward) {
        throw new Error("REWARD_NOT_FOUND");
    }
    return {
        idReward: reward
            .idReward,
        name: reward
            .name,
        description: reward
            .description,
        costAmount: reward
            .costAmount
            .toString(),
        isActive: reward
            .isActive,
        createdAt: reward
            .createdAt,
        category: reward.category
            ? {
                idRewardCategory: reward
                    .category
                    .idRewardCategory,
                name: reward
                    .category
                    .name,
            }
            : null,
    };
}
// =====================================================
// ATUALIZAR RECOMPENSA
// =====================================================
export async function updateReward(companyId, rewardId, data) {
    const reward = await prisma.reward.findFirst({
        where: {
            idReward: rewardId,
            Company_idCompany: companyId,
        },
    });
    if (!reward) {
        throw new Error("REWARD_NOT_FOUND");
    }
    if (data.categoryId !== undefined &&
        data.categoryId !== null) {
        await ensureRewardCategory(companyId, data.categoryId);
    }
    const updatedReward = await prisma.reward.update({
        where: {
            idReward: rewardId,
        },
        data: {
            ...(data.name !== undefined
                ? {
                    name: data.name,
                }
                : {}),
            ...(data.description !== undefined
                ? {
                    description: data.description,
                }
                : {}),
            ...(data.categoryId !== undefined
                ? {
                    RewardCategory_idRewardCategory: data.categoryId,
                }
                : {}),
            ...(data.costAmount !== undefined
                ? {
                    costAmount: data.costAmount,
                }
                : {}),
            ...(data.isActive !== undefined
                ? {
                    isActive: data.isActive,
                }
                : {}),
        },
        include: {
            category: true,
        },
    });
    return {
        idReward: updatedReward
            .idReward,
        name: updatedReward
            .name,
        description: updatedReward
            .description,
        costAmount: updatedReward
            .costAmount
            .toString(),
        isActive: updatedReward
            .isActive,
        createdAt: updatedReward
            .createdAt,
        category: updatedReward.category
            ? {
                idRewardCategory: updatedReward
                    .category
                    .idRewardCategory,
                name: updatedReward
                    .category
                    .name,
            }
            : null,
    };
}
//# sourceMappingURL=reward.service.js.map