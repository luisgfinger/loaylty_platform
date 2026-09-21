import { request } from "./client";
import type { LoginInput, LoginResponse } from "../types/auth";

export interface CurrentUserResponse {
  authenticated: true;
  user: {
    userId: number;
    personId: number;
    employeeId: number;
    companyId: number;
    role: string | null;
  };
}

export const login = (data: LoginInput) =>
  request<LoginResponse>("/auth/login", { method: "POST", body: data });
export const getCurrentUser = (token: string) =>
  request<CurrentUserResponse>("/auth/me", { token });
