export interface RewardCategory {
  idRewardCategory: number
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
}

export interface RewardCategoryReference {
  idRewardCategory: number
  name: string
}

export interface Reward {
  idReward: number
  name: string
  description: string | null
  costAmount: string
  isActive: boolean
  createdAt: string
  category: RewardCategoryReference | null
}

export interface CreateRewardCategoryInput {
  name: string
  description?: string | null
}

export interface UpdateRewardCategoryInput {
  name?: string
  description?: string | null
  isActive?: boolean
}

export interface CreateRewardInput {
  name: string
  description?: string | null
  categoryId?: number | null
  costAmount: number
}

export interface UpdateRewardInput {
  name?: string
  description?: string | null
  categoryId?: number | null
  costAmount?: number
  isActive?: boolean
}
