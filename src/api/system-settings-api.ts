import { apiFetch } from "@/api/client"

export type InsightsPeriodLastPeriod = {
  mode: "LAST_PERIOD"
  lastDays: number
}

export type InsightsPeriodCustomRange = {
  mode: "CUSTOM_RANGE"
  startDate: string
  endDate: string
}

export type InsightsPeriodConfig = InsightsPeriodLastPeriod | InsightsPeriodCustomRange

export async function getSystemSetting<T>(token: string, key: string): Promise<{ key: string; value: T }> {
  return apiFetch<{ key: string; value: T }>(
    `/api/system-settings/${encodeURIComponent(key)}`,
    { token },
  )
}

export async function putSystemSetting(
  token: string,
  key: string,
  value: unknown,
): Promise<{ key: string; value: unknown }> {
  return apiFetch<{ key: string; value: unknown }>(
    `/api/system-settings/${encodeURIComponent(key)}`,
    {
      token,
      method: "PUT",
      body: JSON.stringify({ value }),
    },
  )
}
