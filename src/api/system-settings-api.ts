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
export const VISA_COMMISSION_RATE_KEY = "visa_commission_rate"
export const DEFAULT_COMMISSION_FEE_KEY = "default_commission_fee"
export const CUSTOMER_SERVICE_FEE_RATE_KEY = "customer_service_fee_rate"
export const SHIPPING_FEE_CONFIG_KEY = "shipping_fee_config"

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
