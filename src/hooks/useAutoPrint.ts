import { useEffect, useRef } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getPendingLabelShipments, getShipmentLabelRaw, markShipmentLabelPrinted } from "@/api/shipments-api"
import { printerService } from "@/services/printer.service"
import { showToast } from "@/lib/toast"
import { useTranslation } from "react-i18next"

interface UseAutoPrintOptions {
  warehouseId: string | null
  token: string
  enabled?: boolean
  pollInterval?: number
}

export function useAutoPrint({
  warehouseId,
  token,
  enabled = true,
  pollInterval = 30000,
}: UseAutoPrintOptions) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const isPrinting = useRef(false)
  const hasConnected = useRef(false)

  const pendingQuery = useQuery({
    queryKey: ["pending-label-shipments", token, warehouseId],
    queryFn: () => getPendingLabelShipments({ token, warehouseId: warehouseId! }),
    enabled: !!token && !!warehouseId && enabled,
    refetchInterval: pollInterval,
  })

  const printAll = async () => {
    if (!token || !warehouseId) return
    
    const shipments = pendingQuery.data?.shipments ?? []
    if (shipments.length === 0) return

    if (isPrinting.current) return

    try {
      if (!hasConnected.current) {
        await printerService.connect()
        hasConnected.current = true
      }

      isPrinting.current = true

      for (const label of shipments) {
        try {
          const rawLabel = await getShipmentLabelRaw({ token, shipmentId: label.id ?? "" })
          if (rawLabel?.sbpl) {
            await printerService.printShipmentLabel(rawLabel)
            await markShipmentLabelPrinted({ token, shipmentId: label.id ?? "" })
          }
        } catch (err) {
          console.error("Failed to print label:", label.trackingNumber, err)
        }
      }

      showToast(
        t("shipments.autoPrint.completed", { defaultValue: `Printed ${shipments.length} labels` }),
        "success",
      )

      queryClient.invalidateQueries({ queryKey: ["pending-label-shipments", token, warehouseId] })
    } catch (err) {
      showToast((err as Error).message, "error")
    } finally {
      isPrinting.current = false
    }
  }

  useEffect(() => {
    if (!enabled || !warehouseId || !token) return
    if (pendingQuery.data?.shipments?.length ?? 0 > 0) {
      printAll()
    }
  }, [pendingQuery.data])

  return {
    pendingCount: pendingQuery.data?.shipments.length ?? 0,
    isLoading: pendingQuery.isLoading,
    printAll,
    refetch: pendingQuery.refetch,
  }
}