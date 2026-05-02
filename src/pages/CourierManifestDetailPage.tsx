import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useParams } from "react-router-dom"

import {
  closeDeliveryManifest,
  dispatchDeliveryManifest,
  getDispatchPreview,
  getDeliveryManifest,
  getDeliveryManifestRoute,
  lockDeliveryManifest,
} from "@/api/delivery-manifests-api"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { openDeliveryManifestPdf } from "@/features/delivery-manifest/delivery-manifest-print"
import { ManifestRoutePanel } from "@/features/delivery-manifest/components/ManifestRoutePanel"
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

function manifestStatusLabel(
  status: "DRAFT" | "LOCKED" | "DISPATCHED" | "CLOSED" | (string & {}),
  t: (k: string) => string
): string {
  return t(`warehouse.manifests.status.${status}`)
}

export function CourierManifestDetailPage() {
  const { t, i18n } = useTranslation()
  const nav = useNavigate()
  const { accessToken, user } = useAuth()
  const queryClient = useQueryClient()
  const token = accessToken ?? ""
  const locale = i18n.language.startsWith("ar") ? "ar-EG" : "en-EG"
  const { manifestId = "", warehouseId } = useParams<{
    manifestId: string
    warehouseId?: string
  }>()

  const manifestQuery = useQuery({
    queryKey: ["delivery-manifest", "detail", token, manifestId],
    queryFn: () => getDeliveryManifest({ token, manifestId }),
    enabled: !!token && !!manifestId,
    refetchInterval: 15000,
  })

  const apiKey = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "")
  const routeQuery = useQuery({
    queryKey: ["delivery-manifest", "route", token, manifestId],
    queryFn: () => getDeliveryManifestRoute({ token, manifestId }),
    enabled: !!token && !!manifestId,
    refetchInterval: (q) => (q.state.data?.status === "PENDING" ? 5000 : 30000),
  })

  const canManageTransfer =
    user?.permissions?.includes("warehouses.manage_transfer") ?? false
  const [dispatchConfirmOpen, setDispatchConfirmOpen] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)

  const dispatchPreviewQuery = useQuery({
    queryKey: ["delivery-manifest", "dispatch-preview", token, manifestId],
    queryFn: () => getDispatchPreview({ token, manifestId }),
    enabled: !!token && !!manifestId && dispatchConfirmOpen,
    retry: false,
  })

  const lockMutation = useMutation({
    mutationFn: () => lockDeliveryManifest({ token, manifestId }),
    onSuccess: async () => {
      showToast(t("warehouse.manifests.lockSuccess"), "success")
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["delivery-manifest", "detail", token, manifestId],
        }),
        queryClient.invalidateQueries({ queryKey: ["delivery-manifest-eligible"] }),
      ])
    },
    onError: (error) => showToast((error as Error).message, "error"),
  })

  const dispatchMutation = useMutation({
    mutationFn: () => dispatchDeliveryManifest({ token, manifestId }),
    onSuccess: async () => {
      showToast(
        t("warehouse.manifests.dispatchSuccess", {
          defaultValue:
            "Delivery tasks created. Scan shipments out to move them OUT_FOR_DELIVERY.",
        }),
        "success",
      )
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["delivery-manifest", "detail", token, manifestId],
        }),
        queryClient.invalidateQueries({ queryKey: ["delivery-manifest-eligible"] }),
      ])
    },
    onError: (error) => showToast((error as Error).message, "error"),
  })

  const closeMutation = useMutation({
    mutationFn: () => closeDeliveryManifest({ token, manifestId }),
    onSuccess: async () => {
      showToast(t("warehouse.manifests.closeSuccess"), "success")
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["delivery-manifest", "detail", token, manifestId],
        }),
        queryClient.invalidateQueries({ queryKey: ["delivery-manifest-eligible"] }),
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
  const scannedOutCount = useMemo(
    () => (manifest?.shipments ?? []).filter((s) => s.status === "OUT_FOR_DELIVERY").length,
    [manifest],
  )

  return (
    <Layout
      title={
        t("manifestDetail.pageTitle")
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
              <CardHeader>
                <CardTitle>Suggested Route</CardTitle>
                <CardDescription>Auto-generated round-trip route from the warehouse.</CardDescription>
              </CardHeader>
              <CardContent>
                <ManifestRoutePanel
                  apiKey={apiKey}
                  route={routeQuery.data}
                  isLoading={routeQuery.isLoading}
                  error={routeQuery.error ? (routeQuery.error as Error).message : null}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle>{t("manifestDetail.shipmentsTitle")}</CardTitle>
                  <CardDescription>
                    {t("manifestDetail.shipmentsDescription")} • {scannedOutCount}/
                    {manifest.shipmentCount} scanned out
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled
                    title={t("warehouse.manifests.optimizeRouteComingSoon")}
                  >
                    {t("warehouse.manifests.optimizeRoute")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isPrinting || !manifest}
                    onClick={async () => {
                      if (!manifest) return
                      try {
                        setIsPrinting(true)
                        await openDeliveryManifestPdf(manifest)
                      } catch (err) {
                        showToast(err instanceof Error ? err.message : String(err), "error")
                      } finally {
                        setIsPrinting(false)
                      }
                    }}
                  >
                    {t("common.print", { defaultValue: "Print" })}
                  </Button>
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
                    {t("warehouse.manifests.dispatch", {
                      defaultValue: "Ready for scan-out",
                    })}
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
                        <TableRow
                          key={row.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            const wid = warehouseId ?? manifest.warehouse.id
                            nav(
                              `/warehouses/${encodeURIComponent(wid)}/shipments/${encodeURIComponent(
                                row.id,
                              )}?returnTo=${encodeURIComponent(
                                `/warehouses/${encodeURIComponent(wid)}/manifests/${encodeURIComponent(manifest.id)}`,
                              )}&returnLabel=${encodeURIComponent("Back to manifest")}`,
                            )
                          }}
                        >
                          <TableCell>
                            <Link
                              to={`/warehouses/${encodeURIComponent(warehouseId ?? manifest.warehouse.id)}/shipments/${encodeURIComponent(
                                row.id,
                              )}?returnTo=${encodeURIComponent(
                                `/warehouses/${encodeURIComponent(warehouseId ?? manifest.warehouse.id)}/manifests/${encodeURIComponent(manifest.id)}`,
                              )}&returnLabel=${encodeURIComponent("Back to manifest")}`}
                              className="font-mono text-xs hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {row.trackingNumber ?? row.id}
                            </Link>
                          </TableCell>
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
                  {dispatchPreviewQuery.isLoading ? (
                    <p className="text-muted-foreground mt-2 text-sm">{t("warehouse.loading")}</p>
                  ) : dispatchPreviewQuery.error ? (
                    <p className="text-destructive mt-2 text-sm">
                      {(dispatchPreviewQuery.error as Error).message}
                    </p>
                  ) : dispatchPreviewQuery.data ? (
                    <div className="mt-2 space-y-2 text-sm">
                      <p className="text-muted-foreground">
                        Courier:{" "}
                        {dispatchPreviewQuery.data.summary.courier.fullName?.trim() ||
                          dispatchPreviewQuery.data.summary.courier.id}
                        {" • "}Zone:{" "}
                        {dispatchPreviewQuery.data.summary.zone.name?.trim() ||
                          dispatchPreviewQuery.data.summary.zone.id}
                      </p>
                      <p className="text-muted-foreground">
                        Shipments: {dispatchPreviewQuery.data.summary.shipmentCount}
                        {" • "}COD: {dispatchPreviewQuery.data.summary.codTotalEgp.toFixed(2)} EGP
                      </p>

                      {dispatchPreviewQuery.data.warnings.length ? (
                        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2">
                          <p className="font-medium">Warnings</p>
                          <ul className="mt-1 list-disc pl-5">
                            {dispatchPreviewQuery.data.warnings.map((w) => (
                              <li key={w.code}>{w.message}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {dispatchPreviewQuery.data.errors.length ? (
                        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2">
                          <p className="font-medium">Errors</p>
                          <ul className="mt-1 list-disc pl-5">
                            {dispatchPreviewQuery.data.errors.map((e, idx) => (
                              <li key={`${e.code}-${e.shipmentId ?? "global"}-${idx}`}>
                                {e.message}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">
                  Ready for scan-out will create DELIVERY tasks. Shipment status changes to OUT_FOR_DELIVERY only after warehouse scan-out.
                        </p>
                      )}
                    </div>
                  ) : null}
                  <div className="mt-4 flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDispatchConfirmOpen(false)}>
                      {t("common.cancel")}
                    </Button>
                    <Button
                      type="button"
                      disabled={
                        dispatchMutation.isPending ||
                        dispatchPreviewQuery.isLoading ||
                        !!dispatchPreviewQuery.data?.errors.length
                      }
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

