export function autoPrintWhenVisible(opts?: { delayMs?: number }): () => void {
  const delayMs = opts?.delayMs ?? 400

  let timeoutId: number | null = null
  let didPrint = false

  const clearTimer = () => {
    if (timeoutId != null) {
      window.clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  const cleanupListeners = () => {
    document.removeEventListener("visibilitychange", onVisibilityChange)
    window.removeEventListener("focus", onFocus)
  }

  const schedulePrint = () => {
    if (didPrint) return
    didPrint = true
    clearTimer()
    timeoutId = window.setTimeout(() => {
      window.print()
    }, delayMs)
  }

  const maybePrintNow = () => {
    if (document.visibilityState === "visible") {
      cleanupListeners()
      schedulePrint()
    }
  }

  const onVisibilityChange = () => {
    maybePrintNow()
  }

  const onFocus = () => {
    maybePrintNow()
  }

  // If already visible, print after a small delay.
  // Otherwise, wait until the tab becomes visible/focused.
  if (typeof document !== "undefined" && document.visibilityState === "visible") {
    schedulePrint()
  } else {
    document.addEventListener("visibilitychange", onVisibilityChange, { once: false })
    window.addEventListener("focus", onFocus, { once: false })
    // In case we're already visible but focus/visibility didn't update yet.
    maybePrintNow()
  }

  return () => {
    clearTimer()
    cleanupListeners()
  }
}
