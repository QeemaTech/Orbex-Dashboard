export function autoPrintWhenVisible(
  opts?: {
    delayMs?: number
    /**
     * Extra resilience: if focus/visibility events are flaky (varies by browser/hosting),
     * poll until the tab becomes visible, then print once.
     */
    maxWaitMs?: number
    pollIntervalMs?: number
  },
): () => void {
  const delayMs = opts?.delayMs ?? 400
  const maxWaitMs = opts?.maxWaitMs ?? 10_000
  const pollIntervalMs = opts?.pollIntervalMs ?? 200

  let printTimeoutId: number | null = null
  let pollTimeoutId: number | null = null
  let didPrint = false
  const startedAt = Date.now()

  const clearTimers = () => {
    if (printTimeoutId != null) {
      window.clearTimeout(printTimeoutId)
      printTimeoutId = null
    }
    if (pollTimeoutId != null) {
      window.clearTimeout(pollTimeoutId)
      pollTimeoutId = null
    }
  }

  const cleanupListeners = () => {
    document.removeEventListener("visibilitychange", onVisibilityChange)
    window.removeEventListener("focus", onFocus)
    window.removeEventListener("pageshow", onPageShow)
  }

  const schedulePrint = () => {
    if (didPrint) return
    didPrint = true
    clearTimers()
    printTimeoutId = window.setTimeout(() => {
      window.print()
    }, delayMs)
  }

  const isVisible = () =>
    typeof document !== "undefined" && document.visibilityState === "visible"

  const maybePrintNow = () => {
    if (isVisible()) {
      cleanupListeners()
      schedulePrint()
    }
  }

  function poll() {
    if (didPrint) return
    if (isVisible()) {
      maybePrintNow()
      return
    }
    if (Date.now() - startedAt >= maxWaitMs) {
      cleanupListeners()
      return
    }
    pollTimeoutId = window.setTimeout(poll, pollIntervalMs)
  }

  function onVisibilityChange() {
    maybePrintNow()
  }

  function onFocus() {
    maybePrintNow()
  }

  function onPageShow() {
    // Helps with bfcache / delayed page activation in some browsers.
    maybePrintNow()
  }

  // If already visible, print after a small delay.
  // Otherwise, wait until the tab becomes visible/focused, and also poll briefly.
  if (isVisible()) {
    schedulePrint()
  } else {
    document.addEventListener("visibilitychange", onVisibilityChange, { once: false })
    window.addEventListener("focus", onFocus, { once: false })
    window.addEventListener("pageshow", onPageShow, { once: false })
    poll()
    // In case we're already visible but the state hasn't updated yet.
    maybePrintNow()
  }

  return () => {
    clearTimers()
    cleanupListeners()
  }
}
