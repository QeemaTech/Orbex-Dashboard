import type { CsShipmentRow, ShipmentOrderRow } from "@/api/merchant-orders-api"
import { generateShipmentDeliveryProofLink } from "@/api/shipments-api"
import i18n from "@/i18n"
import { showToast } from "@/lib/toast"

/** Digits only for wa.me (country code should be included in stored phone). */
export function digitsOnlyPhone(phone: string): string {
  return phone.replace(/\D/g, "")
}

export function normalizePhone(phone: string): string {
  let p = digitsOnlyPhone(phone)
  if (p.startsWith("0")) p = p.slice(1)
  if (!p.startsWith("20")) p = `20${p}`
  return p
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const n = normalizePhone(phone)
  const text = encodeURIComponent(message)
  return `https://wa.me/${n}?text=${text}`
}

function resolveNumberLocale(language: string): string {
  return language.startsWith("ar") ? "ar-EG" : "en-EG"
}

function parseMoneyAmount(raw: string): number {
  const n = Number.parseFloat(String(raw).replace(/,/g, "").trim())
  return Number.isFinite(n) ? n : 0
}

/** Total of shipment value + shipping fee, formatted as EGP for CS WhatsApp copy. */
export function formatCsShipmentTotalEg(
  i18nLanguage: string,
  shipmentValue: string,
  shippingFee: string,
): string {
  const locale = resolveNumberLocale(i18nLanguage)
  const total =
    parseMoneyAmount(shipmentValue) + parseMoneyAmount(shippingFee)
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(total)
}

function isValidEgyptPhone(phone: string): boolean {
  return /^20\d{10}$/.test(phone)
}

function parseAmount(raw: string): string {
  const n = Number.parseFloat(String(raw).replace(/,/g, "").trim())
  if (!Number.isFinite(n)) return "0"
  return n % 1 === 0 ? String(Math.trunc(n)) : n.toFixed(2)
}

/** Prefer `description`; fall back to `productType` for the main package line. */
export function packageDescriptionForWhatsApp(row: {
  description?: string | null
  productType?: string
}): string {
  const d = row.description?.trim()
  if (d) return d
  return row.productType?.trim() || "غير محدد"
}

/** When both description and product type differ, include the type as a second line. */
function optionalProductTypeSuffix(row: {
  description?: string | null
  productType?: string
}): string {
  const d = row.description?.trim()
  const t = row.productType?.trim()
  if (d && t && d !== t) return `\nنوع المنتج: ${t}`
  return ""
}

export function buildWhatsAppMessage(shipment: CsShipmentRow): string {
  const pkgMain = packageDescriptionForWhatsApp(shipment)
  const typeSuffix = optionalProductTypeSuffix(shipment)
  const merchantName =
    shipment.merchant?.displayName?.trim() ||
    shipment.merchant?.businessName?.trim() ||
    "غير محدد"
  const totalAmount = parseAmount(
    String(
      parseMoneyAmount(shipment.shipmentValue) +
        parseMoneyAmount(shipment.shippingFee),
    ),
  )
  return `صباح الخير، مع حضرتك شركة الشحن Orbex.
سيتم توصيل الشحنة الخاصة بحضرتك: ${pkgMain}${typeSuffix}
من التاجر: ${merchantName}
بقيمة إجمالية: ${totalAmount} جنيه شامل الشحن.
برجاء إرسال الموقع أو تأكيد موعد الاستلام.`
}

export function openWhatsApp(shipment: CsShipmentRow): void {
  const rawPhone = shipment.phonePrimary?.trim()
  if (!rawPhone) {
    showToast("رقم العميل غير متوفر", "error")
    return
  }
  const phone = normalizePhone(rawPhone)
  if (!isValidEgyptPhone(phone)) {
    showToast("رقم الهاتف غير صحيح", "error")
    return
  }
  const message = buildWhatsAppMessage(shipment)
  const url = buildWhatsAppUrl(phone, message)
  window.open(url, "_blank", "noopener,noreferrer")
}

/** Admin order list row: same template as CS WhatsApp copy; merchant omitted from API (`غير محدد`). */
export function buildWhatsAppMessageForOrder(order: ShipmentOrderRow): string {
  const pkgMain = packageDescriptionForWhatsApp(order)
  const typeSuffix = optionalProductTypeSuffix(order)
  const merchantName = "غير محدد"
  const totalAmount = parseAmount(
    String(
      parseMoneyAmount(order.shipmentValue) +
        parseMoneyAmount(order.shippingFee),
    ),
  )
  return `صباح الخير، مع حضرتك شركة الشحن Orbex.
سيتم توصيل الشحنة الخاصة بحضرتك: ${pkgMain}${typeSuffix}
من التاجر: ${merchantName}
بقيمة إجمالية: ${totalAmount} جنيه شامل الشحن.
برجاء إرسال الموقع أو تأكيد موعد الاستلام.`
}

