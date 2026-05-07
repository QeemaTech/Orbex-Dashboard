import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Eye, EyeOff, Lock } from "react-lucid"
import { Navigate, useNavigate } from "react-router-dom"

import { ApiError } from "@/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getDefaultDashboardRoute, useAuth } from "@/lib/auth-context"

const AUTH_ERROR_CODE = {
  MerchantPendingApproval: "MERCHANT_PENDING_APPROVAL",
  AccountNotRegistered: "ACCOUNT_NOT_REGISTERED",
} as const

export function LoginPage() {
  const { t } = useTranslation()
  const { user, login, loading } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (!loading && user) {
    return <Navigate to={getDefaultDashboardRoute(user)} replace />
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const loggedInUser = await login(email, password)
      nav(getDefaultDashboardRoute(loggedInUser), { replace: true })
    } catch (err) {
      let msg = t("auth.loginError")
      if (err instanceof ApiError) {
        if (err.code === AUTH_ERROR_CODE.MerchantPendingApproval) {
          msg = t("auth.pendingApproval")
        } else if (err.code === AUTH_ERROR_CODE.AccountNotRegistered) {
          msg = t("auth.notRegistered")
        } else {
          msg = err.message
        }
      }
      setError(msg)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden p-4">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--primary)_0%,transparent_55%)] opacity-[0.14]"
        aria-hidden
      />
      <div
        className="bg-primary/15 pointer-events-none absolute start-[-20%] top-1/4 size-[min(420px,70vw)] rounded-full blur-3xl"
        aria-hidden
      />
      <div
        className="bg-chart-2/10 pointer-events-none absolute bottom-[-10%] end-[-15%] size-[min(380px,65vw)] rounded-full blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-[420px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <img
            src="/logo.svg"
            alt="Orbex"
            className="mb-3 h-12 w-auto object-contain"
            loading="eager"
          />
          <p className="text-muted-foreground mt-1 max-w-sm text-sm leading-relaxed">
            {t("auth.loginSubtitle")}
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="border-border/80 bg-card/95 space-y-5 rounded-2xl border p-8 shadow-xl shadow-black/5 backdrop-blur-sm"
        >
          <div className="space-y-1 text-center">
            <h2 className="text-foreground flex items-center justify-center gap-2 text-lg font-semibold">
              <Lock className="text-muted-foreground size-4" aria-hidden />
              {t("auth.loginTitle")}
            </h2>
          </div>

          <label className="grid gap-2 text-sm">
            <span className="text-foreground font-medium">
              {t("auth.email")}
            </span>
            <Input
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
              required
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="text-foreground font-medium">
              {t("auth.password")}
            </span>
            <div className="relative">
              <Input
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 pe-10"
                required
              />
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground absolute end-2 top-1/2 -translate-y-1/2"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden />
                ) : (
                  <Eye className="size-4" aria-hidden />
                )}
              </button>
            </div>
          </label>
          {error ? (
            <p
              className="bg-destructive/10 text-destructive rounded-lg border border-destructive/20 px-3 py-2 text-sm"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <Button type="submit" className="h-11 w-full text-base" disabled={pending}>
            {t("auth.signIn")}
          </Button>
        </form>
      </div>
    </div>
  )
}
