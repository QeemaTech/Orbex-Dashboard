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
  isMerchantUser,
  type UserRole,
  useAuth,
} from "@/lib/auth-context"
import { CsCouriersPage } from "@/features/customer-service/pages/CsCouriersPage"
import { CsShipmentsListPage } from "@/features/customer-service/pages/CsShipmentsListPage"
import { DashboardPage, WarehouseAdminDashboardPage } from "@/pages/DashboardPage"
import { AccountsPage } from "@/pages/AccountsPage"
import { AccountsBalancesPage } from "@/pages/AccountsBalancesPage"
import { AccountsPayoutRequestsPage } from "@/pages/AccountsPayoutRequestsPage"
import { CourierAccountDetailPage } from "@/pages/CourierAccountDetailPage"
import { MerchantAccountDetailPage } from "@/pages/MerchantAccountDetailPage"
import { CollectionsPage } from "@/pages/CollectionsPage"
import { LoginPage } from "@/pages/LoginPage"
import { MerchantsPage } from "@/pages/MerchantsPage"
import { UsersPage } from "@/pages/UsersPage"
import { MerchantOrderDetailsPage } from "@/pages/MerchantOrderDetailsPage"
import { MerchantOrdersListPage } from "@/pages/MerchantOrdersListPage"
import { ShipmentLabelPrintPage } from "@/pages/ShipmentLabelPrintPage"
import { ShipmentLineDetailsPage } from "@/pages/ShipmentLineDetailsPage"
import { ShipmentLinesListPage } from "@/pages/ShipmentLinesListPage"
import { WarehouseDetailPage } from "@/pages/WarehouseDetailPage"
import { WarehouseMerchantOrdersListPage } from "@/pages/WarehouseMerchantOrdersListPage"
import { WarehouseShipmentsListPage } from "@/pages/WarehouseShipmentsListPage"
import { DeliveryManifestListPage } from "@/features/delivery-manifest/DeliveryManifestListPage"
import { DeliveryManifestWorkspacePage } from "@/features/delivery-manifest/DeliveryManifestWorkspacePage"
import { WarehouseRedirectPage } from "@/pages/WarehouseRedirectPage"
import { DeliveryZonesPage } from "@/pages/DeliveryZonesPage"
import { WarehousesPage } from "@/pages/WarehousesPage"
import { RealtimeBridge } from "@/lib/realtime"
import { warehouseMerchantOrderDetailPath } from "@/lib/warehouse-merchant-order-routes"
import { RolesPage } from "@/pages/RolesPage"
import { SettingsPage } from "@/pages/SettingsPage"
import { PublicShipmentTrackingPage } from "@/pages/PublicShipmentTrackingPage"
import { DeliveryProofPage } from "@/pages/DeliveryProofPage"
import { MerchantOrderPendingImportsPage } from "@/pages/MerchantOrderPendingImportsPage"
import { AllCourierManifestsPage } from "@/pages/AllCourierManifestsPage"
import { CourierManifestDetailPage } from "@/pages/CourierManifestDetailPage"
import { PackagingMaterialsPage } from "@/pages/PackagingMaterialsPage"
import { PackagingMaterialRequestsPage } from "@/pages/PackagingMaterialRequestsPage"
import { PackagingInventoryPage } from "@/pages/PackagingInventoryPage"
import { PickupCouriersPage } from "@/pages/PickupCouriersPage"
import { PickupCourierManifestsListPage } from "@/pages/PickupCourierManifestsListPage"
import { PickupCourierManifestDetailPage } from "@/pages/PickupCourierManifestDetailPage"

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
  requiredAnyPermissions,
  children,
}: {
  allowed: readonly UserRole[]
  requiredPermissions?: readonly string[]
  requiredAnyPermissions?: readonly string[]
  children: ReactNode
}) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  const hasAllRequiredPermissions =
    requiredPermissions?.every((p) => user.permissions?.includes(p)) ?? false
  const hasAnyRequiredPermission =
    requiredAnyPermissions?.some((p) => user.permissions?.includes(p)) ?? false

  const roleAllowed = allowed.includes(user.role)
  const allReqSatisfied = requiredPermissions?.length ? hasAllRequiredPermissions : false
  const anyReqSatisfied = requiredAnyPermissions?.length ? hasAnyRequiredPermission : false

  const accessGranted =
    roleAllowed ||
    allReqSatisfied ||
    anyReqSatisfied ||
    (!allowed.length && !requiredPermissions?.length && !requiredAnyPermissions?.length)

  if (!accessGranted) {
    return <Navigate to={getDefaultDashboardRoute(user)} replace />
  }
  return <>{children}</>
}

/** Confirm permission, or merchant viewing own pending imports (read). */
function AccessPendingImportsPage({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  const hasConfirm = Boolean(user.permissions?.includes("merchant_orders.confirm"))
  const merchantCanViewOwn =
    isMerchantUser(user) && Boolean(user.permissions?.includes("merchant_orders.read"))
  if (hasConfirm || merchantCanViewOwn) {
    return <>{children}</>
  }
  return <Navigate to={getDefaultDashboardRoute(user)} replace />
}

function RootRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={getDefaultDashboardRoute(user)} replace />
}

function MerchantSelfAccountRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!user.merchantId) return <Navigate to={getDefaultDashboardRoute(user)} replace />
  return <Navigate to={`/accounts/merchants/${encodeURIComponent(user.merchantId)}`} replace />
}

function MerchantSelfAccountOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { merchantId = "" } = useParams()
  if (!user) return <Navigate to="/login" replace />
  if (!user.merchantId || user.merchantId !== merchantId) {
    return <Navigate to={getDefaultDashboardRoute(user)} replace />
  }
  return <>{children}</>
}

function RedirectWarehouseMerchantOrderShipmentsToDetail() {
  const { warehouseId = "", merchantOrderId = "" } = useParams()
  return (
    <Navigate
      to={`${warehouseMerchantOrderDetailPath(warehouseId, merchantOrderId)}#customer-orders`}
      replace
    />
  )
}

/** Old bookmarks: `/warehouses/.../transfers/.../shipments` → `.../merchant-orders/...#customer-orders`. */
function RedirectWarehouseTransferShipmentsToDetail() {
  const { warehouseId = "", merchantOrderId = "" } = useParams()
  return (
    <Navigate
      to={`${warehouseMerchantOrderDetailPath(warehouseId, merchantOrderId)}#customer-orders`}
      replace
    />
  )
}

