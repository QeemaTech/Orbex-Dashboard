import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  endOfTodayIso,
  startOfTodayIso,
} from "@/features/customer-service/lib/date-range"

export type CsFilterValues = {
  merchantName: string
  courierName: string
  unassignedOnly: boolean
  regionName: string
  phoneSearch: string
  trackingNumber: string
  currentStatus: string
  currentStatusIn: string
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
}

export function CsShipmentFilters({
  values,
  onChange,
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
        <span className="text-muted-foreground">Tracking</span>
        <Input
          value={values.trackingNumber}
          placeholder="tracking number"
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
          value={values.currentStatus}
          onChange={(e) =>
            onChange({ ...values, currentStatus: e.target.value })
          }
        >
          <option value="">{t("cs.filters.anyStatus")}</option>
          <option value="PENDING_ASSIGNMENT">
            {t("cs.shipmentStatus.PENDING_ASSIGNMENT")}
          </option>
          <option value="POSTPONED">{t("cs.shipmentStatus.POSTPONED")}</option>
          <option value="DELIVERED">{t("cs.shipmentStatus.DELIVERED")}</option>
          <option value="REJECTED">{t("cs.shipmentStatus.REJECTED")}</option>
          <option value="IN_WAREHOUSE">
            {t("cs.shipmentStatus.IN_WAREHOUSE")}
          </option>
          <option value="OUT_FOR_DELIVERY">
            {t("cs.shipmentStatus.OUT_FOR_DELIVERY")}
          </option>
          <option value="CONFIRMED_BY_CS">
            {t("cs.shipmentStatus.CONFIRMED_BY_CS")}
          </option>
          <option value="ASSIGNED">{t("cs.shipmentStatus.ASSIGNED")}</option>
        </select>
      </label>
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
          onChange={(e) => onChange({ ...values, subStatus: e.target.value })}
          className="min-w-[160px]"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground">Payment status</span>
        <Input
          value={values.paymentStatus}
          placeholder="COLLECTED"
          onChange={(e) => onChange({ ...values, paymentStatus: e.target.value })}
          className="min-w-[180px]"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground">Status set (CSV)</span>
        <Input
          value={values.currentStatusIn}
          placeholder="ASSIGNED,POSTPONED"
          onChange={(e) =>
            onChange({ ...values, currentStatusIn: e.target.value })
          }
          className="min-w-[210px]"
        />
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
