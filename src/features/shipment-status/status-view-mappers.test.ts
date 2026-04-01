import { getPerspectiveStatusKey } from "@/features/shipment-status/status-view-mappers"

function assertEqual(actual: string, expected: string): void {
  if (actual !== expected) {
    throw new Error(`Expected '${expected}', got '${actual}'`)
  }
}

assertEqual(
  getPerspectiveStatusKey("operations", { subStatus: "CONFIRMED" }),
  "CONFIRMED",
)
assertEqual(
  getPerspectiveStatusKey("warehouse", { status: "IN_WAREHOUSE" }),
  "RECEIVED_IN_WAREHOUSE",
)
assertEqual(
  getPerspectiveStatusKey("warehouse", { currentStatus: "CONFIRMED_BY_CS" }),
  "PENDING_PICKUP",
)
assertEqual(
  getPerspectiveStatusKey("warehouse", { currentStatus: "ASSIGNED" }),
  "OUT_FOR_DELIVERY",
)
assertEqual(
  getPerspectiveStatusKey("warehouse", {
    status: "PENDING",
    currentStatus: "IN_WAREHOUSE",
  }),
  "RECEIVED_IN_WAREHOUSE",
)
assertEqual(
  getPerspectiveStatusKey("warehouse", {
    status: "PENDING",
    currentStatus: "OUT_FOR_DELIVERY",
  }),
  "OUT_FOR_DELIVERY",
)
assertEqual(
  getPerspectiveStatusKey("warehouse", {
    currentStatus: "POSTPONED",
    status: "POSTPONED",
  }),
  "DELAYED",
)
assertEqual(
  getPerspectiveStatusKey("warehouse", {
    currentStatus: "REJECTED",
    status: "REJECTED",
  }),
  "REJECTED",
)
assertEqual(
  getPerspectiveStatusKey("accounting", { paymentStatus: "SETTLED" }),
  "SETTLED",
)

