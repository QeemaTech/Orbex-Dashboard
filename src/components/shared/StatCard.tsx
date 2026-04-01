import type { ComponentType } from "react"
import { useTranslation } from "react-i18next"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type StatAccent = "primary" | "success" | "warning" | "destructive"

const accentStyles: Record<
  StatAccent,
  {
    iconWrap: string
    icon: string
    badge: string
    progressTrack: string
    progressFill: string
  }
> = {
  primary: {
    iconWrap: "bg-indigo-500/12",
    icon: "text-primary",
    badge: "bg-primary/12 text-primary",
    progressTrack: "bg-primary/12",
    progressFill: "bg-primary",
  },
  success: {
    iconWrap: "bg-emerald-500/12",
    icon: "text-success",
    badge: "bg-success/12 text-success",
    progressTrack: "bg-success/12",
    progressFill: "bg-success",
  },
  warning: {
    iconWrap: "bg-amber-500/12",
    icon: "text-warning",
    badge: "bg-warning/12 text-warning",
    progressTrack: "bg-warning/12",
    progressFill: "bg-warning",
  },
  destructive: {
    iconWrap: "bg-rose-500/12",
    icon: "text-destructive",
    badge: "bg-destructive/12 text-destructive",
    progressTrack: "bg-destructive/12",
    progressFill: "bg-destructive",
  },
}

export interface StatCardProps {
  title: string
  value: number | string
  percentage?: number
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  accent: StatAccent
}

function resolveNumberLocale(language: string) {
  return language.startsWith("ar") ? "ar-EG" : "en-EG"
}

export function StatCard({
  title,
  value,
  percentage = 0,
  icon: Icon,
  accent,
}: StatCardProps) {
  const { i18n } = useTranslation()
  const locale = resolveNumberLocale(i18n.language)
  const a = accentStyles[accent]
  const safePercentage = Math.max(0, Math.min(100, Number.isFinite(percentage) ? percentage : 0))
  const badgeLabel = `${safePercentage > 0 ? "+" : ""}${safePercentage}%`

  return (
    <Card className="dashboard-card dashboard-card-hover dashboard-animate-in h-full gap-0 rounded-[1.5rem] border px-5 py-4">
      <CardHeader className="space-y-0 px-0 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className={cn("flex size-11 items-center justify-center rounded-full", a.iconWrap)}>
            <Icon className={cn("size-6", a.icon)} aria-hidden />
          </div>
          <span
            className={cn(
              "inline-flex min-w-[3.1rem] items-center justify-center rounded-full px-2 py-1 text-xs font-semibold tabular-nums",
              a.badge
            )}
          >
            {badgeLabel}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-0 pb-4">
        <CardTitle className="text-muted-foreground line-clamp-2 text-sm font-medium leading-snug">
          {title}
        </CardTitle>
        <p className="text-foreground text-[2.1rem] leading-none font-bold tabular-nums tracking-tight">
          {typeof value === "number" ? value.toLocaleString(locale) : value}
        </p>
      </CardContent>
      <div className={cn("h-1 w-full overflow-hidden rounded-full", a.progressTrack)}>
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 ease-out", a.progressFill)}
          style={{ width: `${safePercentage}%` }}
          aria-hidden
        />
      </div>
    </Card>
  )
}
