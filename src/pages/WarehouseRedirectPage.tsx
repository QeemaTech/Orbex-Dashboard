import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Navigate, useNavigate } from "react-router-dom"

import { listWarehouseSites } from "@/api/warehouse-api"
import { useAuth } from "@/lib/auth-context"
import {
  isWarehouseSiteAdmin,
  isWarehouseSiteStaff,
  isWarehouseStaffRole,
} from "@/lib/warehouse-access"

/**
 * Legacy `/warehouse` entry: sends each role to the correct place in the
 * warehouses hierarchy (no global multi-warehouse queue).
 */
export function WarehouseRedirectPage() {
  const { accessToken, user } = useAuth()
  const navigate = useNavigate()
  const token = accessToken ?? ""

  const sitesQuery = useQuery({
    queryKey: ["warehouse-sites", token],
    queryFn: () => listWarehouseSites(token),
    enabled: !!token && !!user && isWarehouseSiteAdmin(user),
  })

  useEffect(() => {
    if (!user) return
    if (user.role === "ADMIN") {
      void navigate("/warehouses", { replace: true })
      return
    }
    if (isWarehouseSiteStaff(user) && user.warehouseId) {
      void navigate(`/warehouses/${encodeURIComponent(user.warehouseId)}`, {
        replace: true,
      })
    }
  }, [user, navigate])

  useEffect(() => {
    if (!user || !isWarehouseSiteAdmin(user)) return
    if (!sitesQuery.isSuccess) return
    const warehouses = sitesQuery.data?.warehouses ?? []
    if (warehouses.length > 1) {
      void navigate("/warehouses", { replace: true })
      return
    }
    const id = warehouses[0]?.id
    if (id) {
      void navigate(`/warehouses/${encodeURIComponent(id)}`, { replace: true })
    }
  }, [user, sitesQuery.isSuccess, sitesQuery.data?.warehouses, navigate])

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (isWarehouseStaffRole(user) && !user.warehouseId) {
    return (
      <div className="text-muted-foreground flex min-h-dvh items-center justify-center p-6 text-sm">
        No warehouse is assigned to your account.
      </div>
    )
  }

  if (isWarehouseSiteAdmin(user) && sitesQuery.error) {
    return (
      <div className="text-destructive flex min-h-dvh items-center justify-center p-6 text-sm">
        {(sitesQuery.error as Error).message}
      </div>
    )
  }

  if (
    isWarehouseSiteAdmin(user) &&
    sitesQuery.isSuccess &&
    (sitesQuery.data?.warehouses?.length ?? 0) === 0
  ) {
    return (
      <div className="text-muted-foreground flex min-h-dvh items-center justify-center p-6 text-sm">
        No warehouse is assigned to your admin account.
      </div>
    )
  }

  return (
    <div className="text-muted-foreground flex min-h-dvh items-center justify-center text-sm">
      Loading…
    </div>
  )
}
