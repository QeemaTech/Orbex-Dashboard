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

export type UserRole =
  | "ADMIN"
  | "CUSTOMER_SERVICE"
  | "SALES"
  | "ACCOUNTS"
  | "WAREHOUSE"
  | "COURIER"
  | "MERCHANT"

export type AuthUser = {
  id: string
  username: string
  fullName: string
  role: UserRole
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const STORAGE_ACCESS = "orbex_access_token"
const STORAGE_REFRESH = "orbex_refresh_token"
const STORAGE_USER = "orbex_user"

type AuthState = {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  loading: boolean
}

type AuthContextValue = AuthState & {
  login: (username: string, password: string) => Promise<AuthUser>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_USER)
    if (!raw) return null
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
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
      setLoading(false)
      return
    }
    void meRequest(token)
      .then((u) => {
        setUser(u)
        localStorage.setItem(STORAGE_USER, JSON.stringify(u))
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

  const login = useCallback(async (username: string, password: string) => {
    const res = await loginRequest({ username, password })
    localStorage.setItem(STORAGE_ACCESS, res.accessToken)
    localStorage.setItem(STORAGE_REFRESH, res.refreshToken)
    localStorage.setItem(STORAGE_USER, JSON.stringify(res.user))
    setAccessToken(res.accessToken)
    setRefreshToken(res.refreshToken)
    setUser(res.user)
    return res.user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_ACCESS)
    localStorage.removeItem(STORAGE_REFRESH)
    localStorage.removeItem(STORAGE_USER)
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

export function getDefaultDashboardRoute(role: UserRole | undefined): string {
  if (role === "CUSTOMER_SERVICE") return "/cs/shipments"
  if (role === "WAREHOUSE") return "/warehouse"
  return "/dashboard"
}
