import { apiFetch } from "@/api/client"

const PICKUP_TASKS_MIN_PAGE_SIZE = 1
const PICKUP_TASKS_MAX_PAGE_SIZE = 100

export type PickupTaskStatus = "PENDING" | "ASSIGNED" | "PICKED_UP" | "COMPLETED" | "CANCELLED"

export type PickupTaskRow = {
  id: string
  merchantOrderId: string
  merchantId: string
  warehouseId: string
  pickupAddress: string
  latitude: number | null
  longitude: number | null
  transferDate: string
  assignedCourierId: string | null
  status: PickupTaskStatus
  manifestId: string | null
  createdAt: string
  updatedAt: string
  merchant: { id: string; displayName: string } | null
  warehouse: { id: string; name: string } | null
  assignedCourier: { id: string; fullName: string } | null
}

export function listPickupTasks(params: {
  token: string
  page?: number
  pageSize?: number
  status?: PickupTaskStatus
  warehouseId?: string
  courierId?: string
  manifestId?: string
  merchantOrderId?: string
  transferDateFrom?: string
  transferDateTo?: string
}): Promise<{ pickupTasks: PickupTaskRow[]; total: number; page: number; pageSize: number }> {
  const sp = new URLSearchParams()
  if (params.page != null) sp.set("page", String(params.page))
  if (params.pageSize != null) {
    const boundedPageSize = Math.min(
      PICKUP_TASKS_MAX_PAGE_SIZE,
      Math.max(PICKUP_TASKS_MIN_PAGE_SIZE, Math.trunc(params.pageSize)),
    )
    sp.set("pageSize", String(boundedPageSize))
  }
  if (params.status) sp.set("status", params.status)
  if (params.warehouseId) sp.set("warehouseId", params.warehouseId)
  if (params.courierId) sp.set("courierId", params.courierId)
  if (params.manifestId) sp.set("manifestId", params.manifestId)
  if (params.merchantOrderId) sp.set("merchantOrderId", params.merchantOrderId)
  if (params.transferDateFrom) sp.set("transferDateFrom", params.transferDateFrom)
  if (params.transferDateTo) sp.set("transferDateTo", params.transferDateTo)
  const qs = sp.toString()
  return apiFetch(`/api/pickup-tasks${qs ? `?${qs}` : ""}`, { token: params.token })
}

export function getPickupTask(params: {
  token: string
  id: string
}): Promise<PickupTaskRow> {
  return apiFetch(`/api/pickup-tasks/${encodeURIComponent(params.id)}`, {
    token: params.token,
  })
}

export function createPickupTask(params: {
  token: string
  body: {
    merchantOrderId: string
    transferDate: string
  }
}): Promise<PickupTaskRow> {
  return apiFetch("/api/pickup-tasks", {
    method: "POST",
    token: params.token,
    body: JSON.stringify(params.body),
  })
}

export function updatePickupTask(params: {
  token: string
  id: string
  body: Partial<{
    transferDate: string
    pickupAddress: string
    latitude: number
    longitude: number
  }>
}): Promise<PickupTaskRow> {
  return apiFetch(`/api/pickup-tasks/${encodeURIComponent(params.id)}`, {
    method: "PATCH",
    token: params.token,
    body: JSON.stringify(params.body),
  })
}

export function assignCourierToPickupTask(params: {
  token: string
  id: string
  courierId: string
}): Promise<PickupTaskRow> {
  return apiFetch(`/api/pickup-tasks/${encodeURIComponent(params.id)}/assign-courier`, {
    method: "PATCH",
    token: params.token,
    body: JSON.stringify({ courierId: params.courierId }),
  })
}

export function markPickupTaskPickedUp(params: {
  token: string
  id: string
}): Promise<PickupTaskRow> {
  return apiFetch(`/api/pickup-tasks/${encodeURIComponent(params.id)}/picked-up`, {
    method: "PATCH",
    token: params.token,
  })
}

export function completePickupTask(params: {
  token: string
  id: string
}): Promise<PickupTaskRow> {
  return apiFetch(`/api/pickup-tasks/${encodeURIComponent(params.id)}/complete`, {
    method: "PATCH",
    token: params.token,
  })
}

export function cancelPickupTask(params: {
  token: string
  id: string
}): Promise<PickupTaskRow> {
  return apiFetch(`/api/pickup-tasks/${encodeURIComponent(params.id)}/cancel`, {
    method: "PATCH",
    token: params.token,
  })
}

export function addPickupTaskToManifest(params: {
  token: string
  id: string
}): Promise<PickupTaskRow> {
  return apiFetch(`/api/pickup-tasks/${encodeURIComponent(params.id)}/add-to-manifest`, {
    method: "POST",
    token: params.token,
    body: JSON.stringify({}),
  })
}

export function getPickupTasksByManifest(params: {
  token: string
  manifestId: string
}): Promise<PickupTaskRow[]> {
  return apiFetch(`/api/pickup-tasks/manifest/${encodeURIComponent(params.manifestId)}`, {
    token: params.token,
  })
}

export function getPickupTaskByMerchantOrder(params: {
  token: string
  merchantOrderId: string
}): Promise<PickupTaskRow | null> {
  return apiFetch(`/api/pickup-tasks/by-merchant-order/${encodeURIComponent(params.merchantOrderId)}`, {
    token: params.token,
  })
}