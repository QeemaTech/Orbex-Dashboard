import { LogOut } from "lucide-react"
import {
  Banknote,
  LayoutDashboard,
  MapPin,
  Package,
  Truck,
  Users,
  Warehouse,
} from "react-lucid"
import { useTranslation } from "react-i18next"
import { NavLink, useNavigate } from "react-router-dom"

import { useSidebar } from "@/components/layout/sidebar-context"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

const adminNavConfig = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true },
  { to: "/users", labelKey: "nav.users", icon: Users, end: false },
  { to: "/shipments", labelKey: "nav.shipments", icon: Package, end: false },
  { to: "/couriers", labelKey: "nav.couriers", icon: Truck, end: false },
  { to: "/merchants", labelKey: "nav.merchants", icon: Package, end: false },
  {
    to: "/collections",
    labelKey: "nav.collections",
    icon: Banknote,
    end: false,
  },
  { to: "/warehouse", labelKey: "nav.warehouse", icon: Warehouse, end: true },
  { to: "/warehouse/sites", labelKey: "nav.warehouses", icon: MapPin, end: true },
] as const

const customerServiceNavConfig = [
  { to: "/cs/shipments", labelKey: "nav.shipments", icon: Package, end: false },
  { to: "/cs/couriers", labelKey: "nav.couriers", icon: Truck, end: false },
] as const

const warehouseNavConfig = [
  { to: "/warehouse", labelKey: "nav.warehouse", icon: Warehouse, end: true },
] as const

const warehouseAdminNavConfig = [
  { to: "/warehouse", labelKey: "nav.warehouse", icon: Warehouse, end: true },
  { to: "/warehouse/sites", labelKey: "nav.warehouseSites", icon: MapPin, end: true },
] as const

export function Sidebar() {
  const { t, i18n } = useTranslation()
  const { open, setOpen } = useSidebar()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const isEn = i18n.language.startsWith("en")

  function onSignOut() {
    setOpen(false)
    logout()
    void navigate("/login", { replace: true })
  }
  const navConfig =
    user?.role === "CUSTOMER_SERVICE"
      ? [...customerServiceNavConfig]
      : user?.role === "WAREHOUSE"
        ? [...warehouseNavConfig]
        : user?.role === "WAREHOUSE_ADMIN"
          ? [...warehouseAdminNavConfig]
          : [...adminNavConfig]

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
      <nav className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-4 sm:p-5">
        {navConfig.map(({ to, labelKey, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cn(
                "nav-item group flex min-h-12 items-center gap-3 rounded-xl px-3.5 py-3 text-[0.95rem] font-medium transition-all duration-200",
                isActive
                  ? "nav-item-active ps-7 text-sidebar-primary font-semibold"
                  : "text-muted-foreground hover:text-sidebar-accent-foreground hover:-translate-y-px"
              )
            }
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
      <div
        className="border-sidebar-border border-t p-4 sm:p-5"
        role="group"
        aria-label={t("dashboard.language.label")}
      >
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
    </aside>
  )
}
