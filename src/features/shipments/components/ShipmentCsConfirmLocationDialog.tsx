import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ApiError } from "@/api/client"
import { resolveMapsLink } from "@/api/maps-api"
import { confirmShipmentCustomerLocation } from "@/api/shipments-api"
import { CustomerLocationMapPreviewDialog } from "@/components/shared/CustomerLocationMapPreviewDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  googleMapsSearchUrl,
  parseCoordinatesFromLocationInput,
  parseWarehouseLatLng,
} from "@/features/customer-service/lib/location"
import { showToast } from "@/lib/toast"

function normalizeUrlCandidate(value: string): string {
  const compact = value.trim()
  if (!compact) return compact
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(compact)) return compact
  if (compact.startsWith("//")) return `https:${compact}`
  if (/^(www\.)?(maps\.app\.goo\.gl|google\.[^/\s]+|maps\.[^/\s]+)/i.test(compact)) {
    return `https://${compact}`
  }
  return compact
}

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
  const [previewOpen, setPreviewOpen] = useState(false)
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)
  const [resolvedCoords, setResolvedCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [resolvingLink, setResolvingLink] = useState(false)

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
      setPreviewOpen(false)
      setResolvedCoords(null)
    }
  }, [open, defaults])

  const parsedCoords = useMemo(() => {
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
    return fromLink ?? fromText ?? resolvedCoords ?? fromSaved
  }, [initialLat, initialLng, locationLink, locationText])

  // Auto-resolve short / redirecting maps links on the server (browser can't due to CORS).
  useEffect(() => {
    if (!open) return
    const raw = locationLink.trim()
    if (!raw) {
      setResolvedCoords(null)
      return
    }
    // If we already can parse coordinates locally, don't resolve.
    if (parseCoordinatesFromLocationInput(raw)) {
      setResolvedCoords(null)
      return
    }
    // Only resolve plausible URLs.
    const candidate = normalizeUrlCandidate(raw)
    if (!candidate) {
      setResolvedCoords(null)
      return
    }

    let cancelled = false
    setResolvingLink(true)
    void resolveMapsLink({ token, url: candidate })
      .then((data) => {
        if (cancelled) return
        if (data.coords && Number.isFinite(data.coords.lat) && Number.isFinite(data.coords.lng)) {
          setResolvedCoords({ lat: data.coords.lat, lng: data.coords.lng })
        } else {
          setResolvedCoords(null)
        }
      })
      .catch(() => {
        if (cancelled) return
        setResolvedCoords(null)
      })
      .finally(() => {
        if (cancelled) return
        setResolvingLink(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, locationLink, token])

  const mut = useMutation({
    mutationFn: async () => {
      const coords = parsedCoords
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
  const canPreviewMap = Boolean(
    parsedCoords &&
      Number.isFinite(parsedCoords.lat) &&
      Number.isFinite(parsedCoords.lng),
  )
  const previewHref = parsedCoords ? googleMapsSearchUrl(parsedCoords) : null
  const externalRawLink = locationLink.trim()
  const externalHref = externalRawLink ? normalizeUrlCandidate(externalRawLink) : null
  const isGoogleShortLink = useMemo(() => {
    if (!externalHref) return false
    try {
      const u = new URL(externalHref)
      return /(^|\.)maps\.app\.goo\.gl$/i.test(u.hostname)
    } catch {
      return false
    }
  }, [externalHref])

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

          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">
              {t("cs.csLineConfirm.locationPreviewLabel", {
                defaultValue: "Location preview",
              })}
            </p>
            <p className="text-muted-foreground text-xs">
              {canPreviewMap
                ? `${parsedCoords!.lat.toFixed(6)}, ${parsedCoords!.lng.toFixed(6)}`
                : t("cs.csLineConfirm.locationPreviewEmpty", {
                    defaultValue: "No valid coordinates detected yet.",
                  })}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canPreviewMap}
                onClick={() => setPreviewOpen(true)}
              >
                {t("cs.csLineConfirm.previewMap", { defaultValue: "Preview map" })}
              </Button>
              {previewHref ? (
                <a
                  className="text-primary inline-flex items-center text-sm underline"
                  href={previewHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("cs.customerPinMap.openExternal")}
                </a>
              ) : externalHref ? (
                <a
                  className="text-primary inline-flex items-center text-sm underline"
                  href={externalHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("cs.customerPinMap.openExternal")}
                </a>
              ) : null}
            </div>
            {resolvingLink && !canPreviewMap ? (
              <p className="text-muted-foreground mt-2 text-xs">
                {t("cs.csLineConfirm.resolvingLink", { defaultValue: "Resolving maps link…" })}
              </p>
            ) : null}
          </div>

          <p className="text-muted-foreground text-xs">
            {t("cs.csLineConfirm.coordsHint")}
            {!canPreviewMap && isGoogleShortLink ? (
              <>
                {" "}
                {t("cs.csLineConfirm.shortLinkHint", {
                  defaultValue:
                    "Google short links (maps.app.goo.gl) may not include coordinates. Open the link, then copy/paste the final Google Maps URL that contains “@lat,lng” or paste the coordinates directly.",
                })}
              </>
            ) : null}
          </p>
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
      <CustomerLocationMapPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        latitude={canPreviewMap ? String(parsedCoords!.lat) : null}
        longitude={canPreviewMap ? String(parsedCoords!.lng) : null}
      />
    </div>,
    portalTarget,
  )
}
