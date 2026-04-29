import type { MouseEvent } from "react"
import { useState } from "react"
import {
  LocateFixed,
  MapPin,
  MessageSquareText,
  MoreVertical,
  PhoneCall,
} from "react-lucid"
import { useTranslation } from "react-i18next"

import { merchantOrderBatchId, type CsShipmentRow } from "@/api/merchant-orders-api"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { canConfirmCsForShipmentLine } from "@/features/customer-service/lib/cs-confirm-eligibility"
import {
  csLineConfirmDialogDefaultsFromCsRow,
  hasCsConfirmedCustomerLocationPin,
  resolveCustomerLatLng,
} from "@/features/customer-service/lib/cs-line-customer-location"
import {
  openWhatsApp,
  openWhatsAppTrackingMessage,
} from "@/features/customer-service/lib/whatsapp"
import { CsConfirmedCustomerLocationMapButton } from "@/features/shipments/components/CsConfirmedCustomerLocationMapButton"
import { ShipmentCsConfirmLocationDialog } from "@/features/shipments/components/ShipmentCsConfirmLocationDialog"
import { useAuth } from "@/lib/auth-context"

export type CsShipmentRowActionsLayout = "compact" | "inline"

export interface CsShipmentRowActionsProps {
  row: CsShipmentRow
  token: string
  listQueryKey: unknown[]
  onOpenMap: (courierId: string) => void
  onOpenAddLocation: (row: CsShipmentRow) => void
  showWhatsApp?: boolean
  showAddLocation?: boolean
  /** When false, hides WhatsApp, add location, and call-customer (batch detail: recipient is per order). */
  showCustomerContact?: boolean
  /** Table rows use compact (confirm + menu); detail page uses inline buttons. */
  layout?: CsShipmentRowActionsLayout
}

const SHIPMENTS_UPDATE_PERMISSION = "shipments.update"

