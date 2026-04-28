import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router-dom"

import {
  closeCourierManifest,
  dispatchCourierManifest,
  getCourierManifest,
  lockCourierManifest,
} from "@/api/courier-manifests-api"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/lib/auth-context"
import { showToast } from "@/lib/toast"

function formatDateTime(dateIso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateIso))
}

function formatMoney(raw: string): string {
  const num = Number.parseFloat(String(raw ?? "").replace(/,/g, "").trim())
  if (!Number.isFinite(num)) return "—"
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num)
}

function manifestStatusLabel(status: "DRAFT" | "LOCKED" | "DISPATCHED" | "CLOSED", t: (k: string) => string): string {
  return t(`warehouse.manifests.status.${status}`)
}

export function CourierManifestDetailPage() {
  const { t, i18n } = useTranslation()
  const { accessToken, user } = useAuth()
  const queryClient = useQueryClient()
  const token = accessToken ?? ""
  const locale = i18n.language.startsWith("ar") ? "ar-EG" : "en-EG"
  const { manifestId = "", warehouseId } = useParams<{
    manifestId: string
    warehouseId?: string
  }>()

  const manifestQuery = useQuery({
    queryKey: ["courier-manifest", "detail", token, manifestId],
    queryFn: () => getCourierManifest({ token, manifestId }),
    enabled: !!token && !!manifestId,
    refetchInterval: 15000,
  })

  const canManageTransfer =
    user?.permissions?.includes("warehouses.manage_transfer") ?? false
  const [dispatchConfirmOpen, setDispatchConfirmOpen] = useState(false)

  const lockMutation = useMutation({
    mutationFn: () => lockCourierManifest({ token, manifestId }),
    onSuccess: async () => {
      showToast(t("warehouse.manifests.lockSuccess"), "success")
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["courier-manifest", "detail", token, manifestId],
        }),
        queryClient.invalidateQueries({ queryKey: ["courier-manifests"] }),
      ])
    },
    onError: (error) => showToast((error as Error).message, "error"),
  })

  const dispatchMutation = useMutation({
    mutationFn: () => dispatchCourierManifest({ token, manifestId }),
    onSuccess: async () => {
      showToast(t("warehouse.manifests.dispatchSuccess"), "success")
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["courier-manifest", "detail", token, manifestId],
        }),
        queryClient.invalidateQueries({ queryKey: ["courier-manifests"] }),
      ])
    },
    onError: (error) => showToast((error as Error).message, "error"),
  })

  const closeMutation = useMutation({
    mutationFn: () => closeCourierManifest({ token, manifestId }),
    onSuccess: async () => {
      showToast(t("warehouse.manifests.closeSuccess"), "success")
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["courier-manifest", "detail", token, manifestId],
        }),
        queryClient.invalidateQueries({ queryKey: ["courier-manifests"] }),
      ])
    },
    onError: (error) => showToast((error as Error).message, "error"),
  })

  const notApplicable = t("warehouse.notApplicable")
  const manifest = manifestQuery.data
  const hasMissingCsConfirmation = Boolean(
    manifest?.shipments.some((shipment) => !shipment.csConfirmedAt),
  )

  const warehouseMismatch =
    !!warehouseId &&
    !!manifest &&
    manifest.warehouseId !== warehouseId

  const totalRows = useMemo(() => manifest?.shipments ?? [], [manifest])

  return (
    <Layout
      title={
        manifest
          ? t("manifestDetail.pageTitleWithId", { id: manifest.id })
          : t("manifestDetail.pageTitle")
      }
    >
      <div className="space-y-6">
        <p>
          <Link
            to={
              warehouseId
                ? `/warehouses/${encodeURIComponent(warehouseId)}/manifests`
                : "/courier-manifests"
            }
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
          >
            {warehouseId
              ? t("manifestDetail.backToWarehouse")
              : t("manifestDetail.backToGlobal")}
          </Link>
        </p>

        {manifestQuery.isLoading ? (
          <p className="text-muted-foreground text-sm">{t("warehouse.loading")}</p>
        ) : null}
        {manifestQuery.error ? (
          <p className="text-destructive text-sm">{(manifestQuery.error as Error).message}</p>
        ) : null}
        {warehouseMismatch ? (
          <p className="text-destructive text-sm">{t("manifestDetail.warehouseMismatch")}</p>
        ) : null}

        {manifest && !warehouseMismatch ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{t("manifestDetail.summaryTitle")}</CardTitle>
                <CardDescription>{t("manifestDetail.summaryDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <p><span className="font-medium">{t("manifestDetail.fields.manifestDate")}:</span> {manifest.manifestDate}</p>
                <p><span className="font-medium">{t("manifestDetail.fields.warehouse")}:</span> {manifest.warehouse.name}</p>
                <p><span className="font-medium">{t("manifestDetail.fields.governorate")}:</span> {manifest.warehouse.governorate}</p>
                <p><span className="font-medium">{t("manifestDetail.fields.courier")}:</span> {manifest.courier.fullName?.trim() || manifest.courier.id}</p>
                <p><span className="font-medium">{t("manifestDetail.fields.zone")}:</span> {manifest.deliveryZone.name?.trim() || manifest.deliveryZone.id}</p>
                <p><span className="font-medium">{t("manifestDetail.fields.shipmentCount")}:</span> {manifest.shipmentCount}</p>
                <p><span className="font-medium">{t("manifestDetail.fields.totalCod")}:</span> {formatMoney(manifest.totalCod)}</p>
                <p><span className="font-medium">{t("manifestDetail.fields.status")}:</span> {manifestStatusLabel(manifest.status, t)}</p>
                <p><span className="font-medium">{t("manifestDetail.fields.lockedAt")}:</span> {manifest.lockedAt ? formatDateTime(manifest.lockedAt, locale) : notApplicable}</p>
                <p><span className="font-medium">{t("manifestDetail.fields.dispatchedAt")}:</span> {manifest.dispatchedAt ? formatDateTime(manifest.dispatchedAt, locale) : notApplicable}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle>{t("manifestDetail.shipmentsTitle")}</CardTitle>
                  <CardDescription>{t("manifestDetail.shipmentsDescription")}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!canManageTransfer || manifest.status !== "DRAFT" || lockMutation.isPending}
                    onClick={() => lockMutation.mutate()}
                  >
                    {t("warehouse.manifests.lock")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={
                      !canManageTransfer ||
                      manifest.status !== "LOCKED" ||
                      hasMissingCsConfirmation ||
                      dispatchMutation.isPending
                    }
                    title={
                      hasMissingCsConfirmation
                        ? t("warehouse.manifests.csConfirmed", {
                            defaultValue:
                              "All manifest shipments must be CS confirmed before dispatch.",
                          })
                        : undefined
                    }
                    onClick={() => setDispatchConfirmOpen(true)}
                  >
                    {t("warehouse.manifests.dispatch")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={
                      !canManageTransfer ||
                      manifest.status !== "DISPATCHED" ||
                      closeMutation.isPending
                    }
                    onClick={() => closeMutation.mutate()}
                  >
                    {t("warehouse.manifests.close")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg border">
                  <Table className="min-w-[56rem]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("warehouse.table.trackingNumber")}</TableHead>
                        <TableHead>{t("manifestDetail.shipmentColumns.value")}</TableHead>
                        <TableHead>{t("manifestDetail.shipmentColumns.shippingFee")}</TableHead>
                        <TableHead>{t("manifestDetail.shipmentColumns.paymentMethod")}</TableHead>
                        <TableHead>{t("manifestDetail.shipmentColumns.status")}</TableHead>
                        <TableHead>{t("manifestDetail.shipmentColumns.csConfirmedAt")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {totalRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{row.trackingNumber ?? notApplicable}</TableCell>
                          <TableCell>{formatMoney(row.shipmentValue)}</TableCell>
                          <TableCell>{formatMoney(row.shippingFee)}</TableCell>
                          <TableCell>{row.paymentMethod}</TableCell>
                          <TableCell>{row.status}</TableCell>
                          <TableCell>
                            {row.csConfirmedAt ? formatDateTime(row.csConfirmedAt, locale) : notApplicable}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
            {dispatchConfirmOpen ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-card w-full max-w-md rounded-lg border p-4 shadow-lg">
                  <h3 className="text-base font-semibold">{t("warehouse.manifests.dispatchConfirm.title")}</h3>
                  <p className="text-muted-foreground mt-2 text-sm">
                    {t("warehouse.manifests.dispatchConfirm.body", {
                      manifestId: manifest.id,
                      courier: manifest.courier.fullName?.trim() || manifest.courier.id,
                      shipmentCount: String(manifest.shipmentCount),
                    })}
                  </p>
                  <div className="mt-4 flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDispatchConfirmOpen(false)}>
                      {t("common.cancel")}
                    </Button>
                    <Button
                      type="button"
                      disabled={dispatchMutation.isPending}
                      onClick={() => {
                        setDispatchConfirmOpen(false)
                        dispatchMutation.mutate()
                      }}
                    >
                      {t("warehouse.manifests.dispatchConfirm.confirm")}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </Layout>
  )
}

