import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  createPackagingMaterial,
  listPackagingMaterials,
  updatePackagingMaterial,
  type CreatePackagingMaterialInput,
  type UpdatePackagingMaterialInput,
} from "@/api/packaging-materials-api"
import {
  createPackagingMaterialRequest,
  getPackagingMaterialRequestById,
  listPackagingMaterialRequests,
  patchPackagingMaterialRequestStatus,
  type CreatePackagingMaterialRequestInput,
  type PackagingMaterialRequestStatus,
} from "@/api/packaging-material-requests-api"
import {
  listPackagingMaterialStock,
  upsertPackagingMaterialStock,
  type UpsertPackagingMaterialStockInput,
} from "@/api/packaging-material-stock-api"

export function usePackagingMaterials(params: {
  token: string
  page: number
  pageSize: number
  search?: string
}) {
  return useQuery({
    queryKey: ["packaging-materials", params.token, params.page, params.pageSize, params.search],
    queryFn: () =>
      listPackagingMaterials({
        token: params.token,
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
      }),
    enabled: !!params.token,
  })
}

export function useCreatePackagingMaterial(token: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreatePackagingMaterialInput) => createPackagingMaterial({ token, body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["packaging-materials"] })
    },
  })
}

export function useUpdatePackagingMaterial(token: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; body: UpdatePackagingMaterialInput }) =>
      updatePackagingMaterial({ token, id: input.id, body: input.body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["packaging-materials"] })
    },
  })
}

export function usePackagingMaterialRequests(params: {
  token: string
  page: number
  pageSize: number
  status?: PackagingMaterialRequestStatus
  merchantId?: string
}) {
  return useQuery({
    queryKey: [
      "packaging-material-requests",
      params.token,
      params.page,
      params.pageSize,
      params.status,
      params.merchantId,
    ],
    queryFn: () =>
      listPackagingMaterialRequests({
        token: params.token,
        page: params.page,
        pageSize: params.pageSize,
        status: params.status,
        merchantId: params.merchantId,
      }),
    enabled: !!params.token,
  })
}

export function usePackagingMaterialRequestById(params: {
  token: string
  requestId: string
  enabled?: boolean
}) {
  return useQuery({
    queryKey: ["packaging-material-request-by-id", params.token, params.requestId],
    queryFn: () => getPackagingMaterialRequestById({ token: params.token, id: params.requestId }),
    enabled: !!params.token && !!params.requestId && (params.enabled ?? true),
  })
}

export function useCreatePackagingMaterialRequest(token: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreatePackagingMaterialRequestInput) =>
      createPackagingMaterialRequest({ token, body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["packaging-material-requests"] })
    },
  })
}

export function usePatchPackagingMaterialRequestStatus(token: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; status: PackagingMaterialRequestStatus }) =>
      patchPackagingMaterialRequestStatus({ token, id: input.id, status: input.status }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["packaging-material-requests"] })
      void queryClient.invalidateQueries({
        queryKey: ["packaging-material-request-by-id", token, data.request.id],
      })
    },
  })
}

export function usePackagingMaterialStock(params: {
  token: string
  page: number
  pageSize: number
  warehouseId?: string
}) {
  return useQuery({
    queryKey: [
      "packaging-material-stock",
      params.token,
      params.page,
      params.pageSize,
      params.warehouseId,
    ],
    queryFn: () =>
      listPackagingMaterialStock({
        token: params.token,
        page: params.page,
        pageSize: params.pageSize,
        warehouseId: params.warehouseId,
      }),
    enabled: !!params.token,
  })
}

export function useUpsertPackagingMaterialStock(token: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpsertPackagingMaterialStockInput) =>
      upsertPackagingMaterialStock({ token, body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["packaging-material-stock"] })
    },
  })
}

