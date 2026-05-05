import type { ManifestRouteStop } from "@/api/delivery-manifests-api"
import type { MovementManifestUnifiedTask } from "@/api/shipments-api"

function isTransferTask(
  t: MovementManifestUnifiedTask,
): t is Extract<MovementManifestUnifiedTask, { kind: "SHIPMENT_TASK" }> {
  return t.kind === "SHIPMENT_TASK" && t.taskType === "TRANSFER"
}

/**
 * Reorders unified manifest tasks to match `orderedStops` from route preview (pickup task id and
 * `returnOrder:${merchantOrderId}`). TRANSFER rows are not on the route; they are appended in original order.
 */
export function orderMovementManifestTasksByRoute(
  tasks: MovementManifestUnifiedTask[],
  orderedStops: ManifestRouteStop[],
): MovementManifestUnifiedTask[] {
  const transfers = tasks.filter(isTransferTask)
  const nonTransfers = tasks.filter((t) => !isTransferTask(t))

  const pickupById = new Map(
    nonTransfers
      .filter((t): t is Extract<MovementManifestUnifiedTask, { kind: "PICKUP_TASK" }> => t.kind === "PICKUP_TASK")
      .map((t) => [t.id, t]),
  )
  const returnGroupByStopId = new Map<
    string,
    Extract<MovementManifestUnifiedTask, { kind: "RETURN_TO_MERCHANT_GROUP" }>
  >(
    nonTransfers
      .filter(
        (t): t is Extract<MovementManifestUnifiedTask, { kind: "RETURN_TO_MERCHANT_GROUP" }> =>
          t.kind === "RETURN_TO_MERCHANT_GROUP",
      )
      .map((t) => [`returnOrder:${t.merchantOrderId}`, t]),
  )

  const sortedStops = [...orderedStops].sort((a, b) => a.order - b.order)
  const usedPickup = new Set<string>()
  const usedReturnGroup = new Set<string>()
  const result: MovementManifestUnifiedTask[] = []

  for (const stop of sortedStops) {
    const sid = String(stop.shipmentId ?? "")
    const pickup = pickupById.get(sid)
    if (pickup) {
      if (!usedPickup.has(sid)) {
        usedPickup.add(sid)
        result.push(pickup)
      }
      continue
    }
    if (sid.startsWith("returnOrder:")) {
      const g = returnGroupByStopId.get(sid)
      if (g && !usedReturnGroup.has(g.merchantOrderId)) {
        usedReturnGroup.add(g.merchantOrderId)
        result.push(g)
      }
    }
  }

  for (const t of nonTransfers) {
    if (t.kind === "PICKUP_TASK") {
      if (!usedPickup.has(t.id)) result.push(t)
    } else if (t.kind === "RETURN_TO_MERCHANT_GROUP") {
      if (!usedReturnGroup.has(t.merchantOrderId)) result.push(t)
    }
  }

  result.push(...transfers)
  return result
}
