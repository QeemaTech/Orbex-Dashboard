import { useQuery } from "@tanstack/react-query"
import { X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { fetchCourierLatestLocation } from "@/api/couriers-api"
import { Button } from "@/components/ui/button"

export interface CsCourierMapDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courierId: string | null
  token: string
}

export function CsCourierMapDialog({
  open,
  onOpenChange,
  courierId,
  token,
}: CsCourierMapDialogProps) {
  const { t } = useTranslation()

  const q = useQuery({
    queryKey: ["courier-latest", courierId],
    queryFn: () => fetchCourierLatestLocation(token, courierId!),
    enabled: open && !!courierId && !!token,
  })

  if (!open) return null

  const src =
    q.data &&
    `https://www.google.com/maps?q=${q.data.lat},${q.data.lng}&z=15&output=embed`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal
      aria-label={t("cs.map.title")}
    >
      <div className="bg-card flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">{t("cs.map.title")}</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label={t("cs.map.close")}
          >
            <X className="size-4" />
          </Button>
        </div>
        <div className="p-4">
          {q.isLoading ? (
            <p className="text-muted-foreground text-sm">{t("cs.map.loading")}</p>
          ) : null}
          {q.error ? (
            <p className="text-destructive text-sm">{t("cs.map.error")}</p>
          ) : null}
          {src ? (
            <iframe
              title={t("cs.map.title")}
              className="h-64 w-full rounded-md border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={src}
            />
          ) : null}
          {q.data ? (
            <a
              className="text-primary mt-2 inline-block text-sm underline"
              target="_blank"
              rel="noreferrer"
              href={`https://www.google.com/maps?q=${q.data.lat},${q.data.lng}`}
            >
              {t("cs.map.openExternal")}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  )
}
