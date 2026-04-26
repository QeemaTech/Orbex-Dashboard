import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link, Navigate, useNavigate, useParams } from "react-router-dom"

import { getWarehouseSite, listWarehouseStandaloneShipments, type WarehouseStandaloneShipmentRow } from "@/api/warehouse-api"
import { Layout } from "@/components/layout/Layout"
import { OrderDeliveryStatusWithWarehouse } from "@/components/shared/StatusWithWarehouseContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/lib/auth-context"
import { warehouseShipmentLineDetailPath } from "@/lib/warehouse-merchant-order-routes"
import { hasPlatformWarehouseScope, isWarehouseAdmin, isWarehouseStaff } from "@/lib/warehouse-access"

function formatDateTime(dateIso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(dateIso))
}

export function WarehouseShipmentsListPage() {
  const { t, i18n } = useTranslation()
  const nav = useNavigate()
  const { warehouseId = "" } = useParams<{ warehouseId: string }>()
  const { accessToken, user } = useAuth()
  const token = accessToken ?? ""
  const locale = i18n.language.startsWith("ar") ? "ar-EG" : "en-EG"

  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  const canSeeWarehouseDirectory = hasPlatformWarehouseScope(user) || isWarehouseAdmin(user)
  const accessDenied = !!user && !isWarehouseAdmin(user) && !user.warehouseId && !hasPlatformWarehouseScope(user)

  const siteDetailQuery = useQuery({
    queryKey: ["warehouse-site-detail", token, warehouseId],
    queryFn: () => getWarehouseSite(token, warehouseId),
    enabled: !!token && !!warehouseId && !accessDenied,
  })

  const standaloneQuery = useQuery({
    queryKey: ["warehouse-standalone-shipments", token, warehouseId, page, search],
    queryFn: () =>
      listWarehouseStandaloneShipments({
        token,
        page,
        pageSize: 20,
        search: search || undefined,
        warehouseId,
      }),
    enabled: !!token && !!warehouseId && !accessDenied,
    refetchInterval: 10_000,
  })

  if (!warehouseId) {
    return (
      <Layout title={t("warehouse.detail.invalidTitle")}>
        <p className="text-muted-foreground text-sm">{t("warehouse.detail.invalidDescription")}</p>
      </Layout>
    )
  }

  if (user && isWarehouseStaff(user) && user.warehouseId && user.warehouseId !== warehouseId) {
    return <Navigate to={`/warehouses/${encodeURIComponent(user.warehouseId)}/shipments`} replace />
  }

  if (accessDenied) {
    return (
      <Layout title={t("warehouse.detail.accessDeniedTitle")}>
        <p className="text-destructive text-sm">{t("warehouse.detail.accessDeniedDescription")}</p>
      </Layout>
    )
  }

  const standaloneTotalPages = Math.max(1, Math.ceil((standaloneQuery.data?.total ?? 0) / (standaloneQuery.data?.pageSize ?? 20)))
  const getNotApplicable = () => t("warehouse.notApplicable") || "—"

  return (
    <Layout title={t("warehouse.queue.titleShipments")}>
      <div className="space-y-6">
        {canSeeWarehouseDirectory ? (
          <p>
            <Link to="/warehouses" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm">
              {t("warehouse.detail.backToWarehouses")}
            </Link>
          </p>
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle>{t("warehouse.queue.titleShipments")}</CardTitle>
            <CardDescription>{t("warehouse.queue.descriptionShipments")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder={t("warehouse.queue.searchPlaceholder")}
            />

            {siteDetailQuery.isPending ? <p className="text-muted-foreground text-sm">{t("warehouse.loading")}</p> : null}
            {siteDetailQuery.isError ? <p className="text-destructive text-sm">{(siteDetailQuery.error as Error).message}</p> : null}
            {standaloneQuery.isLoading ? <p className="text-muted-foreground text-sm">{t("warehouse.loading")}</p> : null}
            {standaloneQuery.error ? <p className="text-destructive text-sm">{(standaloneQuery.error as Error).message}</p> : null}

            <div className="overflow-x-auto rounded-lg border">
              <Table className="min-w-[40rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("warehouse.table.trackingNumber")}</TableHead>
                    <TableHead>{t("warehouse.table.customer")}</TableHead>
                    <TableHead>{t("warehouse.table.merchant")}</TableHead>
                    <TableHead>{t("warehouse.table.status")}</TableHead>
                    <TableHead>{t("warehouse.table.transferredFromWarehouse")}</TableHead>
                    <TableHead>{t("warehouse.table.updatedAt")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(standaloneQuery.data?.shipments ?? []).map((row: WarehouseStandaloneShipmentRow) => (
                    <TableRow
                      key={row.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => nav(warehouseShipmentLineDetailPath(warehouseId, row.id))}
                    >
                      <TableCell>{row.trackingNumber ?? getNotApplicable()}</TableCell>
                      <TableCell>{row.customerName ?? getNotApplicable()}</TableCell>
                      <TableCell>{row.merchantName ?? getNotApplicable()}</TableCell>
                      <TableCell>
                        <OrderDeliveryStatusWithWarehouse
                          status={row.status}
                          locationWarehouseId={row.currentWarehouseId}
                          locationWarehouseName={row.currentWarehouseName}
                          contextWarehouseId={warehouseId}
                        />
                      </TableCell>
                      <TableCell>{row.transferredFromWarehouseName ?? getNotApplicable()}</TableCell>
                      <TableCell>{formatDateTime(row.updatedAt, locale)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-sm">
                {t("warehouse.queue.pagination", { page, total: standaloneQuery.data?.total ?? 0 })}
              </p>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((v) => v - 1)}>
                  {t("cs.pagination.prev")}
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={page >= standaloneTotalPages} onClick={() => setPage((v) => v + 1)}>
                  {t("cs.pagination.next")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
