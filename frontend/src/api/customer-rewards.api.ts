import { request } from './client'
import type { ApproveCustomerRewardInput, CustomerRewardsResponse, PendingCustomerRewardsResponse } from '../types/customer-reward'
import { normalizeCpf } from '../utils/cpf'

const basePath = (companyId: number) => `/companies/${companyId}/customer-rewards`

export function getPendingCustomerRewards(companyId: number, token: string) { return request<PendingCustomerRewardsResponse>(`${basePath(companyId)}/pending`, { token }) }
export function approveCustomerReward(companyId: number, customerRewardId: string, data: ApproveCustomerRewardInput, token: string) { return request<unknown>(`${basePath(companyId)}/${customerRewardId}/approve`, { method: 'PATCH', body: data, token }) }
export function denyCustomerReward(companyId: number, customerRewardId: string, decisionNote: string | null, token: string) { return request<unknown>(`${basePath(companyId)}/${customerRewardId}/deny`, { method: 'PATCH', body: { decisionNote }, token }) }
export function selectCustomerReward(companyId: number, customerRewardId: string, rewardId: number, token: string) { return request<unknown>(`${basePath(companyId)}/${customerRewardId}/select`, { method: 'PATCH', body: { rewardId }, token }) }
export function redeemCustomerReward(companyId: number, customerRewardId: string, token: string) { return request<unknown>(`${basePath(companyId)}/${customerRewardId}/redeem`, { method: 'PATCH', token }) }
export function getCustomerRewards(companyId: number, cpf: string, token: string) { return request<CustomerRewardsResponse>(`/companies/${companyId}/customers/${encodeURIComponent(normalizeCpf(cpf))}/rewards`, { token }) }
