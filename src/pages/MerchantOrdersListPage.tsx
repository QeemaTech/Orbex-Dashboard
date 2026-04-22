import { useQuery, useMutation } from "@tanstack/react-query"
import { Boxes, Upload, Download, Loader2 } from "react-lucid"
import { useCallback, useMemo, useState, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"

import {
  downloadMerchantOrdersImportTemplate,
  getDashboardKpis,
  importMerchantOrdersExcel,
  listPendingMerchantOrderImports,
  listShipments,
  merchantOrderBatchId,
  importOrdersFromExcel,
  downloadImportTemplate,
} from "@/api/merchant-orders-api"
import type { CsShipmentRow } from "@/api/merchant-orders-api"
import { listMerchants } from "@/api/merchants-api"
import { ApiError, formatApiValidationDetails } from "@/api/client"
import { listWarehouseSites } from "@/api/warehouse-api"
import { listMerchants, type MerchantRow } from "@/api/merchants-api"
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
    : "/merchant-orders"

  const onRowClick = (row: CsShipmentRow) => {
    const batchId = merchantOrderBatchId(row)
    if (!batchId) return
    void navigate(`${detailPrefix}/${encodeURIComponent(batchId)}`)
  }

  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [selectedMerchant, setSelectedMerchant] = useState<string>("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importError, setImportError] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const merchantsQuery = useQuery({
    queryKey: ["merchants-list", token],
    queryFn: () => listMerchants({ token, pageSize: 100 }),
    enabled: !!token,
  })

  const importMutation = useMutation({
    mutationFn: (file: File) =>
      importOrdersFromExcel({
        token,
        file,
        merchantId: selectedMerchant || undefined,
      }),
    onSuccess: () => {
      setIsImportModalOpen(false)
      setSelectedMerchant("")
      setSelectedFile(null)
      setImportError("")
      shipmentsQuery.refetch()
    },
    onError: (error: Error) => {
      setImportError(error.message)
    },
  })

  const handleDownloadTemplate = async () => {
    try {
      await downloadImportTemplate(token)
    } catch (error) {
      setImportError("Failed to download template")
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
    if (!selectedFile) {
      setImportError("Please select a file")
      return
    }
    importMutation.mutate(selectedFile)
  }

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

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="border-border/60 border-b pb-4">
            <CardTitle className="text-base font-semibold">
              {t("merchantOrdersList.tableCardTitle")}
            </CardTitle>
            <CardDescription>{t("merchantOrdersList.tableCardDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {shipmentsQuery.error ? (
              <p className="text-destructive text-sm">
                {(shipmentsQuery.error as Error).message}
              </p>
            ) : null}
            {pendingImportsQuery.error ? (
              <p className="text-destructive text-sm">
                {(pendingImportsQuery.error as Error).message}
              </p>
            ) : null}

            {shipmentsQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">{t("merchantOrdersList.loading")}</p>
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
                      <TableHead>{t("merchantOrdersList.colBatchPipelineStatus")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRows.map((row) => (
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
                Select a merchant and upload an Excel file with orders.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
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

