import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Bell } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLocation, useNavigate } from "react-router-dom"

import { ApiError } from "@/api/client"
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATION_TYPE,
  type NotificationType,
} from "@/api/notifications-api"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type AuthUser, useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

const NOTIF_QK = ["notifications", "inbox"] as const

type NotificationPayload = {
  shipmentId?: unknown
  merchantOrderId?: unknown
  trackingNumber?: unknown
  actionHint?: unknown
}

function payloadActionHint(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null
  const h = (payload as { actionHint?: unknown }).actionHint
  return typeof h === "string" && h.trim() ? h.trim() : null
}

function payloadString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function notificationTypeFallback(
  type: string,
): { title: string; body: string | null } | null {
  switch (type as NotificationType) {
    case NOTIFICATION_TYPE.SHIPMENT_DELIVERED:
      return { title: "Shipment delivered", body: "The shipment has been delivered successfully." }
    case NOTIFICATION_TYPE.SHIPMENT_REJECTED:
      return { title: "Shipment rejected", body: "The shipment was rejected by the customer." }
    case NOTIFICATION_TYPE.SHIPMENT_POSTPONED:
      return { title: "Shipment postponed", body: "The shipment delivery has been postponed." }
    case NOTIFICATION_TYPE.SHIPMENT_OUT_FOR_DELIVERY:
      return { title: "Out for delivery", body: "The shipment is currently out for delivery." }
    case NOTIFICATION_TYPE.RETURN_OUT_FOR_RETURN_TO_MERCHANT:
      return { title: "Return started", body: "The shipment is on the way back to the merchant." }
    case NOTIFICATION_TYPE.RETURN_COMPLETED:
      return { title: "Return completed", body: "The shipment was returned to the merchant." }
    case NOTIFICATION_TYPE.MERCHANT_ORDER_RESOLVED:
      return { title: "Order resolved", body: "The merchant order has been resolved." }
    case NOTIFICATION_TYPE.MERCHANT_ORDER_FINISHED:
      return { title: "Order finished", body: "The merchant order has been completed." }
    case NOTIFICATION_TYPE.MERCHANT_ORDER_RETURNS_FINALIZED:
      return {
        title: "Returns finalized",
        body: "Return-to-merchant finalization completed for this merchant order.",
      }
    case NOTIFICATION_TYPE.MERCHANT_ORDER_IMPORT_CONFIRMED:
      return {
        title: "Import confirmed",
        body: "Your pending confirmation order import is now active.",
      }
    default:
      return null
  }
}

function resolveNotificationText(n: {
  type: string
  title: string
  body: string | null
}): { title: string; body: string | null } {
  const title = n.title?.trim() ?? ""
  const body = n.body?.trim() ?? ""
  const genericTitle = title.toLowerCase() === "shipment update"
  if (title && body && !genericTitle) {
    return { title, body }
  }
  const fallback = notificationTypeFallback(n.type)
  if (!fallback) {
    return { title: title || n.type, body: body || null }
  }
  return {
    title: title && !genericTitle ? title : fallback.title,
    body: body || fallback.body,
  }
}

function resolveNotificationHref(
  payload: unknown,
  pathname: string,
  user: AuthUser | null,
): string | null {
  if (!payload || typeof payload !== "object") return null

  const data = payload as NotificationPayload
  const shipmentId = payloadString(data.shipmentId)
  const merchantOrderId = payloadString(data.merchantOrderId)
  const inCustomerService =
    pathname.startsWith("/cs") || user?.role === "CUSTOMER_SERVICE"

  if (shipmentId) {
    return inCustomerService
      ? `/cs/shipments/${encodeURIComponent(shipmentId)}`
      : `/shipments/${encodeURIComponent(shipmentId)}`
  }
  if (merchantOrderId) {
    return inCustomerService
      ? `/cs/merchant-orders/${encodeURIComponent(merchantOrderId)}`
      : `/merchant-orders/${encodeURIComponent(merchantOrderId)}`
  }
  return null
}

export interface NotificationMenuProps {
  token: string | null
}

export function NotificationMenu({ token }: NotificationMenuProps) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const q = useQuery({
    queryKey: [...NOTIF_QK, token],
    queryFn: () => listNotifications(token!, { pageSize: 20 }),
    enabled: !!token,
    refetchInterval: 20_000,
    retry(failureCount, err) {
      if (err instanceof ApiError && err.status === 403) return false
      return failureCount < 2
    },
  })

  const unread = q.data?.notifications.filter((n) => !n.readAt) ?? []
  const unreadCount = unread.length

  const markOne = useMutation({
    mutationFn: (id: string) => markNotificationRead(token!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...NOTIF_QK, token] }),
  })

  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(token!),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...NOTIF_QK, token] }),
  })

  if (!token) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground relative shrink-0 border border-border/75 bg-white/80"
          aria-label={t("a11y.notifications")}
        >
          <Bell className="size-5" aria-hidden />
          {unreadCount > 0 ? (
            <span
              className={cn(
                "bg-destructive absolute top-1 end-1 size-2 rounded-full",
              )}
            />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[min(70vh,24rem)] overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>{t("notifications.title")}</span>
          {unreadCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              {t("notifications.markAllRead")}
            </Button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {q.isLoading ? (
          <div className="text-muted-foreground px-2 py-3 text-sm">
            {t("notifications.loading")}
          </div>
        ) : null}
        {q.data?.notifications.length === 0 ? (
          <div className="text-muted-foreground px-2 py-3 text-sm">
            {t("notifications.empty")}
          </div>
        ) : null}
        {q.data?.notifications.map((n) => {
          const hint = payloadActionHint(n.payloadJson)
          const href = resolveNotificationHref(n.payloadJson, location.pathname, user)
          const display = resolveNotificationText(n)
          return (
            <DropdownMenuItem
              key={n.id}
              className={cn(
                "flex cursor-pointer flex-col items-start gap-0.5 whitespace-normal",
                !n.readAt && "bg-accent/50",
              )}
              onClick={() => {
                if (!n.readAt) markOne.mutate(n.id)
                if (href) void navigate(href)
              }}
            >
              <span className="font-medium">{display.title}</span>
              {hint ? (
                <span className="text-amber-900/90 text-xs font-medium">
                  {hint}
                </span>
              ) : null}
              {display.body ? (
                <span className="text-muted-foreground text-xs">{display.body}</span>
              ) : null}
              <span className="text-muted-foreground text-[10px]">
                {new Date(n.createdAt).toLocaleString()}
              </span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
