import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { Link, Navigate, useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { listDeliveryManifests, type DeliveryManifestListRow } from "@/api/delivery-manifests-api"
import { listPickupCouriers } from "@/api/pickup-couriers-api"
import {
  listWarehouseMovementManifests,
  type WarehouseMovementManifestStatus,
} from "@/api/shipments-api"
import { listWarehouseSites, type WarehouseSiteRow } from "@/api/warehouse-api"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ManifestQuickActions } from "@/features/delivery-manifest/ManifestQuickActions"
import { dedupePickupManifestsByCourierDay } from "@/features/manifests/dedupe-pickup-manifest-list"
import { ManifestsTabsHeader } from "@/features/manifests/ManifestsTabsHeader"
import { useAuth } from "@/lib/auth-context"
import { canManageDeliveryManifests, hasPlatformWarehouseScope } from "@/lib/warehouse-access"

function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function statusTone(status: DeliveryManifestListRow["status"]): string {
  if (status === "DRAFT") return "bg-muted text-muted-foreground border-border"
  if (status === "LOCKED") return "bg-amber-500/10 text-amber-700 border-amber-500/25"
  if (status === "DISPATCHED") return "bg-sky-500/10 text-sky-700 border-sky-500/25"
  if (status === "CLOSED") return "bg-emerald-500/10 text-emerald-700 border-emerald-500/25"
  return "bg-muted text-muted-foreground border-border"
}

function sortWarehousesForSelect(rows: WarehouseSiteRow[]): WarehouseSiteRow[] {
  return [...rows].sort((a, b) => (a.name || "").localeCompare(b.name || ""))
}

/**
 * `/courier-manifests` now shows **delivery manifests** across the system.
 * Filterable by warehouse + date window.
 */
