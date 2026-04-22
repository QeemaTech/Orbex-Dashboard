import { useQuery } from "@tanstack/react-query"
import { Boxes } from "react-lucid"
import { useCallback, useMemo, useRef, useState, type ChangeEvent } from "react"
import { useTranslation } from "react-i18next"
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom"

import {
  downloadMerchantOrdersImportTemplate,
  getDashboardKpis,
  importMerchantOrdersExcel,
  listPendingMerchantOrderImports,
  listShipments,
  merchantOrderBatchId,
} from "@/api/merchant-orders-api"
import type { CsShipmentRow } from "@/api/merchant-orders-api"
import { listMerchants } from "@/api/merchants-api"
import { ApiError, formatApiValidationDetails } from "@/api/client"
import {
  listWarehouseOrders,
  listWarehouseSites,
  type WarehouseMerchantOrderRow,
} from "@/api/warehouse-api"
import { Layout } from "@/components/layout/Layout"
import { MerchantBatchStatusWithWarehouse } from "@/components/shared/StatusWithWarehouseContext"
import { StatCard } from "@/components/shared/StatCard"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SelectMerchantImportModal } from "@/features/merchant-orders/components/SelectMerchantImportModal"
import { backendMerchantOrderBatchLabel } from "@/features/warehouse/backend-labels"
import { isMerchantUser, useAuth } from "@/lib/auth-context"

function resolveNumberLocale(language: string) {
  return language.startsWith("ar") ? "ar-EG" : "en-EG"
}

