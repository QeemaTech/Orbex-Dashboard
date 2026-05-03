import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom"

import {
  getWarehouseMovementManifestById,
  getWarehouseMovementManifestRoutePreview,
  patchWarehouseMovementManifestStatus,
  type WarehouseMovementManifestStatus,
} from "@/api/shipments-api"
import { listPickupCouriers } from "@/api/pickup-couriers-api"
import { listWarehouseSites } from "@/api/warehouse-api"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ManifestRoutePanel } from "@/features/delivery-manifest/components/ManifestRoutePanel"
import { orderMovementManifestTasksByRoute } from "@/features/manifests/order-movement-manifest-tasks-by-route"
import { MovementManifestExecutionTaskBadge } from "@/features/manifests/movement-manifest-execution-task"
import { ManifestsTabsHeader } from "@/features/manifests/ManifestsTabsHeader"
import { useAuth } from "@/lib/auth-context"
import { isWarehouseStaff } from "@/lib/warehouse-access"
import { pickupManifestReturnGroupPath } from "@/lib/pickup-manifest-routes"
import { warehouseMerchantOrderDetailPath } from "@/lib/warehouse-merchant-order-routes"
import { showToast } from "@/lib/toast"

function formatDateTime(dateIso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateIso))
}

function manifestStatusLabel(
  status: "DRAFT" | "LOCKED" | "DISPATCHED" | "CLOSED" | (string & {}),
  t: (k: string) => string,
): string {
  return t(`warehouse.manifests.status.${status}`)
}

function movementManifestMerchantBatchHref(warehouseId: string, merchantOrderId: string): string {
  const wh = warehouseId.trim()
  if (wh) return warehouseMerchantOrderDetailPath(wh, merchantOrderId)
  return `/merchant-orders/${encodeURIComponent(merchantOrderId)}`
}

function movementManifestShipmentLineHref(
  warehouseId: string,
  shipmentId: string,
  pickupDetailReturnPath: string,
): string {
  const wh = warehouseId.trim()
  const q = new URLSearchParams({
    returnTo: pickupDetailReturnPath,
    returnLabel: "Back to pickup manifest",
  })
  const suffix = `?${q.toString()}`
  if (wh) {
    return `/warehouses/${encodeURIComponent(wh)}/shipments/${encodeURIComponent(shipmentId)}${suffix}`
  }
  return `/shipments/${encodeURIComponent(shipmentId)}${suffix}`
}

function movementManifestShipmentLineHrefPlain(warehouseId: string, shipmentId: string): string {
  const wh = warehouseId.trim()
  if (wh) {
    return `/warehouses/${encodeURIComponent(wh)}/shipments/${encodeURIComponent(shipmentId)}`
  }
  return `/shipments/${encodeURIComponent(shipmentId)}`
}

export function PickupCourierManifestDetailPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { warehouseId: warehouseIdParam = "", movementManifestId = "" } = useParams<{
    warehouseId?: string
    movementManifestId: string
  }>()
  const isGlobalPickupDetail = location.pathname.startsWith("/courier-manifests/pickup/")
  const { accessToken, user } = useAuth()
  const token = accessToken ?? ""
  const locale = i18n.language.startsWith("ar") ? "ar-EG" : "en-EG"
  const queryClient = useQueryClient()
  const [dispatchConfirmOpen, setDispatchConfirmOpen] = useState(false)

  const accessDenied = !!user && !(user.permissions ?? []).includes("warehouses.manage_transfer")
  const shouldForceOwnWarehouse =
    !!user &&
    isWarehouseStaff(user) &&
    !!user.warehouseId &&
    !!warehouseIdParam &&
    user.warehouseId !== warehouseIdParam

  const manifestQuery = useQuery({
    queryKey: ["warehouse-movement-manifest", "detail", token, movementManifestId],
    queryFn: () =>
      getWarehouseMovementManifestById({
        token,
        manifestId: movementManifestId,
      }),
    enabled: Boolean(token && movementManifestId && !accessDenied),
    refetchInterval: 15000,
  })

  const warehousesQuery = useQuery({
    queryKey: ["warehouse-sites", "for-transfer-task", token],
    queryFn: () => listWarehouseSites(token, { forTransferTask: true }),
    enabled: Boolean(token && !accessDenied),
    staleTime: 5 * 60_000,
  })

  const pickupCouriersQuery = useQuery({
    queryKey: ["pickup-couriers", "all", token],
    queryFn: () => listPickupCouriers({ token, page: 1, pageSize: 100 }),
    enabled: Boolean(token && !accessDenied),
    staleTime: 60_000,
  })

  const manifest = manifestQuery.data
  /** Hub id for warehouse-scoped links (manifest is authoritative; param/user fallbacks for edge cases). */
  const effectiveWarehouseId = useMemo(() => {
    const fromManifest = manifest?.fromWarehouseId?.trim()
    const fromParam = warehouseIdParam.trim()
    const fromUser = user?.warehouseId?.trim()
    return fromManifest || fromParam || fromUser || ""
  }, [manifest?.fromWarehouseId, warehouseIdParam, user?.warehouseId])
  const tasks = useMemo(() => manifest?.tasks ?? [], [manifest?.tasks])
  const pickupTasks = useMemo(() => manifest?.pickupTasks ?? [], [manifest?.pickupTasks])
  const hasPickupStops = pickupTasks.length > 0
  const returnShipmentTaskCount = manifest?.taskSummary.returnToMerchantTasks ?? 0
  const canRequestRoutePreview = hasPickupStops || returnShipmentTaskCount > 0

  const mapsApiKey = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "")
  const routePreviewQuery = useQuery({
    queryKey: ["warehouse-movement-manifest", "route-preview", token, movementManifestId],
    queryFn: () =>
      getWarehouseMovementManifestRoutePreview({ token, manifestId: movementManifestId }),
    enabled: Boolean(token && movementManifestId && canRequestRoutePreview && !accessDenied),
  })

  const displayTasks = useMemo(() => {
    const route = routePreviewQuery.data
    const stops = route?.orderedStops
    if (route?.status === "READY" && stops?.length) {
      return orderMovementManifestTasksByRoute(tasks, stops)
    }
    return tasks
  }, [routePreviewQuery.data, tasks])
  const warehouseNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const w of warehousesQuery.data?.warehouses ?? []) {
      const name = String(w.name ?? "").trim()
      if (w.id && name) map.set(w.id, name)
    }
    return map
  }, [warehousesQuery.data?.warehouses])

  const pickupCourierNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of pickupCouriersQuery.data?.pickupCouriers ?? []) {
      const name = String(c.fullName ?? "").trim()
      if (c.id && name) map.set(c.id, name)
    }
    return map
  }, [pickupCouriersQuery.data?.pickupCouriers])

  const whLabel = (id: string | null | undefined) =>
    id ? warehouseNameById.get(id) ?? id : "—"
  const courierLabel = (id: string | null | undefined) =>
    id ? pickupCourierNameById.get(id) ?? id : "—"

  const patchStatusMutation = useMutation({
    mutationFn: (status: Exclude<WarehouseMovementManifestStatus, "DRAFT">) =>
      patchWarehouseMovementManifestStatus({
        token,
        manifestId: movementManifestId,
        status,
      }),
    onSuccess: async () => {
      showToast(t("common.saved", { defaultValue: "Saved." }), "success")
      await queryClient.invalidateQueries({
        queryKey: ["warehouse-movement-manifest", "detail", token, movementManifestId],
      })
      await queryClient.invalidateQueries({
        queryKey: ["warehouse-movement-manifest", "route-preview", token, movementManifestId],
      })
      await queryClient.invalidateQueries({ queryKey: ["warehouse-movement-manifests-list"] })
      await queryClient.invalidateQueries({ queryKey: ["warehouse-movement-manifests-global"] })
    },
    onError: (err) => showToast(err instanceof Error ? err.message : String(err), "error"),
  })

  if (accessDenied) return <Navigate to="/" replace />
  if (shouldForceOwnWarehouse) {
    return (
      <Navigate
        to={`/warehouses/${encodeURIComponent(user!.warehouseId!)}/manifests/pickup/${encodeURIComponent(movementManifestId)}`}
        replace
      />
    )
  }

  if (
    isGlobalPickupDetail &&
    manifest &&
    user &&
    isWarehouseStaff(user) &&
    user.warehouseId &&
    manifest.fromWarehouseId === user.warehouseId
  ) {
    return (
      <Navigate
        to={`/warehouses/${encodeURIComponent(user.warehouseId)}/manifests/pickup/${encodeURIComponent(movementManifestId)}`}
        replace
      />
    )
  }

  const pickupDetailReturnPath = isGlobalPickupDetail
    ? `/courier-manifests/pickup/${encodeURIComponent(movementManifestId)}`
    : `/warehouses/${encodeURIComponent(warehouseIdParam)}/manifests/pickup/${encodeURIComponent(movementManifestId)}`

  const status = manifest?.status
  const canLock = status === "DRAFT"
  const canDispatch = status === "LOCKED"
  const canClose = status === "DISPATCHED"
  const notApplicable = t("warehouse.notApplicable", { defaultValue: "—" })

  const warehouseMismatch =
    !!warehouseIdParam &&
    !!manifest &&
    manifest.fromWarehouseId !== warehouseIdParam &&
    manifest.toWarehouseId !== warehouseIdParam

  return (
    <Layout
      title={t("warehouse.pickupManifests.detailTitle", {
        defaultValue: "Pickup manifest",
      })}
    >
      <div className="space-y-6">
        {isGlobalPickupDetail ? (
          <ManifestsTabsHeader
            active="pickup"
            onTabChange={(next) => {
              if (next === "delivery") navigate("/courier-manifests")
            }}
            rightSlot={
              <Button type="button" variant="outline" asChild>
                <Link to="/warehouses">
                  {t("warehouse.detail.backToWarehouses", { defaultValue: "Warehouses" })}
                </Link>
              </Button>
            }
          />
        ) : (
          <ManifestsTabsHeader warehouseId={warehouseIdParam} active="pickup" />
        )}

        <p>
          <Link
            to={
              isGlobalPickupDetail
                ? "/courier-manifests?tab=pickup"
                : `/warehouses/${encodeURIComponent(warehouseIdParam)}/manifests/pickup`
            }
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
          >
            {isGlobalPickupDetail
              ? t("manifestDetail.backToGlobal", { defaultValue: "Back to all manifests" })
              : t("common.back", { defaultValue: "Back" })}
          </Link>
        </p>

        {manifestQuery.isLoading ? (
          <p className="text-muted-foreground text-sm">{t("warehouse.loading")}</p>
        ) : null}
        {manifestQuery.error ? (
          <p className="text-destructive text-sm">{(manifestQuery.error as Error).message}</p>
        ) : null}
        {warehouseMismatch ? (
          <p className="text-destructive text-sm">
            {t("manifestDetail.warehouseMismatch", {
              defaultValue: "This manifest does not belong to the selected warehouse.",
            })}
          </p>
        ) : null}

        {manifest && !warehouseMismatch ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{t("warehouse.pickupManifests.summaryTitle", { defaultValue: "Summary" })}</CardTitle>
                <CardDescription>
                  {t("warehouse.pickupManifests.summaryDescription", {
                    defaultValue:
                      "Movement manifest for pickup couriers (merchant pickup, hub transfer, return to merchant).",
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <p>
                  <span className="font-medium">
                    {t("warehouse.pickupManifests.fields.status", { defaultValue: "Status" })}:
                  </span>{" "}
                  {manifestStatusLabel(manifest.status, t)}
                </p>
                <p>
                  <span className="font-medium">
                    {t("warehouse.pickupManifests.fields.createdAt", { defaultValue: "Created" })}:
                  </span>{" "}
                  {formatDateTime(manifest.createdAt, locale)}
                </p>
                <p>
                  <span className="font-medium">
                    {t("warehouse.pickupManifests.fields.fromWarehouse", { defaultValue: "From warehouse" })}:
                  </span>{" "}
                  <span className="text-sm">
                    {manifest.fromWarehouse?.name?.trim() || whLabel(manifest.fromWarehouseId)}
                    {manifest.fromWarehouse?.governorate?.trim()
                      ? ` — ${manifest.fromWarehouse.governorate}`
                      : ""}
                  </span>
                </p>
                <p>
                  <span className="font-medium">
                    {t("warehouse.pickupManifests.fields.toWarehouse", { defaultValue: "To warehouse" })}:
                  </span>{" "}
                  <span className="text-sm">
                    {manifest.toWarehouse?.name?.trim() || whLabel(manifest.toWarehouseId)}
                    {manifest.toWarehouse?.governorate?.trim()
                      ? ` — ${manifest.toWarehouse.governorate}`
                      : ""}
                  </span>
                </p>
                <p>
                  <span className="font-medium">
                    {t("warehouse.pickupManifests.fields.pickupCourier", { defaultValue: "Pickup courier" })}:
                  </span>{" "}
                  <span className="text-sm">
                    {manifest.pickupCourier?.fullName?.trim() ||
                      courierLabel(manifest.assignedPickupCourierId)}
                    {manifest.pickupCourier?.contactPhone?.trim()
                      ? ` — ${manifest.pickupCourier.contactPhone}`
                      : ""}
                  </span>
                </p>
                <p>
                  <span className="font-medium">
                    {t("warehouse.pickupManifests.fields.taskCount", { defaultValue: "Tasks" })}:
                  </span>{" "}
                  <span className="text-sm tabular-nums">{tasks.length}</span>
                </p>
                <p className="md:col-span-2 lg:col-span-3 text-muted-foreground text-sm">
                  {t("warehouse.pickupManifests.taskMixLine", {
                    defaultValue:
                      "Mix: {{pickups}} merchant pickup(s), {{transfers}} hub transfer(s), {{returns}} return-to-merchant.",
                    pickups: manifest.taskSummary.merchantPickupTasks,
                    transfers: manifest.taskSummary.transferTasks,
                    returns: manifest.taskSummary.returnToMerchantTasks,
                  })}
                </p>
                <p>
                  <span className="font-medium">
                    {t("warehouse.pickupManifests.fields.lockedAt", { defaultValue: "Locked" })}:
                  </span>{" "}
                  {manifest.lockedAt ? formatDateTime(manifest.lockedAt, locale) : notApplicable}
                </p>
                <p>
                  <span className="font-medium">
                    {t("warehouse.pickupManifests.fields.dispatchedAt", { defaultValue: "Dispatched" })}:
                  </span>{" "}
                  {manifest.dispatchedAt ? formatDateTime(manifest.dispatchedAt, locale) : notApplicable}
                </p>
                <p>
                  <span className="font-medium">
                    {t("warehouse.pickupManifests.fields.closedAt", { defaultValue: "Closed" })}:
                  </span>{" "}
                  {manifest.closedAt ? formatDateTime(manifest.closedAt, locale) : notApplicable}
                </p>
              </CardContent>
            </Card>

                {canRequestRoutePreview ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {t("warehouse.pickupManifests.routePreviewTitle")}
                      </CardTitle>
                      <CardDescription>
                        {t("warehouse.pickupManifests.routePreviewDescription")}
                      </CardDescription>
                    </CardHeader>
                <CardContent>
                  <ManifestRoutePanel
                    apiKey={mapsApiKey}
                    route={routePreviewQuery.data}
                    isLoading={routePreviewQuery.isLoading}
                    error={
                      routePreviewQuery.error instanceof Error
                        ? routePreviewQuery.error.message
                        : routePreviewQuery.error
                          ? String(routePreviewQuery.error)
                          : null
                    }
                  />
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle>
                    {t("warehouse.pickupManifests.tasksTitle")}{" "}
                    <span className="text-muted-foreground text-sm font-normal">({tasks.length})</span>
                  </CardTitle>
                  <CardDescription>
                    {t("warehouse.pickupManifests.tasksDescription")}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!canLock || patchStatusMutation.isPending}
                    onClick={() => patchStatusMutation.mutate("LOCKED")}
                  >
                    {t("warehouse.manifests.lock", { defaultValue: "Lock" })}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!canDispatch || patchStatusMutation.isPending}
                    onClick={() => setDispatchConfirmOpen(true)}
                  >
                    {t("warehouse.manifests.dispatch", { defaultValue: "Dispatch" })}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={!canClose || patchStatusMutation.isPending}
                    onClick={() => patchStatusMutation.mutate("CLOSED")}
                  >
                    {t("warehouse.manifests.close", { defaultValue: "Close" })}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                {tasks.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border">
                    <Table className="min-w-[64rem]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            {t("warehouse.pickupManifests.executionColumns.taskType")}
                          </TableHead>
                          <TableHead>{t("warehouse.pickupManifests.executionColumns.from")}</TableHead>
                          <TableHead>{t("warehouse.pickupManifests.executionColumns.to")}</TableHead>
                          <TableHead>{t("warehouse.pickupManifests.executionColumns.status")}</TableHead>
                          <TableHead>{t("warehouse.pickupManifests.executionColumns.reference")}</TableHead>
                          <TableHead className="text-right">
                            {t("warehouse.pickupManifests.executionColumns.actions")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayTasks.map((task) => (
                          <TableRow
                            key={
                              task.kind === "PICKUP_TASK"
                                ? `p-${task.id}`
                                : task.kind === "RETURN_TO_MERCHANT_GROUP"
                                  ? `g-${task.merchantId}`
                                  : `s-${task.lineId}`
                            }
                            className="hover:bg-muted/50"
                          >
                            <TableCell>
                              <MovementManifestExecutionTaskBadge task={task} t={t} />
                            </TableCell>
                            <TableCell className="max-w-[14rem] text-sm">{task.fromLabel}</TableCell>
                            <TableCell className="max-w-[14rem] text-sm">{task.toLabel}</TableCell>
                            <TableCell className="text-sm">
                              {task.kind === "PICKUP_TASK"
                                ? task.status
                                : task.kind === "RETURN_TO_MERCHANT_GROUP"
                                  ? [...new Set(task.shipments.map((s) => s.taskStatus))].join(", ")
                                  : task.taskStatus}
                            </TableCell>
                            <TableCell className="max-w-md text-sm">
                              {task.kind === "PICKUP_TASK" ? (
                                <div className="space-y-1.5">
                                  <Button type="button" variant="outline" size="sm" className="w-fit" asChild>
                                    <Link
                                      to={movementManifestMerchantBatchHref(
                                        effectiveWarehouseId,
                                        task.merchantOrderId,
                                      )}
                                    >
                                      {t("warehouse.pickupManifests.viewMerchantBatch", {
                                        defaultValue: "Merchant batch details",
                                      })}
                                    </Link>
                                  </Button>
                                  {task.merchantOrder?.shipmentCount != null ? (
                                    <p className="text-muted-foreground text-xs">
                                      {t("warehouse.pickupManifests.batchHint", {
                                        count: task.merchantOrder.shipmentCount,
                                      })}
                                    </p>
                                  ) : null}
                                  <p className="text-muted-foreground line-clamp-2 text-xs">
                                    {task.pickupAddress}
                                  </p>
                                </div>
                              ) : task.kind === "RETURN_TO_MERCHANT_GROUP" ? (
                                <div className="space-y-1.5">
                                  <p className="text-muted-foreground text-xs">
                                    {t("warehouse.pickupManifests.batchHint", {
                                      count: task.shipments.length,
                                    })}
                                  </p>
                                  {task.merchant.pickupAddressText ? (
                                    <p className="text-muted-foreground line-clamp-2 text-xs">
                                      {task.merchant.pickupAddressText}
                                    </p>
                                  ) : null}
                                  <Button type="button" variant="outline" size="sm" className="w-fit" asChild>
                                    <Link
                                      to={pickupManifestReturnGroupPath({
                                        movementManifestId,
                                        returnGroupMerchantId: task.merchantId,
                                        warehouseId: warehouseIdParam,
                                        isGlobalPickupContext: isGlobalPickupDetail,
                                      })}
                                    >
                                      {t("warehouse.pickupManifests.returnGroup.previewLink", {
                                        defaultValue: "Preview returned shipments",
                                      })}
                                    </Link>
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <Link
                                    to={movementManifestShipmentLineHref(
                                      effectiveWarehouseId,
                                      task.shipmentId,
                                      pickupDetailReturnPath,
                                    )}
                                    className="font-mono text-xs hover:underline"
                                  >
                                    {task.trackingNumber ?? task.shipmentId}
                                  </Link>
                                  <p className="text-muted-foreground text-xs">{task.shipmentStatus}</p>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {task.kind === "PICKUP_TASK" ? (
                                <span className="text-muted-foreground text-xs">—</span>
                              ) : task.kind === "RETURN_TO_MERCHANT_GROUP" ? (
                                <Button type="button" variant="outline" size="sm" asChild>
                                  <Link
                                    to={pickupManifestReturnGroupPath({
                                      movementManifestId,
                                      returnGroupMerchantId: task.merchantId,
                                      warehouseId: warehouseIdParam,
                                      isGlobalPickupContext: isGlobalPickupDetail,
                                    })}
                                  >
                                    {t("common.open", { defaultValue: "Open" })}
                                  </Link>
                                </Button>
                              ) : (
                                <Button type="button" variant="outline" size="sm" asChild>
                                  <Link
                                    to={movementManifestShipmentLineHrefPlain(
                                      effectiveWarehouseId,
                                      task.shipmentId,
                                    )}
                                  >
                                    {t("common.open", { defaultValue: "Open" })}
                                  </Link>
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : null}

                {!manifestQuery.isLoading && tasks.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    {t("warehouse.pickupManifests.manifestTasksEmpty", {
                      defaultValue: "No tasks on this manifest.",
                    })}
                  </p>
                ) : null}
              </CardContent>
            </Card>

            {dispatchConfirmOpen ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-card w-full max-w-md rounded-lg border p-4 shadow-lg">
                  <h3 className="text-base font-semibold">
                    {t("warehouse.manifests.dispatchConfirm.title", {
                      defaultValue: "Confirm dispatch",
                    })}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-sm">
                    {t("warehouse.pickupManifests.dispatchConfirm.body", {
                      defaultValue:
                        "Dispatch this manifest to pickup courier and mark tasks IN_PROGRESS?",
                    })}
                  </p>
                  <div className="mt-4 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDispatchConfirmOpen(false)}
                    >
                      {t("common.cancel", { defaultValue: "Cancel" })}
                    </Button>
                    <Button
                      type="button"
                      disabled={patchStatusMutation.isPending}
                      onClick={() => {
                        setDispatchConfirmOpen(false)
                        patchStatusMutation.mutate("DISPATCHED")
                      }}
                    >
                      {t("warehouse.manifests.dispatchConfirm.confirm", {
                        defaultValue: "Confirm dispatch",
                      })}
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

