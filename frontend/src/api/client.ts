// VITE_API_URL is an optional public deployment setting. The default uses the
// same-origin API proxy and must never contain credentials or secrets.
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "/api";
const REQUEST_TIMEOUT_MS = 15_000;
const SESSION_STORAGE_KEY = "loyalty-platform.session";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export class RequestTimeoutError extends Error {
  constructor() {
    super("A solicitação demorou mais que o esperado. Tente novamente.");
    this.name = "RequestTimeoutError";
  }
}

export class NetworkError extends Error {
  constructor() {
    super("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.");
    this.name = "NetworkError";
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  token?: string;
};

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, token, headers, ...requestOptions } = options;
  const controller = new AbortController();
  let didTimeout = false;
  const timeoutId = window.setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  const abortRequest = () => controller.abort();
  requestOptions.signal?.addEventListener("abort", abortRequest, { once: true });

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...requestOptions,
      signal: controller.signal,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (didTimeout) throw new RequestTimeoutError();
    if (isAbortError(error)) throw error;
    throw new NetworkError();
  } finally {
    window.clearTimeout(timeoutId);
    requestOptions.signal?.removeEventListener("abort", abortRequest);
  }

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && token && path !== "/auth/login") {
      clearAuthenticationAndRedirect();
    }
    throw new ApiError(
      response.status,
      isErrorResponse(data)
        ? data.error
        : "Não foi possível concluir esta solicitação.",
    );
  }
  return data as T;
}

function clearAuthenticationAndRedirect(): void {
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  window.localStorage.removeItem(SESSION_STORAGE_KEY);

  if (window.location.pathname !== "/login") {
    window.location.replace("/login?sessionExpired=1");
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function isErrorResponse(value: unknown): value is { error: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  );
}
