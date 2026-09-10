import { request } from './client'
import type { CreatePurchaseInput, CreatedPurchase, CustomerPurchaseHistory } from '../types/purchase'

function purchasePath(companyId: number) {
  return `/companies/${companyId}/purchases`
}

function customerPurchasePath(companyId: number, cpf: string) {
  return `/companies/${companyId}/customers/${encodeURIComponent(cpf.replace(/\D/g, ''))}/purchases`
}

export function registerPurchase(companyId: number, data: CreatePurchaseInput, token: string) {
  return request<CreatedPurchase>(purchasePath(companyId), { method: 'POST', body: data, token })
}

export function getCustomerPurchases(companyId: number, cpf: string, token: string) {
  return request<CustomerPurchaseHistory>(customerPurchasePath(companyId, cpf), { token })
}
