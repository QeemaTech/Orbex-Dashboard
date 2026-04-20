import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { BackendStatusBadge } from "@/components/shared/BackendStatusBadge"
import { cn } from "@/lib/utils"
import {
  merchantBatchWarehouseHintLabel,
  orderDeliveryWarehouseHintLabel,
} from "@/lib/warehouse-location-hint"

export type OrderDeliveryStatusWithWarehouseProps = {
  status: string | null | undefined
  locationWarehouseId?: string | null
  locationWarehouseName?: string | null
  /** URL hub or staff user hub — when it matches the line’s hub, shows “(this warehouse)”. */
  contextWarehouseId?: string | null
  className?: string
}

export function OrderDeliveryStatusWithWarehouse({
  status,
  locationWarehouseId,
  locationWarehouseName,
  contextWarehouseId,
  className,
}: OrderDeliveryStatusWithWarehouseProps) {
  const { t } = useTranslation()
  const hint = useMemo(
    () =>
      orderDeliveryWarehouseHintLabel(
        status,
        {
          locationWarehouseId,
          locationWarehouseName,
          contextWarehouseId,
        },
        t,
      ),
    [status, locationWarehouseId, locationWarehouseName, contextWarehouseId, t],
  )

  return (
    <span
      className={cn(
        "inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5",
        className,
      )}
    >
      <BackendStatusBadge kind="orderDelivery" value={status ?? ""} />
      {hint ? (
        <span className="text-muted-foreground max-w-[14rem] truncate text-xs font-normal">
          {hint}
        </span>
      ) : null}
    </span>
  )
}

export type MerchantBatchStatusWithWarehouseProps = {
  transferStatus: string | null | undefined
  assignedWarehouseId?: string | null
  assignedWarehouseName?: string | null
  contextWarehouseId?: string | null
  className?: string
}

export function MerchantBatchStatusWithWarehouse({
  transferStatus,
  assignedWarehouseId,
  assignedWarehouseName,
  contextWarehouseId,
  className,
}: MerchantBatchStatusWithWarehouseProps) {
  const { t } = useTranslation()
  const hint = useMemo(
    () =>
      merchantBatchWarehouseHintLabel(
        transferStatus,
        {
          assignedWarehouseId,
          assignedWarehouseName,
          contextWarehouseId,
        },
        t,
      ),
    [transferStatus, assignedWarehouseId, assignedWarehouseName, contextWarehouseId, t],
  )

  return (
    <span
      className={cn(
        "inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5",
        className,
      )}
    >
      <BackendStatusBadge kind="merchantOrderBatch" value={transferStatus ?? ""} />
      {hint ? (
        <span className="text-muted-foreground max-w-[14rem] truncate text-xs font-normal">
          {hint}
        </span>
      ) : null}
    </span>
  )
}
