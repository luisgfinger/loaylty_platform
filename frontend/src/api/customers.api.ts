import { request } from './client'
import type { CreateCustomerInput, Customer, UpdateCustomerInput } from '../types/customer'

function customerPath(companyId: number, cpf: string) { return `/companies/${companyId}/customers/${encodeURIComponent(cpf.replace(/\D/g, ''))}` }
export function getCustomerByCpf(companyId: number, cpf: string, token: string) { return request<Customer>(customerPath(companyId, cpf), { token }) }
export function createCustomer(companyId: number, data: CreateCustomerInput, token: string) { return request<unknown>(`/companies/${companyId}/customers`, { method: 'POST', body: data, token }) }
export function updateCustomer(companyId: number, cpf: string, data: UpdateCustomerInput, token: string) { return request<unknown>(customerPath(companyId, cpf), { method: 'PATCH', body: data, token }) }
