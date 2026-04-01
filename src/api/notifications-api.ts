import { apiFetch } from "@/api/client"

export type NotificationDto = {
  id: string
  userId: string
  channel: string
  type: string
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
  params?: { unreadOnly?: boolean; page?: number; pageSize?: number },
): Promise<NotificationListResponse> {
  const u = new URLSearchParams()
  if (params?.unreadOnly) u.set("unreadOnly", "true")
  if (params?.page) u.set("page", String(params.page))
  if (params?.pageSize) u.set("pageSize", String(params.pageSize))
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
