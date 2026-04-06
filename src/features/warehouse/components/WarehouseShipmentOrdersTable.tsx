import { useQuery } from "@tanstack/react-query"

import { getShipmentOrders } from "@/api/shipments-api"
import { BackendStatusBadge } from "@/components/shared/BackendStatusBadge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useTranslation } from "react-i18next"

const WAREHOUSE_COL_COUNT = 9
const COMPACT_COL_COUNT = 6

type Props = {
  token: string
  shipmentId: string
  /** Warehouse hub: full columns including read-only courier. Other routes: read-only compact list. */
  mode?: "warehouse" | "compact"
}

/**
 * Customer orders under a merchant transfer (shipment). Each row has its own `trackingNumber`.
 * Warehouse mode: line-level details are scoped to the parent transfer via `shipmentId`.
 */
export function WarehouseShipmentOrdersTable({
  token,
  shipmentId,
  mode = "warehouse",
}: Props) {
  const { t } = useTranslation()

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

  return (
    <div className="space-y-3">
      {ordersQuery.isLoading ? (
        <p className="text-muted-foreground text-sm">{t("orders.loading")}</p>
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
                <TableHead>{t("orders.columns.deliveryStatus")}</TableHead>
                <TableHead>{t("orders.columns.paymentStatus")}</TableHead>
                <TableHead>{t("cs.table.value", { defaultValue: "Value" })}</TableHead>
                {mode === "warehouse" ? (
                  <TableHead>{t("warehouse.table.courier", { defaultValue: "Courier" })}</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordersQuery.data.orders.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={mode === "warehouse" ? WAREHOUSE_COL_COUNT : COMPACT_COL_COUNT}
                    className="text-muted-foreground text-center text-sm"
                  >
                    {t("orders.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                ordersQuery.data.orders.map((p) => (
                  <TableRow key={p.id}>
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
                      <BackendStatusBadge kind="orderDelivery" value={p.deliveryStatus} />
                    </TableCell>
                    <TableCell className="text-xs">
                      <BackendStatusBadge kind="orderPayment" value={p.paymentStatus} />
                    </TableCell>
                    <TableCell>{formatMoney(p.shipmentValue)}</TableCell>
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
