import { describe, expect, it } from "vitest"

import type { ManifestRouteStop } from "@/api/delivery-manifests-api"
import type { MovementManifestUnifiedTask } from "@/api/shipments-api"

import { orderMovementManifestTasksByRoute } from "./order-movement-manifest-tasks-by-route"

function mockPickup(id: string): MovementManifestUnifiedTask {
  return {
    kind: "PICKUP_TASK",
    id,
    taskType: "PICKUP",
    status: "PENDING",
    fromLabel: "",
    toLabel: "",
    merchantOrderId: "mo",
    merchantId: "mer",
    pickupAddress: "",
    latitude: null,
    longitude: null,
    transferDate: "",
    merchantOrder: null,
    from: { merchant: null },
    to: { warehouse: null },
  }
}

function mockReturnGroup(merchantOrderId: string, merchantId: string): MovementManifestUnifiedTask {
  return {
    kind: "RETURN_TO_MERCHANT_GROUP",
    merchantOrderId,
    merchantId,
    merchant: { id: merchantId, displayName: "Shop", pickupAddressText: null },
    fromLabel: "Hub",
    toLabel: "Shop",
    shipments: [],
  }
}

function mockTransfer(lineId: string): MovementManifestUnifiedTask {
  return {
    kind: "SHIPMENT_TASK",
    lineId,
    shipmentId: "sh",
    shipmentTaskId: "st",
    taskType: "TRANSFER",
    taskStatus: "PLANNED",
    trackingNumber: null,
    shipmentStatus: "IN_WAREHOUSE",
    fromLabel: "A",
    toLabel: "B",
    from: { warehouse: null },
    to: { warehouse: null, merchant: null },
  }
}

function stop(order: number, shipmentId: string): ManifestRouteStop {
  return { order, shipmentId, lat: 30, lng: 31, address: "" }
}

describe("orderMovementManifestTasksByRoute", () => {
  it("orders pickups and return groups by orderedStops and appends transfers last", () => {
    const tasks: MovementManifestUnifiedTask[] = [
      mockPickup("pt-a"),
      mockPickup("pt-b"),
      mockReturnGroup("mo-ret", "mer-ret"),
      mockTransfer("line-t"),
    ]
    const orderedStops: ManifestRouteStop[] = [
      stop(2, "pt-b"),
      stop(1, "returnOrder:mo-ret"),
      stop(3, "pt-a"),
    ]
    const out = orderMovementManifestTasksByRoute(tasks, orderedStops)
    // Stops are processed in ascending `order` (1 → return, 2 → pt-b, 3 → pt-a)
    expect(out.map((t) => (t.kind === "PICKUP_TASK" ? t.id : t.kind === "RETURN_TO_MERCHANT_GROUP" ? t.merchantOrderId : t.lineId))).toEqual([
      "mo-ret",
      "pt-b",
      "pt-a",
      "line-t",
    ])
  })

  it("appends pickups not listed in stops before transfers", () => {
    const tasks: MovementManifestUnifiedTask[] = [
      mockPickup("pt-a"),
      mockPickup("pt-orphan"),
      mockTransfer("line-t"),
    ]
    const orderedStops: ManifestRouteStop[] = [stop(1, "pt-a")]
    const out = orderMovementManifestTasksByRoute(tasks, orderedStops)
    expect(out[0]?.kind).toBe("PICKUP_TASK")
    if (out[0]?.kind === "PICKUP_TASK") expect(out[0].id).toBe("pt-a")
    expect(out[1]?.kind).toBe("PICKUP_TASK")
    if (out[1]?.kind === "PICKUP_TASK") expect(out[1].id).toBe("pt-orphan")
    expect(out[2]?.kind).toBe("SHIPMENT_TASK")
  })
})
