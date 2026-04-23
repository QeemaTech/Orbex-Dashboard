export type ShipmentCoreStatus =
  | "PENDING"
  | "IN_WAREHOUSE"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "RETURNED"

export type ShipmentSubStatus =
  | "NONE"
  | "CONFIRMED"
  | "ASSIGNED"
  | "LOCATION_RECEIVED"
  | "REJECTED"
  | "DELAYED"
  | "RESCHEDULED"
  | "RETURNED_TO_WAREHOUSE"
  | "OUT_FOR_RETURN_TO_MERCHANT"
  | "RETURN_TO_MERCHANT"
  | "DAMAGED"
  | "OVERDUE"

export type ShipmentPaymentStatus =
  | "PENDING_COLLECTION"
  | "COLLECTED"
  | "POS_PENDING"
  | "READY_FOR_SETTLEMENT"
  | "SETTLED"
  | "ON_HOLD"

export type DashboardPerspective =
  | "operations"
  | "merchant"
  | "accounting"
  | "warehouse"
  | "courier"

