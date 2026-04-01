import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

type SidebarContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  const toggle = useCallback(() => {
    setOpen((o) => !o)
  }, [])

  const value = useMemo(
    () => ({ open, setOpen, toggle }),
    [open, toggle]
  )

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    const onViewportChange = () => {
      if (mq.matches) setOpen(false)
    }
    mq.addEventListener("change", onViewportChange)
    return () => mq.removeEventListener("change", onViewportChange)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)")
    if (!open || !mq.matches) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  )
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) {
    throw new Error("useSidebar must be used within SidebarProvider")
  }
  return ctx
}
