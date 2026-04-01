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
import { Button } from "@/components/ui/button"
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
  const { t, i18n } = useTranslation()
  const { open, setOpen } = useSidebar()
  const { user } = useAuth()
  const isEn = i18n.language.startsWith("en")
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
        "border-sidebar-border text-sidebar-foreground fixed top-0 start-0 z-50 flex h-dvh w-[min(280px,88vw)] flex-col border-e bg-gradient-to-b from-white via-[#f8faff] to-[#f1f5ff] shadow-xl transition-transform duration-300 ease-out lg:w-[280px] lg:shadow-none",
        open
          ? "translate-x-0"
          : "max-lg:ltr:-translate-x-full max-lg:rtl:translate-x-full"
      )}
    >
      <div className="flex h-[72px] shrink-0 items-center border-b border-sidebar-border/90 px-5 sm:px-6">
        <span className="text-primary text-2xl font-bold tracking-tight">
          Orbex
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-2 overflow-y-auto p-4 sm:p-5">
        {navConfig.map(({ to, labelKey, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cn(
                "group flex min-h-12 items-center gap-3 rounded-xl px-3.5 py-3 text-[0.95rem] font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary border border-primary/20 font-semibold shadow-sm"
                  : "text-muted-foreground hover:bg-sidebar-accent/75 hover:text-sidebar-accent-foreground hover:-translate-y-px"
              )
            }
          >
            <Icon className="size-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110" aria-hidden />
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>
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
            className="min-w-[5.25rem]"
            onClick={() => void i18n.changeLanguage("en")}
          >
            {t("dashboard.language.en")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={!isEn ? "default" : "outline"}
            aria-pressed={!isEn}
            className="min-w-[5.25rem]"
            onClick={() => void i18n.changeLanguage("ar")}
          >
            {t("dashboard.language.ar")}
          </Button>
        </div>
      </div>
    </aside>
  )
}
