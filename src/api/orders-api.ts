import { apiFetch } from "@/api/client"

import type { ListShipmentsParams, ShipmentOrderRow } from "@/api/shipments-api"

export type OrderListResponse = {
  orders: ShipmentOrderRow[]
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

/** One row per customer order line (`GET /api/orders`). Query shape matches shipment list filters. */
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
    assignedWarehouseId: p.assignedWarehouseId,
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
    expand: p.expand ?? "merchant,courier",
  })
  return apiFetch<OrderListResponse>(`/api/orders${query}`, {
    token: p.token,
  })
}
