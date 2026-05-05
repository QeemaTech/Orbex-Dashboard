import { apiFetch, apiFetchText, apiUrl } from "@/api/client"
import type { ManifestRoute } from "@/api/delivery-manifests-api"
import type {
  CsShipmentRow,
  ListShipmentsParams,
  ShipmentOrderRow,
} from "@/api/merchant-orders-api"

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
  pickupCourierId?: string | null
  toWarehouseId?: string | null
  transferDate?: string | null
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
  manifestId?: string | null
}> {
  const body: Record<string, unknown> = {
    type: p.body.type,
  }
  if (p.body.assignedCourierId) {
    body.assignedCourierId = p.body.assignedCourierId
  }
  if (p.body.pickupCourierId) {
    body.pickupCourierId = p.body.pickupCourierId
  }
  if (p.body.toWarehouseId) {
    body.toWarehouseId = p.body.toWarehouseId
  }
  if (p.body.transferDate) {
    body.transferDate = p.body.transferDate
  }
  return apiFetch<{
    taskId: string
    shipmentId: string
    type: string
    status: string
    manifestId?: string | null
  }>(
    `/api/shipments/${encodeURIComponent(p.shipmentId)}/tasks`,
    {
      method: "POST",
      token: p.token,
      body: JSON.stringify(body),
    },
  )
}

export async function confirmShipmentCustomerLocation(p: {
  token: string
  lineId: string
  customerLat: number | string
  customerLng: number | string
  addressText?: string
}): Promise<unknown> {
  return apiFetch<unknown>(
    `/api/shipments/${encodeURIComponent(p.lineId)}/confirm-customer-location`,
    {
      method: "POST",
      token: p.token,
      body: JSON.stringify({
        customerLat: p.customerLat,
        customerLng: p.customerLng,
        ...(p.addressText !== undefined ? { addressText: p.addressText } : {}),
      }),
    },
  )
}

export type WarehouseMovementManifestStatus = "DRAFT" | "LOCKED" | "DISPATCHED" | "CLOSED"

export type MovementManifestTaskSummary = {
  merchantPickupTasks: number
  transferTasks: number
  returnToMerchantTasks: number
}

export async function listWarehouseMovementManifests(p: {
  token: string
  warehouseId?: string
  status?: WarehouseMovementManifestStatus
  date?: string
}): Promise<{
  manifests: Array<{
    id: string
    status: WarehouseMovementManifestStatus
    transferDate: string | null
    fromWarehouseId: string
    toWarehouseId: string | null
    assignedPickupCourierId: string
    createdAt: string
    taskCount: number
    taskSummary: MovementManifestTaskSummary
  }>
}> {
  const sp = new URLSearchParams()
  if (p.warehouseId) sp.set("warehouseId", p.warehouseId)
  if (p.status) sp.set("status", p.status)
  if (p.date) sp.set("date", p.date)
  return apiFetch(`/api/shipments/movement-manifests?${sp.toString()}`, { token: p.token })
}

export type MovementManifestUnifiedTask =
  | {
      kind: "PICKUP_TASK"
      id: string
      taskType: "PICKUP"
      status: string
      fromLabel: string
      toLabel: string
      merchantOrderId: string
      merchantId: string
      pickupAddress: string
      latitude: number | null
      longitude: number | null
      transferDate: string
      merchantOrder: {
        id: string
        transferStatus: string
        shipmentCount: number
      } | null
      from: { merchant: { id: string; displayName: string } | null }
      to: { warehouse: { id: string; name: string; governorate: string } | null }
    }
  | {
      kind: "SHIPMENT_TASK"
      lineId: string
      shipmentId: string
      shipmentTaskId: string
      taskType: string
      taskStatus: string
      trackingNumber: string | null
      shipmentStatus: string
      fromLabel: string
      toLabel: string
      from: { warehouse: { id: string; name: string; governorate: string } | null }
      to: {
        warehouse: { id: string; name: string; governorate: string } | null
        merchant: { id: string; displayName: string } | null
      }
    }
  | {
      kind: "RETURN_TO_MERCHANT_GROUP"
      /** Group identity: one return group per merchant order. */
      merchantOrderId: string
      merchantId: string
      merchant: {
        id: string
        displayName: string
        pickupAddressText: string | null
      }
      fromLabel: string
      toLabel: string
      shipments: Array<{
        lineId: string
        shipmentId: string
        shipmentTaskId: string
        trackingNumber: string | null
        shipmentStatus: string
        taskStatus: string
      }>
    }

