import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link, Navigate, useNavigate, useParams } from "react-router-dom"

import { getWarehousePickupCouriers, getWarehouseSite, listWarehouseOrders } from "@/api/warehouse-api"
import type { PickupCourierRow } from "@/api/pickup-couriers-api"
import { Layout } from "@/components/layout/Layout"
import { MerchantBatchStatusWithWarehouse } from "@/components/shared/StatusWithWarehouseContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { backendShipmentTransferLabel } from "@/features/warehouse/backend-labels"
import { useAuth } from "@/lib/auth-context"
import { warehouseMerchantOrderDetailPath } from "@/lib/warehouse-merchant-order-routes"
import { hasPlatformWarehouseScope, isWarehouseAdmin, isWarehouseStaff } from "@/lib/warehouse-access"
import { isMainBranch } from "@/lib/warehouse-utils"

const warehouseTransferStatusFilters = ["", "PENDING_PICKUP", "PICKED_UP", "IN_WAREHOUSE"] as const
type WarehouseTransferStatusFilter = (typeof warehouseTransferStatusFilters)[number]

function formatDateTime(dateIso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(dateIso))
}

function warehouseTransferRowTone(transferStatus: string): string {
  const s = transferStatus.toUpperCase()
  if (s === "IN_WAREHOUSE") return "bg-sky-50/70 dark:bg-sky-950/25"
  if (s === "PICKED_UP") return "bg-amber-50/70 dark:bg-amber-950/20"
  return ""
}

