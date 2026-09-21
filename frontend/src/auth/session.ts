export const SESSION_STORAGE_KEY = "loyalty-platform.session";

export function readSessionToken(): string | null {
  const token = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  return token && token.trim() ? token : null;
}

export function storeSessionToken(token: string): void {
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, token);
  removeLegacySession();
}

export function clearStoredSession(): void {
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  removeLegacySession();
}

export function removeLegacySession(): void {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}
