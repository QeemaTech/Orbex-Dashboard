import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { PackagingMaterialRequest } from "@/api/packaging-material-requests-api"
import { packagingMaterialRequestPaymentMethods } from "@/api/packaging-material-requests-api"
import { usePatchPackagingMaterialRequestPayment } from "@/features/packaging-material/hooks/use-packaging-material"
import { showToast } from "@/lib/toast"

const PAYMENT_METHOD_OPTIONS = [
  { value: "CASH", label: "Cash" },
  { value: "INSTAPAY", label: "InstaPay" },
  { value: "VISA", label: "Card (Visa)" },
] as const satisfies Array<{
  value: (typeof packagingMaterialRequestPaymentMethods)[number]
  label: string
}>

export function PackagingRequestPaymentForm(props: {
  token: string
  requestId: string
  /** When provided, shows balance summary and “Pay remainder”. */
  request?: PackagingMaterialRequest | null
}) {
  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [notes, setNotes] = useState("")
  const mutation = usePatchPackagingMaterialRequestPayment(props.token)

  const balanceSummary = useMemo(() => {
    const r = props.request
    if (!r) return null
    const due = Number(r.totalFinalCost ?? r.totalEstimatedCost)
    const collected = Number(r.collectedAmount ?? 0)
    if (!Number.isFinite(due)) return null
    const remainder = Math.max(0, Math.round((due - collected) * 100) / 100)
    return { due, collected, remainder }
  }, [props.request])

  async function onSubmit() {
    const n = Number(amount)
    if (!Number.isFinite(n) || n <= 0) {
      showToast("Enter a valid payment amount", "error")
      return
    }
    if (!paymentMethod.trim()) {
      showToast("Select a payment method", "error")
      return
    }
    try {
      await mutation.mutateAsync({
        id: props.requestId,
        collectedAmount: amount,
        paymentMethod: paymentMethod.trim() as (typeof packagingMaterialRequestPaymentMethods)[number],
        notes: notes.trim() || null,
      })
      setAmount("")
      showToast("Payment recorded", "success")
    } catch (e) {
      showToast((e as Error).message ?? "Could not record payment", "error")
    }
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <p className="text-sm font-semibold">Record payment</p>
      {balanceSummary ? (
        <div className="text-muted-foreground space-y-1 text-xs">
          <p>
            <span className="font-medium text-foreground">Amount due (estimate/final):</span>{" "}
            {balanceSummary.due.toFixed(2)}
          </p>
          <p>
            <span className="font-medium text-foreground">Already collected:</span>{" "}
            {balanceSummary.collected.toFixed(2)}
          </p>
          <p>
            <span className="font-medium text-foreground">Remaining:</span>{" "}
            {balanceSummary.remainder.toFixed(2)}
          </p>
          {balanceSummary.remainder > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-1"
              onClick={() => setAmount(String(balanceSummary.remainder))}
            >
              Fill remaining balance
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1">
          <label className="text-muted-foreground text-xs font-medium">Amount collected</label>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="e.g. 150.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="grid gap-1">
          <label className="text-muted-foreground text-xs font-medium">Payment method</label>
          <select
            className="border-input bg-background h-10 rounded-md border px-3 text-sm"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option value="">Select…</option>
            {PAYMENT_METHOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1 sm:col-span-2">
          <label className="text-muted-foreground text-xs font-medium">Notes (optional)</label>
          <Input
            placeholder="Internal notes for finance / ops"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>
      <Button type="button" size="sm" onClick={() => void onSubmit()} disabled={mutation.isPending}>
        {mutation.isPending ? "Saving…" : "Save payment"}
      </Button>
    </div>
  )
}
