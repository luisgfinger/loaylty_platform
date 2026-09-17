import { z } from "zod";
export const createPurchaseSchema = z.object({
    cpf: z
        .string()
        .transform((value) => value.replace(/\D/g, ""))
        .refine((value) => value.length === 11, {
        message: "CPF deve possuir 11 dígitos",
    }),
    fiscalDocumentNumber: z
        .string()
        .trim()
        .min(1, {
        message: "Informe o número da nota ou cupom fiscal",
    })
        .max(60, {
        message: "O número da nota ou cupom fiscal deve possuir no máximo 60 caracteres",
    }),
    amount: z.coerce
        .number()
        .positive({
        message: "O valor da compra deve ser maior que zero",
    }),
});
//# sourceMappingURL=purchase.schema.js.map