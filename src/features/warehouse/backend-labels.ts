import type { TFunction } from "i18next"

import type { CsShipmentStatusEvent } from "@/api/merchant-orders-api"

export function backendEnumUnknown(t: TFunction): string {
  return t("backend.enumUnknown")
}

function withUnknownDefault(t: TFunction, key: string): string {
  return t(key, { defaultValue: backendEnumUnknown(t) })
}

export function backendShipmentTransferLabel(t: TFunction, value: string): string {
  const v = value?.trim()
  if (!v) return backendEnumUnknown(t)
  return withUnknownDefault(t, `backend.shipmentTransferStatus.${v}`)
}

export function backendOrderDeliveryLabel(t: TFunction, value: string): string {
  const v = value?.trim()
  if (!v) return backendEnumUnknown(t)
  return withUnknownDefault(t, `backend.orderDeliveryStatus.${v}`)
}

export function backendOrderPaymentLabel(t: TFunction, value: string): string {
  const v = value?.trim()
  if (!v) return backendEnumUnknown(t)
  return withUnknownDefault(t, `backend.orderPaymentStatus.${v}`)
}

export function shipmentCoreStatusLabel(t: TFunction, value: string): string {
  const v = value?.trim().toUpperCase()
  if (!v) return backendEnumUnknown(t)
  return withUnknownDefault(t, `backend.shipmentCoreStatus.${v}`)
}

export function shipmentSubStatusLabel(t: TFunction, value: string | null | undefined): string {
  const raw = (value ?? "").trim().toUpperCase()
  const keySuffix = !raw || raw === "NONE" ? "NONE" : raw
  return t(`backend.shipmentSubStatus.${keySuffix}`, {
    defaultValue: backendEnumUnknown(t),
  })
}

export function formatShipmentStatusEventLine(
  t: TFunction,
  event: Pick<
    CsShipmentStatusEvent,
    "fromCoreStatus" | "fromSubStatus" | "toCoreStatus" | "toSubStatus"
  >,
): string {
  const arrow = ` ${t("merchantOrders.detail.timelineArrow")} `
  const from =
    event.fromCoreStatus != null
      ? `${shipmentCoreStatusLabel(t, event.fromCoreStatus)}/${shipmentSubStatusLabel(t, event.fromSubStatus)}`
      : t("merchantOrders.detail.timelineStart")
  const to = `${shipmentCoreStatusLabel(t, event.toCoreStatus)}/${shipmentSubStatusLabel(t, event.toSubStatus)}`
  return `${from}${arrow}${to}`
}
