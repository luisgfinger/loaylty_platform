import {
  z,
} from "zod";


// =====================================================
// CADASTRO
// =====================================================

export const createEmployeeSchema =
  z.object({
    cpf: z
      .string()
      .transform(
        (
          value
        ) =>
          value.replace(
            /\D/g,
            ""
          )
      )
      .refine(
        (
          value
        ) =>
          value.length ===
          11,

        {
          message:
            "CPF deve possuir 11 dígitos",
        }
      ),

    name: z
      .string()
      .trim()
      .min(2)
      .max(120),

    email: z
      .string()
      .email()
      .optional(),

    phoneNumber: z
      .string()
      .transform(
        (
          value
        ) =>
          value.replace(
            /\D/g,
            ""
          )
      )
      .optional(),

    dateOfBirth: z
      .coerce
      .date()
      .optional(),

    admissionDate: z
      .coerce
      .date()
      .optional(),

    role: z
      .string()
      .trim()
      .min(2)
      .max(50)
      .transform(
        (
          value
        ) =>
          value.toUpperCase()
      )
      .optional(),
  });


export type CreateEmployeeInput =
  z.infer<
    typeof createEmployeeSchema
  >;


// =====================================================
// EDIÇÃO
// =====================================================

export const updateEmployeeSchema =
  z
    .object({
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
        .transform(
          (
            value
          ) =>
            value.replace(
              /\D/g,
              ""
            )
        )
        .nullable()
        .optional(),

      dateOfBirth: z
        .coerce
        .date()
        .nullable()
        .optional(),

      admissionDate: z
        .coerce
        .date()
        .nullable()
        .optional(),

      terminationDate: z
        .coerce
        .date()
        .nullable()
        .optional(),

      role: z
        .string()
        .trim()
        .min(2)
        .max(50)
        .transform(
          (
            value
          ) =>
            value.toUpperCase()
        )
        .nullable()
        .optional(),

      isActive: z
        .boolean()
        .optional(),
    })
    .refine(
      (
        data
      ) =>
        Object.keys(
          data
        ).length >
        0,

      {
        message:
          "Informe pelo menos um campo para alterar",
      }
    );


export type UpdateEmployeeInput =
  z.infer<
    typeof updateEmployeeSchema
  >;