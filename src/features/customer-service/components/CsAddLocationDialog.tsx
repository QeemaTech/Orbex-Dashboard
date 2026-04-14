import { useEffect, useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Copy, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import {
  merchantOrderBatchId,
  patchShipmentFields,
  type CsShipmentRow,
  type ShipmentListResponse,
} from "@/api/merchant-orders-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  extractShipmentLocation,
  parseCoordinatesFromLocationInput,
  upsertShipmentLocationNotes,
} from "@/features/customer-service/lib/location"
import { showToast } from "@/lib/toast"

export interface CsAddLocationDialogProps {
  open: boolean
  row: CsShipmentRow | null
  token: string
  listQueryKey: unknown[]
  onOpenChange: (open: boolean) => void
}

export function CsAddLocationDialog({
  open,
  row,
  token,
  listQueryKey,
  onOpenChange,
}: CsAddLocationDialogProps) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [locationText, setLocationText] = useState("")
  const [locationLink, setLocationLink] = useState("")

  const defaults = useMemo(() => {
    if (!row) return { text: "", link: "" }
    const fromNotes = extractShipmentLocation(row.notes)
    return {
      text: fromNotes.locationText,
      link: fromNotes.locationLink ?? "",
    }
  }, [row])

  useEffect(() => {
    if (open) {
      setLocationText(defaults.text)
      setLocationLink(defaults.link)
    }
  }, [open, defaults])

  const copyPayload = [locationText.trim(), locationLink.trim()]
    .filter(Boolean)
    .join("\n")

  const patchMut = useMutation({
    mutationFn: async () => {
      if (!row) throw new Error(t("cs.addLocation.errors.noShipment"))
      const trimmedText = locationText.trim()
      const trimmedLink = locationLink.trim()
      if (!trimmedText && !trimmedLink) {
        throw new Error(t("cs.addLocation.errors.emptyLocation"))
      }
      const current = extractShipmentLocation(row.notes)
      if (
        current.locationText === trimmedText &&
        (current.locationLink ?? "") === trimmedLink
      ) {
        throw new Error(t("cs.addLocation.errors.noChanges"))
      }
      const coords =
        parseCoordinatesFromLocationInput(trimmedLink) ??
        parseCoordinatesFromLocationInput(trimmedText)
      if (trimmedLink && !coords) {
        throw new Error(t("cs.addLocation.errors.invalidLink"))
      }
      const nextNotes = upsertShipmentLocationNotes(row.notes, {
        locationText: trimmedText,
        locationLink: trimmedLink || null,
      })
      return patchShipmentFields({
        token,
        shipmentId: merchantOrderBatchId(row),
        notes: nextNotes,
        ...(coords ? { customerLat: String(coords.lat) } : {}),
        ...(coords ? { customerLng: String(coords.lng) } : {}),
      })
    },
    onSuccess: (updatedRow) => {
      const parsedLocation = extractShipmentLocation(updatedRow.notes)
      qc.setQueryData(listQueryKey, (current: unknown): unknown => {
        if (!current || typeof current !== "object") return current

        if (
          "shipments" in current &&
          Array.isArray((current as { shipments?: unknown }).shipments)
        ) {
          const list = current as ShipmentListResponse
          return {
            ...list,
            shipments: list.shipments.map((shipment) =>
              merchantOrderBatchId(shipment) === merchantOrderBatchId(updatedRow)
                ? {
                    ...shipment,
                    ...updatedRow,
                    id: shipment.id,
                    shipmentId: shipment.shipmentId,
                    locationText: parsedLocation.locationText,
                    locationLink: parsedLocation.locationLink,
                  }
                : shipment,
            ),
          }
        }

        if (
          "shipmentId" in current &&
          merchantOrderBatchId(current as CsShipmentRow) ===
            merchantOrderBatchId(updatedRow)
        ) {
          const detail = current as CsShipmentRow
          return {
            ...detail,
            ...updatedRow,
            shipmentId: detail.shipmentId,
            primaryOrderId: detail.primaryOrderId,
            id: detail.id,
            locationText: parsedLocation.locationText,
            locationLink: parsedLocation.locationLink,
          }
        }

        return current
      })
      void qc.invalidateQueries({ queryKey: listQueryKey })
      showToast(t("cs.addLocation.saved"), "success")
      onOpenChange(false)
    },
    onError: () => {
      showToast(t("cs.addLocation.errors.saveFailed"), "error")
    },
  })

  const onCopy = async () => {
    if (!copyPayload) {
      showToast(t("cs.addLocation.errors.emptyLocation"), "error")
      return
    }
    try {
      await navigator.clipboard.writeText(copyPayload)
      showToast(t("cs.addLocation.copied"), "success")
    } catch {
      showToast(t("cs.addLocation.errors.copyFailed"), "error")
    }
  }

  if (!open || !row) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal
      aria-label={t("cs.addLocation.title")}
    >
      <div className="bg-card flex w-full max-w-lg flex-col rounded-lg border shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">{t("cs.addLocation.title")}</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label={t("cs.addLocation.close")}
          >
            <X className="size-4" />
          </Button>
        </div>
        <div className="space-y-3 p-4">
          <p className="text-muted-foreground text-sm">
            {t("cs.addLocation.description", { customerName: row.customerName })}
          </p>

          <div className="space-y-2">
            <p className="text-sm font-medium">{t("cs.addLocation.locationTextLabel")}</p>
            <textarea
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-20 w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              placeholder={t("cs.addLocation.locationTextPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{t("cs.addLocation.locationLinkLabel")}</p>
            <Input
              value={locationLink}
              onChange={(e) => setLocationLink(e.target.value)}
              placeholder={t("cs.addLocation.locationLinkPlaceholder")}
            />
          </div>

          {patchMut.isError ? (
            <p className="text-destructive text-xs">
              {(patchMut.error as Error).message}
            </p>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 border-t px-4 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCopy}
          >
            <Copy className="me-1 size-4" aria-hidden />
            {t("cs.addLocation.copy")}
          </Button>
          <Button
            type="button"
            onClick={() => patchMut.mutate()}
            disabled={patchMut.isPending}
          >
            {patchMut.isPending
              ? t("cs.addLocation.saving")
              : t("cs.addLocation.save")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            {t("cs.addLocation.cancel")}
          </Button>
        </div>
      </div>
    </div>
  )
}
