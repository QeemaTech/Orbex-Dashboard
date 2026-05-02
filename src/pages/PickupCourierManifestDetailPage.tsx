import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link, Navigate, useParams } from "react-router-dom"

import {
  getWarehouseMovementManifestById,
  patchWarehouseMovementManifestStatus,
  type WarehouseMovementManifestStatus,
} from "@/api/shipments-api"
import { listPickupCouriers } from "@/api/pickup-couriers-api"
import { listWarehouseSites } from "@/api/warehouse-api"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ManifestsTabsHeader } from "@/features/manifests/ManifestsTabsHeader"
import { useAuth } from "@/lib/auth-context"
import { isWarehouseStaff } from "@/lib/warehouse-access"
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

export function PickupCourierManifestDetailPage() {
  const { t, i18n } = useTranslation()
  const { warehouseId = "", movementManifestId = "" } = useParams<{
    warehouseId: string
    movementManifestId: string
  }>()
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
    warehouseId &&
    user.warehouseId !== warehouseId

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
  const lines = useMemo(() => manifest?.lines ?? [], [manifest?.lines])
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
      await queryClient.invalidateQueries({ queryKey: ["warehouse-movement-manifests-list"] })
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

  const status = manifest?.status
  const canLock = status === "DRAFT"
  const canDispatch = status === "LOCKED"
  const canClose = status === "DISPATCHED"
  const notApplicable = t("warehouse.notApplicable", { defaultValue: "—" })

  const warehouseMismatch =
    !!warehouseId &&
    !!manifest &&
    manifest.fromWarehouseId !== warehouseId &&
    manifest.toWarehouseId !== warehouseId

  return (
    <Layout
      title={t("warehouse.pickupManifests.detailTitle", {
        defaultValue: "Pickup manifest",
      })}
    >
      <div className="space-y-6">
        <ManifestsTabsHeader warehouseId={warehouseId} active="pickup" />

        <p>
          <Link
            to={`/warehouses/${encodeURIComponent(warehouseId)}/manifests/pickup`}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
          >
            {t("common.back", { defaultValue: "Back" })}
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
                <CardDescription>{t("warehouse.pickupManifests.summaryDescription", { defaultValue: "Movement manifest for pickup couriers (transfer/return)." })}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <p>
                  <span className="font-medium">
                    {t("warehouse.pickupManifests.fields.type", { defaultValue: "Type" })}:
                  </span>{" "}
                  {manifest.type}
                </p>
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

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle>
                    {t("warehouse.pickupManifests.linesTitle", { defaultValue: "Lines" })}{" "}
                    <span className="text-muted-foreground text-sm font-normal">
                      ({lines.length})
                    </span>
                  </CardTitle>
                  <CardDescription>
                    {t("warehouse.pickupManifests.linesDescription", {
                      defaultValue:
                        "Shipments included in this pickup-courier movement manifest.",
                    })}
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
              <CardContent>
                <div className="overflow-x-auto rounded-lg border">
                  <Table className="min-w-[56rem]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          {t("warehouse.pickupManifests.lineColumns.tracking", {
                            defaultValue: "Tracking",
                          })}
                        </TableHead>
                        <TableHead>
                          {t("warehouse.pickupManifests.lineColumns.shipmentStatus", {
                            defaultValue: "Shipment status",
                          })}
                        </TableHead>
                        <TableHead>
                          {t("warehouse.pickupManifests.lineColumns.route", {
                            defaultValue: "Route",
                          })}
                        </TableHead>
                        <TableHead>
                          {t("warehouse.pickupManifests.lineColumns.taskType", {
                            defaultValue: "Task type",
                          })}
                        </TableHead>
                        <TableHead>
                          {t("warehouse.pickupManifests.lineColumns.taskStatus", {
                            defaultValue: "Task status",
                          })}
                        </TableHead>
                        <TableHead>
                          {t("warehouse.pickupManifests.lineColumns.actions", {
                            defaultValue: "Actions",
                          })}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((l) => (
                        <TableRow key={l.id} className="hover:bg-muted/50">
                          <TableCell className="font-mono text-xs">
                            <Link
                              to={`/warehouses/${encodeURIComponent(warehouseId)}/shipments/${encodeURIComponent(l.shipmentId)}?returnTo=${encodeURIComponent(
                                `/warehouses/${encodeURIComponent(warehouseId)}/manifests/pickup/${encodeURIComponent(movementManifestId)}`,
                              )}&returnLabel=${encodeURIComponent("Back to pickup manifest")}`}
                              className="hover:underline"
                            >
                              {l.trackingNumber ?? l.shipmentId}
                            </Link>
                          </TableCell>
                          <TableCell>{l.shipmentStatus}</TableCell>
                          <TableCell className="text-sm">
                            {whLabel(l.fromWarehouseId)}{" "}
                            <span className="text-muted-foreground">→</span>{" "}
                            {whLabel(l.toWarehouseId)}
                          </TableCell>
                          <TableCell>{l.taskType}</TableCell>
                          <TableCell>{l.taskStatus}</TableCell>
                          <TableCell>
                            <Button type="button" variant="outline" size="sm" asChild>
                              <Link
                                to={`/warehouses/${encodeURIComponent(warehouseId)}/shipments/${encodeURIComponent(l.shipmentId)}`}
                              >
                                {t("common.open", { defaultValue: "Open" })}
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!manifestQuery.isLoading && lines.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-muted-foreground py-8 text-center text-sm">
                            {t("warehouse.pickupManifests.linesEmpty", {
                              defaultValue: "No lines found.",
                            })}
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </div>
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

