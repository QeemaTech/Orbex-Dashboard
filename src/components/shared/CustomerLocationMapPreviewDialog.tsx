import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { useTranslation } from "react-i18next"

import {
  googleMapsSearchUrl,
  parseWarehouseLatLng,
} from "@/features/customer-service/lib/location"
import { Button } from "@/components/ui/button"

export type CustomerLocationMapPreviewDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  latitude: string | null | undefined
  longitude: string | null | undefined
}

/** In-app map preview for **customer delivery** coordinates (not courier tracking). */
export function CustomerLocationMapPreviewDialog({
  open,
  onOpenChange,
  latitude,
  longitude,
}: CustomerLocationMapPreviewDialogProps) {
  const { t } = useTranslation()
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setPortalTarget(document.body)
  }, [])

  if (!open || !portalTarget) return null

  const mapCoords = parseWarehouseLatLng(
    latitude != null ? String(latitude) : null,
    longitude != null ? String(longitude) : null,
  )
  const href = mapCoords ? googleMapsSearchUrl(mapCoords) : null
  const src =
    mapCoords && `${googleMapsSearchUrl(mapCoords)}&z=16&output=embed`

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal
      aria-label={t("cs.customerPinMap.title")}
    >
      <div className="bg-card flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">{t("cs.customerPinMap.title")}</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label={t("cs.customerPinMap.close")}
          >
            <X className="size-4" />
          </Button>
        </div>
        <div className="p-4">
          {!mapCoords ? (
            <p className="text-muted-foreground text-sm">{t("cs.customerPinMap.noCoords")}</p>
          ) : null}
          {src ? (
            <iframe
              title={t("cs.customerPinMap.title")}
              className="h-64 w-full rounded-md border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={src}
            />
          ) : null}
          {href ? (
            <a
              className="text-primary mt-2 inline-block text-sm underline"
              target="_blank"
              rel="noreferrer"
              href={href}
            >
              {t("cs.customerPinMap.openExternal")}
            </a>
          ) : null}
        </div>
      </div>
    </div>,
    portalTarget,
  )
}
