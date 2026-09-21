import { request } from './client'
import type { Company, UpdateCompanyInput } from '../types/company'

function companyPath(companyId: number) {
  return `/companies/${companyId}`
}

export function getCompany(companyId: number, token: string) {
  return request<Company>(companyPath(companyId), { token })
}

export function updateCompany(companyId: number, data: UpdateCompanyInput, token: string) {
  return request<Company>(companyPath(companyId), { method: 'PATCH', body: data, token })
}
