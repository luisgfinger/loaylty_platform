import type {
  FastifyInstance,
  FastifyRequest,
} from "fastify";

import {
  authenticateUser,
  createEmployeeUser,
} from "./auth.service.js";

import {
  createEmployeeUserSchema,
  loginSchema,
} from "./auth.schema.js";


// =====================================================
// IDENTIFICADOR DO RATE LIMIT DE LOGIN
//
// Limitamos por:
//
// IP + username
//
// Isso evita que vários funcionários atrás do mesmo
// endereço de rede bloqueiem uns aos outros tão
// facilmente.
//
// Se o body for inválido ou não possuir username,
// usamos somente o IP.
// =====================================================

function getLoginRateLimitKey(
  request: FastifyRequest
): string {
  const body =
    request.body as {
      userName?: unknown;
    } | undefined;


  const userName =
    typeof body?.userName ===
    "string"
      ? body.userName
          .trim()
          .toLowerCase()
      : "";


  if (!userName) {
    return request.ip;
  }


  return [
    request.ip,
    userName,
  ].join(":");
}


// =====================================================
// ROTAS DE AUTENTICAÇÃO
// =====================================================

export async function authRoutes(
  app: FastifyInstance
) {
  // ==================================================
  // CRIAR USUÁRIO PARA FUNCIONÁRIO
  //
  // POST
  // /companies/:companyId/employees/:cpf/user
  //
  // Essa rota é protegida pelo requireAdmin global
  // definido no server.ts.
  // ==================================================

  app.post(
    "/companies/:companyId/employees/:cpf/user",

    async (
      request,
      reply
    ) => {
      const params =
        request.params as {
          companyId: string;
          cpf: string;
        };


      // ===============================================
      // VALIDAR EMPRESA
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
        createEmployeeUserSchema
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
      // CRIAR USUÁRIO
      // ===============================================

      try {
        const user =
          await createEmployeeUser(
            companyId,
            params.cpf,
            parsed.data
          );


        return reply
          .status(201)
          .send(
            user
          );

      } catch (error) {
        if (
          error instanceof Error
        ) {
          // -------------------------------------------
          // FUNCIONÁRIO NÃO EXISTE
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
          // FUNCIONÁRIO JÁ POSSUI USER
          // -------------------------------------------

          if (
            error.message ===
            "USER_ALREADY_EXISTS"
          ) {
            return reply
              .status(409)
              .send({
                error:
                  "Este funcionário já possui usuário",
              });
          }


          // -------------------------------------------
          // USERNAME JÁ EXISTE
          // -------------------------------------------

          if (
            error.message ===
            "USERNAME_ALREADY_EXISTS"
          ) {
            return reply
              .status(409)
              .send({
                error:
                  "Nome de usuário já está sendo utilizado",
              });
          }
        }


        throw error;
      }
    }
  );


  // ==================================================
  // LOGIN
  //
  // POST
  // /auth/login
  //
  // Essa rota é pública.
  //
  // Máximo:
  // 10 tentativas a cada 15 minutos
  // por combinação IP + username.
  // ==================================================

  app.post(
    "/auth/login",

    {
      config: {
        rateLimit: {
          max:
            10,

          timeWindow:
            "15 minutes",

          keyGenerator:
            getLoginRateLimitKey,
        },
      },
    },

    async (
      request,
      reply
    ) => {
      // ===============================================
      // VALIDAR BODY
      // ===============================================

      const parsed =
        loginSchema.safeParse(
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
        // =============================================
        // VALIDAR USUÁRIO, SENHA, EMPRESA E ROLE
        // =============================================

        const auth =
          await authenticateUser(
            parsed.data
          );


        // =============================================
        // GERAR JWT
        // =============================================

        const token =
          await reply.jwtSign(
            {
              userId:
                auth.user.idUser,

              personId:
                auth.user.idPerson,

              employeeId:
                auth
                  .employee
                  .idCompanyEmployee,

              companyId:
                auth
                  .company
                  .idCompany,

              role:
                auth
                  .employee
                  .role,
            },

            {
              expiresIn:
                "8h",
            }
          );


        // =============================================
        // RESPOSTA
        // =============================================

        return reply
          .status(200)
          .send({
            token,

            user: {
              idUser:
                auth
                  .user
                  .idUser,

              userName:
                auth
                  .user
                  .userName,

              name:
                auth
                  .person
                  .name,

              cpf:
                auth
                  .person
                  .cpf,
            },

            employee: {
              idCompanyEmployee:
                auth
                  .employee
                  .idCompanyEmployee,

              role:
                auth
                  .employee
                  .role,
            },

            company: {
              idCompany:
                auth
                  .company
                  .idCompany,

              name:
                auth
                  .company
                  .name,
            },
          });

      } catch (error) {
        if (
          error instanceof Error &&
          error.message ===
            "INVALID_CREDENTIALS"
        ) {
          return reply
            .status(401)
            .send({
              error:
                "Usuário ou senha inválidos",
            });
        }


        throw error;
      }
    }
  );


  // ==================================================
  // USUÁRIO LOGADO
  //
  // GET
  // /auth/me
  //
  // O requireAdmin é aplicado globalmente.
  // ==================================================

  app.get(
    "/auth/me",

    async (
      request,
      reply
    ) => {
      return reply
        .status(200)
        .send({
          authenticated:
            true,

          user:
            request.user,
        });
    }
  );
}