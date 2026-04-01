import type { CsShipmentRow } from "@/api/shipments-api";
/** Digits only for wa.me (country code should be included in stored phone). */
export declare function digitsOnlyPhone(phone: string): string;
export declare function normalizePhone(phone: string): string;
export declare function buildWhatsAppUrl(phone: string, message: string): string;
/** Total of shipment value + shipping fee, formatted as EGP for CS WhatsApp copy. */
export declare function formatCsShipmentTotalEg(i18nLanguage: string, shipmentValue: string, shippingFee: string): string;
export declare function buildWhatsAppMessage(shipment: CsShipmentRow): string;
export declare function openWhatsApp(shipment: CsShipmentRow): void;
