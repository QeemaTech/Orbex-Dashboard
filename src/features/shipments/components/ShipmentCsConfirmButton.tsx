import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { TFunction } from "i18next"
import { useTranslation } from "react-i18next"

import {
  confirmShipmentCs,
  merchantOrderBatchId,
  type ShipmentOrderRow,
} from "@/api/merchant-orders-api"
import { ApiError } from "@/api/client"
import { Button } from "@/components/ui/button"
import { canConfirmCsForShipmentLine } from "@/features/customer-service/lib/cs-confirm-eligibility"
import { useAuth } from "@/lib/auth-context"
import { showToast } from "@/lib/toast"

const MERCHANT_ORDERS_UPDATE = "merchant_orders.update"

type Props = {
  line: ShipmentOrderRow
  accessToken: string | null
  /** Extra query keys to invalidate after success (e.g. list pages). */
  extraInvalidateQueryKeys?: unknown[][]
}

function confirmErrorMessage(err: unknown, t: TFunction): string {
  if (err instanceof ApiError && err.message) return err.message
  if (err instanceof Error) return err.message
  return t("shipments.detail.confirmCsError", { defaultValue: "Could not confirm." })
}

export function ShipmentCsConfirmButton({
  line,
  accessToken,
  extraInvalidateQueryKeys,
}: Props) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const qc = useQueryClient()

  const canPermission = Boolean(user?.permissions?.includes(MERCHANT_ORDERS_UPDATE))
  const eligible = canConfirmCsForShipmentLine(line)
  const batchId = merchantOrderBatchId(line)
  const token = accessToken?.trim() ?? ""

  const mut = useMutation({
    mutationFn: () =>
      confirmShipmentCs(token, batchId, line.id),
    onSuccess: () => {
      showToast(
        t("shipments.detail.confirmCsSuccess", { defaultValue: "Line confirmed for delivery planning." }),
        "success",
      )
      void qc.invalidateQueries({ queryKey: ["shipment", "detail", line.id, token] })
      void qc.invalidateQueries({ queryKey: ["shipment", "detail"] })
      for (const queryKey of extraInvalidateQueryKeys ?? []) {
        void qc.invalidateQueries({ queryKey })
      }
    },
    onError: (err: unknown) => {
      showToast(confirmErrorMessage(err, t), "error")
    },
  })

  if (!canPermission || !eligible || !token || !batchId) return null

  return (
    <Button
      type="button"
      size="sm"
      variant="default"
      className="bg-chart-2 text-white hover:bg-chart-2/90"
      disabled={mut.isPending}
      onClick={() => mut.mutate()}
    >
      {t("cs.actions.confirm")}
    </Button>
  )
}
