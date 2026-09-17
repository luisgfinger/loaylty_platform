const REWARD_FUND_RATE = 0.005;
// =====================================================
// CALCULAR CONTRIBUIÇÃO
// =====================================================
export function calculateRewardFundContribution(purchaseAmount) {
    return Number((purchaseAmount *
        REWARD_FUND_RATE).toFixed(4));
}
// =====================================================
// CREDITAR CAIXA
// =====================================================
export async function creditRewardFund(tx, companyId, contribution) {
    if (contribution <= 0) {
        return;
    }
    await tx.company.update({
        where: {
            idCompany: companyId,
        },
        data: {
            rewardFundBalance: {
                increment: contribution,
            },
            rewardFundTotalContributed: {
                increment: contribution,
            },
        },
    });
}
//# sourceMappingURL=reward.fund.service.js.map