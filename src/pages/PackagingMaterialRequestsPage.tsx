import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { Plus } from "react-lucid"

import { Layout } from "@/components/layout/Layout"
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { isMerchantUser, useAuth } from "@/lib/auth-context"
import {
  canApprovePackagingRequestLines,
  canCreatePackagingRequests,
  canDeliverPackagingRequest,
  canPatchPackagingRequestStatus,
  canReadAllPackagingRequests,
} from "@/features/packaging-material/utils/packaging-material.utils"
import { PackagingRequestApproveDialog } from "@/features/packaging-material/components/PackagingRequestApproveDialog"
import { PackagingRequestDeliverDialog } from "@/features/packaging-material/components/PackagingRequestDeliverDialog"
import {
  useCreatePackagingMaterialRequest,
  usePackagingMaterialRequestById,
  usePackagingMaterialRequests,
  usePackagingMaterials,
  usePatchPackagingMaterialRequestStatus,
} from "@/features/packaging-material/hooks/use-packaging-material"
import { PackagingRequestBuilder } from "@/features/packaging-material/components/PackagingRequestBuilder"
import { createInitialBuilderRows } from "@/features/packaging-material/utils/request-builder.utils"
import {
  type PackagingRequestBuilderFieldError,
  type PackagingRequestBuilderItem,
  type PackagingRequestStepStatus,
} from "@/features/packaging-material/types"
import { PackagingRequestDetailsDrawer } from "@/features/packaging-material/components/PackagingRequestDetailsDrawer"
import {
  packagingMaterialRequestStatuses,
  type PackagingMaterialRequestStatus,
} from "@/api/packaging-material-requests-api"
import { showToast } from "@/lib/toast"
import { listMerchants, type MerchantRow } from "@/api/merchants-api"
import { useQuery } from "@tanstack/react-query"
import { validatePackagingRequestBuilderRows } from "@/features/packaging-material/utils/request-builder.validation"

