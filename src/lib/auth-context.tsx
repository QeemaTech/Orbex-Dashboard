import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { loginRequest, meRequest } from "@/api/auth-api"
import type { RbacRoleInfo } from "@/api/users-api"
import { isWarehouseAdmin, isWarehouseStaff } from "@/lib/warehouse-access"

export type UserRole =
  | "ADMIN"
  | "CUSTOMER_SERVICE"
  | "SALES"
  | "ACCOUNTS"
  | "WAREHOUSE"
  | "WAREHOUSE_ADMIN"
  | "COURIER"
  | "MERCHANT"

export type AuthUser = {
  id: string
  merchantId?: string | null
  email: string
  fullName: string
  role: UserRole
  roles?: string[]
  rbacRoles?: RbacRoleInfo[]
  permissions?: string[]
  warehouseId: string | null
  /** Operator assignment (Prisma `warehouse`); same as `assignedWarehouse` from API. */
  warehouse?: { id: string; name: string } | null
  assignedWarehouse?: { id: string; name: string } | null
  /** `warehouse.admin_user_id` (Prisma `administeredWarehouse`); only source for hub admin UI. */
  adminWarehouse?: { id: string; name: string } | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const STORAGE_ACCESS = "orbex_access_token"
const STORAGE_REFRESH = "orbex_refresh_token"
const STORAGE_USER = "orbex_user"
const AUTH_CHANGED_EVENT = "orbex-auth-changed"

type AuthState = {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  loading: boolean
}

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_USER)
    if (!raw) return null
    const u = JSON.parse(raw) as AuthUser & { username?: string }
    if (u && u.warehouseId === undefined) {
      u.warehouseId = null
    }
    if (u && u.email === undefined && typeof u.username === "string") {
      u.email = u.username
    }
    if (!u.roles) u.roles = u.role ? [u.role] : []
    if (!u.permissions) u.permissions = []
    if (!u.rbacRoles) u.rbacRoles = []
    if (u.merchantId === undefined) u.merchantId = null
    return u as AuthUser
  } catch {
    return null
  }
}

function normalizeUser(u: AuthUser): AuthUser {
  const wh = u.warehouse ?? u.assignedWarehouse ?? null
  return {
    ...u,
    merchantId: u.merchantId ?? null,
    roles: u.roles ?? (u.role ? [u.role] : []),
    permissions: u.permissions ?? [],
    rbacRoles: u.rbacRoles ?? [],
    adminWarehouse: u.adminWarehouse === undefined ? null : u.adminWarehouse,
    warehouse: u.warehouse === undefined ? wh : u.warehouse,
    assignedWarehouse: u.assignedWarehouse === undefined ? wh : u.assignedWarehouse,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser())
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_ACCESS),
  )
  const [refreshToken, setRefreshToken] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_REFRESH),
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_ACCESS)
    if (!token) {
      // Without a token, API queries stay disabled (`enabled: !!token`) but `Protected`
      // still allowed a stale `orbex_user` — every list page looked empty. Clear session.
      if (readStoredUser()) {
        localStorage.removeItem(STORAGE_USER)
        localStorage.removeItem(STORAGE_REFRESH)
        setUser(null)
        setRefreshToken(null)
      }
      setLoading(false)
      return
    }
    void meRequest(token)
      .then((u) => {
        const normalized = normalizeUser(u)
        setUser(normalized)
        localStorage.setItem(STORAGE_USER, JSON.stringify(normalized))
      })
      .catch(() => {
        localStorage.removeItem(STORAGE_ACCESS)
        localStorage.removeItem(STORAGE_REFRESH)
        localStorage.removeItem(STORAGE_USER)
        setUser(null)
        setAccessToken(null)
        setRefreshToken(null)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onAuthChanged = () => {
      setAccessToken(localStorage.getItem(STORAGE_ACCESS))
      setRefreshToken(localStorage.getItem(STORAGE_REFRESH))
      setUser(readStoredUser())
    }

    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged)
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await loginRequest({ email, password })
    const mergedUser: AuthUser = normalizeUser({
      ...res.user,
      roles: res.roles ?? res.user.roles,
      permissions: res.permissions ?? res.user.permissions,
      rbacRoles: res.user.rbacRoles ?? res.rbacRoles ?? [],
    })
    localStorage.setItem(STORAGE_ACCESS, res.accessToken)
    localStorage.setItem(STORAGE_REFRESH, res.refreshToken)
    localStorage.setItem(STORAGE_USER, JSON.stringify(mergedUser))
    setAccessToken(res.accessToken)
    setRefreshToken(res.refreshToken)
    setUser(mergedUser)
    return mergedUser
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_ACCESS)
    localStorage.removeItem(STORAGE_REFRESH)
    localStorage.removeItem(STORAGE_USER)
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
    setUser(null)
    setAccessToken(null)
    setRefreshToken(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      accessToken,
      refreshToken,
      loading,
      login,
      logout,
    }),
    [user, accessToken, refreshToken, loading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return ctx
}

export function canAccessCustomerService(role: UserRole | undefined): boolean {
  return role === "CUSTOMER_SERVICE" || role === "ADMIN"
}

export function isMerchantUser(user: AuthUser | null | undefined): boolean {
  if (!user) return false
  if (typeof user.merchantId === "string" && user.merchantId.trim().length > 0) return true
  const roleSlugs = new Set([
    ...(user.roles ?? []),
    ...(user.rbacRoles?.map((role) => role.slug) ?? []),
  ])
  return Array.from(roleSlugs).some((slug) => slug.toLowerCase().includes("merchant"))
}

/** Post-login and role-guard redirects. Pass full `user` so warehouse staff open their hub directly. */
export function getDefaultDashboardRoute(user: AuthUser | null | undefined): string {
  if (!user) return "/dashboard"
  if (user.role === "CUSTOMER_SERVICE") return "/cs/shipments"
  if (isWarehouseStaff(user) && user.warehouseId) {
    return `/warehouses/${encodeURIComponent(user.warehouseId)}`
  }
  if (isWarehouseStaff(user)) return "/warehouse"
  if (isWarehouseAdmin(user)) return "/dashboard/warehouse"
  return "/dashboard"
}
