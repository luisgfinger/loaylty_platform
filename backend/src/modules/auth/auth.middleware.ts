import type {
  FastifyReply,
  FastifyRequest,
} from "fastify";

import {
  prisma,
} from "../../lib/prisma.js";

import type {
  AuthenticatedUser,
} from "./auth.types.js";


// =====================================================
// SOMENTE ADMIN
// =====================================================

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // ==================================================
  // VALIDAR JWT
  // ==================================================

  try {
    await request.jwtVerify();
  } catch {
    return reply
      .status(401)
      .send({
        error: "Não autenticado",
      });
  }


  // ==================================================
  // DADOS DO USUÁRIO AUTENTICADO
  // ==================================================

  const user =
    request.user as AuthenticatedUser;


  // ==================================================
  // VALIDAR CLAIMS BÁSICAS
  // ==================================================

  if (
    !Number.isInteger(user.userId) ||
    user.userId <= 0 ||
    !Number.isInteger(user.personId) ||
    user.personId <= 0 ||
    !Number.isInteger(user.employeeId) ||
    user.employeeId <= 0 ||
    !Number.isInteger(user.companyId) ||
    user.companyId <= 0
  ) {
    return reply
      .status(401)
      .send({
        error: "Não autenticado",
      });
  }


  // ==================================================
  // VALIDAR ROLE INFORMADA NO TOKEN
  // ==================================================

  if (
    user.role !== "ADMIN"
  ) {
    return reply
      .status(403)
      .send({
        error:
          "Acesso permitido somente para administradores",
      });
  }


  // ==================================================
  // REVALIDAR AUTORIZAÇÃO ATUAL NO BANCO
  //
  // O JWT prova que o token foi emitido pelo sistema,
  // mas não garante que o usuário ainda esteja ativo.
  //
  // Revalidamos:
  //
  // - User ativo
  // - CompanyEmployee ativo
  // - CompanyPerson ativo
  // - vínculo com a mesma pessoa
  // - vínculo com a mesma empresa
  // - empresa ativa
  // - role atual ADMIN
  //
  // Dessa forma, um token antigo perde acesso
  // imediatamente após uma alteração administrativa.
  // ==================================================

  try {
    const [
      currentUser,
      currentEmployee,
      currentCompany,
    ] =
      await Promise.all([
        prisma.user.findFirst({
          where: {
            idUser:
              user.userId,

            Person_idPerson:
              user.personId,

            isActive:
              true,
          },

          select: {
            idUser:
              true,
          },
        }),

        prisma.companyEmployee.findFirst({
          where: {
            idCompanyEmployee:
              user.employeeId,

            isActive:
              true,

            companyPerson: {
              Person_idPerson:
                user.personId,

              Company_idCompany:
                user.companyId,

              isActive:
                true,
            },
          },

          select: {
            idCompanyEmployee:
              true,

            role: {
              select: {
                role:
                  true,
              },
            },
          },
        }),

        prisma.company.findFirst({
          where: {
            idCompany:
              user.companyId,

            isActive:
              true,
          },

          select: {
            idCompany:
              true,
          },
        }),
      ]);


    // ================================================
    // USUÁRIO / FUNCIONÁRIO / VÍNCULO / EMPRESA
    // NÃO SÃO MAIS VÁLIDOS
    //
    // Retornamos 401 porque a sessão representada
    // pelo JWT deixou de corresponder ao estado atual.
    //
    // Isso também conversa corretamente com o
    // frontend atual, que limpa a sessão globalmente
    // quando recebe 401.
    // ================================================

    if (
      !currentUser ||
      !currentEmployee ||
      !currentCompany
    ) {
      return reply
        .status(401)
        .send({
          error:
            "Sessão não é mais válida",
        });
    }


    // ================================================
    // ROLE FOI REMOVIDA OU ALTERADA
    // ================================================

    if (
      currentEmployee.role?.role !==
      "ADMIN"
    ) {
      return reply
        .status(401)
        .send({
          error:
            "Sessão não é mais válida",
        });
    }
  } catch (error) {
    request.log.error(
      {
        err:
          error,
      },
      "Erro ao revalidar autorização do usuário"
    );

    return reply
      .status(500)
      .send({
        error:
          "Erro interno do servidor",
      });
  }


  // ==================================================
  // VALIDAR EMPRESA DA ROTA
  //
  // Um ADMIN da empresa 1 não pode acessar:
  //
  // /companies/2/...
  // ==================================================

  const params =
    request.params as {
      companyId?: string;
    };


  if (
    params?.companyId
  ) {
    const requestedCompanyId =
      Number(
        params.companyId
      );


    if (
      Number.isInteger(
        requestedCompanyId
      ) &&
      requestedCompanyId !==
        user.companyId
    ) {
      return reply
        .status(403)
        .send({
          error:
            "Você não possui acesso a esta empresa",
        });
    }
  }
}