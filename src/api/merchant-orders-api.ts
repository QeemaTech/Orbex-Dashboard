import { apiFetch, apiUrl } from "@/api/client"
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
  /** Delivery line id; use for `/api/shipments/:id`. */
  id: string
  /** Parent merchant-order (batch) id; same as `merchantOrderId` when API sends both. */
  shipmentId: string
  /** Explicit parent batch id from API (`MerchantOrder.id`). */
  merchantOrderId?: string
  /** Batch detail: primary line id for status PATCH; list rows omit (use `id`). */
  primaryOrderId?: string
  merchantId: string
  regionId?: string | null
  customerId: string
  assignedCourierId: string | null
  /** Order line tracking number (unique per order). */
  trackingNumber: string | null
  /** Merchant-order batch pipeline — API field `transferStatus` on the parent `MerchantOrder`. */
  transferStatus?: string
  /** Line CS outbound confirmation timestamp when present on list/detail APIs. */
  csConfirmedAt?: string | null
  /** User who confirmed the line at hub with customer location (CS flow only). */
  csConfirmedByUserId?: string | null
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
  commissionFee?: string
  paymentMethod: string
  productType: string
  /** Package / product description (nullable from API). */
  description?: string | null
  weightGrams?: number
  itemsCount?: number
  status: string
  subStatus: string
  paymentStatus: string
  statusUi?: string
  shipmentPaymentStatus?: string
  autoRejectedFromPostpone?: boolean
  rejectionCourierLat?: string | null
  rejectionCourierLng?: string | null
  importJobId?: string | null
  pickupCourierId?: string | null
  visaCommissionRate?: string | null
  merchant?: CsMerchant
  courier?: CsCourier | null
  /** Hub assigned to the batch (`Shipment.assignedWarehouse`); present on list/KPI/detail when returned by API. */
  assignedWarehouse?: { id: string; name: string } | null
  /** Primary line physical location (`Shipment.currentWarehouse`). */
  currentWarehouseId?: string | null
  currentWarehouse?: { id: string; name: string } | null
  /** Line count in batch; from shipment list/KPI aggregates. */
  orderCount?: number
  /** Sum of line values in the batch. */
  totalShipmentValue?: string
  /** All order lines have terminal delivery outcome and failed lines are at hub. */
  isResolved?: boolean
  /** Every line delivered or returned to merchant. */
  isFinished?: boolean
  createdAt: string
  updatedAt: string
  statusEvents?: CsShipmentStatusEvent[]
}

/** Batch id for `/merchant-orders/:id` and batch APIs; use `merchantOrderId` or `shipmentId` alias, not line `id`. */
export function merchantOrderBatchId(
  row: Pick<CsShipmentRow, "merchantOrderId" | "shipmentId">,
): string {
  const v = row.merchantOrderId ?? row.shipmentId
  return v != null && String(v).trim() !== "" ? String(v).trim() : ""
}

export type CsShipmentStatusEvent = {
  id: string
  shipmentId: string
  fromCoreStatus: string | null
  toCoreStatus: string
  fromSubStatus: string | null
  toSubStatus: string
  fromPaymentStatus: string | null
  toPaymentStatus: string
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
  /** Comma-separated core or core:sub pairs (backend `coreSubIn`). */
  coreSubIn?: string
  status?: string
  subStatus?: string
  paymentStatus?: string
  createdFrom?: string
  createdTo?: string
  overdueOnly?: boolean
  expand?: string
  /** Filter by hub `Shipment.assignedWarehouseId`. */
  assignedWarehouseId?: string
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
  const data = await apiFetch<ShipmentListResponse>(
    `/api/merchant-orders${query}`,
    {
      token: p.token,
    },
  )
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
    `/api/merchant-orders/${params.shipmentId}${query}`,
    { token: params.token },
  )
  const location = extractShipmentLocation(row.notes)
  return {
    ...row,
    locationText: location.locationText,
    locationLink: location.locationLink,
  }
}

