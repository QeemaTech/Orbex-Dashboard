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

export type PackagingMaterialRequestPaymentStatus = "UNPAID" | "PAID"

export const packagingMaterialRequestPaymentMethods = ["CASH", "INSTAPAY", "VISA"] as const

export type PackagingMaterialRequestPaymentMethod =
  (typeof packagingMaterialRequestPaymentMethods)[number]

export type PackagingMaterialRequest = {
  id: string
  requestNumber: string
  merchantId: string
  merchantName: string | null
  status: PackagingMaterialRequestStatus
  allowedNextStatuses?: PackagingMaterialRequestStatus[]
  notes: string | null
  totalEstimatedCost: string
  totalFinalCost: string | null
  createdById: string
  createdAt: string
  updatedAt: string
  paymentStatus?: PackagingMaterialRequestPaymentStatus
  paymentMethod?: PackagingMaterialRequestPaymentMethod | null
  paymentNotes?: string | null
  paymentRecordedAt?: string | null
  collectedAmount?: string
  paymentRecordedById?: string | null
  deliveredById?: string | null
  deliveredAt?: string | null
  receiverName?: string | null
  receiverNotes?: string | null
  proofAttachmentUrl?: string | null
  linkedMerchantOrderCount?: number
  linkedMerchantOrderIds?: string[]
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
  allowedNextStatuses?: PackagingMaterialRequestStatus[]
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

export type ApprovePackagingMaterialRequestLineInput = {
  itemId: string
  approvedQuantity: string | number
}

export async function approvePackagingMaterialRequestWithLines(params: {
  token: string
  id: string
  items: ApprovePackagingMaterialRequestLineInput[]
}): Promise<PackagingMaterialRequestDetailsResponse> {
  return apiFetch<PackagingMaterialRequestDetailsResponse>(
    `/api/packaging-materials/requests/${encodeURIComponent(params.id)}/approve`,
    {
      method: "POST",
      token: params.token,
      body: JSON.stringify({ items: params.items }),
    },
  )
}

export type DeliverPackagingMaterialRequestLineInput = {
  itemId: string
  deliveredQuantity: string | number
}

export async function deliverPackagingMaterialRequestWithDetails(params: {
  token: string
  id: string
  receiverName?: string | null
  receiverNotes?: string | null
  proofAttachmentUrl?: string | null
  items?: DeliverPackagingMaterialRequestLineInput[]
  deliveryPayment?: {
    paymentMethod: PackagingMaterialRequestPaymentMethod
    collectedAmount?: string | number
    notes?: string | null
  }
}): Promise<PackagingMaterialRequestDetailsResponse> {
  const body: Record<string, unknown> = {
    receiverName: params.receiverName ?? null,
    receiverNotes: params.receiverNotes ?? null,
    proofAttachmentUrl: params.proofAttachmentUrl ?? null,
  }
  if (params.items && params.items.length > 0) {
    body.items = params.items
  }
  if (params.deliveryPayment) {
    body.deliveryPayment = params.deliveryPayment
  }
  return apiFetch<PackagingMaterialRequestDetailsResponse>(
    `/api/packaging-materials/requests/${encodeURIComponent(params.id)}/deliver`,
    {
      method: "POST",
      token: params.token,
      body: JSON.stringify(body),
    },
  )
}

export async function patchPackagingMaterialRequestPayment(params: {
  token: string
  id: string
  collectedAmount: string | number
  paymentMethod: PackagingMaterialRequestPaymentMethod
  notes?: string | null
}): Promise<PackagingMaterialRequestDetailsResponse> {
  return apiFetch<PackagingMaterialRequestDetailsResponse>(
    `/api/packaging-materials/requests/${encodeURIComponent(params.id)}/payment`,
    {
      method: "PATCH",
      token: params.token,
      body: JSON.stringify({
        collectedAmount: params.collectedAmount,
        paymentMethod: params.paymentMethod,
        notes: params.notes ?? null,
      }),
    },
  )
}

