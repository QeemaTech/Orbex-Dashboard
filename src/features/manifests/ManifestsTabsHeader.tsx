import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"

export function ManifestsTabsHeader(props: {
  warehouseId: string
  active: "delivery" | "pickup"
  rightSlot?: React.ReactNode
}) {
  const { t } = useTranslation()
  const { warehouseId, active, rightSlot } = props
  const deliveryHref = `/warehouses/${encodeURIComponent(warehouseId)}/manifests`
  const pickupHref = `/warehouses/${encodeURIComponent(warehouseId)}/manifests/pickup`

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Button type="button" variant={active === "delivery" ? "default" : "outline"} asChild>
          <Link to={deliveryHref}>
            {t("warehouse.manifests.tabs.deliveryCouriers", {
              defaultValue: "Delivery couriers",
            })}
          </Link>
        </Button>
        <Button type="button" variant={active === "pickup" ? "default" : "outline"} asChild>
          <Link to={pickupHref}>
            {t("warehouse.manifests.tabs.pickupCouriers", {
              defaultValue: "Pickup couriers",
            })}
          </Link>
        </Button>
      </div>
      {rightSlot ? <div className="flex items-center gap-2">{rightSlot}</div> : null}
    </div>
  )
}

