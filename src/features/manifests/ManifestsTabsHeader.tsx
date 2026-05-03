import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"

export function ManifestsTabsHeader(props: {
  /** Required when using warehouse-scoped tab links (default). Ignored when `onTabChange` is set. */
  warehouseId?: string
  active: "delivery" | "pickup"
  rightSlot?: React.ReactNode
  /** When set (e.g. `/courier-manifests`), tabs toggle in-page instead of navigating to a warehouse URL. */
  onTabChange?: (tab: "delivery" | "pickup") => void
  pickupDisabled?: boolean
  pickupDisabledTitle?: string
}) {
  const { t } = useTranslation()
  const {
    warehouseId = "",
    active,
    rightSlot,
    onTabChange,
    pickupDisabled,
    pickupDisabledTitle,
  } = props
  const deliveryHref = `/warehouses/${encodeURIComponent(warehouseId)}/manifests`
  const pickupHref = `/warehouses/${encodeURIComponent(warehouseId)}/manifests/pickup`

  const deliveryLabel = t("warehouse.manifests.tabs.deliveryCouriers", {
    defaultValue: "Delivery couriers",
  })
  const pickupLabel = t("warehouse.manifests.tabs.pickupCouriers", {
    defaultValue: "Pickup couriers",
  })

  if (onTabChange) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={active === "delivery" ? "default" : "outline"}
            onClick={() => onTabChange("delivery")}
          >
            {deliveryLabel}
          </Button>
          <Button
            type="button"
            variant={active === "pickup" ? "default" : "outline"}
            disabled={pickupDisabled}
            title={pickupDisabled ? pickupDisabledTitle : undefined}
            onClick={() => onTabChange("pickup")}
          >
            {pickupLabel}
          </Button>
        </div>
        {rightSlot ? <div className="flex items-center gap-2">{rightSlot}</div> : null}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant={active === "delivery" ? "default" : "outline"} asChild>
          <Link to={deliveryHref}>{deliveryLabel}</Link>
        </Button>
        <Button type="button" variant={active === "pickup" ? "default" : "outline"} asChild>
          <Link to={pickupHref}>{pickupLabel}</Link>
        </Button>
      </div>
      {rightSlot ? <div className="flex items-center gap-2">{rightSlot}</div> : null}
    </div>
  )
}

