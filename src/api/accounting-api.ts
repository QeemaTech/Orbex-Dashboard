import { apiFetch } from "@/api/client"

export type AccountingDashboardResponse = {
  paymentStatusSummary: Array<{ paymentStatus: string; count: number }>
}

export function getAccountingDashboard(
  token: string,
): Promise<AccountingDashboardResponse> {
  return apiFetch<AccountingDashboardResponse>("/api/accounting/dashboard", {
    token,
  })
}

