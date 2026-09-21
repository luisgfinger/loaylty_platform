import { request } from './client'
import type {
  CreateEmployeeAccessInput,
  CreateEmployeeInput,
  EmployeeAccess,
  EmployeeDetail,
  EmployeeListItem,
  UpdateEmployeeInput,
} from '../types/employee'
import { normalizeCpf } from '../utils/cpf'

function employeePath(companyId: number, cpf?: string) {
  const basePath = `/companies/${companyId}/employees`

  return cpf
    ? `${basePath}/${encodeURIComponent(normalizeCpf(cpf))}`
    : basePath
}

export function getEmployees(companyId: number, token: string) {
  return request<{ employees: EmployeeListItem[] }>(
    employeePath(companyId),
    { token },
  )
}

export function getEmployeeByCpf(
  companyId: number,
  cpf: string,
  token: string,
) {
  return request<EmployeeDetail>(
    employeePath(companyId, cpf),
    { token },
  )
}

export function createEmployee(
  companyId: number,
  data: CreateEmployeeInput,
  token: string,
) {
  return request<EmployeeDetail>(
    employeePath(companyId),
    {
      method: 'POST',
      body: data,
      token,
    },
  )
}

export function updateEmployee(
  companyId: number,
  cpf: string,
  data: UpdateEmployeeInput,
  token: string,
) {
  return request<EmployeeDetail>(
    employeePath(companyId, cpf),
    {
      method: 'PATCH',
      body: data,
      token,
    },
  )
}

export function createEmployeeAccess(
  companyId: number,
  cpf: string,
  data: CreateEmployeeAccessInput,
  token: string,
) {
  return request<EmployeeAccess>(
    `${employeePath(companyId, cpf)}/user`,
    {
      method: 'POST',
      body: data,
      token,
    },
  )
}