import type { CsShipmentRow } from "@/api/shipments-api"
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

export function buildWhatsAppMessage(shipment: CsShipmentRow): string {
  const productName = shipment.productType?.trim() || "غير محدد"
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
سيتم توصيل الشحنة الخاصة بحضرتك: ${productName}
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
