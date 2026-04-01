import { apiFetch } from "@/api/client"

export type WarehouseStats = {
  awaitingScanIn: number
  inWarehouse: number
  readyForAssignment: number
  assigned: number
  returnsPending: number
  returnsReceivedToday: number
}

export type WarehouseShipmentRow = {
  id: string
  trackingNumber: string | null
  customerName: string
  phonePrimary: string
  currentStatus: string
  status?: string
  subStatus?: string
  paymentStatus?: string
  assignedCourierId: string | null
  returnReceivedAt: string | null
  scannedOutAt: string | null
  merchant?: {
    id: string
    displayName: string
    businessName: string
  }
  courier?: {
    id: string
    fullName: string | null
    userId: string
    contactPhone: string | null
  } | null
  updatedAt: string
}

export type WarehouseQueueResponse = {
  shipments: WarehouseShipmentRow[]
  total: number
  page: number
  pageSize: number
}

type WarehouseQueueParams = {
  token: string
  page?: number
  pageSize?: number
  search?: string
  status?: string
  returnsOnly?: boolean
}

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue
    query.set(key, String(value))
  }
  const out = query.toString()
  return out ? `?${out}` : ""
}

export function getWarehouseStats(token: string): Promise<WarehouseStats> {
  return apiFetch<WarehouseStats>("/api/warehouse/dashboard", { token })
}

export function listWarehouseQueue(
  params: WarehouseQueueParams,
): Promise<WarehouseQueueResponse> {
  const query = qs({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
    search: params.search,
    status: params.status,
    returnsOnly: params.returnsOnly,
  })
  return apiFetch<WarehouseQueueResponse>(`/api/warehouse/queue${query}`, {
    token: params.token,
  })
}

export function scanShipmentIn(params: {
  token: string
  trackingNumber: string
  note?: string
}): Promise<unknown> {
  return apiFetch("/api/warehouse/scan-in", {
    method: "POST",
    token: params.token,
    body: JSON.stringify({
      trackingNumber: params.trackingNumber,
      note: params.note,
    }),
  })
}

export function scanShipmentOut(params: {
  token: string
  trackingNumber: string
  note?: string
}): Promise<unknown> {
  return apiFetch("/api/warehouse/scan-out", {
    method: "POST",
    token: params.token,
    body: JSON.stringify({
      trackingNumber: params.trackingNumber,
      note: params.note,
    }),
  })
}

export function assignWarehouseShipment(params: {
  token: string
  shipmentId: string
  courierId: string
  note?: string
}): Promise<unknown> {
  return apiFetch(`/api/warehouse/shipments/${params.shipmentId}/assignment`, {
    method: "PATCH",
    token: params.token,
    body: JSON.stringify({
      courierId: params.courierId,
      note: params.note,
    }),
  })
}

export function receiveWarehouseReturn(params: {
  token: string
  trackingNumber: string
  returnDiscountAmount?: number
  note?: string
}): Promise<unknown> {
  return apiFetch("/api/warehouse/returns/receive", {
    method: "POST",
    token: params.token,
    body: JSON.stringify({
      trackingNumber: params.trackingNumber,
      returnDiscountAmount: params.returnDiscountAmount,
      note: params.note,
    }),
  })
}

export function getWarehouseTracking(params: {
  token: string
  trackingNumber: string
}): Promise<unknown> {
  const tracking = encodeURIComponent(params.trackingNumber)
  return apiFetch(`/api/warehouse/tracking/${tracking}`, {
    token: params.token,
  })
}
