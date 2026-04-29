import { apiFetch } from "@/api/client"

export type RegionCatalogRow = {
  id: string
  name: string
  code: string
}

export type DeliveryZoneCourierSummary = {
  id: string
  fullName: string | null
  contactPhone: string | null
}

export type DeliveryZoneRow = {
  id: string
  name: string | null
  latitude: string
  longitude: string
  radiusMeters: number | null
  governorate: string
  courierCommissionFee?: string
  areaZone: string | null
  regionId: string | null
  region: RegionCatalogRow | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  courierIds: string[]
  /** Populated by API with name/phone; falls back to ids if missing (older servers). */
  couriers?: DeliveryZoneCourierSummary[]
  geometryType?: "CIRCLE" | "POLYGON"
  polygonGeoJson?: unknown | null
}

export type CourierOptionRow = {
  id: string
  fullName: string | null
  contactPhone: string | null
  /** Set when courier is already linked to a geo zone (may be this zone or another). */
  assignedDeliveryZoneId: string | null
  assignedZoneLabel: string | null
}

function qs(params: Record<string, string | boolean | undefined>): string {
  const u = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue
    u.set(key, String(value))
  }
  const query = u.toString()
  return query ? `?${query}` : ""
}

export async function listRegionsCatalog(token: string): Promise<{
  regions: RegionCatalogRow[]
}> {
  return apiFetch("/api/regions", { token })
}

export async function listDeliveryZones(
  token: string,
  params?: {
    governorate?: string
    regionId?: string
    isActive?: boolean
  },
): Promise<{ zones: DeliveryZoneRow[] }> {
  const query = qs({
    governorate: params?.governorate,
    regionId: params?.regionId,
    isActive:
      params?.isActive === true
        ? "true"
        : params?.isActive === false
          ? "false"
          : undefined,
  })
  return apiFetch(`/api/delivery-zones${query}`, { token })
}

export async function getDeliveryZone(
  token: string,
  id: string,
): Promise<{ zone: DeliveryZoneRow }> {
  return apiFetch(`/api/delivery-zones/${encodeURIComponent(id)}`, { token })
}

export async function listDeliveryZoneCourierOptions(token: string): Promise<{
  couriers: CourierOptionRow[]
}> {
  return apiFetch("/api/delivery-zones/courier-options", { token })
}

export type CreateDeliveryZoneBody = {
  name?: string | null
  geometryType?: "CIRCLE" | "POLYGON"
  polygonGeoJson?: unknown | null
  latitude: number
  longitude: number
  radiusMeters?: number | null
  governorate: string
  courierCommissionFee?: number
  areaZone?: string | null
  regionId?: string | null
  courierIds: string[]
  isActive?: boolean
}

export async function createDeliveryZone(
  token: string,
  body: CreateDeliveryZoneBody,
): Promise<{ zone: DeliveryZoneRow }> {
  return apiFetch("/api/delivery-zones", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  })
}

export type PatchDeliveryZoneBody = {
  name?: string | null
  geometryType?: "CIRCLE" | "POLYGON"
  polygonGeoJson?: unknown | null
  latitude?: number
  longitude?: number
  radiusMeters?: number | null
  governorate?: string
  courierCommissionFee?: number
  areaZone?: string | null
  regionId?: string | null
  courierIds?: string[]
  isActive?: boolean
}

export async function patchDeliveryZone(
  token: string,
  id: string,
  body: PatchDeliveryZoneBody,
): Promise<{ zone: DeliveryZoneRow }> {
  return apiFetch(`/api/delivery-zones/${encodeURIComponent(id)}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(body),
  })
}

export async function deactivateDeliveryZone(
  token: string,
  id: string,
): Promise<void> {
  await apiFetch<undefined>(`/api/delivery-zones/${encodeURIComponent(id)}`, {
    method: "DELETE",
    token,
  })
}

/** Permanently delete zone; courier links are removed (couriers become unassigned). */
export async function deleteDeliveryZonePermanent(
  token: string,
  id: string,
): Promise<void> {
  await apiFetch<undefined>(
    `/api/delivery-zones/${encodeURIComponent(id)}/permanent`,
    {
      method: "DELETE",
      token,
    },
  )
}

export type DeliveryZoneLinkedWarehouse = {
  id: string
  name: string
  governorate: string
  zone: string | null
  isActive: boolean
}

export type DeliveryZoneWarehouseLinks = {
  deliveryWarehouseIds: string[]
  pickupWarehouseIds: string[]
  deliveryWarehouses: DeliveryZoneLinkedWarehouse[]
  pickupWarehouses: DeliveryZoneLinkedWarehouse[]
}

export async function getDeliveryZoneWarehouseLinks(
  token: string,
  zoneId: string,
): Promise<DeliveryZoneWarehouseLinks> {
  return apiFetch(`/api/delivery-zones/${encodeURIComponent(zoneId)}/warehouses`, {
    token,
  })
}

export async function setDeliveryZoneWarehouseLinks(params: {
  token: string
  zoneId: string
  deliveryWarehouseIds: string[]
  pickupWarehouseIds: string[]
}): Promise<DeliveryZoneWarehouseLinks> {
  return apiFetch(`/api/delivery-zones/${encodeURIComponent(params.zoneId)}/warehouses`, {
    method: "PUT",
    token: params.token,
    body: JSON.stringify({
      deliveryWarehouseIds: params.deliveryWarehouseIds,
      pickupWarehouseIds: params.pickupWarehouseIds,
    }),
  })
}
