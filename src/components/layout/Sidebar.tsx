import { LogOut, Settings, ShieldCheck, Sun, Moon, Monitor } from "lucide-react"
import {
  Banknote,
  Boxes,
  LayoutDashboard,
  MapPin,
  Package,
  Truck,
  Users,
  Warehouse,
} from "react-lucid"
import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { NavLink, useLocation, useNavigate } from "react-router-dom"

import { getWarehouseSite } from "@/api/warehouse-api"
import { useSidebar } from "@/components/layout/sidebar-context"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { isMerchantUser, useAuth } from "@/lib/auth-context"
import { isMainBranch } from "@/lib/warehouse-utils"
import { isWarehouseAdmin, isWarehouseStaff } from "@/lib/warehouse-access"
import { cn } from "@/lib/utils"

/** Same pathname + `tab` query as sidebar link (staff hub has multiple links under one path). */
function isWarehouseStaffNavItemActive(
  location: { pathname: string; search: string },
  to: string,
): boolean {
  const q = to.indexOf("?")
  const path = q >= 0 ? to.slice(0, q) : to
  const wantTab = q >= 0 ? new URLSearchParams(to.slice(q + 1)).get("tab") : null
  if (location.pathname !== path) return false
  const haveTab = new URLSearchParams(location.search).get("tab")
  if (wantTab === null) return !haveTab || haveTab === ""
  return haveTab === wantTab
}

type HubNavItem = {
  to: string
  labelKey:
    | "nav.settings"
    | "nav.myWarehouse"
    | "nav.warehouseMerchantOrders"
    | "nav.warehouseStandaloneShipments"
    | "nav.warehouseManifests"
  icon: typeof Warehouse
  end: boolean
  perm?: string
}

function buildHubWarehouseNavItems(
  hubId: string,
  isMainHub: boolean,
): HubNavItem[] {
  const base = `/warehouses/${hubId}`
  const items: HubNavItem[] = [
    {
      to: base,
      labelKey: "nav.myWarehouse",
      icon: Warehouse,
      end: true,
      perm: "warehouses.read",
    },
  ]
  if (isMainHub) {
    items.push({
      to: `${base}?tab=orders`,
      labelKey: "nav.warehouseMerchantOrders",
      icon: Boxes,
      end: false,
      perm: "warehouses.read",
    })
  }
  items.push(
    {
      to: `${base}?tab=shipments`,
      labelKey: "nav.warehouseStandaloneShipments",
      icon: Package,
      end: false,
      perm: "warehouses.read",
    },
    ...(isMainHub
      ? [
          {
            to: `${base}?tab=manifests`,
            labelKey: "nav.warehouseManifests",
            icon: Truck,
            end: false,
            perm: "warehouses.read",
          } satisfies HubNavItem,
        ]
      : []),
    {
      to: "/settings",
      labelKey: "nav.settings",
      icon: Settings,
      end: false,
    },
  )
  return items
}

const adminNavConfig = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true, perm: "dashboard.view" },
  { to: "/users", labelKey: "nav.users", icon: Users, end: false, perm: "users.read" },
  { to: "/rbac/roles", labelKey: "nav.roles", icon: ShieldCheck, end: false, perm: "roles.read" },
  { to: "/shipments", labelKey: "nav.shipments", icon: Package, end: false, perm: "shipments.read" },
  { to: "/merchant-orders", labelKey: "nav.merchantOrders", icon: Boxes, end: false, perm: "merchant_orders.read" },
  { to: "/merchant-orders/pending-confirmations", labelKey: "nav.merchantOrderConfirmations", icon: Boxes, end: false, perm: "merchant_orders.confirm" },
  { to: "/courier-manifests", labelKey: "nav.allCourierManifests", icon: Truck, end: false, perm: "courier_manifests.read_all" },
  { to: "/couriers", labelKey: "nav.couriers", icon: Truck, end: false, perm: "couriers.read" },
  {
    to: "/delivery-zones",
    labelKey: "nav.deliveryZones",
    icon: MapPin,
    end: false,
    perm: "delivery_zones.read",
  },
  { to: "/merchants", labelKey: "nav.merchants", icon: Package, end: false, perm: "merchants.read" },
  {
    to: "/collections",
    labelKey: "nav.collections",
    icon: Banknote,
    end: false,
    perm: "collections.read",
  },
  {
    to: "/accounts",
    labelKey: "nav.accounts",
    icon: Banknote,
    end: false,
    perm: "accounts.read",
  },
  { to: "/warehouses", labelKey: "nav.warehouses", icon: Warehouse, end: true, perm: "warehouses.read" },
  { to: "/settings", labelKey: "nav.settings", icon: Settings, end: false, perm: undefined },
] as const

