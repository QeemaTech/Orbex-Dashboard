import { apiFetch } from "@/api/client"

function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue
    search.set(key, String(value))
  }
  const str = search.toString()
  return str ? `?${str}` : ""
}

export const packagingMaterialRequestStatuses = [
  "PENDING",
  "APPROVED",
  "PREPARING",
  "READY_FOR_DELIVERY",
  "DELIVERED",
  "REJECTED",
  "CANCELLED",
] as const

export type PackagingMaterialRequestStatus = (typeof packagingMaterialRequestStatuses)[number]

export type PackagingMaterialRequest = {
  id: string
  requestNumber: string
  merchantId: string
  merchantName: string | null
  status: PackagingMaterialRequestStatus
  notes: string | null
  totalEstimatedCost: string
  totalFinalCost: string | null
  createdById: string
  createdAt: string
  updatedAt: string
}

export type PackagingMaterialRequestItem = {
  id: string
  requestId: string
  packagingMaterialId: string
  packagingMaterialSku: string | null
  requestedQuantity: string
  approvedQuantity: string | null
  deliveredQuantity: string | null
  unitPriceSnapshot: string
  subtotal: string
}

export type PackagingMaterialRequestDetailsResponse = {
  request: PackagingMaterialRequest
  items: PackagingMaterialRequestItem[]
}

export type ListPackagingMaterialRequestsParams = {
  token: string
  page?: number
  pageSize?: number
  merchantId?: string
  status?: PackagingMaterialRequestStatus
}

export type ListPackagingMaterialRequestsResponse = {
  requests: PackagingMaterialRequest[]
  total: number
  page: number
  pageSize: number
}

export type CreatePackagingMaterialRequestInput = {
  merchantId?: string
  notes?: string | null
  items: Array<{
    packagingMaterialId: string
    requestedQuantity: string | number
  }>
}

export async function createPackagingMaterialRequest(params: {
  token: string
  body: CreatePackagingMaterialRequestInput
}): Promise<PackagingMaterialRequestDetailsResponse> {
  return apiFetch<PackagingMaterialRequestDetailsResponse>("/api/packaging-materials/requests", {
    method: "POST",
    token: params.token,
    body: JSON.stringify(params.body),
  })
}

export async function listPackagingMaterialRequests(
  params: ListPackagingMaterialRequestsParams,
): Promise<ListPackagingMaterialRequestsResponse> {
  const query = qs({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
    merchantId: params.merchantId,
    status: params.status,
  })
  return apiFetch<ListPackagingMaterialRequestsResponse>(
    `/api/packaging-materials/requests${query}`,
    {
      token: params.token,
    },
  )
}

export async function getPackagingMaterialRequestById(params: {
  token: string
  id: string
}): Promise<PackagingMaterialRequestDetailsResponse> {
  return apiFetch<PackagingMaterialRequestDetailsResponse>(
    `/api/packaging-materials/requests/${encodeURIComponent(params.id)}`,
    {
      token: params.token,
    },
  )
}

export async function patchPackagingMaterialRequestStatus(params: {
  token: string
  id: string
  status: PackagingMaterialRequestStatus
}): Promise<PackagingMaterialRequestDetailsResponse> {
  return apiFetch<PackagingMaterialRequestDetailsResponse>(
    `/api/packaging-materials/requests/${encodeURIComponent(params.id)}/status`,
    {
      method: "PATCH",
      token: params.token,
      body: JSON.stringify({ status: params.status }),
    },
  )
}

