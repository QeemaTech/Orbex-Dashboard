import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, Trash2, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  assignWarehouseStaff,
  listWarehouseStaff,
  removeWarehouseStaff,
  removeWarehouseAdmin,
} from "@/api/warehouse-api"
import { listUsers } from "@/api/users-api"
import { listRoles } from "@/api/rbac-api"
import { Button } from "@/components/ui/button"
import { showToast } from "@/lib/toast"

interface WarehouseStaffDialogProps {
  open: boolean
  warehouseId: string
  warehouseName: string
  token: string
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function WarehouseStaffDialog({
  open,
  warehouseId,
  warehouseName,
  token,
  onOpenChange,
  onSaved,
}: WarehouseStaffDialogProps) {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()

  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [selectedRoleId, setSelectedRoleId] = useState("")

  const staffQuery = useQuery({
    queryKey: ["warehouse-staff", warehouseId, token],
    queryFn: () => listWarehouseStaff(token, warehouseId),
    enabled: open && !!warehouseId && !!token,
  })

  const rolesQuery = useQuery({
    queryKey: ["rbac-roles", token, i18n.language],
    queryFn: () => listRoles(token, i18n.language),
    enabled: open && !!token,
  })

  const roles = rolesQuery.data ?? []
  const selectedRoleSlug = useMemo(() => {
    const r = roles.find((row) => row.id === selectedRoleId)
    return r?.slug
  }, [roles, selectedRoleId])

  const usersByRoleQuery = useQuery({
    queryKey: ["users-by-role", token, selectedRoleSlug],
    queryFn: () =>
      listUsers({
        token,
        page: 1,
        pageSize: 100,
        role: selectedRoleSlug!,
        isActive: true,
        managedStaffOnly: false,
      }),
    enabled: open && !!token && !!selectedRoleSlug,
  })

  const assignStaffMut = useMutation({
    mutationFn: () => {
      if (!selectedUserId || !selectedRoleId) {
        return Promise.reject(new Error(t("warehouse.staff.selectUserAndRole")))
      }
      return assignWarehouseStaff(token, warehouseId, selectedUserId, selectedRoleId)
    },
    onSuccess: () => {
      showToast(t("warehouse.staff.added") ?? "Staff added", "success")
      setShowAddForm(false)
      setSelectedUserId("")
      setSelectedRoleId("")
      qc.invalidateQueries({ queryKey: ["warehouse-staff", warehouseId] })
      qc.invalidateQueries({ queryKey: ["users-by-role"] })
    },
    onError: (e: Error) => {
      showToast(e.message ?? t("warehouse.staff.addFailed") ?? "Failed to add staff", "error")
    },
  })

  const removeStaffMut = useMutation({
    mutationFn: (userId: string) => removeWarehouseStaff(token, warehouseId, userId),
    onSuccess: () => {
      showToast(t("warehouse.staff.removed") ?? "Staff removed", "success")
      qc.invalidateQueries({ queryKey: ["warehouse-staff", warehouseId] })
    },
    onError: (e: Error) => {
      showToast(e.message ?? t("warehouse.staff.removeFailed") ?? "Failed to remove staff", "error")
    },
  })

  useEffect(() => {
    if (!open) {
      setShowAddForm(false)
      setSelectedUserId("")
      setSelectedRoleId("")
    }
  }, [open])

  if (!open) return null

  const data = staffQuery.data
  const staff = data?.staff ?? []
  const admin = data?.admin
  const users = usersByRoleQuery.data?.users ?? []

  const assignedUserIds = new Set([
    ...staff.map((s) => s.userId),
    ...(admin ? [admin.id] : []),
  ])

  const availableUsers = users.filter((u) => !assignedUserIds.has(u.id))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal
      aria-label={t("warehouse.staff.title")}
    >
      <div className="bg-card max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">{t("warehouse.staff.title")}</h2>
            <p className="text-muted-foreground text-xs">{warehouseName}</p>
          </div>
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

        <div className="space-y-4 p-4">
          {staffQuery.isLoading ? (
            <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
          ) : (
            <>
              {admin && (
                <div className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{t("warehouse.staff.admin")}</p>
                      <p className="text-muted-foreground text-sm">
                        {admin.fullName} ({admin.email})
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeWarehouseAdmin(token, warehouseId).then(onSaved)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              )}

              {staff.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t("warehouse.staff.title")}</p>
                  {staff.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div>
                        <p className="font-medium">{member.user.fullName}</p>
                        <p className="text-muted-foreground text-sm">{member.user.email}</p>
                        <p className="text-muted-foreground text-xs">
                          {t("warehouse.staff.role")}: {member.role.displayName}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStaffMut.mutate(member.userId)}
                        disabled={removeStaffMut.isPending}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {!showAddForm ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(true)}
                >
                  <Plus className="size-4" />
                  {t("warehouse.staff.add")}
                </Button>
              ) : (
                <div className="rounded-md border p-3">
                  <p className="mb-3 text-sm font-medium">{t("warehouse.staff.addForm")}</p>
                  <div className="space-y-3">
                    <label className="grid gap-1 text-sm">
                      <span className="font-medium">{t("warehouse.staff.role")}</span>
                      <select
                        className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                        value={selectedRoleId}
                        onChange={(e) => {
                          setSelectedRoleId(e.target.value)
                          setSelectedUserId("")
                        }}
                      >
                        <option value="">{t("warehouse.staff.selectRole")}</option>
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.displayName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="font-medium">{t("warehouse.staff.user")}</span>
                      <select
                        className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm disabled:opacity-60"
                        value={selectedUserId}
                        disabled={!selectedRoleId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                      >
                        <option value="">
                          {!selectedRoleId
                            ? t("warehouse.staff.selectRoleFirst")
                            : t("warehouse.staff.selectUser")}
                        </option>
                        {availableUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.fullName} ({u.email})
                          </option>
                        ))}
                      </select>
                      {!selectedRoleId ? (
                        <span className="text-muted-foreground text-xs">
                          {t("warehouse.staff.userHintSelectRole")}
                        </span>
                      ) : usersByRoleQuery.isLoading ? (
                        <span className="text-muted-foreground text-xs">{t("common.loading")}</span>
                      ) : usersByRoleQuery.isError ? (
                        <span className="text-destructive text-xs">
                          {(usersByRoleQuery.error as Error)?.message ??
                            t("warehouse.staff.loadUsersForRoleFailed")}
                        </span>
                      ) : availableUsers.length === 0 ? (
                        <span className="text-muted-foreground text-xs">
                          {t("warehouse.staff.noUsersForRole")}
                        </span>
                      ) : null}
                    </label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAddForm(false)}
                      >
                        {t("common.cancel")}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => assignStaffMut.mutate()}
                        disabled={!selectedUserId || !selectedRoleId || assignStaffMut.isPending}
                      >
                        {assignStaffMut.isPending ? t("common.saving") : t("common.add")}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end border-t px-4 py-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
        </div>
      </div>
    </div>
  )
}