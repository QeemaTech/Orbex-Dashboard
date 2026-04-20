import type { TFunction } from "i18next"

/** Line-level statuses where physical hub matters for display. */
export const WAREHOUSE_PHYSICAL_LINE_STATUSES = new Set([
  "IN_WAREHOUSE",
  "RETURNED_TO_WAREHOUSE",
])

export function orderDeliveryWarehouseHintLabel(
  status: string | null | undefined,
  opts: {
    locationWarehouseId?: string | null
    locationWarehouseName?: string | null
    contextWarehouseId?: string | null
  },
  t: TFunction,
): string | null {
  const s = String(status ?? "").trim().toUpperCase()
  if (!WAREHOUSE_PHYSICAL_LINE_STATUSES.has(s)) return null

  const locId = opts.locationWarehouseId?.trim() ?? ""
  const locName = opts.locationWarehouseName?.trim() ?? ""
  const ctxId = opts.contextWarehouseId?.trim() ?? ""

  if (!locId && !locName) return null

  if (ctxId && locId && ctxId === locId) {
    return String(t("warehouse.context.thisWarehouse"))
  }

  if (locName) {
    return String(t("warehouse.context.atNamedWarehouse", { name: locName }))
  }

  return null
}

/** Batch pipeline: hub assignment matters when transfer is IN_WAREHOUSE. */
export function merchantBatchWarehouseHintLabel(
  transferStatus: string | null | undefined,
  opts: {
    assignedWarehouseId?: string | null
    assignedWarehouseName?: string | null
    contextWarehouseId?: string | null
  },
  t: TFunction,
): string | null {
  const s = String(transferStatus ?? "").trim().toUpperCase()
  if (s !== "IN_WAREHOUSE") return null

  const awId = opts.assignedWarehouseId?.trim() ?? ""
  const awName = opts.assignedWarehouseName?.trim() ?? ""
  const ctxId = opts.contextWarehouseId?.trim() ?? ""

  if (!awId && !awName) return null

  if (ctxId && awId && ctxId === awId) {
    return String(t("warehouse.context.thisWarehouse"))
  }

  if (awName) {
    return String(t("warehouse.context.atNamedWarehouse", { name: awName }))
  }

  return null
}
