import type {
  DailyShipmentPoint,
  DashboardStats,
  ShipmentRow,
  StatusSlice,
} from "@/types/dashboard"

export const mockDashboardStats: DashboardStats = {
  totalShipments: 1248,
  delivered: 892,
  rejected: 74,
  postponed: 118,
}

export const mockShipmentsOverTime: DailyShipmentPoint[] = [
  { date: "2026-03-24", labelKey: "dashboard.chart.days.mon", count: 142 },
  { date: "2026-03-25", labelKey: "dashboard.chart.days.tue", count: 168 },
  { date: "2026-03-26", labelKey: "dashboard.chart.days.wed", count: 155 },
  { date: "2026-03-27", labelKey: "dashboard.chart.days.thu", count: 191 },
  { date: "2026-03-28", labelKey: "dashboard.chart.days.fri", count: 178 },
  { date: "2026-03-29", labelKey: "dashboard.chart.days.sat", count: 124 },
  { date: "2026-03-30", labelKey: "dashboard.chart.days.sun", count: 136 },
]

export const mockStatusDistribution: StatusSlice[] = [
  {
    status: "delivered",
    labelKey: "status.delivered",
    value: 892,
    color: "var(--success)",
  },
  {
    status: "in_transit",
    labelKey: "status.in_transit",
    value: 164,
    color: "var(--primary)",
  },
  {
    status: "postponed",
    labelKey: "status.postponed",
    value: 118,
    color: "var(--warning)",
  },
  {
    status: "rejected",
    labelKey: "status.rejected",
    value: 74,
    color: "var(--error)",
  },
]

export const mockRecentShipments: ShipmentRow[] = [
  {
    id: "shp-001",
    customerName: "Ahmed Hassan",
    phone: "+20 100 123 4567",
    status: "delivered",
    paymentMethod: "COD",
    amountCents: 45000,
  },
  {
    id: "shp-002",
    customerName: "Sara Mahmoud",
    phone: "+20 111 987 6543",
    status: "postponed",
    paymentMethod: "Card",
    amountCents: 129900,
  },
  {
    id: "shp-003",
    customerName: "Omar El-Sayed",
    phone: "+20 122 555 0101",
    status: "rejected",
    paymentMethod: "COD",
    amountCents: 32000,
  },
  {
    id: "shp-004",
    customerName: "Nour Khaled",
    phone: "+20 100 444 8899",
    status: "delivered",
    paymentMethod: "Wallet",
    amountCents: 8750,
  },
  {
    id: "shp-005",
    customerName: "Youssef Nabil",
    phone: "+20 127 333 2211",
    status: "postponed",
    paymentMethod: "COD",
    amountCents: 210000,
  },
  {
    id: "shp-006",
    customerName: "Layla Ibrahim",
    phone: "+20 106 222 7788",
    status: "delivered",
    paymentMethod: "Card",
    amountCents: 56750,
  },
]
