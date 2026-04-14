import type { TFunction } from "i18next"

/** Localized permission title; falls back to API `label` when no key exists. */
export function permissionLabel(t: TFunction, key: string, fallbackLabel: string): string {
  return t(`rbac.perms.${key}.label`, { defaultValue: fallbackLabel })
}

/** Localized permission group; falls back to API `category` when no key exists. */
export function permissionCategory(t: TFunction, key: string, fallbackCategory: string): string {
  return t(`rbac.perms.${key}.category`, { defaultValue: fallbackCategory })
}
