import { apiFetch } from "@/api/client"
import { extractShipmentLocation } from "@/features/customer-service/lib/location"

const useDashboardSeedData =
  String(import.meta.env.VITE_DASHBOARD_SEED ?? "").toLowerCase() === "true"

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
  customerId: string
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
  status?: string
  subStatus?: string
  paymentStatus?: string
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
  fromCoreStatus?: string | null
  toCoreStatus?: string
  fromSubStatus?: string | null
  toSubStatus?: string
  fromPaymentStatus?: string | null
  toPaymentStatus?: string
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
  status?: string
  subStatus?: string
  paymentStatus?: string
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
    status: p.status,
    subStatus: p.subStatus,
    paymentStatus: p.paymentStatus,
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

function subtractDaysIso(daysAgo: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

function buildSeedRecentShipments(take: number): CsShipmentRow[] {
  const base: CsShipmentRow[] = [
    {
      id: "seed-shp-1001",
      merchantId: "mrc-01",
      customerId: "seed-cust-1001",
      assignedCourierId: "cr-01",
      trackingNumber: "ORX-1001",
      customerName: "Ahmed Hassan",
      phonePrimary: "+20 100 123 4567",
      phoneSecondary: null,
      addressText: "Nasr City, Cairo",
      notes: "Building 5, floor 2",
      locationText: "Nasr City",
      locationLink: "https://maps.google.com/?q=30.0617,31.3300",
      addressConfirmed: true,
      customerLat: "30.0617",
      customerLng: "31.3300",
      customerLocationReceivedAt: new Date().toISOString(),
      shipmentValue: "1250",
      shippingFee: "60",
      paymentMethod: "COD",
      productType: "Electronics",
      currentStatus: "DELIVERED",
      status: "DELIVERED",
      subStatus: "NONE",
      paymentStatus: "COLLECTED",
      merchant: {
        id: "mrc-01",
        displayName: "Delta Store",
        businessName: "Delta Store LLC",
      },
      courier: {
        id: "cr-01",
        fullName: "Omar Adel",
        userId: "u-cr-01",
        contactPhone: "+20 111 111 1111",
      },
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      statusEvents: [],
    },
    {
      id: "seed-shp-1002",
      merchantId: "mrc-02",
      customerId: "seed-cust-1002",
      assignedCourierId: "cr-02",
      trackingNumber: "ORX-1002",
      customerName: "Sara Mahmoud",
      phonePrimary: "+20 111 987 6543",
      phoneSecondary: null,
      addressText: "Smouha, Alexandria",
      notes: "Call before arrival",
      locationText: "Smouha",
      locationLink: "https://maps.google.com/?q=31.2156,29.9553",
      addressConfirmed: true,
      customerLat: "31.2156",
      customerLng: "29.9553",
      customerLocationReceivedAt: new Date().toISOString(),
      shipmentValue: "940",
      shippingFee: "55",
      paymentMethod: "Card",
      productType: "Fashion",
      currentStatus: "POSTPONED",
      status: "RETURNED",
      subStatus: "DELAYED",
      paymentStatus: "PENDING",
      merchant: {
        id: "mrc-02",
        displayName: "Urban Wear",
        businessName: "Urban Wear Co.",
      },
      courier: {
        id: "cr-02",
        fullName: "Mona Tarek",
        userId: "u-cr-02",
        contactPhone: "+20 112 222 3333",
      },
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      statusEvents: [],
    },
    {
      id: "seed-shp-1003",
      merchantId: "mrc-03",
      customerId: "seed-cust-1003",
      assignedCourierId: null,
      trackingNumber: "ORX-1003",
      customerName: "Nour Khaled",
      phonePrimary: "+20 109 888 7777",
      phoneSecondary: null,
      addressText: "6th of October, Giza",
      notes: "Gate B",
      locationText: "6th of October",
      locationLink: "https://maps.google.com/?q=29.9720,30.9449",
      addressConfirmed: false,
      customerLat: "29.9720",
      customerLng: "30.9449",
      customerLocationReceivedAt: new Date().toISOString(),
      shipmentValue: "1860",
      shippingFee: "70",
      paymentMethod: "Wallet",
      productType: "Home",
      currentStatus: "REJECTED",
      status: "RETURNED",
      subStatus: "REJECTED",
      paymentStatus: "FAILED",
      merchant: {
        id: "mrc-03",
        displayName: "Home Plus",
        businessName: "Home Plus Egypt",
      },
      courier: null,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      statusEvents: [],
    },
    {
      id: "seed-shp-1004",
      merchantId: "mrc-01",
      customerId: "seed-cust-1004",
      assignedCourierId: "cr-03",
      trackingNumber: "ORX-1004",
      customerName: "Youssef Nabil",
      phonePrimary: "+20 122 555 0101",
      phoneSecondary: null,
      addressText: "Zagazig, Sharqia",
      notes: "Near university gate",
      locationText: "Zagazig",
      locationLink: "https://maps.google.com/?q=30.5877,31.5020",
      addressConfirmed: true,
      customerLat: "30.5877",
      customerLng: "31.5020",
      customerLocationReceivedAt: new Date().toISOString(),
      shipmentValue: "720",
      shippingFee: "45",
      paymentMethod: "COD",
      productType: "Accessories",
      currentStatus: "OUT_FOR_DELIVERY",
      status: "OUT_FOR_DELIVERY",
      subStatus: "NONE",
      paymentStatus: "PENDING",
      merchant: {
        id: "mrc-01",
        displayName: "Delta Store",
        businessName: "Delta Store LLC",
      },
      courier: {
        id: "cr-03",
        fullName: "Kareem Fathy",
        userId: "u-cr-03",
        contactPhone: "+20 114 444 5555",
      },
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      statusEvents: [],
    },
  ]
  return base.slice(0, Math.max(1, Math.min(take, base.length)))
}

function buildSeedDashboardKpis(trendDays = 14, recentTake = 8): DashboardKpisResponse {
  const normalizedDays = Math.max(5, Math.min(trendDays, 30))
  const timeline = Array.from({ length: normalizedDays }, (_, i) => {
    const dayIndex = normalizedDays - i - 1
    return {
      date: subtractDaysIso(dayIndex),
      count: 70 + ((i * 13) % 52) + (i % 3 === 0 ? 18 : 0),
    }
  })

  const totals = {
    totalShipments: 1264,
    delivered: 914,
    rejected: 83,
    postponed: 129,
    pendingAssignment: 46,
    inProgress: 92,
  }

  return {
    totals,
    statusDistribution: [
      { status: "DELIVERED", value: totals.delivered },
      { status: "REJECTED", value: totals.rejected },
      { status: "POSTPONED", value: totals.postponed },
      { status: "IN_TRANSIT", value: totals.inProgress },
    ],
    shipmentsOverTime: timeline,
    courierWorkload: [
      { courierId: "cr-01", courierName: "Omar Adel", assignedCount: 28 },
      { courierId: "cr-02", courierName: "Mona Tarek", assignedCount: 23 },
      { courierId: "cr-03", courierName: "Kareem Fathy", assignedCount: 19 },
      { courierId: "cr-04", courierName: "Heba Yasser", assignedCount: 16 },
    ],
    recentShipments: buildSeedRecentShipments(recentTake),
  }
}

export async function getDashboardKpis(
  p: Omit<ListShipmentsParams, "page" | "pageSize" | "expand"> & {
    trendDays?: number
    recentTake?: number
  },
): Promise<DashboardKpisResponse> {
  if (useDashboardSeedData) {
    return buildSeedDashboardKpis(p.trendDays, p.recentTake)
  }

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
    status: p.status,
    subStatus: p.subStatus,
    paymentStatus: p.paymentStatus,
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
  const data = await apiFetch<DashboardKpisResponse>(
    `/api/shipments/dashboard/kpis${query}`,
    {
      token: p.token,
    },
  )
  return {
    ...data,
    recentShipments: data.recentShipments.map((s) => {
      const location = extractShipmentLocation(s.notes)
      return {
        ...s,
        locationText: location.locationText,
        locationLink: location.locationLink,
      }
    }),
  }
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
    status: p.status,
    subStatus: p.subStatus,
    paymentStatus: p.paymentStatus,
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
