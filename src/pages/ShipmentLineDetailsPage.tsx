import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Boxes } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom"

import { getShipmentById } from "@/api/shipments-api"
import { ApiError } from "@/api/client"
import { listShipments } from "@/api/merchant-orders-api"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ShipmentDetailView } from "@/features/shipments/components/ShipmentDetailView"
import { WarehouseShipmentOrdersTable } from "@/features/warehouse/components/WarehouseShipmentOrdersTable"
import { useAuth } from "@/lib/auth-context"
import {
  isWarehouseScopedMerchantOrderPath,
  warehouseMerchantOrderDetailPath,
} from "@/lib/warehouse-merchant-order-routes"

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * `/shipments/:id` — if `id` is a UUID, load as a **delivery line** first (`GET /api/shipments/:id`).
 * If no line exists (404), treat `id` as a **merchant-order batch** id and show the batch lines table.
 * Non-UUID params resolve by customer name when not on warehouse/CS direct routes.
 */
export function ShipmentLineDetailsPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { shipmentId: shipmentParam = "", warehouseId } = useParams<{
    shipmentId?: string
    warehouseId?: string
  }>()
  const warehouseIdFromQuery = searchParams.get("warehouseId")?.trim() || undefined
  const planTaskWarehouseId = warehouseId ?? warehouseIdFromQuery
  const { accessToken } = useAuth()
  const token = accessToken ?? ""

  const shipmentName = (() => {
    try {
      return decodeURIComponent(shipmentParam).trim()
    } catch {
      return shipmentParam.trim()
    }
  })()

  const isWarehouseRoute = isWarehouseScopedMerchantOrderPath(location.pathname)
  const isCsRoute = location.pathname.startsWith("/cs/")
  const isUuidParam = uuidRegex.test(shipmentName)
  const shouldUseDirectId = isWarehouseRoute || isCsRoute || isUuidParam

  const shipmentDetailQuery = useQuery({
    queryKey: ["shipment", "detail", shipmentName, token],
    queryFn: () => getShipmentById({ token, shipmentId: shipmentName }),
    enabled: !!token && !!shipmentName && (isUuidParam || shipmentName.startsWith("ORX-")),
    retry: false,
  })

  const shipmentNotFound =
    shipmentDetailQuery.isError &&
    shipmentDetailQuery.error instanceof ApiError &&
    shipmentDetailQuery.error.status === 404

  const matchedMerchantOrderQuery = useQuery({
    queryKey: ["merchant-orders", "match", shipmentName, token],
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

  const matchedMerchantOrderId = shouldUseDirectId
    ? shipmentName
    : matchedMerchantOrderQuery.data?.shipmentId ?? ""

  const merchantOrderDetailPath = (() => {
    if (!matchedMerchantOrderId) return "/shipments"
    if (isWarehouseRoute && warehouseId) {
      return warehouseMerchantOrderDetailPath(warehouseId, matchedMerchantOrderId)
    }
    if (isCsRoute) return `/cs/merchant-orders/${matchedMerchantOrderId}`
    return `/merchant-orders/${matchedMerchantOrderId}`
  })()

  if (isUuidParam && shipmentDetailQuery.isLoading) {
    return (
      <Layout title={t("shipments.detail.pageTitle")}>
        <p className="text-muted-foreground text-sm">{t("shipments.detail.loading")}</p>
      </Layout>
    )
  }

  if (isUuidParam && shipmentDetailQuery.isError && !shipmentNotFound) {
    return (
      <Layout title={t("shipments.detail.pageTitle")}>
        <p className="text-destructive text-sm">{(shipmentDetailQuery.error as Error).message}</p>
      </Layout>
    )
  }

  if (isUuidParam && shipmentDetailQuery.isSuccess && shipmentDetailQuery.data) {
    const shipment = shipmentDetailQuery.data
    const merchantOrderId = encodeURIComponent(shipment.merchantOrderId)
    const returnTo = searchParams.get("returnTo")?.trim() || ""
    const returnLabel = searchParams.get("returnLabel")?.trim() || ""
    let backHref = `/merchant-orders/${merchantOrderId}`
    let merchantOrderDetailHref = `/merchant-orders/${merchantOrderId}`
    let merchantOrderShipmentsHref = `/shipments/${merchantOrderId}`
    if (isWarehouseRoute && warehouseId) {
      const path = warehouseMerchantOrderDetailPath(warehouseId, shipment.merchantOrderId)
      backHref = path
      merchantOrderDetailHref = path
    } else if (isCsRoute) {
      backHref = `/cs/merchant-orders/${merchantOrderId}`
      merchantOrderDetailHref = `/cs/merchant-orders/${merchantOrderId}`
      merchantOrderShipmentsHref = `/cs/shipments/${merchantOrderId}`
    }

    if (returnTo) {
      backHref = returnTo
    }
    return (
      <Layout title={t("shipments.detail.pageTitle")}>
        <ShipmentDetailView
          shipment={shipment}
          backHref={backHref}
          backLabel={returnLabel || t("shipments.backToMerchantOrder")}
          merchantOrderDetailHref={merchantOrderDetailHref}
          merchantOrderShipmentsHref={merchantOrderShipmentsHref}
          variant={isWarehouseRoute ? "warehouse" : isCsRoute ? "cs" : "default"}
          planTaskContextWarehouseId={planTaskWarehouseId}
        />
      </Layout>
    )
  }

  return (
    <Layout title={t("shipments.pageTitle")}>
      <div className="space-y-4">
        <Button type="button" variant="outline" size="sm" asChild>
          <Link to={merchantOrderDetailPath}>
            <ArrowLeft className="mr-2 size-4" aria-hidden />
            {t("shipments.backToMerchantOrder")}
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="text-primary size-5" aria-hidden />
              {t("shipments.pageHeading")}
            </CardTitle>
            <CardDescription>
              {isWarehouseRoute
                ? t("shipments.warehouseSubtitle")
                : t("shipments.subtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {matchedMerchantOrderQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">{t("shipments.loading")}</p>
            ) : null}
            {!shouldUseDirectId && !matchedMerchantOrderQuery.isLoading && !matchedMerchantOrderId ? (
              <p className="text-destructive text-sm">
                {t("merchantOrders.detail.notFound", { defaultValue: "Merchant order not found." })}
              </p>
            ) : null}
            {matchedMerchantOrderId ? (
              <WarehouseShipmentOrdersTable
                token={token}
                shipmentId={matchedMerchantOrderId}
                warehouseId={isWarehouseRoute ? warehouseId : undefined}
                mode={isWarehouseRoute ? "warehouse" : "compact"}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
