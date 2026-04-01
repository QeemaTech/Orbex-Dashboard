import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { useAuth } from "@/lib/auth-context"

const wsBase =
  import.meta.env.VITE_WS_BASE_URL ??
  (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:5000").replace(
    /^http/i,
    "ws",
  )

type RealtimeEvent = {
  name: string
}

export function RealtimeBridge() {
  const { accessToken } = useAuth()
  const qc = useQueryClient()

  useEffect(() => {
    if (!accessToken) return
    const socket = new WebSocket(`${wsBase}/ws`)
    socket.onmessage = (message) => {
      try {
        const data = JSON.parse(String(message.data)) as RealtimeEvent
        if (data.name === "shipment.updated" || data.name === "timeline.appended") {
          void qc.invalidateQueries({ queryKey: ["shipments-list"] })
          void qc.invalidateQueries({ queryKey: ["cs-shipments"] })
          void qc.invalidateQueries({ queryKey: ["shipment-detail"] })
          void qc.invalidateQueries({ queryKey: ["shipment-timeline"] })
        }
        if (data.name === "kpi.updated") {
          void qc.invalidateQueries({ queryKey: ["dashboard-kpis"] })
        }
        if (data.name === "notification.created") {
          void qc.invalidateQueries({ queryKey: ["notifications", "inbox"] })
        }
      } catch {
        // Ignore malformed events.
      }
    }
    return () => {
      socket.close()
    }
  }, [accessToken, qc])

  return null
}
