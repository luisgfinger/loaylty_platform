import type {
  FastifyInstance,
  FastifyReply,
} from "fastify";

import {
  approveCustomerRewardSchema,
  customerRewardParamsSchema,
  customerRewardsByCpfParamsSchema,
  denyCustomerRewardSchema,
  selectCustomerRewardSchema,
} from "./customer-reward.schema.js";

import {
  approveCustomerReward,
  denyCustomerReward,
  listCustomerRewards,
  listPendingCustomerRewards,
  redeemCustomerReward,
  selectCustomerReward,
} from "./customer-reward.service.js";


// =====================================================
// FUNCIONÁRIO AUTENTICADO
// =====================================================

function getAuthenticatedEmployeeId(
  request: unknown
): number {
  const user =
    (
      request as {
        user?: {
          employeeId?: number;
        };
      }
    ).user;


  if (
    !user ||
    !Number.isInteger(
      user.employeeId
    ) ||
    !user.employeeId ||
    user.employeeId <= 0
  ) {
    throw new Error(
      "EMPLOYEE_NOT_AUTHORIZED"
    );
  }


  return user.employeeId;
}


// =====================================================
// ERROS
// =====================================================

function sendCustomerRewardError(
  reply: FastifyReply,
  error: unknown
) {
  if (!(error instanceof Error)) {
    return null;
  }


  const messages:
    Record<
      string,
      {
        status: number;
        error: string;
      }
    > = {
      COMPANY_NOT_FOUND: {
        status: 404,
        error: "Empresa não encontrada",
      },

      EMPLOYEE_NOT_AUTHORIZED: {
        status: 403,
        error: "Funcionário não autorizado",
      },

      PENDING_CUSTOMER_REWARD_NOT_FOUND: {
        status: 404,
        error: "Recompensa pendente não encontrada",
      },

      CUSTOMER_REWARD_NOT_FOUND: {
        status: 404,
        error: "Recompensa do cliente não encontrada",
      },

      CUSTOMER_NOT_FOUND: {
        status: 404,
        error: "Cliente não encontrado",
      },

      REWARD_NOT_FOUND: {
        status: 404,
        error: "Recompensa não encontrada ou inativa",
      },

      REWARD_TIER_MISMATCH: {
        status: 409,
        error: "A recompensa escolhida não pertence à faixa selecionada",
      },

      NO_ACTIVE_REWARDS_FOR_TIER: {
        status: 409,
        error: "Não existem recompensas ativas nessa faixa",
      },

      INSUFFICIENT_REWARD_FUND: {
        status: 409,
        error: "Saldo insuficiente no fundo de recompensas",
      },

      INVALID_EXPIRATION_DATE: {
        status: 400,
        error: "Data de expiração inválida",
      },

      EXPIRATION_BEFORE_REDEMPTION: {
        status: 400,
        error: "A recompensa expiraria antes de poder ser resgatada",
      },

      CUSTOMER_REWARD_EXPIRED: {
        status: 409,
        error: "A recompensa já expirou",
      },

      CUSTOMER_REWARD_NOT_CHOICE: {
        status: 409,
        error: "Esta recompensa não permite escolha pelo cliente",
      },

      CUSTOMER_REWARD_ALREADY_SELECTED: {
        status: 409,
        error: "A recompensa já foi escolhida",
      },

      CUSTOMER_REWARD_TIER_NOT_DEFINED: {
        status: 409,
        error: "A faixa final da recompensa não foi definida",
      },

      CUSTOMER_REWARD_SELECTION_REQUIRED: {
        status: 409,
        error: "O cliente precisa escolher a recompensa antes do resgate",
      },

      CUSTOMER_REWARD_NOT_APPROVED: {
        status: 409,
        error: "A recompensa ainda não foi aprovada",
      },

      CUSTOMER_REWARD_NOT_REDEEMABLE_YET: {
        status: 409,
        error: "A recompensa ainda não pode ser resgatada",
      },
    };


  const mapped =
    messages[
      error.message
    ];


  if (!mapped) {
    return null;
  }


  return reply
    .status(
      mapped.status
    )
    .send({
      error:
        mapped.error,
    });
}


// =====================================================
// ROTAS DE CUSTOMER REWARD
// =====================================================

