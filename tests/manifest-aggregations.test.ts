import { describe, expect, it } from "vitest"

import type { CourierManifestRow } from "../src/api/courier-manifests-api"
import {
  aggregateCourierLoadByZone,
  aggregateShipmentDistributionByCourier,
} from "../src/features/warehouse/manifests/manifest-aggregations"

function manifest(overrides: Partial<CourierManifestRow>): CourierManifestRow {
  return {
    id: "m1",
    courierId: "c1",
    warehouseId: "w1",
    deliveryZoneId: "z1",
    manifestDate: "2026-04-26",
    totalCod: "0",
    shipmentCount: 1,
    lockedAt: null,
    lockedByUserId: null,
    dispatchedAt: null,
    createdAt: "2026-04-26T10:00:00.000Z",
    updatedAt: "2026-04-26T10:00:00.000Z",
    courier: { id: "c1", fullName: "Courier 1", contactPhone: null },
    warehouse: { id: "w1", name: "Main", governorate: "Cairo" },
    deliveryZone: { id: "z1", name: "Zone 1", governorate: "Cairo" },
    shipments: [],
    ...overrides,
  }
}

describe("manifest aggregations", () => {
  it("aggregates load per courier-zone pair", () => {
    const rows = [
      manifest({ shipmentCount: 2, courierId: "c1", deliveryZoneId: "z1" }),
      manifest({ id: "m2", shipmentCount: 3, courierId: "c1", deliveryZoneId: "z1" }),
      manifest({
        id: "m3",
        shipmentCount: 4,
        courierId: "c2",
        courier: { id: "c2", fullName: "Courier 2", contactPhone: null },
        deliveryZoneId: "z2",
        deliveryZone: { id: "z2", name: "Zone 2", governorate: "Cairo" },
      }),
    ]
    const out = aggregateCourierLoadByZone(rows)
    expect(out).toHaveLength(2)
    expect(out[0]).toMatchObject({
      courierId: "c1",
      zoneId: "z1",
      shipmentCount: 5,
    })
    expect(out[1]).toMatchObject({
      courierId: "c2",
      zoneId: "z2",
      shipmentCount: 4,
    })
  })

  it("aggregates shipment distribution per courier", () => {
    const rows = [
      manifest({ shipmentCount: 2, courierId: "c1" }),
      manifest({ id: "m2", shipmentCount: 1, courierId: "c1" }),
      manifest({
        id: "m3",
        shipmentCount: 4,
        courierId: "c2",
        courier: { id: "c2", fullName: "Courier 2", contactPhone: null },
      }),
    ]
    const out = aggregateShipmentDistributionByCourier(rows)
    expect(out).toEqual([
      { courierId: "c2", courierName: "Courier 2", shipmentCount: 4 },
      { courierId: "c1", courierName: "Courier 1", shipmentCount: 3 },
    ])
  })
})
