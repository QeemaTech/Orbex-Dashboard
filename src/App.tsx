import type { ReactNode } from "react"
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom"

import {
  getDefaultDashboardRoute,
  type UserRole,
  useAuth,
} from "@/lib/auth-context"
import { CsCouriersPage } from "@/features/customer-service/pages/CsCouriersPage"
import { CsShipmentsPage } from "@/features/customer-service/pages/CsShipmentsPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { CollectionsPage } from "@/pages/CollectionsPage"
import { LoginPage } from "@/pages/LoginPage"
import { MerchantsPage } from "@/pages/MerchantsPage"
import { ShipmentDetailsPage } from "@/pages/ShipmentDetailsPage"
import { ShipmentPackagesPage } from "@/pages/ShipmentPackagesPage"
import { ShipmentsPage } from "@/pages/ShipmentsPage"
import { WarehousePage } from "@/pages/WarehousePage"
import { WarehouseSitesPage } from "@/pages/WarehouseSitesPage"
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
              <ShipmentsPage />
            </Protected>
          }
        />
        <Route
          path="/shipments/:shipmentId/packages"
          element={
            <Protected>
              <ShipmentPackagesPage />
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
                <WarehousePage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/warehouse/sites"
          element={
            <Protected>
              <ProtectedRole allowed={["ADMIN", "WAREHOUSE_ADMIN"]}>
                <WarehouseSitesPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/warehouse/shipments/:shipmentId/packages"
          element={
            <Protected>
              <ProtectedRole allowed={["ADMIN", "WAREHOUSE", "WAREHOUSE_ADMIN"]}>
                <ShipmentPackagesPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/warehouse/shipments/:shipmentId"
          element={
            <Protected>
              <ProtectedRole allowed={["ADMIN", "WAREHOUSE", "WAREHOUSE_ADMIN"]}>
                <ShipmentDetailsPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route path="/cs" element={<Navigate to="/cs/shipments" replace />} />
        <Route
          path="/cs/shipments"
          element={
            <Protected>
              <ProtectedRole allowed={["ADMIN", "CUSTOMER_SERVICE"]}>
                <CsShipmentsPage />
              </ProtectedRole>
            </Protected>
          }
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
          path="/cs/shipments/:shipmentId/packages"
          element={
            <Protected>
              <ProtectedRole allowed={["ADMIN", "CUSTOMER_SERVICE"]}>
                <ShipmentPackagesPage />
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
