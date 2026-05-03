const baseUrl =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:5000"

const STORAGE_ACCESS = "orbex_access_token"
const STORAGE_REFRESH = "orbex_refresh_token"
const STORAGE_USER = "orbex_user"
const AUTH_CHANGED_EVENT = "orbex-auth-changed"

let refreshPromise: Promise<string | null> | null = null

/** Optional Zod-style payload from `POST` validation (`error: "Validation failed", details: flatten()`). */
export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly details?: unknown

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    if (code !== undefined) {
      this.code = code
    }
    if (details !== undefined) {
      this.details = details
    }
  }
}

/** Turns Zod `flatten()` shape from API `{ details }` into a short user-visible string. */
export function formatApiValidationDetails(details: unknown): string {
  if (!details || typeof details !== "object") {
    return ""
  }
  const d = details as {
    formErrors?: string[]
    fieldErrors?: Record<string, string[] | undefined>
  }
  const parts: string[] = []
  if (Array.isArray(d.formErrors)) {
    for (const e of d.formErrors) {
      if (e) parts.push(e)
    }
  }
  if (d.fieldErrors && typeof d.fieldErrors === "object") {
    for (const [key, errs] of Object.entries(d.fieldErrors)) {
      if (errs?.length) {
        parts.push(`${key}: ${errs.join(", ")}`)
      }
    }
  }
  return parts.join(" · ")
}

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`
  return `${baseUrl}${p}`
}

/**
 * JSON GET/POST for unauthenticated endpoints (e.g. public tracking).
 * Never sends stored access tokens — avoids coupling customer sessions to staff JWTs.
 */
export async function publicApiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers)
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  const storedLocale =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("i18nextLng") || "en"
      : "en"
  headers.set("Accept-Language", storedLocale)

  const res = await fetch(apiUrl(path), { ...init, headers })
  if (res.status === 204) {
    return undefined as T
  }
  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? (JSON.parse(text) as unknown) : null
  } catch (parseErr) {
    console.error("[publicApiFetch] JSON parse error:", {
      path,
      status: res.status,
      responseLength: text.length,
      firstChars: text.substring(0, 100),
      error: parseErr instanceof Error ? parseErr.message : String(parseErr),
    })
    // If response is HTML or not valid JSON, it's likely a server error page
    if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
      throw new ApiError(res.status || 500, "Server returned HTML instead of JSON - this usually means an internal server error or misconfigured endpoint")
    }
    throw new ApiError(res.status || 500, "Invalid JSON response from server")
  }
  if (!res.ok) {
    let msg = res.statusText
    let code: string | undefined
    let details: unknown
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
      if ("code" in data && typeof (data as { code: unknown }).code === "string") {
        code = (data as { code: string }).code
      }
      if ("details" in data) {
        details = (data as { details: unknown }).details
      }
    }
    throw new ApiError(res.status, msg, code, details)
  }
  return data as T
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
  // If a caller passes a token explicitly, it must win over any cached token.
  // This prevents stale localStorage tokens from breaking requests like /api/auth/me.
  const authToken = init?.token ?? storedAccess ?? null
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
      retryHeaders.set("Accept-Language", storedLocale)
      retryHeaders.set("Authorization", `Bearer ${nextToken}`)
      res = await fetch(apiUrl(path), { ...init, headers: retryHeaders })
    }
  }
  if (res.status === 204) {
    return undefined as T
  }
  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? (JSON.parse(text) as unknown) : null
  } catch (parseErr) {
    console.error("[apiFetch] JSON parse error:", {
      path,
      status: res.status,
      responseLength: text.length,
      firstChars: text.substring(0, 100),
      error: parseErr instanceof Error ? parseErr.message : String(parseErr),
    })
    // If response is HTML or not valid JSON, it's likely a server error page
    if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
      throw new ApiError(res.status || 500, "Server returned HTML instead of JSON - this usually means an internal server error or misconfigured endpoint")
    }
    throw new ApiError(res.status || 500, "Invalid JSON response from server")
  }
  if (!res.ok) {
    let msg = res.statusText
    let code: string | undefined
    let details: unknown
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
      if ("code" in data && typeof (data as { code: unknown }).code === "string") {
        code = (data as { code: string }).code
      }
      if ("details" in data) {
        details = (data as { details: unknown }).details
      }
    }
    throw new ApiError(res.status, msg, code, details)
  }
  return data as T
}

export async function apiFetchText(
  path: string,
  init?: RequestInit & { token?: string | null },
): Promise<string> {
  const headers = new Headers(init?.headers)
  // Preserve existing language/auth behavior, but do NOT force JSON.
  const storedLocale = localStorage.getItem("i18nextLng") || "en"
  headers.set("Accept-Language", storedLocale)
  if (!headers.has("Accept")) {
    headers.set("Accept", "text/plain,*/*")
  }

  const storedAccess = localStorage.getItem(STORAGE_ACCESS)
  // Explicit caller token must win over cached token.
  const authToken = init?.token ?? storedAccess ?? null
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`)
  }

  let res = await fetch(apiUrl(path), { ...init, headers })
  if (res.status === 401 && authToken) {
    const nextToken = await refreshAccessToken()
    if (nextToken) {
      const retryHeaders = new Headers(init?.headers)
      retryHeaders.set("Accept-Language", storedLocale)
      if (!retryHeaders.has("Accept")) {
        retryHeaders.set("Accept", "text/plain,*/*")
      }
      retryHeaders.set("Authorization", `Bearer ${nextToken}`)
      res = await fetch(apiUrl(path), { ...init, headers: retryHeaders })
    }
  }

  const text = await res.text()
  if (!res.ok) {
    // Best-effort decode of JSON error bodies, otherwise return plain text/status.
    let msg = res.statusText
    try {
      const parsed = text ? (JSON.parse(text) as unknown) : null
      if (typeof parsed === "object" && parsed !== null) {
        if ("error" in parsed && typeof (parsed as { error?: unknown }).error === "string") {
          msg = (parsed as { error: string }).error
        } else if (
          "message" in parsed &&
          typeof (parsed as { message?: unknown }).message === "string"
        ) {
          msg = (parsed as { message: string }).message
        }
      } else if (text) {
        msg = text
      }
    } catch {
      if (text) msg = text
    }
    throw new ApiError(res.status, msg)
  }

  return text
}
