import { z } from "zod";


// =====================================================
// CADASTRAR EMPRESA
// =====================================================

export const createCompanySchema =
  z.object({
    name: z
      .string()
      .trim()
      .min(2)
      .max(150),

    cnpj: z
      .string()
      .transform((value) =>
        value.replace(/\D/g, "")
      )
      .refine(
        (value) =>
          value.length === 14,
        {
          message:
            "CNPJ deve possuir 14 dígitos",
        }
      ),

    address: z
      .string()
      .trim()
      .max(255)
      .optional(),

    email: z
      .string()
      .email()
      .optional(),

    ie: z
      .string()
      .trim()
      .max(30)
      .optional(),

    phoneNumber: z
      .string()
      .transform((value) =>
        value.replace(/\D/g, "")
      )
      .optional(),
  });


export type CreateCompanyInput =
  z.infer<
    typeof createCompanySchema
  >;


// =====================================================
// EDITAR EMPRESA
// =====================================================

export const updateCompanySchema =
  z
    .object({
      name: z
        .string()
        .trim()
        .min(2)
        .max(150)
        .optional(),

      cnpj: z
        .string()
        .transform((value) =>
          value.replace(/\D/g, "")
        )
        .refine(
          (value) =>
            value.length === 14,
          {
            message:
              "CNPJ deve possuir 14 dígitos",
          }
        )
        .optional(),

      address: z
        .string()
        .trim()
        .max(255)
        .nullable()
        .optional(),

      email: z
        .string()
        .email()
        .nullable()
        .optional(),

      ie: z
        .string()
        .trim()
        .max(30)
        .nullable()
        .optional(),

      phoneNumber: z
        .string()
        .transform((value) =>
          value.replace(/\D/g, "")
        )
        .nullable()
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


export type UpdateCompanyInput =
  z.infer<
    typeof updateCompanySchema
  >;