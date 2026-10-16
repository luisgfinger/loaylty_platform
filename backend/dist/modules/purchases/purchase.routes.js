import { createPurchaseSchema, } from "./purchase.schema.js";
import { createPurchase, deletePurchase, listCompanyPurchases, listCustomerPurchases, } from "./purchase.service.js";
// =====================================================
// ROTAS DE COMPRAS
// =====================================================
export async function purchaseRoutes(app) {
    // ==================================================
    // REGISTRAR COMPRA
    //
    // POST
    // /companies/:companyId/purchases
    // ==================================================
    app.post("/companies/:companyId/purchases", async (request, reply) => {
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
        const authenticatedUser = request.user;
        const parsed = createPurchaseSchema
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
            const purchase = await createPurchase(companyId, authenticatedUser
                .employeeId, parsed.data);
            return reply
                .status(201)
                .send(purchase);
        }
        catch (error) {
            if (error instanceof Error) {
                if (error.message ===
                    "CUSTOMER_NOT_FOUND") {
                    return reply
                        .status(404)
                        .send({
                        error: "Cliente não encontrado nesta empresa",
                    });
                }
                if (error.message ===
                    "EMPLOYEE_NOT_AUTHORIZED") {
                    return reply
                        .status(403)
                        .send({
                        error: "Funcionário não autorizado",
                    });
                }
            }
            throw error;
        }
    });
    // ==================================================
    // EXCLUIR COMPRA / VENDA
    //
    // DELETE
    // /companies/:companyId/purchases/:purchaseId
    // ==================================================
    app.delete("/companies/:companyId/purchases/:purchaseId", async (request, reply) => {
        const params = request.params;
        // ===============================================
        // VALIDAR EMPRESA
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
        // USUÁRIO AUTENTICADO
        // ===============================================
        const authenticatedUser = request.user;
        // ===============================================
        // GARANTIR QUE A EMPRESA DA URL É A EMPRESA
        // DO USUÁRIO AUTENTICADO
        // ===============================================
        if (authenticatedUser
            .companyId !==
            companyId) {
            return reply
                .status(403)
                .send({
                error: "Você não possui permissão para excluir vendas desta empresa",
            });
        }
        // ===============================================
        // VALIDAR ID DA VENDA
        // ===============================================
        const purchaseIdText = params
            .purchaseId
            .trim();
        if (!/^\d+$/.test(purchaseIdText)) {
            return reply
                .status(400)
                .send({
                error: "Venda inválida",
            });
        }
        let purchaseId;
        try {
            purchaseId =
                BigInt(purchaseIdText);
        }
        catch {
            return reply
                .status(400)
                .send({
                error: "Venda inválida",
            });
        }
        if (purchaseId <= 0n) {
            return reply
                .status(400)
                .send({
                error: "Venda inválida",
            });
        }
        // ===============================================
        // EXCLUIR VENDA
        // ===============================================
        try {
            const deletedPurchase = await deletePurchase(companyId, purchaseId, authenticatedUser
                .employeeId, authenticatedUser
                .role);
            return reply
                .status(200)
                .send({
                message: "Venda excluída com sucesso",
                purchase: deletedPurchase,
            });
        }
        catch (error) {
            if (error instanceof Error) {
                if (error.message ===
                    "PURCHASE_NOT_FOUND") {
                    return reply
                        .status(404)
                        .send({
                        error: "Venda não encontrada",
                    });
                }
                if (error.message ===
                    "PURCHASE_DELETE_FORBIDDEN") {
                    return reply
                        .status(403)
                        .send({
                        error: "Você não possui permissão para excluir esta venda",
                    });
                }
                if (error.message ===
                    "PURCHASE_DELETE_WINDOW_EXPIRED") {
                    return reply
                        .status(403)
                        .send({
                        error: "O prazo de 30 minutos para excluir esta venda expirou",
                    });
                }
            }
            throw error;
        }
    });
    // ==================================================
    // LISTAR TODAS AS COMPRAS DA EMPRESA
    //
    // GET
    // /companies/:companyId/purchases
    // ==================================================
    app.get("/companies/:companyId/purchases", async (request, reply) => {
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
        const result = await listCompanyPurchases(companyId);
        return reply
            .status(200)
            .send(result);
    });
    // ==================================================
    // LISTAR COMPRAS DO CLIENTE
    //
    // GET
    // /companies/:companyId/customers/:cpf/purchases
    // ==================================================
    app.get("/companies/:companyId/customers/:cpf/purchases", async (request, reply) => {
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
            const result = await listCustomerPurchases(companyId, params.cpf);
            return reply
                .status(200)
                .send(result);
        }
        catch (error) {
            if (error instanceof Error &&
                error.message ===
                    "CUSTOMER_NOT_FOUND") {
                return reply
                    .status(404)
                    .send({
                    error: "Cliente não encontrado nesta empresa",
                });
            }
            throw error;
        }
    });
}
//# sourceMappingURL=purchase.routes.js.map