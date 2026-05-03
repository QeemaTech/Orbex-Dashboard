import { apiFetch } from "@/api/client"

export type DeliveryManifestKpis = {
  shipmentsReady: number
  availableCouriers: number
  activeManifests: number
}

export type EligibleShipmentRow = {
  id: string
  trackingNumber: string | null
  shipmentValueEgp: number
  customerName: string
  customerPhone: string
  zoneLabel: string
  governorate: string
  codAmountEgp: number
  codDisplay: string
  paymentMethod: string
  priorityTier: "URGENT" | "HIGH" | "STANDARD"
  uiStatus: string
  resolvedDeliveryZoneId: string | null
}

export type EligibleShipmentsResponse = {
  warehouseId: string
  kpis: DeliveryManifestKpis
  items: EligibleShipmentRow[]
  total: number
  page: number
  pageSize: number
}

export type DeliveryManifestListRow = {
  id: string
  manifestDate: string
  plannedDispatchDate: string | null
  status: "DRAFT" | "LOCKED" | "DISPATCHED" | "CLOSED" | (string & {})
  shipmentCount: number
  totalCod: number
  lockedAt: string | null
  dispatchedAt: string | null
  createdAt: string
  courier: { id: string; fullName: string | null; contactPhone: string | null }
  warehouse: { id: string; name: string; governorate: string }
  deliveryZone: { id: string; name: string | null; governorate: string }
}

export type DeliveryManifestListResponse = {
  items: DeliveryManifestListRow[]
  total: number
  page: number
  pageSize: number
}

export type DeliveryManifestDispatchPreview = {
  summary: {
    manifestId: string
    status: string
    shipmentCount: number
    codTotalEgp: number
    courier: { id: string; fullName: string | null; contactPhone: string | null }
    zone: { id: string; name: string | null; governorate: string }
  }
  warnings: Array<{ code: string; message: string }>
  errors: Array<{ shipmentId?: string; code: string; message: string }>
}

export type CourierSuggestion = {
  courierId: string
  fullName: string | null
  contactPhone: string | null
  profilePhotoUrl: string
  activeLoadCount: number
  loadPercent: number
}

export type DeliveryManifestDetail = {
  id: string
  courierId: string
  warehouseId: string
  deliveryZoneId: string
  manifestDate: string
  plannedDispatchDate: string | null
  dispatcherNotes: string | null
  status: string
  totalCod: string
  shipmentCount: number
  lockedAt: string | null
  lockedByUserId: string | null
  dispatchedAt: string | null
  createdAt: string
  updatedAt: string
  targetZoneLabel: string
  courier: { id: string; fullName: string | null; contactPhone: string | null }
  warehouse: { id: string; name: string; governorate: string }
  deliveryZone: {
    id: string
    name: string | null
    governorate: string
    areaZone: string | null
  }
  shipments: Array<{
    id: string
    trackingNumber: string | null
    shipmentValue: string
    shippingFee: string
    paymentMethod: string
    status: string
    csConfirmedAt: string | null
    taskType: "DELIVERY"
    fromLabel: string
    toLabel: string
    customer: {
      id: string
      customerName: string
      addressText: string
      phonePrimary: string
    } | null
  }>
}

/** Map create/detail payload to a list row for optimistic cache updates. */
export function deliveryManifestDetailToListRow(d: DeliveryManifestDetail): DeliveryManifestListRow {
  return {
    id: d.id,
    manifestDate: d.manifestDate,
    plannedDispatchDate: d.plannedDispatchDate,
    status: d.status as DeliveryManifestListRow["status"],
    shipmentCount: d.shipmentCount,
    totalCod: Number.parseFloat(d.totalCod) || 0,
    lockedAt: d.lockedAt,
    dispatchedAt: d.dispatchedAt,
    createdAt: d.createdAt,
    courier: d.courier,
    warehouse: d.warehouse,
    deliveryZone: d.deliveryZone,
  }
}

export type LatLng = { lat: number; lng: number }

export type ManifestRouteStop = {
  order: number
  shipmentId: string
  lat: number
  lng: number
  address: string
  /** Display label (e.g. merchant name for pickup manifests). */
  label?: string
  /** Movement-manifest pickup stops: compose localized title with {@link label}. */
  labelParts?: {
    merchantName: string | null
    shipmentCount: number
  }
}

export type ManifestRouteStatus = "READY" | "FAILED" | "PENDING" | (string & {})

export type ManifestRoute = {
  manifestId: string
  status: ManifestRouteStatus
  errorMessage?: string | null
  warehouse?: (LatLng & { address?: string | null }) | null
  orderedStops?: ManifestRouteStop[]
  path?: LatLng[]
}

