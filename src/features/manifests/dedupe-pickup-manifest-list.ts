import type { WarehouseMovementManifestStatus } from "@/api/shipments-api"

export type PickupManifestListRow = {
  id: string
  status: WarehouseMovementManifestStatus
  transferDate: string | null
  fromWarehouseId: string
  toWarehouseId: string | null
  assignedPickupCourierId: string
  createdAt: string
  taskCount: number
}

function calendarDayKey(m: PickupManifestListRow): string {
  return m.transferDate ?? m.createdAt.slice(0, 10)
}

/**
 * Collapses multiple `WarehouseMovementManifest` rows that share the same courier-day bucket
 * (origin warehouse + pickup courier + calendar day) into a single list row. Chooses the
 * representative manifest with the highest task count, then oldest `createdAt`.
 */
export function dedupePickupManifestsByCourierDay(rows: PickupManifestListRow[]): PickupManifestListRow[] {
  const groups = new Map<string, PickupManifestListRow[]>()
  for (const m of rows) {
    const key = `${m.fromWarehouseId}\0${m.assignedPickupCourierId}\0${calendarDayKey(m)}`
    const list = groups.get(key) ?? []
    list.push(m)
    groups.set(key, list)
  }
  const out: PickupManifestListRow[] = []
  for (const list of groups.values()) {
    if (list.length === 1) {
      out.push(list[0]!)
      continue
    }
    const rep = [...list].sort((a, b) => {
      if (b.taskCount !== a.taskCount) return b.taskCount - a.taskCount
      return a.createdAt.localeCompare(b.createdAt)
    })[0]!
    out.push(rep)
  }
  return out
}
