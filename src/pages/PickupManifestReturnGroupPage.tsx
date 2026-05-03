import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom"

import { getWarehouseMovementManifestById } from "@/api/shipments-api"
import type { MovementManifestUnifiedTask } from "@/api/shipments-api"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MovementManifestExecutionTaskBadge } from "@/features/manifests/movement-manifest-execution-task"
import { ManifestsTabsHeader } from "@/features/manifests/ManifestsTabsHeader"
import { useAuth } from "@/lib/auth-context"
import { isWarehouseStaff } from "@/lib/warehouse-access"

function movementManifestShipmentLineHref(
  warehouseId: string,
  shipmentId: string,
  returnTo: string,
): string {
  const wh = warehouseId.trim()
  const q = new URLSearchParams({
    returnTo,
    returnLabel: "Back to return preview",
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

export function PickupManifestReturnGroupPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const {
    warehouseId: warehouseIdParam = "",
    movementManifestId = "",
    returnGroupKey = "",
  } = useParams<{
    warehouseId?: string
    movementManifestId: string
    returnGroupKey: string
  }>()
  const isGlobalPickupDetail = location.pathname.startsWith("/courier-manifests/pickup/")
  const { accessToken, user } = useAuth()
  const token = accessToken ?? ""

  const returnGroupMerchantId = useMemo(() => {
    try {
      return decodeURIComponent(returnGroupKey)
    } catch {
      return returnGroupKey
    }
  }, [returnGroupKey])

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
  })

  const manifest = manifestQuery.data

  const warehouseMismatch =
    !!warehouseIdParam &&
    !!manifest &&
    manifest.fromWarehouseId !== warehouseIdParam &&
    manifest.toWarehouseId !== warehouseIdParam

  const effectiveWarehouseId = useMemo(() => {
    const fromManifest = manifest?.fromWarehouseId?.trim()
    const fromParam = warehouseIdParam.trim()
    const fromUser = user?.warehouseId?.trim()
    return fromManifest || fromParam || fromUser || ""
  }, [manifest?.fromWarehouseId, warehouseIdParam, user?.warehouseId])

  const returnGroupTask = useMemo((): Extract<
    MovementManifestUnifiedTask,
    { kind: "RETURN_TO_MERCHANT_GROUP" }
  > | null => {
    for (const task of manifest?.tasks ?? []) {
      if (task.kind === "RETURN_TO_MERCHANT_GROUP" && task.merchantId === returnGroupMerchantId) {
        return task
      }
    }
    return null
  }, [manifest?.tasks, returnGroupMerchantId])

  const manifestListPath = isGlobalPickupDetail
    ? `/courier-manifests/pickup/${encodeURIComponent(movementManifestId)}`
    : `/warehouses/${encodeURIComponent(warehouseIdParam)}/manifests/pickup/${encodeURIComponent(movementManifestId)}`

  if (accessDenied) return <Navigate to="/" replace />
  if (shouldForceOwnWarehouse) {
    return (
      <Navigate
        to={`/warehouses/${encodeURIComponent(user!.warehouseId!)}/manifests/pickup/${encodeURIComponent(movementManifestId)}/returns/${encodeURIComponent(returnGroupMerchantId)}`}
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
        to={`/warehouses/${encodeURIComponent(user.warehouseId)}/manifests/pickup/${encodeURIComponent(movementManifestId)}/returns/${encodeURIComponent(returnGroupMerchantId)}`}
        replace
      />
    )
  }

  const thisPageReturnPath = `${location.pathname}${location.search}`

  return (
    <Layout
      title={t("warehouse.pickupManifests.returnGroup.pageTitle", {
        defaultValue: "Return to merchant",
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
            to={manifestListPath}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
          >
            {t("warehouse.pickupManifests.returnGroup.backToManifest", {
              defaultValue: "Back to manifest",
            })}
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

        {manifest && !warehouseMismatch && !returnGroupTask ? (
          <p className="text-muted-foreground text-sm">
            {t("warehouse.pickupManifests.returnGroup.notFound", {
              defaultValue: "This return stop was not found on the manifest.",
            })}
          </p>
        ) : null}

        {returnGroupTask && !warehouseMismatch ? (
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <MovementManifestExecutionTaskBadge task={returnGroupTask} t={t} />
                  <CardTitle className="text-lg">
                    {returnGroupTask.merchant.displayName?.trim() || "—"}
                  </CardTitle>
                </div>
                <CardDescription>
                  {t("warehouse.pickupManifests.returnGroup.summaryLine", {
                    count: returnGroupTask.shipments.length,
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">
                    {t("warehouse.pickupManifests.executionColumns.from", { defaultValue: "From" })}:
                  </span>{" "}
                  {returnGroupTask.fromLabel}
                </p>
                <p>
                  <span className="font-medium">
                    {t("warehouse.pickupManifests.executionColumns.to", { defaultValue: "To" })}:
                  </span>{" "}
                  {returnGroupTask.toLabel}
                </p>
                <p>
                  <span className="font-medium">
                    {t("warehouse.pickupManifests.executionColumns.status", { defaultValue: "Status" })}:
                  </span>{" "}
                  {[...new Set(returnGroupTask.shipments.map((s) => s.taskStatus))].join(", ")}
                </p>
                {returnGroupTask.merchant.pickupAddressText ? (
                  <p className="text-muted-foreground">{returnGroupTask.merchant.pickupAddressText}</p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {t("warehouse.pickupManifests.returnGroup.shipmentsTitle", {
                    defaultValue: "Returned shipments",
                  })}
                </CardTitle>
                <CardDescription>
                  {t("warehouse.pickupManifests.returnGroup.shipmentsDescription", {
                    defaultValue: "Open a line for scan history and shipment details.",
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {t("warehouse.pickupManifests.returnGroup.colTracking", {
                          defaultValue: "Tracking",
                        })}
                      </TableHead>
                      <TableHead>
                        {t("warehouse.pickupManifests.returnGroup.colShipmentStatus", {
                          defaultValue: "Shipment status",
                        })}
                      </TableHead>
                      <TableHead>
                        {t("warehouse.pickupManifests.returnGroup.colTaskStatus", {
                          defaultValue: "Task status",
                        })}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("warehouse.pickupManifests.executionColumns.actions", {
                          defaultValue: "Actions",
                        })}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {returnGroupTask.shipments.map((s) => (
                      <TableRow key={s.lineId}>
                        <TableCell className="font-mono text-xs">
                          <Link
                            to={movementManifestShipmentLineHref(
                              effectiveWarehouseId,
                              s.shipmentId,
                              thisPageReturnPath,
                            )}
                            className="hover:underline"
                          >
                            {s.trackingNumber ?? s.shipmentId}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm">{s.shipmentStatus}</TableCell>
                        <TableCell className="text-sm">{s.taskStatus}</TableCell>
                        <TableCell className="text-right">
                          <Button type="button" variant="outline" size="sm" asChild>
                            <Link
                              to={movementManifestShipmentLineHrefPlain(
                                effectiveWarehouseId,
                                s.shipmentId,
                              )}
                            >
                              {t("common.open", { defaultValue: "Open" })}
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </Layout>
  )
}