export type ShipmentOrderCustomer = {
  id: string
  customerName: string
  phonePrimary: string
  phoneSecondary: string | null
  addressText: string
  addressConfirmed: boolean
  customerLat: string | null
  customerLng: string | null
  customerLocationReceivedAt: string | null
}

export type ShipmentOrderRow = {
  id: string
  merchantOrderId: string
  /** Parent merchant-order id; same as `merchantOrderId` when returned by list/detail APIs. */
  shipmentId: string
  customerId: string
  merchantId?: string
  regionId?: string | null
  assignedCourierId?: string | null
  trackingNumber: string | null
  status: string
  paymentStatus: string
  shipmentValue: string
  shippingFee: string
  commissionFee: string
  serviceFee?: string
  paymentMethod: string
  visaCommissionRate: string | null
  notes: string | null
  productType: string
  description?: string | null
  weightGrams?: number
  itemsCount?: number
  deliveryCourierId: string | null
  resolvedDeliveryZoneId?: string | null
  deliveryCourier?: {
    id: string
    fullName: string | null
    userId: string
    contactPhone: string | null
  } | null
  pickupCourier?: {
    id: string
    fullName: string | null
    userId: string
    contactPhone: string | null
  } | null
  csConfirmedAt: string | null
  csConfirmedByUserId?: string | null
  scannedOutAt: string | null
  receivedByCustomer: boolean | null
  paymentCollected: boolean | null
  postponedAt: string | null
  returnReceivedAt: string | null
  returnDiscountAmount: string | null
  autoRejectedFromPostpone?: boolean
  rejectionCourierLat?: string | null
  rejectionCourierLng?: string | null
  importJobId?: string | null
  pickupCourierId?: string | null
  /** Parent merchant-order batch pipeline (`MerchantOrder.transferStatus`). */
  transferStatus?: string
  /** Batch hub assignment when returned from shipment APIs. */
  assignedWarehouseId?: string | null
  /** Current warehouse where the shipment is located (from scan in/out operations). */
  currentWarehouseId?: string | null
  /** Populated when `currentWarehouseId` is set (list/detail/orders APIs). */
  currentWarehouse?: { id: string; name: string } | null
  subStatus?: string
  statusUi?: string
  shipmentPaymentStatus?: string
  customerName?: string
  phonePrimary?: string
  phoneSecondary?: string | null
  addressText?: string
  addressConfirmed?: boolean
  customerLat?: string | null
  customerLng?: string | null
  customerLocationReceivedAt?: string | null
  merchant?: CsMerchant
  courier?: CsCourier | null
  createdAt: string
  updatedAt: string
  customer: ShipmentOrderCustomer
  statusEvents?: Array<{
    id: string
    fromStatus: string | null
    toStatus: string
    actorUserId: string | null
    /** Audit text, e.g. inter-hub transfer destination warehouse. */
    note?: string | null
    createdAt: string
    atWarehouseId?: string | null
    atWarehouse?: { id: string; name: string } | null
    fromWarehouseId?: string | null
    fromWarehouse?: { id: string; name: string } | null
    toWarehouseId?: string | null
    toWarehouse?: { id: string; name: string } | null
    postponeCountAfter?: number | null
    assignedCourierName?: string | null
  }>
  shipmentTasks?: Array<{
    id: string
    type: string
    status: string
    fromWarehouseId: string | null
    toWarehouseId: string | null
    assignedCourierId: string | null
    assignedCourier: {
      id: string
      fullName: string | null
      contactPhone: string | null
    } | null
    createdAt: string
  }>
  paymentProofs?: Array<{
    id: string
    paymentMethod: string
    imageUrl: string
    createdAt: string
  }>
}

export type ShipmentOrdersResponse = {
  merchantOrderId: string
  shipmentId: string
  shipments: ShipmentOrderRow[]
}

export async function getShipmentOrders(params: {
  token: string
  shipmentId: string
}): Promise<ShipmentOrdersResponse> {
  return apiFetch<ShipmentOrdersResponse>(
    `/api/merchant-orders/${params.shipmentId}/orders`,
    { token: params.token },
  )
}

