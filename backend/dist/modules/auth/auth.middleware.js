import { prisma, } from "../../lib/prisma.js";
// =====================================================
// ROTAS LIBERADAS PARA O CAIXA
// =====================================================
function cashierCanAccess(request) {
    const path = request.url
        .split("?")[0] ??
        "";
    // Permite consultar a sessão atual.
    if (request.method === "GET" &&
        path === "/auth/me") {
        return true;
    }
    // Permite registrar uma compra.
    if (request.method === "POST" &&
        /^\/companies\/\d+\/purchases$/.test(path)) {
        return true;
    }
    // Permite localizar o cliente pelo CPF antes da compra.
    return (request.method === "GET" &&
        /^\/companies\/\d+\/customers\/[^/]+$/.test(path));
}
// =====================================================
// AUTENTICAÇÃO E AUTORIZAÇÃO
// =====================================================
export async function requireAdmin(request, reply) {
    // ==================================================
    // VALIDAR JWT
    // ==================================================
    try {
        await request.jwtVerify();
    }
    catch {
        return reply
            .status(401)
            .send({
            error: "Não autenticado",
        });
    }
    // ==================================================
    // DADOS DO USUÁRIO AUTENTICADO
    // ==================================================
    const user = request.user;
    // ==================================================
    // VALIDAR CLAIMS BÁSICAS
    // ==================================================
    if (!Number.isInteger(user.userId) ||
        user.userId <= 0 ||
        !Number.isInteger(user.personId) ||
        user.personId <= 0 ||
        !Number.isInteger(user.employeeId) ||
        user.employeeId <= 0 ||
        !Number.isInteger(user.companyId) ||
        user.companyId <= 0) {
        return reply
            .status(401)
            .send({
            error: "Não autenticado",
        });
    }
    // ==================================================
    // VALIDAR PERFIL INFORMADO NO TOKEN
    // ==================================================
    if (user.role !== "ADMIN" &&
        user.role !== "CAIXA") {
        return reply
            .status(403)
            .send({
            error: "Perfil sem permissão de acesso",
        });
    }
    // ==================================================
    // REVALIDAR AUTORIZAÇÃO NO BANCO
    //
    // Mesmo com um JWT válido, verificamos novamente:
    //
    // - usuário ativo;
    // - funcionário ativo;
    // - vínculo ativo;
    // - empresa ativa;
    // - empresa correta;
    // - perfil atual igual ao perfil presente no token.
    //
    // Assim, alterações administrativas invalidam
    // imediatamente uma sessão antiga.
    // ==================================================
    try {
        const [currentUser, currentEmployee, currentCompany,] = await Promise.all([
            prisma.user.findFirst({
                where: {
                    idUser: user.userId,
                    Person_idPerson: user.personId,
                    isActive: true,
                },
                select: {
                    idUser: true,
                },
            }),
            prisma.companyEmployee.findFirst({
                where: {
                    idCompanyEmployee: user.employeeId,
                    isActive: true,
                    companyPerson: {
                        Person_idPerson: user.personId,
                        Company_idCompany: user.companyId,
                        isActive: true,
                    },
                },
                select: {
                    idCompanyEmployee: true,
                    role: {
                        select: {
                            role: true,
                        },
                    },
                },
            }),
            prisma.company.findFirst({
                where: {
                    idCompany: user.companyId,
                    isActive: true,
                },
                select: {
                    idCompany: true,
                },
            }),
        ]);
        // ================================================
        // SESSÃO NÃO CORRESPONDE MAIS AO BANCO
        // ================================================
        if (!currentUser ||
            !currentEmployee ||
            !currentCompany) {
            return reply
                .status(401)
                .send({
                error: "Sessão não é mais válida",
            });
        }
        // ================================================
        // PERFIL FOI ALTERADO
        // ================================================
        if (currentEmployee.role?.role !==
            user.role) {
            return reply
                .status(401)
                .send({
                error: "Sessão não é mais válida",
            });
        }
    }
    catch (error) {
        request.log.error({
            err: error,
        }, "Erro ao revalidar autorização do usuário");
        return reply
            .status(500)
            .send({
            error: "Erro interno do servidor",
        });
    }
    // ==================================================
    // LIMITAR O CAIXA À OPERAÇÃO DE COMPRAS
    // ==================================================
    if (user.role === "CAIXA" &&
        !cashierCanAccess(request)) {
        return reply
            .status(403)
            .send({
            error: "O perfil CAIXA possui acesso somente ao registro de compras",
        });
    }
    // ==================================================
    // VALIDAR EMPRESA DA ROTA
    //
    // Um funcionário da empresa 1 não pode acessar:
    //
    // /companies/2/...
    // ==================================================
    const params = request.params;
    if (params?.companyId) {
        const requestedCompanyId = Number(params.companyId);
        if (Number.isInteger(requestedCompanyId) &&
            requestedCompanyId !==
                user.companyId) {
            return reply
                .status(403)
                .send({
                error: "Você não possui acesso a esta empresa",
            });
        }
    }
}
//# sourceMappingURL=auth.middleware.js.map