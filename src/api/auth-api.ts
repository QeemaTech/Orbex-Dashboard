import { apiFetch } from "@/api/client"
import type { AuthUser } from "@/lib/auth-context"

export type LoginBody = {
  username: string
  password: string
}

export type LoginResponse = {
  accessToken: string
  refreshToken: string
  user: AuthUser
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
