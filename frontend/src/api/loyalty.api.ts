import { request } from './client'
import type { CustomerCyclesResponse, LoyaltySettings, LoyaltySettingsInput } from '../types/loyalty'
import { normalizeCpf } from '../utils/cpf'

function companyPath(companyId: number) {
  return `/companies/${companyId}`
}

export function getCustomerCycles(companyId: number, cpf: string, token: string) {
  return request<CustomerCyclesResponse>(`${companyPath(companyId)}/customers/${encodeURIComponent(normalizeCpf(cpf))}/cycles`, { token })
}

export function getLoyaltySettings(companyId: number, token: string) {
  return request<LoyaltySettings>(`${companyPath(companyId)}/loyalty-settings`, { token })
}

export function saveLoyaltySettings(companyId: number, data: LoyaltySettingsInput, token: string) {
  return request<LoyaltySettings>(`${companyPath(companyId)}/loyalty-settings`, { method: 'PUT', body: data, token })
}
