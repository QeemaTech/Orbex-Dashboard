import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import type { ShipmentOrderRow } from "@/api/shipments-api"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { backendOrderDeliveryLabel } from "@/features/warehouse/backend-labels"

type Props = {
  rows: ShipmentOrderRow[]
}

function formatMoney(raw: string, locale: string) {
  const n = Number.parseFloat(String(raw).replace(/,/g, "").trim())
  if (!Number.isFinite(n)) return "—"
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

export function AdminOrdersTable({ rows }: Props) {
  const { t, i18n } = useTranslation()
  const nav = useNavigate()
  const locale = i18n.language.startsWith("ar") ? "ar-EG" : "en-EG"

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>{t("adminOrders.colCustomer")}</TableHead>
          <TableHead>{t("adminOrders.colPhone")}</TableHead>
          <TableHead>{t("adminOrders.colTracking")}</TableHead>
          <TableHead>{t("adminOrders.colDelivery")}</TableHead>
          <TableHead className="text-end tabular-nums">{t("adminOrders.colValue")}</TableHead>
          <TableHead>{t("adminOrders.colShipment")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={row.id}
            className="hover:bg-muted/50 cursor-pointer"
            onClick={() =>
              void nav(`/shipments/${encodeURIComponent(row.shipmentId)}`)
            }
          >
            <TableCell className="font-medium">{row.customer.customerName}</TableCell>
            <TableCell className="text-muted-foreground">{row.customer.phonePrimary}</TableCell>
            <TableCell>{row.trackingNumber ?? "—"}</TableCell>
            <TableCell>{backendOrderDeliveryLabel(t, row.deliveryStatus)}</TableCell>
            <TableCell className="text-end tabular-nums">
              {formatMoney(row.shipmentValue, locale)}
            </TableCell>
            <TableCell className="text-muted-foreground font-mono text-xs">
              {row.shipmentId.slice(0, 8)}…
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
