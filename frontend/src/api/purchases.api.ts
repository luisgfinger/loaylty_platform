import { request } from './client'
import type { CompanyPurchaseHistory, CreatePurchaseInput, CreatedPurchase, CustomerPurchaseHistory } from '../types/purchase'
import { normalizeCpf } from '../utils/cpf'

function purchasePath(companyId: number) {
  return `/companies/${companyId}/purchases`
}

function customerPurchasePath(companyId: number, cpf: string) {
  return `/companies/${companyId}/customers/${encodeURIComponent(normalizeCpf(cpf))}/purchases`
}

export function registerPurchase(companyId: number, data: CreatePurchaseInput, token: string) {
  return request<CreatedPurchase>(purchasePath(companyId), { method: 'POST', body: data, token })
}

export function deletePurchase(companyId: number, purchaseId: string, token: string) {
  return request<{
    message: string
    purchase: {
      idPurchase: string
      amount: string
      rewardFundContribution: string
      purchaseDate: string
    }
  }>(`${purchasePath(companyId)}/${encodeURIComponent(purchaseId)}`, { method: 'DELETE', token })
}

export function getCustomerPurchases(companyId: number, cpf: string, token: string) {
  return request<CustomerPurchaseHistory>(customerPurchasePath(companyId, cpf), { token })
}

export function getPurchases(companyId: number, token: string) {
  return request<CompanyPurchaseHistory>(purchasePath(companyId), { token })
}
