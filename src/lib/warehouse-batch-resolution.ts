import type { TFunction } from "i18next"

/** Labels for batch row `isResolved` / `isFinished` (matches merchant-order detail semantics). */
export function batchResolutionLabel(
  row: { isResolved?: boolean; isFinished?: boolean },
  t: TFunction,
): string {
  if (row.isFinished) return t("merchantOrders.detail.finishedBadge")
  if (row.isResolved) return t("merchantOrders.detail.resolvedBadge")
  return t("merchantOrders.detail.notResolvedHint")
}
