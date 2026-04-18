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
  mainBranchId: string | null
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
  mainBranch: { id: string; name: string } | null
  subBranches: { id: string; name: string; governorate: string; zone: string | null }[]
  mainBranchId: string | null
}

export type WarehouseLinkedDeliveryZone = {
  id: string
  name: string | null
  governorate: string
  areaZone: string | null
  isActive: boolean
}

export type WarehouseZoneLinks = {
  deliveryZoneIds: string[]
  pickupZoneIds: string[]
  deliveryZones: WarehouseLinkedDeliveryZone[]
  pickupZones: WarehouseLinkedDeliveryZone[]
}

/**
 * One warehouse queue row = one merchant order batch (transfer).
 */
export type WarehouseMerchantOrderRow = {
  id: string
  merchantOrderId: string
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

export type WarehouseOrdersResponse = {
  merchantOrders: WarehouseMerchantOrderRow[]
  total: number
  page: number
  pageSize: number
}

export type WarehouseQueueResponse = {
  shipments: WarehouseMerchantOrderRow[]
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

type WarehouseOrdersParams = {
  token: string
  page?: number
  pageSize?: number
  search?: string
  transferStatus?: string
  returnsOnly?: boolean
  courierId?: string
  warehouseId?: string
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

export function getWarehouseZoneLinks(
  token: string,
  warehouseId: string,
): Promise<WarehouseZoneLinks> {
  return apiFetch<WarehouseZoneLinks>(
    `/api/warehouse/sites/${encodeURIComponent(warehouseId)}/delivery-zones`,
    { token },
  )
}

export function setWarehouseZoneLinks(params: {
  token: string
  warehouseId: string
  deliveryZoneIds: string[]
  pickupZoneIds: string[]
}): Promise<WarehouseZoneLinks> {
  return apiFetch<WarehouseZoneLinks>(
    `/api/warehouse/sites/${encodeURIComponent(params.warehouseId)}/delivery-zones`,
    {
      method: "PUT",
      token: params.token,
      body: JSON.stringify({
        deliveryZoneIds: params.deliveryZoneIds,
        pickupZoneIds: params.pickupZoneIds,
      }),
    },
  )
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

export function listWarehouseOrders(
  params: WarehouseOrdersParams,
): Promise<WarehouseOrdersResponse> {
  const query = qs({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
    search: params.search,
    transferStatus: params.transferStatus,
    returnsOnly: params.returnsOnly,
    courierId: params.courierId,
    warehouseId: params.warehouseId,
  })
  return apiFetch<WarehouseOrdersResponse>(`/api/warehouse/orders${query}`, {
    token: params.token,
  })
}

export type WarehouseStandaloneShipmentRow = {
  id: string
  trackingNumber: string | null
  status: string
  currentWarehouseId: string | null
  createdAt: string
  updatedAt: string
}

export type WarehouseStandaloneShipmentsResponse = {
  shipments: WarehouseStandaloneShipmentRow[]
  total: number
  page: number
  pageSize: number
}

export function listWarehouseStandaloneShipments(
  params: WarehouseOrdersParams,
): Promise<WarehouseStandaloneShipmentsResponse> {
  const query = qs({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
    search: params.search,
    warehouseId: params.warehouseId,
  })
  return apiFetch<WarehouseStandaloneShipmentsResponse>(`/api/warehouse/sites/${params.warehouseId}/standalone-shipments${query}`, {
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
  warehouseId: string
  trackingNumber: string
  note?: string
}): Promise<{
  scanResult: "SCANNED" | "ALREADY_SCANNED"
  shipmentId: string
  merchantOrderId: string
  newStatus: "IN_WAREHOUSE"
}> {
  return apiFetch<{
    scanResult: "SCANNED" | "ALREADY_SCANNED"
    shipmentId: string
    merchantOrderId: string
    newStatus: "IN_WAREHOUSE"
  }>("/api/warehouse/scan-in", {
    method: "POST",
    token: params.token,
    body: JSON.stringify({
      warehouseId: params.warehouseId,
      trackingNumber: params.trackingNumber.trim(),
      ...(params.note !== undefined ? { note: params.note } : {}),
    }),
  })
}

export function scanShipmentOut(params: {
  token: string
  warehouseId: string
  trackingNumber: string
  note?: string
}): Promise<unknown> {
  return apiFetch("/api/warehouse/scan-out", {
    method: "POST",
    token: params.token,
    body: JSON.stringify({
      warehouseId: params.warehouseId,
      trackingNumber: params.trackingNumber.trim(),
      ...(params.note !== undefined ? { note: params.note } : {}),
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

/** PATCH `/api/warehouse/shipments/:shipmentId/assignment` — assign pickup or delivery courier. */
export function assignWarehouseShipment(params: {
  token: string
  shipmentId: string
  courierId: string
  leg?: "pickup" | "delivery"
  orderId?: string
  note?: string | null
}): Promise<unknown> {
  return apiFetch(
    `/api/warehouse/shipments/${encodeURIComponent(params.shipmentId)}/assignment`,
    {
      method: "PATCH",
      token: params.token,
      body: JSON.stringify({
        courierId: params.courierId,
        ...(params.orderId ? { orderId: params.orderId } : {}),
        ...(params.leg ? { leg: params.leg } : {}),
        ...(params.note !== undefined ? { note: params.note } : {}),
      }),
    },
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

export type CreateWarehouseBody = {
  name: string
  governorate: string
  zone?: string
  code?: string
  latitude?: number | string
  longitude?: number | string
  address?: string
  mainBranchId?: string
  adminUserId?: string
  isActive?: boolean
}

export type UpdateWarehouseBody = Partial<CreateWarehouseBody>

export type WarehouseStaffMember = {
  id: string
  userId: string
  roleId: string
  user: {
    id: string
    email: string
    fullName: string
    isActive: boolean
  }
  role: {
    id: string
    name: string
    nameAr: string | null
    slug: string
    displayName: string
  }
}

export type WarehouseStaffResponse = {
  staff: WarehouseStaffMember[]
  admin: WarehouseSiteAdmin | null
}

export function createWarehouse(
  token: string,
  body: CreateWarehouseBody,
): Promise<WarehouseSiteRow> {
  return apiFetch<WarehouseSiteRow>("/api/warehouse/sites", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  })
}

export function updateWarehouse(
  token: string,
  warehouseId: string,
  body: UpdateWarehouseBody,
): Promise<WarehouseSiteRow> {
  return apiFetch<WarehouseSiteRow>(
    `/api/warehouse/sites/${encodeURIComponent(warehouseId)}`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify(body),
    },
  )
}

export function deleteWarehouse(token: string, warehouseId: string): Promise<void> {
  return apiFetch(`/api/warehouse/sites/${encodeURIComponent(warehouseId)}`, {
    method: "DELETE",
    token,
  })
}

export function setWarehouseAdmin(
  token: string,
  warehouseId: string,
  userId: string,
): Promise<WarehouseSiteAdmin> {
  return apiFetch<WarehouseSiteAdmin>(
    `/api/warehouse/sites/${encodeURIComponent(warehouseId)}/admin`,
    {
      method: "POST",
      token,
      body: JSON.stringify({ userId }),
    },
  )
}

export function removeWarehouseAdmin(
  token: string,
  warehouseId: string,
): Promise<void> {
  return apiFetch(
    `/api/warehouse/sites/${encodeURIComponent(warehouseId)}/admin`,
    {
      method: "DELETE",
      token,
    },
  )
}

export function listWarehouseStaff(
  token: string,
  warehouseId: string,
): Promise<WarehouseStaffResponse> {
  return apiFetch<WarehouseStaffResponse>(
    `/api/warehouse/sites/${encodeURIComponent(warehouseId)}/staff`,
    { token },
  )
}

export function assignWarehouseStaff(
  token: string,
  warehouseId: string,
  userId: string,
  roleId: string,
): Promise<WarehouseStaffMember> {
  return apiFetch<WarehouseStaffMember>(
    `/api/warehouse/sites/${encodeURIComponent(warehouseId)}/staff`,
    {
      method: "POST",
      token,
      body: JSON.stringify({ userId, roleId }),
    },
  )
}

export function removeWarehouseStaff(
  token: string,
  warehouseId: string,
  userId: string,
): Promise<void> {
  return apiFetch(
    `/api/warehouse/sites/${encodeURIComponent(warehouseId)}/staff/${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
      token,
    },
  )
}
