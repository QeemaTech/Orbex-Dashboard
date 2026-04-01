const baseUrl =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:5000"

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`
  return `${baseUrl}${p}`
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { token?: string | null },
): Promise<T> {
  const headers = new Headers(init?.headers)
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  if (init?.token) {
    headers.set("Authorization", `Bearer ${init.token}`)
  }
  const res = await fetch(apiUrl(path), { ...init, headers })
  if (res.status === 204) {
    return undefined as T
  }
  const text = await res.text()
  const data = text ? (JSON.parse(text) as unknown) : null
  if (!res.ok) {
    let msg = res.statusText
    if (typeof data === "object" && data !== null) {
      if (
        "error" in data &&
        typeof (data as { error: unknown }).error === "string"
      ) {
        msg = (data as { error: string }).error
      } else if (
        "message" in data &&
        typeof (data as { message: unknown }).message === "string"
      ) {
        msg = (data as { message: string }).message
      }
    }
    throw new ApiError(res.status, msg)
  }
  return data as T
}
