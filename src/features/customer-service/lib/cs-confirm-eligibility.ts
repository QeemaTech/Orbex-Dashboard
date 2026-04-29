export function canConfirmCsForShipmentLine(row: {
  status?: string
  transferStatus?: string | null
  csConfirmedAt?: string | null
}): boolean {
  const cs = row.csConfirmedAt
  return !(cs != null && String(cs).trim() !== "")
}
