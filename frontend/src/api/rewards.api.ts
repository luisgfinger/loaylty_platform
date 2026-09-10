import { request } from './client'
import type { CreateRewardCategoryInput, CreateRewardInput, Reward, RewardCategory, UpdateRewardCategoryInput, UpdateRewardInput } from '../types/reward'

const categoriesPath = (companyId: number) => `/companies/${companyId}/reward-categories`
const rewardsPath = (companyId: number) => `/companies/${companyId}/rewards`

export function getRewardCategories(companyId: number, token: string) {
  return request<{ categories: RewardCategory[] }>(categoriesPath(companyId), { token })
}

export function createRewardCategory(companyId: number, data: CreateRewardCategoryInput, token: string) {
  return request<RewardCategory>(categoriesPath(companyId), { method: 'POST', body: data, token })
}

export function updateRewardCategory(companyId: number, categoryId: number, data: UpdateRewardCategoryInput, token: string) {
  return request<RewardCategory>(`${categoriesPath(companyId)}/${categoryId}`, { method: 'PATCH', body: data, token })
}

export function getRewards(companyId: number, token: string) {
  return request<{ rewards: Reward[] }>(rewardsPath(companyId), { token })
}

export function getReward(companyId: number, rewardId: number, token: string) {
  return request<Reward>(`${rewardsPath(companyId)}/${rewardId}`, { token })
}

export function createReward(companyId: number, data: CreateRewardInput, token: string) {
  return request<Reward>(rewardsPath(companyId), { method: 'POST', body: data, token })
}

export function updateReward(companyId: number, rewardId: number, data: UpdateRewardInput, token: string) {
  return request<Reward>(`${rewardsPath(companyId)}/${rewardId}`, { method: 'PATCH', body: data, token })
}
