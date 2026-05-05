import { useTranslation } from "react-i18next"
import { Navigate, useParams } from "react-router-dom"

import { WarehouseHubPackagingStockSection } from "@/features/warehouse/components/WarehouseHubPackagingStockSection"
import { Layout } from "@/components/layout/Layout"
import { getDefaultDashboardRoute, useAuth } from "@/lib/auth-context"
import {
  hasPlatformWarehouseScope,
  isWarehouseAdmin,
  isWarehouseStaff,
} from "@/lib/warehouse-access"

export function WarehousePackagingStockPage() {
  const { t } = useTranslation()
  const { warehouseId = "" } = useParams<{ warehouseId: string }>()
  const { user, accessToken } = useAuth()
  const token = accessToken ?? ""
  const wid = warehouseId.trim()

  if (!user?.permissions?.includes("packaging_materials.read")) {
    return <Navigate to={getDefaultDashboardRoute(user)} replace />
  }

  if (!wid) {
    return <Navigate to={getDefaultDashboardRoute(user)} replace />
  }

  if (isWarehouseStaff(user) && user.warehouseId && user.warehouseId !== wid) {
    return (
      <Navigate
        to={`/warehouses/${encodeURIComponent(user.warehouseId)}/packaging-stock`}
        replace
      />
    )
  }

  if (
    isWarehouseAdmin(user) &&
    user.adminWarehouse?.id &&
    user.adminWarehouse.id !== wid &&
    !hasPlatformWarehouseScope(user)
  ) {
    return (
      <Navigate
        to={`/warehouses/${encodeURIComponent(user.adminWarehouse.id)}/packaging-stock`}
        replace
      />
    )
  }

  return (
    <Layout title={t("nav.warehousePackagingStock")}>
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">{t("warehouse.packagingStock.description")}</p>
        <WarehouseHubPackagingStockSection token={token} warehouseId={wid} />
      </div>
    </Layout>
  )
}
