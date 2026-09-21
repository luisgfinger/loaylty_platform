import { getLoyaltySettings, updateLoyaltySettings, } from "./loyalty-settings.service.js";
import { loyaltySettingsSchema, } from "./loyalty-settings.schema.js";
export async function loyaltySettingsRoutes(app) {
    // ==================================================
    // CONSULTAR
    // ==================================================
    app.get("/companies/:companyId/loyalty-settings", async (request, reply) => {
        const params = request.params;
        const companyId = Number(params.companyId);
        if (!Number.isInteger(companyId)) {
            return reply
                .status(400)
                .send({
                error: "Empresa inválida",
            });
        }
        const settings = await getLoyaltySettings(companyId);
        if (!settings) {
            return reply
                .status(404)
                .send({
                error: "Configuração não encontrada",
            });
        }
        return settings;
    });
    // ==================================================
    // CRIAR / ATUALIZAR
    // ==================================================
    app.put("/companies/:companyId/loyalty-settings", async (request, reply) => {
        const params = request.params;
        const companyId = Number(params.companyId);
        if (!Number.isInteger(companyId)) {
            return reply
                .status(400)
                .send({
                error: "Empresa inválida",
            });
        }
        const parsed = loyaltySettingsSchema
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
            const settings = await updateLoyaltySettings(companyId, parsed.data);
            return settings;
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
}
//# sourceMappingURL=loyalty-settings.routes.js.map