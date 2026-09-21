import { z } from "zod";
export const loyaltySettingsSchema = z.object({
    minimumMedianCustomers: z.coerce
        .number()
        .int()
        .min(1)
        .default(20),
    fallbackMedian: z.coerce
        .number()
        .positive(),
});
//# sourceMappingURL=loyalty-settings.schema.js.map