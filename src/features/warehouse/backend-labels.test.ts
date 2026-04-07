import type { TFunction } from "i18next"

import {
  formatShipmentStatusEventLine,
  shipmentCoreStatusLabel,
  shipmentSubStatusLabel,
} from "./backend-labels"

function assertEqual(actual: string, expected: string): void {
  if (actual !== expected) {
    throw new Error(`Expected '${expected}', got '${actual}'`)
  }
}

function makeT(map: Record<string, string>): TFunction {
  const fn = ((key: string, opts?: { defaultValue?: string }) => {
    if (map[key] !== undefined) return map[key]
    if (opts?.defaultValue !== undefined) return opts.defaultValue
    return key
  }) as TFunction
  return fn
}

const t = makeT({
  "backend.enumUnknown": "Unknown",
  "backend.shipmentCoreStatus.PENDING": "Pending",
  "backend.shipmentCoreStatus.DELIVERED": "Delivered",
  "backend.shipmentSubStatus.NONE": "—",
  "backend.shipmentSubStatus.REJECTED": "Rejected",
  "shipments.detail.timelineArrow": "→",
  "shipments.detail.timelineStart": "START",
})

assertEqual(shipmentSubStatusLabel(t, ""), "—")
assertEqual(shipmentSubStatusLabel(t, "NONE"), "—")
assertEqual(shipmentSubStatusLabel(t, "none"), "—")
assertEqual(shipmentCoreStatusLabel(t, "PENDING"), "Pending")
assertEqual(
  shipmentCoreStatusLabel(t, "NOT_A_REAL_STATUS"),
  "Unknown",
)

assertEqual(
  formatShipmentStatusEventLine(t, {
    fromCoreStatus: null,
    fromSubStatus: null,
    toCoreStatus: "PENDING",
    toSubStatus: "NONE",
  }),
  "START → Pending/—",
)

assertEqual(
  formatShipmentStatusEventLine(t, {
    fromCoreStatus: "PENDING",
    fromSubStatus: "NONE",
    toCoreStatus: "DELIVERED",
    toSubStatus: "REJECTED",
  }),
  "Pending/— → Delivered/Rejected",
)
