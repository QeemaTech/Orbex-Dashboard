import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Headphones,
  Landmark,
  ShieldCheck,
  TrendingUp,
  Warehouse,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import type { ComponentType } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"
import { Users, X } from "react-lucid"

import { listWarehouseSites } from "@/api/warehouse-api"
import { ApiError } from "@/api/client"
import {
  createStaffUser,
  deactivateUser,
  getManagedStaffUserStats,
  listUsers,
  type ManagedStaffRole,
  type UserPublicRow,
  updateUser,
} from "@/api/users-api"
import { Layout } from "@/components/layout/Layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  listRoles,
  listUserRoles,
  addUserRole,
  removeUserRole,
  type RoleRow,
} from "@/api/rbac-api"
import { useAuth } from "@/lib/auth-context"
import { showToast } from "@/lib/toast"

const MANAGED_ROLES: ManagedStaffRole[] = [
  "WAREHOUSE",
  "WAREHOUSE_ADMIN",
  "CUSTOMER_SERVICE",
  "ACCOUNTS",
  "SALES",
]

function isManagedStaffRole(value: string): value is ManagedStaffRole {
  return (MANAGED_ROLES as readonly string[]).includes(value)
}

type StatIcon = ComponentType<{ className?: string; "aria-hidden"?: boolean }>

const ROLE_STAT_CARD: Record<
  ManagedStaffRole,
  { Icon: StatIcon; iconWrap: string }
