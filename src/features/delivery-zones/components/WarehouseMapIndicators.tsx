import { Circle } from "@react-google-maps/api"

import type { WarehouseSiteRow } from "@/api/warehouse-api"

type WarehouseMapIndicatorsProps = {
  warehouses: WarehouseSiteRow[]
}

function toNumber(value: unknown): number | null {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

export function WarehouseMapIndicators({ warehouses }: WarehouseMapIndicatorsProps) {
  return (
    <>
      {warehouses.map((warehouse) => {
        const lat = toNumber(warehouse.latitude)
        const lng = toNumber(warehouse.longitude)
        if (lat == null || lng == null) return null
        const isMain = warehouse.mainBranchId == null
        return (
          <Circle
            key={warehouse.id}
            center={{ lat, lng }}
            radius={isMain ? 220 : 140}
            options={{
              strokeColor: isMain ? "#ea580c" : "#7c3aed",
              strokeOpacity: 1,
              strokeWeight: 2,
              fillColor: isMain ? "#ea580c" : "#7c3aed",
              fillOpacity: 0.48,
              clickable: false,
              zIndex: 30,
            }}
          />
        )
      })}
    </>
  )
}

