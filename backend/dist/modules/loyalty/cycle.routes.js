import { listCustomerCycles, } from "./cycle.service.js";
export async function cycleRoutes(app) {
    app.get("/companies/:companyId/customers/:cpf/cycles", async (request, reply) => {
        const params = request.params;
        const companyId = Number(params.companyId);
        if (!Number.isInteger(companyId)) {
            return reply
                .status(400)
                .send({
                error: "Empresa inválida",
            });
        }
        try {
            const result = await listCustomerCycles(companyId, params.cpf);
            // IMPORTANTE:
            // listCustomerCycles já retorna
            // { customer, cycles }
            return result;
        }
        catch (error) {
            if (error instanceof Error &&
                error.message ===
                    "CUSTOMER_NOT_FOUND") {
                return reply
                    .status(404)
                    .send({
                    error: "Cliente não encontrado",
                });
            }
            throw error;
        }
    });
}
//# sourceMappingURL=cycle.routes.js.map