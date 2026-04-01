import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Bell } from "lucide-react"
import { useTranslation } from "react-i18next"

import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
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
import { cn } from "@/lib/utils"

const NOTIF_QK = ["notifications", "inbox"] as const

export interface NotificationMenuProps {
  token: string | null
}

export function NotificationMenu({ token }: NotificationMenuProps) {
  const { t } = useTranslation()
  const qc = useQueryClient()

  const q = useQuery({
    queryKey: [...NOTIF_QK, token],
    queryFn: () => listNotifications(token!, { pageSize: 20 }),
    enabled: !!token,
    refetchInterval: 20_000,
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
          className="text-muted-foreground relative shrink-0"
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
        {q.data?.notifications.map((n) => (
          <DropdownMenuItem
            key={n.id}
            className={cn(
              "flex cursor-pointer flex-col items-start gap-0.5 whitespace-normal",
              !n.readAt && "bg-accent/50",
            )}
            onClick={() => {
              if (!n.readAt) markOne.mutate(n.id)
            }}
          >
            <span className="font-medium">{n.title}</span>
            {n.body ? (
              <span className="text-muted-foreground text-xs">{n.body}</span>
            ) : null}
            <span className="text-muted-foreground text-[10px]">
              {new Date(n.createdAt).toLocaleString()}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
