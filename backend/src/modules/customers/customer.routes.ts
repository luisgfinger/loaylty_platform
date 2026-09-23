import type {
  FastifyInstance,
} from "fastify";

import {
  createCustomerSchema,
  updateCustomerSchema,
} from "./customer.schema.js";

import {
  createCustomer,
  findAllCustomers,
  findCustomerByCpf,
  updateCustomer,
} from "./customer.service.js";

import type {
  AuthenticatedUser,
} from "../auth/auth.types.js";


// =====================================================
// ROTAS DE CLIENTES
// =====================================================

export async function customerRoutes(
  app: FastifyInstance
) {
  // ==================================================
  // CADASTRAR CLIENTE
  //
  // POST
  // /companies/:companyId/customers
  // ==================================================

  app.post(
    "/companies/:companyId/customers",

    async (
      request,
      reply
    ) => {
      const params =
        request.params as {
          companyId: string;
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
      // USUÁRIO AUTENTICADO
      // ===============================================

      const authenticatedUser =
        request.user as AuthenticatedUser;


      // ===============================================
      // BODY
      // ===============================================

      const parsed =
        createCustomerSchema
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
      // CRIAR CLIENTE
      // ===============================================

      try {
        const customer =
          await createCustomer(
            companyId,

            authenticatedUser
              .employeeId,

            parsed.data
          );


        return reply
          .status(201)
          .send(
            customer
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
            "CUSTOMER_ALREADY_EXISTS"
          ) {
            return reply
              .status(409)
              .send({
                error:
                  "Cliente já cadastrado nesta empresa",
              });
          }


          if (
            error.message ===
            "EMPLOYEE_NOT_AUTHORIZED"
          ) {
            return reply
              .status(403)
              .send({
                error:
                  "Funcionário não autorizado",
              });
          }
        }


        throw error;
      }
    }
  );

  // ==================================================
// LISTAR TODOS OS CLIENTES
//
// GET
// /companies/:companyId/customers
// ==================================================

app.get(
  "/companies/:companyId/customers",

  async (
    request,
    reply
  ) => {
    const params =
      request.params as {
        companyId: string;
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
    // BUSCAR CLIENTES
    // ===============================================

    const customers =
      await findAllCustomers(
        companyId
      );


    return reply
      .status(200)
      .send(
        customers
      );
  }
);


  // ==================================================
  // BUSCAR CLIENTE PELO CPF
  //
  // GET
  // /companies/:companyId/customers/:cpf
  // ==================================================

  app.get(
    "/companies/:companyId/customers/:cpf",

    async (
      request,
      reply
    ) => {
      const params =
        request.params as {
          companyId: string;
          cpf: string;
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
        const customer =
          await findCustomerByCpf(
            companyId,
            params.cpf
          );


        return reply
          .status(200)
          .send(
            customer
          );

      } catch (error) {
        if (
          error instanceof Error &&
          error.message ===
            "CUSTOMER_NOT_FOUND"
        ) {
          return reply
            .status(404)
            .send({
              error:
                "Cliente não encontrado",
            });
        }


        throw error;
      }
    }
  );

  app.patch(
  "/companies/:companyId/customers/:cpf",

  async (
    request,
    reply
  ) => {
    const params =
      request.params as {
        companyId: string;
        cpf: string;
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


    const parsed =
      updateCustomerSchema
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


    try {
      const customer =
        await updateCustomer(
          companyId,
          params.cpf,
          parsed.data
        );


      return reply
        .status(200)
        .send(
          customer
        );

    } catch (error) {
      if (
        error instanceof Error &&
        error.message ===
          "CUSTOMER_NOT_FOUND"
      ) {
        return reply
          .status(404)
          .send({
            error:
              "Cliente não encontrado",
          });
      }


      throw error;
    }
  }
);
}