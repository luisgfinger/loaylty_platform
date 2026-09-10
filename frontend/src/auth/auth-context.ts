import { createContext } from 'react'
import type { LoginInput, LoginResponse } from '../types/auth'

export interface AuthContextValue {
  session: LoginResponse | null
  isLoading: boolean
  login: (data: LoginInput) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
