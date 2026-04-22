import { useMutation, useQuery } from "@tanstack/react-query"
import { X } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  createWarehouse,
  getWarehouseZoneLinks,
  listWarehouseSites,
  setWarehouseZoneLinks,
  updateWarehouse,
  type WarehouseSiteRow,
  type CreateWarehouseBody,
  type UpdateWarehouseBody,
} from "@/api/warehouse-api"
import { listDeliveryZones } from "@/api/delivery-zones-api"
import { listUsers } from "@/api/users-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { parseCoordinatesFromLocationInput } from "@/features/customer-service/lib/location"

type FormMode = "create" | "edit"

interface WarehouseFormDialogProps {
  open: boolean
  mode: FormMode
  initial?: WarehouseSiteRow | null
  token: string
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function WarehouseFormDialog({
  open,
  mode,
  initial,
  token,
  onOpenChange,
  onSaved,
}: WarehouseFormDialogProps) {
  const { t } = useTranslation()

  const [name, setName] = useState("")
  const [governorate, setGovernorate] = useState("")
  const [zone, setZone] = useState("")
  const [code, setCode] = useState("")
  const [address, setAddress] = useState("")
  const [locationLink, setLocationLink] = useState("")
  const [mainBranchId, setMainBranchId] = useState("")
  const [adminUserId, setAdminUserId] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [deliveryZoneIds, setDeliveryZoneIds] = useState<string[]>([])
  const [pickupZoneIds, setPickupZoneIds] = useState<string[]>([])

  function toggleInList(prev: string[], id: string, nextChecked: boolean): string[] {
    const has = prev.includes(id)
    if (nextChecked && !has) return [...prev, id]
    if (!nextChecked && has) return prev.filter((x) => x !== id)
    return prev
  }

  const sitesQuery = useQuery({
    queryKey: ["warehouse-sites", token],
    queryFn: () => listWarehouseSites(token),
    enabled: open && !!token,
  })

  const zonesCatalogQuery = useQuery({
    queryKey: ["delivery-zones", token, "active-only"],
    queryFn: () => listDeliveryZones(token, { isActive: true }),
    enabled: open && !!token,
    staleTime: 30_000,
  })

  const zoneLinksQuery = useQuery({
    queryKey: ["warehouse-zone-links", token, initial?.id ?? ""],
    queryFn: () => getWarehouseZoneLinks(token, initial!.id),
    enabled: open && mode === "edit" && !!token && !!initial?.id,
  })

  const usersQuery = useQuery({
    queryKey: ["users-all", token],
    queryFn: () => listUsers({ token, page: 1, pageSize: 100, managedStaffOnly: false }),
    enabled: open && !!token,
  })

  useEffect(() => {
    if (!open) return
    if (mode === "edit" && initial) {
      setName(initial.name)
      setGovernorate(initial.governorate)
      setZone(initial.zone ?? "")
      setCode(initial.code ?? "")
      setAddress(initial.address ?? "")
      setLocationLink(initial.latitude && initial.longitude ? `https://maps.google.com/?q=${initial.latitude},${initial.longitude}` : "")
      setMainBranchId(initial.mainBranchId ?? "")
      setIsActive(initial.isActive)
      setDeliveryZoneIds([])
      setPickupZoneIds([])
    } else {
      setName("")
      setGovernorate("")
      setZone("")
      setCode("")
      setAddress("")
      setLocationLink("")
      setMainBranchId("")
      setAdminUserId("")
      setIsActive(true)
      setDeliveryZoneIds([])
      setPickupZoneIds([])
    }
  }, [open, mode, initial])

  useEffect(() => {
    if (!open || mode !== "edit") return
    const d = zoneLinksQuery.data
    if (!d) return
    setDeliveryZoneIds(d.deliveryZoneIds ?? [])
    setPickupZoneIds(d.pickupZoneIds ?? [])
  }, [open, mode, zoneLinksQuery.data])

  const createMut = useMutation({
    mutationFn: (body: CreateWarehouseBody) => createWarehouse(token, body),
    onSuccess: () => {
      showToast(t("warehouse.feedback.created") ?? "Warehouse created", "success")
    },
    onError: (e: Error) => {
      showToast(e.message ?? t("warehouse.feedback.createFailed") ?? "Failed to create", "error")
    },
  })

  const updateMut = useMutation({
    mutationFn: (body: UpdateWarehouseBody) => {
      if (!initial) throw new Error("No warehouse")
      return updateWarehouse(token, initial.id, body)
    },
    onSuccess: () => {
      showToast(t("warehouse.feedback.updated") ?? "Warehouse updated", "success")
    },
    onError: (e: Error) => {
      showToast(e.message ?? t("warehouse.feedback.updateFailed") ?? "Failed to update", "error")
    },
  })

  const pending = createMut.isPending || updateMut.isPending

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const coords = locationLink.trim() ? parseCoordinatesFromLocationInput(locationLink.trim()) : null
    
    const body: CreateWarehouseBody = {
      name: name.trim(),
      governorate: governorate.trim(),
      ...(zone.trim() ? { zone: zone.trim() } : {}),
      ...(code.trim() ? { code: code.trim() } : {}),
      ...(address.trim() ? { address: address.trim() } : {}),
      ...(coords ? { latitude: coords.lat, longitude: coords.lng } : {}),
      ...(mainBranchId ? { mainBranchId } : {}),
      ...(adminUserId ? { adminUserId } : {}),
      isActive,
    }
    if (mode === "create") {
      try {
        const created = await createMut.mutateAsync(body)
        await setWarehouseZoneLinks({
          token,
          warehouseId: created.id,
          deliveryZoneIds,
          pickupZoneIds,
        })
        onSaved()
        onOpenChange(false)
      } catch {
        /* toast via onError */
      }
    } else {
      const updateBody: UpdateWarehouseBody = {}
      if (name.trim()) updateBody.name = name.trim()
      if (governorate.trim()) updateBody.governorate = governorate.trim()
      if (zone.trim()) updateBody.zone = zone.trim()
      else updateBody.zone = undefined
      if (code.trim()) updateBody.code = code.trim()
      else updateBody.code = undefined
      if (address.trim()) updateBody.address = address.trim()
      else updateBody.address = undefined
      if (coords) {
        updateBody.latitude = coords.lat
        updateBody.longitude = coords.lng
      } else {
        updateBody.latitude = undefined
        updateBody.longitude = undefined
      }
      if (mainBranchId) updateBody.mainBranchId = mainBranchId
      else updateBody.mainBranchId = undefined
      updateBody.isActive = isActive
      try {
        await updateMut.mutateAsync(updateBody)
        await setWarehouseZoneLinks({
          token,
          warehouseId: initial!.id,
          deliveryZoneIds,
          pickupZoneIds,
        })
        onSaved()
        onOpenChange(false)
      } catch {
        /* toast via onError */
      }
    }
  }

