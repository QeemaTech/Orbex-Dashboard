import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Boxes } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useLocation, useParams } from "react-router-dom"

import { getOrderById } from "@/api/orders-api"
import { ApiError } from "@/api/client"
import { listShipments } from "@/api/shipments-api"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { OrderDetailView } from "@/features/orders/components/OrderDetailView"
import { WarehouseShipmentOrdersTable } from "@/features/warehouse/components/WarehouseShipmentOrdersTable"
import { useAuth } from "@/lib/auth-context"

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isWarehouseTransfersPath(pathname: string): boolean {
  return /^\/warehouses\/[^/]+\/transfers\//.test(pathname)
}

/**
 * `/orders/:id` — UUID is loaded as an **order** first; if not found, treated as **shipment** (batch list).
 */
export function OrdersPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const { shipmentId: shipmentParam = "", warehouseId } = useParams<{
    shipmentId?: string
    warehouseId?: string
  }>()
  const { accessToken } = useAuth()
  const token = accessToken ?? ""

  const shipmentName = (() => {
    try {
      return decodeURIComponent(shipmentParam).trim()
    } catch {
      return shipmentParam.trim()
    }
  })()

  const isWarehouseRoute = isWarehouseTransfersPath(location.pathname)
  const isCsRoute = location.pathname.startsWith("/cs/")
  const isUuidParam = uuidRegex.test(shipmentName)
  const shouldUseDirectId = isWarehouseRoute || isCsRoute || isUuidParam

  const orderDetailQuery = useQuery({
    queryKey: ["order", "detail", shipmentName, token],
    queryFn: () => getOrderById({ token, id: shipmentName }),
    enabled: !!token && !!shipmentName && isUuidParam,
    retry: false,
  })

  const orderNotFound =
    orderDetailQuery.isError &&
    orderDetailQuery.error instanceof ApiError &&
    orderDetailQuery.error.status === 404

  const matchedShipmentQuery = useQuery({
    queryKey: ["orders", "match", shipmentName, token],
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
    : matchedShipmentQuery.data?.shipmentId ?? ""

  const detailPath = (() => {
    if (!matchedShipmentId) return "/orders"
    if (isWarehouseRoute && warehouseId) {
      return `/warehouses/${encodeURIComponent(warehouseId)}/transfers/${encodeURIComponent(matchedShipmentId)}`
    }
    if (isCsRoute) return `/cs/shipments/${matchedShipmentId}`
    return `/shipments/${matchedShipmentId}`
  })()

  if (isUuidParam && orderDetailQuery.isLoading) {
    return (
      <Layout title={t("orders.detail.pageTitle")}>
        <p className="text-muted-foreground text-sm">{t("orders.detail.loading")}</p>
      </Layout>
    )
  }

  if (isUuidParam && orderDetailQuery.isError && !orderNotFound) {
    return (
      <Layout title={t("orders.detail.pageTitle")}>
        <p className="text-destructive text-sm">{(orderDetailQuery.error as Error).message}</p>
      </Layout>
    )
  }

  if (isUuidParam && orderDetailQuery.isSuccess && orderDetailQuery.data) {
    const order = orderDetailQuery.data
    const sid = encodeURIComponent(order.shipmentId)
    let backHref = `/shipments/${sid}`
    let shipmentDetailHref = `/shipments/${sid}`
    let batchOrdersListHref = `/orders/${sid}`
    if (isWarehouseRoute && warehouseId) {
      const w = encodeURIComponent(warehouseId)
      backHref = `/warehouses/${w}/transfers/${sid}`
      shipmentDetailHref = `/warehouses/${w}/transfers/${sid}`
    } else if (isCsRoute) {
      backHref = `/cs/shipments/${sid}`
      shipmentDetailHref = `/cs/shipments/${sid}`
      batchOrdersListHref = `/cs/orders/${sid}`
    }
    return (
      <Layout title={t("orders.detail.pageTitle")}>
        <OrderDetailView
          order={order}
          backHref={backHref}
          backLabel={t("orders.backToTransfer")}
          shipmentDetailHref={shipmentDetailHref}
          batchOrdersListHref={batchOrdersListHref}
          variant={isWarehouseRoute ? "warehouse" : isCsRoute ? "cs" : "default"}
        />
      </Layout>
    )
  }

  return (
    <Layout title={t("orders.pageTitle")}>
      <div className="space-y-4">
        <Button type="button" variant="outline" size="sm" asChild>
          <Link to={detailPath}>
            <ArrowLeft className="mr-2 size-4" aria-hidden />
            {t("orders.backToTransfer")}
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="text-primary size-5" aria-hidden />
              {t("orders.pageHeading")}
            </CardTitle>
            <CardDescription>
              {isWarehouseRoute
                ? t("orders.warehouseSubtitle")
                : t("orders.subtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {matchedShipmentQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">{t("orders.loading")}</p>
            ) : null}
            {!shouldUseDirectId && !matchedShipmentQuery.isLoading && !matchedShipmentId ? (
              <p className="text-destructive text-sm">
                {t("shipments.detail.notFound", { defaultValue: "Shipment not found." })}
              </p>
            ) : null}
            {matchedShipmentId ? (
              <WarehouseShipmentOrdersTable
                token={token}
                shipmentId={matchedShipmentId}
                mode={isWarehouseRoute ? "warehouse" : "compact"}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
