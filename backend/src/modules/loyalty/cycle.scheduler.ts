import type {
  FastifyBaseLogger,
} from "fastify";

import {
  processDailyProgress,
  processExpiredCycles,
} from "./cycle.service.js";


const ONE_HOUR =
  60 * 60 * 1000;


export function startCycleScheduler(
  logger: FastifyBaseLogger
) {
  async function run() {
    try {
      // Primeiro processa o progresso dos dias
      // que já terminaram.
      await processDailyProgress();

      // Depois fecha ciclos vencidos.
      await processExpiredCycles();

      logger.info(
        "Processamento de fidelidade concluído"
      );
    } catch (error) {
      logger.error(
        error,
        "Erro ao processar fidelidade"
      );
    }
  }


  // Executa imediatamente
  // quando o backend inicia.
  void run();


  // Depois verifica de hora em hora.
  // Como somente dias já encerrados são processados,
  // rodar várias vezes não soma progresso novamente.
  const timer =
    setInterval(
      () => {
        void run();
      },

      ONE_HOUR
    );


  timer.unref();
}
