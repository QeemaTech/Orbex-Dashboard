import {
  canConfirmCsForShipmentLine,
} from "@/features/customer-service/lib/cs-confirm-eligibility"

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

assert(
  canConfirmCsForShipmentLine({
    csConfirmedAt: null,
  }),
  "expected eligible before CS confirm",
)

assert(
  !canConfirmCsForShipmentLine({
    csConfirmedAt: "2026-01-01T00:00:00.000Z",
  }),
  "expected not eligible after CS confirm",
)