export function PackagingMaterialRequestsPage() {
  const { t } = useTranslation()
  const { accessToken, user } = useAuth()
  const token = accessToken ?? ""

  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [status, setStatus] = useState<PackagingRequestStepStatus | "">("")
  const [merchantIdFilter, setMerchantIdFilter] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [selectedMerchantId, setSelectedMerchantId] = useState("")
  const [merchantSearch, setMerchantSearch] = useState("")
  const [merchantPage, setMerchantPage] = useState(1)
  const [merchantOptions, setMerchantOptions] = useState<MerchantRow[]>([])
  const [notes, setNotes] = useState("")
  const [doPackaging, setDoPackaging] = useState(false)
  const [builderRows, setBuilderRows] = useState<PackagingRequestBuilderItem[]>(
    createInitialBuilderRows(),
  )
  const [touchedBuilderRows, setTouchedBuilderRows] = useState<Set<string>>(new Set())
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const [selectedRequestId, setSelectedRequestId] = useState("")
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  const [approveRequestId, setApproveRequestId] = useState("")
  const [deliverOpen, setDeliverOpen] = useState(false)
  const [deliverRequestId, setDeliverRequestId] = useState("")

  const requestsQuery = usePackagingMaterialRequests({
    token,
    page,
    pageSize,
    status: status || undefined,
    merchantId: canReadAllPackagingRequests(user) ? merchantIdFilter || undefined : undefined,
  })
  const materialsQuery = usePackagingMaterials({ token, page: 1, pageSize: 200 })
  const createRequestMutation = useCreatePackagingMaterialRequest(token)
  const patchStatusMutation = usePatchPackagingMaterialRequestStatus(token)
  const detailsQuery = usePackagingMaterialRequestById({
    token,
    requestId: selectedRequestId,
    enabled: detailsOpen && !!selectedRequestId,
  })
  const approveDetailsQuery = usePackagingMaterialRequestById({
    token,
    requestId: approveRequestId,
    enabled: approveOpen && !!approveRequestId,
  })
  const deliverDetailsQuery = usePackagingMaterialRequestById({
    token,
    requestId: deliverRequestId,
    enabled: deliverOpen && !!deliverRequestId,
  })
  const merchantUser = isMerchantUser(user)
  const merchantsQuery = useQuery({
    queryKey: ["packaging-request-merchants", token, merchantSearch, merchantPage],
    queryFn: () =>
      listMerchants({
        token,
        page: merchantPage,
        pageSize: 100,
        accountStatus: "ACTIVATED",
        search: merchantSearch || undefined,
      }),
    enabled:
      !!token &&
      ((canCreatePackagingRequests(user) && !merchantUser) || canReadAllPackagingRequests(user)),
  })

  const rows = requestsQuery.data?.requests ?? []
  const total = requestsQuery.data?.total ?? 0
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [pageSize, total])

  const canCreate = canCreatePackagingRequests(user)
  const canPatchStatus = canPatchPackagingRequestStatus(user)
  const canApproveLines = canApprovePackagingRequestLines(user)
  const canDeliver = canDeliverPackagingRequest(user)
  const needsMerchantSelection = canCreate && !merchantUser
  const merchantsTotal = merchantsQuery.data?.total ?? 0
  const canLoadMoreMerchants = merchantOptions.length < merchantsTotal
  const builderValidation = useMemo(
    () =>
      validatePackagingRequestBuilderRows(builderRows, materialsQuery.data?.materials ?? []),
    [builderRows, materialsQuery.data?.materials],
  )
  const createDisabled =
    createRequestMutation.isPending ||
    builderValidation.hasBlockingErrors ||
    (needsMerchantSelection && !selectedMerchantId)

  useEffect(() => {
    const pageRows = merchantsQuery.data?.merchants ?? []
    if (merchantPage === 1) {
      setMerchantOptions(pageRows)
      return
    }
    setMerchantOptions((prev) => {
      const existingIds = new Set(prev.map((m) => m.merchantId))
      const additions = pageRows.filter((m) => !existingIds.has(m.merchantId))
      return [...prev, ...additions]
    })
  }, [merchantPage, merchantsQuery.data])

  async function onCreateRequest() {
    setSubmitAttempted(true)
    const items = builderRows
      .filter((row) => row.packagingMaterialId && Number(row.requestedQuantity) > 0)
      .map((row) => ({
        packagingMaterialId: row.packagingMaterialId,
        requestedQuantity: row.requestedQuantity,
      }))
    if (builderValidation.hasBlockingErrors || items.length === 0) {
      showToast(t("packagingRequests.validation.fixErrors"), "error")
      return
    }
    if (needsMerchantSelection && !selectedMerchantId) {
      showToast("Please select a merchant", "error")
      return
    }
    try {
      await createRequestMutation.mutateAsync({
        merchantId: needsMerchantSelection ? selectedMerchantId : undefined,
        notes: notes || null,
        doPackaging,
        items,
      })
      setCreateModalOpen(false)
      setSelectedMerchantId("")
      setNotes("")
      setDoPackaging(false)
      setBuilderRows(createInitialBuilderRows())
      setTouchedBuilderRows(new Set())
      setSubmitAttempted(false)
      showToast("Request created", "success")
    } catch (error) {
      showToast((error as Error).message ?? "Could not create request", "error")
    }
  }

  async function onPatchStatus(id: string, nextStatus: PackagingRequestStepStatus) {
    try {
      await patchStatusMutation.mutateAsync({ id, status: nextStatus })
      showToast("Status updated", "success")
    } catch (error) {
      showToast((error as Error).message ?? "Could not update status", "error")
    }
  }

  function resolveBuilderErrorMessage(error: PackagingRequestBuilderFieldError): string {
    if (error.code === "minimum_quantity") {
      return t("packagingRequests.validation.minimum_quantity", {
        min: error.minimumQuantity ?? "0",
      })
    }
    return t(`packagingRequests.validation.${error.code}`)
  }

  return (
    <Layout title={t("packagingRequests.title")}>
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>{t("packagingRequests.title")}</CardTitle>
              <CardDescription>{t("packagingRequests.subtitle")}</CardDescription>
            </div>
            {canCreate ? (
              <Button
                onClick={() => {
                  setCreateModalOpen(true)
                  setSelectedMerchantId("")
                  setMerchantSearch("")
                  setMerchantPage(1)
                  setSubmitAttempted(false)
                  setTouchedBuilderRows(new Set())
                }}
              >
                <Plus className="size-4" />
                {t("packagingRequests.create")}
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <select
                className="border-input bg-background h-10 rounded-md border px-3 text-sm"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as PackagingRequestStepStatus | "")
                  setPage(1)
                }}
              >
                <option value="">{t("packagingRequests.filters.allStatuses")}</option>
                {packagingMaterialRequestStatuses.map((statusOption) => (
                  <option key={statusOption} value={statusOption}>
                    {statusOption}
                  </option>
                ))}
              </select>
              {canReadAllPackagingRequests(user) ? (
                <select
                  className="border-input bg-background h-10 rounded-md border px-3 text-sm"
                  value={merchantIdFilter}
                  onChange={(event) => {
                    setMerchantIdFilter(event.target.value)
                    setPage(1)
                  }}
                >
                  <option value="">{t("packagingRequests.filters.allMerchants")}</option>
                  {merchantOptions.map((merchant) => (
                    <option key={merchant.merchantId} value={merchant.merchantId}>
                      {merchant.displayName || merchant.businessName || merchant.fullName}
                    </option>
                  ))}
                </select>
              ) : null}
              <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
              <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </div>
            {requestsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">{t("packagingRequests.loading")}</p>
            ) : null}
            {!requestsQuery.isLoading && rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("packagingRequests.empty")}</p>
            ) : null}
            {rows.length > 0 ? (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("packagingRequests.table.requestNumber")}</TableHead>
                      <TableHead>{t("packagingRequests.table.merchantId")}</TableHead>
                      <TableHead>{t("packagingRequests.table.status")}</TableHead>
                      <TableHead>{t("packagingRequests.table.estimatedCost")}</TableHead>
                      <TableHead>On-site packaging</TableHead>
                      <TableHead>Merchant order</TableHead>
                      <TableHead>{t("packagingRequests.table.createdAt")}</TableHead>
                      <TableHead>{t("packagingRequests.table.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows
                      .filter((row) => {
                        if (dateFrom && new Date(row.createdAt) < new Date(dateFrom)) return false
                        if (dateTo && new Date(row.createdAt) > new Date(`${dateTo}T23:59:59`)) return false
                        return true
                      })
                      .map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{row.requestNumber}</TableCell>
                          <TableCell>{row.merchantName || row.merchantId}</TableCell>
                          <TableCell>{row.status}</TableCell>
                          <TableCell>{row.totalEstimatedCost}</TableCell>
                          <TableCell>
                            {(row as any).doPackaging ? (
                              <Badge variant="default">On-site ✓</Badge>
                            ) : (
                              <Badge variant="outline">No</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {(row.linkedMerchantOrderCount ?? 0) > 0 ? (
                              <span className="flex flex-col gap-1">
                                <Badge variant="secondary">Linked</Badge>
                                {(row.linkedMerchantOrderIds ?? []).length > 0 ? (
                                  <Link
                                    className="text-primary text-xs underline"
                                    to={`/merchant-orders/${encodeURIComponent(row.linkedMerchantOrderIds![0])}`}
                                  >
                                    Open batch
                                  </Link>
                                ) : null}
                                {(row.linkedMerchantOrderCount ?? 0) > 1 ? (
                                  <span className="text-muted-foreground text-xs">
                                    +{(row.linkedMerchantOrderCount ?? 0) - 1} more
                                  </span>
                                ) : null}
                              </span>
                            ) : (
                              <Badge variant="outline">Standalone</Badge>
                            )}
                          </TableCell>
                          <TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedRequestId(row.id)
                                  setDetailsOpen(true)
                                }}
                              >
                                {t("packagingRequests.details")}
                              </Button>
                              {canApproveLines && row.status === "PENDING" ? (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => {
                                    setApproveRequestId(row.id)
                                    setApproveOpen(true)
                                  }}
                                >
                                  Approve…
                                </Button>
                              ) : null}
                              {canDeliver && row.status === "READY_FOR_DELIVERY" ? (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => {
                                    setDeliverRequestId(row.id)
                                    setDeliverOpen(true)
                                  }}
                                >
                                  Deliver…
                                </Button>
                              ) : null}
                              {canPatchStatus && (row.allowedNextStatuses ?? []).length > 0 ? (
                                <select
                                  className="border-input bg-background h-8 rounded border px-2 text-xs"
                                  defaultValue=""
                                  onChange={(event) => {
                                    const nextStatus = event.target.value as PackagingMaterialRequestStatus
                                    if (!nextStatus) return
                                    void onPatchStatus(row.id, nextStatus as PackagingRequestStepStatus)
                                    event.currentTarget.value = ""
                                  }}
                                >
                                  <option value="">Set status…</option>
                                  {(row.allowedNextStatuses ?? []).map((statusOption) => (
                                    <option key={statusOption} value={statusOption}>
                                      {statusOption}
                                    </option>
                                  ))}
                                </select>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t("cs.pagination.summary", { total, page })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => prev - 1)}
                >
                  {t("cs.pagination.prev")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  {t("cs.pagination.next")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="grid max-h-[90vh] max-w-3xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle>{t("packagingRequests.create")}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 space-y-4 overflow-y-auto px-6 py-4">
            {needsMerchantSelection ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("packagingRequests.form.merchant")}</label>
                <select
                  className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                  value={selectedMerchantId}
                  onChange={(event) => setSelectedMerchantId(event.target.value)}
                  disabled={createRequestMutation.isPending || merchantsQuery.isLoading}
                >
                  <option value="">{t("packagingRequests.form.selectMerchant")}</option>
                  {merchantOptions.map((merchant) => (
                    <option key={merchant.merchantId} value={merchant.merchantId}>
                      {merchant.displayName || merchant.businessName || merchant.fullName}
                    </option>
                  ))}
                </select>
                <Input
                  value={merchantSearch}
                  onChange={(event) => {
                    setMerchantSearch(event.target.value)
                    setMerchantPage(1)
                  }}
                  placeholder={t("packagingRequests.form.searchMerchant")}
                />
                {canLoadMoreMerchants ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setMerchantPage((prev) => prev + 1)}
                    disabled={merchantsQuery.isLoading}
                  >
                    {t("packagingRequests.form.loadMoreMerchants")}
                  </Button>
                ) : null}
              </div>
            ) : null}
            <Input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t("packagingRequests.form.notes")}
            />
            <div className="flex items-center gap-3 rounded-md border px-4 py-3">
              <input
                id="do-packaging-checkbox"
                type="checkbox"
                checked={doPackaging}
                onChange={(e) => setDoPackaging(e.target.checked)}
                disabled={createRequestMutation.isPending}
                className="size-4 accent-primary cursor-pointer"
              />
              <label
                htmlFor="do-packaging-checkbox"
                className="cursor-pointer select-none text-sm font-medium leading-none"
              >
                Send staff to perform packaging at merchant's location
              </label>
            </div>
            <PackagingRequestBuilder
              materials={materialsQuery.data?.materials ?? []}
              value={builderRows}
              onChange={setBuilderRows}
              validation={builderValidation}
              touchedRowKeys={
                submitAttempted ? new Set(builderRows.map((row) => row.key)) : touchedBuilderRows
              }
              onTouchRow={(rowKey) =>
                setTouchedBuilderRows((prev) => new Set(prev).add(rowKey))
              }
              resolveErrorMessage={resolveBuilderErrorMessage}
              disabled={createRequestMutation.isPending}
            />
          </div>
          <DialogFooter className="shrink-0 border-t px-6 py-4">
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => void onCreateRequest()} disabled={createDisabled}>
              {t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PackagingRequestDetailsDrawer
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        data={detailsQuery.data ?? null}
        isLoading={detailsQuery.isLoading}
        token={token}
        user={user}
      />

      <PackagingRequestApproveDialog
        open={approveOpen}
        onOpenChange={(open) => {
          setApproveOpen(open)
          if (!open) setApproveRequestId("")
        }}
        token={token}
        requestId={approveRequestId}
        items={approveDetailsQuery.data?.items}
      />

      <PackagingRequestDeliverDialog
        open={deliverOpen}
        onOpenChange={(open) => {
          setDeliverOpen(open)
          if (!open) setDeliverRequestId("")
        }}
        token={token}
        requestId={deliverRequestId}
        request={deliverDetailsQuery.data?.request}
        items={deliverDetailsQuery.data?.items}
      />
    </Layout>
  )
}

