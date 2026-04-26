import { apiFetch, apiFetchText, apiUrl } from "@/api/client"
import type { ListShipmentsParams, ShipmentOrderRow } from "@/api/merchant-orders-api"

/** `GET /api/shipments/:id/label` — thermal label payload. */
export type ShipmentLabelResponse = {
  trackingNumber: string
  merchantName: string
  customerName: string
  phone: string
  address: string
  governorate: string
  notes: string
  codAmount: number | null
  itemsCount: number
  createdAt: string
  warehouseName: string
}

/** `GET /api/shipments/:id/label/raw` — raw SBPL for SATO WS408. */
export type ShipmentLabelRaw = ShipmentLabelResponse & {
  sbpl: string
}

export type PrintLabelRequest = {
  shipmentId: string
  labelRaw?: string
}

export type PrintLabelResponse = {
  success: boolean
  message: string
}

export type ShipmentsListResponse = {
  shipments: ShipmentOrderRow[]
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

/** Delivery units (customer shipments): `GET /api/shipments` (same filters as merchant-order list). */
export async function listShipments(
  p: ListShipmentsParams,
): Promise<ShipmentsListResponse> {
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
    assignedWarehouseId: p.assignedWarehouseId,
    expand: p.expand ?? "merchant,courier",
  })
  return apiFetch<ShipmentsListResponse>(`/api/shipments${query}`, {
    token: p.token,
  })
}

/** Single delivery unit: `GET /api/shipments/:id`. */
export async function getShipmentById(p: {
  token: string
  shipmentId: string
}): Promise<ShipmentOrderRow> {
  return apiFetch<ShipmentOrderRow>(
    `/api/shipments/${encodeURIComponent(p.shipmentId)}`,
    { token: p.token },
  )
}

