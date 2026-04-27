import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ApiError } from "@/api/client"
import { confirmShipmentCustomerLocation } from "@/api/shipments-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  parseCoordinatesFromLocationInput,
  parseWarehouseLatLng,
} from "@/features/customer-service/lib/location"
import { showToast } from "@/lib/toast"

export type ShipmentCsConfirmLocationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  token: string
  lineId: string
  customerName: string
  initialAddressText: string
  initialLocationText: string
  initialLocationLink: string
  initialLat: string | null | undefined
  initialLng: string | null | undefined
  extraInvalidateQueryKeys?: unknown[][]
}

/**
 * Modal: confirm **shipment line at hub** (CS) with mandatory customer delivery coordinates.
 * Does not change merchant-order pickup / batch transfer — only this line + Customer GPS + csConfirmedAt.
 */
export function ShipmentCsConfirmLocationDialog({
  open,
  onOpenChange,
  token,
  lineId,
  customerName,
  initialAddressText,
  initialLocationText,
  initialLocationLink,
  initialLat,
  initialLng,
  extraInvalidateQueryKeys,
}: ShipmentCsConfirmLocationDialogProps) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [addressText, setAddressText] = useState("")
  const [locationText, setLocationText] = useState("")
  const [locationLink, setLocationLink] = useState("")
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setPortalTarget(document.body)
  }, [])

  const defaults = useMemo(
    () => ({
      addressText: initialAddressText,
      locationText: initialLocationText,
      locationLink: initialLocationLink,
    }),
    [initialAddressText, initialLocationText, initialLocationLink],
  )

  useEffect(() => {
    if (open) {
      setAddressText(defaults.addressText)
      setLocationText(defaults.locationText)
      setLocationLink(defaults.locationLink)
    }
  }, [open, defaults])

  const mut = useMutation({
    mutationFn: async () => {
      const trimmedLink = locationLink.trim()
      const trimmedText = locationText.trim()
      const fromLink = trimmedLink
        ? parseCoordinatesFromLocationInput(trimmedLink)
        : null
      const fromText = trimmedText
        ? parseCoordinatesFromLocationInput(trimmedText)
        : null
      const fromSaved = parseWarehouseLatLng(
        initialLat != null ? String(initialLat) : null,
        initialLng != null ? String(initialLng) : null,
      )
      const coords = fromLink ?? fromText ?? fromSaved
      if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) {
        throw new Error(t("cs.csLineConfirm.errors.needCoords"))
      }
      const addr = addressText.trim()
      return confirmShipmentCustomerLocation({
        token,
        lineId,
        customerLat: coords.lat,
        customerLng: coords.lng,
        ...(addr ? { addressText: addr } : {}),
      })
    },
    onSuccess: () => {
      showToast(t("cs.csLineConfirm.success"), "success")
      void qc.invalidateQueries({ queryKey: ["shipment", "detail", lineId, token] })
      void qc.invalidateQueries({ queryKey: ["shipment", "detail"] })
      for (const queryKey of extraInvalidateQueryKeys ?? []) {
        void qc.invalidateQueries({ queryKey })
      }
      onOpenChange(false)
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError && err.message
          ? err.message
          : err instanceof Error
            ? err.message
            : t("cs.csLineConfirm.errors.failed")
      showToast(msg, "error")
    },
  })

  if (!open || !portalTarget) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal
      aria-label={t("cs.csLineConfirm.title")}
    >
      <div className="bg-card flex w-full max-w-lg flex-col rounded-lg border shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">{t("cs.csLineConfirm.title")}</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label={t("cs.csLineConfirm.close")}
          >
            <X className="size-4" />
          </Button>
        </div>
        <div className="space-y-3 p-4">
          <p className="text-muted-foreground text-sm">
            {t("cs.csLineConfirm.description", { customerName })}
          </p>

          <div className="space-y-2">
            <p className="text-sm font-medium">{t("cs.csLineConfirm.addressLabel")}</p>
            <textarea
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-16 w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1"
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
              placeholder={t("cs.csLineConfirm.addressPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{t("cs.csLineConfirm.locationTextLabel")}</p>
            <textarea
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-16 w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              placeholder={t("cs.csLineConfirm.locationTextPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{t("cs.csLineConfirm.locationLinkLabel")}</p>
            <Input
              value={locationLink}
              onChange={(e) => setLocationLink(e.target.value)}
              placeholder={t("cs.csLineConfirm.locationLinkPlaceholder")}
            />
          </div>

          <p className="text-muted-foreground text-xs">{t("cs.csLineConfirm.coordsHint")}</p>
        </div>
        <div className="flex justify-end gap-2 border-t px-4 py-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("cs.csLineConfirm.cancel")}
          </Button>
          <Button type="button" disabled={mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? t("cs.csLineConfirm.submitting") : t("cs.csLineConfirm.submit")}
          </Button>
        </div>
      </div>
    </div>,
    portalTarget,
  )
}