> = {
  WAREHOUSE: {
    Icon: Warehouse,
    iconWrap:
      "bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  },
  WAREHOUSE_ADMIN: {
    Icon: ShieldCheck,
    iconWrap:
      "bg-violet-500/15 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  },
  CUSTOMER_SERVICE: {
    Icon: Headphones,
    iconWrap: "bg-sky-500/15 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  },
  ACCOUNTS: {
    Icon: Landmark,
    iconWrap:
      "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  },
  SALES: {
    Icon: TrendingUp,
    iconWrap: "bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  },
}

type UserFormMode = "create" | "edit"

function ManageRolesDialog({
  open,
  user,
  token,
  roles,
  onOpenChange,
  onChanged,
}: {
  open: boolean
  user: UserPublicRow | null
  token: string
  roles: RoleRow[]
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}) {
  const { t } = useTranslation()
  const rolesQuery = useQuery({
    queryKey: ["rbac-user-roles", user?.id, token],
    queryFn: () => listUserRoles({ token, userId: user!.id }),
    enabled: open && !!user && !!token,
  })

  const addMut = useMutation({
    mutationFn: (roleId: string) => addUserRole({ token, userId: user!.id, roleId }),
    onSuccess: () => {
      void rolesQuery.refetch()
      onChanged()
      showToast(t("users.feedback.rolesUpdated") ?? "Roles updated", "success")
    },
    onError: (e) => showToast(e instanceof Error ? e.message : "Failed to update roles", "error"),
  })

  const removeMut = useMutation({
    mutationFn: (roleId: string) => removeUserRole({ token, userId: user!.id, roleId }),
    onSuccess: () => {
      void rolesQuery.refetch()
      onChanged()
      showToast(t("users.feedback.rolesUpdated") ?? "Roles updated", "success")
    },
    onError: (e) => showToast(e instanceof Error ? e.message : "Failed to update roles", "error"),
  })

  if (!open || !user) return null

  const assignedIds = new Set(rolesQuery.data?.map((r) => r.roleId))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card w-full max-w-lg rounded-lg border shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-sm font-semibold">
              {t("users.roles.manageTitle", { email: user.email })}
            </p>
            <p className="text-muted-foreground text-xs">
              {t("users.roles.manageHint") ?? "Assign RBAC roles to this user."}
            </p>
          </div>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t("users.roles.close") ?? "Close"}
          </Button>
        </div>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4">
          {roles.map((role) => {
            const checked = assignedIds.has(role.id)
            const disabled = addMut.isPending || removeMut.isPending
            return (
              <label
                key={role.id}
                className="border-border hover:bg-muted/40 flex items-start gap-3 rounded-lg border px-3 py-2"
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={checked}
                  disabled={disabled || role.isSystem}
                  onChange={() => {
                    if (checked) {
                      removeMut.mutate(role.id)
                    } else {
                      addMut.mutate(role.id)
                    }
                  }}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{role.name}</span>
                    {role.isSystem ? (
                      <Badge variant="outline" className="text-2xs">
                        {t("users.roles.system") ?? "System"}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {role.description ?? role.slug}
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    {role.permissions.slice(0, 4).join(", ")}
                    {role.permissions.length > 4 ? ` +${role.permissions.length - 4}` : ""}
                  </p>
                </div>
              </label>
            )
          })}
        </div>
        <div className="flex justify-end gap-2 border-t px-4 py-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("users.roles.close") ?? "Close"}
          </Button>
        </div>
      </div>
    </div>
  )
}

function UserFormDialog({
  open,
  mode,
  initial,
  token,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  mode: UserFormMode
  initial: UserPublicRow | null
  token: string
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const { t } = useTranslation()
  const [accountEmail, setAccountEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<ManagedStaffRole>("CUSTOMER_SERVICE")
  const [warehouseId, setWarehouseId] = useState("")
  const [adminWarehouseId, setAdminWarehouseId] = useState("")
  const [isActive, setIsActive] = useState(true)

  const sitesQuery = useQuery({
    queryKey: ["warehouse-sites", token, "user-form"],
    queryFn: () => listWarehouseSites(token),
    enabled: open && !!token,
  })

  useEffect(() => {
    if (!open) return
    if (mode === "edit" && initial) {
      setAccountEmail(initial.email)
      setFullName(initial.fullName)
      setPassword("")
      setRole(initial.role as ManagedStaffRole)
      setWarehouseId(initial.warehouseId ?? "")
      setAdminWarehouseId(initial.adminWarehouse?.id ?? "")
      setIsActive(initial.isActive)
    } else if (mode === "create") {
      setAccountEmail("")
      setFullName("")
      setPassword("")
      setRole("CUSTOMER_SERVICE")
      setWarehouseId("")
      setAdminWarehouseId("")
      setIsActive(true)
    }
  }, [open, mode, initial])

  const createMut = useMutation({
    mutationFn: () => {
      if (role === "WAREHOUSE" && !warehouseId.trim()) {
        throw new Error(t("users.form.errors.warehouseRequired"))
      }
      if (role === "WAREHOUSE_ADMIN" && !adminWarehouseId.trim()) {
        throw new Error(t("users.form.errors.adminWarehouseRequired"))
      }
      return createStaffUser({
        token,
        body: {
          email: accountEmail.trim(),
          fullName: fullName.trim(),
          password,
          role,
          ...(role === "WAREHOUSE" ? { warehouseId: warehouseId.trim() } : {}),
          ...(role === "WAREHOUSE_ADMIN"
            ? { adminWarehouseId: adminWarehouseId.trim() }
            : {}),
          isActive,
        },
      })
    },
    onSuccess: () => {
      showToast(t("users.feedback.created"), "success")
      onSuccess()
      onOpenChange(false)
    },
    onError: (e) => {
      showToast(e instanceof Error ? e.message : t("users.feedback.saveFailed"), "error")
    },
  })

  const updateMut = useMutation({
    mutationFn: () => {
      if (!initial) throw new Error("No user")
      if (role === "WAREHOUSE" && !warehouseId.trim()) {
        throw new Error(t("users.form.errors.warehouseRequired"))
      }
      const body: Parameters<typeof updateUser>[0]["body"] = {
        email: accountEmail.trim(),
        fullName: fullName.trim(),
        role,
        isActive,
      }
      if (password.trim().length > 0) {
        if (password.trim().length < 8) {
          throw new Error(t("users.form.errors.passwordMin"))
        }
        body.password = password.trim()
      }
      if (role === "WAREHOUSE") {
        body.warehouseId = warehouseId.trim()
      }
      if (role === "WAREHOUSE_ADMIN") {
        if (!adminWarehouseId.trim()) {
          throw new Error(t("users.form.errors.adminWarehouseRequired"))
        }
        body.adminWarehouseId = adminWarehouseId.trim()
      }
      return updateUser({ token, id: initial.id, body })
    },
    onSuccess: () => {
      showToast(t("users.feedback.updated"), "success")
      onSuccess()
      onOpenChange(false)
    },
    onError: (e) => {
      showToast(e instanceof Error ? e.message : t("users.feedback.saveFailed"), "error")
    },
  })

  const pending = createMut.isPending || updateMut.isPending

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === "create") {
      if (password.trim().length < 8) {
        showToast(t("users.form.errors.passwordMin"), "error")
        return
      }
      createMut.mutate()
    } else {
      updateMut.mutate()
    }
  }

  if (!open) return null

  const warehouses = sitesQuery.data?.warehouses ?? []

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal
      aria-label={mode === "create" ? t("users.form.createTitle") : t("users.form.editTitle")}
    >
      <div className="bg-card max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">
            {mode === "create" ? t("users.form.createTitle") : t("users.form.editTitle")}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label={t("users.form.close")}
          >
            <X className="size-4" />
          </Button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3 p-4">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="user-email">
              {t("users.form.email")}
            </label>
            <Input
              id="user-email"
              type="email"
              value={accountEmail}
              onChange={(e) => setAccountEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="user-fullname">
              {t("users.form.fullName")}
            </label>
            <Input
              id="user-fullname"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="user-password">
              {mode === "create" ? t("users.form.password") : t("users.form.passwordOptional")}
            </label>
            <Input
              id="user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={mode === "create"}
              autoComplete={mode === "create" ? "new-password" : "new-password"}
              minLength={mode === "create" ? 8 : undefined}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="user-role">
              {t("users.form.role")}
            </label>
            <select
              id="user-role"
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as ManagedStaffRole)}
            >
              {MANAGED_ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`users.roles.${r}`)}
                </option>
              ))}
            </select>
          </div>
          {role === "WAREHOUSE" ? (
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="user-warehouse">
                {t("users.form.warehouse")}
              </label>
              <select
                id="user-warehouse"
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                required
              >
                <option value="">{t("users.form.selectWarehouse")}</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
              {sitesQuery.isLoading ? (
                <p className="text-muted-foreground text-xs">{t("users.form.loadingSites")}</p>
              ) : null}
            </div>
          ) : null}
          {role === "WAREHOUSE_ADMIN" ? (
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="user-admin-warehouse">
                {t("users.form.adminWarehouse")}
              </label>
              <select
                id="user-admin-warehouse"
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                value={adminWarehouseId}
                onChange={(e) => setAdminWarehouseId(e.target.value)}
                required
              >
                <option value="">{t("users.form.selectWarehouse")}</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
              {sitesQuery.isLoading ? (
                <p className="text-muted-foreground text-xs">{t("users.form.loadingSites")}</p>
              ) : null}
            </div>
          ) : null}
          {mode === "edit" ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              {t("users.form.active")}
            </label>
          ) : null}
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("users.form.cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? t("users.form.saving") : t("users.form.save")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DeactivateConfirmDialog({
  open,
  row,
  token,
  currentUserId,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  row: UserPublicRow | null
  token: string
  currentUserId: string | undefined
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const { t } = useTranslation()
  const mut = useMutation({
    mutationFn: () => {
      if (!row) throw new Error("No user")
      return deactivateUser({ token, id: row.id })
    },
    onSuccess: () => {
      showToast(t("users.feedback.deactivated"), "success")
      onSuccess()
      onOpenChange(false)
    },
    onError: (e) => {
      showToast(e instanceof ApiError ? e.message : t("users.feedback.deactivateFailed"), "error")
    },
  })

  if (!open || !row) return null

  const isSelf = row.id === currentUserId

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal
      aria-label={t("users.deactivate.title")}
    >
      <div className="bg-card w-full max-w-sm rounded-lg border p-4 shadow-lg">
        <h2 className="text-sm font-semibold">{t("users.deactivate.title")}</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          {t("users.deactivate.body", { email: row.email })}
        </p>
        {isSelf ? (
          <p className="text-destructive mt-2 text-sm">{t("users.deactivate.cannotSelf")}</p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("users.deactivate.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={mut.isPending || isSelf}
            onClick={() => mut.mutate()}
          >
            {mut.isPending ? t("users.deactivate.working") : t("users.deactivate.confirm")}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function UsersPage() {
  const { t } = useTranslation()
  const { accessToken, user: authUser } = useAuth()
  const token = accessToken ?? ""
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const page = Number(searchParams.get("page") ?? "1") || 1
  const pageSize = Number(searchParams.get("pageSize") ?? "20") || 20
  const searchQ = searchParams.get("search") ?? ""
  const roleQ = searchParams.get("role") ?? ""
  const isActiveRaw = searchParams.get("isActive")
  const isActiveFilter =
    isActiveRaw === "true" ? true : isActiveRaw === "false" ? false : undefined
  const roleFilter = isManagedStaffRole(roleQ) ? roleQ : undefined

  const [searchDraft, setSearchDraft] = useState(searchQ)
  useEffect(() => {
    setSearchDraft(searchQ)
  }, [searchQ])

  const [createOpen, setCreateOpen] = useState(false)
  const [editRow, setEditRow] = useState<UserPublicRow | null>(null)
  const [deactivateRow, setDeactivateRow] = useState<UserPublicRow | null>(null)
  const [rolesDialogUser, setRolesDialogUser] = useState<UserPublicRow | null>(null)
  const [rolesDialogOpen, setRolesDialogOpen] = useState(false)

  const invalidateUsers = async () => {
    await queryClient.invalidateQueries({ queryKey: ["users", token] })
    await queryClient.invalidateQueries({ queryKey: ["user-stats", token] })
  }

  const statsQuery = useQuery({
    queryKey: ["user-stats", token],
    queryFn: () => getManagedStaffUserStats({ token }),
    enabled: !!token,
  })

  const listQueryKey = useMemo(
    () =>
      [
        "users",
        token,
        page,
        pageSize,
        true,
        searchQ,
        roleFilter ?? "",
        isActiveRaw ?? "",
      ] as const,
    [token, page, pageSize, searchQ, roleFilter, isActiveRaw],
  )

  const listQuery = useQuery({
    queryKey: listQueryKey,
    queryFn: () =>
      listUsers({
        token,
        page,
        pageSize,
        managedStaffOnly: true,
        ...(searchQ.trim() ? { search: searchQ.trim() } : {}),
        ...(roleFilter ? { role: roleFilter } : {}),
        ...(isActiveFilter !== undefined ? { isActive: isActiveFilter } : {}),
      }),
    enabled: !!token,
  })

  const activateMut = useMutation({
    mutationFn: (id: string) =>
      updateUser({ token, id, body: { isActive: true } }),
    onSuccess: async () => {
      showToast(t("users.feedback.activated"), "success")
      await invalidateUsers()
    },
    onError: (e) => {
      showToast(e instanceof ApiError ? e.message : t("users.feedback.activateFailed"), "error")
    },
  })

  const setPage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set("page", String(nextPage))
    setSearchParams(params)
  }

  const patchListParams = (mut: (p: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams)
    mut(params)
    setSearchParams(params)
  }

  const applySearchToUrl = () => {
    patchListParams((p) => {
      const t = searchDraft.trim()
      if (t) p.set("search", t)
      else p.delete("search")
      p.set("page", "1")
    })
  }

  const setRoleFilterParam = (value: string) => {
    patchListParams((p) => {
      if (value) p.set("role", value)
      else p.delete("role")
      p.set("page", "1")
    })
  }

  const setIsActiveParam = (value: "" | "true" | "false") => {
    patchListParams((p) => {
      if (value) p.set("isActive", value)
      else p.delete("isActive")
      p.set("page", "1")
    })
  }

  const clearListFilters = () => {
    setSearchDraft("")
    patchListParams((p) => {
      p.delete("search")
      p.delete("role")
      p.delete("isActive")
      p.set("page", "1")
    })
  }

  const totalPages = Math.max(1, Math.ceil((listQuery.data?.total ?? 0) / pageSize))
  const hasActiveFilters =
    searchQ.trim().length > 0 || !!roleFilter || isActiveFilter !== undefined

  const rolesQuery = useQuery({
    queryKey: ["rbac-roles", token],
    queryFn: () => listRoles(token),
    enabled: !!token,
  })
  const canManageRoles = (authUser?.permissions ?? []).includes("users.roles")

  const byRole = statsQuery.data?.byRole

  return (
    <Layout title={t("users.pageTitle")}>
      <div className="space-y-6">
        <Card className="from-primary/10 to-chart-2/10 border-primary/20 bg-gradient-to-br shadow-md">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="bg-primary/15 text-primary flex size-11 items-center justify-center rounded-xl">
              <Users className="size-5" aria-hidden />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg">{t("users.pageTitle")}</CardTitle>
              <CardDescription>{t("users.subtitle")}</CardDescription>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {MANAGED_ROLES.map((r) => {
            const { Icon, iconWrap } = ROLE_STAT_CARD[r]
            return (
              <Card key={r} className="border-border/80 shadow-sm">
                <CardHeader className="flex flex-row items-start gap-3 pb-2">
                  <div
                    className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${iconWrap}`}
                  >
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <CardDescription className="text-xs font-medium">
                      {t(`users.roles.${r}`)}
                    </CardDescription>
                    <CardTitle className="text-2xl tabular-nums">
                      {statsQuery.isLoading ? "…" : (byRole?.[r] ?? 0)}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-muted-foreground pt-0 text-xs">
                  {t("users.stats.activeOnlyHint")}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="border-border/60 flex flex-row flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div>
              <CardTitle className="text-base font-semibold">
                {t("users.tableCardTitle")}
              </CardTitle>
              <CardDescription>{t("users.tableCardDescription")}</CardDescription>
            </div>
            <Button type="button" onClick={() => setCreateOpen(true)}>
              {t("users.actions.addUser")}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
              <label className="grid min-w-[200px] flex-1 gap-1 text-sm">
                <span className="text-muted-foreground">{t("users.filters.search")}</span>
                <div className="flex gap-2">
                  <Input
                    value={searchDraft}
                    placeholder={t("users.filters.searchPlaceholder")}
                    onChange={(e) => setSearchDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") applySearchToUrl()
                    }}
                    className="min-w-0"
                  />
                  <Button type="button" variant="secondary" onClick={applySearchToUrl}>
                    {t("users.filters.applySearch")}
                  </Button>
                </div>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">{t("users.filters.role")}</span>
                <select
                  className="border-input bg-background h-9 min-w-[200px] rounded-md border px-3 text-sm"
                  value={roleFilter ?? ""}
                  onChange={(e) => setRoleFilterParam(e.target.value)}
                >
                  <option value="">{t("users.filters.allRoles")}</option>
                  {MANAGED_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {t(`users.roles.${r}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">{t("users.filters.activeStatus")}</span>
                <select
                  className="border-input bg-background h-9 min-w-[200px] rounded-md border px-3 text-sm"
                  value={
                    isActiveFilter === true ? "true" : isActiveFilter === false ? "false" : ""
                  }
                  onChange={(e) => {
                    const v = e.target.value
                    setIsActiveParam(v === "true" ? "true" : v === "false" ? "false" : "")
                  }}
                >
                  <option value="">{t("users.filters.allActive")}</option>
                  <option value="true">{t("users.filters.activeOnly")}</option>
                  <option value="false">{t("users.filters.inactiveOnly")}</option>
                </select>
              </label>
              {hasActiveFilters ? (
                <Button type="button" variant="outline" onClick={clearListFilters}>
                  {t("users.filters.clear")}
                </Button>
              ) : null}
            </div>

            {listQuery.error ? (
              <p className="text-destructive text-sm">{(listQuery.error as Error).message}</p>
            ) : null}
            {listQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">{t("users.loading")}</p>
            ) : null}

            {listQuery.data ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("users.table.email")}</TableHead>
                    <TableHead>{t("users.table.fullName")}</TableHead>
                    <TableHead>{t("users.table.role")}</TableHead>
                    <TableHead>{t("users.table.warehouse")}</TableHead>
                    <TableHead>{t("users.table.adminWarehouse")}</TableHead>
                    <TableHead>{t("users.table.active")}</TableHead>
                    <TableHead>{t("users.table.created")}</TableHead>
                    <TableHead>{t("users.table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listQuery.data.users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-muted-foreground text-center">
                        {t("users.empty")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    listQuery.data.users.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.email}</TableCell>
                        <TableCell>{row.fullName}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {t(`users.roles.${row.role as ManagedStaffRole}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>{row.warehouse?.name ?? "—"}</TableCell>
                        <TableCell>{row.adminWarehouse?.name ?? "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              row.isActive
                                ? "border-success/40 bg-success/12 font-medium text-success dark:border-success/45 dark:bg-success/18 dark:text-green-100"
                                : "border-muted bg-muted/40 font-medium text-muted-foreground"
                            }
                          >
                            {row.isActive ? t("users.active.yes") : t("users.active.no")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(row.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setEditRow(row)}
                            >
                              {t("users.actions.edit")}
                            </Button>
                            {row.isActive ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                disabled={row.id === authUser?.id}
                                onClick={() => setDeactivateRow(row)}
                              >
                                {t("users.actions.deactivate")}
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                disabled={activateMut.isPending}
                                onClick={() => activateMut.mutate(row.id)}
                              >
                                {t("users.actions.activate")}
                              </Button>
                            )}
                            {canManageRoles ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setRolesDialogUser(row)
                                  setRolesDialogOpen(true)
                                }}
                              >
                                {t("users.actions.manageRoles", "Manage roles")}
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2 border-border/60 border-t pt-4">
              <p className="text-muted-foreground text-sm">
                {t("users.pagination.summary", {
                  total: listQuery.data?.total ?? 0,
                  page,
                })}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  {t("users.pagination.prev")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  {t("users.pagination.next")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <UserFormDialog
        open={createOpen}
        mode="create"
        initial={null}
        token={token}
        onOpenChange={setCreateOpen}
        onSuccess={invalidateUsers}
      />
      <UserFormDialog
        open={editRow !== null}
        mode="edit"
        initial={editRow}
        token={token}
        onOpenChange={(o) => {
          if (!o) setEditRow(null)
        }}
        onSuccess={invalidateUsers}
      />
      <DeactivateConfirmDialog
        open={deactivateRow !== null}
        row={deactivateRow}
        token={token}
        currentUserId={authUser?.id}
        onOpenChange={(o) => {
          if (!o) setDeactivateRow(null)
        }}
        onSuccess={invalidateUsers}
      />
      {rolesDialogOpen && rolesDialogUser && rolesQuery.data ? (
        <ManageRolesDialog
          open={rolesDialogOpen}
          user={rolesDialogUser}
          token={token}
          roles={rolesQuery.data}
          onOpenChange={(o) => {
            setRolesDialogOpen(o)
            if (!o) setRolesDialogUser(null)
          }}
          onChanged={invalidateUsers}
        />
      ) : null}
    </Layout>
  )
}