function formatEGP(amountStr: string | undefined, locale: string) {
  const n = Number.parseFloat(String(amountStr ?? "0").replace(/,/g, "").trim())
  if (!Number.isFinite(n)) return "—"
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

export function MerchantOrdersListPage() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { warehouseId: warehouseIdParam } = useParams<{ warehouseId?: string }>()
  const locale = resolveNumberLocale(i18n.language)
  const { accessToken, user } = useAuth()
  const token = accessToken ?? ""
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false)
  const [isMerchantPickerOpen, setIsMerchantPickerOpen] = useState(false)
  const [selectedMerchantId, setSelectedMerchantId] = useState("")
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null)
  const [pickupDate, setPickupDate] = useState("")
  const [importFeedback, setImportFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  const [searchParams, setSearchParams] = useSearchParams()
  const warehouseIdFilter = searchParams.get("warehouseId") ?? ""
  const routeWarehouseId = warehouseIdParam?.trim() ?? ""
  const isWarehouseScopedRoute = routeWarehouseId.length > 0
  const warehouseId = isWarehouseScopedRoute ? routeWarehouseId : warehouseIdFilter
  const page = Number(searchParams.get("page") ?? "1") || 1
  const pageSize = Number(searchParams.get("pageSize") ?? "20") || 20

  const warehousesQuery = useQuery({
    queryKey: ["warehouse-sites-shipments", token],
    queryFn: () => listWarehouseSites(token),
    enabled: !!token && user?.role === "ADMIN" && !isWarehouseScopedRoute,
  })

  const listQueryKey = useMemo(
    () =>
      [
        "admin-shipments-list",
        token,
        page,
        pageSize,
        warehouseId,
      ] as const,
    [token, page, pageSize, warehouseId],
  )

  const shipmentsQuery = useQuery({
    queryKey: listQueryKey,
    queryFn: () =>
      listShipments({
        token,
        page,
        pageSize,
        assignedWarehouseId: warehouseId || undefined,
        expand: "merchant,courier",
      }),
    enabled: !!token && !isWarehouseScopedRoute,
  })

  const warehouseOrdersQuery = useQuery({
    queryKey: [
      "warehouse-merchant-orders-list",
      token,
      routeWarehouseId,
      page,
      pageSize,
    ] as const,
    queryFn: () =>
      listWarehouseOrders({
        token,
        page,
        pageSize,
        warehouseId: routeWarehouseId,
      }),
    enabled: !!token && isWarehouseScopedRoute,
  })

  const kpiQuery = useQuery({
    queryKey: [
      "dashboard-kpis",
      "shipments-list",
      token,
      warehouseId,
    ] as const,
    queryFn: () =>
      getDashboardKpis({
        token,
        trendDays: 14,
        recentTake: 8,
        assignedWarehouseId: warehouseId || undefined,
      }),
    enabled: !!token && !isWarehouseScopedRoute,
  })

  const setWarehouse = useCallback(
    (next: string) => {
      if (isWarehouseScopedRoute) return
      const p = new URLSearchParams(searchParams)
      if (next) p.set("warehouseId", next)
      else p.delete("warehouseId")
      p.set("page", "1")
      setSearchParams(p)
    },
    [isWarehouseScopedRoute, searchParams, setSearchParams],
  )

  const setPage = (n: number) => {
    const p = new URLSearchParams(searchParams)
    p.set("page", String(n))
    setSearchParams(p)
  }

  const totalPages = Math.max(
    1,
    Math.ceil(
      ((isWarehouseScopedRoute
        ? warehouseOrdersQuery.data?.total
        : shipmentsQuery.data?.total) ?? 0) / pageSize,
    ),
  )

  const batchPipelineBreakdown = useMemo(() => {
    const rows = kpiQuery.data?.transferStatusBreakdown ?? []
    const priority = ["PENDING_CONFIRMATION", "PENDING_PICKUP", "PICKED_UP", "IN_WAREHOUSE"]
    const rank = new Map(priority.map((status, idx) => [status, idx]))
    return [...rows].sort((a, b) => {
      const aRank = rank.get(String(a.transferStatus).toUpperCase()) ?? Number.MAX_SAFE_INTEGER
      const bRank = rank.get(String(b.transferStatus).toUpperCase()) ?? Number.MAX_SAFE_INTEGER
      if (aRank !== bRank) return aRank - bRank
      return b.count - a.count
    })
  }, [kpiQuery.data?.transferStatusBreakdown])
  const totals = kpiQuery.data?.totals
  const canImportMerchantOrders =
    user?.role === "ADMIN" ||
    !!user?.permissions?.includes("merchant_orders.create")
  const canViewPendingConfirmations =
    user?.role === "ADMIN" || !!user?.permissions?.includes("merchant_orders.confirm")
  const merchantContext = isMerchantUser(user)

  const detailPrefix = location.pathname.startsWith("/cs/")
    ? "/cs/merchant-orders"
    : isWarehouseScopedRoute
      ? `/warehouses/${encodeURIComponent(routeWarehouseId)}/merchant-orders`
    : "/merchant-orders"

  const onRowClick = (row: CsShipmentRow) => {
    const batchId = merchantOrderBatchId(row)
    if (!batchId) return
    void navigate(`${detailPrefix}/${encodeURIComponent(batchId)}`)
  }

  const pendingImportsQuery = useQuery({
    queryKey: ["merchant-order-pending-imports", token],
    queryFn: () => listPendingMerchantOrderImports({ token }),
    enabled: !!token && canViewPendingConfirmations && !isWarehouseScopedRoute,
  })

  const pendingRows = useMemo(() => {
    if (!canViewPendingConfirmations || page !== 1) return []
    return pendingImportsQuery.data?.items ?? []
  }, [canViewPendingConfirmations, page, pendingImportsQuery.data?.items])

  const totalRowsForPagination =
    (isWarehouseScopedRoute
      ? (warehouseOrdersQuery.data?.total ?? 0)
      : (shipmentsQuery.data?.total ?? 0)) + pendingRows.length

  const onDownloadTemplate = useCallback(async () => {
    if (!token || isDownloadingTemplate) return
    setImportFeedback(null)
    setIsDownloadingTemplate(true)
    try {
      const blob = await downloadMerchantOrdersImportTemplate({ token })
      const href = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = href
      anchor.download = "order-import-template.xlsx"
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(href)
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("merchantOrdersList.importGenericError")
      setImportFeedback({ type: "error", message: msg })
    } finally {
      setIsDownloadingTemplate(false)
    }
  }, [isDownloadingTemplate, t, token])

  const merchantsQuery = useQuery({
    queryKey: ["merchants-import-options", token],
    queryFn: () => listMerchants({ token, page: 1, pageSize: 100 }),
    enabled: !!token && canImportMerchantOrders && !merchantContext,
  })
  const merchantsErrorMessage =
    merchantsQuery.error instanceof Error ? merchantsQuery.error.message : null

  const performImport = useCallback(
    async (file: File, merchantId: string | undefined, importPickupDate: string) => {
      setImportFeedback(null)
      setIsImporting(true)
      try {
        const result = await importMerchantOrdersExcel({
          token,
          file,
          shipment: {
            ...(merchantId ? { merchantId } : {}),
            pickupDate: new Date(`${importPickupDate}T00:00:00.000Z`).toISOString(),
          },
        })
        setImportFeedback({
          type: "success",
          message: t("merchantOrdersList.importQueuedSuccess", {
            count: result.orderCount,
            defaultValue: "Import queued for confirmation ({{count}} shipments).",
          }),
        })
      } catch (err) {
        if (err instanceof ApiError) {
          const details = formatApiValidationDetails(err.details)
          const msg = details ? `${err.message} · ${details}` : err.message
          setImportFeedback({ type: "error", message: msg })
        } else {
          const msg =
            err instanceof Error ? err.message : t("merchantOrdersList.importGenericError")
          setImportFeedback({ type: "error", message: msg })
        }
      } finally {
        setIsImporting(false)
      }
    },
    [t, token],
  )

  const onImportClick = useCallback(() => {
    if (!token || isImporting) return
    fileInputRef.current?.click()
  }, [isImporting, token])

  const onFileSelected = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ""
      if (!file || !token) return

      setImportFeedback(null)
      setPendingImportFile(file)
      setSelectedMerchantId("")
      const today = new Date().toISOString().slice(0, 10)
      setPickupDate(today)
      setIsMerchantPickerOpen(true)
    },
    [performImport, token],
  )

  const onCancelMerchantPick = useCallback(() => {
    if (isImporting) return
    setIsMerchantPickerOpen(false)
    setPendingImportFile(null)
    setSelectedMerchantId("")
    setPickupDate("")
  }, [isImporting])

  const onConfirmMerchantPick = useCallback(async () => {
    if (!pendingImportFile || isImporting || !pickupDate) return
    if (!merchantContext && !selectedMerchantId) return
    await performImport(
      pendingImportFile,
      merchantContext ? undefined : selectedMerchantId,
      pickupDate,
    )
    setIsMerchantPickerOpen(false)
    setPendingImportFile(null)
    setSelectedMerchantId("")
    setPickupDate("")
  }, [isImporting, merchantContext, pendingImportFile, performImport, pickupDate, selectedMerchantId])

  return (
    <Layout title={t("merchantOrdersList.pageTitle")}>
      <div className="space-y-6">
        <Card className="from-primary/10 to-chart-2/10 border-primary/20 bg-gradient-to-br shadow-md">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="bg-primary/15 text-primary flex size-11 items-center justify-center rounded-xl">
              <Boxes className="size-5" aria-hidden />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg">{t("merchantOrdersList.pageTitle")}</CardTitle>
              <CardDescription>{t("merchantOrdersList.description")}</CardDescription>
            </div>
          </CardHeader>
        </Card>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          {merchantContext || isWarehouseScopedRoute ? null : (
            <div className="space-y-2">
              <label
                className="text-muted-foreground text-sm font-medium"
                htmlFor="shipments-warehouse-filter"
              >
                {t("merchantOrdersList.filterWarehouse")}
              </label>
              <select
                id="shipments-warehouse-filter"
                className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:w-[280px]"
                value={warehouseId}
                onChange={(e) => setWarehouse(e.target.value)}
                disabled={warehousesQuery.isLoading}
              >
                <option value="">{t("merchantOrdersList.allWarehouses")}</option>
                {(warehousesQuery.data?.warehouses ?? []).map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                    {w.governorate ? ` · ${w.governorate}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
          {canImportMerchantOrders && !isWarehouseScopedRoute ? (
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => {
                  void onFileSelected(e)
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void onDownloadTemplate()
                }}
                disabled={isDownloadingTemplate || isImporting}
              >
                {isDownloadingTemplate
                  ? t("merchantOrdersList.downloadingTemplate")
                  : t("merchantOrdersList.downloadTemplate")}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  void onImportClick()
                }}
                disabled={isImporting || isDownloadingTemplate}
              >
                {isImporting
                  ? t("merchantOrdersList.importing")
                  : t("merchantOrdersList.importExcel")}
              </Button>
            </div>
          ) : null}
        </div>
        {importFeedback ? (
          <p
            className={
              importFeedback.type === "success"
                ? "text-sm text-emerald-600"
                : "text-destructive text-sm"
            }
          >
            {importFeedback.message}
          </p>
        ) : null}

        {!isWarehouseScopedRoute ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title={t("merchantOrdersList.kpiTotalMerchantOrders")}
              value={totals?.totalShipments ?? 0}
              icon={Boxes}
              accent="primary"
              hideTrend
            />
            {batchPipelineBreakdown.slice(0, 3).map((row) => (
              <StatCard
                key={row.transferStatus}
                title={backendMerchantOrderBatchLabel(t, row.transferStatus)}
                value={row.count}
                icon={Boxes}
                accent="success"
                hideTrend
              />
            ))}
          </div>
        ) : null}

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="border-border/60 border-b pb-4">
            <CardTitle className="text-base font-semibold">
              {t("merchantOrdersList.tableCardTitle")}
            </CardTitle>
            <CardDescription>{t("merchantOrdersList.tableCardDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {isWarehouseScopedRoute && warehouseOrdersQuery.error ? (
              <p className="text-destructive text-sm">
                {(warehouseOrdersQuery.error as Error).message}
              </p>
            ) : null}
            {!isWarehouseScopedRoute && shipmentsQuery.error ? (
              <p className="text-destructive text-sm">
                {(shipmentsQuery.error as Error).message}
              </p>
            ) : null}
            {!isWarehouseScopedRoute && pendingImportsQuery.error ? (
              <p className="text-destructive text-sm">
                {(pendingImportsQuery.error as Error).message}
              </p>
            ) : null}

            {isWarehouseScopedRoute && warehouseOrdersQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">{t("merchantOrdersList.loading")}</p>
            ) : null}
            {!isWarehouseScopedRoute && shipmentsQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">{t("merchantOrdersList.loading")}</p>
            ) : null}

            {((isWarehouseScopedRoute && warehouseOrdersQuery.data) ||
              (!isWarehouseScopedRoute && shipmentsQuery.data)) ? (
              <div className="overflow-x-auto rounded-lg border [-webkit-overflow-scrolling:touch]">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>{t("merchantOrdersList.colMerchant")}</TableHead>
                      {merchantContext ? null : (
                        <TableHead>{t("merchantOrdersList.colWarehouse")}</TableHead>
                      )}
                      <TableHead className="text-end tabular-nums">
                        {t("merchantOrdersList.colOrderCount")}
                      </TableHead>
                      <TableHead className="text-end tabular-nums">
                        {t("merchantOrdersList.colTotalValue")}
                      </TableHead>
                      <TableHead>{t("merchantOrdersList.colBatchPipelineStatus")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!isWarehouseScopedRoute &&
                      pendingRows.map((row) => (
                      <TableRow
                        key={`pending-${row.id}`}
                        className="hover:bg-muted/50 cursor-pointer"
                        onClick={() => void navigate("/merchant-orders/pending-imports")}
                      >
                        <TableCell className="font-medium">
                          {row.merchantName ?? "—"}
                        </TableCell>
                        {merchantContext ? null : (
                          <TableCell className="text-muted-foreground">—</TableCell>
                        )}
                        <TableCell className="text-end tabular-nums">
                          {row.rowCount ?? "—"}
                        </TableCell>
                        <TableCell className="text-end tabular-nums">—</TableCell>
                        <TableCell>
                          <MerchantBatchStatusWithWarehouse
                            transferStatus="PENDING_CONFIRMATION"
                            assignedWarehouseId={undefined}
                            assignedWarehouseName={undefined}
                            contextWarehouseId={user?.warehouseId}
                          />
                        </TableCell>
                      </TableRow>
                      ))}
                    {!isWarehouseScopedRoute &&
                      shipmentsQuery.data?.shipments.map((row, idx) => (
                      <TableRow
                        key={merchantOrderBatchId(row) || row.id || `row-${idx}`}
                        className="hover:bg-muted/50 cursor-pointer"
                        onClick={() => onRowClick(row)}
                      >
                        <TableCell className="font-medium">
                          {row.merchant?.displayName ?? "—"}
                        </TableCell>
                        {merchantContext ? null : (
                          <TableCell className="text-muted-foreground">
                            {row.assignedWarehouse?.name ?? "—"}
                          </TableCell>
                        )}
                        <TableCell className="text-end tabular-nums">
                          {row.orderCount ?? "—"}
                        </TableCell>
                        <TableCell className="text-end tabular-nums">
                          {formatEGP(row.totalShipmentValue ?? row.shipmentValue, locale)}
                        </TableCell>
                        <TableCell>
                          <MerchantBatchStatusWithWarehouse
                            transferStatus={row.transferStatus}
                            assignedWarehouseId={row.assignedWarehouse?.id}
                            assignedWarehouseName={
                              merchantContext ? undefined : row.assignedWarehouse?.name
                            }
                            contextWarehouseId={user?.warehouseId}
                          />
                        </TableCell>
                      </TableRow>
                      ))}
                    {isWarehouseScopedRoute &&
                      warehouseOrdersQuery.data?.merchantOrders.map(
                        (row: WarehouseMerchantOrderRow, idx) => (
                          <TableRow
                            key={row.merchantOrderId || row.id || `w-row-${idx}`}
                            className="hover:bg-muted/50 cursor-pointer"
                            onClick={() =>
                              void navigate(
                                `/warehouses/${encodeURIComponent(routeWarehouseId)}/merchant-orders/${encodeURIComponent(row.merchantOrderId || row.id)}`,
                              )
                            }
                          >
                            <TableCell className="font-medium">
                              {row.merchant?.displayName ?? "—"}
                            </TableCell>
                            <TableCell className="text-end tabular-nums">
                              {row.orderCount ?? "—"}
                            </TableCell>
                            <TableCell className="text-end tabular-nums">
                              {formatEGP(row.totalShipmentValue, locale)}
                            </TableCell>
                            <TableCell>
                              <MerchantBatchStatusWithWarehouse
                                transferStatus={row.transferStatus}
                                assignedWarehouseId={row.assignedWarehouse?.id}
                                assignedWarehouseName={row.assignedWarehouse?.name}
                                contextWarehouseId={routeWarehouseId || user?.warehouseId}
                              />
                            </TableCell>
                          </TableRow>
                        ),
                      )}
                  </TableBody>
                </Table>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2 border-border/60 border-t pt-4">
              <p className="text-muted-foreground text-sm">
                {t("cs.pagination.summary", {
                  total: totalRowsForPagination,
                  page,
                })}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  {t("cs.pagination.prev")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  {t("cs.pagination.next")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <SelectMerchantImportModal
        open={isMerchantPickerOpen}
        requireMerchantSelection={!merchantContext}
        merchants={merchantsQuery.data?.merchants ?? []}
        selectedMerchantId={selectedMerchantId}
        pickupDate={pickupDate}
        isLoadingMerchants={merchantsQuery.isLoading}
        merchantsErrorMessage={merchantsErrorMessage}
        isSubmitting={isImporting}
        onMerchantChange={setSelectedMerchantId}
        onPickupDateChange={setPickupDate}
        onCancel={onCancelMerchantPick}
        onConfirm={() => {
          void onConfirmMerchantPick()
        }}
      />
    </Layout>
  )
}

