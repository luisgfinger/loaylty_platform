export interface PurchaseCustomer {
  idCompanyCustomer: number
  cpf: string
  name: string
}

export interface PurchaseRegisteredBy {
  idCompanyEmployee: number
  cpf: string
  name: string
}

export interface Purchase {
  idPurchase: string
  fiscalDocumentNumber: string | null
  amount: string
  purchaseDate: string
  registeredBy: PurchaseRegisteredBy | null
}

export interface CreatedPurchase extends Purchase {
  customer: PurchaseCustomer
  registeredBy: PurchaseRegisteredBy
  cycle: {
    idCustomerCycle: string
    cycleStart: string
    cycleEnd: string
    status: string
  } | null
}

export interface CustomerPurchaseHistory {
  customer: PurchaseCustomer
  purchases: Purchase[]
}

export interface CompanyPurchase extends Omit<Purchase, 'fiscalDocumentNumber'> {
  customer: PurchaseCustomer
}

export interface CompanyPurchaseHistory {
  purchases: CompanyPurchase[]
}

export interface CreatePurchaseInput {
  cpf: string
  fiscalDocumentNumber: string
  amount: number
}
