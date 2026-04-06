import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Boxes } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useLocation, useParams } from "react-router-dom"

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
import { WarehouseShipmentOrdersTable } from "@/features/warehouse/components/WarehouseShipmentOrdersTable"
import { useAuth } from "@/lib/auth-context"

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isWarehouseTransfersPath(pathname: string): boolean {
  return /^\/warehouses\/[^/]+\/transfers\//.test(pathname)
}

/** Customer orders under a transfer: `/orders/:shipmentId`, `/warehouses/:warehouseId/transfers/:shipmentId/orders`, `/cs/orders/:shipmentId`. */
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
  const isIdParam = uuidRegex.test(shipmentName)
  const shouldUseDirectId = isWarehouseRoute || isCsRoute || isIdParam

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