export function WarehouseMerchantOrdersListPage() {
  const { t, i18n } = useTranslation()
  const nav = useNavigate()
  const { warehouseId = "" } = useParams<{ warehouseId: string }>()
  const { accessToken, user } = useAuth()
  const token = accessToken ?? ""
  const locale = i18n.language.startsWith("ar") ? "ar-EG" : "en-EG"

  const [search, setSearch] = useState("")
  const [transferStatusFilter, setTransferStatusFilter] = useState<WarehouseTransferStatusFilter>("")
  const [returnsOnly, setReturnsOnly] = useState(false)
  const [returnsCourierFilterId, setReturnsCourierFilterId] = useState("")
  const [page, setPage] = useState(1)

  const canSeeWarehouseDirectory = hasPlatformWarehouseScope(user) || isWarehouseAdmin(user)
  const accessDenied = !!user && !isWarehouseAdmin(user) && !user.warehouseId && !hasPlatformWarehouseScope(user)

  const siteDetailQuery = useQuery({
    queryKey: ["warehouse-site-detail", token, warehouseId],
    queryFn: () => getWarehouseSite(token, warehouseId),
    enabled: !!token && !!warehouseId && !accessDenied,
  })

  const isMainHub = siteDetailQuery.data != null && isMainBranch(siteDetailQuery.data)

  const queueQuery = useQuery({
    queryKey: ["warehouse-orders", token, warehouseId, page, search, transferStatusFilter, returnsOnly, returnsOnly ? returnsCourierFilterId : ""],
    queryFn: () =>
      listWarehouseOrders({
        token,
        page,
        pageSize: 20,
        search: search || undefined,
        transferStatus: transferStatusFilter === "" ? undefined : transferStatusFilter,
        returnsOnly,
        pickupCourierId:
          returnsOnly && returnsCourierFilterId.trim()
            ? returnsCourierFilterId.trim()
            : undefined,
        warehouseId,
      }),
    enabled: !!token && !!warehouseId && !accessDenied && isMainHub,
    refetchInterval: 10_000,
  })

  const couriersForReturnsFilterQuery = useQuery({
    queryKey: ["warehouse-couriers-returns", token],
    queryFn: () => getWarehousePickupCouriers({ token, warehouseId }),
    enabled: !!token && returnsOnly && !accessDenied && isMainHub,
  })

  if (!warehouseId) {
    return (
      <Layout title={t("warehouse.detail.invalidTitle")}>
        <p className="text-muted-foreground text-sm">{t("warehouse.detail.invalidDescription")}</p>
      </Layout>
    )
  }

  if (user && isWarehouseStaff(user) && user.warehouseId && user.warehouseId !== warehouseId) {
    return <Navigate to={`/warehouses/${encodeURIComponent(user.warehouseId)}/orders`} replace />
  }

  if (accessDenied) {
    return (
      <Layout title={t("warehouse.detail.accessDeniedTitle")}>
        <p className="text-destructive text-sm">{t("warehouse.detail.accessDeniedDescription")}</p>
      </Layout>
    )
  }

  const totalPages = Math.max(1, Math.ceil((queueQuery.data?.total ?? 0) / (queueQuery.data?.pageSize ?? 20)))
  const getNotApplicable = () => t("warehouse.notApplicable") || "—"

  return (
    <Layout title={t("warehouse.queue.titleTransfers")}>
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
            <CardTitle>{t("warehouse.queue.titleTransfers")}</CardTitle>
            <CardDescription>{t("warehouse.queue.descriptionTransfers")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[2fr_1fr_auto]">
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder={t("warehouse.queue.searchPlaceholder")}
              />
              <select
                className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-1"
                value={transferStatusFilter}
                onChange={(e) => {
                  setTransferStatusFilter(e.target.value as WarehouseTransferStatusFilter)
                  setPage(1)
                }}
              >
                {warehouseTransferStatusFilters.map((value) => (
                  <option key={value || "all"} value={value}>
                    {value ? backendShipmentTransferLabel(t, value) : t("warehouse.queue.allStatuses")}
                  </option>
                ))}
              </select>
              <label className="text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={returnsOnly}
                  onChange={(e) => {
                    setReturnsOnly(e.target.checked)
                    if (!e.target.checked) setReturnsCourierFilterId("")
                    setPage(1)
                  }}
                />
                {t("warehouse.queue.returnsOnly")}
              </label>
            </div>

            {returnsOnly ? (
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-muted-foreground text-sm whitespace-nowrap">{t("warehouse.queue.filterReturnsByPickupCourier")}</label>
                <select
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 min-w-[12rem] rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-1"
                  value={returnsCourierFilterId}
                  onChange={(e) => {
                    setReturnsCourierFilterId(e.target.value)
                    setPage(1)
                  }}
                >
                  <option value="">{t("warehouse.queue.allPickupCouriers")}</option>
                  {(couriersForReturnsFilterQuery.data?.couriers ?? []).map((c: PickupCourierRow) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName?.trim() || t("warehouse.queue.unnamedCourier")}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {siteDetailQuery.isPending ? <p className="text-muted-foreground text-sm">{t("warehouse.loading")}</p> : null}
            {siteDetailQuery.isError ? <p className="text-destructive text-sm">{(siteDetailQuery.error as Error).message}</p> : null}
            {siteDetailQuery.data && !isMainHub ? (
              <p className="text-muted-foreground text-sm">{t("warehouse.queue.descriptionShipments")}</p>
            ) : null}
            {queueQuery.isLoading ? <p className="text-muted-foreground text-sm">{t("warehouse.loading")}</p> : null}
            {queueQuery.error ? <p className="text-destructive text-sm">{(queueQuery.error as Error).message}</p> : null}

            <div className="overflow-x-auto rounded-lg border">
              <Table className="min-w-[56rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("warehouse.table.merchant")}</TableHead>
                    <TableHead>{t("warehouse.table.orderCount")}</TableHead>
                    <TableHead>{t("warehouse.table.totalValue")}</TableHead>
                    <TableHead>{t("warehouse.table.batchTransfer")}</TableHead>
                    <TableHead>{t("warehouse.table.batchResolution")}</TableHead>
                    <TableHead>{t("warehouse.table.pickupCourier")}</TableHead>
                    <TableHead>{t("warehouse.table.updatedAt")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(queueQuery.data?.merchantOrders ?? []).map((row) => {
                    const num = Number.parseFloat(String(row.totalShipmentValue ?? "").replace(/,/g, "").trim())
                    const totalValue = Number.isFinite(num)
                      ? new Intl.NumberFormat(locale, { style: "currency", currency: "EGP", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num)
                      : getNotApplicable()
                    return (
                      <TableRow
                        key={row.id}
                        className={`hover:bg-muted/50 cursor-pointer ${warehouseTransferRowTone(row.transferStatus)}`}
                        onClick={() => nav(warehouseMerchantOrderDetailPath(warehouseId, row.id))}
                      >
                        <TableCell>{row.merchant?.displayName ?? getNotApplicable()}</TableCell>
                        <TableCell>{row.orderCount}</TableCell>
                        <TableCell>{totalValue}</TableCell>
                        <TableCell className="max-w-[12rem] text-xs whitespace-normal">
                          <MerchantBatchStatusWithWarehouse
                            transferStatus={row.transferStatus}
                            assignedWarehouseId={row.assignedWarehouse?.id}
                            assignedWarehouseName={row.assignedWarehouse?.name}
                            contextWarehouseId={warehouseId}
                          />
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex flex-wrap gap-1">
                            {row.isResolved ? (
                              <Badge variant="default" className="text-xs">
                                {t("merchantOrdersList.badgeResolved", { defaultValue: "Resolved" })}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                {t("merchantOrdersList.badgeNotResolved", { defaultValue: "Not resolved" })}
                              </Badge>
                            )}
                            {row.isFinished ? (
                              <Badge variant="secondary" className="text-xs">
                                {t("merchantOrdersList.badgeFinished", { defaultValue: "Done" })}
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{row.pickupCourier?.fullName ?? getNotApplicable()}</TableCell>
                        <TableCell>{formatDateTime(row.updatedAt, locale)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-sm">
                {t("warehouse.queue.pagination", { page, total: queueQuery.data?.total ?? 0 })}
              </p>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((v) => v - 1)}>
                  {t("cs.pagination.prev")}
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((v) => v + 1)}>
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
