import { apiFetch } from "@/api/client"

type CourierManifestShipment = {
  id: string
  trackingNumber: string | null
  shipmentValue: string
  shippingFee: string
  paymentMethod: string
  status: string
  csConfirmedAt: string | null
}

export type CourierManifestRow = {
  id: string
  courierId: string
  warehouseId: string
  deliveryZoneId: string
  manifestDate: string
  totalCod: string
  shipmentCount: number
  lockedAt: string | null
  lockedByUserId: string | null
  dispatchedAt: string | null
  createdAt: string
  updatedAt: string
  courier: { id: string; fullName: string | null; contactPhone: string | null }
  warehouse: { id: string; name: string; governorate: string }
  deliveryZone: { id: string; name: string | null; governorate: string }
  shipments: CourierManifestShipment[]
}

export type ListCourierManifestResponse = {
  manifests: CourierManifestRow[]
  total: number
  page: number
  pageSize: number
}

export type ListCourierManifestParams = {
  token: string
  courierId?: string
  warehouseId?: string
  deliveryZoneId?: string
  fromDate?: string
  toDate?: string
  page?: number
  pageSize?: number
}

function qs(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue
    query.set(key, String(value))
  }
  const q = query.toString()
  return q ? `?${q}` : ""
}

export function listCourierManifests(
  params: ListCourierManifestParams,
): Promise<ListCourierManifestResponse> {
  const query = qs({
    courierId: params.courierId,
    warehouseId: params.warehouseId,
    deliveryZoneId: params.deliveryZoneId,
    fromDate: params.fromDate,
    toDate: params.toDate,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 200,
  })
  return apiFetch<ListCourierManifestResponse>(`/api/courier-manifests${query}`, {
    token: params.token,
  })
}

export function getCourierManifest(params: {
  token: string
  manifestId: string
}): Promise<CourierManifestRow> {
  return apiFetch<CourierManifestRow>(`/api/courier-manifests/${params.manifestId}`, {
    token: params.token,
  })
}

export function autoAssignCourierManifests(params: {
  token: string
  warehouseId: string
  manifestDate: string
  defaultCourierCapacity: number
  courierCapacities?: Record<string, number>
}): Promise<{
  manifestDate: string
  warehouseId: string
  assignedCount: number
  skippedCount: number
  assignments: Array<{ shipmentId: string; courierId: string; deliveryZoneId: string }>
  skipped: Array<{ shipmentId: string; reason: string }>
}> {
  return apiFetch<{
    manifestDate: string
    warehouseId: string
    assignedCount: number
    skippedCount: number
    assignments: Array<{ shipmentId: string; courierId: string; deliveryZoneId: string }>
    skipped: Array<{ shipmentId: string; reason: string }>
  }>(`/api/courier-manifests/auto-assign`, {
    method: "POST",
    token: params.token,
    body: JSON.stringify({
      warehouseId: params.warehouseId,
      manifestDate: params.manifestDate,
      defaultCourierCapacity: params.defaultCourierCapacity,
      ...(params.courierCapacities ? { courierCapacities: params.courierCapacities } : {}),
    }),
  })
}

export function lockCourierManifest(params: {
  token: string
  manifestId: string
}): Promise<CourierManifestRow> {
  return apiFetch<CourierManifestRow>(`/api/courier-manifests/${params.manifestId}/lock`, {
    method: "POST",
    token: params.token,
  })
}

export function dispatchCourierManifest(params: {
  token: string
  manifestId: string
  scannedOutAt?: string
}): Promise<CourierManifestRow> {
  return apiFetch<CourierManifestRow>(`/api/courier-manifests/${params.manifestId}/dispatch`, {
    method: "POST",
    token: params.token,
    body: JSON.stringify(
      params.scannedOutAt ? { scannedOutAt: params.scannedOutAt } : {},
    ),
  })
}