export function openWhatsAppForOrder(order: ShipmentOrderRow): void {
  const rawPhone = order.customer.phonePrimary?.trim()
  if (!rawPhone) {
    showToast("رقم العميل غير متوفر", "error")
    return
  }
  const phone = normalizePhone(rawPhone)
  if (!isValidEgyptPhone(phone)) {
    showToast("رقم الهاتف غير صحيح", "error")
    return
  }
  const message = buildWhatsAppMessageForOrder(order)
  const url = buildWhatsAppUrl(phone, message)
  window.open(url, "_blank", "noopener,noreferrer")
}

function resolveTrackingMessageCustomer(row: CsShipmentRow | ShipmentOrderRow): {
  name: string
  phone: string
} {
  if ("customer" in row && row.customer) {
    return {
      name: row.customer.customerName?.trim() || "—",
      phone: row.customer.phonePrimary?.trim() || "",
    }
  }
  const cs = row as CsShipmentRow
  return {
    name: cs.customerName?.trim() || "—",
    phone: cs.phonePrimary?.trim() || "",
  }
}

function resolveTrackingMessageCourier(
  row: CsShipmentRow | ShipmentOrderRow,
): { fullName: string | null; contactPhone: string | null } | null {
  if ("customer" in row) {
    const o = row as ShipmentOrderRow
    return o.deliveryCourier ?? o.courier ?? null
  }
  return (row as CsShipmentRow).courier ?? null
}

function resolveTrackingNumber(row: CsShipmentRow | ShipmentOrderRow): string | null {
  const tn = row.trackingNumber?.trim()
  return tn ? tn : null
}

/** Public customer URL; uses `trackingNumber` only (never line UUID). */
export function buildPublicTrackingUrl(trackingNumber: string): string {
  const fromEnv = String(import.meta.env.VITE_PUBLIC_TRACKING_ORIGIN ?? "").trim()
  const origin =
    fromEnv ||
    (typeof window !== "undefined" ? window.location.origin : "") ||
    ""
  const base = origin.replace(/\/$/, "")
  return `${base}/track/${encodeURIComponent(trackingNumber)}`
}

export function buildTrackingWhatsAppMessage(
  row: CsShipmentRow | ShipmentOrderRow,
  opts?: { deliveryProofLink?: string },
): string {
  const tn = resolveTrackingNumber(row)
  if (!tn) {
    return ""
  }
  const link = buildPublicTrackingUrl(tn)
  const { name, phone } = resolveTrackingMessageCustomer(row)
  const courier = resolveTrackingMessageCourier(row)
  const courierName = courier?.fullName?.trim() || ""
  const courierPhone = courier?.contactPhone?.trim() || ""

  const totalFormatted = formatCsShipmentTotalEg(
    i18n.language,
    row.shipmentValue,
    row.shippingFee,
  )
  const isCash = row.paymentMethod?.trim().toUpperCase() === "CASH"
  const amountLine = isCash
    ? `مبلغ التحصيل عند الاستلام (COD): ${totalFormatted}`
    : `قيمة الشحنة (شامل الشحن): ${totalFormatted}`

  const courierBlock =
    courierName || courierPhone
      ? `\nالمندوب: ${courierName || "—"}${
          courierPhone ? `\nجوال المندوب: ${courierPhone}` : ""
        }`
      : ""

  const proofBlock = opts?.deliveryProofLink?.trim()
    ? `\n\nلتأكيد استلام الشحنة (رمز QR):\n${opts.deliveryProofLink.trim()}`
    : ""

  return `صباح الخير، مع حضرتك شركة الشحن Orbex.

يمكنك متابعة شحنتك من الرابط التالي:
${link}

رقم التتبع: ${tn}
العميل: ${name}
جوال العميل: ${phone}${courierBlock}
${amountLine}
${proofBlock}

شكراً لاختياركم Orbex.`
}

/**
 * Opens WhatsApp with tracking + delivery-proof link.
 * Calls generate-delivery-link first: each send rotates the token for that shipment (prior QR links stop working).
 */
export async function openWhatsAppTrackingMessage(
  row: CsShipmentRow | ShipmentOrderRow,
  token: string,
): Promise<void> {
  const tn = resolveTrackingNumber(row)
  if (!tn) {
    showToast(i18n.t("cs.actions.sendTrackingMessageNoTrackingHint"), "error")
    return
  }
  const { phone: rawPhone } = resolveTrackingMessageCustomer(row)
  if (!rawPhone) {
    showToast("رقم العميل غير متوفر", "error")
    return
  }
  const phone = normalizePhone(rawPhone)
  if (!isValidEgyptPhone(phone)) {
    showToast("رقم الهاتف غير صحيح", "error")
    return
  }
  let deliveryProofLink: string | undefined
  try {
    const { link } = await generateShipmentDeliveryProofLink({
      token,
      shipmentId: row.id,
    })
    deliveryProofLink = link
  } catch {
    showToast(i18n.t("cs.actions.deliveryProofLinkFailed"), "error")
    return
  }
  const message = buildTrackingWhatsAppMessage(row, { deliveryProofLink })
  const url = buildWhatsAppUrl(phone, message)
  window.open(url, "_blank", "noopener,noreferrer")
}
