import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  confirmPendingMerchantOrderImport,
  downloadPendingMerchantOrderImportVersionFile,
  getPendingMerchantOrderImportPreview,
  listPendingMerchantOrderImports,
  listPendingMerchantOrderImportVersions,
  rejectPendingMerchantOrderImport,
  updatePendingMerchantOrderImportFile,
  updatePendingMerchantOrderPickupDate,
} from "@/api/merchant-orders-api"
import { getWarehousePickupCouriers } from "@/api/warehouse-api"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { isMerchantUser, useAuth } from "@/lib/auth-context"

export function MerchantOrderPendingImportsPage() {
  const { t } = useTranslation()
  const { accessToken, user } = useAuth()
  const token = accessToken ?? ""
  const merchantId = user?.merchantId ?? null
  const isMerchant = isMerchantUser(user)
  const queryClient = useQueryClient()
  const [previewImportId, setPreviewImportId] = useState<string | null>(null)
  const [versionsImportId, setVersionsImportId] = useState<string | null>(null)
  const [pickupImportId, setPickupImportId] = useState<string | null>(null)
  const [pickupDateDraft, setPickupDateDraft] = useState("")
  const [fileImportId, setFileImportId] = useState<string | null>(null)
  const [replacementFile, setReplacementFile] = useState<File | null>(null)
  const [confirmImportId, setConfirmImportId] = useState<string | null>(null)
  const [confirmPickupCourierId, setConfirmPickupCourierId] = useState("")

  const pendingQuery = useQuery({
    queryKey: ["merchant-order-pending-imports", token],
    queryFn: () => listPendingMerchantOrderImports({ token }),
    enabled: !!token,
  })

  const confirmMutation = useMutation({
    mutationFn: (params: { pendingImportId: string; pickupCourierId: string }) =>
      confirmPendingMerchantOrderImport({ token, ...params }),
    onSuccess: async () => {
      setConfirmImportId(null)
      setConfirmPickupCourierId("")
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["merchant-order-pending-imports", token] }),
        queryClient.invalidateQueries({ queryKey: ["admin-shipments-list"] }),
      ])
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (pendingImportId: string) =>
      rejectPendingMerchantOrderImport({ token, pendingImportId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["merchant-order-pending-imports", token] })
    },
  })
  const updatePickupDateMutation = useMutation({
    mutationFn: (params: { pendingImportId: string; pickupDate: string }) =>
      updatePendingMerchantOrderPickupDate({
        token,
        pendingImportId: params.pendingImportId,
        pickupDate: params.pickupDate,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["merchant-order-pending-imports", token] }),
        queryClient.invalidateQueries({ queryKey: ["merchant-order-pending-import-versions", token, versionsImportId] }),
      ])
      setPickupImportId(null)
      setPickupDateDraft("")
    },
  })
  const updateFileMutation = useMutation({
    mutationFn: (params: { pendingImportId: string; file: File }) =>
      updatePendingMerchantOrderImportFile({
        token,
        pendingImportId: params.pendingImportId,
        file: params.file,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["merchant-order-pending-imports", token] }),
        queryClient.invalidateQueries({ queryKey: ["merchant-order-pending-import-preview", token, previewImportId] }),
        queryClient.invalidateQueries({ queryKey: ["merchant-order-pending-import-versions", token, versionsImportId] }),
      ])
      setFileImportId(null)
      setReplacementFile(null)
    },
  })

  const isMutating = confirmMutation.isPending || rejectMutation.isPending
  const canConfirm = Boolean(user?.permissions?.includes("merchant_orders.confirm"))
  const canUpdatePickupDate = Boolean(user?.permissions?.includes("merchant_orders.update_pickup_date"))
  const canUpdateImportFile = Boolean(user?.permissions?.includes("merchant_orders.update_import_file"))
  const visibleItems = (pendingQuery.data?.items ?? []).filter((row) =>
    isMerchant ? !!merchantId && row.merchantId === merchantId : true,
  )
  const confirmImportRow = useMemo(
    () => visibleItems.find((r) => r.id === confirmImportId) ?? null,
    [confirmImportId, visibleItems],
  )
  const confirmWarehouseId = confirmImportRow?.assignedWarehouseId ?? null
  const confirmCouriersQuery = useQuery({
    queryKey: ["pending-import-pickup-couriers", token, confirmWarehouseId],
    queryFn: () =>
      getWarehousePickupCouriers({
        token,
        warehouseId: confirmWarehouseId!,
      }),
    enabled: !!token && !!confirmWarehouseId && confirmImportId !== null,
  })
  const selectedImport = useMemo(
    () => visibleItems.find((row) => row.id === previewImportId) ?? null,
    [previewImportId, visibleItems],
  )
  const previewQuery = useQuery({
    queryKey: ["merchant-order-pending-import-preview", token, previewImportId],
    queryFn: () =>
      getPendingMerchantOrderImportPreview({
        token,
        pendingImportId: previewImportId!,
      }),
    enabled: !!token && !!previewImportId,
  })
  const versionsQuery = useQuery({
    queryKey: ["merchant-order-pending-import-versions", token, versionsImportId],
    queryFn: () =>
      listPendingMerchantOrderImportVersions({
        token,
        pendingImportId: versionsImportId!,
      }),
    enabled: !!token && !!versionsImportId,
  })
  const changeTypeLabel = (value: "INITIAL_UPLOAD" | "PICKUP_DATE_UPDATED" | "FILE_REPLACED") =>
    t(`merchantOrdersList.changeTypeValues.${value}`, { defaultValue: value })
  const pendingPageTitle = isMerchant
    ? t("merchantOrdersList.pendingPageTitleMerchant", { defaultValue: "Order confirmations" })
    : t("merchantOrdersList.pendingPageTitle", { defaultValue: "Pending confirmations" })

  return (
    <Layout title={pendingPageTitle}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{pendingPageTitle}</CardTitle>
            <CardDescription>
              {t("merchantOrdersList.pendingDescription", {
                defaultValue:
                  "Review uploaded Excel batches, then confirm to create merchant orders and tracking numbers.",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">{t("merchantOrdersList.loading")}</p>
            ) : null}
            {pendingQuery.error ? (
              <p className="text-sm text-destructive">{(pendingQuery.error as Error).message}</p>
            ) : null}
            {!pendingQuery.isLoading && visibleItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("merchantOrdersList.pendingEmpty", { defaultValue: "No pending imports." })}
              </p>
            ) : null}
            {visibleItems.map((row) => (
              <div
                key={row.id}
                className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{row.merchantName}</p>
                  <p className="text-muted-foreground">{row.merchantBusinessName}</p>
                  <p className="text-muted-foreground">
                    {t("merchantOrdersList.colPhone", { defaultValue: "Phone" })}: {row.merchantPhone}
                  </p>
                  {row.merchantEmail ? (
                    <p className="text-muted-foreground">
                      {t("merchantOrdersList.colEmail", { defaultValue: "Email" })}: {row.merchantEmail}
                    </p>
                  ) : null}
                  {row.merchantPickupAddress ? (
                    <p className="text-muted-foreground">
                      {t("merchantOrdersList.colAddress", { defaultValue: "Address" })}:{" "}
                      {row.merchantPickupAddress}
                      {row.merchantPickupGovernorate ? ` · ${row.merchantPickupGovernorate}` : ""}
                    </p>
                  ) : null}
                  <p className="text-muted-foreground">
                    {row.rowCount} {t("merchantOrdersList.colOrderCount")} ·{" "}
                    {t("merchantOrdersList.pickupDate", { defaultValue: "Pickup date" })}:{" "}
                    {new Date(row.pickupDate).toLocaleDateString()}
                  </p>
                  <p className="text-muted-foreground">
                    {t("cs.shipmentStatus.PENDING_CONFIRMATION", {
                      defaultValue: "Pending confirmation",
                    })}
                  </p>
                  <p className="text-muted-foreground">{row.fileName}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setPreviewImportId(row.id)}>
                    {t("merchantOrdersList.preview", { defaultValue: "Preview" })}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setVersionsImportId(row.id)}>
                    {t("merchantOrdersList.versionHistory", { defaultValue: "Version history" })}
                  </Button>
                  {canUpdatePickupDate ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPickupImportId(row.id)
                        setPickupDateDraft(new Date(row.pickupDate).toISOString().slice(0, 10))
                      }}
                    >
                      {t("merchantOrdersList.updatePickupDate", { defaultValue: "Update pickup date" })}
                    </Button>
                  ) : null}
                  {canUpdateImportFile ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => setFileImportId(row.id)}>
                      {t("merchantOrdersList.updateExcelSheet", { defaultValue: "Update Excel sheet" })}
                    </Button>
                  ) : null}
                  {canConfirm ? (
                    <>
                    <Button
                      type="button"
                      size="sm"
                      disabled={isMutating}
                      onClick={() => {
                        setConfirmImportId(row.id)
                        setConfirmPickupCourierId("")
                      }}
                    >
                      {t("merchantOrdersList.confirmPending", { defaultValue: "Confirm" })}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isMutating}
                      onClick={() => rejectMutation.mutate(row.id)}
                    >
                      {t("merchantOrdersList.rejectPending", { defaultValue: "Reject" })}
                    </Button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Dialog open={previewImportId !== null} onOpenChange={(open) => !open && setPreviewImportId(null)}>
        <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t("merchantOrdersList.pendingPreviewTitle", { defaultValue: "Excel preview" })}
            </DialogTitle>
            <DialogDescription>
              {selectedImport?.fileName ?? previewQuery.data?.fileName ?? ""}
            </DialogDescription>
          </DialogHeader>
          {previewQuery.isLoading ? <p className="text-sm text-muted-foreground">{t("merchantOrdersList.loading")}</p> : null}
          {previewQuery.error ? (
            <p className="text-sm text-destructive">{(previewQuery.error as Error).message}</p>
          ) : null}
          {!previewQuery.isLoading && !previewQuery.error ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {(previewQuery.data?.rowCount ?? 0).toLocaleString()}{" "}
                {t("merchantOrdersList.colOrderCount", { defaultValue: "orders" })}
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("merchantOrdersList.colCustomer", { defaultValue: "Customer" })}</TableHead>
                    <TableHead>{t("merchantOrdersList.colPhone", { defaultValue: "Phone" })}</TableHead>
                    <TableHead>{t("merchantOrdersList.colAddress", { defaultValue: "Address" })}</TableHead>
                    <TableHead>{t("merchantOrdersList.colShipmentValue", { defaultValue: "Shipment value" })}</TableHead>
                    <TableHead>{t("merchantOrdersList.colShippingFee", { defaultValue: "Shipping fee" })}</TableHead>
                    <TableHead>{t("merchantOrdersList.colPaymentMethod", { defaultValue: "Payment method" })}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(previewQuery.data?.rows ?? []).map((item, idx) => (
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
      <Dialog open={versionsImportId !== null} onOpenChange={(open) => !open && setVersionsImportId(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t("merchantOrdersList.versionHistory", { defaultValue: "Version history" })}
            </DialogTitle>
          </DialogHeader>
          {versionsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">{t("merchantOrdersList.loading")}</p>
          ) : null}
          {versionsQuery.error ? (
            <p className="text-sm text-destructive">{(versionsQuery.error as Error).message}</p>
          ) : null}
          {!versionsQuery.isLoading && !versionsQuery.error ? (
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
                {(versionsQuery.data?.items ?? []).map((item) => (
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
                          versionsImportId
                            ? downloadPendingMerchantOrderImportVersionFile({
                                token,
                                pendingImportId: versionsImportId,
                                versionId: item.id,
                                fileName: item.fileName,
                              })
                            : undefined
                        }
                      >
                        {item.filePath
                          ? t("merchantOrdersList.downloadOriginal", { defaultValue: "Download original file" })
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
      <Dialog open={pickupImportId !== null} onOpenChange={(open) => !open && setPickupImportId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("merchantOrdersList.updatePickupDate", { defaultValue: "Update pickup date" })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <input
              type="date"
              value={pickupDateDraft}
              onChange={(e) => setPickupDateDraft(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
            <Button
              type="button"
              disabled={!pickupDateDraft || updatePickupDateMutation.isPending}
              onClick={() =>
                pickupImportId &&
                updatePickupDateMutation.mutate({
                  pendingImportId: pickupImportId,
                  pickupDate: new Date(`${pickupDateDraft}T00:00:00`).toISOString(),
                })
              }
            >
              {t("common.save", { defaultValue: "Save" })}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={fileImportId !== null} onOpenChange={(open) => !open && setFileImportId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("merchantOrdersList.updateExcelSheet", { defaultValue: "Update Excel sheet" })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => setReplacementFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
            <Button
              type="button"
              disabled={!replacementFile || updateFileMutation.isPending}
              onClick={() =>
                fileImportId && replacementFile
                  ? updateFileMutation.mutate({
                      pendingImportId: fileImportId,
                      file: replacementFile,
                    })
                  : undefined
              }
            >
              {t("merchantOrdersList.updateExcelSheet", { defaultValue: "Update Excel sheet" })}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={confirmImportId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmImportId(null)
            setConfirmPickupCourierId("")
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("merchantOrdersList.confirmPickupCourierTitle", {
                defaultValue: "Confirm import — pickup courier",
              })}
            </DialogTitle>
            <DialogDescription>
              {t("merchantOrdersList.confirmPickupCourierDescription", {
                defaultValue:
                  "Select the pickup courier for this batch. They will be assigned to the pickup task and used when building pickup manifests.",
              })}
            </DialogDescription>
          </DialogHeader>
          {!confirmWarehouseId ? (
            <p className="text-destructive text-sm">
              {t("merchantOrdersList.confirmRequiresWarehouse", {
                defaultValue:
                  "This merchant has no assigned warehouse. Assign a warehouse to the merchant before confirming.",
              })}
            </p>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("merchantOrdersList.pickupCourier", { defaultValue: "Pickup courier" })}
              </label>
              <select
                className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                value={confirmPickupCourierId}
                onChange={(e) => setConfirmPickupCourierId(e.target.value)}
                disabled={confirmCouriersQuery.isLoading || confirmMutation.isPending}
              >
                <option value="">
                  {t("merchantOrdersList.selectPickupCourier", {
                    defaultValue: "Select pickup courier",
                  })}
                </option>
                {(confirmCouriersQuery.data?.couriers ?? []).map((courier) => (
                  <option key={courier.id} value={courier.id}>
                    {courier.fullName?.trim() || "—"}
                  </option>
                ))}
              </select>
              {confirmCouriersQuery.error ? (
                <p className="text-destructive text-sm">
                  {(confirmCouriersQuery.error as Error).message}
                </p>
              ) : null}
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConfirmImportId(null)
                setConfirmPickupCourierId("")
              }}
              disabled={confirmMutation.isPending}
            >
              {t("common.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button
              type="button"
              disabled={
                confirmMutation.isPending ||
                !confirmImportId ||
                !confirmWarehouseId ||
                !confirmPickupCourierId ||
                confirmCouriersQuery.isLoading
              }
              onClick={() => {
                if (!confirmImportId || !confirmPickupCourierId) return
                confirmMutation.mutate({
                  pendingImportId: confirmImportId,
                  pickupCourierId: confirmPickupCourierId,
                })
              }}
            >
              {confirmMutation.isPending
                ? t("common.saving", { defaultValue: "…" })
                : t("merchantOrdersList.confirmImportSubmit", { defaultValue: "Confirm import" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}

