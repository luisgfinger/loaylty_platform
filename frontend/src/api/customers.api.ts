import { request } from './client'
import type { CreateCustomerInput, Customer, CustomerListItem, UpdateCustomerInput } from '../types/customer'
import { normalizeCpf } from '../utils/cpf'

function customerPath(companyId: number, cpf: string) { return `/companies/${companyId}/customers/${encodeURIComponent(normalizeCpf(cpf))}` }
export function getCustomerByCpf(companyId: number, cpf: string, token: string) { return request<Customer>(customerPath(companyId, cpf), { token }) }
export function getCustomers(companyId: number, token: string) { return request<CustomerListItem[]>(`/companies/${companyId}/customers`, { token }) }
export function createCustomer(companyId: number, data: CreateCustomerInput, token: string) { return request<unknown>(`/companies/${companyId}/customers`, { method: 'POST', body: data, token }) }
export function updateCustomer(companyId: number, cpf: string, data: UpdateCustomerInput, token: string) { return request<unknown>(customerPath(companyId, cpf), { method: 'PATCH', body: data, token }) }
