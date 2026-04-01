import type { LucideIcon } from "lucide-react"
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
  { bar: string; iconWrap: string; icon: string }
> = {
  primary: {
    bar: "bg-primary",
    iconWrap: "bg-primary/10",
    icon: "text-primary",
  },
  success: {
    bar: "bg-success",
    iconWrap: "bg-success/10",
    icon: "text-success",
  },
  warning: {
    bar: "bg-warning",
    iconWrap: "bg-warning/10",
    icon: "text-warning",
  },
  destructive: {
    bar: "bg-destructive",
    iconWrap: "bg-destructive/10",
    icon: "text-destructive",
  },
}

export interface StatCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  accent: StatAccent
}

function resolveNumberLocale(language: string) {
  return language.startsWith("ar") ? "ar-EG" : "en-EG"
}

export function StatCard({ title, value, icon: Icon, accent }: StatCardProps) {
  const { i18n } = useTranslation()
  const locale = resolveNumberLocale(i18n.language)
  const a = accentStyles[accent]

  return (
    <Card className="relative overflow-hidden pt-0">
      <div
        className={cn("absolute top-0 start-0 h-1 w-full rounded-t-xl", a.bar)}
        aria-hidden
      />
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-muted-foreground line-clamp-2 pe-1 text-sm font-medium leading-snug">
          {title}
        </CardTitle>
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-lg",
            a.iconWrap
          )}
        >
          <Icon className={cn("size-5", a.icon)} aria-hidden />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-foreground text-2xl font-bold tabular-nums tracking-tight">
          {typeof value === "number" ? value.toLocaleString(locale) : value}
        </p>
      </CardContent>
    </Card>
  )
}
