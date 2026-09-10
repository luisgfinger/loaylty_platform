export interface LoginInput { companyId: number; userName: string; password: string }

export interface LoginResponse {
  token: string
  user: { idUser: number; userName: string; name: string; cpf: string }
  employee: { idCompanyEmployee: number; role: string | null }
  company: { idCompany: number; name: string }
}
