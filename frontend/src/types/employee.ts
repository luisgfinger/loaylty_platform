export interface EmployeeRole {
  idRole: number
  role: string
}

export interface EmployeePerson {
  cpf: string
  name: string
  email: string | null
  phoneNumber: string | null
  dateOfBirth: string | null
}

export interface EmployeeListItem {
  idCompanyEmployee: number
  isActive: boolean
  admissionDate: string | null
  terminationDate: string | null
  createdAt: string
  role: EmployeeRole | null
  person: EmployeePerson
  isCustomer: boolean
}

export interface EmployeeDetail {
  idCompanyEmployee: number
  isActive: boolean
  admissionDate: string | null
  terminationDate: string | null
  role: EmployeeRole | null
  companyPerson: {
    person: EmployeePerson
    customer: unknown | null
  }
}

export interface CreateEmployeeInput {
  cpf: string
  name: string
  email?: string
  phoneNumber?: string
  dateOfBirth?: string
  admissionDate?: string
  role?: string
}

export interface UpdateEmployeeInput {
  name?: string
  email?: string | null
  phoneNumber?: string | null
  dateOfBirth?: string | null
  admissionDate?: string | null
  terminationDate?: string | null
  role?: string | null
  isActive?: boolean
}
