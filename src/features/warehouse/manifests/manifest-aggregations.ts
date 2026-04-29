import type { CourierManifestRow } from "@/api/courier-manifests-api"

export type CourierZoneLoadRow = {
  key: string
  courierId: string
  courierName: string
  zoneId: string
  zoneName: string
  shipmentCount: number
}

export type CourierDistributionRow = {
  courierId: string
  courierName: string
  shipmentCount: number
}

export function aggregateCourierLoadByZone(
  manifests: CourierManifestRow[],
): CourierZoneLoadRow[] {
  const map = new Map<string, CourierZoneLoadRow>()
  for (const manifest of manifests) {
    const courierName = manifest.courier.fullName?.trim() || manifest.courier.id
    const zoneName = manifest.deliveryZone.name?.trim() || manifest.deliveryZone.id
    const key = `${manifest.courierId}:${manifest.deliveryZoneId}`
    const prev = map.get(key)
    if (prev) {
      prev.shipmentCount += manifest.shipmentCount
      continue
    }
    map.set(key, {
      key,
      courierId: manifest.courierId,
      courierName,
      zoneId: manifest.deliveryZoneId,
      zoneName,
      shipmentCount: manifest.shipmentCount,
    })
  }
  return [...map.values()].sort((a, b) => b.shipmentCount - a.shipmentCount)
}

export function aggregateShipmentDistributionByCourier(
  manifests: CourierManifestRow[],
): CourierDistributionRow[] {
  const map = new Map<string, CourierDistributionRow>()
  for (const manifest of manifests) {
    const courierName = manifest.courier.fullName?.trim() || manifest.courier.id
    const prev = map.get(manifest.courierId)
    if (prev) {
      prev.shipmentCount += manifest.shipmentCount
      continue
    }
    map.set(manifest.courierId, {
      courierId: manifest.courierId,
      courierName,
      shipmentCount: manifest.shipmentCount,
    })
  }
  return [...map.values()].sort((a, b) => b.shipmentCount - a.shipmentCount)
}
