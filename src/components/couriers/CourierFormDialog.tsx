import { useMutation, useQuery } from "@tanstack/react-query"
import { X } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  createCourier,
  updateCourier,
  type CourierAdminRow,
  type CreateCourierBody,
  type UpdateCourierBody,
} from "@/api/couriers-api"
import { listRegionsCatalog } from "@/api/delivery-zones-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { showToast } from "@/lib/toast"

type CourierFormMode = "create" | "edit"

export function CourierFormDialog({
  open,
  mode,
  initial,
  token,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  mode: CourierFormMode
  initial: CourierAdminRow | null
  token: string
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const { t } = useTranslation()
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [password, setPassword] = useState("")
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("")
  const [driverLicenseUrl, setDriverLicenseUrl] = useState("")
  const [vehicleLicenseUrl, setVehicleLicenseUrl] = useState("")
  const [regionIds, setRegionIds] = useState<string[]>([])
  const [isActive, setIsActive] = useState(true)

  const regionsQuery = useQuery({
    queryKey: ["regions-catalog", token],
    queryFn: () => listRegionsCatalog(token),
    enabled: open,
  })

  useEffect(() => {
    if (!open) return
    if (mode === "edit" && initial) {
      setEmail(initial.email)
      setFullName(initial.fullName)
      setContactPhone(initial.contactPhone || "")
      setPassword("")
      setProfilePhotoUrl(initial.profilePhotoUrl || "")
      setDriverLicenseUrl(initial.driverLicenseUrl || "")
      setVehicleLicenseUrl(initial.vehicleLicenseUrl || "")
      setRegionIds(initial.regions.map((r) => r.id))
      setIsActive(initial.isActive)
    } else {
      setEmail("")
      setFullName("")
      setContactPhone("")
      setPassword("")
      setProfilePhotoUrl("")
      setDriverLicenseUrl("")
      setVehicleLicenseUrl("")
      setRegionIds([])
      setIsActive(true)
    }
  }, [open, mode, initial])

  const createMut = useMutation({
    mutationFn: (body: CreateCourierBody) => createCourier({ token, body }),
    onSuccess: () => {
      showToast(t("couriers.feedback.created"), "success")
      onSuccess()
      onOpenChange(false)
    },
    onError: (e) => {
      showToast(e instanceof Error ? e.message : t("couriers.feedback.saveFailed"), "error")
    },
  })

  const updateMut = useMutation({
    mutationFn: (body: UpdateCourierBody) =>
      updateCourier({ token, courierId: initial!.courierId, body }),
    onSuccess: () => {
      showToast(t("couriers.feedback.updated"), "success")
      onSuccess()
      onOpenChange(false)
    },
    onError: (e) => {
      showToast(e instanceof Error ? e.message : t("couriers.feedback.saveFailed"), "error")
    },
  })

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === "create") {
      createMut.mutate({
        email: email.trim(),
        fullName: fullName.trim(),
        password: password.trim(),
        role: "COURIER",
        courier: {
          fullName: fullName.trim(),
          contactPhone: contactPhone.trim() || null,
          profilePhotoUrl: profilePhotoUrl.trim(),
          driverLicenseUrl: driverLicenseUrl.trim(),
          vehicleLicenseUrl: vehicleLicenseUrl.trim(),
          isActive,
        },
        regionIds,
      })
    } else {
      updateMut.mutate({
        fullName: fullName.trim(),
        contactPhone: contactPhone.trim() || null,
        profilePhotoUrl: profilePhotoUrl.trim(),
        driverLicenseUrl: driverLicenseUrl.trim(),
        vehicleLicenseUrl: vehicleLicenseUrl.trim(),
        isActive,
        regionIds,
      })
    }
  }

  const toggleRegion = (id: string) => {
    setRegionIds((prev) =>
      prev.includes(id) ? prev.filter((rid) => rid !== id) : [...prev, id],
    )
  }

  if (!open) return null

  const isPending = createMut.isPending || updateMut.isPending
  const regions = regionsQuery.data?.regions ?? []

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal
    >
      <div className="bg-card flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">
            {mode === "create" ? t("couriers.form.createTitle") : t("couriers.form.editTitle")}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            <X className="size-4" />
          </Button>
        </div>

        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t("couriers.form.email")}
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={mode === "edit" || isPending}
                placeholder="courier@orbex.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t("couriers.form.fullName")}
              </label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={isPending}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t("couriers.form.contactPhone")}
              </label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                disabled={isPending}
                placeholder="+20123456789"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {mode === "create" ? t("couriers.form.password") : t("couriers.form.passwordOptional")}
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={mode === "create"}
                disabled={isPending}
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b pb-1">
              {t("couriers.form.documents")}
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium">{t("couriers.form.profilePhotoUrl")}</label>
                <Input
                  value={profilePhotoUrl}
                  onChange={(e) => setProfilePhotoUrl(e.target.value)}
                  disabled={isPending}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">{t("couriers.form.driverLicenseUrl")}</label>
                <Input
                  value={driverLicenseUrl}
                  onChange={(e) => setDriverLicenseUrl(e.target.value)}
                  disabled={isPending}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">{t("couriers.form.vehicleLicenseUrl")}</label>
                <Input
                  value={vehicleLicenseUrl}
                  onChange={(e) => setVehicleLicenseUrl(e.target.value)}
                  disabled={isPending}
                  placeholder="https://..."
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <input
                  id="courier-active"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={isPending}
                  className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="courier-active" className="text-sm font-medium cursor-pointer">
                  {t("couriers.form.isActive")}
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b pb-1">
              {t("couriers.form.assignedRegions")}
            </h3>
            {regionsQuery.isLoading ? (
              <p className="text-xs text-muted-foreground italic">{t("common.loading")}</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 border rounded-md">
                {regions.map((region) => (
                  <div key={region.id} className="flex items-center space-x-2">
                    <input
                      id={`region-${region.id}`}
                      type="checkbox"
                      checked={regionIds.includes(region.id)}
                      onChange={() => toggleRegion(region.id)}
                      disabled={isPending}
                      className="size-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor={`region-${region.id}`} className="text-xs cursor-pointer truncate">
                      {region.name}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end space-x-3 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
