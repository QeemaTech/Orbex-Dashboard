import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useLocation, useNavigate } from "react-router-dom"

import {
  getShipmentOrders,
} from "@/api/merchant-orders-api"
import { BackendStatusBadge } from "@/components/shared/BackendStatusBadge"
import { OrderDeliveryStatusWithWarehouse } from "@/components/shared/StatusWithWarehouseContext"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { isMerchantUser, useAuth } from "@/lib/auth-context"
import { warehouseShipmentLineDetailPath } from "@/lib/warehouse-merchant-order-routes"

const WAREHOUSE_COL_COUNT = 9
const COMPACT_COL_COUNT = 6

type Props = {
  token: string
  shipmentId: string
  /** When set (warehouse merchant-order page), line detail opens with hub in URL for plan task context. */
  warehouseId?: string
  /** Warehouse hub: full columns (address, product, courier). Other routes: read-only compact list. */
  mode?: "warehouse" | "compact"
  /** Fully prepaid batches should not show any customer-collectable amount. */
  isPrepaidFull?: boolean
}

/**
 * Customer shipments under a merchant order (batch). Row click opens line detail.
 * Warehouse mode: read-only courier name; manifest workflow uses the manifest pages.
 */
export function WarehouseShipmentOrdersTable({
  token,
  shipmentId,
  warehouseId: warehouseIdProp,
  mode = "warehouse",
  isPrepaidFull = false,
}: Props) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const merchantContext = isMerchantUser(user)
  const navigate = useNavigate()
  const location = useLocation()
  const ordersBase = location.pathname.startsWith("/cs/") ? "/cs/shipments" : "/shipments"

  const hubContextWarehouseId = warehouseIdProp?.trim() || user?.warehouseId || undefined

  const ordersQuery = useQuery({
    queryKey: ["orders", "list", shipmentId, token],
    queryFn: () => getShipmentOrders({ token, shipmentId }),
    enabled: !!token && !!shipmentId,
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

  if (!shipmentId) return null

  const goToOrder = (orderId: string) => {
    if (
      mode === "warehouse" &&
      warehouseIdProp?.trim() &&
      !location.pathname.startsWith("/cs/")
    ) {
      void navigate(
        warehouseShipmentLineDetailPath(warehouseIdProp.trim(), orderId),
      )
      return
    }
    void navigate(`${ordersBase}/${encodeURIComponent(orderId)}`)
  }

  return (
    <div className="space-y-3">
      {ordersQuery.isLoading ? (
        <p className="text-muted-foreground text-sm">{t("shipments.loading")}</p>
      ) : null}
      {ordersQuery.error ? (
        <p className="text-destructive text-sm">{(ordersQuery.error as Error).message}</p>
      ) : null}
      {ordersQuery.data ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  {t("warehouse.table.trackingNumber", { defaultValue: "Tracking" })}
                </TableHead>
                <TableHead>{t("cs.table.customer", { defaultValue: "Customer" })}</TableHead>
                <TableHead>{t("cs.table.phone", { defaultValue: "Phone" })}</TableHead>
                {mode === "warehouse" ? (
                  <>
                    <TableHead>{t("cs.table.address", { defaultValue: "Address" })}</TableHead>
                    <TableHead>{t("cs.table.product", { defaultValue: "Product" })}</TableHead>
                  </>
                ) : null}
                <TableHead>{t("shipments.columns.deliveryStatus")}</TableHead>
                <TableHead>{t("shipments.columns.paymentStatus")}</TableHead>
                <TableHead>{t("cs.table.value", { defaultValue: "Value" })}</TableHead>
                {mode === "warehouse" ? (
                  <TableHead>{t("warehouse.table.courier", { defaultValue: "Courier" })}</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordersQuery.data.shipments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={mode === "warehouse" ? WAREHOUSE_COL_COUNT : COMPACT_COL_COUNT}
                    className="text-muted-foreground text-center text-sm"
                  >
                    {t("shipments.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                ordersQuery.data.shipments.map((p) => (
                  <TableRow
                    key={p.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => goToOrder(p.id)}
                  >
                    <TableCell className="font-mono text-xs">
                      {p.trackingNumber || "—"}
                    </TableCell>
                    <TableCell>{p.customer.customerName}</TableCell>
                    <TableCell>{p.customer.phonePrimary}</TableCell>
                    {mode === "warehouse" ? (
                      <>
                        <TableCell className="max-w-[10rem] text-xs whitespace-normal">
                          {p.customer.addressText || "—"}
                        </TableCell>
                        <TableCell className="text-xs">{p.productType || "—"}</TableCell>
                      </>
                    ) : null}
                    <TableCell className="text-xs">
                      <OrderDeliveryStatusWithWarehouse
                        status={p.status}
                        locationWarehouseId={p.currentWarehouseId}
                        locationWarehouseName={
                          merchantContext ? undefined : p.currentWarehouse?.name
                        }
                        contextWarehouseId={hubContextWarehouseId}
                      />
                    </TableCell>
                    <TableCell className="text-xs">
                      <BackendStatusBadge kind="orderPayment" value={p.paymentStatus} />
                    </TableCell>
                    <TableCell>{formatMoney(isPrepaidFull ? "0" : p.shipmentValue)}</TableCell>
                    {mode === "warehouse" ? (
                      <TableCell className="text-xs">
                        {p.deliveryCourier?.fullName ?? "—"}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  )
}
