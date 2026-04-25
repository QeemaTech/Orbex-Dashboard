import { apiFetch } from "@/api/client"

export async function getUserSetting<T>(token: string, key: string): Promise<{ key: string; value: T }> {
  return apiFetch<{ key: string; value: T }>(
    `/api/user-settings/${encodeURIComponent(key)}`,
    { token },
  )
}

export async function putUserSetting(
  token: string,
  key: string,
  value: unknown,
): Promise<{ key: string; value: unknown }> {
  return apiFetch<{ key: string; value: unknown }>(
    `/api/user-settings/${encodeURIComponent(key)}`,
    {
      token,
      method: "PUT",
      body: JSON.stringify({ value }),
    },
  )
}