export async function bulkReturnRejectedToMerchant(params: {
  token: string
  merchantOrderId: string
}): Promise<{ created: string[]; skipped: string[] }> {
  return apiFetch<{ created: string[]; skipped: string[] }>(
    `/api/merchant-orders/${encodeURIComponent(
      params.merchantOrderId,
    )}/bulk-return-to-merchant`,
    { token: params.token, method: "POST" },
  )
}

export async function finalizeMerchantOrderReturns(params: {
  token: string
  merchantOrderId: string
}): Promise<{
  finalizedIds: string[]
  skippedDeliveredIds: string[]
  finalizedCount: number
  skippedDeliveredCount: number
}> {
  return apiFetch<{
    finalizedIds: string[]
    skippedDeliveredIds: string[]
    finalizedCount: number
    skippedDeliveredCount: number
  }>(
    `/api/merchant-orders/${encodeURIComponent(params.merchantOrderId)}/finalize-returns`,
    { token: params.token, method: "POST" },
  )
}

export async function confirmShipmentReturn(params: {
  token: string
  shipmentLineId: string
}): Promise<unknown> {
  return apiFetch<unknown>(
    `/api/shipments/${encodeURIComponent(
      params.shipmentLineId,
    )}/confirm-return`,
    { token: params.token, method: "POST" },
  )
}

