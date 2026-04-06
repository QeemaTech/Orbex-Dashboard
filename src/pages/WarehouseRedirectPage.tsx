import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Navigate, useNavigate } from "react-router-dom"

import { listWarehouseSites } from "@/api/warehouse-api"
import { useAuth } from "@/lib/auth-context"

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
    enabled: !!token && user?.role === "WAREHOUSE_ADMIN",
  })

  useEffect(() => {
    if (!user) return
    if (user.role === "ADMIN") {
      void navigate("/warehouses", { replace: true })
      return
    }
    if (user.role === "WAREHOUSE" && user.warehouseId) {
      void navigate(`/warehouses/${encodeURIComponent(user.warehouseId)}`, {
        replace: true,
      })
    }
  }, [user, navigate])

  useEffect(() => {
    if (!user || user.role !== "WAREHOUSE_ADMIN") return
    if (!sitesQuery.isSuccess) return
    const id = sitesQuery.data?.warehouses?.[0]?.id
    if (id) {
      void navigate(`/warehouses/${encodeURIComponent(id)}`, { replace: true })
    }
  }, [user, sitesQuery.isSuccess, sitesQuery.data?.warehouses, navigate])

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role === "WAREHOUSE" && !user.warehouseId) {
    return (
      <div className="text-muted-foreground flex min-h-dvh items-center justify-center p-6 text-sm">
        No warehouse is assigned to your account.
      </div>
    )
  }

  if (user.role === "WAREHOUSE_ADMIN" && sitesQuery.error) {
    return (
      <div className="text-destructive flex min-h-dvh items-center justify-center p-6 text-sm">
        {(sitesQuery.error as Error).message}
      </div>
    )
  }

  if (
    user.role === "WAREHOUSE_ADMIN" &&
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
