import Fastify from "fastify";

import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";

import {
  env,
} from "./config/env.js";

import {
  companyRoutes,
} from "./modules/companies/company.routes.js";

import {
  customerRoutes,
} from "./modules/customers/customer.routes.js";

import {
  employeeRoutes,
} from "./modules/employees/employee.routes.js";

import {
  purchaseRoutes,
} from "./modules/purchases/purchase.routes.js";

import {
  loyaltySettingsRoutes,
} from "./modules/loyalty-settings/loyalty-settings.routes.js";

import {
  cycleRoutes,
} from "./modules/loyalty/cycle.routes.js";

import {
  authRoutes,
} from "./modules/auth/auth.routes.js";

import {
  rewardRoutes,
} from "./modules/rewards/reward.routes.js";

import {
  requireAdmin,
} from "./modules/auth/auth.middleware.js";

import {
  startCycleScheduler,
} from "./modules/loyalty/cycle.scheduler.js";


// =====================================================
// FASTIFY
// =====================================================

const app =
  Fastify({
    logger: true,
  });


// =====================================================
// JWT
// =====================================================

await app.register(
  jwt,
  {
    secret:
      env.JWT_SECRET,
  }
);


// =====================================================
// RATE LIMIT
//
// Não aplicamos limite global neste momento.
//
// O login define seu próprio limite em auth.routes.ts.
//
// Usamos preHandler para que request.body já esteja
// disponível ao keyGenerator da rota de login.
// =====================================================

await app.register(
  rateLimit,
  {
    global:
      false,

    hook:
      "preHandler",

    errorResponseBuilder:
      () => {
        return {
          statusCode:
            429,

          error:
            "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.",
        };
      },
  }
);


// =====================================================
// PROTEÇÃO GLOBAL
// =====================================================

app.addHook(
  "preHandler",

  async (
    request,
    reply
  ) => {
    const path =
      request.url
        .split("?")[0];


    // ----------------------------------------------
    // HEALTH É PÚBLICO
    // ----------------------------------------------

    if (
      request.method === "GET" &&
      path === "/health"
    ) {
      return;
    }


    // ----------------------------------------------
    // LOGIN É PÚBLICO
    // ----------------------------------------------

    if (
      request.method === "POST" &&
      path === "/auth/login"
    ) {
      return;
    }


    // ----------------------------------------------
    // RESTANTE É SOMENTE ADMIN
    // ----------------------------------------------

    return requireAdmin(
      request,
      reply
    );
  }
);


// =====================================================
// HEALTH
// =====================================================

app.get(
  "/health",

  async () => {
    return {
      status: "ok",
    };
  }
);


// =====================================================
// ROTAS
// =====================================================

app.register(
  authRoutes
);

app.register(
  companyRoutes
);

app.register(
  customerRoutes
);

app.register(
  employeeRoutes
);

app.register(
  purchaseRoutes
);

app.register(
  loyaltySettingsRoutes
);

app.register(
  cycleRoutes
);

app.register(
  rewardRoutes
);


// =====================================================
// START
// =====================================================

async function start() {
  try {
    await app.listen({
      host:
        "0.0.0.0",

      port:
        env.PORT,
    });


    startCycleScheduler(
      app.log
    );

  } catch (error) {
    app.log.error(
      error
    );

    process.exit(1);
  }
}


void start();