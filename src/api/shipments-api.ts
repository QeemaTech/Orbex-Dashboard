import { apiFetch } from "@/api/client"
import type { ListShipmentsParams, ShipmentOrderRow } from "@/api/merchant-orders-api"

/** `GET /api/shipments/:id/label` — thermal label payload. */
export type ShipmentLabelResponse = {
  trackingNumber: string
  merchantName: string
  customerName: string
  phone: string
  address: string
  governorate: string
  notes: string
  codAmount: number | null
  itemsCount: number
  createdAt: string
  warehouseName: string
}

export type ShipmentsListResponse = {
  shipments: ShipmentOrderRow[]
  total: number
  page: number
  pageSize: number
}

function qs(params: Record<string, string | number | undefined>): string {
  const u = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue
    u.set(k, String(v))
  }
  const s = u.toString()
  return s ? `?${s}` : ""
}

/** Delivery units (customer shipments): `GET /api/shipments` (same filters as merchant-order list). */
export async function listShipments(
  p: ListShipmentsParams,
): Promise<ShipmentsListResponse> {
  const query = qs({
    page: p.page ?? 1,
    pageSize: p.pageSize ?? 20,
    merchantId: p.merchantId,
    merchantName: p.merchantName,
    assignedCourierId: p.assignedCourierId,
    courierName: p.courierName,
    unassignedOnly: p.unassignedOnly ? "true" : undefined,
    regionId: p.regionId,
    regionName: p.regionName,
    phoneSearch: p.phoneSearch,
    trackingNumber: p.trackingNumber,
    customerName: p.customerName,
    coreSubIn: p.coreSubIn,
    status: p.status,
    subStatus: p.subStatus,
    paymentStatus: p.paymentStatus,
    createdFrom: p.createdFrom,
    createdTo: p.createdTo,
    overdueOnly: p.overdueOnly ? "true" : undefined,
    assignedWarehouseId: p.assignedWarehouseId,
    expand: p.expand ?? "merchant,courier",
  })
  return apiFetch<ShipmentsListResponse>(`/api/shipments${query}`, {
    token: p.token,
  })
}

/** Single delivery unit: `GET /api/shipments/:id`. */
export async function getShipmentById(p: {
  token: string
  shipmentId: string
}): Promise<ShipmentOrderRow> {
  return apiFetch<ShipmentOrderRow>(
    `/api/shipments/${encodeURIComponent(p.shipmentId)}`,
    { token: p.token },
  )
}

/** Print-only label fields: `GET /api/shipments/:id/label`. */
export async function getShipmentLabel(p: {
  token: string
  shipmentId: string
}): Promise<ShipmentLabelResponse> {
  return apiFetch<ShipmentLabelResponse>(
    `/api/shipments/${encodeURIComponent(p.shipmentId)}/label`,
    { token: p.token },
  )
}
