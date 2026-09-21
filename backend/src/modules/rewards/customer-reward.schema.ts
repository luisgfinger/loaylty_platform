import { z } from "zod";


export const customerRewardParamsSchema =
  z.object({
    companyId:
      z.coerce
        .number()
        .int()
        .positive(),

    customerRewardId:
      z.string()
        .regex(
          /^\d+$/,
          "Recompensa do cliente inválida."
        ),
  });


export const customerRewardsByCpfParamsSchema =
  z.object({
    companyId:
      z.coerce
        .number()
        .int()
        .positive(),

    cpf:
      z.string()
        .transform(
          (value) =>
            value.replace(/\D/g, "")
        )
        .refine(
          (value) =>
            value.length === 11,
          "CPF inválido."
        ),
  });


export const approveCustomerRewardSchema =
  z.object({
    rewardType:
      z.enum([
        "DIRECT",
        "CHOICE",
      ]),

    finalTier:
      z.enum([
        "LOW",
        "MEDIUM",
        "HIGH",
      ]),

    rewardId:
      z.number()
        .int()
        .positive()
        .nullable()
        .optional(),

    redemptionTiming:
      z.enum([
        "IMMEDIATE",
        "NEXT_PURCHASE",
        "NEXT_PURCHASE_DAY",
      ]),

    expiresOn:
      z.string()
        .regex(
          /^\d{4}-\d{2}-\d{2}$/,
          "A data de expiração deve estar no formato AAAA-MM-DD."
        )
        .nullable()
        .optional(),

    decisionNote:
      z.string()
        .trim()
        .max(
          255,
          "A observação deve possuir no máximo 255 caracteres."
        )
        .nullable()
        .optional(),
  })
  .superRefine(
    (
      data,
      ctx
    ) => {
      if (
        data.rewardType === "DIRECT" &&
        !data.rewardId
      ) {
        ctx.addIssue({
          code:
            z.ZodIssueCode.custom,
          path: [
            "rewardId",
          ],
          message:
            "Informe a recompensa quando o tipo for DIRECT.",
        });
      }

      if (
        data.rewardType === "CHOICE" &&
        data.rewardId !== undefined &&
        data.rewardId !== null
      ) {
        ctx.addIssue({
          code:
            z.ZodIssueCode.custom,
          path: [
            "rewardId",
          ],
          message:
            "Não informe rewardId quando o cliente puder escolher.",
        });
      }
    }
  );


export const denyCustomerRewardSchema =
  z.object({
    decisionNote:
      z.string()
        .trim()
        .max(
          255,
          "O motivo deve possuir no máximo 255 caracteres."
        )
        .nullable()
        .optional(),
  });


export const selectCustomerRewardSchema =
  z.object({
    rewardId:
      z.number()
        .int()
        .positive(),
  });


export type ApproveCustomerRewardInput =
  z.infer<
    typeof approveCustomerRewardSchema
  >;

export type DenyCustomerRewardInput =
  z.infer<
    typeof denyCustomerRewardSchema
  >;

export type SelectCustomerRewardInput =
  z.infer<
    typeof selectCustomerRewardSchema
  >;
