import { apiFetch } from "@/api/client"

export type MerchantAccountStatus = "PENDING" | "ACTIVATED"

export type MerchantRow = {
  merchantId: string
  userId: string
  userEmail: string
  fullName: string
  isActive: boolean
  displayName: string
  businessName: string
  activityType: string
  phone: string
  email: string | null
  accountStatus: MerchantAccountStatus
  createdAt: string
  updatedAt: string
}

export type MerchantListResponse = {
  merchants: MerchantRow[]
  total: number
  page: number
  pageSize: number
}

function qs(params: Record<string, string | number | undefined>): string {
  const u = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue
    u.set(key, String(value))
  }
  const query = u.toString()
  return query ? `?${query}` : ""
}

export async function listMerchants(params: {
  token: string
  page?: number
  pageSize?: number
  accountStatus?: MerchantAccountStatus | ""
  search?: string
}): Promise<MerchantListResponse> {
  const query = qs({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
    accountStatus: params.accountStatus || undefined,
    search: params.search,
  })
  return apiFetch<MerchantListResponse>(`/api/users/merchants${query}`, {
    token: params.token,
  })
}

export async function approveMerchant(params: {
  token: string
  merchantId: string
}): Promise<MerchantRow> {
  return apiFetch<MerchantRow>(`/api/users/merchants/${params.merchantId}/approval`, {
    method: "PATCH",
    token: params.token,
  })
}