export type BatchManifestRoutesResponse = {
  routes: Record<string, ManifestRoute>
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

export async function getEligibleShipments(params: {
  token: string
  warehouseId: string
  page?: number
  pageSize?: number
  search?: string
  resolvedDeliveryZoneId?: string
  paymentMethod?: string
  priorityTier?: string
}): Promise<EligibleShipmentsResponse> {
  const q = qs({
    warehouseId: params.warehouseId,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
    search: params.search,
    resolvedDeliveryZoneId: params.resolvedDeliveryZoneId,
    paymentMethod: params.paymentMethod,
    priorityTier: params.priorityTier ?? "ALL",
  })
  return apiFetch<EligibleShipmentsResponse>(`/api/delivery-manifests/eligible-shipments${q}`, {
    token: params.token,
  })
}

export async function getManifestSummary(params: {
  token: string
  warehouseId: string
}): Promise<DeliveryManifestKpis> {
  const q = qs({ warehouseId: params.warehouseId })
  return apiFetch<DeliveryManifestKpis>(`/api/delivery-manifests/summary${q}`, {
    token: params.token,
  })
}

export async function listDeliveryManifests(params: {
  token: string
  warehouseId?: string
  status?: string
  fromDate?: string
  toDate?: string
  courierId?: string
  deliveryZoneId?: string
  page?: number
  pageSize?: number
}): Promise<DeliveryManifestListResponse> {
  const q = qs({
    warehouseId: params.warehouseId,
    status: params.status,
    fromDate: params.fromDate,
    toDate: params.toDate,
    courierId: params.courierId,
    deliveryZoneId: params.deliveryZoneId,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
  })
  return apiFetch<DeliveryManifestListResponse>(`/api/delivery-manifests${q}`, {
    token: params.token,
  })
}

export async function getCourierSuggestions(params: {
  token: string
  warehouseId: string
  deliveryZoneId: string
}): Promise<{ couriers: CourierSuggestion[] }> {
  const q = qs({
    warehouseId: params.warehouseId,
    deliveryZoneId: params.deliveryZoneId,
  })
  return apiFetch<{ couriers: CourierSuggestion[] }>(
    `/api/delivery-manifests/courier-suggestions${q}`,
    { token: params.token },
  )
}

export async function createDeliveryManifest(params: {
  token: string
  body: {
    warehouseId: string
    courierId: string
    shipmentIds: string[]
    dispatchDate?: string
    notes?: string
  }
}): Promise<DeliveryManifestDetail> {
  return apiFetch<DeliveryManifestDetail>(`/api/delivery-manifests`, {
    method: "POST",
    token: params.token,
    body: JSON.stringify(params.body),
  })
}

export async function lockDeliveryManifest(params: {
  token: string
  manifestId: string
}): Promise<DeliveryManifestDetail> {
  return apiFetch<DeliveryManifestDetail>(
    `/api/delivery-manifests/${encodeURIComponent(params.manifestId)}/lock`,
    { method: "POST", token: params.token },
  )
}

export async function dispatchDeliveryManifest(params: {
  token: string
  manifestId: string
  scannedOutAt?: string
}): Promise<DeliveryManifestDetail> {
  return apiFetch<DeliveryManifestDetail>(
    `/api/delivery-manifests/${encodeURIComponent(params.manifestId)}/dispatch`,
    {
      method: "POST",
      token: params.token,
      body: JSON.stringify({
        ...(params.scannedOutAt ? { scannedOutAt: params.scannedOutAt } : {}),
      }),
    },
  )
}

export async function getDispatchPreview(params: {
  token: string
  manifestId: string
}): Promise<DeliveryManifestDispatchPreview> {
  return apiFetch<DeliveryManifestDispatchPreview>(
    `/api/delivery-manifests/${encodeURIComponent(params.manifestId)}/dispatch-preview`,
    { token: params.token },
  )
}

export async function getDeliveryManifest(params: {
  token: string
  manifestId: string
}): Promise<DeliveryManifestDetail> {
  return apiFetch<DeliveryManifestDetail>(
    `/api/delivery-manifests/${encodeURIComponent(params.manifestId)}`,
    { token: params.token },
  )
}

export async function closeDeliveryManifest(params: {
  token: string
  manifestId: string
}): Promise<DeliveryManifestDetail> {
  return apiFetch<DeliveryManifestDetail>(
    `/api/delivery-manifests/${encodeURIComponent(params.manifestId)}/close`,
    { method: "POST", token: params.token },
  )
}

export async function getDeliveryManifestRoute(params: {
  token: string
  manifestId: string
}): Promise<ManifestRoute> {
  return apiFetch<ManifestRoute>(
    `/api/delivery-manifests/${encodeURIComponent(params.manifestId)}/route`,
    { token: params.token },
  )
}

export async function getDeliveryManifestRoutesBatch(params: {
  token: string
  manifestIds: string[]
}): Promise<BatchManifestRoutesResponse> {
  return apiFetch<BatchManifestRoutesResponse>(`/api/delivery-manifests/routes/batch`, {
    method: "POST",
    token: params.token,
    body: JSON.stringify({ manifestIds: params.manifestIds }),
  })
}
