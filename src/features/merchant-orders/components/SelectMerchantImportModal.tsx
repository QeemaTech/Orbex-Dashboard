import { X } from "lucide-react"
import { useTranslation } from "react-i18next"

import type { MerchantRow } from "@/api/merchants-api"
import { Button } from "@/components/ui/button"

type SelectMerchantImportModalProps = {
  open: boolean
  requireMerchantSelection: boolean
  merchants: MerchantRow[]
  selectedMerchantId: string
  pickupDate: string
  isLoadingMerchants: boolean
  merchantsErrorMessage?: string | null
  isSubmitting: boolean
  onMerchantChange: (merchantId: string) => void
  onPickupDateChange: (pickupDate: string) => void
  onCancel: () => void
  onConfirm: () => void
}

export function SelectMerchantImportModal({
  open,
  requireMerchantSelection,
  merchants,
  selectedMerchantId,
  pickupDate,
  isLoadingMerchants,
  merchantsErrorMessage,
  isSubmitting,
  onMerchantChange,
  onPickupDateChange,
  onCancel,
  onConfirm,
}: SelectMerchantImportModalProps) {
  const { t } = useTranslation()
  if (!open) return null

  const hasMerchants = merchants.length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal
      aria-label={t("merchantOrdersList.selectMerchantTitle", {
        defaultValue: "Choose merchant",
      })}
    >
      <div className="bg-card flex w-full max-w-lg flex-col rounded-lg border shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">
            {t("merchantOrdersList.selectMerchantTitle", {
              defaultValue: "Choose merchant",
            })}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onCancel}
            aria-label={t("common.close", { defaultValue: "Close" })}
            disabled={isSubmitting}
          >
            <X className="size-4" />
          </Button>
        </div>
        <div className="space-y-3 p-4">
          <p className="text-muted-foreground text-sm">
            {t("merchantOrdersList.selectMerchantDescription", {
              defaultValue:
                "Select a merchant before importing the Excel file.",
            })}
          </p>
          {requireMerchantSelection ? (
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="merchant-import-select">
                {t("merchantOrdersList.colMerchant")}
              </label>
              <select
                id="merchant-import-select"
                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                value={selectedMerchantId}
                onChange={(event) => onMerchantChange(event.target.value)}
                disabled={isLoadingMerchants || isSubmitting}
              >
                <option value="">
                  {isLoadingMerchants
                    ? t("common.loading", { defaultValue: "Loading..." })
                    : t("merchantOrdersList.selectMerchantPlaceholder", {
                        defaultValue: "Select a merchant",
                      })}
                </option>
                {merchants.map((merchant) => (
                  <option key={merchant.merchantId} value={merchant.merchantId}>
                    {merchant.displayName || merchant.businessName || merchant.merchantId}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="merchant-import-pickup-date">
              {t("merchantOrdersList.pickupDate", { defaultValue: "Pickup date" })}
            </label>
            <input
              id="merchant-import-pickup-date"
              type="date"
              value={pickupDate}
              onChange={(event) => onPickupDateChange(event.target.value)}
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              disabled={isSubmitting}
            />
          </div>
          {merchantsErrorMessage ? (
            <p className="text-destructive text-xs">{merchantsErrorMessage}</p>
          ) : null}
          {requireMerchantSelection && !isLoadingMerchants && !hasMerchants && !merchantsErrorMessage ? (
            <p className="text-destructive text-xs">
              {t("merchantOrdersList.noMerchantsAvailable", {
                defaultValue: "No merchants found. Please create or activate a merchant first.",
              })}
            </p>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 border-t px-4 py-3">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            {t("common.cancel", { defaultValue: "Cancel" })}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={
              isSubmitting ||
              (requireMerchantSelection && (isLoadingMerchants || !selectedMerchantId || !hasMerchants)) ||
              !pickupDate
            }
          >
            {isSubmitting
              ? t("merchantOrdersList.importing")
              : t("merchantOrdersList.importExcel")}
          </Button>
        </div>
      </div>
    </div>
  )
}
