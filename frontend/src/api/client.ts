const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown; token?: string }

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, token, headers, ...requestOptions } = options
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(response.status, isErrorResponse(data) ? data.error : 'Não foi possível concluir esta solicitação.')
  return data as T
}

function isErrorResponse(value: unknown): value is { error: string } {
  return typeof value === 'object' && value !== null && 'error' in value && typeof value.error === 'string'
}