export type DashboardKpisResponse = {
  totals: {
    totalShipments: number
    totalOrders: number
    /** Same as totalOrders (customer shipment lines). */
    totalShipmentLines?: number
    /** Same as totalShipments (merchant-order batches). */
    totalMerchantOrders?: number
    totalUsers?: number
    /** All-time warehouse site count when caller has warehouses.read. */
    totalWarehouses?: number
    delivered: number
    rejected: number
    postponed: number
    pendingAssignment: number
    inProgress: number
  }
  statusBreakdown: Array<{
    status: string
    subStatus: string
    count: number
  }>
  /** Counts by merchant-order batch pipeline status (`transferStatus`). */
  transferStatusBreakdown: Array<{
    transferStatus: string
    count: number
  }>
  ordersOverTime: Array<{ date: string; count: number }>
  merchantOrdersOverTime?: Array<{ date: string; count: number }>
  insightsPeriod?: { from: string; to: string }
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
      shipmentId: "seed-shp-1001",
      primaryOrderId: "seed-shp-1001",
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
      description: "Phone accessories kit",
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
      shipmentId: "seed-shp-1002",
      primaryOrderId: "seed-shp-1002",
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
      description: "Summer collection — two items",
      status: "RETURNED",
      subStatus: "DELAYED",
      paymentStatus: "PENDING_COLLECTION",
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
      shipmentId: "seed-shp-1003",
      primaryOrderId: "seed-shp-1003",
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
      description: "Kitchenware set",
      status: "RETURNED",
      subStatus: "REJECTED",
      paymentStatus: "ON_HOLD",
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
      shipmentId: "seed-shp-1004",
      primaryOrderId: "seed-shp-1004",
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
      description: "Watch strap and case",
      status: "OUT_FOR_DELIVERY",
      subStatus: "NONE",
      paymentStatus: "PENDING_COLLECTION",
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
    totalOrders: 2103,
    totalShipmentLines: 2103,
    totalMerchantOrders: 1264,
    totalUsers: 42,
    totalWarehouses: 12,
    delivered: 914,
    rejected: 83,
    postponed: 129,
    pendingAssignment: 46,
    inProgress: 92,
  }

  const now = new Date()
  const insightsPeriod = {
    from: new Date(now.getTime() - (normalizedDays - 1) * 86400000).toISOString(),
    to: now.toISOString(),
  }

  const merchantOrdersOverTime = timeline.map((row, i) => ({
    date: row.date,
    count: 12 + ((i * 5) % 20),
  }))

  return {
    totals,
    insightsPeriod,
    statusBreakdown: [
      {
        status: "DELIVERED",
        subStatus: "NONE",
        count: totals.delivered,
      },
      {
        status: "RETURNED",
        subStatus: "REJECTED",
        count: totals.rejected,
      },
      {
        status: "RETURNED",
        subStatus: "DELAYED",
        count: totals.postponed,
      },
      {
        status: "OUT_FOR_DELIVERY",
        subStatus: "ASSIGNED",
        count: totals.inProgress,
      },
    ],
    transferStatusBreakdown: [
      { transferStatus: "PENDING", count: 120 },
      { transferStatus: "IN_WAREHOUSE", count: 340 },
      { transferStatus: "DELIVERED", count: 560 },
      { transferStatus: "ON_THE_WAY_TO_WAREHOUSE", count: 90 },
      { transferStatus: "ASSIGNED", count: 154 },
    ],
    ordersOverTime: timeline,
    merchantOrdersOverTime,
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
    unassignedOnly: p.unassignedOnly ? "true" : undefined,
    regionId: p.regionId,
    regionName: p.regionName,
    assignedWarehouseId: p.assignedWarehouseId,
    trackingNumber: p.trackingNumber,
    customerName: p.customerName,
    phoneSearch: p.phoneSearch,
    coreSubIn: p.coreSubIn,
    status: p.status,
    subStatus: p.subStatus,
    paymentStatus: p.paymentStatus,
    createdFrom: p.createdFrom,
    createdTo: p.createdTo,
    overdueOnly: p.overdueOnly ? "true" : undefined,
    trendDays: p.trendDays,
    recentTake: p.recentTake,
  })
  const data = await apiFetch<DashboardKpisResponse>(
    `/api/merchant-orders/dashboard/kpis${query}`,
    {
      token: p.token,
    },
  )
  return {
    ...data,
    totals: {
      ...data.totals,
      totalOrders: data.totals.totalOrders ?? 0,
      totalShipmentLines: data.totals.totalShipmentLines ?? data.totals.totalOrders ?? 0,
      totalMerchantOrders: data.totals.totalMerchantOrders ?? data.totals.totalShipments ?? 0,
    },
    merchantOrdersOverTime: data.merchantOrdersOverTime ?? [],
    insightsPeriod: data.insightsPeriod,
    transferStatusBreakdown: data.transferStatusBreakdown ?? [],
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
  fromCoreStatus: string | null
  toCoreStatus: string
  fromSubStatus: string | null
  toSubStatus: string
  fromPaymentStatus: string | null
  toPaymentStatus: string
  note: string | null
  actorUserId: string | null
  createdAt: string
  shipment: {
    id: string
    trackingNumber: string | null
    customerName: string
    phonePrimary: string
    status: string
    subStatus: string
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
    assignedWarehouseId: p.assignedWarehouseId,
    trackingNumber: p.trackingNumber,
    customerName: p.customerName,
    phoneSearch: p.phoneSearch,
    coreSubIn: p.coreSubIn,
    status: p.status,
    subStatus: p.subStatus,
    paymentStatus: p.paymentStatus,
    createdFrom: p.createdFrom,
    createdTo: p.createdTo,
    overdueOnly: p.overdueOnly ? "true" : undefined,
  })
  return apiFetch<TimelineResponse>(`/api/merchant-orders/timeline${query}`, {
    token: p.token,
  })
}

/**
 * CS hub: confirm **delivery line** with customer GPS (batch must already be IN_WAREHOUSE).
 * Not merchant pickup or warehouse scan-in — use only for the CS outbound confirmation step.
 */
