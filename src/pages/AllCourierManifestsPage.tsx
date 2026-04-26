import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router-dom"

import { listCourierManifests } from "@/api/courier-manifests-api"
import { listWarehouseSites } from "@/api/warehouse-api"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/lib/auth-context"

function formatDateTime(dateIso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateIso))
}

export function AllCourierManifestsPage() {
  const { t, i18n } = useTranslation()
  const { accessToken } = useAuth()
  const nav = useNavigate()
  const token = accessToken ?? ""
  const locale = i18n.language.startsWith("ar") ? "ar-EG" : "en-EG"

  const [fromDate, setFromDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [warehouseId, setWarehouseId] = useState("")
  const [courierId, setCourierId] = useState("")
  const [deliveryZoneId, setDeliveryZoneId] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 50

  const sitesQuery = useQuery({
    queryKey: ["warehouse-sites", token],
    queryFn: () => listWarehouseSites(token),
    enabled: !!token,
  })

  const manifestsQuery = useQuery({
    queryKey: [
      "courier-manifests-global",
      token,
      fromDate,
      toDate,
      warehouseId,
      courierId,
      deliveryZoneId,
      page,
      pageSize,
    ],
    queryFn: () =>
      listCourierManifests({
        token,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        warehouseId: warehouseId || undefined,
        courierId: courierId || undefined,
        deliveryZoneId: deliveryZoneId || undefined,
        page,
        pageSize,
      }),
    enabled: !!token,
    refetchInterval: 15000,
  })

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((manifestsQuery.data?.total ?? 0) / pageSize)),
    [manifestsQuery.data?.total],
  )

  return (
    <Layout title={t("manifestsGlobal.pageTitle")}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("manifestsGlobal.pageTitle")}</CardTitle>
            <CardDescription>{t("manifestsGlobal.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-5">
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
            <select
              className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-1"
              value={warehouseId}
              onChange={(e) => {
                setWarehouseId(e.target.value)
                setPage(1)
              }}
            >
              <option value="">{t("manifestsGlobal.allWarehouses")}</option>
              {(sitesQuery.data?.warehouses ?? []).map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <Input
              value={courierId}
              onChange={(e) => {
                setCourierId(e.target.value.trim())
                setPage(1)
              }}
              placeholder={t("manifestsGlobal.courierIdPlaceholder")}
            />
            <Input
              value={deliveryZoneId}
              onChange={(e) => {
                setDeliveryZoneId(e.target.value.trim())
                setPage(1)
              }}
              placeholder={t("manifestsGlobal.zoneIdPlaceholder")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("manifestsGlobal.tableTitle")}</CardTitle>
            <CardDescription>
              {t("manifestsGlobal.pagination", {
                page: manifestsQuery.data?.page ?? page,
                total: manifestsQuery.data?.total ?? 0,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {manifestsQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">{t("warehouse.loading")}</p>
            ) : null}
            {manifestsQuery.error ? (
              <p className="text-destructive text-sm">{(manifestsQuery.error as Error).message}</p>
            ) : null}

            <div className="overflow-x-auto rounded-lg border">
              <Table className="min-w-[56rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("manifestsGlobal.columns.date")}</TableHead>
                    <TableHead>{t("manifestsGlobal.columns.warehouse")}</TableHead>
                    <TableHead>{t("manifestsGlobal.columns.courier")}</TableHead>
                    <TableHead>{t("manifestsGlobal.columns.zone")}</TableHead>
                    <TableHead>{t("manifestsGlobal.columns.shipmentCount")}</TableHead>
                    <TableHead>{t("manifestsGlobal.columns.totalCod")}</TableHead>
                    <TableHead>{t("manifestsGlobal.columns.lockedAt")}</TableHead>
                    <TableHead>{t("manifestsGlobal.columns.dispatchedAt")}</TableHead>
                    <TableHead>{t("manifestsGlobal.columns.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(manifestsQuery.data?.manifests ?? []).map((row) => (
                    <TableRow
                      key={row.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() =>
                        nav(`/courier-manifests/${encodeURIComponent(row.id)}`)
                      }
                    >
                      <TableCell>{row.manifestDate}</TableCell>
                      <TableCell>{row.warehouse.name}</TableCell>
                      <TableCell>{row.courier.fullName?.trim() || row.courier.id}</TableCell>
                      <TableCell>{row.deliveryZone.name?.trim() || row.deliveryZone.id}</TableCell>
                      <TableCell>{row.shipmentCount}</TableCell>
                      <TableCell>{row.totalCod}</TableCell>
                      <TableCell>
                        {row.lockedAt ? formatDateTime(row.lockedAt, locale) : t("warehouse.notApplicable")}
                      </TableCell>
                      <TableCell>
                        {row.dispatchedAt
                          ? formatDateTime(row.dispatchedAt, locale)
                          : t("warehouse.notApplicable")}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col gap-1">
                          <Link
                            to={`/courier-manifests/${encodeURIComponent(row.id)}`}
                            className="text-primary hover:underline text-sm"
                          >
                            {t("manifestDetail.viewDetails")}
                          </Link>
                          <Link
                            to={`/warehouses/${encodeURIComponent(row.warehouseId)}?tab=manifests`}
                            className="text-primary hover:underline text-sm"
                          >
                            {t("manifestsGlobal.openWarehouse")}
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                {t("cs.pagination.prev")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("cs.pagination.next")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
