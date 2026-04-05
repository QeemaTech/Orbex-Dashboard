import type { TFunction } from "i18next"

export function backendShipmentTransferLabel(t: TFunction, value: string): string {
  return t(`backend.shipmentTransferStatus.${value}`, { defaultValue: value })
}

export function backendPackageDeliveryLabel(t: TFunction, value: string): string {
  return t(`backend.packageDeliveryStatus.${value}`, { defaultValue: value })
}

export function backendPackagePaymentLabel(t: TFunction, value: string): string {
  return t(`backend.packagePaymentStatus.${value}`, { defaultValue: value })
}
