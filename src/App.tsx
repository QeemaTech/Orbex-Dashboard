import type { ReactNode } from "react"
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useParams,
} from "react-router-dom"

import {
  getDefaultDashboardRoute,
  type UserRole,
  useAuth,
} from "@/lib/auth-context"
import { CsCouriersPage } from "@/features/customer-service/pages/CsCouriersPage"
import { CsShipmentsListPage } from "@/features/customer-service/pages/CsShipmentsListPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { CollectionsPage } from "@/pages/CollectionsPage"
import { LoginPage } from "@/pages/LoginPage"
import { MerchantsPage } from "@/pages/MerchantsPage"
import { UsersPage } from "@/pages/UsersPage"
import { MerchantOrderDetailsPage } from "@/pages/MerchantOrderDetailsPage"
import { MerchantOrdersListPage } from "@/pages/MerchantOrdersListPage"
import { ShipmentLineDetailsPage } from "@/pages/ShipmentLineDetailsPage"
import { ShipmentLinesListPage } from "@/pages/ShipmentLinesListPage"
import { WarehouseDetailPage } from "@/pages/WarehouseDetailPage"
import { WarehouseRedirectPage } from "@/pages/WarehouseRedirectPage"
import { WarehousesPage } from "@/pages/WarehousesPage"
import { RealtimeBridge } from "@/lib/realtime"
import { RolesPage } from "@/pages/RolesPage"

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="text-muted-foreground flex min-h-dvh items-center justify-center text-sm">
        Loading…
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function ProtectedRole({
  allowed,
  requiredPermissions,
  children,
}: {
  allowed: readonly UserRole[]
  requiredPermissions?: readonly string[]
  children: ReactNode
}) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  const hasPermission =
    requiredPermissions?.every((p) => user.permissions?.includes(p)) ?? false
  if (!hasPermission && !allowed.includes(user.role)) {
    return <Navigate to={getDefaultDashboardRoute(user.role)} replace />
  }
  return <>{children}</>
}

function RootRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={getDefaultDashboardRoute(user.role)} replace />
}

function RedirectWarehouseTransferShipmentsToDetail() {
  const { warehouseId = "", merchantOrderId = "" } = useParams()
  return (
    <Navigate
      to={`/warehouses/${encodeURIComponent(warehouseId)}/transfers/${encodeURIComponent(merchantOrderId)}#customer-orders`}
      replace
    />
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <RealtimeBridge />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <Protected>
              <RootRedirect />
            </Protected>
          }
        />
        <Route
          path="/dashboard"
          element={
            <Protected>
              <DashboardPage />
            </Protected>
          }
        />
        <Route
          path="/shipments"
          element={
            <Protected>
              <ShipmentLinesListPage />
            </Protected>
          }
        />
        <Route
          path="/shipments/:shipmentId"
          element={
            <Protected>
              <ShipmentLineDetailsPage />
            </Protected>
          }
        />
        <Route
          path="/merchant-orders"
          element={
            <Protected>
              <ProtectedRole
                allowed={["ADMIN"]}
                requiredPermissions={["merchant_orders.read"]}
              >
                <MerchantOrdersListPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/merchant-orders/:merchantOrderId"
          element={
            <Protected>
              <MerchantOrderDetailsPage />
            </Protected>
          }
        />
        <Route
          path="/couriers"
          element={
            <Protected>
              <ProtectedRole
                allowed={["ADMIN"]}
                requiredPermissions={["couriers.read"]}
              >
                <CsCouriersPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/merchants"
          element={
            <Protected>
              <ProtectedRole
                allowed={["ADMIN"]}
                requiredPermissions={["merchants.read"]}
              >
                <MerchantsPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/users"
          element={
            <Protected>
              <ProtectedRole
                allowed={["ADMIN"]}
                requiredPermissions={["users.read"]}
              >
                <UsersPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/rbac/roles"
          element={
            <Protected>
              <ProtectedRole
                allowed={[
                  "ADMIN",
                  "CUSTOMER_SERVICE",
                  "SALES",
                  "ACCOUNTS",
                  "WAREHOUSE",
                  "WAREHOUSE_ADMIN",
                  "COURIER",
                  "MERCHANT",
                ]}
                requiredPermissions={["roles.read"]}
              >
                <RolesPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/collections"
          element={
            <Protected>
              <ProtectedRole
                allowed={["ADMIN", "ACCOUNTS"]}
                requiredPermissions={["collections.read"]}
              >
                <CollectionsPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/warehouse"
          element={
            <Protected>
              <ProtectedRole
                allowed={["ADMIN", "WAREHOUSE", "WAREHOUSE_ADMIN"]}
                requiredPermissions={["warehouses.read"]}
              >
                <WarehouseRedirectPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/warehouses"
          element={
            <Protected>
              <ProtectedRole
                allowed={["ADMIN", "WAREHOUSE_ADMIN"]}
                requiredPermissions={["warehouses.read"]}
              >
                <WarehousesPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/warehouses/:warehouseId"
          element={
            <Protected>
              <ProtectedRole
                allowed={["ADMIN", "WAREHOUSE", "WAREHOUSE_ADMIN"]}
                requiredPermissions={["warehouses.read"]}
              >
                <WarehouseDetailPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/warehouses/:warehouseId/transfers/:merchantOrderId/shipments"
          element={
            <Protected>
              <ProtectedRole
                allowed={["ADMIN", "WAREHOUSE", "WAREHOUSE_ADMIN"]}
                requiredPermissions={["warehouses.manage_transfer"]}
              >
                <RedirectWarehouseTransferShipmentsToDetail />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/warehouses/:warehouseId/transfers/:merchantOrderId"
          element={
            <Protected>
              <ProtectedRole
                allowed={["ADMIN", "WAREHOUSE", "WAREHOUSE_ADMIN"]}
                requiredPermissions={["warehouses.manage_transfer"]}
              >
                <MerchantOrderDetailsPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route path="/cs" element={<Navigate to="/cs/shipments" replace />} />
        <Route
          path="/cs/shipments"
          element={
            <Protected>
              <ProtectedRole
                allowed={["ADMIN", "CUSTOMER_SERVICE"]}
                requiredPermissions={["shipments.read"]}
              >
                <CsShipmentsListPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/cs/merchant-orders"
          element={
            <Protected>
              <ProtectedRole
                allowed={["ADMIN", "CUSTOMER_SERVICE"]}
                requiredPermissions={["merchant_orders.read"]}
              >
                <MerchantOrdersListPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/cs/couriers"
          element={
            <Protected>
              <ProtectedRole
                allowed={["ADMIN", "CUSTOMER_SERVICE"]}
                requiredPermissions={["couriers.read"]}
              >
                <CsCouriersPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/cs/shipments/:shipmentId"
          element={
            <Protected>
              <ProtectedRole
                allowed={["ADMIN", "CUSTOMER_SERVICE"]}
                requiredPermissions={["shipments.read"]}
              >
                <ShipmentLineDetailsPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/cs/merchant-orders/:merchantOrderId"
          element={
            <Protected>
              <ProtectedRole
                allowed={["ADMIN", "CUSTOMER_SERVICE"]}
                requiredPermissions={["merchant_orders.read"]}
              >
                <MerchantOrderDetailsPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
