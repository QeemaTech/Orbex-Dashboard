import { useEffect, type ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { Header } from "@/components/layout/Header"
import {
  SidebarProvider,
  useSidebar,
} from "@/components/layout/sidebar-context"
import { Sidebar } from "@/components/layout/Sidebar"

export interface LayoutProps {
  title: string
  children: ReactNode
}

function LayoutInner({ title, children }: LayoutProps) {
  const { t } = useTranslation()
  const { open, setOpen } = useSidebar()

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, setOpen])

  return (
    <div className="bg-background bg-dashboard-surface min-h-dvh">
      <Sidebar />
      {open ? (
        <button
          type="button"
          aria-label={t("a11y.closeNavBackdrop")}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <div className="flex min-h-dvh flex-col lg:ms-[280px]">
        <Header title={title} />
        <main className="flex-1 p-4 md:p-6 xl:p-8">{children}</main>
      </div>
    </div>
  )
}

export function Layout({ title, children }: LayoutProps) {
  return (
    <SidebarProvider>
      <LayoutInner title={title}>{children}</LayoutInner>
    </SidebarProvider>
  )
}
