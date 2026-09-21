export type RewardTier = 'LOW' | 'MEDIUM' | 'HIGH'
export type RewardType = 'DIRECT' | 'CHOICE'
export type RedemptionTiming = 'IMMEDIATE' | 'NEXT_PURCHASE' | 'NEXT_PURCHASE_DAY'

export interface PendingCustomerReward {
  idCustomerReward: string
  suggestedTier: RewardTier
  earnedAt: string
  customer: { idCompanyCustomer: number; cpf: string; name: string }
}

export interface PendingCustomerRewardsResponse {
  rewardFundBalance: string
  pendingRewards: PendingCustomerReward[]
}

export interface ApproveCustomerRewardInput {
  rewardType: RewardType
  finalTier: RewardTier
  rewardId?: number
  redemptionTiming: RedemptionTiming
  expiresOn: string | null
  decisionNote: string | null
}

export interface CustomerReward {
  idCustomerReward: string
  status: 'PENDING' | 'AVAILABLE' | 'REDEEMED' | 'EXPIRED' | 'CANCELLED'
  rewardType: RewardType | null
  suggestedTier: RewardTier | null
  finalTier: RewardTier | null
  redemptionTiming: RedemptionTiming | null
  isRedeemable: boolean
  earnedAt: string
  approvedAt: string | null
  selectedAt: string | null
  redeemedAt: string | null
  expiresAt: string | null
  decisionNote: string | null
  reward: { idReward: number; name: string; costAmount: string } | null
}

export interface CustomerRewardsResponse {
  customer: { idCompanyCustomer: number; cpf: string; name: string }
  rewards: CustomerReward[]
}