export async function getWarehouseMovementManifestById(p: {
  token: string
  manifestId: string
}): Promise<{
  id: string
  status: WarehouseMovementManifestStatus
  transferDate: string | null
  fromWarehouseId: string
  toWarehouseId: string | null
  assignedPickupCourierId: string
  fromWarehouse: { id: string; name: string; governorate: string } | null
  toWarehouse: { id: string; name: string; governorate: string } | null
  pickupCourier: { id: string; fullName: string | null; contactPhone: string | null } | null
  createdAt: string
  lockedAt: string | null
  lockedById: string | null
  dispatchedAt: string | null
  dispatchedById: string | null
  closedAt: string | null
  closedById: string | null
  taskSummary: MovementManifestTaskSummary
  tasks: MovementManifestUnifiedTask[]
  lines: Array<{
    id: string
    shipmentId: string
    shipmentTaskId: string
    trackingNumber: string | null
    shipmentStatus: string
    taskType: string
    taskStatus: string
    fromWarehouseId: string | null
    toWarehouseId: string | null
    fromWarehouse: { id: string; name: string; governorate: string } | null
    toWarehouse: { id: string; name: string; governorate: string } | null
    returnToMerchant: { id: string; displayName: string } | null
  }>
  pickupTasks: Array<{
    id: string
    merchantOrderId: string
    merchantId: string
    pickupAddress: string
    latitude: number | null
    longitude: number | null
    transferDate: string
    status: string
    warehouse: { id: string; name: string; governorate: string } | null
    merchant: { id: string; displayName: string } | null
    merchantOrder: {
      id: string
      transferStatus: string
      shipmentCount: number
    } | null
  }>
}> {
  return apiFetch(`/api/shipments/movement-manifests/${encodeURIComponent(p.manifestId)}`, {
    token: p.token,
  })
}

export async function getWarehouseMovementManifestRoutePreview(p: {
  token: string
  manifestId: string
}): Promise<ManifestRoute> {
  return apiFetch(
    `/api/shipments/movement-manifests/${encodeURIComponent(p.manifestId)}/route-preview`,
    { token: p.token },
  )
}

export async function createWarehouseMovementManifest(p: {
  token: string
  body: {
    transferDate: string
    fromWarehouseId: string
    toWarehouseId?: string | null
    pickupCourierId: string
    shipmentTaskIds: string[]
  }
}): Promise<{ manifestId: string; status: WarehouseMovementManifestStatus }> {
  return apiFetch("/api/shipments/movement-manifests", {
    method: "POST",
    token: p.token,
    body: JSON.stringify(p.body),
  })
}

export async function patchWarehouseMovementManifestStatus(p: {
  token: string
  manifestId: string
  status: Exclude<WarehouseMovementManifestStatus, "DRAFT">
}): Promise<{ manifestId: string; status: WarehouseMovementManifestStatus }> {
  return apiFetch(`/api/shipments/movement-manifests/${encodeURIComponent(p.manifestId)}/status`, {
    method: "PATCH",
    token: p.token,
    body: JSON.stringify({ status: p.status }),
  })
}

export async function patchShipmentFields(p: {
  token: string
  shipmentId: string
  addressText?: string
  notes?: string | null
  customerLat?: string
  customerLng?: string
}): Promise<CsShipmentRow> {
  return apiFetch<CsShipmentRow>(`/api/shipments/${encodeURIComponent(p.shipmentId)}`, {
    method: "PATCH",
    token: p.token,
    body: JSON.stringify({
      ...(p.addressText !== undefined ? { addressText: p.addressText } : {}),
      ...(p.notes !== undefined ? { notes: p.notes } : {}),
      ...(p.customerLat !== undefined ? { customerLat: p.customerLat } : {}),
      ...(p.customerLng !== undefined ? { customerLng: p.customerLng } : {}),
    }),
  })
}

export async function patchShipmentAssignedWarehouse(params: {
  token: string
  shipmentId: string
  assignedWarehouseId: string | null
}): Promise<CsShipmentRow> {
  return apiFetch<CsShipmentRow>(
    `/api/shipments/${encodeURIComponent(params.shipmentId)}/warehouse`,
    {
      method: "PATCH",
      token: params.token,
      body: JSON.stringify({
        assignedWarehouseId: params.assignedWarehouseId,
      }),
    },
  )
}
