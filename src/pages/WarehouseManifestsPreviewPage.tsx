import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link, Navigate, useNavigate, useParams } from "react-router-dom"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  closeCourierManifest,
  dispatchCourierManifest,
  listCourierManifests,
  lockCourierManifest,
  type CourierManifestRow,
} from "@/api/courier-manifests-api"
import {
  getWarehouseCouriers,
  getWarehouseSite,
  getWarehouseZoneLinks,
  type WarehouseCourierRow,
} from "@/api/warehouse-api"
import { aggregateCourierLoadByZone, aggregateShipmentDistributionByCourier } from "@/features/warehouse/manifests/manifest-aggregations"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/lib/auth-context"
import { hasPlatformWarehouseScope, isWarehouseAdmin, isWarehouseStaff } from "@/lib/warehouse-access"
import { showToast } from "@/lib/toast"

function formatDateTime(dateIso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateIso))
}

function manifestStatusLabel(status: CourierManifestRow["status"], t: (k: string) => string): string {
  return t(`warehouse.manifests.status.${status}`)
}

export function WarehouseManifestsPreviewPage() {
  const { t, i18n } = useTranslation()
  const nav = useNavigate()
  const { warehouseId = "" } = useParams<{ warehouseId: string }>()
  const { accessToken, user } = useAuth()
  const queryClient = useQueryClient()
  const token = accessToken ?? ""
  const locale = i18n.language.startsWith("ar") ? "ar-EG" : "en-EG"

  const [manifestDate, setManifestDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [manifestCourierId, setManifestCourierId] = useState("")
  const [manifestZoneId, setManifestZoneId] = useState("")
  const [dispatchConfirmManifest, setDispatchConfirmManifest] = useState<CourierManifestRow | null>(null)

  const canSeeWarehouseDirectory = hasPlatformWarehouseScope(user) || isWarehouseAdmin(user)
  const accessDenied =
    !!user &&
    !isWarehouseAdmin(user) &&
    !user.warehouseId &&
    !hasPlatformWarehouseScope(user)
  const canManageTransfer =
    user?.permissions?.includes("warehouses.manage_transfer") ?? false

  const siteDetailQuery = useQuery({
    queryKey: ["warehouse-site-detail", token, warehouseId],
    queryFn: () => getWarehouseSite(token, warehouseId),
    enabled: !!token && !!warehouseId && !accessDenied,
  })

  const zoneLinksQuery = useQuery({
    queryKey: ["warehouse-zone-links", token, warehouseId],
    queryFn: () => getWarehouseZoneLinks(token, warehouseId),
    enabled: !!token && !!warehouseId && !accessDenied,
  })

  const couriersQuery = useQuery({
    queryKey: ["warehouse-couriers-manifests", token, warehouseId],
    queryFn: () => getWarehouseCouriers({ token, warehouseId }),
    enabled: !!token && !!warehouseId && !accessDenied,
  })

  const manifestsQuery = useQuery({
    queryKey: [
      "courier-manifests",
      token,
      warehouseId,
      manifestDate,
      manifestCourierId,
      manifestZoneId,
    ],
    queryFn: () =>
      listCourierManifests({
        token,
        warehouseId,
        fromDate: manifestDate,
        toDate: manifestDate,
        courierId: manifestCourierId || undefined,
        deliveryZoneId: manifestZoneId || undefined,
        page: 1,
        pageSize: 200,
      }),
    enabled: !!token && !!warehouseId && !accessDenied,
    refetchInterval: 10000,
  })

  const courierLoadByZone = useMemo(
    () => aggregateCourierLoadByZone(manifestsQuery.data?.manifests ?? []),
    [manifestsQuery.data?.manifests],
  )
  const shipmentDistributionByCourier = useMemo(
    () => aggregateShipmentDistributionByCourier(manifestsQuery.data?.manifests ?? []),
    [manifestsQuery.data?.manifests],
  )

  const lockManifestMutation = useMutation({
    mutationFn: (manifestId: string) => lockCourierManifest({ token, manifestId }),
    onSuccess: async () => {
      showToast(t("warehouse.manifests.lockSuccess"), "success")
      await queryClient.invalidateQueries({ queryKey: ["courier-manifests"] })
    },
    onError: (error) => showToast((error as Error).message, "error"),
  })

  const dispatchManifestMutation = useMutation({
    mutationFn: (manifestId: string) => dispatchCourierManifest({ token, manifestId }),
    onSuccess: async () => {
      showToast(t("warehouse.manifests.dispatchSuccess"), "success")
      await queryClient.invalidateQueries({ queryKey: ["courier-manifests"] })
    },
    onError: (error) => showToast((error as Error).message, "error"),
  })

  const closeManifestMutation = useMutation({
    mutationFn: (manifestId: string) => closeCourierManifest({ token, manifestId }),
    onSuccess: async () => {
      showToast(t("warehouse.manifests.closeSuccess"), "success")
      await queryClient.invalidateQueries({ queryKey: ["courier-manifests"] })
    },
    onError: (error) => showToast((error as Error).message, "error"),
  })

  if (!warehouseId) {
    return (
      <Layout title={t("warehouse.detail.invalidTitle")}>
        <p className="text-muted-foreground text-sm">{t("warehouse.detail.invalidDescription")}</p>
      </Layout>
    )
  }

  if (user && isWarehouseStaff(user) && user.warehouseId && user.warehouseId !== warehouseId) {
    return <Navigate to={`/warehouses/${encodeURIComponent(user.warehouseId)}/manifests`} replace />
  }

  if (accessDenied) {
    return (
      <Layout title={t("warehouse.detail.accessDeniedTitle")}>
        <p className="text-destructive text-sm">{t("warehouse.detail.accessDeniedDescription")}</p>
      </Layout>
    )
  }

  const getNotApplicable = () => t("warehouse.notApplicable") || "—"

  return (
    <Layout title={t("warehouse.manifests.title")}>
      <div className="space-y-6">
        {canSeeWarehouseDirectory ? (
          <p>
            <Link
              to="/warehouses"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
            >
              {t("warehouse.detail.backToWarehouses")}
            </Link>
          </p>
        ) : null}

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>{t("warehouse.manifests.title")}</CardTitle>
                <CardDescription>{t("warehouse.manifests.description")}</CardDescription>
              </div>
              <Button type="button" asChild>
                <Link to={`/warehouses/${encodeURIComponent(warehouseId)}/manifests/create`}>
                  {t("warehouse.manifests.create.cta")}
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <Input
              type="date"
              value={manifestDate}
              onChange={(e) => setManifestDate(e.target.value)}
            />
            <select
              className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-1"
              value={manifestZoneId}
              onChange={(e) => setManifestZoneId(e.target.value)}
            >
              <option value="">{t("warehouse.manifests.allZones")}</option>
              {(zoneLinksQuery.data?.deliveryZones ?? []).map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name?.trim() || z.id}
                </option>
              ))}
            </select>
            <select
              className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-1"
              value={manifestCourierId}
              onChange={(e) => setManifestCourierId(e.target.value)}
            >
              <option value="">{t("warehouse.manifests.allCouriers")}</option>
              {(couriersQuery.data?.couriers ?? []).map((c: WarehouseCourierRow) => (
                <option key={c.id} value={c.id}>
                  {c.fullName?.trim() || t("warehouse.queue.unnamedCourier")}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {siteDetailQuery.isPending ? (
          <p className="text-muted-foreground text-sm">{t("warehouse.loading")}</p>
        ) : null}
        {siteDetailQuery.isError ? (
          <p className="text-destructive text-sm">{(siteDetailQuery.error as Error).message}</p>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("warehouse.manifests.courierDistribution")}</CardTitle>
            </CardHeader>
            <CardContent className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shipmentDistributionByCourier}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="courierName" interval={0} angle={-15} textAnchor="end" height={55} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="shipmentCount" fill="#60a5fa" name={t("warehouse.manifests.shipments")} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("warehouse.manifests.courier")}</TableHead>
                  <TableHead>{t("warehouse.manifests.zone")}</TableHead>
                  <TableHead>{t("warehouse.manifests.load")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courierLoadByZone.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell>{row.courierName}</TableCell>
                    <TableCell>{row.zoneName}</TableCell>
                    <TableCell>{row.shipmentCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Card>
            <CardContent className="pt-6">
              {manifestsQuery.isLoading ? (
                <p className="text-muted-foreground text-sm">{t("warehouse.loading")}</p>
              ) : null}
              {manifestsQuery.error ? (
                <p className="text-destructive text-sm">{(manifestsQuery.error as Error).message}</p>
              ) : null}
              <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[40rem]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("warehouse.manifests.courier")}</TableHead>
                      <TableHead>{t("warehouse.manifests.zone")}</TableHead>
                      <TableHead>{t("warehouse.manifests.shipments")}</TableHead>
                      <TableHead>{t("warehouse.manifests.statusLabel")}</TableHead>
                      <TableHead>{t("warehouse.manifests.locked")}</TableHead>
                      <TableHead>{t("warehouse.manifests.dispatched")}</TableHead>
                      <TableHead>{t("warehouse.manifests.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(manifestsQuery.data?.manifests ?? []).map((row: CourierManifestRow) => {
                      const hasMissingCsConfirmation = row.shipments.some(
                        (shipment) => !shipment.csConfirmedAt,
                      )
                      return (
                      <TableRow
                        key={row.id}
                        className="hover:bg-muted/50 cursor-pointer"
                        onClick={() =>
                          nav(`/warehouses/${encodeURIComponent(warehouseId)}/manifests/${encodeURIComponent(row.id)}`)
                        }
                      >
                        <TableCell>{row.courier.fullName?.trim() || row.courier.id}</TableCell>
                        <TableCell>{row.deliveryZone.name?.trim() || row.deliveryZone.id}</TableCell>
                        <TableCell>{row.shipmentCount}</TableCell>
                        <TableCell>{manifestStatusLabel(row.status, t)}</TableCell>
                        <TableCell>
                          {row.lockedAt ? formatDateTime(row.lockedAt, locale) : getNotApplicable()}
                        </TableCell>
                        <TableCell>
                          {row.dispatchedAt ? formatDateTime(row.dispatchedAt, locale) : getNotApplicable()}
                        </TableCell>
                        <TableCell className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button type="button" size="sm" variant="ghost" asChild>
                            <Link to={`/warehouses/${encodeURIComponent(warehouseId)}/manifests/${encodeURIComponent(row.id)}`}>
                              {t("manifestDetail.viewDetails")}
                            </Link>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={
                              !canManageTransfer ||
                              row.status !== "DRAFT" ||
                              lockManifestMutation.isPending
                            }
                            onClick={() => lockManifestMutation.mutate(row.id)}
                          >
                            {t("warehouse.manifests.lock")}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={
                              !canManageTransfer ||
                              row.status !== "LOCKED" ||
                              hasMissingCsConfirmation ||
                              dispatchManifestMutation.isPending
                            }
                            title={
                              hasMissingCsConfirmation
                                ? t("warehouse.manifests.csConfirmed", {
                                    defaultValue:
                                      "All manifest shipments must be CS confirmed before dispatch.",
                                  })
                                : undefined
                            }
                            onClick={() => setDispatchConfirmManifest(row)}
                          >
                            {t("warehouse.manifests.dispatch")}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={
                              !canManageTransfer ||
                              row.status !== "DISPATCHED" ||
                              closeManifestMutation.isPending
                            }
                            onClick={() => closeManifestMutation.mutate(row.id)}
                          >
                            {t("warehouse.manifests.close")}
                          </Button>
                        </TableCell>
                      </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
        {dispatchConfirmManifest ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-card w-full max-w-md rounded-lg border p-4 shadow-lg">
              <h3 className="text-base font-semibold">{t("warehouse.manifests.dispatchConfirm.title")}</h3>
              <p className="text-muted-foreground mt-2 text-sm">
                {t("warehouse.manifests.dispatchConfirm.body", {
                  manifestId: dispatchConfirmManifest.id,
                  courier:
                    dispatchConfirmManifest.courier.fullName?.trim() ||
                    dispatchConfirmManifest.courier.id,
                  shipmentCount: String(dispatchConfirmManifest.shipmentCount),
                })}
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDispatchConfirmManifest(null)}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="button"
                  disabled={dispatchManifestMutation.isPending}
                  onClick={() => {
                    const manifestId = dispatchConfirmManifest.id
                    setDispatchConfirmManifest(null)
                    dispatchManifestMutation.mutate(manifestId)
                  }}
                >
                  {t("warehouse.manifests.dispatchConfirm.confirm")}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  )
}