const customerServiceNavConfig = [
  { to: "/cs/shipments", labelKey: "nav.shipments", icon: Package, end: false, perm: "shipments.read" },
  { to: "/cs/merchant-orders", labelKey: "nav.merchantOrders", icon: Boxes, end: false, perm: "merchant_orders.read" },
  { to: "/cs/merchant-orders/pending-confirmations", labelKey: "nav.merchantOrderConfirmations", icon: Boxes, end: false, perm: "merchant_orders.confirm" },
  { to: "/cs/couriers", labelKey: "nav.couriers", icon: Truck, end: false, perm: "couriers.read" },
  { to: "/settings", labelKey: "nav.settings", icon: Settings, end: false, perm: undefined },
] as const

export function Sidebar() {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useTheme()
  const location = useLocation()
  const { open, setOpen } = useSidebar()
  const navigate = useNavigate()
  const { user, logout, accessToken } = useAuth()
  const isEn = i18n.language.startsWith("en")
  const perms = user?.permissions ?? []
  const token = accessToken ?? ""

  const hubId = useMemo(() => {
    if (!user) return null
    if (isWarehouseAdmin(user)) return user.adminWarehouse?.id ?? null
    if (isWarehouseStaff(user)) return user.warehouseId ?? null
    return null
  }, [user])

  const hubSiteQuery = useQuery({
    queryKey: ["sidebar-warehouse-site", token, hubId],
    queryFn: () => getWarehouseSite(token, hubId!),
    enabled: !!token && !!hubId && (isWarehouseStaff(user) || isWarehouseAdmin(user)),
  })

  const isMainHub = hubSiteQuery.data != null && isMainBranch(hubSiteQuery.data)

  const navConfig = useMemo(() => {
    const check = (p?: string) => (p ? perms.includes(p) : true)
    if (user?.role === "CUSTOMER_SERVICE") {
      return customerServiceNavConfig.filter((item) => {
        if (item.to === "/cs/merchant-orders/pending-confirmations") {
          if (!user) return false
          if (perms.includes("merchant_orders.confirm")) return true
          return isMerchantUser(user) && perms.includes("merchant_orders.read")
        }
        return check(item.perm)
      })
    }
    if (isWarehouseAdmin(user)) {
      if (user?.adminWarehouse?.id) {
        const hubItems = buildHubWarehouseNavItems(user.adminWarehouse.id, isMainHub)
        return [
          {
            to: "/dashboard/warehouse",
            labelKey: "nav.dashboard" as const,
            icon: LayoutDashboard,
            end: true,
            perm: undefined,
          },
          ...hubItems,
        ].filter((item) => check(item.perm))
      }
      return [
        {
          to: "/dashboard/warehouse",
          labelKey: "nav.dashboard" as const,
          icon: LayoutDashboard,
          end: true,
          perm: undefined,
        },
        {
          to: "/settings",
          labelKey: "nav.settings" as const,
          icon: Settings,
          end: false,
          perm: undefined,
        },
      ]
    }
    if (user && isWarehouseStaff(user)) {
      if (user.warehouseId) {
        return buildHubWarehouseNavItems(user.warehouseId, isMainHub).filter((item) =>
          check(item.perm),
        )
      }
      return [
        {
          to: "/warehouse",
          labelKey: "nav.myWarehouse" as const,
          icon: Warehouse,
          end: true,
          perm: "warehouses.read" as const,
        },
        {
          to: "/settings",
          labelKey: "nav.settings" as const,
          icon: Settings,
          end: false,
          perm: undefined,
        },
      ] as const
    }
    return adminNavConfig.filter((item) => {
      if (item.to === "/merchant-orders/pending-confirmations") {
        if (!user) return false
        if (perms.includes("merchant_orders.confirm")) return true
        return isMerchantUser(user) && perms.includes("merchant_orders.read")
      }
      return check(item.perm)
    })
  }, [user, isMainHub, perms])

  function onSignOut() {
    setOpen(false)
    logout()
    void navigate("/login", { replace: true })
  }

  return (
    <aside
      id="app-sidebar"
      aria-label={t("a11y.mainNav")}
      className={cn(
        "nav-shell border-sidebar-border text-sidebar-foreground fixed top-0 start-0 z-50 flex h-dvh w-[min(286px,88vw)] flex-col border-e shadow-xl transition-transform duration-300 ease-out lg:w-[286px] lg:shadow-none",
        open
          ? "translate-x-0"
          : "max-lg:ltr:-translate-x-full max-lg:rtl:translate-x-full"
      )}
    >
      <div className="flex h-[76px] shrink-0 items-center border-b border-sidebar-border/90 px-5 sm:px-6">
        <img
          src="/logo.svg"
          alt="Orbex"
          className="h-9 w-auto object-contain"
          loading="eager"
        />
      </div>
      <nav className="flex flex-1 flex-col gap-2.5 overflow-y-auto scrollbar-hide p-4 sm:p-5">
        {navConfig.map(({ to, labelKey, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setOpen(false)}
            className={({ isActive }) => {
              let finalIsActive = isActive
              if (user && (isWarehouseStaff(user) || isWarehouseAdmin(user))) {
                finalIsActive = isWarehouseStaffNavItemActive(location, to)
              } else if (to === "/merchant-orders" && location.pathname.startsWith("/merchant-orders/pending-confirmations")) {
                finalIsActive = false
              } else if (to === "/cs/merchant-orders" && location.pathname.startsWith("/cs/merchant-orders/pending-confirmations")) {
                finalIsActive = false
              }

              return cn(
                "nav-item group flex min-h-12 items-center gap-3 rounded-xl px-3.5 py-3 text-[0.95rem] font-medium transition-all duration-200",
                finalIsActive
                  ? "nav-item-active ps-7 text-sidebar-primary font-semibold"
                  : "text-muted-foreground hover:text-sidebar-accent-foreground hover:-translate-y-px"
              )
            }}
          >
            <Icon className="size-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110" aria-hidden />
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>
      <div className="border-sidebar-border shrink-0 border-t px-4 pt-3 pb-1.5 sm:px-5 sm:pt-4 sm:pb-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-full gap-1.5 px-3 text-xs shadow-sm [&_svg]:size-3.5"
          onClick={onSignOut}
        >
          <LogOut className="shrink-0" aria-hidden />
          {t("header.signOut")}
        </Button>
      </div>
      <div className="border-sidebar-border border-t p-4 sm:p-5 flex flex-col gap-5">
        <div role="group" aria-label={t("dashboard.language.label")}>
          <p className="mb-3 text-xs font-semibold tracking-wide uppercase opacity-80">
            {t("dashboard.language.label")}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={isEn ? "default" : "outline"}
              aria-pressed={isEn}
              className="min-w-[5.25rem] shadow-sm"
              onClick={() => void i18n.changeLanguage("en")}
            >
              {t("dashboard.language.en")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={!isEn ? "default" : "outline"}
              aria-pressed={!isEn}
              className="min-w-[5.25rem] shadow-sm"
              onClick={() => void i18n.changeLanguage("ar")}
            >
              {t("dashboard.language.ar")}
            </Button>
          </div>
        </div>

        <div role="group" aria-label="Theme">
          <p className="mb-3 text-xs font-semibold tracking-wide uppercase opacity-80">
            {isEn ? "Theme" : "المظهر"}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={theme === "light" ? "default" : "outline"}
              onClick={() => setTheme("light")}
              className="flex-1 shadow-sm"
              title={isEn ? "Light Theme" : "فاتح"}
            >
              <Sun className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={theme === "dark" ? "default" : "outline"}
              onClick={() => setTheme("dark")}
              className="flex-1 shadow-sm"
              title={isEn ? "Dark Theme" : "داكن"}
            >
              <Moon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={theme === "system" ? "default" : "outline"}
              onClick={() => setTheme("system")}
              className="flex-1 shadow-sm"
              title={isEn ? "System Theme" : "النظام"}
            >
              <Monitor className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  )
}
