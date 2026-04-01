import {
  Banknote,
  LayoutDashboard,
  Package,
  Truck,
  Warehouse,
} from "react-lucid"
import { useTranslation } from "react-i18next"
import { NavLink } from "react-router-dom"

import { useSidebar } from "@/components/layout/sidebar-context"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

const adminNavConfig = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true },
  { to: "/shipments", labelKey: "nav.shipments", icon: Package, end: false },
  { to: "/warehouse", labelKey: "nav.warehouse", icon: Warehouse, end: false },
  { to: "/couriers", labelKey: "nav.couriers", icon: Truck, end: false },
  {
    to: "/collections",
    labelKey: "nav.collections",
    icon: Banknote,
    end: false,
  },
] as const

const customerServiceNavConfig = [
  { to: "/cs/shipments", labelKey: "nav.shipments", icon: Package, end: false },
  { to: "/cs/couriers", labelKey: "nav.couriers", icon: Truck, end: false },
] as const

const warehouseNavConfig = [
  { to: "/warehouse", labelKey: "nav.warehouse", icon: Warehouse, end: true },
] as const

export function Sidebar() {
  const { t } = useTranslation()
  const { open, setOpen } = useSidebar()
  const { user } = useAuth()
  const navConfig =
    user?.role === "CUSTOMER_SERVICE"
      ? [...customerServiceNavConfig]
      : user?.role === "WAREHOUSE"
        ? [...warehouseNavConfig]
        : [...adminNavConfig]

  return (
    <aside
      id="app-sidebar"
      aria-label={t("a11y.mainNav")}
      className={cn(
        "border-sidebar-border bg-sidebar text-sidebar-foreground fixed top-0 start-0 z-50 flex h-dvh w-[min(260px,85vw)] flex-col border-e shadow-lg transition-transform duration-200 ease-out lg:w-[260px] lg:shadow-none",
        open
          ? "translate-x-0"
          : "max-lg:ltr:-translate-x-full max-lg:rtl:translate-x-full"
      )}
    >
      <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-4 sm:px-6">
        <span className="text-primary text-xl font-bold tracking-tight">
          Orbex
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3 sm:p-4">
        {navConfig.map(({ to, labelKey, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )
            }
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
