type ToastType = "info" | "success" | "error"

const CONTAINER_ID = "orbex-toast-container"

function getContainer(): HTMLDivElement {
  let container = document.getElementById(CONTAINER_ID) as HTMLDivElement | null
  if (container) return container
  container = document.createElement("div")
  container.id = CONTAINER_ID
  Object.assign(container.style, {
    position: "fixed",
    top: "16px",
    right: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    zIndex: "9999",
    pointerEvents: "none",
  } as CSSStyleDeclaration)
  document.body.appendChild(container)
  return container
}

function resolveColors(type: ToastType): { bg: string; fg: string } {
  if (type === "success") return { bg: "#166534", fg: "#ffffff" }
  if (type === "error") return { bg: "#991b1b", fg: "#ffffff" }
  return { bg: "#1f2937", fg: "#ffffff" }
}

export function showToast(message: string, type: ToastType = "info"): void {
  if (typeof window === "undefined" || !message.trim()) return
  const container = getContainer()
  const toast = document.createElement("div")
  const { bg, fg } = resolveColors(type)
  toast.textContent = message
  Object.assign(toast.style, {
    background: bg,
    color: fg,
    borderRadius: "8px",
    padding: "10px 12px",
    minWidth: "220px",
    maxWidth: "360px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
    fontSize: "13px",
    lineHeight: "18px",
    opacity: "0",
    transform: "translateY(-6px)",
    transition: "opacity .2s ease, transform .2s ease",
    pointerEvents: "auto",
  } as CSSStyleDeclaration)
  container.appendChild(toast)
  requestAnimationFrame(() => {
    toast.style.opacity = "1"
    toast.style.transform = "translateY(0)"
  })
  window.setTimeout(() => {
    toast.style.opacity = "0"
    toast.style.transform = "translateY(-6px)"
    window.setTimeout(() => {
      toast.remove()
    }, 220)
  }, 2600)
}
