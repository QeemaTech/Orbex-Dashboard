import { useState } from "react"
import { useTranslation } from "react-i18next"

import { merchantOrderBatchId, type ShipmentOrderRow } from "@/api/merchant-orders-api"
import { Button } from "@/components/ui/button"
import { canConfirmCsForShipmentLine } from "@/features/customer-service/lib/cs-confirm-eligibility"
import {
  csLineConfirmDialogDefaultsFromShipmentOrder,
  hasCsConfirmedCustomerLocationPin,
  resolveCustomerLatLng,
} from "@/features/customer-service/lib/cs-line-customer-location"
import { useAuth } from "@/lib/auth-context"
import { CsConfirmedCustomerLocationMapButton } from "@/features/shipments/components/CsConfirmedCustomerLocationMapButton"
import { ShipmentCsConfirmLocationDialog } from "@/features/shipments/components/ShipmentCsConfirmLocationDialog"

const SHIPMENTS_UPDATE = "shipments.update"

type Props = {
  line: ShipmentOrderRow
  accessToken: string | null
  /** Extra query keys to invalidate after success (e.g. list pages). */
  extraInvalidateQueryKeys?: unknown[][]
}

export function ShipmentCsConfirmButton({
  line,
  accessToken,
  extraInvalidateQueryKeys,
}: Props) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const canConfirmAction = Boolean(user?.permissions?.includes(SHIPMENTS_UPDATE))
  const eligible = canConfirmCsForShipmentLine(line)
  const batchId = merchantOrderBatchId(line)
  const token = accessToken?.trim() ?? ""
  const coords = resolveCustomerLatLng(line)
  const showMapPin = hasCsConfirmedCustomerLocationPin(line)

  const canOpenConfirmDialog = canConfirmAction && Boolean(token) && Boolean(batchId)
  const showConfirmButton = canOpenConfirmDialog
  const confirmDisabled = !eligible

  return (
    <>
      {showConfirmButton ? (
        <Button
          type="button"
          size="sm"
          variant="default"
          className="bg-chart-2 text-white hover:bg-chart-2/90"
          disabled={confirmDisabled}
          title={
            confirmDisabled
              ? t("cs.csLineConfirm.alreadyConfirmedHint", {
                  defaultValue: "Location was already confirmed for this shipment.",
                })
              : undefined
          }
          onClick={() => setConfirmOpen(true)}
        >
          {t("cs.actions.confirm")}
        </Button>
      ) : null}
      {showMapPin && coords ? (
        <CsConfirmedCustomerLocationMapButton
          latitude={coords.lat}
          longitude={coords.lng}
        />
      ) : null}
      {canOpenConfirmDialog ? (
        <ShipmentCsConfirmLocationDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          token={token}
          extraInvalidateQueryKeys={extraInvalidateQueryKeys}
          {...csLineConfirmDialogDefaultsFromShipmentOrder(line)}
        />
      ) : null}
    </>
  )
}
