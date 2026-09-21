import { z } from "zod";
// =====================================================
// CRIAR USUÁRIO PARA FUNCIONÁRIO
// =====================================================
export const createEmployeeUserSchema = z.object({
    userName: z.string()
        .trim()
        .min(3, "Usuário deve possuir pelo menos 3 caracteres")
        .max(100),
    password: z.string()
        .min(8, "Senha deve possuir pelo menos 8 caracteres")
        .max(100),
});
// =====================================================
// LOGIN
// =====================================================
export const loginSchema = z.object({
    companyId: z.coerce
        .number()
        .int()
        .positive(),
    userName: z.string()
        .trim()
        .min(1),
    password: z.string()
        .min(1),
});
//# sourceMappingURL=auth.schema.js.map