export async function customerRewardRoutes(
  app: FastifyInstance
) {
  // ==================================================
  // LISTAR PENDÊNCIAS
  // ==================================================

  app.get(
    "/companies/:companyId/customer-rewards/pending",

    async (
      request,
      reply
    ) => {
      const parsed =
        customerRewardParamsSchema
          .pick({
            companyId:
              true,
          })
          .safeParse(
            request.params
          );


      if (!parsed.success) {
        return reply
          .status(400)
          .send({
            error:
              "Empresa inválida",

            details:
              parsed.error.issues,
          });
      }


      try {
        const result =
          await listPendingCustomerRewards(
            parsed.data.companyId
          );


        return reply
          .status(200)
          .send(
            result
          );
      } catch (error) {
        const handled =
          sendCustomerRewardError(
            reply,
            error
          );


        if (handled) {
          return handled;
        }


        throw error;
      }
    }
  );


  // ==================================================
  // APROVAR PENDÊNCIA
  // ==================================================

  app.patch(
    "/companies/:companyId/customer-rewards/:customerRewardId/approve",

    async (
      request,
      reply
    ) => {
      const params =
        customerRewardParamsSchema
          .safeParse(
            request.params
          );


      const body =
        approveCustomerRewardSchema
          .safeParse(
            request.body
          );


      if (
        !params.success ||
        !body.success
      ) {
        return reply
          .status(400)
          .send({
            error:
              "Dados inválidos",

            details: [
              ...(
                params.success
                  ? []
                  : params.error.issues
              ),
              ...(
                body.success
                  ? []
                  : body.error.issues
              ),
            ],
          });
      }


      try {
        const employeeId =
          getAuthenticatedEmployeeId(
            request
          );


        const result =
          await approveCustomerReward(
            params.data.companyId,
            employeeId,
            BigInt(
              params.data
                .customerRewardId
            ),
            body.data
          );


        return reply
          .status(200)
          .send(
            result
          );
      } catch (error) {
        const handled =
          sendCustomerRewardError(
            reply,
            error
          );


        if (handled) {
          return handled;
        }


        throw error;
      }
    }
  );


  // ==================================================
  // NEGAR PENDÊNCIA
  // ==================================================

  app.patch(
    "/companies/:companyId/customer-rewards/:customerRewardId/deny",

    async (
      request,
      reply
    ) => {
      const params =
        customerRewardParamsSchema
          .safeParse(
            request.params
          );


      const body =
        denyCustomerRewardSchema
          .safeParse(
            request.body ??
            {}
          );


      if (
        !params.success ||
        !body.success
      ) {
        return reply
          .status(400)
          .send({
            error:
              "Dados inválidos",
          });
      }


      try {
        const employeeId =
          getAuthenticatedEmployeeId(
            request
          );


        const result =
          await denyCustomerReward(
            params.data.companyId,
            employeeId,
            BigInt(
              params.data
                .customerRewardId
            ),
            body.data
          );


        return reply
          .status(200)
          .send(
            result
          );
      } catch (error) {
        const handled =
          sendCustomerRewardError(
            reply,
            error
          );


        if (handled) {
          return handled;
        }


        throw error;
      }
    }
  );


  // ==================================================
  // CLIENTE ESCOLHE UMA RECOMPENSA
  // ==================================================

  app.patch(
    "/companies/:companyId/customer-rewards/:customerRewardId/select",

    async (
      request,
      reply
    ) => {
      const params =
        customerRewardParamsSchema
          .safeParse(
            request.params
          );


      const body =
        selectCustomerRewardSchema
          .safeParse(
            request.body
          );


      if (
        !params.success ||
        !body.success
      ) {
        return reply
          .status(400)
          .send({
            error:
              "Dados inválidos",
          });
      }


      try {
        const result =
          await selectCustomerReward(
            params.data.companyId,
            BigInt(
              params.data
                .customerRewardId
            ),
            body.data
          );


        return reply
          .status(200)
          .send(
            result
          );
      } catch (error) {
        const handled =
          sendCustomerRewardError(
            reply,
            error
          );


        if (handled) {
          return handled;
        }


        throw error;
      }
    }
  );


  // ==================================================
  // RESGATAR
  // ==================================================

  app.patch(
    "/companies/:companyId/customer-rewards/:customerRewardId/redeem",

    async (
      request,
      reply
    ) => {
      const params =
        customerRewardParamsSchema
          .safeParse(
            request.params
          );


      if (!params.success) {
        return reply
          .status(400)
          .send({
            error:
              "Dados inválidos",

            details:
              params.error.issues,
          });
      }


      try {
        const result =
          await redeemCustomerReward(
            params.data.companyId,
            BigInt(
              params.data
                .customerRewardId
            )
          );


        return reply
          .status(200)
          .send(
            result
          );
      } catch (error) {
        const handled =
          sendCustomerRewardError(
            reply,
            error
          );


        if (handled) {
          return handled;
        }


        throw error;
      }
    }
  );


  // ==================================================
  // LISTAR RECOMPENSAS DO CLIENTE
  // ==================================================

  app.get(
    "/companies/:companyId/customers/:cpf/rewards",

    async (
      request,
      reply
    ) => {
      const params =
        customerRewardsByCpfParamsSchema
          .safeParse(
            request.params
          );


      if (!params.success) {
        return reply
          .status(400)
          .send({
            error:
              "Dados inválidos",

            details:
              params.error.issues,
          });
      }


      try {
        const result =
          await listCustomerRewards(
            params.data.companyId,
            params.data.cpf
          );


        return reply
          .status(200)
          .send(
            result
          );
      } catch (error) {
        const handled =
          sendCustomerRewardError(
            reply,
            error
          );


        if (handled) {
          return handled;
        }


        throw error;
      }
    }
  );
}
