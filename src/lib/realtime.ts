import { useEffect, useRef } from "react"
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

/** Disable with `VITE_REALTIME=0` when the API has no Socket.IO (quieter local dev). */
function realtimeEnabled(): boolean {
  const v = import.meta.env.VITE_REALTIME
  return v !== "0" && v !== "false"
}

type RealtimeEventPayload = {
  name: string
  payload?: { type?: string }
}

const DISCONNECT_DEBOUNCE_MS = 400

let sharedSocket: Socket | null = null
let bridgeSubscribers = 0
let pendingDisconnectTimer: number | null = null

function clearPendingDisconnect(): void {
  if (pendingDisconnectTimer !== null && typeof window !== "undefined") {
    window.clearTimeout(pendingDisconnectTimer)
    pendingDisconnectTimer = null
  }
}

function getOrCreateSharedSocket(): Socket {
  clearPendingDisconnect()
  if (!sharedSocket) {
    sharedSocket = io(socketIoBaseUrl(), {
      path: "/socket.io",
      transports: ["websocket", "polling"],
    })
  }
  return sharedSocket
}

function scheduleSharedSocketRelease(): void {
  if (typeof window === "undefined") return
  clearPendingDisconnect()
  pendingDisconnectTimer = window.setTimeout(() => {
    pendingDisconnectTimer = null
    if (bridgeSubscribers <= 0 && sharedSocket) {
      sharedSocket.removeAllListeners()
      sharedSocket.disconnect()
      sharedSocket = null
    }
  }, DISCONNECT_DEBOUNCE_MS)
}

export function RealtimeBridge() {
  const { accessToken } = useAuth()
  const qc = useQueryClient()
  const dashboardInvalidateTimer = useRef<number | null>(null)

  useEffect(() => {
    if (!accessToken || !realtimeEnabled()) return

    bridgeSubscribers++
    const socket = getOrCreateSharedSocket()

    const scheduleDashboardKpiInvalidate = () => {
      if (dashboardInvalidateTimer.current !== null) return
      dashboardInvalidateTimer.current = window.setTimeout(() => {
        dashboardInvalidateTimer.current = null
        void qc.invalidateQueries({ queryKey: ["dashboard-kpis"] })
      }, 750)
    }

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
          void qc.invalidateQueries({ queryKey: ["orders"] })
          void qc.invalidateQueries({ queryKey: ["shipment-timeline"] })
          void qc.invalidateQueries({ queryKey: ["warehouse-queue"] })
          void qc.invalidateQueries({ queryKey: ["warehouse-stats"] })
          void qc.invalidateQueries({ queryKey: ["courier-manifests"] })
          void qc.invalidateQueries({ queryKey: ["courier-manifest", "detail"] })
          void qc.invalidateQueries({ queryKey: ["courier-manifests-global"] })
          scheduleDashboardKpiInvalidate()
        }
        if (data.name === "kpi.updated") {
          scheduleDashboardKpiInvalidate()
        }
        if (data.name === "notification.created") {
          void qc.invalidateQueries({ queryKey: ["notifications", "inbox"] })
          if (data.payload?.type === CS_SHIPMENT_CREATED) {
            void qc.invalidateQueries({ queryKey: ["cs-shipments"] })
            void qc.invalidateQueries({ queryKey: ["shipments-list"] })
            scheduleDashboardKpiInvalidate()
          }
        }
      } catch {
        // Ignore malformed events.
      }
    }

    socket.on("event", onEvent)

    return () => {
      socket.off("event", onEvent)
      bridgeSubscribers = Math.max(0, bridgeSubscribers - 1)
      scheduleSharedSocketRelease()
      if (dashboardInvalidateTimer.current !== null) {
        window.clearTimeout(dashboardInvalidateTimer.current)
        dashboardInvalidateTimer.current = null
      }
    }
  }, [accessToken, qc])

  return null
}
