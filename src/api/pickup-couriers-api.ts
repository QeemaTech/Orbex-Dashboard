import { apiFetch } from "@/api/client"

export type PickupCourierRow = {
  id: string
  fullName: string
  contactPhone: string
  nationalId: string | null
  assignedWarehouseId: string
  assignedWarehouse: { id: string; name: string } | null
  vehicleType: string
  vehiclePlateNumber: string
  isActive: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
}

export function listPickupCouriers(params: {
  token: string
  page?: number
  pageSize?: number
  search?: string
  warehouseId?: string
  isActive?: boolean
}): Promise<{ pickupCouriers: PickupCourierRow[]; total: number; page: number; pageSize: number }> {
  const sp = new URLSearchParams()
  if (params.page != null) sp.set("page", String(params.page))
  if (params.pageSize != null) sp.set("pageSize", String(params.pageSize))
  if (params.search?.trim()) sp.set("search", params.search.trim())
  if (params.warehouseId) sp.set("warehouseId", params.warehouseId)
  if (params.isActive !== undefined) sp.set("isActive", String(params.isActive))
  const qs = sp.toString()
  return apiFetch(`/api/pickup-couriers${qs ? `?${qs}` : ""}`, { token: params.token })
}

export function createPickupCourier(params: {
  token: string
  body: {
    fullName: string
    contactPhone: string
    nationalId?: string | null
    assignedWarehouseId: string
    vehicleType: string
    vehiclePlateNumber: string
    isActive?: boolean
    notes?: string | null
  }
}): Promise<PickupCourierRow> {
  return apiFetch("/api/pickup-couriers", {
    method: "POST",
    token: params.token,
    body: JSON.stringify(params.body),
  })
}

export function updatePickupCourier(params: {
  token: string
  id: string
  body: Partial<{
    fullName: string
    contactPhone: string
    nationalId: string | null
    assignedWarehouseId: string
    vehicleType: string
    vehiclePlateNumber: string
    isActive: boolean
    notes: string | null
  }>
}): Promise<PickupCourierRow> {
  return apiFetch(`/api/pickup-couriers/${encodeURIComponent(params.id)}`, {
    method: "PATCH",
    token: params.token,
    body: JSON.stringify(params.body),
  })
}
