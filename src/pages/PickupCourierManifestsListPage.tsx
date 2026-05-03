import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link, Navigate, useParams } from "react-router-dom"

import {
  listWarehouseMovementManifests,
  type WarehouseMovementManifestStatus,
} from "@/api/shipments-api"
import { listPickupCouriers } from "@/api/pickup-couriers-api"
import { listWarehouseSites } from "@/api/warehouse-api"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { dedupePickupManifestsByCourierDay } from "@/features/manifests/dedupe-pickup-manifest-list"
import { ManifestsTabsHeader } from "@/features/manifests/ManifestsTabsHeader"
import { useAuth } from "@/lib/auth-context"
import { isWarehouseStaff } from "@/lib/warehouse-access"

function formatDate(dateIso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
    new Date(dateIso),
  )
}

function statusTone(status: WarehouseMovementManifestStatus): string {
  if (status === "DRAFT") return "bg-muted text-muted-foreground border-border"
  if (status === "LOCKED") return "bg-amber-500/10 text-amber-700 border-amber-500/25"
  if (status === "DISPATCHED") return "bg-sky-500/10 text-sky-700 border-sky-500/25"
  if (status === "CLOSED") return "bg-emerald-500/10 text-emerald-700 border-emerald-500/25"
  return "bg-muted text-muted-foreground border-border"
}

