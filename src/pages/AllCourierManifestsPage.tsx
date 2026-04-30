import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { Link, Navigate } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { listDeliveryManifests, type DeliveryManifestListRow } from "@/api/delivery-manifests-api"
import { listWarehouseSites, type WarehouseSiteRow } from "@/api/warehouse-api"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ManifestQuickActions } from "@/features/delivery-manifest/ManifestQuickActions"
import { useAuth } from "@/lib/auth-context"
import { hasPlatformWarehouseScope } from "@/lib/warehouse-access"

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

  const canManage = useMemo(() => {
    return (
      permissions.includes("delivery_manifests.manage") ||
      permissions.includes("warehouses.manage_transfer") ||
      hasPlatformWarehouseScope(user)
    )
  }, [permissions, user])

  const [warehouseId, setWarehouseId] = useState("")
  const [status, setStatus] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 20

  const warehousesQuery = useQuery({
    queryKey: ["warehouse-sites-for-manifests", token],
    queryFn: () => listWarehouseSites(token),
    enabled: !!token && canReadAll,
  })

  const warehouseOptions = useMemo(() => {
    return sortWarehousesForSelect(warehousesQuery.data?.warehouses ?? [])
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

  const items = manifestsQuery.data?.items ?? []
  const total = manifestsQuery.data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  if (!user) return <Navigate to="/login" replace />
  if (!canReadAll) return <Navigate to="/" replace />

  return (
    <Layout title={t("nav.allCourierManifests", { defaultValue: "Courier manifests" })}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-muted-foreground text-sm">
            {t("manifestsGlobal.listDescription", {
              defaultValue: "Browse delivery manifests across warehouses and dates.",
            })}
          </div>
          <Button type="button" variant="outline" asChild>
            <Link to="/warehouses">{t("warehouse.detail.backToWarehouses", { defaultValue: "Warehouses" })}</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("manifestsGlobal.title", { defaultValue: "Manifests" })}</CardTitle>
            <CardDescription />
          </CardHeader>
          <CardContent className="space-y-3">
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
                              to={`/warehouses/${encodeURIComponent(m.warehouse.id)}/manifests/${encodeURIComponent(m.id)}`}
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
