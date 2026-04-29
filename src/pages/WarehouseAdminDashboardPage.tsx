import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"

import { listWarehouseSites } from "@/api/warehouse-api"
import { DashboardPage } from "@/pages/DashboardPage"
import { useAuth } from "@/lib/auth-context"
import { isWarehouseSiteAdmin } from "@/lib/warehouse-access"

export function WarehouseAdminDashboardPage() {
  const { accessToken, user } = useAuth()
  const token = accessToken ?? ""
  const permissions = user?.permissions ?? []
  const hasWarehouseAdminPermissions =
    permissions.includes("warehouses.manage") || permissions.includes("warehouses.create")
  const canAccessWarehouseAdminDashboard =
    !!user && (isWarehouseSiteAdmin(user) || hasWarehouseAdminPermissions)
  const sitesQuery = useQuery({
    queryKey: ["warehouse-admin-dashboard-sites", token, user?.id],
    queryFn: () => listWarehouseSites(token),
    enabled: !!token && canAccessWarehouseAdminDashboard,
  })

  const scopedWarehouseId = useMemo(() => {
    const sites = sitesQuery.data?.warehouses ?? []
    return sites[0]?.id ?? null
  }, [sitesQuery.data?.warehouses])

  if (!canAccessWarehouseAdminDashboard) {
    return (
      <div className="text-muted-foreground flex min-h-dvh items-center justify-center p-6 text-sm">
        Warehouse admin access is required.
      </div>
    )
  }

  if (sitesQuery.isPending) {
    return (
      <div className="text-muted-foreground flex min-h-dvh items-center justify-center p-6 text-sm">
        Loading…
      </div>
    )
  }

  if (sitesQuery.isError) {
    return (
      <div className="text-destructive flex min-h-dvh items-center justify-center p-6 text-sm">
        {(sitesQuery.error as Error).message}
      </div>
    )
  }

  if (!scopedWarehouseId) {
    return (
      <div className="text-muted-foreground flex min-h-dvh items-center justify-center p-6 text-sm">
        No warehouse is assigned to your admin account.
      </div>
    )
  }

  return <DashboardPage scopedWarehouseId={scopedWarehouseId} />
}
