import { useMutation, useQuery } from "@tanstack/react-query"
import { X } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { createCourier, updateCourier, uploadCourierDocument, type CourierAdminRow, type CreateCourierBody, type UpdateCourierBody } from "@/api/couriers-api"
import { listRegionsCatalog } from "@/api/delivery-zones-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { showToast } from "@/lib/toast"
import { Loader2, Upload, FileCheck, File as FileIcon } from "lucide-react"

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
                <FileUploader
                  label={t("couriers.form.profilePhotoUrl")}
                  value={profilePhotoUrl}
                  token={token}
                  onUpload={setProfilePhotoUrl}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1">
                <FileUploader
                  label={t("couriers.form.driverLicenseUrl")}
                  value={driverLicenseUrl}
                  token={token}
                  onUpload={setDriverLicenseUrl}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1">
                <FileUploader
                  label={t("couriers.form.vehicleLicenseUrl")}
                  value={vehicleLicenseUrl}
                  token={token}
                  onUpload={setVehicleLicenseUrl}
                  disabled={isPending}
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
            <Button type="submit" disabled={isPending} className="min-w-[80px]">
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common.saving")}
                </>
              ) : (
                t("common.save")
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
function FileUploader({
  label,
  value,
  token,
  onUpload,
  disabled,
}: {
  label: string
  value: string
  token: string
  onUpload: (url: string) => void
  disabled?: boolean
}) {
  const [uploading, setUploading] = useState(false)
  const { t } = useTranslation()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const res = await uploadCourierDocument({ token, file })
      onUpload(res.url)
      showToast(t("common.feedback.uploadSuccess"), "success")
    } catch (err) {
      showToast(t("common.feedback.uploadFailed"), "error")
    } finally {
      setUploading(false)
    }
  }

  const fileName = value ? value.split("/").pop() : ""

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium">{label}</label>
      <div className="relative group">
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          onChange={handleFileChange}
          disabled={disabled || uploading}
          accept="image/*,.pdf"
        />
        <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-background group-hover:border-primary transition-colors min-h-[40px]">
          {uploading ? (
            <>
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground italic truncate">
                {t("common.uploading")}...
              </span>
            </>
          ) : value ? (
            <>
              <FileCheck className="size-4 text-green-500" />
              <span className="text-xs font-medium truncate flex-1">
                {fileName}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation()
                  onUpload("")
                }}
              >
                <X className="size-3" />
              </Button>
            </>
          ) : (
            <>
              <Upload className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-xs text-muted-foreground">
                {t("common.clickToUpload")}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
