import { Menu, Search } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { useSidebar } from "@/components/layout/sidebar-context"
import { NotificationMenu } from "@/components/notifications/NotificationMenu"
import { useAuth } from "@/lib/auth-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

export interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  const { t } = useTranslation()
  const { open, toggle } = useSidebar()
  const { accessToken, logout, user } = useAuth()
  const navigate = useNavigate()

  function onSignOut() {
    logout()
    void navigate("/login", { replace: true })
  }

  return (
    <header className="bg-background/78 border-border/80 sticky top-0 z-30 border-b backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[100vw] flex-wrap items-center gap-x-3 gap-y-3 px-4 py-3 md:h-[74px] md:flex-nowrap md:gap-4 md:px-6 md:py-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-foreground order-1 shrink-0 border border-border/70 bg-white/70 lg:hidden"
          aria-controls="app-sidebar"
          aria-expanded={open}
          aria-label={open ? t("a11y.closeNav") : t("a11y.openNav")}
          onClick={toggle}
        >
          <Menu className="size-5" aria-hidden />
        </Button>

        <h1 className="text-foreground order-2 min-w-0 max-md:flex-1 truncate text-lg font-semibold md:max-w-[11rem] md:text-[1.35rem] lg:max-w-sm">
          {title}
        </h1>

        <div className="order-3 ms-auto flex shrink-0 items-center gap-2 md:order-last md:ms-0 md:gap-3">
          <NotificationMenu token={accessToken} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full border border-border/75 bg-white/80"
                aria-label={t("a11y.userMenu")}
              >
                <Avatar className="size-9 ring-2 ring-primary/15">
                  <AvatarFallback className="gradient-primary text-primary-foreground text-sm font-semibold">
                    {user?.fullName?.charAt(0)?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>{t("header.account")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>{t("header.profile")}</DropdownMenuItem>
              <DropdownMenuItem>{t("header.settings")}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSignOut}>
                {t("header.signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="order-4 w-full min-w-0 basis-full md:order-3 md:w-auto md:max-w-xl md:flex-1 md:basis-0 lg:max-w-md">
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2" />
            <Input
              type="search"
              placeholder={t("header.searchPlaceholder")}
              className="w-full border-white/70 bg-white/80 ps-9 shadow-sm"
              aria-label={t("a11y.search")}
            />
          </div>
        </div>
      </div>
    </header>
  )
}
