import { z } from "zod";

export const createCustomerSchema = z.object({
  cpf: z
    .string()
    .transform((value) => value.replace(/\D/g, ""))
    .refine((value) => value.length === 11, {
      message: "CPF deve possuir 11 dígitos",
    }),

  name: z.string().min(2).max(120),

  email: z.string().email().optional(),

  phoneNumber: z.string().max(20).optional(),

  dateOfBirth: z.string().optional(),

  whatsappOptIn: z.boolean().default(false),
});

export type CreateCustomerInput = z.infer<
  typeof createCustomerSchema
>;

export const updateCustomerSchema =
  z.object({
    name: z
      .string()
      .trim()
      .min(2)
      .max(120)
      .optional(),

    email: z
      .string()
      .email()
      .nullable()
      .optional(),

    phoneNumber: z
      .string()
      .transform((value) =>
        value.replace(/\D/g, "")
      )
      .nullable()
      .optional(),

    dateOfBirth: z
      .coerce
      .date()
      .nullable()
      .optional(),

    whatsappOptIn: z
      .boolean()
      .optional(),

    isActive: z
      .boolean()
      .optional(),
  })
  .refine(
    (data) =>
      Object.keys(data).length > 0,
    {
      message:
        "Informe pelo menos um campo para alterar",
    }
  );


export type UpdateCustomerInput =
  z.infer<
    typeof updateCustomerSchema
  >;