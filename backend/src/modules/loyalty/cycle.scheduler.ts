import type {
  FastifyBaseLogger,
} from "fastify";

import {
  processExpiredCycles,
} from "./cycle.service.js";


const ONE_HOUR =
  60 * 60 * 1000;


export function startCycleScheduler(
  logger: FastifyBaseLogger
) {
  async function run() {
    try {
      await processExpiredCycles();

      logger.info(
        "Verificação de ciclos concluída"
      );
    } catch (error) {
      logger.error(
        error,
        "Erro ao processar ciclos"
      );
    }
  }


  // Executa imediatamente
  // quando o backend inicia.
  void run();


  // Depois verifica de hora em hora.
  const timer =
    setInterval(
      () => {
        void run();
      },

      ONE_HOUR
    );


  timer.unref();
}