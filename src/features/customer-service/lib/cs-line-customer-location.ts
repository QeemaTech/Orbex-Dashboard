/**
 * Helpers for **CS hub line confirmation** with customer delivery coordinates.
 * Not merchant-order pickup / batch transfer — only the line awaiting CS at hub with batch IN_WAREHOUSE.
 */
import type { CsShipmentRow, ShipmentOrderRow } from "@/api/merchant-orders-api"
import { merchantOrderBatchId } from "@/api/merchant-orders-api"
import { extractShipmentLocation } from "@/features/customer-service/lib/location"

/** Saved pin after CS confirmed the line and GPS was stored on Customer. */
export function hasCsConfirmedCustomerLocationPin(row: {
  csConfirmedAt?: string | null
  customer?: { customerLat?: string | null; customerLng?: string | null }
  customerLat?: string | null
  customerLng?: string | null
}): boolean {
  const cs = row.csConfirmedAt
  if (cs == null || String(cs).trim() === "") return false
  const lat = row.customer?.customerLat ?? row.customerLat
  const lng = row.customer?.customerLng ?? row.customerLng
  return Boolean(String(lat ?? "").trim() && String(lng ?? "").trim())
}

export function resolveCustomerLatLng(row: {
  customer?: { customerLat?: string | null; customerLng?: string | null }
  customerLat?: string | null
  customerLng?: string | null
}): { lat: string; lng: string } | null {
  const lat = row.customer?.customerLat ?? row.customerLat
  const lng = row.customer?.customerLng ?? row.customerLng
  const ls = String(lat ?? "").trim()
  const gs = String(lng ?? "").trim()
  if (!ls || !gs) return null
  return { lat: ls, lng: gs }
}

export function csLineConfirmDialogDefaultsFromShipmentOrder(line: ShipmentOrderRow) {
  const loc = extractShipmentLocation(line.notes)
  return {
    merchantOrderId: merchantOrderBatchId(line),
    lineId: line.id,
    customerName: line.customer.customerName,
    initialAddressText: line.customer.addressText ?? "",
    initialLocationText: loc.locationText,
    initialLocationLink: loc.locationLink ?? "",
    initialLat: line.customer.customerLat ?? null,
    initialLng: line.customer.customerLng ?? null,
  }
}

export function csLineConfirmDialogDefaultsFromCsRow(row: CsShipmentRow) {
  const loc = extractShipmentLocation(row.notes)
  return {
    merchantOrderId: merchantOrderBatchId(row),
    lineId: row.id,
    customerName: row.customerName,
    initialAddressText: row.addressText ?? "",
    initialLocationText: loc.locationText,
    initialLocationLink: loc.locationLink ?? "",
    initialLat: row.customerLat ?? null,
    initialLng: row.customerLng ?? null,
  }
}
