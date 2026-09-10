import { request } from "./client";
import type { LoginInput, LoginResponse } from "../types/auth";

export const login = (data: LoginInput) =>
  request<LoginResponse>("/auth/login", { method: "POST", body: data });
export const getCurrentUser = (token: string) =>
  request<{ authenticated: true; user: unknown }>("/auth/me", { token });