  if (!open) return null

  const warehouses = sitesQuery.data?.warehouses ?? []
  const users = usersQuery.data?.users ?? []

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal
      aria-label={mode === "create" ? t("warehouse.form.createTitle") : t("warehouse.form.editTitle")}
    >
      <div className="bg-card max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">
            {mode === "create" ? t("warehouse.form.createTitle") : t("warehouse.form.editTitle")}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label={t("common.close")}
          >
            <X className="size-4" />
          </Button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">
                {t("warehouse.form.name")} <span className="text-destructive">*</span>
              </span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder={t("warehouse.form.namePlaceholder")}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">
                {t("warehouse.form.governorate")} <span className="text-destructive">*</span>
              </span>
              <Input
                value={governorate}
                onChange={(e) => setGovernorate(e.target.value)}
                required
                placeholder={t("warehouse.form.governoratePlaceholder")}
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">{t("warehouse.form.zone")}</span>
              <Input
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                placeholder={t("warehouse.form.zonePlaceholder")}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">{t("warehouse.form.code")}</span>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t("warehouse.form.codePlaceholder")}
              />
            </label>
          </div>

          <label className="grid gap-1 text-sm">
            <span className="font-medium">{t("warehouse.form.address")}</span>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("warehouse.form.addressPlaceholder")}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium">{t("warehouse.form.locationLink")}</span>
            <Input
              value={locationLink}
              onChange={(e) => setLocationLink(e.target.value)}
              placeholder={t("warehouse.form.locationLinkPlaceholder")}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium">{t("warehouse.form.mainBranch")}</span>
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              value={mainBranchId}
              onChange={(e) => setMainBranchId(e.target.value)}
            >
              <option value="">{t("warehouse.form.selectMainBranch")}</option>
              {warehouses
                .filter((w) => w.id !== initial?.id && !w.mainBranchId)
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} - {w.governorate}
                  </option>
                ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium">{t("warehouse.form.adminUser")}</span>
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              value={adminUserId}
              onChange={(e) => setAdminUserId(e.target.value)}
            >
              <option value="">{t("warehouse.form.selectAdmin")}</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.email})
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1 text-sm">
              <span className="font-medium">{t("warehouse.zoneLinks.deliveryZones")}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" className="justify-between">
                    {deliveryZoneIds.length ? `${deliveryZoneIds.length} selected` : t("common.select")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[22rem]">
                  <DropdownMenuLabel>{t("warehouse.zoneLinks.deliveryZones")}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(zonesCatalogQuery.data?.zones ?? []).map((z) => {
                    const label = [z.governorate, z.areaZone ?? "", z.name ?? ""]
                      .filter(Boolean)
                      .join(" · ")
                    const checked = deliveryZoneIds.includes(z.id)
                    return (
                      <DropdownMenuCheckboxItem
                        key={z.id}
                        checked={checked}
                        onCheckedChange={(v) =>
                          setDeliveryZoneIds((prev) => toggleInList(prev, z.id, Boolean(v)))
                        }
                      >
                        {label}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="grid gap-1 text-sm">
              <span className="font-medium">{t("warehouse.zoneLinks.pickupZones")}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" className="justify-between">
                    {pickupZoneIds.length ? `${pickupZoneIds.length} selected` : t("common.select")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[22rem]">
                  <DropdownMenuLabel>{t("warehouse.zoneLinks.pickupZones")}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(zonesCatalogQuery.data?.zones ?? []).map((z) => {
                    const label = [z.governorate, z.areaZone ?? "", z.name ?? ""]
                      .filter(Boolean)
                      .join(" · ")
                    const checked = pickupZoneIds.includes(z.id)
                    return (
                      <DropdownMenuCheckboxItem
                        key={z.id}
                        checked={checked}
                        onCheckedChange={(v) =>
                          setPickupZoneIds((prev) => toggleInList(prev, z.id, Boolean(v)))
                        }
                      >
                        {label}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {mode === "edit" && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4"
              />
              {t("warehouse.form.isActive")}
            </label>
          )}

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? t("common.saving")
                : mode === "create"
                  ? t("common.create")
                  : t("common.save")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function showToast(message: string, type: "success" | "error") {
  if (typeof window !== "undefined" && (window as any).showToast) {
    ;(window as any).showToast(message, type)
  } else {
    console.log(`[${type}] ${message}`)
  }
}