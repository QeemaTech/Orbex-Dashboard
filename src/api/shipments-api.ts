import { apiFetch } from "@/api/client"
import { extractShipmentLocation } from "@/features/customer-service/lib/location"

export type ShipmentListResponse = {
  shipments: CsShipmentRow[]
  total: number
  page: number
  pageSize: number
}

export type CsMerchant = {
  id: string
  displayName: string
  businessName: string
}

export type CsCourier = {
  id: string
  fullName: string | null
  userId: string
  contactPhone: string | null
}

export type CsShipmentRow = {
  id: string
  merchantId: string
  assignedCourierId: string | null
  trackingNumber: string | null
  customerName: string
  phonePrimary: string
  phoneSecondary: string | null
  addressText: string
  notes?: string | null
  locationText?: string
  locationLink?: string | null
  addressConfirmed?: boolean
  customerLat?: string | null
  customerLng?: string | null
  customerLocationReceivedAt?: string | null
  shipmentValue: string
  shippingFee: string
  paymentMethod: string
  productType: string
  currentStatus: string
  merchant?: CsMerchant
  courier?: CsCourier | null
  createdAt: string
  updatedAt: string
  statusEvents?: CsShipmentStatusEvent[]
}

export type CsShipmentStatusEvent = {
  id: string
  shipmentId: string
  fromStatus: string | null
  toStatus: string
  receivedByCustomer: boolean | null
  paymentCollected: boolean | null
  note: string | null
  actorUserId: string | null
  courierLat: string | null
  courierLng: string | null
  createdAt: string
}

export type ListShipmentsParams = {
  token: string
  page?: number
  pageSize?: number
  merchantId?: string
  merchantName?: string
  assignedCourierId?: string
  courierName?: string
  unassignedOnly?: boolean
  regionId?: string
  regionName?: string
  phoneSearch?: string
  trackingNumber?: string
  customerName?: string
  currentStatus?: string
  currentStatusIn?: string[]
  createdFrom?: string
  createdTo?: string
  overdueOnly?: boolean
  expand?: string
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

export async function listShipments(
  p: ListShipmentsParams,
): Promise<ShipmentListResponse> {
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
    currentStatus: p.currentStatus,
    currentStatusIn:
      p.currentStatusIn && p.currentStatusIn.length > 0
        ? p.currentStatusIn.join(",")
        : undefined,
    createdFrom: p.createdFrom,
    createdTo: p.createdTo,
    overdueOnly: p.overdueOnly ? "true" : undefined,
    expand: p.expand ?? "merchant,courier",
  })
  const data = await apiFetch<ShipmentListResponse>(`/api/shipments${query}`, {
    token: p.token,
  })
  return {
    ...data,
    shipments: data.shipments.map((s) => {
      const location = extractShipmentLocation(s.notes)
      return {
        ...s,
        locationText: location.locationText,
        locationLink: location.locationLink,
      }
    }),
  }
}

export async function getShipmentById(params: {
  token: string
  shipmentId: string
  includeEvents?: boolean
}): Promise<CsShipmentRow> {
  const query = qs({
    expand: "merchant,courier",
    includeEvents: params.includeEvents ? "true" : undefined,
  })
  const row = await apiFetch<CsShipmentRow>(
    `/api/shipments/${params.shipmentId}${query}`,
    { token: params.token },
  )
  const location = extractShipmentLocation(row.notes)
  return {
    ...row,
    locationText: location.locationText,
    locationLink: location.locationLink,
  }
}

export type DashboardKpisResponse = {
  totals: {
    totalShipments: number
    delivered: number
    rejected: number
    postponed: number
    pendingAssignment: number
    inProgress: number
  }
  statusDistribution: Array<{ status: string; value: number }>
  shipmentsOverTime: Array<{ date: string; count: number }>
  courierWorkload: Array<{
    courierId: string
    courierName: string | null
    assignedCount: number
  }>
  recentShipments: CsShipmentRow[]
}

export async function getDashboardKpis(
  p: Omit<ListShipmentsParams, "page" | "pageSize" | "expand"> & {
    trendDays?: number
    recentTake?: number
  },
): Promise<DashboardKpisResponse> {
  const query = qs({
    merchantId: p.merchantId,
    merchantName: p.merchantName,
    assignedCourierId: p.assignedCourierId,
    courierName: p.courierName,
    regionId: p.regionId,
    regionName: p.regionName,
    trackingNumber: p.trackingNumber,
    customerName: p.customerName,
    phoneSearch: p.phoneSearch,
    currentStatus: p.currentStatus,
    currentStatusIn:
      p.currentStatusIn && p.currentStatusIn.length > 0
        ? p.currentStatusIn.join(",")
        : undefined,
    createdFrom: p.createdFrom,
    createdTo: p.createdTo,
    overdueOnly: p.overdueOnly ? "true" : undefined,
    trendDays: p.trendDays,
    recentTake: p.recentTake,
  })
  return apiFetch<DashboardKpisResponse>(`/api/shipments/dashboard/kpis${query}`, {
    token: p.token,
  })
}

export type TimelineEventRow = {
  id: string
  shipmentId: string
  fromStatus: string | null
  toStatus: string
  note: string | null
  actorUserId: string | null
  createdAt: string
  shipment: {
    id: string
    trackingNumber: string | null
    customerName: string
    phonePrimary: string
    currentStatus: string
    assignedCourierId: string | null
    createdAt: string
  }
}

export type TimelineResponse = {
  events: TimelineEventRow[]
  total: number
  page: number
  pageSize: number
}

export async function listShipmentTimeline(
  p: ListShipmentsParams,
): Promise<TimelineResponse> {
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
    trackingNumber: p.trackingNumber,
    customerName: p.customerName,
    phoneSearch: p.phoneSearch,
    currentStatus: p.currentStatus,
    currentStatusIn:
      p.currentStatusIn && p.currentStatusIn.length > 0
        ? p.currentStatusIn.join(",")
        : undefined,
    createdFrom: p.createdFrom,
    createdTo: p.createdTo,
    overdueOnly: p.overdueOnly ? "true" : undefined,
  })
  return apiFetch<TimelineResponse>(`/api/shipments/timeline${query}`, {
    token: p.token,
  })
}

export async function confirmShipmentCs(
  token: string,
  shipmentId: string,
): Promise<void> {
  await apiFetch<unknown>(`/api/shipments/${shipmentId}/status`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ toStatus: "CONFIRMED_BY_CS" }),
  })
}

export type PatchShipmentFieldsParams = {
  token: string
  shipmentId: string
  addressText?: string
  notes?: string | null
  customerLat?: string
  customerLng?: string
}

export async function patchShipmentFields(
  p: PatchShipmentFieldsParams,
): Promise<CsShipmentRow> {
  return apiFetch<CsShipmentRow>(`/api/shipments/${p.shipmentId}`, {
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

export type SendWhatsappShipmentPromptParams = {
  token: string
  shipmentId: string
  locale: "ar" | "en"
}

export async function sendWhatsappShipmentPrompt(
  p: SendWhatsappShipmentPromptParams,
): Promise<{ sent: boolean }> {
  return apiFetch<{ sent: boolean }>("/api/whatsapp/send-shipment-prompt", {
    method: "POST",
    token: p.token,
    body: JSON.stringify({
      shipmentId: p.shipmentId,
      locale: p.locale,
    }),
  })
}
