/**
 * Matches backend `toListResponseShipmentStatuses` (merchant-order.dto.ts):
 * line awaiting CS outbound confirmation at hub — PENDING_PICKUP, batch IN_WAREHOUSE, not yet csConfirmedAt.
 */
export function canConfirmCsForShipmentLine(row: {
  status: string
  transferStatus?: string | null
  csConfirmedAt?: string | null
}): boolean {
  if (row.status !== "PENDING_PICKUP") return false
  if (row.transferStatus !== "IN_WAREHOUSE") return false
  const cs = row.csConfirmedAt
  if (cs != null && String(cs).trim() !== "") return false
  return true
}
