import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getCurrentUser, login as loginRequest } from "../api/auth.api";
import { ApiError } from "../api/client";
import type { LoginInput, LoginResponse } from "../types/auth";
import { AuthContext } from "./auth-context";

const STORAGE_KEY = "loyalty-platform.session";
export function AuthProvider({ children }: { children: ReactNode }) {
  const [storedSession] = useState(readStoredSession);
  const [session, setSession] = useState<LoginResponse | null>(null);
  const [isLoading, setIsLoading] = useState(() => storedSession !== null);
  useEffect(() => {
    if (!storedSession) return;
    getCurrentUser(storedSession.token)
      .then(() => setSession(storedSession))
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401)
          window.localStorage.removeItem(STORAGE_KEY);
      })
      .finally(() => setIsLoading(false));
  }, [storedSession]);
  const logout = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);
  const login = useCallback(async (data: LoginInput) => {
    const authenticatedSession = await loginRequest(data);
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(authenticatedSession),
    );
    setSession(authenticatedSession);
  }, []);
  const value = useMemo(
    () => ({ session, isLoading, login, logout }),
    [session, isLoading, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function readStoredSession(): LoginResponse | null {
  try {
    const value: unknown = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "null",
    );
    return isLoginResponse(value) ? value : null;
  } catch {
    return null;
  }
}
function isLoginResponse(value: unknown): value is LoginResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "token" in value &&
    typeof value.token === "string" &&
    "company" in value
  );
}
