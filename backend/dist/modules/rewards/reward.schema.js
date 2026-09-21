import { z } from "zod";
// =====================================================
// PARAMS
// =====================================================
export const companyParamsSchema = z.object({
    companyId: z.coerce
        .number()
        .int()
        .positive(),
});
export const rewardCategoryParamsSchema = z.object({
    companyId: z.coerce
        .number()
        .int()
        .positive(),
    categoryId: z.coerce
        .number()
        .int()
        .positive(),
});
export const rewardParamsSchema = z.object({
    companyId: z.coerce
        .number()
        .int()
        .positive(),
    rewardId: z.coerce
        .number()
        .int()
        .positive(),
});
// =====================================================
// CATEGORIA
// =====================================================
export const createRewardCategorySchema = z.object({
    name: z.string()
        .trim()
        .min(1, "Informe o nome da categoria.")
        .max(100, "O nome deve possuir no máximo 100 caracteres."),
    description: z.string()
        .trim()
        .max(255, "A descrição deve possuir no máximo 255 caracteres.")
        .nullable()
        .optional(),
});
export const updateRewardCategorySchema = z.object({
    name: z.string()
        .trim()
        .min(1, "Informe o nome da categoria.")
        .max(100, "O nome deve possuir no máximo 100 caracteres.")
        .optional(),
    description: z.string()
        .trim()
        .max(255, "A descrição deve possuir no máximo 255 caracteres.")
        .nullable()
        .optional(),
    isActive: z.boolean()
        .optional(),
})
    .refine((data) => Object.keys(data).length > 0, {
    message: "Informe pelo menos um campo para atualização.",
});
// =====================================================
// RECOMPENSA
// =====================================================
export const createRewardSchema = z.object({
    categoryId: z.number()
        .int()
        .positive()
        .nullable()
        .optional(),
    name: z.string()
        .trim()
        .min(1, "Informe o nome da recompensa.")
        .max(100, "O nome deve possuir no máximo 100 caracteres."),
    description: z.string()
        .trim()
        .max(255, "A descrição deve possuir no máximo 255 caracteres.")
        .nullable()
        .optional(),
    costAmount: z.coerce
        .number()
        .finite()
        .nonnegative("O custo da recompensa não pode ser negativo."),
});
export const updateRewardSchema = z.object({
    categoryId: z.number()
        .int()
        .positive()
        .nullable()
        .optional(),
    name: z.string()
        .trim()
        .min(1, "Informe o nome da recompensa.")
        .max(100, "O nome deve possuir no máximo 100 caracteres.")
        .optional(),
    description: z.string()
        .trim()
        .max(255, "A descrição deve possuir no máximo 255 caracteres.")
        .nullable()
        .optional(),
    costAmount: z.coerce
        .number()
        .finite()
        .nonnegative("O custo da recompensa não pode ser negativo.")
        .optional(),
    isActive: z.boolean()
        .optional(),
})
    .refine((data) => Object.keys(data).length > 0, {
    message: "Informe pelo menos um campo para atualização.",
});
//# sourceMappingURL=reward.schema.js.map