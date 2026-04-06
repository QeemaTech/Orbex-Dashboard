import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { backendOrderPaymentLabel } from "@/features/warehouse/backend-labels"
import {
  endOfTodayIso,
  startOfTodayIso,
} from "@/features/customer-service/lib/date-range"

const PACKAGE_PAYMENT_FILTER_VALUES = [
  "PENDING_COLLECTION",
  "COLLECTED",
  "POS_PENDING",
  "READY_FOR_SETTLEMENT",
  "SETTLED",
  "ON_HOLD",
] as const

function orderPaymentSelectValue(raw: string): string {
  const u = raw.trim().toUpperCase()
  return (PACKAGE_PAYMENT_FILTER_VALUES as readonly string[]).includes(u)
    ? u
    : ""
}

function workflowPresetValue(status: string, subStatus: string): string {
  const s = status.trim().toUpperCase()
  const u = (subStatus.trim() || "NONE").toUpperCase()
  if (!s) return ""
  return `${s}:${u}`
}

export type CsFilterValues = {
  merchantName: string
  courierName: string
  unassignedOnly: boolean
  regionName: string
  phoneSearch: string
  trackingNumber: string
  status: string
  subStatus: string
  paymentStatus: string
  createdFrom: string
  createdTo: string
  overdueOnly: boolean
}

export interface CsShipmentFiltersProps {
  values: CsFilterValues
  onChange: (next: CsFilterValues) => void
  /** When true, shows free-text Core status / Sub status fields (workflow preset always shown). */
  showCoreSubTextInputs?: boolean
}

export function CsShipmentFilters({
  values,
  onChange,
  showCoreSubTextInputs = false,
}: CsShipmentFiltersProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground">Merchant Name</span>
        <Input
          value={values.merchantName}
          placeholder="merchant name"
          onChange={(e) => onChange({ ...values, merchantName: e.target.value })}
          className="min-w-[200px]"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground">Courier Name</span>
        <Input
          value={values.courierName}
          placeholder="courier name"
          onChange={(e) =>
            onChange({ ...values, courierName: e.target.value })
          }
          className="min-w-[200px]"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground">Region Name</span>
        <Input
          value={values.regionName}
          placeholder="region name"
          onChange={(e) => onChange({ ...values, regionName: e.target.value })}
          className="min-w-[200px]"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground">{t("cs.filters.phone")}</span>
        <Input
          value={values.phoneSearch}
          placeholder={t("cs.filters.phonePlaceholder")}
          onChange={(e) =>
            onChange({ ...values, phoneSearch: e.target.value })
          }
          className="min-w-[200px]"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground">
          {t("cs.filters.tracking")}
        </span>
        <Input
          value={values.trackingNumber}
          placeholder={t("cs.filters.trackingPlaceholder")}
          onChange={(e) =>
            onChange({ ...values, trackingNumber: e.target.value })
          }
          className="min-w-[200px]"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground">{t("cs.filters.status")}</span>
        <select
          className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          value={workflowPresetValue(values.status, values.subStatus)}
          onChange={(e) => {
            const v = e.target.value
            if (!v) {
              onChange({ ...values, status: "", subStatus: "" })
              return
            }
            const [st, sub] = v.split(":")
            onChange({
              ...values,
              status: st ?? "",
              subStatus: sub ?? "NONE",
            })
          }}
        >
          <option value="">{t("cs.filters.anyStatus")}</option>
          <option value="PENDING:NONE">
            {t("cs.shipmentStatus.PENDING_ASSIGNMENT")}
          </option>
          <option value="PENDING:CONFIRMED">
            {t("cs.shipmentStatus.CONFIRMED_BY_CS")}
          </option>
          <option value="IN_WAREHOUSE:NONE">
            {t("cs.shipmentStatus.IN_WAREHOUSE")}
          </option>
          <option value="OUT_FOR_DELIVERY:NONE">
            {t("cs.shipmentStatus.OUT_FOR_DELIVERY")}
          </option>
          <option value="OUT_FOR_DELIVERY:ASSIGNED">
            {t("cs.shipmentStatus.ASSIGNED")}
          </option>
          <option value="DELIVERED:NONE">
            {t("cs.shipmentStatus.DELIVERED")}
          </option>
          <option value="RETURNED:REJECTED">
            {t("cs.shipmentStatus.REJECTED")}
          </option>
          <option value="RETURNED:DELAYED">
            {t("cs.shipmentStatus.POSTPONED")}
          </option>
        </select>
      </label>
      {showCoreSubTextInputs ? (
        <>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Core status</span>
            <Input
              value={values.status}
              placeholder="PENDING"
              onChange={(e) => onChange({ ...values, status: e.target.value })}
              className="min-w-[160px]"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Sub status</span>
            <Input
              value={values.subStatus}
              placeholder="DELAYED"
              onChange={(e) =>
                onChange({ ...values, subStatus: e.target.value })
              }
              className="min-w-[160px]"
            />
          </label>
        </>
      ) : null}
      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground">Payment status</span>
        <select
          className="border-input bg-background h-9 min-w-[200px] rounded-md border px-3 text-sm"
          value={orderPaymentSelectValue(values.paymentStatus)}
          onChange={(e) =>
            onChange({ ...values, paymentStatus: e.target.value })
          }
        >
          <option value="">{t("cs.filters.anyPaymentStatus")}</option>
          {PACKAGE_PAYMENT_FILTER_VALUES.map((ps) => (
            <option key={ps} value={ps}>
              {backendOrderPaymentLabel(t, ps)}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground">{t("cs.filters.from")}</span>
        <Input
          type="datetime-local"
          value={isoToLocalInput(values.createdFrom)}
          onChange={(e) =>
            onChange({
              ...values,
              createdFrom: localInputToIso(e.target.value),
            })
          }
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground">{t("cs.filters.to")}</span>
        <Input
          type="datetime-local"
          value={isoToLocalInput(values.createdTo)}
          onChange={(e) =>
            onChange({
              ...values,
              createdTo: localInputToIso(e.target.value),
            })
          }
        />
      </label>
      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          onChange({
            ...values,
            createdFrom: startOfTodayIso(),
            createdTo: endOfTodayIso(),
          })
        }
      >
        {t("cs.filters.today")}
      </Button>
      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.unassignedOnly}
          onChange={(e) =>
            onChange({ ...values, unassignedOnly: e.target.checked })
          }
        />
        <span className="text-muted-foreground">Unassigned only</span>
      </label>
      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.overdueOnly}
          onChange={(e) =>
            onChange({ ...values, overdueOnly: e.target.checked })
          }
        />
        <span className="text-muted-foreground">Overdue postponed</span>
      </label>
    </div>
  )
}

function isoToLocalInput(iso: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localInputToIso(local: string): string {
  if (!local) return ""
  const d = new Date(local)
  return d.toISOString()
}
