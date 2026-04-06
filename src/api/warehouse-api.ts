import { apiFetch } from "@/api/client"

/** Hub dashboard: counts of shipments by `Shipment.transferStatus` only. */
export type WarehouseStats = {
  pending: number
  assigned: number
  onTheWayToWarehouse: number
  inWarehouse: number
  partiallyDelivered: number
  delivered: number
  /** Populated for unscoped `WAREHOUSE_ADMIN` dashboard calls */
  totalWarehouses?: number
  activeWarehouses?: number
}

export type WarehouseSiteRow = {
  id: string
  name: string
  governorate: string
  zone: string | null
  code: string | null
  latitude: string | null
  longitude: string | null
  address: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  /** Active pipeline transfer count for this hub (from directory API when available). */
  transferCount?: number
}

export type WarehouseSiteAdmin = {
  id: string
  email: string
  fullName: string
  isActive: boolean
}

export type WarehouseSiteDetail = WarehouseSiteRow & {
  admin: WarehouseSiteAdmin | null
  staffCount: number
}

/**
 * One warehouse queue row = one merchant transfer (shipment). `trackingNumber` is derived from
 * order lines (comma-separated when multiple orders each have a tracking number).
 */
export type WarehouseShipmentRow = {
  id: string
  shipmentId: string
  trackingNumber: string | null
  regionId: string | null
  transferStatus: string
  scannedOutAt: string | null
  updatedAt: string
  orderCount: number
  totalShipmentValue: string
  merchant?: {
    id: string
    displayName: string
    businessName: string
  }
  pickupCourier?: {
    id: string
    fullName: string | null
    userId: string
    contactPhone: string | null
  } | null
}

export type WarehouseQueueResponse = {
  shipments: WarehouseShipmentRow[]
  total: number
  page: number
  pageSize: number
}

export type WarehouseCourierRow = {
  id: string
  fullName: string | null
  contactPhone: string | null
  servesShipmentRegion: boolean
}

type WarehouseQueueParams = {
  token: string
  page?: number
  pageSize?: number
  search?: string
  /** Single `ShipmentTransferStatus` (query `transferStatus`). */
  transferStatus?: string
  /** Comma-separated `ShipmentTransferStatus` values (query `transferStatusesIn`). */
  transferStatusesIn?: string
  returnsOnly?: boolean
  courierId?: string
  /** Admin / warehouse admin: narrow queue to one hub */
  warehouseId?: string
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

export function getWarehouseStats(
  token: string,
  warehouseId?: string,
): Promise<WarehouseStats> {
  const query = qs({ warehouseId })
  return apiFetch<WarehouseStats>(`/api/warehouse/dashboard${query}`, {
    token,
  })
}

export function listWarehouseQueue(
  params: WarehouseQueueParams,
): Promise<WarehouseQueueResponse> {
  const query = qs({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
    search: params.search,
    transferStatus: params.transferStatus,
    transferStatusesIn: params.transferStatusesIn,
    returnsOnly: params.returnsOnly,
    courierId: params.courierId,
    warehouseId: params.warehouseId,
  })
  return apiFetch<WarehouseQueueResponse>(`/api/warehouse/queue${query}`, {
    token: params.token,
  })
}

function scanPayloadFromInput(raw: string): {
  trackingNumber?: string
  shipmentId?: string
} {
  const t = raw.trim()
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      t,
    )
  ) {
    return { shipmentId: t }
  }
  return { trackingNumber: t }
}

export function scanShipmentIn(params: {
  token: string
  trackingNumber?: string
  shipmentId?: string
  note?: string
}): Promise<unknown> {
  return apiFetch("/api/warehouse/scan-in", {
    method: "POST",
    token: params.token,
    body: JSON.stringify({
      ...(params.shipmentId
        ? { shipmentId: params.shipmentId }
        : { trackingNumber: params.trackingNumber }),
      note: params.note,
    }),
  })
}

export function scanShipmentOut(params: {
  token: string
  trackingNumber?: string
  shipmentId?: string
  note?: string
}): Promise<unknown> {
  return apiFetch("/api/warehouse/scan-out", {
    method: "POST",
    token: params.token,
    body: JSON.stringify({
      ...(params.shipmentId
        ? { shipmentId: params.shipmentId }
        : { trackingNumber: params.trackingNumber }),
      note: params.note,
    }),
  })
}

export { scanPayloadFromInput }

export function getWarehouseCouriers(params: {
  token: string
  regionId?: string
}): Promise<{ couriers: WarehouseCourierRow[] }> {
  const query = qs({ regionId: params.regionId })
  return apiFetch<{ couriers: WarehouseCourierRow[] }>(
    `/api/warehouse/couriers${query}`,
    { token: params.token },
  )
}

export function receiveWarehouseReturn(params: {
  token: string
  trackingNumber?: string
  shipmentId?: string
  orderId?: string
  returnDiscountAmount?: number
  note?: string
}): Promise<unknown> {
  return apiFetch("/api/warehouse/returns/receive", {
    method: "POST",
    token: params.token,
    body: JSON.stringify({
      ...(params.shipmentId
        ? { shipmentId: params.shipmentId }
        : { trackingNumber: params.trackingNumber }),
      ...(params.orderId ? { orderId: params.orderId } : {}),
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

export function listWarehouseSites(token: string): Promise<{
  warehouses: WarehouseSiteRow[]
}> {
  return apiFetch("/api/warehouse/sites", { token })
}

export function getWarehouseSite(
  token: string,
  warehouseId: string,
): Promise<WarehouseSiteDetail> {
  return apiFetch(`/api/warehouse/sites/${encodeURIComponent(warehouseId)}`, {
    token,
  })
}
