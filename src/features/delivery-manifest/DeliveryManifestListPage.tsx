import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { Link, Navigate, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"

import {
  getDeliveryManifestRoutesBatch,
  listDeliveryManifests,
  type DeliveryManifestListRow,
} from "@/api/delivery-manifests-api"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ManifestQuickActions } from "@/features/delivery-manifest/ManifestQuickActions"
import { ManifestRoutePreviewModal } from "@/features/delivery-manifest/components/ManifestRoutePreviewModal"
import { ManifestsTabsHeader } from "@/features/manifests/ManifestsTabsHeader"
import { useAuth } from "@/lib/auth-context"
import {
  canManageDeliveryManifests,
  hasPlatformWarehouseScope,
  isWarehouseStaff,
} from "@/lib/warehouse-access"

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

export function DeliveryManifestListPage() {
  const { t } = useTranslation()
  const { warehouseId = "" } = useParams<{ warehouseId: string }>()
  const { accessToken, user } = useAuth()
  const token = accessToken ?? ""
  const permissions = user?.permissions ?? []
  const canReadAll =
    permissions.includes("delivery_manifests.read_all") ||
    permissions.includes("courier_manifests.read_all") ||
    hasPlatformWarehouseScope(user)
  const canReadLocal = permissions.includes("delivery_manifests.read")
  const accessDenied = !!user && !canReadAll && !canReadLocal

  const shouldForceOwnWarehouse =
    !!user &&
    !canReadAll &&
    isWarehouseStaff(user) &&
    !!user.warehouseId &&
    warehouseId &&
    user.warehouseId !== warehouseId

  const [status, setStatus] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 20

  const query = useQuery({
    queryKey: ["delivery-manifests-list", token, warehouseId, status, fromDate, toDate, page, pageSize],
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
    enabled: !!token && !!warehouseId && !accessDenied,
  })

  const items = query.data?.items ?? []
  const total = query.data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const apiKey = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "")

  const routesQuery = useQuery({
    queryKey: ["delivery-manifests-routes-batch", token, items.map((i) => i.id).join(",")],
    queryFn: async () =>
      getDeliveryManifestRoutesBatch({ token, manifestIds: items.map((i) => i.id) }),
    enabled: !!token && items.length > 0,
    staleTime: 30000,
  })

  const routesById = routesQuery.data?.routes ?? {}

  const canManage = canManageDeliveryManifests(user)

  if (accessDenied) return <Navigate to="/" replace />
  if (shouldForceOwnWarehouse) {
    return <Navigate to={`/warehouses/${encodeURIComponent(user!.warehouseId!)}/manifests`} replace />
  }

  return (
    <Layout title={t("warehouse.manifests.title")}>
      <div className="space-y-4">
        <ManifestsTabsHeader
          warehouseId={warehouseId}
          active="delivery"
          rightSlot={
            <>
              <Button type="button" variant="outline" asChild>
                <Link to={`/warehouses/${encodeURIComponent(warehouseId)}/manifests/workspace`}>
                  {t("warehouse.manifests.workspace", { defaultValue: "Workspace" })}
                </Link>
              </Button>
              <Button
                type="button"
                asChild
                disabled={!canManage}
                title={
                  !canManage
                    ? t("warehouse.manifests.managePermissionHint", {
                        defaultValue:
                          "Missing permission: delivery_manifests.manage, courier_manifests.manage, or warehouses.manage_transfer.",
                      })
                    : undefined
                }
              >
                <Link to={`/warehouses/${encodeURIComponent(warehouseId)}/manifests/workspace`}>
                  {t("warehouse.manifests.create.cta", { defaultValue: "Create manifest" })}
                </Link>
              </Button>
            </>
          }
        />

        <div className="text-muted-foreground text-sm">
          {t("warehouse.manifests.listDescription", {
            defaultValue: "Browse delivery manifests across all statuses.",
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("warehouse.manifests.listTitle", { defaultValue: "Manifests" })}</CardTitle>
            <CardDescription />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-4">
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
              <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1) }} />
              <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1) }} />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
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
              <Table className="min-w-[64rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Courier</TableHead>
                    <TableHead>Zone</TableHead>
                  <TableHead>Route</TableHead>
                    <TableHead className="text-right">Shipments</TableHead>
                    <TableHead className="text-right">Total COD</TableHead>
                    <TableHead>Locked</TableHead>
                    <TableHead>Dispatched</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((m) => (
                  (() => {
                    const route = routesById[m.id]
                    const isReady = route?.status === "READY"
                    return (
                    <TableRow key={m.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{m.manifestDate}</TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${statusTone(m.status)}`}>
                          {m.status}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[16rem] truncate">
                        {m.courier.fullName?.trim() || m.courier.id}
                      </TableCell>
                      <TableCell className="max-w-[16rem] truncate">
                        {m.deliveryZone.name?.trim() || m.deliveryZone.id}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ManifestRoutePreviewModal
                            apiKey={apiKey}
                            route={route}
                            isLoading={routesQuery.isLoading}
                            error={routesQuery.error ? (routesQuery.error as Error).message : null}
                            triggerLabel="Preview route"
                            disabled={!route}
                          />
                          {isReady ? (
                            <span className="bg-emerald-500/10 text-emerald-700 inline-flex w-fit rounded-full border border-emerald-500/25 px-2 py-0.5 text-xs">
                              Suggested Route
                            </span>
                          ) : route?.status === "FAILED" ? (
                            <span className="bg-amber-500/10 text-amber-700 inline-flex w-fit rounded-full border border-amber-500/25 px-2 py-0.5 text-xs">
                              Route blocked
                            </span>
                          ) : (
                            <span className="bg-muted text-muted-foreground inline-flex w-fit rounded-full border px-2 py-0.5 text-xs">
                              Route pending
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{m.shipmentCount}</TableCell>
                      <TableCell className="text-right">{formatMoney(m.totalCod)}</TableCell>
                      <TableCell className="text-sm">{m.lockedAt ? "Yes" : "—"}</TableCell>
                      <TableCell className="text-sm">{m.dispatchedAt ? "Yes" : "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <ManifestQuickActions token={token} manifest={m} canManage={canManage} />
                          <Button type="button" variant="outline" size="sm" asChild>
                            <Link to={`/warehouses/${encodeURIComponent(warehouseId)}/manifests/${m.id}`}>
                              View
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    )
                  })()
                  ))}
                  {!query.isLoading && items.length === 0 ? (
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
                <Button type="button" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
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
      </div>
    </Layout>
  )
}

