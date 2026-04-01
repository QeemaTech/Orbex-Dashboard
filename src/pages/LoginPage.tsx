import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Eye, EyeOff, Lock, Package } from "react-lucid"
import { Navigate, useNavigate } from "react-router-dom"

import { ApiError } from "@/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getDefaultDashboardRoute, useAuth } from "@/lib/auth-context"

export function LoginPage() {
  const { t } = useTranslation()
  const { user, login, loading } = useAuth()
  const nav = useNavigate()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (!loading && user) {
    return <Navigate to={getDefaultDashboardRoute(user.role)} replace />
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const loggedInUser = await login(username, password)
      nav(getDefaultDashboardRoute(loggedInUser.role), { replace: true })
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : t("auth.loginError")
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
          <div className="border-border/60 bg-card mb-4 flex size-14 items-center justify-center rounded-2xl border shadow-sm">
            <Package className="text-primary size-8" aria-hidden />
          </div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">
            Orbex
          </h1>
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
              {t("auth.username")}
            </span>
            <Input
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
