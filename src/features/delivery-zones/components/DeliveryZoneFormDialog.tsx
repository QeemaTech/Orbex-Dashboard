import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useRef, useState } from "react"
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
import {
  EGYPT_LOCATIONS_CUSTOM_CITY,
  fetchCitiesForGovernorate,
  fetchEgyptGovernorates,
} from "@/lib/egypt-locations-api"
import {
  governorateArabicForApi,
  governorateLabelAr,
  governorateMeta,
  resolveGovernorateEn,
} from "@/lib/egypt-governorate-meta"
import { geocodeEgyptPlace } from "@/lib/google-geocode-egypt"
import { showToast } from "@/lib/toast"
import {
  DeliveryZoneGoogleMap,
  type DeliveryZoneMapHandle,
} from "./DeliveryZoneGoogleMap"

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
  const mapRef = useRef<DeliveryZoneMapHandle | null>(null)
  const cityHydratedRef = useRef(false)
  const cityGeocodeGenRef = useRef(0)

  const [geocoderReady, setGeocoderReady] = useState(false)

  const [name, setName] = useState("")
  /** CountriesNow English key when using dropdown */
  const [governorateEn, setGovernorateEn] = useState("")
  const [manualGovernorate, setManualGovernorate] = useState("")
  const [selectedCityEn, setSelectedCityEn] = useState("")
  const [areaZoneAr, setAreaZoneAr] = useState("")
  const [cityArLabels, setCityArLabels] = useState<Map<string, string>>(() => new Map())
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

  const governoratesQuery = useQuery({
    queryKey: ["egypt-governorates"],
    queryFn: fetchEgyptGovernorates,
    enabled: open,
    staleTime: 1000 * 60 * 60 * 24 * 7,
  })

  useEffect(() => {
    if (!open || !mapsKey) {
      setGeocoderReady(false)
      return
    }
    if (typeof google !== "undefined" && google.maps?.Geocoder) {
      setGeocoderReady(true)
      return
    }
    const interval = window.setInterval(() => {
      if (typeof google !== "undefined" && google.maps?.Geocoder) {
        setGeocoderReady(true)
        window.clearInterval(interval)
      }
    }, 120)
    const stop = window.setTimeout(() => window.clearInterval(interval), 20000)
    return () => {
      window.clearInterval(interval)
      window.clearTimeout(stop)
    }
  }, [open, mapsKey])

  useEffect(() => {
    if (!open) return
    cityHydratedRef.current = false
    if (mode === "edit" && initial) {
      setName(initial.name ?? "")
      const storedGov = (initial.governorate ?? "").trim()
      const resolved = resolveGovernorateEn(storedGov)
      if (resolved) {
        setGovernorateEn(resolved)
        setManualGovernorate("")
      } else {
        setGovernorateEn("")
        setManualGovernorate(storedGov)
      }
      setAreaZoneAr(initial.areaZone ?? "")
      setSelectedCityEn("")
      setCityArLabels(new Map())
      setRegionId(initial.regionId ?? "")
      setLatitude(Number.parseFloat(initial.latitude) || DEFAULT_CENTER.lat)
      setLongitude(Number.parseFloat(initial.longitude) || DEFAULT_CENTER.lng)
      setRadiusMeters(initial.radiusMeters)
      setCourierIds(new Set(initial.courierIds))
      setIsActive(initial.isActive)
    } else {
      setName("")
      setGovernorateEn("")
      setManualGovernorate("")
      setSelectedCityEn("")
      setAreaZoneAr("")
      setCityArLabels(new Map())
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

  const governorates = governoratesQuery.data ?? []
  const useManualGovernorate =
    governoratesQuery.isError || (governoratesQuery.isFetched && governorates.length === 0)
  const showGovernorateDropdown =
    !useManualGovernorate && (governorateEn !== "" || manualGovernorate === "")

  const citiesQuery = useQuery({
    queryKey: ["egypt-cities", governorateEn],
    queryFn: () => fetchCitiesForGovernorate(governorateEn),
    enabled: open && governorateEn.trim().length > 0 && !useManualGovernorate,
    staleTime: 1000 * 60 * 60 * 24,
  })

  const cities = citiesQuery.data ?? []
  const showCustomCitySelect =
    showGovernorateDropdown &&
    governorateEn.trim() &&
    (cities.length > 0 || citiesQuery.isFetched)

  const governorateForApi = useMemo(() => {
    if (!showGovernorateDropdown) return manualGovernorate.trim()
    if (governorateEn) return governorateArabicForApi(governorateEn)
    return ""
  }, [showGovernorateDropdown, governorateEn, manualGovernorate])

  const citySelectValue = useMemo(() => {
    if (selectedCityEn === EGYPT_LOCATIONS_CUSTOM_CITY) return EGYPT_LOCATIONS_CUSTOM_CITY
    if (selectedCityEn) return selectedCityEn
    return ""
  }, [selectedCityEn])

  const citiesListKey = cities.join("|")

  useEffect(() => {
    if (!open || mode !== "edit" || !initial || cityHydratedRef.current) return
    if (!showGovernorateDropdown || !governorateEn) {
      if ((initial.areaZone ?? "").trim()) setSelectedCityEn(EGYPT_LOCATIONS_CUSTOM_CITY)
      cityHydratedRef.current = true
      return
    }
    if (citiesQuery.isLoading) return
    const az = (initial.areaZone ?? "").trim()
    if (!az) {
      cityHydratedRef.current = true
      return
    }
    if (cities.includes(az)) {
      setSelectedCityEn(az)
      cityHydratedRef.current = true
      return
    }
    const enMatch = cities.find((c) => cityArLabels.get(c) === az)
    if (enMatch) {
      setSelectedCityEn(enMatch)
      cityHydratedRef.current = true
      return
    }
    setSelectedCityEn(EGYPT_LOCATIONS_CUSTOM_CITY)
    cityHydratedRef.current = true
  }, [
    open,
    mode,
    initial?.id,
    initial?.areaZone,
    showGovernorateDropdown,
    governorateEn,
    citiesQuery.isLoading,
    citiesListKey,
    cityArLabels,
  ])

  useEffect(() => {
    if (
      !open ||
      !geocoderReady ||
      !showGovernorateDropdown ||
      !governorateEn ||
      cities.length === 0
    ) {
      return
    }
    let cancelled = false
    const run = async () => {
      const next = new Map<string, string>()
      for (const c of cities) {
        if (cancelled) return
        const r = await geocodeEgyptPlace({ cityEn: c, governorateEn })
        if (r?.labelAr) next.set(c, r.labelAr)
        await new Promise((r) => setTimeout(r, 130))
        if (!cancelled) setCityArLabels(new Map(next))
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [open, geocoderReady, governorateEn, citiesListKey, showGovernorateDropdown])

  useEffect(() => {
    if (!open || !geocoderReady || !showGovernorateDropdown || !governorateEn) return
    if (!selectedCityEn || selectedCityEn === EGYPT_LOCATIONS_CUSTOM_CITY) return
    const gen = ++cityGeocodeGenRef.current
    void geocodeEgyptPlace({ cityEn: selectedCityEn, governorateEn }).then((r) => {
      if (cityGeocodeGenRef.current !== gen || !r) return
      setLatitude(r.lat)
      setLongitude(r.lng)
      mapRef.current?.flyTo(r.lat, r.lng, 14)
      setAreaZoneAr(r.labelAr)
    })
  }, [open, geocoderReady, showGovernorateDropdown, governorateEn, selectedCityEn])

  const createMut = useMutation({
    mutationFn: () =>
      createDeliveryZone(token, {
        name: name.trim() || null,
        latitude,
        longitude,
        radiusMeters,
        governorate: governorateForApi,
        areaZone: areaZoneAr.trim() || null,
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
        governorate: governorateForApi,
        areaZone: areaZoneAr.trim() || null,
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
    if (!governorateForApi) {
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

  const showManualGovernorateField =
    useManualGovernorate || !showGovernorateDropdown
  const needGovernorateForCity = showGovernorateDropdown
    ? !governorateEn.trim()
    : !manualGovernorate.trim()

  function onGovernorateSelectChange(v: string) {
    setGovernorateEn(v)
    setSelectedCityEn("")
    setAreaZoneAr("")
    setCityArLabels(new Map())
    const meta = governorateMeta(v)
    if (meta) {
      setLatitude(meta.lat)
      setLongitude(meta.lng)
      queueMicrotask(() => mapRef.current?.flyTo(meta.lat, meta.lng, meta.zoom))
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal
      aria-label={t("deliveryZones.form.title")}
    >
      <div className="bg-card flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border shadow-lg">
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
              {governoratesQuery.isLoading ? (
                <p className="text-muted-foreground py-2 text-sm">
                  {t("deliveryZones.form.locationsLoading")}
                </p>
              ) : showManualGovernorateField ? (
                <Input
                  value={manualGovernorate}
                  onChange={(e) => setManualGovernorate(e.target.value)}
                  disabled={!canWrite || busy}
                  required
                  placeholder={t("deliveryZones.form.governoratePlaceholder")}
                />
              ) : (
                <select
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                  value={governorates.includes(governorateEn) ? governorateEn : ""}
                  onChange={(e) => onGovernorateSelectChange(e.target.value)}
                  disabled={!canWrite || busy}
                  required
                >
                  <option value="">{t("deliveryZones.form.selectGovernorate")}</option>
                  {governorateEn && !governorates.includes(governorateEn) ? (
                    <option value={governorateEn}>
                      {governorateLabelAr(governorateEn)}
                    </option>
                  ) : null}
                  {governorates.map((g) => (
                    <option key={g} value={g}>
                      {governorateLabelAr(g)}
                    </option>
                  ))}
                </select>
              )}
              {governoratesQuery.isError ? (
                <p className="text-destructive text-xs">{t("deliveryZones.form.locationsError")}</p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <label className="text-muted-foreground text-xs font-medium">
                {t("deliveryZones.form.areaZone")}
              </label>
              {needGovernorateForCity ? (
                <p className="text-muted-foreground py-2 text-sm">
                  {t("deliveryZones.form.selectGovernorateFirst")}
                </p>
              ) : citiesQuery.isLoading && showCustomCitySelect ? (
                <p className="text-muted-foreground py-2 text-sm">
                  {t("deliveryZones.form.citiesLoading")}
                </p>
              ) : showCustomCitySelect ? (
                <>
                  <select
                    className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                    value={citySelectValue}
                    onChange={(e) => {
                      const v = e.target.value
                      if (v === "") {
                        setSelectedCityEn("")
                        setAreaZoneAr("")
                      } else if (v === EGYPT_LOCATIONS_CUSTOM_CITY) {
                        setSelectedCityEn(EGYPT_LOCATIONS_CUSTOM_CITY)
                        setAreaZoneAr("")
                      } else {
                        setSelectedCityEn(v)
                      }
                    }}
                    disabled={!canWrite || busy}
                  >
                    <option value="">{t("deliveryZones.form.selectCityOptional")}</option>
                    {cities.map((c) => (
                      <option key={c} value={c}>
                        {cityArLabels.get(c) ?? c}
                      </option>
                    ))}
                    <option value={EGYPT_LOCATIONS_CUSTOM_CITY}>
                      {t("deliveryZones.form.cityOther")}
                    </option>
                  </select>
                  {(citySelectValue === EGYPT_LOCATIONS_CUSTOM_CITY || cities.length === 0) && (
                    <Input
                      value={areaZoneAr}
                      onChange={(e) => setAreaZoneAr(e.target.value)}
                      disabled={!canWrite || busy}
                      placeholder={t("deliveryZones.form.cityManualPlaceholder")}
                    />
                  )}
                </>
              ) : (
                <Input
                  value={areaZoneAr}
                  onChange={(e) => setAreaZoneAr(e.target.value)}
                  disabled={!canWrite || busy}
                  placeholder={t("deliveryZones.form.cityManualPlaceholder")}
                />
              )}
            </div>
          </div>
          <p className="text-muted-foreground text-[0.65rem] leading-relaxed">
            {t("deliveryZones.form.locationsAttribution")}
          </p>
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
                ref={mapRef}
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
