import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, ShieldCheck, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  createRole,
  deleteRole,
  listPermissions,
  listRoles,
  listAudit,
  setRolePermissions,
  updateRole,
  type PermissionRow,
  type RoleRow,
} from "@/api/rbac-api"
import { Layout } from "@/components/layout/Layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/lib/auth-context"
import { permissionCategory, permissionLabel } from "@/lib/rbac-permission-i18n"
import { showToast } from "@/lib/toast"

type RoleFormMode = "create" | "edit"
type TranslateFn = ReturnType<typeof useTranslation>["t"]

function shortId(value: string | null | undefined): string {
  if (!value) return "—"
  return value.slice(0, 8)
}

function formatAuditAction(t: TranslateFn, action: string): string {
  const key = `rbac.audit.actions.${action}`
  const translated = t(key)
  return translated === key ? action : translated
}

function formatAuditTargetType(t: TranslateFn, targetType: string): string {
  const key = `rbac.audit.targets.${targetType}`
  const translated = t(key)
  return translated === key ? targetType : translated
}

function formatAuditActor(t: TranslateFn, entry: { actor?: { fullName: string; email: string } | null; actorUserId: string | null }): string {
  if (entry.actor?.fullName) return entry.actor.fullName
  if (entry.actor?.email) return entry.actor.email
  if (entry.actorUserId) return `${t("rbac.audit.fallback.userIdPrefix")} ${shortId(entry.actorUserId)}`
  return "—"
}

function formatAuditTarget(
  t: TranslateFn,
  entry: {
    targetType: string
    targetId: string | null
    target?: { label: string | null; subtitle: string | null } | null
  },
): string {
  const typeLabel = formatAuditTargetType(t, entry.targetType)
  if (entry.target?.label) {
    if (entry.target.subtitle) return `${typeLabel}: ${entry.target.label} (${entry.target.subtitle})`
    return `${typeLabel}: ${entry.target.label}`
  }
  if (entry.targetId) return `${typeLabel} (${shortId(entry.targetId)})`
  return typeLabel
}

function formatAuditDiff(
  t: TranslateFn,
  diff: unknown,
  rolesById: Map<string, RoleRow>,
  language: string,
): string {
  if (!diff || typeof diff !== "object" || Array.isArray(diff)) return "—"
  const record = diff as Record<string, unknown>
  if (Array.isArray(record.permissions)) {
    return t("rbac.audit.diffSummary.permissionsCount", { count: record.permissions.length })
  }
  if (typeof record.roleId === "string") {
    const role = rolesById.get(record.roleId)
    if (role) return t("rbac.audit.diffSummary.role", { role: role.displayName })
    return t("rbac.audit.diffSummary.roleId", { id: shortId(record.roleId) })
  }
  if (
    typeof record.name === "string" ||
    typeof record.nameAr === "string" ||
    typeof record.description === "string" ||
    typeof record.descriptionAr === "string"
  ) {
    const parts: string[] = []
    const name = typeof record.name === "string" ? record.name.trim() : ""
    const nameAr = typeof record.nameAr === "string" ? record.nameAr.trim() : ""
    const description = typeof record.description === "string" ? record.description.trim() : ""
    const descriptionAr = typeof record.descriptionAr === "string" ? record.descriptionAr.trim() : ""

    const prefersArabic = language.startsWith("ar")
    const displayName = prefersArabic ? (nameAr || name) : (name || nameAr)
    const displayDescription = prefersArabic
      ? (descriptionAr || description)
      : (description || descriptionAr)

    if (displayName) {
      parts.push(t("rbac.audit.diffSummary.displayName", { value: displayName }))
    }
    if (displayDescription) {
      parts.push(t("rbac.audit.diffSummary.displayDescription", { value: displayDescription }))
    }
    if (parts.length > 0) return parts.join(" | ")
  }
  const preview = JSON.stringify(record)
  return preview && preview.length > 120 ? `${preview.slice(0, 120)}...` : (preview || "—")
}

