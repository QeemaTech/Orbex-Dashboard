import { apiFetch } from "@/api/client"
import type { AuthUser } from "@/lib/auth-context"

export type LoginBody = {
  email: string
  password: string
}

export type LoginResponse = {
  accessToken: string
  refreshToken: string
  user: AuthUser
  roles?: string[]
  permissions?: string[]
}

export type RefreshResponse = {
  accessToken: string
  refreshToken: string
}

export async function loginRequest(
  body: LoginBody,
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export async function meRequest(token: string): Promise<AuthUser> {
  return apiFetch<AuthUser>("/api/auth/me", { token })
}

export async function refreshRequest(
  refreshToken: string,
): Promise<RefreshResponse> {
  return apiFetch<RefreshResponse>("/api/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  })
}
