import { apiFetch } from "@/api/client"
import type { DeliveryManifestListRow } from "@/api/delivery-manifests-api"

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
  status: "DRAFT" | "LOCKED" | "DISPATCHED" | "CLOSED"
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

export function courierManifestRowToListRow(r: CourierManifestRow): DeliveryManifestListRow {
  return {
    id: r.id,
    manifestDate: r.manifestDate,
    plannedDispatchDate: null,
    status: r.status,
    shipmentCount: r.shipmentCount,
    totalCod: Number.parseFloat(r.totalCod) || 0,
    lockedAt: r.lockedAt,
    dispatchedAt: r.dispatchedAt,
    createdAt: r.createdAt,
    courier: r.courier,
    warehouse: r.warehouse,
    deliveryZone: r.deliveryZone,
  }
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

export function closeCourierManifest(params: {
  token: string
  manifestId: string
}): Promise<CourierManifestRow> {
  return apiFetch<CourierManifestRow>(`/api/courier-manifests/${params.manifestId}/close`, {
    method: "POST",
    token: params.token,
  })
}

export function createCourierManifest(params: {
  token: string
  courierId: string
  warehouseId: string
  deliveryZoneId: string
  manifestDate: string
}): Promise<CourierManifestRow> {
  return apiFetch<CourierManifestRow>("/api/courier-manifests", {
    method: "POST",
    token: params.token,
    body: JSON.stringify({
      courierId: params.courierId,
      warehouseId: params.warehouseId,
      deliveryZoneId: params.deliveryZoneId,
      manifestDate: params.manifestDate,
    }),
  })
}
