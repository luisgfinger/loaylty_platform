import type {
  FastifyInstance,
} from "fastify";

import {
  createRewardCategorySchema,
  createRewardSchema,
  updateRewardCategorySchema,
  updateRewardSchema,
} from "./reward.schema.js";

import {
  createRewardCategory,
  createReward,
  findRewardById,
  listRewardCategories,
  listRewards,
  updateRewardCategory,
  updateReward,
} from "./reward.service.js";

import {
  customerRewardRoutes,
} from "./customer-reward.routes.js";


// =====================================================
// ROTAS DE RECOMPENSAS
// =====================================================

export async function rewardRoutes(
  app: FastifyInstance
) {
  // ==================================================
  // CRIAR CATEGORIA DE RECOMPENSA
  //
  // POST
  // /companies/:companyId/reward-categories
  // ==================================================

  app.post(
    "/companies/:companyId/reward-categories",

    async (
      request,
      reply
    ) => {
      const params =
        request.params as {
          companyId:
            string;
        };


      // ===============================================
      // EMPRESA
      // ===============================================

      const companyId =
        Number(
          params.companyId
        );


      if (
        !Number.isInteger(
          companyId
        ) ||
        companyId <= 0
      ) {
        return reply
          .status(400)
          .send({
            error:
              "Empresa inválida",
          });
      }


      // ===============================================
      // VALIDAR BODY
      // ===============================================

      const parsed =
        createRewardCategorySchema
          .safeParse(
            request.body
          );


      if (!parsed.success) {
        return reply
          .status(400)
          .send({
            error:
              "Dados inválidos",

            details:
              parsed
                .error
                .issues,
          });
      }


      // ===============================================
      // CRIAR CATEGORIA
      // ===============================================

      try {
        const category =
          await createRewardCategory(
            companyId,
            parsed.data
          );


        return reply
          .status(201)
          .send(
            category
          );

      } catch (error) {
        if (
          error instanceof Error
        ) {
          if (
            error.message ===
            "COMPANY_NOT_FOUND"
          ) {
            return reply
              .status(404)
              .send({
                error:
                  "Empresa não encontrada",
              });
          }


          if (
            error.message ===
            "REWARD_CATEGORY_ALREADY_EXISTS"
          ) {
            return reply
              .status(409)
              .send({
                error:
                  "Já existe uma categoria de recompensa com este nome",
              });
          }
        }


        throw error;
      }
    }
  );


  // ==================================================
  // LISTAR CATEGORIAS DE RECOMPENSA
  //
  // GET
  // /companies/:companyId/reward-categories
  // ==================================================

  app.get(
    "/companies/:companyId/reward-categories",

    async (
      request,
      reply
    ) => {
      const params =
        request.params as {
          companyId:
            string;
        };


      const companyId =
        Number(
          params.companyId
        );


      if (
        !Number.isInteger(
          companyId
        ) ||
        companyId <= 0
      ) {
        return reply
          .status(400)
          .send({
            error:
              "Empresa inválida",
          });
      }


      try {
        const categories =
          await listRewardCategories(
            companyId
          );


        return reply
          .status(200)
          .send({
            categories,
          });

      } catch (error) {
        if (
          error instanceof Error &&
          error.message ===
            "COMPANY_NOT_FOUND"
        ) {
          return reply
            .status(404)
            .send({
              error:
                "Empresa não encontrada",
            });
        }


        throw error;
      }
    }
  );


  // ==================================================
  // EDITAR CATEGORIA DE RECOMPENSA
  //
  // PATCH
  // /companies/:companyId/reward-categories/:categoryId
  // ==================================================

  app.patch(
    "/companies/:companyId/reward-categories/:categoryId",

    async (
      request,
      reply
    ) => {
      const params =
        request.params as {
          companyId:
            string;

          categoryId:
            string;
        };


      // ===============================================
      // EMPRESA
      // ===============================================

      const companyId =
        Number(
          params.companyId
        );


      if (
        !Number.isInteger(
          companyId
        ) ||
        companyId <= 0
      ) {
        return reply
          .status(400)
          .send({
            error:
              "Empresa inválida",
          });
      }


      // ===============================================
      // CATEGORIA
      // ===============================================

      const categoryId =
        Number(
          params.categoryId
        );


      if (
        !Number.isInteger(
          categoryId
        ) ||
        categoryId <= 0
      ) {
        return reply
          .status(400)
          .send({
            error:
              "Categoria inválida",
          });
      }


      // ===============================================
      // VALIDAR BODY
      // ===============================================

      const parsed =
        updateRewardCategorySchema
          .safeParse(
            request.body
          );


      if (!parsed.success) {
        return reply
          .status(400)
          .send({
            error:
              "Dados inválidos",

            details:
              parsed
                .error
                .issues,
          });
      }


      // ===============================================
      // ATUALIZAR CATEGORIA
      // ===============================================

      try {
        const category =
          await updateRewardCategory(
            companyId,
            categoryId,
            parsed.data
          );


        return reply
          .status(200)
          .send(
            category
          );

      } catch (error) {
        if (
          error instanceof Error
        ) {
          if (
            error.message ===
            "REWARD_CATEGORY_NOT_FOUND"
          ) {
            return reply
              .status(404)
              .send({
                error:
                  "Categoria de recompensa não encontrada",
              });
          }


          if (
            error.message ===
            "REWARD_CATEGORY_ALREADY_EXISTS"
          ) {
            return reply
              .status(409)
              .send({
                error:
                  "Já existe uma categoria de recompensa com este nome",
              });
          }
        }


        throw error;
      }
    }
  );


  // ==================================================
  // CRIAR RECOMPENSA
  //
  // POST
  // /companies/:companyId/rewards
  // ==================================================

  app.post(
    "/companies/:companyId/rewards",

    async (
      request,
      reply
    ) => {
      const params =
        request.params as {
          companyId:
            string;
        };


      // ===============================================
      // EMPRESA
      // ===============================================

      const companyId =
        Number(
          params.companyId
        );


      if (
        !Number.isInteger(
          companyId
        ) ||
        companyId <= 0
      ) {
        return reply
          .status(400)
          .send({
            error:
              "Empresa inválida",
          });
      }


      // ===============================================
      // VALIDAR BODY
      // ===============================================

      const parsed =
        createRewardSchema
          .safeParse(
            request.body
          );


      if (!parsed.success) {
        return reply
          .status(400)
          .send({
            error:
              "Dados inválidos",

            details:
              parsed
                .error
                .issues,
          });
      }


      // ===============================================
      // CRIAR RECOMPENSA
      // ===============================================

      try {
        const reward =
          await createReward(
            companyId,
            parsed.data
          );


        return reply
          .status(201)
          .send(
            reward
          );

      } catch (error) {
        if (
          error instanceof Error
        ) {
          if (
            error.message ===
            "COMPANY_NOT_FOUND"
          ) {
            return reply
              .status(404)
              .send({
                error:
                  "Empresa não encontrada",
              });
          }


          if (
            error.message ===
            "REWARD_CATEGORY_NOT_FOUND"
          ) {
            return reply
              .status(404)
              .send({
                error:
                  "Categoria de recompensa não encontrada ou inativa",
              });
          }
        }


        throw error;
      }
    }
  );


  // ==================================================
  // LISTAR RECOMPENSAS
  //
  // GET
  // /companies/:companyId/rewards
  // ==================================================

  app.get(
    "/companies/:companyId/rewards",

    async (
      request,
      reply
    ) => {
      const params =
        request.params as {
          companyId:
            string;
        };


      const companyId =
        Number(
          params.companyId
        );


      if (
        !Number.isInteger(
          companyId
        ) ||
        companyId <= 0
      ) {
        return reply
          .status(400)
          .send({
            error:
              "Empresa inválida",
          });
      }


      try {
        const rewards =
          await listRewards(
            companyId
          );


        return reply
          .status(200)
          .send({
            rewards,
          });

      } catch (error) {
        if (
          error instanceof Error &&
          error.message ===
            "COMPANY_NOT_FOUND"
        ) {
          return reply
            .status(404)
            .send({
              error:
                "Empresa não encontrada",
            });
        }


        throw error;
      }
    }
  );


  // ==================================================
  // BUSCAR RECOMPENSA
  //
  // GET
  // /companies/:companyId/rewards/:rewardId
  // ==================================================

  app.get(
    "/companies/:companyId/rewards/:rewardId",

    async (
      request,
      reply
    ) => {
      const params =
        request.params as {
          companyId:
            string;

          rewardId:
            string;
        };


      // ===============================================
      // EMPRESA
      // ===============================================

      const companyId =
        Number(
          params.companyId
        );


      if (
        !Number.isInteger(
          companyId
        ) ||
        companyId <= 0
      ) {
        return reply
          .status(400)
          .send({
            error:
              "Empresa inválida",
          });
      }


      // ===============================================
      // RECOMPENSA
      // ===============================================

      const rewardId =
        Number(
          params.rewardId
        );


      if (
        !Number.isInteger(
          rewardId
        ) ||
        rewardId <= 0
      ) {
        return reply
          .status(400)
          .send({
            error:
              "Recompensa inválida",
          });
      }


      try {
        const reward =
          await findRewardById(
            companyId,
            rewardId
          );


        return reply
          .status(200)
          .send(
            reward
          );

      } catch (error) {
        if (
          error instanceof Error &&
          error.message ===
            "REWARD_NOT_FOUND"
        ) {
          return reply
            .status(404)
            .send({
              error:
                "Recompensa não encontrada",
            });
        }


        throw error;
      }
    }
  );


  // ==================================================
  // EDITAR RECOMPENSA
  //
  // PATCH
  // /companies/:companyId/rewards/:rewardId
  // ==================================================

  app.patch(
    "/companies/:companyId/rewards/:rewardId",

    async (
      request,
      reply
    ) => {
      const params =
        request.params as {
          companyId:
            string;

          rewardId:
            string;
        };


      // ===============================================
      // EMPRESA
      // ===============================================

      const companyId =
        Number(
          params.companyId
        );


      if (
        !Number.isInteger(
          companyId
        ) ||
        companyId <= 0
      ) {
        return reply
          .status(400)
          .send({
            error:
              "Empresa inválida",
          });
      }


      // ===============================================
      // RECOMPENSA
      // ===============================================

      const rewardId =
        Number(
          params.rewardId
        );


      if (
        !Number.isInteger(
          rewardId
        ) ||
        rewardId <= 0
      ) {
        return reply
          .status(400)
          .send({
            error:
              "Recompensa inválida",
          });
      }


      // ===============================================
      // VALIDAR BODY
      // ===============================================

      const parsed =
        updateRewardSchema
          .safeParse(
            request.body
          );


      if (!parsed.success) {
        return reply
          .status(400)
          .send({
            error:
              "Dados inválidos",

            details:
              parsed
                .error
                .issues,
          });
      }


      // ===============================================
      // ATUALIZAR RECOMPENSA
      // ===============================================

      try {
        const reward =
          await updateReward(
            companyId,
            rewardId,
            parsed.data
          );


        return reply
          .status(200)
          .send(
            reward
          );

      } catch (error) {
        if (
          error instanceof Error
        ) {
          if (
            error.message ===
            "REWARD_NOT_FOUND"
          ) {
            return reply
              .status(404)
              .send({
                error:
                  "Recompensa não encontrada",
              });
          }


          if (
            error.message ===
            "REWARD_CATEGORY_NOT_FOUND"
          ) {
            return reply
              .status(404)
              .send({
                error:
                  "Categoria de recompensa não encontrada ou inativa",
              });
          }
        }


        throw error;
      }
    }
  );


  // Rotas de pendências, aprovação, escolha e resgate.
  await customerRewardRoutes(
    app
  );
}