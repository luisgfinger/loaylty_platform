export interface Company {
  idCompany: number
  name: string
  cnpj: string
  address: string | null
  email: string | null
  ie: string | null
  phoneNumber: string | null
}

export interface UpdateCompanyInput {
  name?: string
  cnpj?: string
  address?: string | null
  email?: string | null
  ie?: string | null
  phoneNumber?: string | null
}
