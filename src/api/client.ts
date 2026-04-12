const baseUrl =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:5000"

const STORAGE_ACCESS = "orbex_access_token"
const STORAGE_REFRESH = "orbex_refresh_token"
const STORAGE_USER = "orbex_user"
const AUTH_CHANGED_EVENT = "orbex-auth-changed"

let refreshPromise: Promise<string | null> | null = null

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

function notifyAuthChanged() {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
}

function clearStoredAuth() {
  localStorage.removeItem(STORAGE_ACCESS)
  localStorage.removeItem(STORAGE_REFRESH)
  localStorage.removeItem(STORAGE_USER)
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem(STORAGE_REFRESH)
    if (!refreshToken) return null

    const res = await fetch(apiUrl("/api/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) {
      clearStoredAuth()
      notifyAuthChanged()
      return null
    }

    const text = await res.text()
    const data = text ? (JSON.parse(text) as unknown) : null
    if (
      !data ||
      typeof data !== "object" ||
      typeof (data as { accessToken?: unknown }).accessToken !== "string" ||
      typeof (data as { refreshToken?: unknown }).refreshToken !== "string"
    ) {
      clearStoredAuth()
      notifyAuthChanged()
      return null
    }

    const pair = data as { accessToken: string; refreshToken: string }
    localStorage.setItem(STORAGE_ACCESS, pair.accessToken)
    localStorage.setItem(STORAGE_REFRESH, pair.refreshToken)
    notifyAuthChanged()
    return pair.accessToken
  })().finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { token?: string | null },
): Promise<T> {
  const headers = new Headers(init?.headers)
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  // Add Accept-Language header based on stored locale
  const storedLocale = localStorage.getItem("i18nextLng") || "en"
  headers.set("Accept-Language", storedLocale)
  const storedAccess = localStorage.getItem(STORAGE_ACCESS)
  const authToken = storedAccess ?? init?.token ?? null
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`)
  }
  let res = await fetch(apiUrl(path), { ...init, headers })
  if (res.status === 401 && authToken) {
    const nextToken = await refreshAccessToken()
    if (nextToken) {
      const retryHeaders = new Headers(init?.headers)
      if (!retryHeaders.has("Content-Type")) {
        retryHeaders.set("Content-Type", "application/json")
      }
      retryHeaders.set("Authorization", `Bearer ${nextToken}`)
      res = await fetch(apiUrl(path), { ...init, headers: retryHeaders })
    }
  }
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
