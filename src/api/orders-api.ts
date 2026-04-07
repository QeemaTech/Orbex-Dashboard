import { apiFetch } from "@/api/client"
import type { ListShipmentsParams, ShipmentOrderRow } from "@/api/shipments-api"

export type OrderListResponse = {
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

/** Delivery units: `GET /api/shipments` (same filters as merchant-order list). */
export async function listOrders(
  p: ListShipmentsParams,
): Promise<OrderListResponse> {
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
  return apiFetch<OrderListResponse>(`/api/shipments${query}`, {
    token: p.token,
  })
}

/** Single delivery unit: `GET /api/shipments/:id` (legacy `/api/orders/:id`). */
export async function getOrderById(p: {
  token: string
  id: string
}): Promise<ShipmentOrderRow> {
  return apiFetch<ShipmentOrderRow>(
    `/api/shipments/${encodeURIComponent(p.id)}`,
    { token: p.token },
  )
}
