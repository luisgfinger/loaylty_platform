import { createCompanySchema, updateCompanySchema, } from "./company.schema.js";
import { createCompany, findCompanyById, listCompanies, updateCompany, } from "./company.service.js";
// =====================================================
// ROTAS DE EMPRESA
// =====================================================
export async function companyRoutes(app) {
    // ==================================================
    // CADASTRAR EMPRESA
    //
    // POST /companies
    //
    // Por enquanto continua disponível para ADMIN.
    // No SaaS futuramente isso deverá ser responsabilidade
    // de um administrador da plataforma.
    // ==================================================
    app.post("/companies", async (request, reply) => {
        const parsed = createCompanySchema
            .safeParse(request.body);
        if (!parsed.success) {
            return reply
                .status(400)
                .send({
                error: "Dados inválidos",
                details: parsed
                    .error
                    .issues,
            });
        }
        try {
            const company = await createCompany(parsed.data);
            return reply
                .status(201)
                .send(company);
        }
        catch (error) {
            if (error instanceof Error &&
                error.message ===
                    "COMPANY_ALREADY_EXISTS") {
                return reply
                    .status(409)
                    .send({
                    error: "Empresa já cadastrada",
                });
            }
            throw error;
        }
    });
    // ==================================================
    // EMPRESA DO USUÁRIO LOGADO
    //
    // GET /companies
    //
    // Importante:
    // não retorna empresas de outros assinantes.
    // ==================================================
    app.get("/companies", async (request, reply) => {
        const authenticatedUser = request.user;
        try {
            const companies = await listCompanies(authenticatedUser
                .companyId);
            return reply
                .status(200)
                .send(companies);
        }
        catch (error) {
            if (error instanceof Error &&
                error.message ===
                    "COMPANY_NOT_FOUND") {
                return reply
                    .status(404)
                    .send({
                    error: "Empresa não encontrada",
                });
            }
            throw error;
        }
    });
    // ==================================================
    // BUSCAR EMPRESA PELO ID
    //
    // GET /companies/:companyId
    // ==================================================
    app.get("/companies/:companyId", async (request, reply) => {
        const params = request.params;
        const companyId = Number(params.companyId);
        if (!Number.isInteger(companyId) ||
            companyId <= 0) {
            return reply
                .status(400)
                .send({
                error: "Empresa inválida",
            });
        }
        try {
            const company = await findCompanyById(companyId);
            return reply
                .status(200)
                .send(company);
        }
        catch (error) {
            if (error instanceof Error &&
                error.message ===
                    "COMPANY_NOT_FOUND") {
                return reply
                    .status(404)
                    .send({
                    error: "Empresa não encontrada",
                });
            }
            throw error;
        }
    });
    // ==================================================
    // EDITAR EMPRESA
    //
    // PATCH /companies/:companyId
    // ==================================================
    app.patch("/companies/:companyId", async (request, reply) => {
        const params = request.params;
        // ===============================================
        // EMPRESA
        // ===============================================
        const companyId = Number(params.companyId);
        if (!Number.isInteger(companyId) ||
            companyId <= 0) {
            return reply
                .status(400)
                .send({
                error: "Empresa inválida",
            });
        }
        // ===============================================
        // BODY
        // ===============================================
        const parsed = updateCompanySchema
            .safeParse(request.body);
        if (!parsed.success) {
            return reply
                .status(400)
                .send({
                error: "Dados inválidos",
                details: parsed
                    .error
                    .issues,
            });
        }
        // ===============================================
        // ATUALIZAR
        // ===============================================
        try {
            const company = await updateCompany(companyId, parsed.data);
            return reply
                .status(200)
                .send(company);
        }
        catch (error) {
            if (error instanceof Error) {
                if (error.message ===
                    "COMPANY_NOT_FOUND") {
                    return reply
                        .status(404)
                        .send({
                        error: "Empresa não encontrada",
                    });
                }
                if (error.message ===
                    "CNPJ_ALREADY_EXISTS") {
                    return reply
                        .status(409)
                        .send({
                        error: "CNPJ já utilizado por outra empresa",
                    });
                }
            }
            throw error;
        }
    });
}
//# sourceMappingURL=company.routes.js.map