export function PickupCourierManifestsListPage() {
  const { t, i18n } = useTranslation()
  const { warehouseId = "" } = useParams<{ warehouseId: string }>()
  const { accessToken, user } = useAuth()
  const token = accessToken ?? ""
  const locale = i18n.language.startsWith("ar") ? "ar-EG" : "en-EG"

  const [status, setStatus] = useState<"" | WarehouseMovementManifestStatus>("")
  const [date, setDate] = useState("")

  const accessDenied = !!user && !(user.permissions ?? []).includes("warehouses.manage_transfer")
  const shouldForceOwnWarehouse =
    !!user &&
    isWarehouseStaff(user) &&
    !!user.warehouseId &&
    warehouseId &&
    user.warehouseId !== warehouseId

  const query = useQuery({
    queryKey: ["warehouse-movement-manifests-list", token, warehouseId, status, date],
    queryFn: () =>
      listWarehouseMovementManifests({
        token,
        warehouseId: warehouseId || undefined,
        status: status || undefined,
        date: date || undefined,
      }),
    enabled: Boolean(token && warehouseId && !accessDenied),
    refetchInterval: 15000,
  })

  const warehousesQuery = useQuery({
    queryKey: ["warehouse-sites", "for-transfer-task", token],
    queryFn: () => listWarehouseSites(token, { forTransferTask: true }),
    enabled: Boolean(token && !accessDenied),
    staleTime: 5 * 60_000,
  })

  const pickupCouriersQuery = useQuery({
    queryKey: ["pickup-couriers", "all", token],
    queryFn: () => listPickupCouriers({ token, page: 1, pageSize: 100 }),
    enabled: Boolean(token && !accessDenied),
    staleTime: 60_000,
  })

  const items = useMemo(() => query.data?.manifests ?? [], [query.data?.manifests])
  const transferDateLabel = (m: { transferDate: string | null; createdAt: string }) =>
    (m.transferDate ?? m.createdAt.slice(0, 10)) || ""

  const warehouseNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const w of warehousesQuery.data?.warehouses ?? []) {
      const name = String(w.name ?? "").trim()
      if (w.id && name) map.set(w.id, name)
    }
    return map
  }, [warehousesQuery.data?.warehouses])

  const pickupCourierNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of pickupCouriersQuery.data?.pickupCouriers ?? []) {
      const name = String(c.fullName ?? "").trim()
      if (c.id && name) map.set(c.id, name)
    }
    return map
  }, [pickupCouriersQuery.data?.pickupCouriers])

  const displayItems = useMemo(() => {
    const deduped = dedupePickupManifestsByCourierDay(items)
    const cName = (id: string) => pickupCourierNameById.get(id)?.trim() || id
    return [...deduped].sort((a, b) => {
      const ca = cName(a.assignedPickupCourierId).toLowerCase()
      const cb = cName(b.assignedPickupCourierId).toLowerCase()
      if (ca !== cb) return ca.localeCompare(cb)
      const da = transferDateLabel(a)
      const db = transferDateLabel(b)
      if (da !== db) return db.localeCompare(da)
      return b.createdAt.localeCompare(a.createdAt)
    })
  }, [items, pickupCourierNameById])

  const whLabel = (id: string | null | undefined) =>
    id ? warehouseNameById.get(id) ?? id : "—"
  const courierLabel = (id: string | null | undefined) =>
    id ? pickupCourierNameById.get(id) ?? id : "—"

  if (accessDenied) return <Navigate to="/" replace />
  if (shouldForceOwnWarehouse) {
    return <Navigate to={`/warehouses/${encodeURIComponent(user!.warehouseId!)}/manifests/pickup`} replace />
  }

  return (
    <Layout title={t("warehouse.manifests.title")}>
      <div className="space-y-4">
        <ManifestsTabsHeader warehouseId={warehouseId} active="pickup" />

        <div className="text-muted-foreground text-sm">
          {t("warehouse.pickupManifests.listDescription", {
            defaultValue: "Browse pickup-courier movement manifests (transfer/return).",
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {t("warehouse.pickupManifests.listTitle", { defaultValue: "Pickup manifests" })}
            </CardTitle>
            <CardDescription />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <select
                className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-xl border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                value={status}
                onChange={(e) => setStatus(e.target.value as "" | WarehouseMovementManifestStatus)}
              >
                <option value="">{t("common.all", { defaultValue: "All" })}</option>
                <option value="DRAFT">DRAFT</option>
                <option value="LOCKED">LOCKED</option>
                <option value="DISPATCHED">DISPATCHED</option>
                <option value="CLOSED">CLOSED</option>
              </select>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStatus("")
                  setDate("")
                }}
              >
                {t("common.clearFilters", { defaultValue: "Clear filters" })}
              </Button>
            </div>

            {query.isLoading ? (
              <p className="text-muted-foreground text-sm">{t("warehouse.loading")}</p>
            ) : null}
            {query.error ? (
              <p className="text-destructive text-sm">{(query.error as Error).message}</p>
            ) : null}

            <div className="overflow-x-auto rounded-lg border">
              <Table className="min-w-[56rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {t("warehouse.pickupManifests.columns.transferDate", {
                        defaultValue: "Transfer date",
                      })}
                    </TableHead>
                    <TableHead>{t("warehouse.pickupManifests.columns.status", { defaultValue: "Status" })}</TableHead>
                    <TableHead>{t("warehouse.pickupManifests.columns.fromWarehouse", { defaultValue: "From" })}</TableHead>
                    <TableHead>{t("warehouse.pickupManifests.columns.toWarehouse", { defaultValue: "To" })}</TableHead>
                    <TableHead>{t("warehouse.pickupManifests.columns.pickupCourier", { defaultValue: "Pickup courier" })}</TableHead>
                    <TableHead className="text-right">
                      {t("warehouse.pickupManifests.columns.tasks", { defaultValue: "Tasks" })}
                    </TableHead>
                    <TableHead className="text-right">{t("warehouse.pickupManifests.columns.actions", { defaultValue: "Actions" })}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayItems.map((m) => {
                    const mDate = transferDateLabel(m)
                    return (
                      <TableRow key={m.id} className="hover:bg-muted/50">
                        <TableCell className="text-sm">
                          {formatDate(`${mDate}T00:00:00.000Z`, locale)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${statusTone(m.status)}`}
                          >
                            {m.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{whLabel(m.fromWarehouseId)}</TableCell>
                        <TableCell className="text-sm">{whLabel(m.toWarehouseId)}</TableCell>
                        <TableCell className="text-sm">{courierLabel(m.assignedPickupCourierId)}</TableCell>
                        <TableCell className="text-right">{m.taskCount}</TableCell>
                        <TableCell className="text-right">
                          <Button type="button" variant="outline" size="sm" asChild>
                            <Link
                              to={`/warehouses/${encodeURIComponent(warehouseId)}/manifests/pickup/${encodeURIComponent(m.id)}`}
                            >
                              {t("common.view", { defaultValue: "View" })}
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {!query.isLoading && displayItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-muted-foreground py-8 text-center text-sm">
                        {t("warehouse.pickupManifests.empty", { defaultValue: "No pickup manifests found." })}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

