import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { io, type Socket } from "socket.io-client"

import { useAuth } from "@/lib/auth-context"

/** Matches backend `CS_NOTIF.SHIPMENT_CREATED` — new shipment CS in-app notification. */
const CS_SHIPMENT_CREATED = "CS_SHIPMENT_CREATED"

/** HTTP origin for Socket.IO (same host/port as API). */
function socketIoBaseUrl(): string {
  const ws = import.meta.env.VITE_WS_BASE_URL
  if (typeof ws === "string" && ws.length > 0) {
    return ws.replace(/^ws/i, "http")
  }
  return import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:5000"
}

type RealtimeEventPayload = {
  name: string
  payload?: { type?: string }
}

export function RealtimeBridge() {
  const { accessToken } = useAuth()
  const qc = useQueryClient()

  useEffect(() => {
    if (!accessToken) return

    const socket: Socket = io(socketIoBaseUrl(), {
      path: "/socket.io",
      transports: ["websocket", "polling"],
    })

    const onEvent = (data: RealtimeEventPayload) => {
      try {
        if (
          data.name === "shipment.updated" ||
          data.name === "timeline.appended"
        ) {
          void qc.invalidateQueries({ queryKey: ["shipments-list"] })
          void qc.invalidateQueries({ queryKey: ["cs-shipments"] })
          void qc.invalidateQueries({ queryKey: ["dashboard-kpis"] })
          void qc.invalidateQueries({ queryKey: ["shipment-detail"] })
          void qc.invalidateQueries({ queryKey: ["shipment-timeline"] })
          void qc.invalidateQueries({ queryKey: ["warehouse-queue"] })
          void qc.invalidateQueries({ queryKey: ["warehouse-stats"] })
        }
        if (data.name === "kpi.updated") {
          void qc.invalidateQueries({ queryKey: ["dashboard-kpis"] })
        }
        if (data.name === "notification.created") {
          void qc.invalidateQueries({ queryKey: ["notifications", "inbox"] })
          if (data.payload?.type === CS_SHIPMENT_CREATED) {
            void qc.invalidateQueries({ queryKey: ["cs-shipments"] })
            void qc.invalidateQueries({ queryKey: ["shipments-list"] })
            void qc.invalidateQueries({ queryKey: ["dashboard-kpis"] })
          }
        }
      } catch {
        // Ignore malformed events.
      }
    }

    socket.on("event", onEvent)

    return () => {
      socket.off("event", onEvent)
      socket.disconnect()
    }
  }, [accessToken, qc])

  return null
}
