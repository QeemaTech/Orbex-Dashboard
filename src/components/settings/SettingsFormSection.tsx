import type { ReactNode } from "react"

export function SettingsFormSection(props: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">{props.title}</h3>
        {props.description ? (
          <p className="text-muted-foreground text-xs leading-relaxed">{props.description}</p>
        ) : null}
      </div>
      {props.children}
    </section>
  )
}