function RedirectWarehouseManifestCreateToList() {
  const { warehouseId = "" } = useParams<{ warehouseId: string }>()
  if (!warehouseId) {
    return <Navigate to="/warehouses" replace />
  }
  return (
    <Navigate
      to={`/warehouses/${encodeURIComponent(warehouseId)}/manifests/workspace`}
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
        <Route path="/track/:trackingNumber" element={<PublicShipmentTrackingPage />} />
        <Route path="/delivery-proof/:token" element={<DeliveryProofPage />} />
        <Route
          path="/"
          element={
            <Protected>
              <RootRedirect />
            </Protected>
          }
        />
        <Route
          path="/dashboard/warehouse"
          element={
            <Protected>
              <WarehouseAdminDashboardPage />
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
          path="/shipments/:shipmentId/print"
          element={
            <Protected>
              <ProtectedRole allowed={[]} requiredPermissions={["shipments.label"]}>
                <ShipmentLabelPrintPage />
              </ProtectedRole>
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
          path="/merchant-orders/pending-confirmations"
          element={
            <Protected>
              <AccessPendingImportsPage>
                <MerchantOrderPendingImportsPage />
              </AccessPendingImportsPage>
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
          path="/delivery-zones"
          element={
            <Protected>
              <ProtectedRole
                allowed={["ADMIN", "WAREHOUSE_ADMIN"]}
                requiredPermissions={["delivery_zones.read"]}
              >
                <DeliveryZonesPage />
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
          path="/settings"
          element={
            <Protected>
              <SettingsPage />
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
          path="/courier-manifests"
          element={
            <Protected>
              <ProtectedRole
                allowed={[]}
                requiredPermissions={["courier_manifests.read_all"]}
              >
                <AllCourierManifestsPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/courier-manifests/:manifestId"
          element={
            <Protected>
              <ProtectedRole
                allowed={[]}
                requiredPermissions={["courier_manifests.read_all"]}
              >
                <CourierManifestDetailPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/packaging-materials"
          element={
            <Protected>
              <ProtectedRole
                allowed={["ADMIN", "WAREHOUSE", "WAREHOUSE_ADMIN", "MERCHANT"]}
                requiredPermissions={["packaging_materials.read"]}
              >
                <PackagingMaterialsPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/packaging-material-requests"
          element={
            <Protected>
              <ProtectedRole
                allowed={["ADMIN", "WAREHOUSE", "WAREHOUSE_ADMIN", "MERCHANT"]}
                requiredPermissions={["packaging_material_requests.read_own"]}
              >
                <PackagingMaterialRequestsPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/packaging-inventory"
          element={
            <Protected>
              <ProtectedRole
                allowed={["ADMIN", "WAREHOUSE", "WAREHOUSE_ADMIN"]}
                requiredPermissions={["packaging_materials.read"]}
              >
                <PackagingInventoryPage />
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
          path="/accounts"
          element={
            <Protected>
              <ProtectedRole
                allowed={["ADMIN", "ACCOUNTS", "WAREHOUSE_ADMIN"]}
                requiredPermissions={["accounts.read"]}
              >
                <AccountsPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/accounts/balances"
          element={
            <Protected>
              <ProtectedRole
                allowed={["ADMIN", "ACCOUNTS", "WAREHOUSE_ADMIN"]}
                requiredPermissions={["accounts.read"]}
              >
                <AccountsBalancesPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/accounts/payout-requests"
          element={
            <Protected>
              <ProtectedRole
                allowed={["ADMIN", "ACCOUNTS"]}
                requiredPermissions={["accounts.review_payout"]}
              >
                <AccountsPayoutRequestsPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/accounts/me"
          element={
            <Protected>
              <MerchantSelfAccountRedirect />
            </Protected>
          }
        />
        <Route
          path="/accounts/couriers/:courierId"
          element={
            <Protected>
              <ProtectedRole
                allowed={["ADMIN", "ACCOUNTS", "WAREHOUSE_ADMIN"]}
                requiredPermissions={["accounts.read"]}
              >
                <CourierAccountDetailPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/accounts/merchants/:merchantId"
          element={
            <Protected>
              <ProtectedRole
                allowed={["ADMIN", "ACCOUNTS", "WAREHOUSE_ADMIN", "MERCHANT"]}
                requiredPermissions={["accounts.request_payout"]}
              >
                <MerchantSelfAccountOnly>
                  <MerchantAccountDetailPage />
                </MerchantSelfAccountOnly>
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
          path="/pickup-couriers"
          element={
            <Protected>
              <ProtectedRole
                allowed={["ADMIN", "WAREHOUSE", "WAREHOUSE_ADMIN"]}
                requiredPermissions={["warehouses.read"]}
              >
                <PickupCouriersPage />
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
          path="/warehouses/:warehouseId/orders"
          element={
            <Protected>
              <ProtectedRole
                allowed={["ADMIN", "WAREHOUSE", "WAREHOUSE_ADMIN"]}
                requiredPermissions={["warehouses.read"]}
              >
                <WarehouseMerchantOrdersListPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/warehouses/:warehouseId/shipments"
          element={
            <Protected>
              <ProtectedRole
                allowed={["ADMIN", "WAREHOUSE", "WAREHOUSE_ADMIN"]}
                requiredPermissions={["warehouses.read"]}
              >
                <WarehouseShipmentsListPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/warehouses/:warehouseId/manifests"
          element={
            <Protected>
              <ProtectedRole
                allowed={[]}
                requiredAnyPermissions={[
                  "delivery_manifests.read",
                  "delivery_manifests.read_all",
                ]}
              >
                <DeliveryManifestListPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/warehouses/:warehouseId/manifests/pickup"
          element={
            <Protected>
              <ProtectedRole
                allowed={["ADMIN", "WAREHOUSE", "WAREHOUSE_ADMIN"]}
                requiredPermissions={["warehouses.manage_transfer"]}
              >
                <PickupCourierManifestsListPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/warehouses/:warehouseId/manifests/pickup/:movementManifestId"
          element={
            <Protected>
              <ProtectedRole
                allowed={["ADMIN", "WAREHOUSE", "WAREHOUSE_ADMIN"]}
                requiredPermissions={["warehouses.manage_transfer"]}
              >
                <PickupCourierManifestDetailPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/warehouses/:warehouseId/manifests/workspace"
          element={
            <Protected>
              <ProtectedRole
                allowed={[]}
                requiredAnyPermissions={[
                  "delivery_manifests.read",
                  "delivery_manifests.read_all",
                ]}
              >
                <DeliveryManifestWorkspacePage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/warehouses/:warehouseId/manifests/create"
          element={
            <Protected>
              <ProtectedRole
                allowed={["ADMIN", "WAREHOUSE", "WAREHOUSE_ADMIN"]}
                requiredPermissions={["warehouses.read"]}
              >
                <RedirectWarehouseManifestCreateToList />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/warehouses/:warehouseId/manifests/:manifestId"
          element={
            <Protected>
              <ProtectedRole
                allowed={["ADMIN", "WAREHOUSE", "WAREHOUSE_ADMIN"]}
                requiredPermissions={["warehouses.read"]}
              >
                <CourierManifestDetailPage />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/warehouses/:warehouseId/shipments/:shipmentId"
          element={
            <Protected>
              <ShipmentLineDetailsPage />
            </Protected>
          }
        />
        <Route
          path="/warehouses/:warehouseId/merchant-orders/:merchantOrderId/shipments"
          element={
            <Protected>
              <ProtectedRole allowed={["ADMIN", "WAREHOUSE", "WAREHOUSE_ADMIN"]}>
                <RedirectWarehouseMerchantOrderShipmentsToDetail />
              </ProtectedRole>
            </Protected>
          }
        />
        <Route
          path="/warehouses/:warehouseId/merchant-orders/:merchantOrderId"
          element={
            <Protected>
              <ProtectedRole allowed={["ADMIN", "WAREHOUSE", "WAREHOUSE_ADMIN"]}>
                <MerchantOrderDetailsPage />
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
          path="/cs/merchant-orders/pending-confirmations"
          element={
            <Protected>
              <AccessPendingImportsPage>
                <MerchantOrderPendingImportsPage />
              </AccessPendingImportsPage>
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
          path="/cs/shipments/:shipmentId/print"
          element={
            <Protected>
              <ProtectedRole allowed={[]} requiredPermissions={["shipments.label"]}>
                <ShipmentLabelPrintPage />
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
