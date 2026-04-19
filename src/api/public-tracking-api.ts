import { publicApiFetch } from "@/api/client"

export type PublicTrackingPayload = {
  trackingNumber: string
  status: string
  postponedAt: string | null
  paymentMethod: string
  shipmentValue: string
  shippingFee: string
  deliveryCourier: {
    fullName: string | null
    contactPhone: string | null
  } | null
  currentWarehouse: { name: string } | null
}

export function getPublicTracking(trackingNumber: string): Promise<PublicTrackingPayload> {
  const tn = encodeURIComponent(trackingNumber)
  return publicApiFetch<PublicTrackingPayload>(`/api/public/track/${tn}`)
}
