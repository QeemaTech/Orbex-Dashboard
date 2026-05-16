import { Input } from "@/components/ui/input"

export function LocalizedFieldPair(props: {
  enLabel: string
  arLabel: string
  enValue: string
  arValue: string
  onEnChange: (value: string) => void
  onArChange: (value: string) => void
  enPlaceholder?: string
  arPlaceholder?: string
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{props.enLabel}</label>
        <Input
          value={props.enValue}
          onChange={(e) => props.onEnChange(e.target.value)}
          placeholder={props.enPlaceholder}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{props.arLabel}</label>
        <Input
          value={props.arValue}
          onChange={(e) => props.onArChange(e.target.value)}
          placeholder={props.arPlaceholder}
          dir="rtl"
          className="text-right"
        />
      </div>
    </div>
  )
}
