import { useMemo, useState } from "react"
import { useMutation, useQueries, useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link, Navigate, useNavigate, useParams } from "react-router-dom"

import { createCourierManifest } from "@/api/courier-manifests-api"
import {
  getWarehouseCouriers,
  getWarehouseSite,
  listWarehouseStandaloneShipments,
} from "@/api/warehouse-api"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/lib/auth-context"
import { hasPlatformWarehouseScope, isWarehouseAdmin, isWarehouseStaff } from "@/lib/warehouse-access"
import { showToast } from "@/lib/toast"

type GroupRow = {
  key: string
  warehouseId: string
  zoneId: string
  zoneName: string
  shipmentCount: number
  shipmentIds: string[]
  trackingPreview: string[]
}

export function CreateCourierManifestPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { warehouseId = "" } = useParams<{ warehouseId: string }>()
  const { accessToken, user } = useAuth()
  const token = accessToken ?? ""
  const [search, setSearch] = useState("")
  const [manifestDate, setManifestDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [courierByGroup, setCourierByGroup] = useState<Record<string, string>>({})

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

  const shipmentsQuery = useQuery({
    queryKey: ["manifest-candidates", token, warehouseId, search],
    queryFn: () =>
      listWarehouseStandaloneShipments({
        token,
        warehouseId,
        page: 1,
        pageSize: 200,
        search: search.trim() || undefined,
      }),
    enabled: !!token && !!warehouseId && !accessDenied,
  })

  const groups = useMemo<GroupRow[]>(() => {
    const rows = shipmentsQuery.data?.shipments ?? []
    const eligible = rows.filter(
      (s) =>
        !!s.csConfirmedAt &&
        !!s.resolvedDeliveryZoneId &&
        (s.currentWarehouseId ?? warehouseId) === warehouseId,
    )
    const grouped = new Map<string, GroupRow>()
    for (const row of eligible) {
      const zoneId = row.resolvedDeliveryZoneId!
      const key = `${warehouseId}:${zoneId}`
      const existing = grouped.get(key)
      if (!existing) {
        grouped.set(key, {
          key,
          warehouseId,
          zoneId,
          zoneName: row.deliveryZoneName?.trim() || zoneId,
          shipmentCount: 1,
          shipmentIds: [row.id],
          trackingPreview: row.trackingNumber ? [row.trackingNumber] : [],
        })
        continue
      }
      existing.shipmentCount += 1
      existing.shipmentIds.push(row.id)
      if (row.trackingNumber && existing.trackingPreview.length < 5) {
        existing.trackingPreview.push(row.trackingNumber)
      }
    }
    return Array.from(grouped.values()).sort((a, b) => b.shipmentCount - a.shipmentCount)
  }, [shipmentsQuery.data?.shipments, warehouseId])

  const couriersByGroup = useQueries({
    queries: groups.map((group) => ({
      queryKey: ["manifest-group-couriers", token, warehouseId, group.zoneId],
      queryFn: () =>
        getWarehouseCouriers({
          token,
          warehouseId,
          deliveryZoneId: group.zoneId,
        }),
      enabled: !!token && !!warehouseId,
    })),
  })

  const createMutation = useMutation({
    mutationFn: async (group: GroupRow) => {
      const courierId = courierByGroup[group.key]?.trim()
      if (!courierId) {
        throw new Error(t("warehouse.manifests.create.pickCourier"))
      }
      return createCourierManifest({
        token,
        courierId,
        warehouseId: group.warehouseId,
        deliveryZoneId: group.zoneId,
        manifestDate,
      })
    },
    onSuccess: (created) => {
      showToast(t("warehouse.manifests.create.success"), "success")
      nav(`/warehouses/${encodeURIComponent(warehouseId)}/manifests/${encodeURIComponent(created.id)}`)
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
    return <Navigate to={`/warehouses/${encodeURIComponent(user.warehouseId)}/manifests/create`} replace />
  }
  if (accessDenied) {
    return (
      <Layout title={t("warehouse.detail.accessDeniedTitle")}>
        <p className="text-destructive text-sm">{t("warehouse.detail.accessDeniedDescription")}</p>
      </Layout>
    )
  }

  return (
    <Layout title={t("warehouse.manifests.create.title")}>
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
            <CardTitle>{t("warehouse.manifests.create.title")}</CardTitle>
            <CardDescription>{t("warehouse.manifests.create.description")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Input
              type="date"
              value={manifestDate}
              onChange={(e) => setManifestDate(e.target.value)}
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("warehouse.queue.searchPlaceholder")}
            />
          </CardContent>
        </Card>

        {siteDetailQuery.isLoading || shipmentsQuery.isLoading ? (
          <p className="text-muted-foreground text-sm">{t("warehouse.loading")}</p>
        ) : null}
        {siteDetailQuery.error ? (
          <p className="text-destructive text-sm">{(siteDetailQuery.error as Error).message}</p>
        ) : null}
        {shipmentsQuery.error ? (
          <p className="text-destructive text-sm">{(shipmentsQuery.error as Error).message}</p>
        ) : null}

        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto rounded-lg border">
              <Table className="min-w-[44rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("warehouse.manifests.zone")}</TableHead>
                    <TableHead>{t("warehouse.manifests.shipments")}</TableHead>
                    <TableHead>{t("warehouse.manifests.create.preview")}</TableHead>
                    <TableHead>{t("warehouse.manifests.courier")}</TableHead>
                    <TableHead>{t("warehouse.manifests.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group, index) => {
                    const couriers = couriersByGroup[index]?.data?.couriers ?? []
                    return (
                      <TableRow key={group.key}>
                        <TableCell>{group.zoneName}</TableCell>
                        <TableCell>{group.shipmentCount}</TableCell>
                        <TableCell className="max-w-[20rem] text-xs whitespace-normal">
                          {group.trackingPreview.join(", ") || "—"}
                        </TableCell>
                        <TableCell>
                          <select
                            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                            value={courierByGroup[group.key] ?? ""}
                            onChange={(e) =>
                              setCourierByGroup((prev) => ({ ...prev, [group.key]: e.target.value }))
                            }
                            disabled={!canManageTransfer || createMutation.isPending}
                          >
                            <option value="">{t("warehouse.manifests.create.pickCourier")}</option>
                            {couriers.map((courier) => (
                              <option key={courier.id} value={courier.id}>
                                {[courier.fullName?.trim(), courier.contactPhone].filter(Boolean).join(" · ") || courier.id}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="sm"
                            disabled={!canManageTransfer || createMutation.isPending}
                            onClick={() => createMutation.mutate(group)}
                          >
                            {t("warehouse.manifests.create.submit")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {groups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground text-center text-sm">
                        {t("warehouse.manifests.create.empty")}
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
