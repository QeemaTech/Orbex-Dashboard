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
import { CsOrdersListPage } from "@/features/customer-service/pages/CsOrdersListPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { CollectionsPage } from "@/pages/CollectionsPage"
import { LoginPage } from "@/pages/LoginPage"
import { MerchantsPage } from "@/pages/MerchantsPage"
import { UsersPage } from "@/pages/UsersPage"
import { ShipmentDetailsPage } from "@/pages/ShipmentDetailsPage"
import { OrdersPage } from "@/pages/OrdersPage"
import { OrdersListPage } from "@/pages/OrdersListPage"
import { ShipmentsListPage } from "@/pages/ShipmentsListPage"
import { WarehouseDetailPage } from "@/pages/WarehouseDetailPage"
import { WarehouseRedirectPage } from "@/pages/WarehouseRedirectPage"
import { WarehousesPage } from "@/pages/WarehousesPage"
import { RealtimeBridge } from "@/lib/realtime"

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
  children,
}: {
  allowed: readonly UserRole[]
  children: ReactNode
}) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!allowed.includes(user.role)) {
    return <Navigate to={getDefaultDashboardRoute(user.role)} replace />
  }
  return <>{children}</>
}

function RootRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={getDefaultDashboardRoute(user.role)} replace />
}

function RedirectToShipmentDetail() {
  const { shipmentId = "" } = useParams()
  return (
    <Navigate to={`/shipments/${encodeURIComponent(shipmentId)}`} replace />
  )
}

function RedirectWarehouseTransferOrdersToDetail() {
  const { warehouseId = "", shipmentId = "" } = useParams()
  return (
    <Navigate
      to={`/warehouses/${encodeURIComponent(warehouseId)}/transfers/${encodeURIComponent(shipmentId)}#customer-orders`}
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
          path="/orders"
          element={
            <Protected>
              <OrdersListPage />
            </Protected>
          }
        />
        <Route
          path="/orders/:shipmentId"
          element={
            <Protected>
              <RedirectToShipmentDetail />
            </Protected>
          }
        />
        <Route
          path="/shipments"
          element={
            <Protected>
              <ProtectedRole allowed={["ADMIN"]}>
                <ShipmentsListPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/shipments/:shipmentId"
          element={
            <Protected>
              <ShipmentDetailsPage />
            </Protected>
          }
        />
        <Route
          path="/couriers"
          element={
            <Protected>
              <ProtectedRole allowed={["ADMIN"]}>
                <CsCouriersPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/merchants"
          element={
            <Protected>
              <ProtectedRole allowed={["ADMIN"]}>
                <MerchantsPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/users"
          element={
            <Protected>
              <ProtectedRole allowed={["ADMIN"]}>
                <UsersPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/collections"
          element={
            <Protected>
              <CollectionsPage />
            </Protected>
          }
        />
        <Route
          path="/warehouse"
          element={
            <Protected>
              <ProtectedRole allowed={["ADMIN", "WAREHOUSE", "WAREHOUSE_ADMIN"]}>
                <WarehouseRedirectPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/warehouses"
          element={
            <Protected>
              <ProtectedRole allowed={["ADMIN", "WAREHOUSE_ADMIN"]}>
                <WarehousesPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/warehouses/:warehouseId"
          element={
            <Protected>
              <ProtectedRole allowed={["ADMIN", "WAREHOUSE", "WAREHOUSE_ADMIN"]}>
                <WarehouseDetailPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/warehouses/:warehouseId/transfers/:shipmentId/orders"
          element={
            <Protected>
              <ProtectedRole allowed={["ADMIN", "WAREHOUSE", "WAREHOUSE_ADMIN"]}>
                <RedirectWarehouseTransferOrdersToDetail />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/warehouses/:warehouseId/transfers/:shipmentId"
          element={
            <Protected>
              <ProtectedRole allowed={["ADMIN", "WAREHOUSE", "WAREHOUSE_ADMIN"]}>
                <ShipmentDetailsPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route path="/cs" element={<Navigate to="/cs/orders" replace />} />
        <Route
          path="/cs/orders"
          element={
            <Protected>
              <ProtectedRole allowed={["ADMIN", "CUSTOMER_SERVICE"]}>
                <CsOrdersListPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/cs/shipments"
          element={<Navigate to="/cs/orders" replace />}
        />
        <Route
          path="/cs/couriers"
          element={
            <Protected>
              <ProtectedRole allowed={["ADMIN", "CUSTOMER_SERVICE"]}>
                <CsCouriersPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/cs/orders/:shipmentId"
          element={
            <Protected>
              <ProtectedRole allowed={["ADMIN", "CUSTOMER_SERVICE"]}>
                <OrdersPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/cs/shipments/:shipmentId"
          element={
            <Protected>
              <ProtectedRole allowed={["ADMIN", "CUSTOMER_SERVICE"]}>
                <ShipmentDetailsPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
