export interface Customer {
  idCompanyCustomer: number
  registrationDate: string
  isActive: boolean
  whatsappOptIn: boolean
  whatsappOptInAt: string | null
  person: { idPerson: number; cpf: string; name: string; email: string | null; phoneNumber: string | null; dateOfBirth: string | null }
  company: { idCompany: number; name: string }
  registeredBy: { idCompanyEmployee: number; name: string; cpf: string } | null
  journey: { idCustomerJourney: string; progress: string; regularity: string; updatedAt: string } | null
  rewards: unknown[]
}
export interface CreateCustomerInput { cpf: string; name: string; email?: string; phoneNumber?: string; dateOfBirth?: string; whatsappOptIn: boolean }
export interface UpdateCustomerInput { name?: string; email?: string | null; phoneNumber?: string | null; dateOfBirth?: string | null; whatsappOptIn?: boolean; isActive?: boolean }
