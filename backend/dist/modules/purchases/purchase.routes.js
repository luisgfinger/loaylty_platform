import { createPurchaseSchema, } from "./purchase.schema.js";
import { createPurchase, listCustomerPurchases, } from "./purchase.service.js";
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
        // FUNCIONÁRIO AUTENTICADO
        // ===============================================
        const authenticatedUser = request.user;
        // ===============================================
        // VALIDAR BODY
        // ===============================================
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
        // ===============================================
        // REGISTRAR COMPRA
        // ===============================================
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