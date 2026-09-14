import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getCurrentUser, login as loginRequest } from "../api/auth.api";
import type { LoginInput, LoginResponse } from "../types/auth";
import { AuthContext } from "./auth-context";
import {
  clearStoredSession,
  readSessionToken,
  removeLegacySession,
  storeSessionToken,
} from "./session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [storedToken] = useState(readSessionToken);
  const [session, setSession] = useState<LoginResponse | null>(null);
  const [isLoading, setIsLoading] = useState(() => storedToken !== null);

  useEffect(() => {
    removeLegacySession();
    if (!storedToken) return;

    getCurrentUser(storedToken)
      .then(({ user }) => setSession(sessionFromCurrentUser(storedToken, user)))
      .catch(() => clearStoredSession())
      .finally(() => setIsLoading(false));
  }, [storedToken]);

  const logout = useCallback(() => {
    clearStoredSession();
    setSession(null);
    window.location.replace("/login");
  }, []);

  const login = useCallback(async (data: LoginInput) => {
    const authenticatedSession = await loginRequest(data);
    storeSessionToken(authenticatedSession.token);
    setSession(authenticatedSession);
  }, []);

  const value = useMemo(
    () => ({ session, isLoading, login, logout }),
    [session, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function sessionFromCurrentUser(
  token: string,
  user: Awaited<ReturnType<typeof getCurrentUser>>["user"],
): LoginResponse {
  return {
    token,
    // /auth/me returns JWT claims only. Personal data is deliberately not
    // persisted; these labels are used only after a reload.
    user: { idUser: user.userId, userName: "", name: "Administrador", cpf: "" },
    employee: { idCompanyEmployee: user.employeeId, role: user.role },
    company: { idCompany: user.companyId, name: "Empresa" },
  };
}
