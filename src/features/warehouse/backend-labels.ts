import type { TFunction } from "i18next"

export function backendShipmentTransferLabel(t: TFunction, value: string): string {
  return t(`backend.shipmentTransferStatus.${value}`, { defaultValue: value })
}

export function backendOrderDeliveryLabel(t: TFunction, value: string): string {
  return t(`backend.orderDeliveryStatus.${value}`, { defaultValue: value })
}

export function backendOrderPaymentLabel(t: TFunction, value: string): string {
  return t(`backend.orderPaymentStatus.${value}`, { defaultValue: value })
}
