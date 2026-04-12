import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { X } from "react-lucid"

import {
  createDeliveryZone,
  listDeliveryZoneCourierOptions,
  listRegionsCatalog,
  patchDeliveryZone,
  type CourierOptionRow,
  type DeliveryZoneRow,
} from "@/api/delivery-zones-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { showToast } from "@/lib/toast"
import { DeliveryZoneGoogleMap } from "./DeliveryZoneGoogleMap"

const DEFAULT_CENTER = { lat: 30.0444, lng: 31.2357 }

type FormMode = "create" | "edit"

type DeliveryZoneFormDialogProps = {
  open: boolean
  mode: FormMode
  initial: DeliveryZoneRow | null
  token: string
  canWrite: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function DeliveryZoneFormDialog({
  open,
  mode,
  initial,
  token,
  canWrite,
  onOpenChange,
  onSaved,
}: DeliveryZoneFormDialogProps) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const mapsKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() ?? ""

  const [name, setName] = useState("")
  const [governorate, setGovernorate] = useState("")
  const [areaZone, setAreaZone] = useState("")
  const [regionId, setRegionId] = useState("")
  const [latitude, setLatitude] = useState(DEFAULT_CENTER.lat)
  const [longitude, setLongitude] = useState(DEFAULT_CENTER.lng)
  const [radiusMeters, setRadiusMeters] = useState(1500)
  const [courierIds, setCourierIds] = useState<Set<string>>(() => new Set())
  const [isActive, setIsActive] = useState(true)

  const regionsQuery = useQuery({
    queryKey: ["regions-catalog", token],
    queryFn: () => listRegionsCatalog(token),
    enabled: open && !!token,
  })

  const couriersQuery = useQuery({
    queryKey: ["delivery-zone-courier-options", token],
    queryFn: () => listDeliveryZoneCourierOptions(token),
    enabled: open && !!token,
  })

  useEffect(() => {
    if (!open) return
    if (mode === "edit" && initial) {
      setName(initial.name ?? "")
      setGovernorate(initial.governorate)
      setAreaZone(initial.areaZone ?? "")
      setRegionId(initial.regionId ?? "")
      setLatitude(Number.parseFloat(initial.latitude) || DEFAULT_CENTER.lat)
      setLongitude(Number.parseFloat(initial.longitude) || DEFAULT_CENTER.lng)
      setRadiusMeters(initial.radiusMeters)
      setCourierIds(new Set(initial.courierIds))
      setIsActive(initial.isActive)
    } else {
      setName("")
      setGovernorate("")
      setAreaZone("")
      setRegionId("")
      setLatitude(DEFAULT_CENTER.lat)
      setLongitude(DEFAULT_CENTER.lng)
      setRadiusMeters(1500)
      setCourierIds(new Set())
      setIsActive(true)
    }
  }, [open, mode, initial])

  const center = useMemo(
    () => ({ lat: latitude, lng: longitude }),
    [latitude, longitude],
  )

  const createMut = useMutation({
    mutationFn: () =>
      createDeliveryZone(token, {
        name: name.trim() || null,
        latitude,
        longitude,
        radiusMeters,
        governorate: governorate.trim(),
        areaZone: areaZone.trim() || null,
        regionId: regionId || null,
        courierIds: [...courierIds],
        isActive,
      }),
    onSuccess: () => {
      showToast(t("deliveryZones.feedback.created"), "success")
      qc.invalidateQueries({ queryKey: ["delivery-zones"] })
      onSaved()
      onOpenChange(false)
    },
    onError: (e: Error) => {
      showToast(e.message ?? t("deliveryZones.feedback.saveFailed"), "error")
    },
  })

  const patchMut = useMutation({
    mutationFn: () =>
      patchDeliveryZone(token, initial!.id, {
        name: name.trim() || null,
        latitude,
        longitude,
        radiusMeters,
        governorate: governorate.trim(),
        areaZone: areaZone.trim() || null,
        regionId: regionId || null,
        courierIds: [...courierIds],
        isActive,
      }),
    onSuccess: () => {
      showToast(t("deliveryZones.feedback.updated"), "success")
      qc.invalidateQueries({ queryKey: ["delivery-zones"] })
      onSaved()
      onOpenChange(false)
    },
    onError: (e: Error) => {
      showToast(e.message ?? t("deliveryZones.feedback.saveFailed"), "error")
    },
  })

  function toggleCourier(id: string) {
    setCourierIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canWrite) return
    if (!governorate.trim()) {
      showToast(t("deliveryZones.form.governorateRequired"), "error")
      return
    }
    if (mode === "create") createMut.mutate()
    else patchMut.mutate()
  }

  if (!open) return null

  const regions = regionsQuery.data?.regions ?? []
  const couriers: CourierOptionRow[] = couriersQuery.data?.couriers ?? []
  const busy = createMut.isPending || patchMut.isPending

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal
      aria-label={t("deliveryZones.form.title")}
    >
      <div className="bg-card flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">
            {mode === "create"
              ? t("deliveryZones.form.createTitle")
              : t("deliveryZones.form.editTitle")}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label={t("deliveryZones.form.close")}
          >
            <X className="size-4" />
          </Button>
        </div>
        <form
          onSubmit={onSubmit}
          className="flex flex-1 flex-col gap-4 overflow-y-auto p-4"
        >
          <div className="grid gap-2">
            <label className="text-muted-foreground text-xs font-medium">
              {t("deliveryZones.form.name")}
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canWrite || busy}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="grid gap-2">
              <label className="text-muted-foreground text-xs font-medium">
                {t("deliveryZones.form.governorate")}
              </label>
              <Input
                value={governorate}
                onChange={(e) => setGovernorate(e.target.value)}
                disabled={!canWrite || busy}
                required
              />
            </div>
            <div className="grid gap-2">
              <label className="text-muted-foreground text-xs font-medium">
                {t("deliveryZones.form.areaZone")}
              </label>
              <Input
                value={areaZone}
                onChange={(e) => setAreaZone(e.target.value)}
                disabled={!canWrite || busy}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-muted-foreground text-xs font-medium">
              {t("deliveryZones.form.region")}
            </label>
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              value={regionId}
              onChange={(e) => setRegionId(e.target.value)}
              disabled={!canWrite || busy}
            >
              <option value="">{t("deliveryZones.form.regionNone")}</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <span className="text-muted-foreground text-xs font-medium">
              {t("deliveryZones.form.mapHint")}
            </span>
            {mapsKey ? (
              <DeliveryZoneGoogleMap
                apiKey={mapsKey}
                center={center}
                radiusMeters={radiusMeters}
                onCenterChange={(next) => {
                  setLatitude(next.lat)
                  setLongitude(next.lng)
                }}
              />
            ) : (
              <p className="text-muted-foreground text-xs">
                {t("deliveryZones.form.mapNoKey")}
              </p>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-1">
                <label className="text-muted-foreground text-xs">
                  {t("deliveryZones.form.latitude")}
                </label>
                <Input
                  type="number"
                  step="any"
                  value={Number.isFinite(latitude) ? latitude : ""}
                  onChange={(e) => setLatitude(Number.parseFloat(e.target.value))}
                  disabled={!canWrite || busy}
                />
              </div>
              <div className="grid gap-1">
                <label className="text-muted-foreground text-xs">
                  {t("deliveryZones.form.longitude")}
                </label>
                <Input
                  type="number"
                  step="any"
                  value={Number.isFinite(longitude) ? longitude : ""}
                  onChange={(e) => setLongitude(Number.parseFloat(e.target.value))}
                  disabled={!canWrite || busy}
                />
              </div>
            </div>
            <div className="grid gap-1">
              <label className="text-muted-foreground text-xs">
                {t("deliveryZones.form.radiusLabel", { m: radiusMeters })}
              </label>
              <input
                type="range"
                min={100}
                max={50000}
                step={100}
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(Number.parseInt(e.target.value, 10))}
                disabled={!canWrite || busy}
                className="w-full"
              />
              <Input
                type="number"
                min={50}
                max={200000}
                value={radiusMeters}
                onChange={(e) =>
                  setRadiusMeters(Number.parseInt(e.target.value, 10) || 50)
                }
                disabled={!canWrite || busy}
                className="max-w-[8rem]"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <span className="text-muted-foreground text-xs font-medium">
              {t("deliveryZones.form.couriers")}
            </span>
            <div className="border-input max-h-40 overflow-y-auto rounded-md border p-2 text-sm">
              {couriersQuery.isLoading ? (
                <p className="text-muted-foreground">{t("deliveryZones.loadingCouriers")}</p>
              ) : couriers.length === 0 ? (
                <p className="text-muted-foreground">{t("deliveryZones.emptyCouriers")}</p>
              ) : (
                couriers.map((c) => (
                  <label
                    key={c.id}
                    className="hover:bg-muted/60 flex cursor-pointer items-center gap-2 rounded px-1 py-1"
                  >
                    <input
                      type="checkbox"
                      checked={courierIds.has(c.id)}
                      onChange={() => toggleCourier(c.id)}
                      disabled={!canWrite || busy}
                    />
                    <span>
                      {c.fullName ?? c.id}
                      {c.contactPhone ? ` · ${c.contactPhone}` : ""}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          {mode === "edit" ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={!canWrite || busy}
              />
              {t("deliveryZones.form.active")}
            </label>
          ) : null}

          <div className="mt-auto flex justify-end gap-2 border-t pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              {t("deliveryZones.form.cancel")}
            </Button>
            <Button type="submit" disabled={!canWrite || busy}>
              {t("deliveryZones.form.save")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
