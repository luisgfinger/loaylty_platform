import "dotenv/config";
import { z } from "zod";
const envSchema = z.object({
    DATABASE_HOST: z.string(),
    DATABASE_PORT: z.coerce.number(),
    DATABASE_USER: z.string(),
    DATABASE_PASSWORD: z.string(),
    DATABASE_NAME: z.string(),
    PORT: z.coerce
        .number()
        .default(3333),
    JWT_SECRET: z.string()
        .min(32, "JWT_SECRET deve possuir pelo menos 32 caracteres"),
});
export const env = envSchema.parse(process.env);
//# sourceMappingURL=env.js.map