function RoleFormDialog({
  open,
  mode,
  initial,
  permissions,
  token,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  mode: RoleFormMode
  initial: RoleRow | null
  permissions: PermissionRow[]
  token: string
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState("")
  const [nameAr, setNameAr] = useState("")
  const [description, setDescription] = useState("")
  const [descriptionAr, setDescriptionAr] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!open) return
    if (mode === "edit" && initial) {
      setName(initial.name)
      setNameAr(initial.nameAr ?? "")
      setDescription(initial.description ?? "")
      setDescriptionAr(initial.descriptionAr ?? "")
      setSelected(new Set(initial.permissions))
    } else {
      setName("")
      setNameAr("")
      setDescription("")
      setDescriptionAr("")
      setSelected(new Set())
    }
  }, [open, mode, initial])

  const togglePermission = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const createMut = useMutation({
    mutationFn: () =>
      createRole({
        token,
        body: {
          name: name.trim(),
          nameAr: nameAr.trim() || undefined,
          description: description.trim() || undefined,
          descriptionAr: descriptionAr.trim() || undefined,
          permissions: Array.from(selected),
        },
      }),
    onSuccess: () => {
      showToast(t("rbac.toast.created"), "success")
      onSaved()
      onOpenChange(false)
    },
    onError: (e) => {
      showToast(e instanceof Error ? e.message : t("rbac.toast.createFailed"), "error")
    },
  })

  const updateMut = useMutation({
    mutationFn: async () => {
      if (!initial) throw new Error("No role")
      await updateRole({
        token,
        id: initial.id,
        body: {
          name: name.trim() || undefined,
          nameAr: nameAr.trim() || undefined,
          description: description.trim(),
          descriptionAr: descriptionAr.trim() || undefined,
        },
      })
      await setRolePermissions({
        token,
        id: initial.id,
        permissions: Array.from(selected),
      })
    },
    onSuccess: () => {
      showToast(t("rbac.toast.updated"), "success")
      onSaved()
      onOpenChange(false)
    },
    onError: (e) => {
      showToast(e instanceof Error ? e.message : t("rbac.toast.updateFailed"), "error")
    },
  })

  const pending = createMut.isPending || updateMut.isPending

  if (!open) return null

  const permsByCategory = permissions.reduce<Record<string, PermissionRow[]>>((acc, p) => {
    const cat = permissionCategory(t, p.key, p.category)
    acc[cat] = acc[cat] ?? []
    acc[cat]!.push(p)
    return acc
  }, {})

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === "create") {
      createMut.mutate()
    } else {
      updateMut.mutate()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card w-full max-w-3xl overflow-hidden rounded-lg border shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-sm font-semibold">
              {mode === "create"
                ? t("rbac.form.createTitle")
                : t("rbac.form.editTitleWithName", { name: initial?.name ?? "" })}
            </p>
            <p className="text-muted-foreground text-xs">
              {t("rbac.form.permissionsHint", "Select permissions to grant to this role.")}
            </p>
          </div>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("common.close")}
            </Button>
        </div>
        <form onSubmit={onSubmit} className="grid gap-4 p-5 md:grid-cols-[1.2fr,1fr]">
          <div className="space-y-3">
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">{t("rbac.form.name", "Name")}</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">{t("rbac.form.nameAr", "Arabic Name")}</span>
              <Input
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder={t("rbac.form.nameArPlaceholder")}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">
                {t("rbac.form.description", "Description")}
              </span>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">
                {t("rbac.form.descriptionAr", "Arabic Description")}
              </span>
              <Input
                value={descriptionAr}
                onChange={(e) => setDescriptionAr(e.target.value)}
                placeholder={t("rbac.form.descriptionArPlaceholder")}
              />
            </label>
          </div>

          <div className="max-h-[60vh] overflow-y-auto rounded-md border p-3">
            <div className="space-y-3">
              {Object.entries(permsByCategory)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([cat, rows]) => (
                  <div key={cat} className="space-y-1">
                    <p className="text-sm font-semibold">{cat}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {rows
                        .sort((a, b) =>
                          permissionLabel(t, a.key, a.label).localeCompare(
                            permissionLabel(t, b.key, b.label),
                          ),
                        )
                        .map((p) => (
                          <label
                            key={p.key}
                            className="border-input hover:bg-muted/50 flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={selected.has(p.key)}
                              onChange={() => togglePermission(p.key)}
                              className="h-4 w-4"
                            />
                            <div>
                              <div className="font-medium">
                                {permissionLabel(t, p.key, p.label)}
                              </div>
                              <div className="text-muted-foreground text-xs">{p.key}</div>
                            </div>
                          </label>
                        ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="md:col-span-2 flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("rbac.form.cancel", "Cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? t("rbac.form.saving", "Saving…")
                : mode === "create"
                  ? t("rbac.form.create", "Create role")
                  : t("rbac.form.save", "Save changes")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function RolesPage() {
  const { t, i18n } = useTranslation()
  const { user, accessToken } = useAuth()
  const token = accessToken ?? ""
  const qc = useQueryClient()
  const [openForm, setOpenForm] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleRow | null>(null)
  const [auditPage, setAuditPage] = useState(1)
  const auditPageSize = 20

  const rolesQuery = useQuery({
    queryKey: ["rbac-roles", token, i18n.language],
    queryFn: () => listRoles(token, i18n.language),
    enabled: !!token,
  })

  const permissionsQuery = useQuery({
    queryKey: ["rbac-perms", token],
    queryFn: () => listPermissions(token),
    enabled: !!token,
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteRole({ token, id }),
    onSuccess: () => {
      showToast(t("rbac.toast.deleted"), "success")
      void qc.invalidateQueries({ queryKey: ["rbac-roles"] })
    },
    onError: (e) =>
      showToast(e instanceof Error ? e.message : t("rbac.toast.deleteFailed"), "error"),
  })

  const onSaved = () => {
    void qc.invalidateQueries({ queryKey: ["rbac-roles"] })
  }

  const perms = permissionsQuery.data ?? []
  const roles = rolesQuery.data ?? []
  const rolesById = new Map(roles.map((r) => [r.id, r]))

  const systemCount = roles.filter((r) => r.isSystem).length

  const auditQuery = useQuery({
    queryKey: ["rbac-audit", token, auditPage, auditPageSize],
    queryFn: () => listAudit({ token, page: auditPage, pageSize: auditPageSize }),
    enabled: !!token,
  })

  return (
    <Layout title={t("rbac.pageTitle")}>
      <div className="space-y-5">
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-sky-100/40 shadow-sm">
          <CardHeader className="flex items-center gap-3 pb-2">
            <div className="bg-primary/20 text-primary flex size-11 items-center justify-center rounded-xl">
              <ShieldCheck className="size-5" aria-hidden />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold">{t("rbac.pageTitle")}</CardTitle>
              <CardDescription>{t("rbac.pageSubtitle")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4 text-sm">
            <Badge variant="secondary">{t("rbac.stats.roles", { count: roles.length })}</Badge>
            <Badge variant="secondary">{t("rbac.stats.perms", { count: perms.length })}</Badge>
            <Badge variant="outline">{t("rbac.stats.system", { count: systemCount })}</Badge>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" onClick={() => { setEditingRole(null); setOpenForm(true) }}>
            <Plus className="mr-2 size-4" aria-hidden /> {t("rbac.cta.newRole")}
          </Button>
          <p className="text-muted-foreground text-sm">
            {t("rbac.signedInAs", { email: user?.email ?? "—" })}
          </p>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">{t("rbac.tableTitle", "Roles")}</CardTitle>
            <CardDescription>{t("rbac.tableSubtitle", "Click a role to edit it.")}</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {rolesQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">{t("common.loading", "Loading…")}</p>
            ) : roles.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("rbac.table.empty")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("rbac.table.name")}</TableHead>
                    <TableHead>{t("rbac.table.description")}</TableHead>
                    <TableHead>{t("rbac.table.permissions")}</TableHead>
                    <TableHead>{t("rbac.table.type")}</TableHead>
                    <TableHead className="text-right">{t("rbac.table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        <div>{r.displayName}</div>
                        {i18n.language.startsWith("en") && r.nameAr && (
                          <div className="text-muted-foreground text-sm">{r.nameAr}</div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">
                        {r.displayDescription ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {r.permissions.slice(0, 6).map((p) => (
                            <Badge key={p} variant="secondary" className="text-2xs">
                              {permissionLabel(t, p, p)}
                            </Badge>
                          ))}
                          {r.permissions.length > 6 ? (
                            <Badge variant="outline">+{r.permissions.length - 6}</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {r.isSystem ? (
                          <Badge variant="outline" className="text-xs">
                            {t("rbac.roleKind.system")}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            {t("rbac.roleKind.custom")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingRole(r)
                              setOpenForm(true)
                            }}
                          >
                            {t("common.edit", "Edit")}
                          </Button>
                          {!r.isSystem ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              disabled={deleteMut.isPending}
                              onClick={() => deleteMut.mutate(r.id)}
                            >
                              <Trash2 className="mr-1 size-4" aria-hidden />{" "}
                              {t("common.delete", "Delete")}
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">{t("rbac.audit.cardTitle")}</CardTitle>
            <CardDescription>{t("rbac.audit.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {auditQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">{t("rbac.audit.loading")}</p>
            ) : auditQuery.data && auditQuery.data.entries.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("rbac.audit.when")}</TableHead>
                      <TableHead>{t("rbac.audit.action")}</TableHead>
                      <TableHead>{t("rbac.audit.target")}</TableHead>
                      <TableHead>{t("rbac.audit.actor")}</TableHead>
                      <TableHead>{t("rbac.audit.diff")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditQuery.data.entries.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(e.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-medium">{formatAuditAction(t, e.action)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatAuditTarget(t, e)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatAuditActor(t, e)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[360px] whitespace-normal break-words">
                          {formatAuditDiff(t, e.diffJson, rolesById, i18n.language)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex items-center justify-between pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={auditPage <= 1}
                    onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                  >
                    {t("rbac.audit.prev")}
                  </Button>
                  <span className="text-muted-foreground text-sm">
                    {t("rbac.audit.pageLabel", {
                      page: auditQuery.data.page,
                      pages: Math.max(
                        1,
                        Math.ceil(auditQuery.data.total / auditQuery.data.pageSize),
                      ),
                    })}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      auditQuery.data.page >=
                      Math.ceil(auditQuery.data.total / auditQuery.data.pageSize)
                    }
                    onClick={() =>
                      setAuditPage((p) =>
                        p + 1 >
                        Math.ceil(auditQuery.data!.total / auditQuery.data!.pageSize)
                          ? p
                          : p + 1
                      )
                    }
                  >
                    {t("rbac.audit.next")}
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">{t("rbac.audit.empty")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {openForm && permissionsQuery.data ? (
        <RoleFormDialog
          open={openForm}
          mode={editingRole ? "edit" : "create"}
          initial={editingRole}
          permissions={permissionsQuery.data}
          token={token}
          onOpenChange={setOpenForm}
          onSaved={onSaved}
        />
      ) : null}
    </Layout>
  )
}
