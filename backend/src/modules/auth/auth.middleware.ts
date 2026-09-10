import type {
  FastifyReply,
  FastifyRequest,
} from "fastify";

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
  // VALIDAR ROLE
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
  // VALIDAR EMPRESA
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