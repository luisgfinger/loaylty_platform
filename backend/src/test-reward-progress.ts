import { prisma } from "./lib/prisma.js";

import {
  createPendingCustomerRewardsForProgress,
} from "./modules/rewards/customer-reward.service.js";


const CUSTOMER_ID =
  1;


async function main() {
  await prisma.$transaction(
    async (
      tx
    ) => {
      await createPendingCustomerRewardsForProgress(
        tx,
        CUSTOMER_ID,
        19,
        20.5,
        1
      );
    }
  );

  console.log(
    "Teste concluído."
  );
}


main()
  .catch(
    (
      error
    ) => {
      console.error(
        error
      );

      process.exitCode =
        1;
    }
  )
  .finally(
    async () => {
      await prisma.$disconnect();
    }
  );