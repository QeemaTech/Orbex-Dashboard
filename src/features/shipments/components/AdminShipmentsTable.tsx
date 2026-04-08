import type { MouseEvent } from "react"
import { MoreVertical, PhoneCall } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import type { ShipmentOrderRow } from "@/api/merchant-orders-api"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { openWhatsAppForOrder } from "@/features/customer-service/lib/whatsapp"
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

function stopRowClick(e: MouseEvent<HTMLDivElement>) {
  e.stopPropagation()
}

function WhatsAppLogoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="currentColor"
        d="M19.05 4.91A9.82 9.82 0 0 0 12.02 2C6.6 2 2.2 6.4 2.2 11.82c0 1.73.45 3.42 1.3 4.9L2 22l5.43-1.43a9.8 9.8 0 0 0 4.59 1.17h.01c5.42 0 9.82-4.4 9.82-9.82a9.76 9.76 0 0 0-2.8-7.01Zm-7.03 15.17h-.01a8.15 8.15 0 0 1-4.15-1.13l-.3-.18-3.22.85.86-3.14-.2-.32a8.13 8.13 0 0 1-1.25-4.34c0-4.5 3.67-8.17 8.19-8.17 2.19 0 4.24.85 5.79 2.39a8.1 8.1 0 0 1 2.4 5.77c0 4.5-3.68 8.17-8.1 8.17Zm4.47-6.12c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.18a7.16 7.16 0 0 1-1.33-1.65c-.14-.24-.02-.37.1-.49.1-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.4l-.46-.01c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.15 1.52.09.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z"
      />
    </svg>
  )
}

export function AdminShipmentsTable({ rows }: Props) {
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
          <TableHead className="text-end">{t("adminOrders.colActions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const hasPhone = !!row.customer.phonePrimary?.trim()
          const telCustomer = `tel:${row.customer.phonePrimary}`
          const courierPhone = row.deliveryCourier?.contactPhone?.trim()

          return (
            <TableRow
              key={row.id}
              className="hover:bg-muted/50 cursor-pointer"
              onClick={() => void nav(`/shipments/${encodeURIComponent(row.id)}`)}
            >
              <TableCell className="font-medium">{row.customer.customerName}</TableCell>
              <TableCell className="text-muted-foreground">{row.customer.phonePrimary}</TableCell>
              <TableCell>{row.trackingNumber ?? "—"}</TableCell>
              <TableCell>{backendOrderDeliveryLabel(t, row.status)}</TableCell>
              <TableCell className="text-end tabular-nums">
                {formatMoney(row.shipmentValue, locale)}
              </TableCell>
              <TableCell className="text-end align-middle">
                <div
                  className="flex flex-wrap items-center justify-end gap-2"
                  onClick={stopRowClick}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        aria-label={t("adminOrders.menuAriaLabel")}
                        aria-haspopup="menu"
                      >
                        <MoreVertical className="size-4 shrink-0" aria-hidden />
                        <span>{t("cs.actions.menu")}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[10rem]">
                      <DropdownMenuItem
                        onClick={() =>
                          void nav(
                            `/merchant-orders/${encodeURIComponent(row.merchantOrderId)}`,
                          )
                        }
                      >
                        {t("adminOrders.openTransfer")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          void nav(
                            `/shipments/${encodeURIComponent(row.merchantOrderId)}`,
                          )
                        }
                      >
                        {t("adminOrders.viewBatchOrders")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={!hasPhone}
                        title={!hasPhone ? t("cs.actions.whatsappDisabledHint") : undefined}
                        onClick={() => {
                          if (hasPhone) openWhatsAppForOrder(row)
                        }}
                      >
                        <WhatsAppLogoIcon className="size-4 shrink-0 text-[#25D366]" />
                        {t("cs.actions.whatsappMenu")}
                      </DropdownMenuItem>
                      {hasPhone ? (
                        <DropdownMenuItem asChild>
                          <a href={telCustomer}>{t("cs.actions.callCustomer")}</a>
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          disabled
                          title={t("cs.actions.whatsappDisabledHint")}
                        >
                          {t("cs.actions.callCustomer")}
                        </DropdownMenuItem>
                      )}
                      {courierPhone ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <a href={`tel:${courierPhone}`}>
                              <PhoneCall className="size-4" aria-hidden />
                              {t("cs.actions.callCourier")}
                            </a>
                          </DropdownMenuItem>
                        </>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

