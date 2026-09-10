export type LoyaltyLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export interface CustomerCycle {
  idCustomerCycle: string
  cycleStart: string
  cycleEnd: string
  status: 'OPEN' | 'CLOSED'
  purchaseDays: number | null
  totalAmount: string | null
  frequencyLevel: LoyaltyLevel | null
  valueLevel: LoyaltyLevel | null
  regularityLevel: string | null
  companyMedian: string | null
  medianPercentage: string | null
  medianSampleSize: number | null
  progressEarned: string | null
  closedAt: string | null
  createdAt: string
}

export interface CustomerCyclesResponse {
  customer: { idCompanyCustomer: number; cpf: string; name: string }
  cycles: CustomerCycle[]
}

export interface LoyaltyJourney {
  progress: string
  regularity: string
}

export interface LoyaltySettings {
  minimumMedianCustomers: number
  fallbackMedian: string | number
}

export interface LoyaltySettingsInput {
  minimumMedianCustomers: number
  fallbackMedian: number
}
