import { apiFetch } from "@/api/client"

export const NOTIFICATION_TYPE = {
  SHIPMENT_DELIVERED: "SHIPMENT_DELIVERED",
  SHIPMENT_REJECTED: "SHIPMENT_REJECTED",
  SHIPMENT_POSTPONED: "SHIPMENT_POSTPONED",
  SHIPMENT_OUT_FOR_DELIVERY: "SHIPMENT_OUT_FOR_DELIVERY",
  RETURN_OUT_FOR_RETURN_TO_MERCHANT: "RETURN_OUT_FOR_RETURN_TO_MERCHANT",
  RETURN_COMPLETED: "RETURN_COMPLETED",
  MERCHANT_ORDER_RESOLVED: "MERCHANT_ORDER_RESOLVED",
  MERCHANT_ORDER_FINISHED: "MERCHANT_ORDER_FINISHED",
  MERCHANT_ORDER_RETURNS_FINALIZED: "MERCHANT_ORDER_RETURNS_FINALIZED",
  MERCHANT_ORDER_IMPORT_CONFIRMED: "MERCHANT_ORDER_IMPORT_CONFIRMED",
} as const

export type NotificationType =
  (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE]

export type NotificationDto = {
  id: string
  userId: string
  channel: string
  type: NotificationType | string
  title: string
  body: string | null
  payloadJson: unknown
  readAt: string | null
  createdAt: string
}

export type NotificationListResponse = {
  notifications: NotificationDto[]
  total: number
  page: number
  pageSize: number
}

export async function listNotifications(
  token: string,
  params?: {
    unreadOnly?: boolean
    page?: number
    pageSize?: number
    /** Comma-separated backend notification `type` values (e.g. CS_PACKAGE_DELIVERED). */
    types?: string
    /** Filter to CS order-delivery notifications for this status. */
    orderDeliveryStatus?: string
    createdFrom?: string
    createdTo?: string
  },
): Promise<NotificationListResponse> {
  const u = new URLSearchParams()
  if (params?.unreadOnly) u.set("unreadOnly", "true")
  if (params?.page) u.set("page", String(params.page))
  if (params?.pageSize) u.set("pageSize", String(params.pageSize))
  if (params?.types?.trim()) u.set("types", params.types.trim())
  if (params?.orderDeliveryStatus?.trim()) {
    u.set("orderDeliveryStatus", params.orderDeliveryStatus.trim())
  }
  if (params?.createdFrom) u.set("createdFrom", params.createdFrom)
  if (params?.createdTo) u.set("createdTo", params.createdTo)
  const q = u.toString()
  return apiFetch<NotificationListResponse>(
    `/api/notifications${q ? `?${q}` : ""}`,
    { token },
  )
}

export async function markNotificationRead(
  token: string,
  id: string,
): Promise<void> {
  await apiFetch<void>(`/api/notifications/${id}/read`, {
    method: "PATCH",
    token,
  })
}

export async function markAllNotificationsRead(token: string): Promise<void> {
  await apiFetch<{ updated: number }>("/api/notifications/read-all", {
    method: "POST",
    token,
  })
}
