import { apiFetch } from "@/api/client"

export type ReferenceDataRow = {
  id: string
  code: string
  name: string
  nameAr: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type ReferenceDataCreateBody = {
  code?: string
  name: string
  nameAr: string
  isActive?: boolean
}

export type ReferenceDataUpdateBody = {
  code?: string
  name?: string
  nameAr?: string
  isActive?: boolean
}

// Banks
export async function listBanksReferenceData(token: string): Promise<ReferenceDataRow[]> {
  const res = await apiFetch<{ banks: ReferenceDataRow[] }>("/api/admin/reference-data/banks", {
    token,
  })
  return res.banks
}
export async function createBankReferenceData(
  token: string,
  body: ReferenceDataCreateBody,
): Promise<ReferenceDataRow> {
  const res = await apiFetch<{ bank: ReferenceDataRow }>("/api/admin/reference-data/banks", {
    token,
    method: "POST",
    body: JSON.stringify(body),
  })
  return res.bank
}
export async function updateBankReferenceData(
  token: string,
  id: string,
  body: ReferenceDataUpdateBody,
): Promise<ReferenceDataRow> {
  const res = await apiFetch<{ bank: ReferenceDataRow }>(`/api/admin/reference-data/banks/${id}`, {
    token,
    method: "PATCH",
    body: JSON.stringify(body),
  })
  return res.bank
}
export async function deleteBankReferenceData(token: string, id: string): Promise<void> {
  await apiFetch<void>(`/api/admin/reference-data/banks/${id}`, {
    token,
    method: "DELETE",
  })
}

// Product types
export async function listProductTypesReferenceData(token: string): Promise<ReferenceDataRow[]> {
  const res = await apiFetch<{ productTypes: ReferenceDataRow[] }>(
    "/api/admin/reference-data/product-types",
    { token },
  )
  return res.productTypes
}
export async function createProductTypeReferenceData(
  token: string,
  body: ReferenceDataCreateBody,
): Promise<ReferenceDataRow> {
  const res = await apiFetch<{ productType: ReferenceDataRow }>(
    "/api/admin/reference-data/product-types",
    {
      token,
      method: "POST",
      body: JSON.stringify(body),
    },
  )
  return res.productType
}
export async function updateProductTypeReferenceData(
  token: string,
  id: string,
  body: ReferenceDataUpdateBody,
): Promise<ReferenceDataRow> {
  const res = await apiFetch<{ productType: ReferenceDataRow }>(
    `/api/admin/reference-data/product-types/${id}`,
    {
      token,
      method: "PATCH",
      body: JSON.stringify(body),
    },
  )
  return res.productType
}
export async function deleteProductTypeReferenceData(token: string, id: string): Promise<void> {
  await apiFetch<void>(`/api/admin/reference-data/product-types/${id}`, {
    token,
    method: "DELETE",
  })
}

// Sales channels
export async function listSalesChannelsReferenceData(token: string): Promise<ReferenceDataRow[]> {
  const res = await apiFetch<{ salesChannels: ReferenceDataRow[] }>(
    "/api/admin/reference-data/sales-channels",
    { token },
  )
  return res.salesChannels
}
export async function createSalesChannelReferenceData(
  token: string,
  body: ReferenceDataCreateBody,
): Promise<ReferenceDataRow> {
  const res = await apiFetch<{ salesChannel: ReferenceDataRow }>(
    "/api/admin/reference-data/sales-channels",
    {
      token,
      method: "POST",
      body: JSON.stringify(body),
    },
  )
  return res.salesChannel
}
export async function updateSalesChannelReferenceData(
  token: string,
  id: string,
  body: ReferenceDataUpdateBody,
): Promise<ReferenceDataRow> {
  const res = await apiFetch<{ salesChannel: ReferenceDataRow }>(
    `/api/admin/reference-data/sales-channels/${id}`,
    {
      token,
      method: "PATCH",
      body: JSON.stringify(body),
    },
  )
  return res.salesChannel
}
export async function deleteSalesChannelReferenceData(token: string, id: string): Promise<void> {
  await apiFetch<void>(`/api/admin/reference-data/sales-channels/${id}`, {
    token,
    method: "DELETE",
  })
}

// Business sectors
export async function listBusinessSectorsReferenceData(token: string): Promise<ReferenceDataRow[]> {
  const res = await apiFetch<{ businessSectors: ReferenceDataRow[] }>(
    "/api/admin/reference-data/business-sectors",
    { token },
  )
  return res.businessSectors
}
export async function createBusinessSectorReferenceData(
  token: string,
  body: ReferenceDataCreateBody,
): Promise<ReferenceDataRow> {
  const res = await apiFetch<{ businessSector: ReferenceDataRow }>(
    "/api/admin/reference-data/business-sectors",
    {
      token,
      method: "POST",
      body: JSON.stringify(body),
    },
  )
  return res.businessSector
}
export async function updateBusinessSectorReferenceData(
  token: string,
  id: string,
  body: ReferenceDataUpdateBody,
): Promise<ReferenceDataRow> {
  const res = await apiFetch<{ businessSector: ReferenceDataRow }>(
    `/api/admin/reference-data/business-sectors/${id}`,
    {
      token,
      method: "PATCH",
      body: JSON.stringify(body),
    },
  )
  return res.businessSector
}
export async function deleteBusinessSectorReferenceData(token: string, id: string): Promise<void> {
  await apiFetch<void>(`/api/admin/reference-data/business-sectors/${id}`, {
    token,
    method: "DELETE",
  })
}

// Governorates
export async function listGovernoratesReferenceData(token: string): Promise<ReferenceDataRow[]> {
  const res = await apiFetch<{ governorates: ReferenceDataRow[] }>(
    "/api/admin/reference-data/governorates",
    { token },
  )
  return res.governorates
}
export async function createGovernorateReferenceData(
  token: string,
  body: ReferenceDataCreateBody,
): Promise<ReferenceDataRow> {
  const res = await apiFetch<{ governorate: ReferenceDataRow }>(
    "/api/admin/reference-data/governorates",
    {
      token,
      method: "POST",
      body: JSON.stringify(body),
    },
  )
  return res.governorate
}
export async function updateGovernorateReferenceData(
  token: string,
  id: string,
  body: ReferenceDataUpdateBody,
): Promise<ReferenceDataRow> {
  const res = await apiFetch<{ governorate: ReferenceDataRow }>(
    `/api/admin/reference-data/governorates/${id}`,
    {
      token,
      method: "PATCH",
      body: JSON.stringify(body),
    },
  )
  return res.governorate
}
export async function deleteGovernorateReferenceData(token: string, id: string): Promise<void> {
  await apiFetch<void>(`/api/admin/reference-data/governorates/${id}`, {
    token,
    method: "DELETE",
  })
}