export function AllCourierManifestsPage() {
  const { t } = useTranslation()
  const { accessToken, user } = useAuth()
  const token = accessToken ?? ""
  const permissions = user?.permissions ?? []

  // This route is permission-gated in `App.tsx` by `courier_manifests.read_all`.
  // We still keep defensive checks since this page is used as a shared entry point.
  const canReadAll =
    permissions.includes("delivery_manifests.read_all") ||
    permissions.includes("courier_manifests.read_all") ||
    hasPlatformWarehouseScope(user)

  const canManage = canManageDeliveryManifests(user)
  const canReadPickupManifests = permissions.includes("warehouses.manage_transfer")

  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get("tab") === "pickup" ? "pickup" : "delivery"
  const tab: "delivery" | "pickup" =
    tabFromUrl === "pickup" && canReadPickupManifests ? "pickup" : "delivery"
  const setTab = (next: "delivery" | "pickup") => {
    if (next === "pickup" && !canReadPickupManifests) return
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next === "pickup") p.set("tab", "pickup")
        else p.delete("tab")
        return p
      },
      { replace: true },
    )
  }

  const [warehouseId, setWarehouseId] = useState("")
  const [status, setStatus] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 20

  const [pickupWarehouseId, setPickupWarehouseId] = useState("")
  const [pickupStatus, setPickupStatus] = useState<"" | WarehouseMovementManifestStatus>("")
  const [pickupDate, setPickupDate] = useState("")

  const warehousesQuery = useQuery({
    queryKey: ["warehouse-sites-for-manifests", token],
    queryFn: () => listWarehouseSites(token),
    enabled: !!token && canReadAll,
  })

  const warehouseOptions = useMemo(() => {
    return sortWarehousesForSelect(warehousesQuery.data?.warehouses ?? [])
  }, [warehousesQuery.data?.warehouses])

  const warehouseNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const w of warehousesQuery.data?.warehouses ?? []) {
      const name = String(w.name ?? "").trim()
      if (w.id && name) map.set(w.id, name)
    }
    return map
  }, [warehousesQuery.data?.warehouses])

  const manifestsQuery = useQuery({
    queryKey: [
      "delivery-manifests-global",
      token,
      warehouseId,
      status,
      fromDate,
      toDate,
      page,
      pageSize,
    ],
    queryFn: () =>
      listDeliveryManifests({
        token,
        warehouseId: warehouseId || undefined,
        status: status || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page,
        pageSize,
      }),
    enabled: !!token && canReadAll,
  })

  const pickupCouriersQuery = useQuery({
    queryKey: ["pickup-couriers", "all", token],
    queryFn: () => listPickupCouriers({ token, page: 1, pageSize: 500 }),
    enabled: !!token && canReadAll && canReadPickupManifests && tab === "pickup",
    staleTime: 60_000,
  })

  const pickupCourierNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of pickupCouriersQuery.data?.pickupCouriers ?? []) {
      const name = String(c.fullName ?? "").trim()
      if (c.id && name) map.set(c.id, name)
    }
    return map
  }, [pickupCouriersQuery.data?.pickupCouriers])

  const pickupManifestsQuery = useQuery({
    queryKey: [
      "warehouse-movement-manifests-global",
      token,
      pickupWarehouseId,
      pickupStatus,
      pickupDate,
    ],
    queryFn: () =>
      listWarehouseMovementManifests({
        token,
        warehouseId: pickupWarehouseId || undefined,
        status: pickupStatus || undefined,
        date: pickupDate || undefined,
      }),
    enabled: !!token && canReadAll && canReadPickupManifests && tab === "pickup",
    refetchInterval: 15000,
  })

  const firstWarehouseId = (warehouseOptions[0]?.id ?? "").trim()

  const browseWorkspaceWarehouseId = useMemo(() => {
    if (warehouseId.trim()) return warehouseId.trim()
    if (user?.warehouseId?.trim()) return user.warehouseId.trim()
    if (firstWarehouseId) return firstWarehouseId
    return ""
  }, [warehouseId, user?.warehouseId, firstWarehouseId])

  const createManifestWarehouseId = useMemo(() => {
    if (warehouseId.trim()) return warehouseId.trim()
    if (user?.warehouseId?.trim()) return user.warehouseId.trim()
    if (firstWarehouseId && canManage) return firstWarehouseId
    return ""
  }, [warehouseId, user?.warehouseId, firstWarehouseId, canManage])

  const browseWorkspaceHref = browseWorkspaceWarehouseId
    ? `/warehouses/${encodeURIComponent(browseWorkspaceWarehouseId)}/manifests/workspace`
    : ""
  const createManifestHref = createManifestWarehouseId
    ? `/warehouses/${encodeURIComponent(createManifestWarehouseId)}/manifests/workspace`
    : ""

  const managePermissionHint = t("warehouse.manifests.managePermissionHint", {
    defaultValue:
      "Missing permission: delivery_manifests.manage, courier_manifests.manage, or warehouses.manage_transfer.",
  })

  const pickupManifestRows = useMemo(() => {
    const deduped = dedupePickupManifestsByCourierDay(pickupManifestsQuery.data?.manifests ?? [])
    const fromName = (id: string) => warehouseNameById.get(id)?.trim() || id
    const courierN = (id: string) => pickupCourierNameById.get(id)?.trim() || id
    const day = (m: (typeof deduped)[0]) => m.transferDate ?? m.createdAt.slice(0, 10)
    return [...deduped].sort((a, b) => {
      const fa = fromName(a.fromWarehouseId).toLowerCase()
      const fb = fromName(b.fromWarehouseId).toLowerCase()
      if (fa !== fb) return fa.localeCompare(fb)
      const ca = courierN(a.assignedPickupCourierId).toLowerCase()
      const cb = courierN(b.assignedPickupCourierId).toLowerCase()
      if (ca !== cb) return ca.localeCompare(cb)
      const da = day(a)
      const db = day(b)
      if (da !== db) return db.localeCompare(da)
      return b.createdAt.localeCompare(a.createdAt)
    })
  }, [
    pickupManifestsQuery.data?.manifests,
    warehouseNameById,
    pickupCourierNameById,
  ])

  const items = manifestsQuery.data?.items ?? []
  const total = manifestsQuery.data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  if (!user) return <Navigate to="/login" replace />
  if (!canReadAll) return <Navigate to="/" replace />

  return (
    <Layout title={t("nav.allCourierManifests", { defaultValue: "Courier manifests" })}>
      <div className="space-y-4">
        <ManifestsTabsHeader
          active={tab}
          onTabChange={setTab}
          pickupDisabled={!canReadPickupManifests}
          pickupDisabledTitle={t("manifestsGlobal.pickupPermissionRequired", {
            defaultValue: "Missing permission: warehouses.manage_transfer",
          })}
          rightSlot={
            <>
              <Button type="button" variant="outline" asChild>
                <Link to="/warehouses">
                  {t("warehouse.detail.backToWarehouses", { defaultValue: "Warehouses" })}
                </Link>
              </Button>
              {tab === "delivery" ? (
                <>
                  {browseWorkspaceHref ? (
                    <Button type="button" variant="outline" asChild>
                      <Link to={browseWorkspaceHref}>
                        {t("warehouse.manifests.workspace", { defaultValue: "Workspace" })}
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      disabled
                      title={t("manifestsGlobal.workspaceNeedsWarehouse", {
                        defaultValue:
                          "Load warehouse list or choose a warehouse in the filter to open the manifest workspace.",
                      })}
                    >
                      {t("warehouse.manifests.workspace", { defaultValue: "Workspace" })}
                    </Button>
                  )}
                  {createManifestHref ? (
                    <Button
                      type="button"
                      asChild
                      disabled={!canManage}
                      title={!canManage ? managePermissionHint : undefined}
                    >
                      <Link to={createManifestHref}>
                        {t("warehouse.manifests.create.cta", { defaultValue: "Create manifest" })}
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      disabled
                      title={
                        canManage
                          ? t("manifestsGlobal.workspaceNeedsWarehouse", {
                              defaultValue:
                                "Load warehouse list or choose a warehouse in the filter to open the manifest workspace.",
                            })
                          : managePermissionHint
                      }
                    >
                      {t("warehouse.manifests.create.cta", { defaultValue: "Create manifest" })}
                    </Button>
                  )}
                </>
              ) : null}
            </>
          }
        />

        <p className="text-muted-foreground text-sm">
          {tab === "delivery"
            ? t("manifestsGlobal.listDescription", {
                defaultValue: "Browse delivery manifests across warehouses and dates.",
              })
            : t("manifestsGlobal.pickupDescription", {
                defaultValue: "Browse pickup movement manifests (transfer/return) across warehouses.",
              })}
        </p>

        <Card>
          <CardHeader>
            <CardTitle>{t("manifestsGlobal.title", { defaultValue: "Manifests" })}</CardTitle>
            <CardDescription />
          </CardHeader>
          <CardContent className="space-y-3">
            {tab === "delivery" ? (
              <div className="grid gap-3 md:grid-cols-5">
              <select
                className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-xl border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                value={warehouseId}
                onChange={(e) => {
                  setWarehouseId(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">All warehouses</option>
                {warehouseOptions.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>

              <select
                className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-xl border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">All statuses</option>
                <option value="DRAFT">DRAFT</option>
                <option value="LOCKED">LOCKED</option>
                <option value="DISPATCHED">DISPATCHED</option>
                <option value="CLOSED">CLOSED</option>
              </select>

              <Input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value)
                  setPage(1)
                }}
              />
              <Input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value)
                  setPage(1)
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setWarehouseId("")
                  setStatus("")
                  setFromDate("")
                  setToDate("")
                  setPage(1)
                }}
              >
                Clear filters
              </Button>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-4">
                <select
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-xl border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  value={pickupWarehouseId}
                  onChange={(e) => setPickupWarehouseId(e.target.value)}
                >
                  <option value="">
                    {t("manifestsGlobal.allWarehouses", { defaultValue: "All warehouses" })}
                  </option>
                  {warehouseOptions.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>

                <select
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-xl border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  value={pickupStatus}
                  onChange={(e) => setPickupStatus(e.target.value as "" | WarehouseMovementManifestStatus)}
                >
                  <option value="">{t("common.all", { defaultValue: "All" })}</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="LOCKED">LOCKED</option>
                  <option value="DISPATCHED">DISPATCHED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>

                <Input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPickupWarehouseId("")
                    setPickupStatus("")
                    setPickupDate("")
                  }}
                >
                  {t("common.clearFilters", { defaultValue: "Clear filters" })}
                </Button>
              </div>
            )}

            {tab === "delivery" ? (
              <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[72rem]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Courier</TableHead>
                      <TableHead>Zone</TableHead>
                      <TableHead className="text-right">Shipments</TableHead>
                      <TableHead className="text-right">Total COD</TableHead>
                      <TableHead>Locked</TableHead>
                      <TableHead>Dispatched</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((m) => (
                      <TableRow key={m.id} className="hover:bg-muted/50">
                        <TableCell className="max-w-[16rem] truncate font-medium">
                          {m.warehouse.name?.trim() || m.warehouse.id}
                        </TableCell>
                        <TableCell className="font-medium">{m.manifestDate}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${statusTone(m.status)}`}
                          >
                            {m.status}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[16rem] truncate">
                          {m.courier.fullName?.trim() || m.courier.id}
                        </TableCell>
                        <TableCell className="max-w-[16rem] truncate">
                          {m.deliveryZone.name?.trim() || m.deliveryZone.id}
                        </TableCell>
                        <TableCell className="text-right">{m.shipmentCount}</TableCell>
                        <TableCell className="text-right">{formatMoney(m.totalCod)}</TableCell>
                        <TableCell className="text-sm">{m.lockedAt ? "Yes" : "—"}</TableCell>
                        <TableCell className="text-sm">{m.dispatchedAt ? "Yes" : "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <ManifestQuickActions token={token} manifest={m} canManage={canManage} />
                            <Button type="button" variant="outline" size="sm" asChild>
                              <Link
                                to={`/warehouses/${encodeURIComponent(
                                  m.warehouse.id,
                                )}/manifests/${encodeURIComponent(m.id)}`}
                              >
                                View
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!manifestsQuery.isLoading && items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-muted-foreground py-8 text-center text-sm">
                          No manifests found.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[72rem]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {t("manifestsGlobal.columns.warehouse", { defaultValue: "Warehouse" })}
                      </TableHead>
                      <TableHead>
                        {t("warehouse.pickupManifests.columns.transferDate", {
                          defaultValue: "Transfer date",
                        })}
                      </TableHead>
                      <TableHead>
                        {t("warehouse.pickupManifests.columns.status", { defaultValue: "Status" })}
                      </TableHead>
                      <TableHead>
                        {t("warehouse.pickupManifests.columns.toWarehouse", { defaultValue: "To" })}
                      </TableHead>
                      <TableHead>
                        {t("warehouse.pickupManifests.columns.pickupCourier", {
                          defaultValue: "Pickup courier",
                        })}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("warehouse.pickupManifests.columns.tasks", { defaultValue: "Tasks" })}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("warehouse.pickupManifests.columns.actions", { defaultValue: "Actions" })}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pickupManifestRows.map((m) => {
                      const transferDate = m.transferDate ?? m.createdAt.slice(0, 10)
                      const fromName = warehouseNameById.get(m.fromWarehouseId) ?? m.fromWarehouseId
                      const toName = m.toWarehouseId
                        ? warehouseNameById.get(m.toWarehouseId) ?? m.toWarehouseId
                        : "—"
                      const courierName =
                        pickupCourierNameById.get(m.assignedPickupCourierId) ??
                        m.assignedPickupCourierId

                      const pickupStatusTone =
                        m.status === "DRAFT"
                          ? "bg-muted text-muted-foreground border-border"
                          : m.status === "LOCKED"
                            ? "bg-amber-500/10 text-amber-700 border-amber-500/25"
                            : m.status === "DISPATCHED"
                              ? "bg-sky-500/10 text-sky-700 border-sky-500/25"
                              : m.status === "CLOSED"
                                ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/25"
                                : "bg-muted text-muted-foreground border-border"

                      return (
                        <TableRow key={m.id} className="hover:bg-muted/50">
                          <TableCell className="max-w-[16rem] truncate font-medium">
                            {fromName}
                          </TableCell>
                          <TableCell className="font-medium">{transferDate}</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${pickupStatusTone}`}
                            >
                              {m.status}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[16rem] truncate">{toName}</TableCell>
                          <TableCell className="max-w-[16rem] truncate">{courierName}</TableCell>
                          <TableCell className="text-right">{m.taskCount}</TableCell>
                          <TableCell className="text-right">
                            <Button type="button" variant="outline" size="sm" asChild>
                              <Link
                                to={`/courier-manifests/pickup/${encodeURIComponent(m.id)}`}
                              >
                                {t("common.view", { defaultValue: "View" })}
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {!pickupManifestsQuery.isLoading && pickupManifestRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-muted-foreground py-8 text-center text-sm">
                          {t("warehouse.pickupManifests.empty", {
                            defaultValue: "No pickup manifests found.",
                          })}
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            )}

            {tab === "delivery" ? (
              <div className="flex items-center justify-between gap-2">
                <p className="text-muted-foreground text-sm">
                  Page {page} of {pageCount} • {total} manifests
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Prev
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={page >= pageCount}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {!warehousesQuery.isLoading && warehouseOptions.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Warehouses unavailable</CardTitle>
              <CardDescription>
                The warehouse directory returned no sites, so filtering by warehouse is not available.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </div>
    </Layout>
  )
}
