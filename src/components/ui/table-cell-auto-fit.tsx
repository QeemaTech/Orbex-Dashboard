import * as React from "react"
import { useLayoutEffect, useRef, useState } from "react"
import { Copy } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const MIN_FONT_PX = 11
const EPS = 1

function walkChildren(
  node: React.ReactNode,
  visitor: (el: React.ReactElement) => boolean,
  depth: number,
): boolean {
  if (depth > 12) return true
  if (node == null || typeof node === "boolean") return false
  if (typeof node === "string" || typeof node === "number") return false
  if (Array.isArray(node)) {
    return node.some((c) => walkChildren(c, visitor, depth))
  }
  if (!React.isValidElement(node)) return false
  if (node.type === React.Fragment) {
    return walkChildren(
      (node.props as { children?: React.ReactNode }).children,
      visitor,
      depth,
    )
  }
  if (visitor(node)) return true
  return walkChildren(
    (node.props as { children?: React.ReactNode }).children,
    visitor,
    depth + 1,
  )
}

/** True if cell should skip single-line font shrink (interactive or flex/grid layouts). */
export function shouldSkipAutoFit(children: React.ReactNode): boolean {
  return walkChildren(
    children,
    (el) => {
      const t = el.type
      if (t === "button" || t === "a") return true
      if (t === "input" || t === "select" || t === "textarea") return true
      const p = el.props as {
        className?: string
        role?: string
        children?: React.ReactNode
      }
      if (p.role === "button" || p.role === "checkbox") return true
      const cls = typeof p.className === "string" ? p.className : ""
      if (
        /\b(flex|grid|inline-flex|inline-grid)\b/.test(cls)
      ) {
        return true
      }
      return false
    },
    0,
  )
}

function hasRenderableText(node: React.ReactNode): boolean {
  if (node == null || typeof node === "boolean") return false
  if (typeof node === "string") return node.trim().length > 0
  if (typeof node === "number") return true
  if (Array.isArray(node)) return node.some(hasRenderableText)
  if (!React.isValidElement(node)) return false
  if (node.type === React.Fragment) {
    return hasRenderableText(
      (node.props as { children?: React.ReactNode }).children,
    )
  }
  return hasRenderableText(
    (node.props as { children?: React.ReactNode }).children,
  )
}

/** Conservative: auto-fit only when there is text and no interactive / flex layout. */
export function shouldAutoFitChildren(children: React.ReactNode): boolean {
  if (!hasRenderableText(children)) return false
  return !shouldSkipAutoFit(children)
}

function extractPlainTitle(node: React.ReactNode, max = 800): string | undefined {
  if (node == null || typeof node === "boolean") return undefined
  if (typeof node === "string" || typeof node === "number") {
    const s = String(node).trim()
    return s ? s.slice(0, max) : undefined
  }
  if (Array.isArray(node)) {
    const parts = node
      .map((c) => extractPlainTitle(c, max))
      .filter(Boolean) as string[]
    const joined = parts.join(" ").trim()
    return joined ? joined.slice(0, max) : undefined
  }
  if (!React.isValidElement(node)) return undefined
  if (node.type === React.Fragment) {
    return extractPlainTitle(
      (node.props as { children?: React.ReactNode }).children,
      max,
    )
  }
  return extractPlainTitle(
    (node.props as { children?: React.ReactNode }).children,
    max,
  )
}

type TableCellAutoFitProps = {
  children: React.ReactNode
  /** Optional native tooltip when text is shrunk or clipped. */
  title?: string
}

export function TableCellAutoFit({ children, title }: TableCellAutoFitProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const lastOverflowRef = useRef<boolean | null>(null)
  const [copied, setCopied] = useState(false)
  const copyTimeoutRef = useRef<number | undefined>(undefined)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const applySize = (px: number) => {
      el.style.fontSize = `${px}px`
    }

    const measure = () => {
      el.style.fontSize = ""
      const cw = el.clientWidth
      if (cw < 1) return

      const computed = getComputedStyle(el)
      let maxSize = parseFloat(computed.fontSize)
      if (!Number.isFinite(maxSize) || maxSize <= 0) maxSize = 14

      const floor = Math.min(MIN_FONT_PX, maxSize)
      let low = floor
      let high = maxSize
      let best = floor

      while (high - low > 0.25) {
        const mid = (low + high) / 2
        applySize(mid)
        if (el.scrollWidth <= el.clientWidth + EPS) {
          best = mid
          low = mid
        } else {
          high = mid
        }
      }
      applySize(best)

      const overflowNow = el.scrollWidth > el.clientWidth + EPS
      if (lastOverflowRef.current !== overflowNow) {
        lastOverflowRef.current = overflowNow
        setIsOverflowing(overflowNow)
      }
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => {
      ro.disconnect()
      el.style.fontSize = ""
    }
  }, [children])

  useLayoutEffect(() => {
    if (!copied) return
    window.clearTimeout(copyTimeoutRef.current)
    copyTimeoutRef.current = window.setTimeout(() => setCopied(false), 1200)
    return () => window.clearTimeout(copyTimeoutRef.current)
  }, [copied])

  const canReveal = Boolean(title && isOverflowing)

  const content = (
    <div
      ref={ref}
      className="min-w-0 w-full max-w-full overflow-hidden text-ellipsis whitespace-nowrap leading-normal [overflow-wrap:normal]"
      title={title}
    >
      {children}
    </div>
  )

  if (!canReveal) return content

  const onCopy = async () => {
    if (!title) return
    try {
      await navigator.clipboard.writeText(title)
      setCopied(true)
    } catch {
      try {
        const ta = document.createElement("textarea")
        ta.value = title
        ta.style.position = "fixed"
        ta.style.left = "-9999px"
        ta.style.top = "0"
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        document.execCommand("copy")
        document.body.removeChild(ta)
        setCopied(true)
      } catch {
        // ignore
      }
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="block w-full min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          aria-label="Show full cell content"
        >
          {content}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        className="w-[min(36rem,calc(100vw-2rem))] max-w-[36rem]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={onCopy}
          >
            <Copy className="size-3.5" />
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <div className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words text-sm leading-relaxed">
          {title}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { extractPlainTitle }
