import type {
  DashboardPerspective,
  ShipmentCoreStatus,
  ShipmentPaymentStatus,
  ShipmentSubStatus,
} from "@/features/shipment-status/status-types"

export type ShipmentStateForView = {
  status?: string | null
  subStatus?: string | null
  paymentStatus?: string | null
  currentStatus?: string | null
  outboundCsPending?: boolean
}

type LegacyShipmentStatus =
  | "PENDING_ASSIGNMENT"
  | "CONFIRMED_BY_CS"
  | "IN_WAREHOUSE"
  | "OUT_FOR_DELIVERY"
  | "ASSIGNED"
  | "DELIVERED"
  | "REJECTED"
  | "POSTPONED"

const coreStatuses = new Set<ShipmentCoreStatus>([
  "PENDING",
  "IN_WAREHOUSE",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "RETURNED",
])

const subStatuses = new Set<ShipmentSubStatus>([
  "NONE",
  "CONFIRMED",
  "ASSIGNED",
  "LOCATION_RECEIVED",
  "REJECTED",
  "DELAYED",
  "RESCHEDULED",
  "RETURNED_TO_WAREHOUSE",
  "OUT_FOR_RETURN_TO_MERCHANT",
  "RETURN_TO_MERCHANT",
  "DAMAGED",
  "OVERDUE",
])

function asLegacyStatus(value: string): LegacyShipmentStatus | null {
  switch (value) {
    case "PENDING_ASSIGNMENT":
    case "CONFIRMED_BY_CS":
    case "IN_WAREHOUSE":
    case "OUT_FOR_DELIVERY":
    case "ASSIGNED":
    case "DELIVERED":
    case "REJECTED":
    case "POSTPONED":
      return value
    default:
      return null
  }
}

function legacyToCoreStatus(value: LegacyShipmentStatus): ShipmentCoreStatus {
  switch (value) {
    case "PENDING_ASSIGNMENT":
    case "CONFIRMED_BY_CS":
      return "PENDING"
    case "IN_WAREHOUSE":
      return "IN_WAREHOUSE"
    case "OUT_FOR_DELIVERY":
    case "ASSIGNED":
      return "OUT_FOR_DELIVERY"
    case "DELIVERED":
      return "DELIVERED"
    case "REJECTED":
    case "POSTPONED":
      return "RETURNED"
  }
}

function legacyToSubStatus(value: LegacyShipmentStatus): ShipmentSubStatus {
  switch (value) {
    case "CONFIRMED_BY_CS":
      return "CONFIRMED"
    case "ASSIGNED":
      return "ASSIGNED"
    case "REJECTED":
      return "REJECTED"
    case "POSTPONED":
      return "DELAYED"
    default:
      return "NONE"
  }
}

function normalizeCoreStatus(
  rawStatus: string,
  rawCurrentStatus: string,
): ShipmentCoreStatus {
  const legacyFromCurrent = asLegacyStatus(rawCurrentStatus)
  if (legacyFromCurrent) {
    return legacyToCoreStatus(legacyFromCurrent)
  }
  if (coreStatuses.has(rawStatus as ShipmentCoreStatus)) {
    return rawStatus as ShipmentCoreStatus
  }
  if (coreStatuses.has(rawCurrentStatus as ShipmentCoreStatus)) {
    return rawCurrentStatus as ShipmentCoreStatus
  }
  const legacy = asLegacyStatus(rawStatus) ?? asLegacyStatus(rawCurrentStatus)
  if (legacy) {
    return legacyToCoreStatus(legacy)
  }
  return "PENDING"
}

function normalizeSubStatus(
  rawSubStatus: string,
  rawStatus: string,
  rawCurrentStatus: string,
): ShipmentSubStatus {
  const legacyFromCurrent = asLegacyStatus(rawCurrentStatus)
  if (legacyFromCurrent) {
    return legacyToSubStatus(legacyFromCurrent)
  }
  if (subStatuses.has(rawSubStatus as ShipmentSubStatus)) {
    return rawSubStatus as ShipmentSubStatus
  }
  const legacy = asLegacyStatus(rawStatus) ?? asLegacyStatus(rawCurrentStatus)
  if (legacy) {
    return legacyToSubStatus(legacy)
  }
  return "NONE"
}

export function getPerspectiveStatusKey(
  perspective: DashboardPerspective,
  row: ShipmentStateForView,
): string {
  const rawStatus = (row.status ?? "").toUpperCase()
  const rawSubStatus = (row.subStatus ?? "").toUpperCase()
  const legacy = (row.currentStatus ?? "").toUpperCase()
  const status = normalizeCoreStatus(rawStatus, legacy)
  const subStatus = normalizeSubStatus(rawSubStatus, rawStatus, legacy)
  const paymentStatus = (row.paymentStatus ?? "").toUpperCase() as ShipmentPaymentStatus

  if (perspective === "accounting") {
    return paymentStatus || "PENDING_COLLECTION"
  }

  if (perspective === "operations") {
    if (subStatus === "LOCATION_RECEIVED") return "LOCATION_RECEIVED"
    if (subStatus === "CONFIRMED") return "CONFIRMED"
    if (subStatus === "REJECTED") return "REJECTED"
    if (subStatus === "DELAYED") return "DELAYED"
    if (status === "OUT_FOR_DELIVERY") return "OUT_FOR_DELIVERY"
    if (status === "DELIVERED") return "DELIVERED"
    if (legacy === "PENDING_ASSIGNMENT") return "PENDING_CONFIRMATION"
    return "PENDING_CONFIRMATION"
  }

  if (perspective === "merchant") {
    if (status === "DELIVERED") return "DELIVERED"
    if (subStatus === "REJECTED") return "REJECTED"
    if (subStatus === "DELAYED") return "DELAYED"
    if (subStatus === "OUT_FOR_RETURN_TO_MERCHANT") return "RETURNED"
    if (subStatus === "RETURN_TO_MERCHANT") return "RETURNED"
    if (status === "IN_WAREHOUSE") return "PICKED_UP"
    if (status === "OUT_FOR_DELIVERY") return "IN_TRANSIT"
    return "CREATED"
  }

  if (perspective === "warehouse") {
    if (subStatus === "DAMAGED") return "DAMAGED_OR_MISSING"
    if (subStatus === "OUT_FOR_RETURN_TO_MERCHANT")
      return "OUT_FOR_RETURN_TO_MERCHANT"
    if (subStatus === "RETURN_TO_MERCHANT") return "RETURN_TO_MERCHANT"
    if (subStatus === "RETURNED_TO_WAREHOUSE") return "RETURNED_TO_WAREHOUSE"
    if (subStatus === "RESCHEDULED") return "RESCHEDULED"
    if (subStatus === "DELAYED") return "DELAYED"
    if (subStatus === "REJECTED") return "REJECTED"
    if (status === "DELIVERED") return "DELIVERED"
    if (status === "OUT_FOR_DELIVERY") return "OUT_FOR_DELIVERY"
    if (status === "IN_WAREHOUSE") return "RECEIVED_IN_WAREHOUSE"
    return "PENDING_PICKUP"
  }

  if (perspective === "courier") {
    if (subStatus === "ASSIGNED") return "ASSIGNED"
    if (status === "OUT_FOR_DELIVERY") return "OUT_FOR_DELIVERY"
    if (status === "DELIVERED") return "DELIVERED"
    if (subStatus === "REJECTED") return "REJECTED"
    if (subStatus === "DELAYED") return "DELAYED"
    if (status === "RETURNED") return "RETURNED"
    return "ASSIGNED"
  }

  return legacy || status || "UNKNOWN"
}

