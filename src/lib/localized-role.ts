/** Fields needed to show a role name in the current UI language (from API). */
export type LocalizedRoleFields = {
  name: string
  nameAr: string | null
}

export function localizedRoleName(
  role: LocalizedRoleFields | undefined | null,
  language: string,
): string {
  if (!role) return ""
  if (language.startsWith("ar") && role.nameAr) return role.nameAr
  return role.name
}