export async function confirmShipmentCustomerLocation(p: {
  token: string
  merchantOrderId: string
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

export type ImportOrdersParams = {
  token: string
  file: File
  merchantId?: string
  pickupDate: string
  regionId?: string | null
  notes?: string | null
  trackingNumber?: string | null
  packagingMaterialRequest?: {
    notes?: string | null
    items: Array<{
      packagingMaterialId: string
      requestedQuantity: string | number
    }>
  } | null
}

/** `POST /api/merchant-orders/import-orders` returns 202 — rows queued for confirmation. */
export type ImportOrdersQueuedResponse = {
  pendingImport: {
    id: string
    status: "PENDING_CONFIRMATION"
    merchantId: string
    merchantName: string
    merchantPhone: string
    merchantEmail: string | null
    merchantBusinessName: string
    merchantPickupAddress: string | null
    merchantPickupGovernorate: string | null
    rowCount: number
    pickupDate: string
    createdAt: string
  }
  orderCount: number
}

export async function importOrdersFromExcel(
  p: ImportOrdersParams,
): Promise<ImportOrdersQueuedResponse> {
  const formData = new FormData()
  formData.append("file", p.file)
  formData.append(
    "shipment",
    JSON.stringify({
      merchantId: p.merchantId || null,
      pickupDate: p.pickupDate,
      regionId: p.regionId,
      notes: p.notes,
      trackingNumber: p.trackingNumber,
      packagingMaterialRequest: p.packagingMaterialRequest ?? null,
    }),
  )

  const response = await fetch(apiUrl("/api/merchant-orders/import-orders"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${p.token}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const errorBody = await response
      .json()
      .catch(() => ({ error: "Upload failed" }))
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

  return response.json()
}

export async function downloadImportTemplate(token: string): Promise<void> {
  const response = await fetch(
    apiUrl("/api/merchant-orders/import-template"),
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  if (!response.ok) {
    const errorBody = await response
      .json()
      .catch(() => ({ error: "Failed to download template" }))
    const msg =
      typeof errorBody === "object" &&
      errorBody !== null &&
      "error" in errorBody &&
      typeof (errorBody as { error?: unknown }).error === "string"
        ? (errorBody as { error: string }).error
        : "Failed to download template"
    throw new Error(msg)
  }

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.setAttribute("download", "order-import-template.xlsx")
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => window.URL.revokeObjectURL(url), 100)
}

export type PendingMerchantOrderImportRow = {
  id: string
  merchantId: string
  merchantName: string
  merchantPhone: string
  merchantEmail: string | null
  merchantBusinessName: string
  merchantPickupAddress: string | null
  merchantPickupGovernorate: string | null
  fileName: string
  rowCount: number
  pickupDate: string
  status: "PENDING_CONFIRMATION"
  createdAt: string
  createdByUserId: string | null
  createdByName: string | null
}

export type PendingMerchantOrderImportsResponse = {
  items: PendingMerchantOrderImportRow[]
}

export type PendingMerchantOrderImportPreviewRow = {
  customerName: string
  phonePrimary: string
  phoneSecondary?: string | null
  addressText: string
  allowOpenValue?: boolean
  weightGrams: number
  itemsCount: number
  shipmentValue: string
  shippingFee: string
  paymentMethod: string
  notes?: string | null
  productType?: string | null
  description?: string | null
}

export type PendingMerchantOrderImportPreviewResponse = {
  pendingImportId: string
  fileName: string
  rowCount: number
  pickupDate: string
  rows: PendingMerchantOrderImportPreviewRow[]
}

export type PendingMerchantOrderImportVersionRow = {
  id: string
  versionNumber: number
  changeType: "INITIAL_UPLOAD" | "PICKUP_DATE_UPDATED" | "FILE_REPLACED"
  fileName: string
  filePath: string | null
  fileMimeType: string | null
  fileSize: number | null
  pickupDate: string
  changedByUserId: string | null
  changedByName: string | null
  createdAt: string
}

export type PendingMerchantOrderImportVersionsResponse = {
  items: PendingMerchantOrderImportVersionRow[]
}

export async function listPendingMerchantOrderImports(params: {
  token: string
}): Promise<PendingMerchantOrderImportsResponse> {
  return apiFetch<PendingMerchantOrderImportsResponse>("/api/merchant-orders/pending-imports", {
    token: params.token,
  })
}

export async function getPendingMerchantOrderImportPreview(params: {
  token: string
  pendingImportId: string
}): Promise<PendingMerchantOrderImportPreviewResponse> {
  return apiFetch<PendingMerchantOrderImportPreviewResponse>(
    `/api/merchant-orders/pending-imports/${encodeURIComponent(params.pendingImportId)}/preview`,
    { token: params.token },
  )
}

export async function downloadPendingMerchantOrderImportFile(params: {
  token: string
  pendingImportId: string
  fileName?: string
}): Promise<void> {
  const response = await fetch(
    apiUrl(
      `/api/merchant-orders/pending-imports/${encodeURIComponent(params.pendingImportId)}/file`,
    ),
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${params.token}`,
      },
    },
  )

  if (!response.ok) {
    const errorBody = await response
      .json()
      .catch(() => ({ error: "Failed to download import file" }))
    const msg =
      typeof errorBody === "object" &&
      errorBody !== null &&
      "error" in errorBody &&
      typeof (errorBody as { error?: unknown }).error === "string"
        ? (errorBody as { error: string }).error
        : "Failed to download import file"
    throw new Error(msg)
  }

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.setAttribute("download", params.fileName || "pending-import.xlsx")
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => window.URL.revokeObjectURL(url), 100)
}

export async function updatePendingMerchantOrderPickupDate(params: {
  token: string
  pendingImportId: string
  pickupDate: string
}): Promise<{ success: true; pickupDate: string }> {
  return apiFetch<{ success: true; pickupDate: string }>(
    `/api/merchant-orders/pending-imports/${encodeURIComponent(params.pendingImportId)}/pickup-date`,
    {
      method: "PATCH",
      token: params.token,
      body: JSON.stringify({ pickupDate: params.pickupDate }),
    },
  )
}

export async function updatePendingMerchantOrderImportFile(params: {
  token: string
  pendingImportId: string
  file: File
}): Promise<{ success: true; rowCount: number }> {
  const form = new FormData()
  form.append("file", params.file)
  const response = await fetch(
    apiUrl(`/api/merchant-orders/pending-imports/${encodeURIComponent(params.pendingImportId)}/file`),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.token}`,
      },
      body: form,
    },
  )
  const text = await response.text()
  const data = text ? (JSON.parse(text) as unknown) : null
  if (!response.ok) {
    const msg =
      data && typeof data === "object" && "error" in data && typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : "Failed to update import file"
    throw new Error(msg)
  }
  return data as { success: true; rowCount: number }
}

export async function listPendingMerchantOrderImportVersions(params: {
  token: string
  pendingImportId: string
}): Promise<PendingMerchantOrderImportVersionsResponse> {
  return apiFetch<PendingMerchantOrderImportVersionsResponse>(
    `/api/merchant-orders/pending-imports/${encodeURIComponent(params.pendingImportId)}/versions`,
    {
      token: params.token,
    },
  )
}

export async function downloadPendingMerchantOrderImportVersionFile(params: {
  token: string
  pendingImportId: string
  versionId: string
  fileName?: string
}): Promise<void> {
  const response = await fetch(
    apiUrl(
      `/api/merchant-orders/pending-imports/${encodeURIComponent(params.pendingImportId)}/versions/${encodeURIComponent(params.versionId)}/file`,
    ),
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${params.token}`,
      },
    },
  )
  if (!response.ok) {
    const errorBody = await response
      .json()
      .catch(() => ({ error: "Failed to download version file" }))
    const msg =
      typeof errorBody === "object" &&
      errorBody !== null &&
      "error" in errorBody &&
      typeof (errorBody as { error?: unknown }).error === "string"
        ? (errorBody as { error: string }).error
        : "Failed to download version file"
    throw new Error(msg)
  }

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.setAttribute("download", params.fileName || "pending-import-version.xlsx")
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => window.URL.revokeObjectURL(url), 100)
}

export async function confirmPendingMerchantOrderImport(params: {
  token: string
  pendingImportId: string
}): Promise<void> {
  await apiFetch<unknown>(
    `/api/merchant-orders/pending-imports/${encodeURIComponent(params.pendingImportId)}/confirm`,
    {
      method: "POST",
      token: params.token,
    },
  )
}

export async function rejectPendingMerchantOrderImport(params: {
  token: string
  pendingImportId: string
  reason?: string | null
}): Promise<void> {
  await apiFetch<unknown>(
    `/api/merchant-orders/pending-imports/${encodeURIComponent(params.pendingImportId)}/reject`,
    {
      method: "POST",
      token: params.token,
      body: JSON.stringify({
        reason: params.reason ?? null,
      }),
    },
  )
}

