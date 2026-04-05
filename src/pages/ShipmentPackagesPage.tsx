import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Boxes } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useLocation, useParams } from "react-router-dom"

import {
  getShipmentById,
  getShipmentPackages,
  listShipments,
} from "@/api/shipments-api"
import {
  assignWarehouseShipment,
  getWarehouseCouriers,
} from "@/api/warehouse-api"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  backendPackageDeliveryLabel,
  backendPackagePaymentLabel,
} from "@/features/warehouse/backend-labels"
import { useAuth } from "@/lib/auth-context"
import { showToast } from "@/lib/toast"

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function ShipmentPackagesPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const { shipmentId: shipmentParam = "" } = useParams()
  const { accessToken } = useAuth()
  const token = accessToken ?? ""
  const queryClient = useQueryClient()

  const [assignPackageId, setAssignPackageId] = useState("")
  const [assignCourierInput, setAssignCourierInput] = useState("")
  const [assignLeg, setAssignLeg] = useState<"delivery" | "pickup">("delivery")

  const shipmentName = (() => {
    try {
      return decodeURIComponent(shipmentParam).trim()
    } catch {
      return shipmentParam.trim()
    }
  })()

  const isWarehouseRoute = location.pathname.startsWith("/warehouse/")
  const isCsRoute = location.pathname.startsWith("/cs/")
  const isIdParam = uuidRegex.test(shipmentName)
  const shouldUseDirectId = isWarehouseRoute || isCsRoute || isIdParam

  const matchedShipmentQuery = useQuery({
    queryKey: ["shipment-packages-match", shipmentName, token],
    queryFn: async () => {
      const result = await listShipments({
        token,
        page: 1,
        pageSize: 1,
        customerName: shipmentName,
      })
      return result.shipments[0] ?? null
    },
    enabled: !!token && !!shipmentName && !shouldUseDirectId,
  })

  const matchedShipmentId = shouldUseDirectId
    ? shipmentName
    : matchedShipmentQuery.data?.id ?? ""

  const detailPath = (() => {
    if (!matchedShipmentId) return "/shipments"
    if (isWarehouseRoute) return `/warehouse/shipments/${matchedShipmentId}`
    if (isCsRoute) return `/cs/shipments/${matchedShipmentId}`
    return `/shipments/${matchedShipmentId}`
  })()

  const shipmentDetailQuery = useQuery({
    queryKey: ["shipment-detail-for-packages", matchedShipmentId, token],
    queryFn: () =>
      getShipmentById({ token, shipmentId: matchedShipmentId }),
    enabled: !!token && !!matchedShipmentId && isWarehouseRoute,
  })

  const regionKey = shipmentDetailQuery.data?.regionId ?? "none"

  const couriersQuery = useQuery({
    queryKey: ["warehouse-couriers-packages", token, regionKey],
    queryFn: () =>
      getWarehouseCouriers({
        token,
        regionId: regionKey === "none" ? undefined : regionKey,
      }),
    enabled: !!token && isWarehouseRoute,
  })

  const packagesQuery = useQuery({
    queryKey: ["shipment-packages", matchedShipmentId, token],
    queryFn: () =>
      getShipmentPackages({ token, shipmentId: matchedShipmentId }),
    enabled: !!token && !!matchedShipmentId,
  })

  const assignMutation = useMutation({
    mutationFn: (payload: {
      shipmentId: string
      packageId?: string
      courierId: string
      leg?: "pickup" | "delivery"
    }) =>
      assignWarehouseShipment({
        token,
        shipmentId: payload.shipmentId,
        courierId: payload.courierId,
        leg: payload.leg,
        ...(payload.packageId ? { packageId: payload.packageId } : {}),
      }),
    onSuccess: async () => {
      showToast(t("warehouse.feedback.assignmentSuccess"), "success")
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["shipment-packages", matchedShipmentId, token],
        }),
        queryClient.invalidateQueries({
          queryKey: ["warehouse-queue", token],
        }),
      ])
    },
    onError: (error) => {
      showToast((error as Error).message, "error")
    },
  })

  const currencyLocale = t("shipments.detail.currencyLocale", { defaultValue: "en-EG" })
  const formatMoney = (raw: string | null | undefined): string => {
    const n = Number.parseFloat(String(raw ?? "").replace(/,/g, "").trim())
    if (!Number.isFinite(n)) return "—"
    return new Intl.NumberFormat(currencyLocale, {
      style: "currency",
      currency: "EGP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n)
  }

  const warehouseColCount = 11

  return (
    <Layout title={t("shipments.packagesTitle", { defaultValue: "Shipment packages" })}>
      <div className="space-y-4">
        <Button type="button" variant="outline" size="sm" asChild>
          <Link to={detailPath}>
            <ArrowLeft className="mr-2 size-4" aria-hidden />
            {t("shipments.backToShipment", { defaultValue: "Back to shipment" })}
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="text-primary size-5" aria-hidden />
              {t("shipments.packagesTitle", { defaultValue: "Packages in batch" })}
            </CardTitle>
            <CardDescription>
              {isWarehouseRoute
                ? t("shipments.packagesWarehouseSubtitle", {
                    defaultValue:
                      "Each row is a package line from the batch, with delivery and payment states as stored in Orbex.",
                  })
                : t("shipments.packagesSubtitle", {
                    defaultValue: "Each row is one parcel with its own recipient.",
                  })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {matchedShipmentQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">
                {t("shipments.loading")}
              </p>
            ) : null}
            {!shouldUseDirectId && !matchedShipmentQuery.isLoading && !matchedShipmentId ? (
              <p className="text-destructive text-sm">
                {t("shipments.detail.notFound", { defaultValue: "Shipment not found." })}
              </p>
            ) : null}
            {packagesQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">
                {t("shipments.loading")}
              </p>
            ) : null}
            {packagesQuery.error ? (
              <p className="text-destructive text-sm">
                {(packagesQuery.error as Error).message}
              </p>
            ) : null}
            {packagesQuery.data ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {t("warehouse.table.trackingNumber", { defaultValue: "Tracking" })}
                      </TableHead>
                      <TableHead>{t("cs.table.customer", { defaultValue: "Customer" })}</TableHead>
                      <TableHead>{t("cs.table.phone", { defaultValue: "Phone" })}</TableHead>
                      {isWarehouseRoute ? (
                        <TableHead>{t("cs.table.address", { defaultValue: "Address" })}</TableHead>
                      ) : null}
                      {isWarehouseRoute ? (
                        <TableHead>{t("cs.table.product", { defaultValue: "Product" })}</TableHead>
                      ) : null}
                      <TableHead>
                        {t("shipments.packages.deliveryStatus", { defaultValue: "Delivery" })}
                      </TableHead>
                      <TableHead>
                        {t("shipments.packages.paymentStatus", { defaultValue: "Payment" })}
                      </TableHead>
                      <TableHead>{t("cs.table.value", { defaultValue: "Value" })}</TableHead>
                      {isWarehouseRoute ? (
                        <TableHead>{t("warehouse.table.courier", { defaultValue: "Courier" })}</TableHead>
                      ) : null}
                      {isWarehouseRoute ? (
                        <TableHead>{t("warehouse.packages.assignColumn", { defaultValue: "Assign" })}</TableHead>
                      ) : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {packagesQuery.data.packages.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={isWarehouseRoute ? warehouseColCount : 6}
                          className="text-muted-foreground text-center text-sm"
                        >
                          {t("shipments.packagesEmpty", { defaultValue: "No packages." })}
                        </TableCell>
                      </TableRow>
                    ) : (
                      packagesQuery.data.packages.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono text-xs">
                            {p.trackingNumber || "—"}
                          </TableCell>
                          <TableCell>{p.customer.customerName}</TableCell>
                          <TableCell>{p.customer.phonePrimary}</TableCell>
                          {isWarehouseRoute ? (
                            <TableCell className="max-w-[10rem] text-xs whitespace-normal">
                              {p.customer.addressText || "—"}
                            </TableCell>
                          ) : null}
                          {isWarehouseRoute ? (
                            <TableCell className="text-xs">{p.productType || "—"}</TableCell>
                          ) : null}
                          <TableCell className="text-xs">
                            {isWarehouseRoute
                              ? backendPackageDeliveryLabel(t, p.deliveryStatus)
                              : p.deliveryStatus}
                          </TableCell>
                          <TableCell className="text-xs">
                            {isWarehouseRoute
                              ? backendPackagePaymentLabel(t, p.paymentStatus)
                              : p.paymentStatus}
                          </TableCell>
                          <TableCell>{formatMoney(p.shipmentValue)}</TableCell>
                          {isWarehouseRoute ? (
                            <TableCell className="text-xs">
                              {p.deliveryCourier?.fullName ?? "—"}
                            </TableCell>
                          ) : null}
                          {isWarehouseRoute ? (
                            <TableCell>
                              <div className="flex min-w-[12rem] flex-col gap-1">
                                <select
                                  className="border-input bg-background h-8 rounded-md border px-2 text-xs"
                                  value=""
                                  onChange={(e) => {
                                    const v = e.target.value
                                    if (!v) return
                                    setAssignPackageId(p.id)
                                    setAssignCourierInput(v)
                                  }}
                                >
                                  <option value="">
                                    {t("warehouse.queue.pickCourier")}
                                  </option>
                                  {(couriersQuery.data?.couriers ?? []).map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {(c.servesShipmentRegion ? "★ " : "") +
                                        (c.fullName ?? c.id.slice(0, 8))}
                                    </option>
                                  ))}
                                </select>
                                <Input
                                  className="h-8 text-xs"
                                  placeholder={t("warehouse.queue.courierIdPlaceholder")}
                                  value={assignPackageId === p.id ? assignCourierInput : ""}
                                  onChange={(e) => {
                                    setAssignPackageId(p.id)
                                    setAssignCourierInput(e.target.value)
                                  }}
                                />
                                <select
                                  className="border-input bg-background h-8 rounded-md border px-2 text-xs"
                                  value={assignPackageId === p.id ? assignLeg : "delivery"}
                                  title={t("warehouse.queue.assignLegHint")}
                                  onChange={(e) => {
                                    setAssignPackageId(p.id)
                                    setAssignLeg(e.target.value as "delivery" | "pickup")
                                  }}
                                >
                                  <option value="delivery">
                                    {t("warehouse.queue.assignLegDelivery")}
                                  </option>
                                  <option value="pickup">
                                    {t("warehouse.queue.assignLegPickup")}
                                  </option>
                                </select>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-8 text-xs"
                                  disabled={
                                    assignMutation.isPending ||
                                    assignPackageId !== p.id ||
                                    !assignCourierInput.trim()
                                  }
                                  onClick={() =>
                                    assignMutation.mutate({
                                      shipmentId: matchedShipmentId,
                                      courierId: assignCourierInput.trim(),
                                      leg: assignLeg,
                                      ...(assignLeg === "delivery"
                                        ? { packageId: p.id }
                                        : {}),
                                    })
                                  }
                                >
                                  {t("warehouse.queue.assign")}
                                </Button>
                              </div>
                            </TableCell>
                          ) : null}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
