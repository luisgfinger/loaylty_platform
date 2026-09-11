import type {
  Prisma,
} from "../../generated/prisma/client.js";


const REWARD_FUND_RATE =
  0.005;


// =====================================================
// CALCULAR CONTRIBUIÇÃO
// =====================================================

export function calculateRewardFundContribution(
  purchaseAmount: number
): number {
  return Number(
    (
      purchaseAmount *
      REWARD_FUND_RATE
    ).toFixed(4)
  );
}


// =====================================================
// CREDITAR CAIXA
// =====================================================

export async function creditRewardFund(
  tx: Prisma.TransactionClient,
  companyId: number,
  contribution: number
): Promise<void> {
  if (contribution <= 0) {
    return;
  }

  await tx.company.update({
    where: {
      idCompany:
        companyId,
    },

    data: {
      rewardFundBalance: {
        increment:
          contribution,
      },

      rewardFundTotalContributed: {
        increment:
          contribution,
      },
    },
  });
}