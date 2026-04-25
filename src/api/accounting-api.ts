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

export type AccountingShipmentTab =
  | "IN_TRANSIT"
  | "POSTPONED"
  | "DELIVERED"
  | "REJECTED"

export type AccountingShipmentRow = {
  id: string
  trackingNumber: string | null
  shipmentValue: string
  shippingFee: string
  commissionFee: string
  paymentMethod: string
  paymentStatus: string
  status: string
  createdAt: string
  postponedAt: string | null
  currentWarehouseId: string | null
  currentWarehouseName: string | null
  merchant: {
    id: string
    displayName: string
    businessName: string
    phone: string
  }
  courier: {
    id: string
    fullName: string | null
    contactPhone: string | null
  } | null
  customer: {
    customerName: string
    phonePrimary: string
  }
}

export type AccountingShipmentListResponse = {
  items: AccountingShipmentRow[]
  total: number
  page: number
  pageSize: number
}

export type AccountingShipmentListParams = {
  token: string
  tab: AccountingShipmentTab
  courierId?: string
  merchantId?: string
  warehouseId?: string
  from?: string
  to?: string
  search?: string
  page?: number
  pageSize?: number
}

function appendIfDefined(q: URLSearchParams, key: string, value: string | number | undefined): void {
  if (value === undefined || value === null) return
  const s = String(value).trim()
  if (s.length === 0) return
  q.set(key, s)
}

export function listAccountingShipments(
  params: AccountingShipmentListParams,
): Promise<AccountingShipmentListResponse> {
  const q = new URLSearchParams()
  q.set("tab", params.tab)
  appendIfDefined(q, "courierId", params.courierId)
  appendIfDefined(q, "merchantId", params.merchantId)
  appendIfDefined(q, "warehouseId", params.warehouseId)
  appendIfDefined(q, "from", params.from)
  appendIfDefined(q, "to", params.to)
  appendIfDefined(q, "search", params.search)
  appendIfDefined(q, "page", params.page)
  appendIfDefined(q, "pageSize", params.pageSize)
  return apiFetch<AccountingShipmentListResponse>(
    `/api/accounting/shipments?${q.toString()}`,
    { token: params.token },
  )
}

export function settleAccountingShipment(
  token: string,
  shipmentId: string,
): Promise<AccountingShipmentRow> {
  return apiFetch<AccountingShipmentRow>(
    `/api/accounting/shipments/${encodeURIComponent(shipmentId)}/settle`,
    { token, method: "POST" },
  )
}

export type CourierAccountSummary = {
  courier: {
    id: string
    fullName: string | null
    contactPhone: string | null
  }
  periodFrom: string
  periodTo: string
  totalShipments: number
  deliveredShipments: number
  rejectedShipments: number
  postponedShipments: number
  totalCollected: string
  totalCommissionDue: string
  netDue: string
}

export function getCourierAccountSummary(
  token: string,
  courierId: string,
  params?: { from?: string; to?: string },
): Promise<CourierAccountSummary> {
  const q = new URLSearchParams()
  appendIfDefined(q, "from", params?.from)
  appendIfDefined(q, "to", params?.to)
  const qs = q.toString() ? `?${q.toString()}` : ""
  return apiFetch<CourierAccountSummary>(
    `/api/accounting/couriers/${encodeURIComponent(courierId)}/summary${qs}`,
    { token },
  )
}

export type MerchantAccountSummary = {
  summary: {
    merchant: {
      id: string
      displayName: string
      businessName: string
      phone: string
    }
    periodFrom: string
    periodTo: string
    monthlyShipments: number
    deliveredShipments: number
    settledShipments: number
    totalShipmentValue: string
    totalCollected: string
    totalCommission: string
    totalShippingFees: string
    remaining: string
  }
  daily: Array<{
    date: string
    shipmentCount: number
    delivered: number
    collected: string
    commission: string
    net: string
  }>
}

export function getMerchantAccountSummary(
  token: string,
  merchantId: string,
  params?: { from?: string; to?: string },
): Promise<MerchantAccountSummary> {
  const q = new URLSearchParams()
  appendIfDefined(q, "from", params?.from)
  appendIfDefined(q, "to", params?.to)
  const qs = q.toString() ? `?${q.toString()}` : ""
  return apiFetch<MerchantAccountSummary>(
    `/api/accounting/merchants/${encodeURIComponent(merchantId)}/summary${qs}`,
    { token },
  )
}
