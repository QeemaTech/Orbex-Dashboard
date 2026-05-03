import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Boxes, Upload, Download, Loader2 } from "react-lucid"
import { useCallback, useMemo, useState, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"

import {
  downloadPendingMerchantOrderImportVersionFile,
  getDashboardKpis,
  getPendingMerchantOrderImportPreview,
  importOrdersFromExcel,
  downloadImportTemplate,
  listPendingMerchantOrderImportVersions,
  listShipments,
  merchantOrderBatchId,
} from "@/api/merchant-orders-api"
import type { CsShipmentRow } from "@/api/merchant-orders-api"
import { listWarehouseSites } from "@/api/warehouse-api"
import { listMerchants } from "@/api/merchants-api"
import { usePackagingMaterials } from "@/features/packaging-material/hooks/use-packaging-material"
import {
  PackagingRequestBuilder,
} from "@/features/packaging-material/components/PackagingRequestBuilder"
import type { PackagingRequestBuilderItem } from "@/features/packaging-material/types"
import { createInitialBuilderRows } from "@/features/packaging-material/utils/request-builder.utils"
import { createPackagingMaterialRequest } from "@/api/packaging-material-requests-api"
import { Layout } from "@/components/layout/Layout"
import { MerchantBatchStatusWithWarehouse } from "@/components/shared/StatusWithWarehouseContext"
import { StatCard } from "@/components/shared/StatCard"
import { Badge } from "@/components/ui/badge"
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
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { backendMerchantOrderBatchLabel } from "@/features/warehouse/backend-labels"
import { isMerchantUser, useAuth } from "@/lib/auth-context"
import { showToast } from "@/lib/toast"

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
  const locale = resolveNumberLocale(i18n.language)
  const { accessToken, user } = useAuth()
  const token = accessToken ?? ""
  const queryClient = useQueryClient()

  const [searchParams, setSearchParams] = useSearchParams()
  const warehouseId = searchParams.get("warehouseId") ?? ""
  const page = Number(searchParams.get("page") ?? "1") || 1
  const pageSize = Number(searchParams.get("pageSize") ?? "20") || 20

  const warehousesQuery = useQuery({
    queryKey: ["warehouse-sites-shipments", token],
    queryFn: () => listWarehouseSites(token),
    enabled: !!token && user?.role === "ADMIN",
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
    enabled: !!token,
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
    enabled: !!token,
  })

  const setWarehouse = useCallback(
    (next: string) => {
      const p = new URLSearchParams(searchParams)
      if (next) p.set("warehouseId", next)
      else p.delete("warehouseId")
      p.set("page", "1")
      setSearchParams(p)
    },
    [searchParams, setSearchParams],
  )

  const setPage = (n: number) => {
    const p = new URLSearchParams(searchParams)
    p.set("page", String(n))
    setSearchParams(p)
  }

  const totalPages = Math.max(
    1,
    Math.ceil((shipmentsQuery.data?.total ?? 0) / pageSize),
  )

  const batchPipelineBreakdown = useMemo(() => {
    const rows = kpiQuery.data?.transferStatusBreakdown ?? []
    const priority = ["PENDING_PICKUP", "PICKED_UP", "IN_WAREHOUSE"]
    const rank = new Map(priority.map((status, idx) => [status, idx]))
    return [...rows].sort((a, b) => {
      const aRank = rank.get(String(a.transferStatus).toUpperCase()) ?? Number.MAX_SAFE_INTEGER
      const bRank = rank.get(String(b.transferStatus).toUpperCase()) ?? Number.MAX_SAFE_INTEGER
      if (aRank !== bRank) return aRank - bRank
      return b.count - a.count
    })
  }, [kpiQuery.data?.transferStatusBreakdown])
  const totals = kpiQuery.data?.totals
  const showKpiError = !!kpiQuery.error
  const showKpiLoading = kpiQuery.isLoading
  const showKpiEmpty = !showKpiLoading && !showKpiError && batchPipelineBreakdown.length === 0
  const merchantContext = isMerchantUser(user)
  const merchantOrdersTitleKey = merchantContext
    ? "merchantOrdersList.myOrders.pageTitle"
    : "merchantOrdersList.pageTitle"
  const merchantOrdersDescriptionKey = merchantContext
    ? "merchantOrdersList.myOrders.description"
    : "merchantOrdersList.description"
  const merchantOrdersTableTitleKey = merchantContext
    ? "merchantOrdersList.myOrders.tableCardTitle"
    : "merchantOrdersList.tableCardTitle"
  const merchantOrdersLoadingKey = merchantContext
    ? "merchantOrdersList.myOrders.loading"
    : "merchantOrdersList.loading"
  const merchantOrdersKpiTitleKey = merchantContext
    ? "merchantOrdersList.myOrders.kpiTotalMerchantOrders"
    : "merchantOrdersList.kpiTotalMerchantOrders"

  const canViewImportExcel = Boolean(user?.permissions?.includes("merchant_orders.read"))
  const [excelPreviewImportId, setExcelPreviewImportId] = useState<string | null>(null)
  const [excelVersionsImportId, setExcelVersionsImportId] = useState<string | null>(null)

  const excelPreviewQuery = useQuery({
    queryKey: ["merchant-order-list-import-preview", token, excelPreviewImportId],
    queryFn: () =>
      getPendingMerchantOrderImportPreview({
        token,
        pendingImportId: excelPreviewImportId!,
      }),
    enabled: !!token && !!excelPreviewImportId,
  })

  const excelVersionsQuery = useQuery({
    queryKey: ["merchant-order-list-import-versions", token, excelVersionsImportId],
    queryFn: () =>
      listPendingMerchantOrderImportVersions({
        token,
        pendingImportId: excelVersionsImportId!,
      }),
    enabled: !!token && !!excelVersionsImportId,
  })

  const changeTypeLabel = (value: "INITIAL_UPLOAD" | "PICKUP_DATE_UPDATED" | "FILE_REPLACED") =>
    t(`merchantOrdersList.changeTypeValues.${value}`, { defaultValue: value })

  const detailPrefix = location.pathname.startsWith("/cs/")
    ? "/cs/merchant-orders"
    : "/merchant-orders"

  const onRowClick = (row: CsShipmentRow) => {
    const batchId = merchantOrderBatchId(row)
    if (!batchId) return
    void navigate(`${detailPrefix}/${encodeURIComponent(batchId)}`)
  }

  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [selectedMerchant, setSelectedMerchant] = useState<string>("")
  const [pickupDate, setPickupDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [includePackagingRequest, setIncludePackagingRequest] = useState(false)
  const [shippingPaymentType, setShippingPaymentType] = useState<
    "NOT_PREPAID" | "PREPAID_SHIPPING" | "PREPAID_FULL"
  >("NOT_PREPAID")
  const [packagingRequestNotes, setPackagingRequestNotes] = useState("")
  const [packagingRequestRows, setPackagingRequestRows] =
    useState<PackagingRequestBuilderItem[]>(createInitialBuilderRows())
  const [importError, setImportError] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importMerchantId = merchantContext ? (user?.merchantId ?? "") : selectedMerchant

  const merchantsQuery = useQuery({
    queryKey: ["merchants-list", token],
    queryFn: () => listMerchants({ token, pageSize: 100 }),
    enabled: !!token && !merchantContext,
  })

  const packagingMaterialsQuery = usePackagingMaterials({
    token,
    page: 1,
    pageSize: 200,
  })

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      let packagingMaterialRequestId: string | undefined
      if (includePackagingRequest) {
        const created = await createPackagingMaterialRequest({
          token,
          body: {
            merchantId: importMerchantId || undefined,
            notes: packagingRequestNotes || null,
            items: packagingRequestRows
              .filter((row) => row.packagingMaterialId && Number(row.requestedQuantity) > 0)
              .map((row) => ({
                packagingMaterialId: row.packagingMaterialId,
                requestedQuantity: row.requestedQuantity,
              })),
          },
        })
        packagingMaterialRequestId = created.request.id
      }

      return importOrdersFromExcel({
        token,
        file,
        merchantId: importMerchantId || undefined,
        pickupDate,
        packagingMaterialRequestId,
        shippingPaymentType,
      })
    },
    onSuccess: (data) => {
      showToast(
        t("merchantOrdersList.importQueuedSuccess", { count: data.orderCount }),
        "success",
      )
      setIsImportModalOpen(false)
      setSelectedMerchant("")
      setPickupDate(new Date().toISOString().slice(0, 10))
      setSelectedFile(null)
      setIncludePackagingRequest(false)
      setShippingPaymentType("NOT_PREPAID")
      setPackagingRequestNotes("")
      setPackagingRequestRows(createInitialBuilderRows())
      setImportError("")
      void queryClient.invalidateQueries({ queryKey: ["dashboard-merchant-pending-imports"] })
      void queryClient.invalidateQueries({ queryKey: ["merchant-order-pending-imports"] })
      shipmentsQuery.refetch()

      // Import creates a "pending confirmation" batch (202). Redirect user to confirm it.
      const pendingConfirmationsPath = location.pathname.startsWith("/cs/")
        ? "/cs/merchant-orders/pending-confirmations"
        : "/merchant-orders/pending-confirmations"
      void navigate(pendingConfirmationsPath)
    },
    onError: (error: Error) => {
      const msg = error.message || t("merchantOrdersList.importGenericError")
      setImportError(msg)
      showToast(msg, "error")
    },
  })

  const handleDownloadTemplate = async () => {
    try {
      await downloadImportTemplate(token)
      setImportError("")
      showToast(t("merchantOrdersList.downloadTemplateSuccess"), "success")
    } catch {
      const msg = t("merchantOrdersList.downloadTemplateError")
      setImportError(msg)
      showToast(msg, "error")
    }
  }

  const handleImportClick = () => {
    setIsImportModalOpen(true)
    setImportError("")
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.endsWith(".xlsx")) {
        setImportError("Please select an .xlsx file")
        return
      }
      setSelectedFile(file)
      setImportError("")
    }
  }

  const handleSubmitImport = () => {
    if (!pickupDate) {
      setImportError("Please select pickup date")
      return
    }
    if (merchantContext && !importMerchantId) {
      setImportError("Logged in merchant account is missing merchant id")
      return
    }
    if (!selectedFile) {
      setImportError("Please select a file")
      return
    }
    if (includePackagingRequest) {
      const validItems = packagingRequestRows.filter(
        (row) => row.packagingMaterialId && Number(row.requestedQuantity) > 0,
      )
      if (validItems.length === 0) {
        setImportError("Please add at least one packaging material item")
        return
      }
    }
    importMutation.mutate(selectedFile)
  }

  const totalRowsForPagination = shipmentsQuery.data?.total ?? 0

  return (
    <Layout title={t(merchantOrdersTitleKey)}>
      <div className="space-y-6">
        <Card className="from-primary/10 to-chart-2/10 border-primary/20 bg-gradient-to-br shadow-md">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="bg-primary/15 text-primary flex size-11 items-center justify-center rounded-xl">
              <Boxes className="size-5" aria-hidden />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg">{t(merchantOrdersTitleKey)}</CardTitle>
              <CardDescription>{t(merchantOrdersDescriptionKey)}</CardDescription>
            </div>
          </CardHeader>
        </Card>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <label className="text-muted-foreground text-sm font-medium" htmlFor="shipments-warehouse-filter">
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="size-4" />
              Download Template
            </Button>
            <Button onClick={handleImportClick}>
              <Upload className="size-4" />
              Import Orders
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t(merchantOrdersKpiTitleKey)}
            value={totals?.totalShipments ?? 0}
            icon={Boxes}
            accent="primary"
            hideTrend
          />
          {showKpiLoading ? (
            <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm sm:col-span-1 lg:col-span-3">
              {t("merchantOrdersList.kpiLoading")}
            </div>
          ) : null}
          {showKpiError ? (
            <div className="text-destructive rounded-lg border border-dashed p-4 text-sm sm:col-span-1 lg:col-span-3">
              {t("merchantOrdersList.kpiLoadError")}
            </div>
          ) : null}
          {!showKpiLoading && !showKpiError
            ? batchPipelineBreakdown.slice(0, 3).map((row) => (
              <StatCard
                key={row.transferStatus}
                title={backendMerchantOrderBatchLabel(t, row.transferStatus)}
                value={row.count}
                icon={Boxes}
                accent="success"
                hideTrend
              />
            ))
            : null}
          {showKpiEmpty ? (
            <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm sm:col-span-1 lg:col-span-3">
              {t("merchantOrdersList.kpiEmptyState")}
            </div>
          ) : null}
        </div>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="border-border/60 border-b pb-4">
            <CardTitle className="text-base font-semibold">
              {t(merchantOrdersTableTitleKey)}
            </CardTitle>
            <CardDescription>{t("merchantOrdersList.tableCardDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {shipmentsQuery.error ? (
              <p className="text-destructive text-sm">
                {(shipmentsQuery.error as Error).message}
              </p>
            ) : null}

            {shipmentsQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">{t(merchantOrdersLoadingKey)}</p>
            ) : null}

            {shipmentsQuery.data ? (
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
                      <TableHead>
                        {t("merchantOrdersList.colPaymentType", {
                          defaultValue: "Payment",
                        })}
                      </TableHead>
                      <TableHead>{t("merchantOrdersList.colBatchPipelineStatus")}</TableHead>
                      <TableHead>{t("merchantOrdersList.colResolution")}</TableHead>
                      {canViewImportExcel ? (
                        <TableHead className="text-end">
                          {t("merchantOrdersList.colImportExcel", { defaultValue: "Excel import" })}
                        </TableHead>
                      ) : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shipmentsQuery.data.shipments.map((row, idx) => (
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
                          {formatEGP(
                            row.shippingPaymentType === "PREPAID_FULL"
                              ? "0"
                              : (row.totalShipmentValue ?? row.shipmentValue),
                            locale,
                          )}
                        </TableCell>
                        <TableCell>
                          {row.shippingPaymentType === "PREPAID_FULL" ? (
                            <Badge variant="secondary" className="text-xs">
                              {t("merchantOrdersList.prepaidFull", {
                                defaultValue: "Prepaid (full)",
                              })}
                            </Badge>
                          ) : row.shippingPaymentType === "PREPAID_SHIPPING" ? (
                            <Badge variant="outline" className="text-xs">
                              {t("merchantOrdersList.prepaidShipping", {
                                defaultValue: "Prepaid (shipping)",
                              })}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              {t("merchantOrdersList.notPrepaid", {
                                defaultValue: "Not prepaid",
                              })}
                            </Badge>
                          )}
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
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {row.isResolved ? (
                              <Badge variant="default" className="text-xs">
                                {t("merchantOrdersList.badgeResolved")}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                {t("merchantOrdersList.badgeNotResolved")}
                              </Badge>
                            )}
                            {row.isFinished ? (
                              <Badge variant="secondary" className="text-xs">
                                {t("merchantOrdersList.badgeFinished")}
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        {canViewImportExcel ? (
                          <TableCell
                            className="text-end"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {row.importJobId ? (
                              <div className="flex flex-wrap justify-end gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setExcelPreviewImportId(row.importJobId!)
                                  }}
                                >
                                  {t("merchantOrdersList.viewExcelSheet", {
                                    defaultValue: "View Excel",
                                  })}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setExcelVersionsImportId(row.importJobId!)
                                  }}
                                >
                                  {t("merchantOrdersList.versionHistory", {
                                    defaultValue: "Version history",
                                  })}
                                </Button>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
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

        <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import Orders from Excel</DialogTitle>
              <DialogDescription>
                {merchantContext
                  ? t("merchantOrdersList.importModalDescriptionMerchant")
                  : t("merchantOrdersList.importModalDescriptionAdmin")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {!merchantContext ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Merchant</label>
                  <select
                    className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                    value={selectedMerchant}
                    onChange={(e) => setSelectedMerchant(e.target.value)}
                  >
                    <option value="">Select a merchant (optional)</option>
                    {(merchantsQuery.data?.merchants ?? []).map((m) => (
                      <option key={m.merchantId} value={m.merchantId}>
                        {m.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="space-y-2">
                <label className="text-sm font-medium">Pickup date</label>
                <Input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t("merchantOrdersList.shippingPaymentType", {
                    defaultValue: "Payment type",
                  })}
                </label>
                <select
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  value={shippingPaymentType}
                  onChange={(e) =>
                    setShippingPaymentType(
                      e.target.value as "NOT_PREPAID" | "PREPAID_SHIPPING" | "PREPAID_FULL",
                    )
                  }
                >
                  <option value="NOT_PREPAID">
                    {t("merchantOrdersList.notPrepaid", { defaultValue: "Not prepaid" })}
                  </option>
                  <option value="PREPAID_SHIPPING">
                    {t("merchantOrdersList.prepaidShipping", {
                      defaultValue: "Prepaid (shipping)",
                    })}
                  </option>
                  <option value="PREPAID_FULL">
                    {t("merchantOrdersList.prepaidFull", { defaultValue: "Prepaid (full)" })}
                  </option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Excel File</label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileChange}
                />
              </div>
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name}
                </p>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includePackagingRequest}
                  onChange={(event) => setIncludePackagingRequest(event.target.checked)}
                />
                Include Packaging Material Request
              </label>
              {includePackagingRequest ? (
                <div className="space-y-3 rounded-md border p-3">
                  <Input
                    value={packagingRequestNotes}
                    onChange={(event) => setPackagingRequestNotes(event.target.value)}
                    placeholder="Packaging request notes (optional)"
                  />
                  <PackagingRequestBuilder
                    materials={packagingMaterialsQuery.data?.materials ?? []}
                    value={packagingRequestRows}
                    onChange={setPackagingRequestRows}
                    disabled={importMutation.isPending}
                  />
                </div>
              ) : null}
              {importError && (
                <p className="text-sm text-destructive">{importError}</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitImport}
                disabled={importMutation.isPending || !selectedFile}
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  "Import"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={excelPreviewImportId !== null}
          onOpenChange={(open) => !open && setExcelPreviewImportId(null)}
        >
          <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {t("merchantOrdersList.pendingPreviewTitle", { defaultValue: "Excel preview" })}
              </DialogTitle>
              <DialogDescription>
                {excelPreviewQuery.data?.fileName ?? ""}
              </DialogDescription>
            </DialogHeader>
            {excelPreviewQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">{t(merchantOrdersLoadingKey)}</p>
            ) : null}
            {excelPreviewQuery.error ? (
              <p className="text-destructive text-sm">{(excelPreviewQuery.error as Error).message}</p>
            ) : null}
            {!excelPreviewQuery.isLoading && !excelPreviewQuery.error ? (
              <div className="space-y-3">
                <p className="text-muted-foreground text-sm">
                  {(excelPreviewQuery.data?.rowCount ?? 0).toLocaleString()}{" "}
                  {t("merchantOrdersList.colOrderCount", { defaultValue: "orders" })}
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {t("merchantOrdersList.colCustomer", { defaultValue: "Customer" })}
                      </TableHead>
                      <TableHead>{t("merchantOrdersList.colPhone", { defaultValue: "Phone" })}</TableHead>
                      <TableHead>
                        {t("merchantOrdersList.colAddress", { defaultValue: "Address" })}
                      </TableHead>
                      <TableHead>
                        {t("merchantOrdersList.colShipmentValue", { defaultValue: "Shipment value" })}
                      </TableHead>
                      <TableHead>
                        {t("merchantOrdersList.colShippingFee", { defaultValue: "Shipping fee" })}
                      </TableHead>
                      <TableHead>
                        {t("merchantOrdersList.colPaymentMethod", { defaultValue: "Payment method" })}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(excelPreviewQuery.data?.rows ?? []).map((item, idx) => (
                      <TableRow key={`${idx}-${item.phonePrimary}`}>
                        <TableCell className="truncate">{item.customerName}</TableCell>
                        <TableCell className="truncate">{item.phonePrimary}</TableCell>
                        <TableCell className="truncate">{item.addressText}</TableCell>
                        <TableCell>{item.shipmentValue}</TableCell>
                        <TableCell>{item.shippingFee}</TableCell>
                        <TableCell>{item.paymentMethod}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog
          open={excelVersionsImportId !== null}
          onOpenChange={(open) => !open && setExcelVersionsImportId(null)}
        >
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {t("merchantOrdersList.versionHistory", { defaultValue: "Version history" })}
              </DialogTitle>
            </DialogHeader>
            {excelVersionsQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">{t(merchantOrdersLoadingKey)}</p>
            ) : null}
            {excelVersionsQuery.error ? (
              <p className="text-destructive text-sm">{(excelVersionsQuery.error as Error).message}</p>
            ) : null}
            {!excelVersionsQuery.isLoading && !excelVersionsQuery.error ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("merchantOrdersList.version", { defaultValue: "Version" })}</TableHead>
                    <TableHead>{t("merchantOrdersList.changeType", { defaultValue: "Change type" })}</TableHead>
                    <TableHead>{t("merchantOrdersList.pickupDate", { defaultValue: "Pickup date" })}</TableHead>
                    <TableHead>{t("merchantOrdersList.fileName", { defaultValue: "File" })}</TableHead>
                    <TableHead>{t("merchantOrdersList.changedBy", { defaultValue: "Changed by" })}</TableHead>
                    <TableHead>{t("merchantOrdersList.actions", { defaultValue: "Actions" })}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(excelVersionsQuery.data?.items ?? []).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.versionNumber}</TableCell>
                      <TableCell>{changeTypeLabel(item.changeType)}</TableCell>
                      <TableCell>{new Date(item.pickupDate).toLocaleDateString()}</TableCell>
                      <TableCell>{item.fileName}</TableCell>
                      <TableCell>{item.changedByName || "—"}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!item.filePath}
                          onClick={() =>
                            excelVersionsImportId
                              ? downloadPendingMerchantOrderImportVersionFile({
                                  token,
                                  pendingImportId: excelVersionsImportId,
                                  versionId: item.id,
                                  fileName: item.fileName,
                                })
                              : undefined
                          }
                        >
                          {item.filePath
                            ? t("merchantOrdersList.downloadOriginal", {
                                defaultValue: "Download original file",
                              })
                            : t("merchantOrdersList.fileUnavailable", { defaultValue: "File unavailable" })}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  )
}

