import "dotenv/config";

import {
  defineConfig,
  env,
} from "prisma/config";


const databaseHost =
  env("DATABASE_HOST");

const databasePort =
  env("DATABASE_PORT");

const databaseUser =
  env("DATABASE_USER");

const databasePassword =
  env("DATABASE_PASSWORD");

const databaseName =
  env("DATABASE_NAME");


const databaseUrl =
  `mysql://${encodeURIComponent(databaseUser)}:${encodeURIComponent(databasePassword)}@${databaseHost}:${databasePort}/${databaseName}`;


export default defineConfig({
  schema:
    "prisma/schema.prisma",

  migrations: {
    path:
      "prisma/migrations",
  },

  datasource: {
    url:
      databaseUrl,
  },
});