export function CsShipmentRowActions({
  row,
  token,
  listQueryKey,
  onOpenMap,
  onOpenAddLocation,
  showWhatsApp = true,
  showAddLocation = true,
  showCustomerContact = true,
  layout = "compact",
}: CsShipmentRowActionsProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [csLineConfirmOpen, setCsLineConfirmOpen] = useState(false)

  const telCustomer = `tel:${row.phonePrimary}`
  const hasPhone = !!row.phonePrimary?.trim()
  const hasLocationLink = !!row.locationLink?.trim()
  const allowCustomerUi = showCustomerContact
  const showConfirm = canConfirmCsForShipmentLine({
    status: row.status,
    transferStatus: row.transferStatus,
    csConfirmedAt: row.csConfirmedAt,
  })
  const canManageShipmentLocation = Boolean(
    user?.permissions?.includes(SHIPMENTS_UPDATE_PERMISSION),
  )
  const batchId = merchantOrderBatchId(row)
  const hasCourierMenuItems =
    !!row.courier?.contactPhone || !!row.courier?.id
  const hasTracking = !!row.trackingNumber?.trim()
  const sendTrackingDisabled = !hasPhone || !hasTracking || !token?.trim()
  const sendTrackingTitle = !hasPhone
    ? t("cs.actions.whatsappDisabledHint")
    : !hasTracking
      ? t("cs.actions.sendTrackingMessageNoTrackingHint")
      : undefined

  const showCustomerPinMap = hasCsConfirmedCustomerLocationPin(row)
  const customerPinCoords = resolveCustomerLatLng(row)

  const handleLocationAction = () => {
    if (hasLocationLink) {
      window.open(row.locationLink!.trim(), "_blank", "noopener,noreferrer")
      return
    }
    onOpenAddLocation(row)
  }

  const confirmButton =
    canManageShipmentLocation && showConfirm && batchId ? (
      <Button
        type="button"
        size="sm"
        variant="default"
        className="bg-chart-2 text-white hover:bg-chart-2/90"
        onClick={() => setCsLineConfirmOpen(true)}
      >
        {t("cs.actions.confirm")}
      </Button>
    ) : null

  const customerMapPin =
    canManageShipmentLocation && showCustomerPinMap && customerPinCoords ? (
      <CsConfirmedCustomerLocationMapButton
        latitude={customerPinCoords.lat}
        longitude={customerPinCoords.lng}
        stopPropagation
      />
    ) : null

  const stopRowClick = (e: MouseEvent<HTMLDivElement>) => e.stopPropagation()

  const confirmDialog = batchId ? (
    <ShipmentCsConfirmLocationDialog
      open={csLineConfirmOpen}
      onOpenChange={setCsLineConfirmOpen}
      token={token}
      extraInvalidateQueryKeys={[listQueryKey]}
      {...csLineConfirmDialogDefaultsFromCsRow(row)}
    />
  ) : null

  if (layout === "inline") {
    return (
      <>
        <div
          className="flex flex-wrap items-center justify-center gap-3"
          onClick={stopRowClick}
        >
          {confirmButton}
          {customerMapPin}
          {allowCustomerUi && showWhatsApp ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              title={t("cs.actions.whatsappTooltip")}
              disabled={!hasPhone}
              className="size-9 rounded-full bg-[#25D366] text-white shadow-sm hover:bg-[#22c55e]"
              onClick={() => openWhatsApp(row)}
            >
              <WhatsAppLogoIcon className="size-5 text-white" />
            </Button>
          ) : null}
          {allowCustomerUi ? (
            <Button
              type="button"
              size="icon"
              variant="outline"
              title={sendTrackingTitle}
              disabled={sendTrackingDisabled}
              className="size-9 shrink-0"
              aria-label={t("cs.actions.sendTrackingMessage")}
              onClick={() => {
                if (!sendTrackingDisabled) void openWhatsAppTrackingMessage(row, token)
              }}
            >
              <MessageSquareText className="size-4" aria-hidden />
            </Button>
          ) : null}
          {allowCustomerUi && showAddLocation ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
              onClick={handleLocationAction}
            >
              <LocateFixed className="me-1 size-4" aria-hidden />
              {t("cs.actions.addLocation")}
            </Button>
          ) : null}
          {allowCustomerUi ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
              asChild
            >
              <a href={telCustomer}>{t("cs.actions.callCustomer")}</a>
            </Button>
          ) : null}
          {row.courier?.contactPhone ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100 dark:border-fuchsia-700 dark:bg-fuchsia-950/30 dark:text-fuchsia-300"
              asChild
            >
              <a href={`tel:${row.courier.contactPhone}`}>
                <PhoneCall className="me-1 size-4" aria-hidden />
                {t("cs.actions.callCourier")}
              </a>
            </Button>
          ) : null}
          {row.courier?.id ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300"
              onClick={() => onOpenMap(row.courier!.id)}
            >
              <MapPin className="me-1 size-4" aria-hidden />
              {t("cs.actions.track")}
            </Button>
          ) : null}
        </div>
        {confirmDialog}
      </>
    )
  }

  return (
    <>
      <div
        className="flex flex-wrap items-center justify-end gap-2"
        onClick={stopRowClick}
      >
        {confirmButton}
        {customerMapPin}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              aria-label={t("cs.actions.menuAriaLabel")}
              aria-haspopup="menu"
            >
              <MoreVertical className="size-4 shrink-0" aria-hidden />
              <span>{t("cs.actions.menu")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[10rem]">
            {allowCustomerUi && showWhatsApp ? (
              <DropdownMenuItem
                disabled={!hasPhone}
                title={
                  !hasPhone ? t("cs.actions.whatsappDisabledHint") : undefined
                }
                onClick={() => {
                  if (hasPhone) openWhatsApp(row)
                }}
              >
                <WhatsAppLogoIcon className="size-4 shrink-0 text-[#25D366]" />
                {t("cs.actions.whatsappMenu")}
              </DropdownMenuItem>
            ) : null}
            {allowCustomerUi ? (
              <DropdownMenuItem
                disabled={sendTrackingDisabled}
                title={sendTrackingTitle}
                onClick={() => {
                  if (!sendTrackingDisabled) void openWhatsAppTrackingMessage(row, token)
                }}
              >
                <MessageSquareText className="size-4 shrink-0" aria-hidden />
                {t("cs.actions.sendTrackingMessage")}
              </DropdownMenuItem>
            ) : null}
            {allowCustomerUi && showAddLocation ? (
              <DropdownMenuItem onClick={handleLocationAction}>
                <LocateFixed className="size-4" aria-hidden />
                {t("cs.actions.addLocation")}
              </DropdownMenuItem>
            ) : null}
            {allowCustomerUi ? (
              <DropdownMenuItem asChild>
                <a href={telCustomer}>{t("cs.actions.callCustomer")}</a>
              </DropdownMenuItem>
            ) : null}
            {allowCustomerUi && hasCourierMenuItems ? (
              <DropdownMenuSeparator />
            ) : null}
            {row.courier?.contactPhone ? (
              <DropdownMenuItem asChild>
                <a href={`tel:${row.courier.contactPhone}`}>
                  <PhoneCall className="size-4" aria-hidden />
                  {t("cs.actions.callCourier")}
                </a>
              </DropdownMenuItem>
            ) : null}
            {row.courier?.id ? (
              <DropdownMenuItem
                onClick={() => onOpenMap(row.courier!.id)}
              >
                <MapPin className="size-4" aria-hidden />
                {t("cs.actions.track")}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {confirmDialog}
    </>
  )
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
