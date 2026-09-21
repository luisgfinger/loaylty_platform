import type {
  FastifyInstance,
} from "fastify";

import {
  createEmployeeSchema,
  updateEmployeeSchema,
} from "./employee.schema.js";

import {
  createEmployee,
  findEmployeeByCpf,
  listEmployees,
  updateEmployee,
} from "./employee.service.js";

import type {
  AuthenticatedUser,
} from "../auth/auth.types.js";


// =====================================================
// ROTAS DE FUNCIONÁRIOS
// =====================================================

export async function employeeRoutes(
  app: FastifyInstance
) {
  // ==================================================
  // CADASTRAR FUNCIONÁRIO
  //
  // POST
  // /companies/:companyId/employees
  // ==================================================

  app.post(
    "/companies/:companyId/employees",

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
        createEmployeeSchema
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
      // CRIAR FUNCIONÁRIO
      // ===============================================

      try {
        const employee =
          await createEmployee(
            companyId,
            parsed.data
          );


        return reply
          .status(201)
          .send(
            employee
          );

      } catch (error) {
        if (
          error instanceof Error
        ) {
          // -------------------------------------------
          // EMPRESA NÃO EXISTE
          // -------------------------------------------

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


          // -------------------------------------------
          // FUNCIONÁRIO JÁ EXISTE
          // -------------------------------------------

          if (
            error.message ===
            "EMPLOYEE_ALREADY_EXISTS"
          ) {
            return reply
              .status(409)
              .send({
                error:
                  "Funcionário já cadastrado nesta empresa",
              });
          }
        }


        throw error;
      }
    }
  );


  // ==================================================
  // LISTAR FUNCIONÁRIOS
  //
  // GET
  // /companies/:companyId/employees
  // ==================================================

  app.get(
    "/companies/:companyId/employees",

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
        const employees =
          await listEmployees(
            companyId
          );


        return reply
          .status(200)
          .send({
            employees,
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
  // BUSCAR FUNCIONÁRIO PELO CPF
  //
  // GET
  // /companies/:companyId/employees/:cpf
  // ==================================================

  app.get(
    "/companies/:companyId/employees/:cpf",

    async (
      request,
      reply
    ) => {
      const params =
        request.params as {
          companyId:
            string;

          cpf:
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
        const employee =
          await findEmployeeByCpf(
            companyId,
            params.cpf
          );


        return reply
          .status(200)
          .send(
            employee
          );

      } catch (error) {
        if (
          error instanceof Error &&
          error.message ===
            "EMPLOYEE_NOT_FOUND"
        ) {
          return reply
            .status(404)
            .send({
              error:
                "Funcionário não encontrado",
            });
        }


        throw error;
      }
    }
  );


  // ==================================================
  // EDITAR FUNCIONÁRIO
  //
  // PATCH
  // /companies/:companyId/employees/:cpf
  // ==================================================

  app.patch(
    "/companies/:companyId/employees/:cpf",

    async (
      request,
      reply
    ) => {
      const params =
        request.params as {
          companyId:
            string;

          cpf:
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
      // ADMIN AUTENTICADO
      // ===============================================

      const authenticatedUser =
        request.user as
          AuthenticatedUser;


      // ===============================================
      // VALIDAR BODY
      // ===============================================

      const parsed =
        updateEmployeeSchema
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
      // ATUALIZAR
      // ===============================================

      try {
        const employee =
          await updateEmployee(
            companyId,

            authenticatedUser
              .employeeId,

            params.cpf,

            parsed.data
          );


        return reply
          .status(200)
          .send(
            employee
          );

      } catch (error) {
        if (
          error instanceof Error
        ) {
          // -------------------------------------------
          // FUNCIONÁRIO NÃO ENCONTRADO
          // -------------------------------------------

          if (
            error.message ===
            "EMPLOYEE_NOT_FOUND"
          ) {
            return reply
              .status(404)
              .send({
                error:
                  "Funcionário não encontrado",
              });
          }


          // -------------------------------------------
          // ADMIN TENTOU INATIVAR A SI MESMO
          // -------------------------------------------

          if (
            error.message ===
            "CANNOT_DISABLE_SELF"
          ) {
            return reply
              .status(409)
              .send({
                error:
                  "Você não pode inativar o próprio usuário administrador",
              });
          }


          // -------------------------------------------
          // ADMIN TENTOU REMOVER O PRÓPRIO ADMIN
          // -------------------------------------------

          if (
            error.message ===
            "CANNOT_REMOVE_OWN_ADMIN_ROLE"
          ) {
            return reply
              .status(409)
              .send({
                error:
                  "Você não pode remover o próprio cargo de ADMIN",
              });
          }
        }


        throw error;
      }
    }
  );
}