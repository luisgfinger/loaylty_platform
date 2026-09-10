import { z } from "zod";


export const createPurchaseSchema =
  z.object({
    cpf: z
      .string()
      .transform(
        (value) =>
          value.replace(
            /\D/g,
            ""
          )
      )
      .refine(
        (value) =>
          value.length === 11,
        {
          message:
            "CPF deve possuir 11 dígitos",
        }
      ),

    amount:
      z.coerce
        .number()
        .positive({
          message:
            "O valor da compra deve ser maior que zero",
        }),
  });


export type CreatePurchaseInput =
  z.infer<
    typeof createPurchaseSchema
  >;