export async function uploadShipmentPaymentProof(p: {
  token: string
  shipmentId: string
  paymentMethod: "INSTAPAY" | "E_WALLET"
  file: File
}): Promise<{
  id: string
  shipmentId: string
  paymentMethod: string
  imageUrl: string
  createdAt: string
}> {
  const formData = new FormData()
  formData.append("file", p.file)
  formData.append("paymentMethod", p.paymentMethod)

  const response = await fetch(
    apiUrl(`/api/shipments/${encodeURIComponent(p.shipmentId)}/payment-proof`),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${p.token}`,
      },
      body: formData,
    },
  )

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: "Upload failed" }))
    const msg =
      typeof errorBody === "object" &&
      errorBody !== null &&
      "error" in errorBody &&
      typeof (errorBody as { error?: unknown }).error === "string"
        ? (errorBody as { error: string }).error
        : typeof errorBody === "object" &&
            errorBody !== null &&
            "message" in errorBody &&
            typeof (errorBody as { message?: unknown }).message === "string"
          ? (errorBody as { message: string }).message
          : "Upload failed"
    throw new Error(msg)
  }

  return (await response.json()) as {
    id: string
    shipmentId: string
    paymentMethod: string
    imageUrl: string
    createdAt: string
  }
}

/** Pending-label queue row: label JSON plus shipment id for raw print + mark-printed. */
export type PendingLabelShipmentRow = ShipmentLabelResponse & { id: string }

/** Print-only label fields: `GET /api/shipments/:id/label`. */
export async function getShipmentLabel(p: {
  token: string
  shipmentId: string
}): Promise<ShipmentLabelResponse> {
  return apiFetch<ShipmentLabelResponse>(
    `/api/shipments/${encodeURIComponent(p.shipmentId)}/label`,
    { token: p.token },
  )
}

/** Raw SBPL label: `GET /api/shipments/:id/label/raw`. */
export async function getShipmentLabelRaw(p: {
  token: string
  shipmentId: string
}): Promise<ShipmentLabelRaw> {
  // Backend returns raw SBPL as plain text (not JSON). Fetch the normal label JSON
  // for metadata, then attach the raw SBPL.
  const [meta, sbpl] = await Promise.all([
    apiFetch<ShipmentLabelResponse>(
      `/api/shipments/${encodeURIComponent(p.shipmentId)}/label`,
      { token: p.token },
    ),
    apiFetchText(
    `/api/shipments/${encodeURIComponent(p.shipmentId)}/label/raw`,
    { token: p.token },
    ),
  ])

  return { ...meta, sbpl }
}

/** Pending labels for warehouse: `GET /api/shipments/pending-labels/:warehouseId`. */
export async function getPendingLabelShipments(p: {
  token: string
  warehouseId: string
}): Promise<{ shipments: PendingLabelShipmentRow[] }> {
  return apiFetch<{ shipments: PendingLabelShipmentRow[] }>(
    `/api/shipments/pending-labels/${encodeURIComponent(p.warehouseId)}`,
    { token: p.token },
  )
}

/**
 * `POST /api/shipments/generate-delivery-link` — body `{ trackingNumber }` (not shipment UUID).
 * Returns `{ token }`; builds the customer-facing `/delivery-proof/:token` URL (rotates prior token).
 */
export async function generateShipmentDeliveryProofLink(p: {
  token: string
  trackingNumber: string
}): Promise<{ link: string }> {
  const { token: proofToken } = await apiFetch<{ token: string }>(
    `/api/shipments/generate-delivery-link`,
    {
      method: "POST",
      token: p.token,
      body: JSON.stringify({ trackingNumber: p.trackingNumber.trim() }),
    },
  )
  const fromEnv = String(import.meta.env.VITE_PUBLIC_TRACKING_ORIGIN ?? "").trim()
  const origin =
    fromEnv ||
    (typeof window !== "undefined" ? window.location.origin : "") ||
    ""
  const base = origin.replace(/\/$/, "")
  return { link: `${base}/delivery-proof/${encodeURIComponent(proofToken)}` }
}

/** Mark label as printed: `POST /api/shipments/:id/label/printed`. */
export async function markShipmentLabelPrinted(p: {
  token: string
  shipmentId: string
}): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(
    `/api/shipments/${encodeURIComponent(p.shipmentId)}/label/printed`,
    { token: p.token, method: "POST" },
  )
}

/** New Print Flow (SBPL / Print Agent आधारित): `POST /api/print-label`. */
export async function postPrintLabel(p: {
  token: string
  body: PrintLabelRequest
}): Promise<PrintLabelResponse> {
  return apiFetch<PrintLabelResponse>("/api/print-label", {
    method: "POST",
    token: p.token,
    body: JSON.stringify(p.body),
  })
}

export type ShipmentPlannedTaskType = "DELIVERY" | "TRANSFER" | "RETURN_TO_MERCHANT"

export type CreateShipmentPlannedTaskBody = {
  type: ShipmentPlannedTaskType
  assignedCourierId?: string | null
  toWarehouseId?: string | null
}

/** `POST /api/shipments/:id/tasks` — `:id` is the shipment line id (`Shipment.id`). */
export async function createShipmentPlannedTask(p: {
  token: string
  shipmentId: string
  body: CreateShipmentPlannedTaskBody
}): Promise<{
  taskId: string
  shipmentId: string
  type: string
  status: string
}> {
  const body: Record<string, unknown> = {
    type: p.body.type,
  }
  if (p.body.assignedCourierId) {
    body.assignedCourierId = p.body.assignedCourierId
  }
  if (p.body.toWarehouseId) {
    body.toWarehouseId = p.body.toWarehouseId
  }
  return apiFetch<{
    taskId: string
    shipmentId: string
    type: string
    status: string
  }>(
    `/api/shipments/${encodeURIComponent(p.shipmentId)}/tasks`,
    {
      method: "POST",
      token: p.token,
      body: JSON.stringify(body),
    },
  )
}
