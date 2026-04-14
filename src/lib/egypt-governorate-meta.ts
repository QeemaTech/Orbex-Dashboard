/**
 * Egyptian governorates: Arabic labels + approximate map center (English keys match CountriesNow API).
 */

export type GovernorateMeta = {
  ar: string
  lat: number
  lng: number
  /** Default zoom when focusing the governorate */
  zoom: number
}

export const EGYPT_GOVERNORATE_META: Record<string, GovernorateMeta> = {
  "Alexandria Governorate": {
    ar: "محافظة الإسكندرية",
    lat: 31.2001,
    lng: 29.9187,
    zoom: 10,
  },
  "Aswan Governorate": {
    ar: "محافظة أسوان",
    lat: 24.0889,
    lng: 32.8998,
    zoom: 10,
  },
  "Asyut Governorate": {
    ar: "محافظة أسيوط",
    lat: 27.1828,
    lng: 31.1837,
    zoom: 10,
  },
  "Beheira Governorate": {
    ar: "محافظة البحيرة",
    lat: 31.0349,
    lng: 30.4682,
    zoom: 9,
  },
  "Beni Suef Governorate": {
    ar: "محافظة بني سويف",
    lat: 29.0661,
    lng: 31.0994,
    zoom: 10,
  },
  "Cairo Governorate": {
    ar: "محافظة القاهرة",
    lat: 30.0444,
    lng: 31.2357,
    zoom: 11,
  },
  "Dakahlia Governorate": {
    ar: "محافظة الدقهلية",
    lat: 31.0409,
    lng: 31.3785,
    zoom: 10,
  },
  "Damietta Governorate": {
    ar: "محافظة دمياط",
    lat: 31.4165,
    lng: 31.8133,
    zoom: 11,
  },
  "Faiyum Governorate": {
    ar: "محافظة الفيوم",
    lat: 29.3084,
    lng: 30.8428,
    zoom: 10,
  },
  "Gharbia Governorate": {
    ar: "محافظة الغربية",
    lat: 30.8754,
    lng: 31.0335,
    zoom: 10,
  },
  "Giza Governorate": {
    ar: "محافظة الجيزة",
    lat: 30.0131,
    lng: 31.2089,
    zoom: 11,
  },
  "Ismailia Governorate": {
    ar: "محافظة الإسماعيلية",
    lat: 30.5965,
    lng: 32.2715,
    zoom: 10,
  },
  "Kafr el-Sheikh Governorate": {
    ar: "محافظة كفر الشيخ",
    lat: 31.1094,
    lng: 30.9388,
    zoom: 10,
  },
  "Luxor Governorate": {
    ar: "محافظة الأقصر",
    lat: 25.6872,
    lng: 32.6396,
    zoom: 10,
  },
  "Matrouh Governorate": {
    ar: "محافظة مطروح",
    lat: 29.5844,
    lng: 26.4196,
    zoom: 8,
  },
  "Minya Governorate": {
    ar: "محافظة المنيا",
    lat: 28.0871,
    lng: 30.7618,
    zoom: 9,
  },
  "Monufia Governorate": {
    ar: "محافظة المنوفية",
    lat: 30.5972,
    lng: 30.9876,
    zoom: 10,
  },
  "New Valley Governorate": {
    ar: "محافظة الوادي الجديد",
    lat: 24.5456,
    lng: 27.1735,
    zoom: 8,
  },
  "North Sinai Governorate": {
    ar: "محافظة شمال سيناء",
    lat: 31.0753,
    lng: 33.8295,
    zoom: 8,
  },
  "Port Said Governorate": {
    ar: "محافظة بورسعيد",
    lat: 31.2653,
    lng: 32.3019,
    zoom: 12,
  },
  "Qalyubia Governorate": {
    ar: "محافظة القليوبية",
    lat: 30.3292,
    lng: 31.2168,
    zoom: 10,
  },
  "Qena Governorate": {
    ar: "محافظة قنا",
    lat: 26.1551,
    lng: 32.7168,
    zoom: 9,
  },
  "Red Sea Governorate": {
    ar: "محافظة البحر الأحمر",
    lat: 24.0883,
    lng: 35.1808,
    zoom: 8,
  },
  "Sohag Governorate": {
    ar: "محافظة سوهاج",
    lat: 26.5561,
    lng: 31.6948,
    zoom: 10,
  },
  "South Sinai Governorate": {
    ar: "محافظة جنوب سيناء",
    lat: 28.2725,
    lng: 33.6176,
    zoom: 8,
  },
  "Suez Governorate": {
    ar: "محافظة السويس",
    lat: 29.9668,
    lng: 32.5498,
    zoom: 11,
  },
}

const AR_TO_EN: Record<string, string> = {}
for (const [en, m] of Object.entries(EGYPT_GOVERNORATE_META)) {
  AR_TO_EN[m.ar] = en
}

export function governorateLabelAr(englishKey: string): string {
  return EGYPT_GOVERNORATE_META[englishKey]?.ar ?? englishKey
}

export function governorateMeta(englishKey: string): GovernorateMeta | undefined {
  return EGYPT_GOVERNORATE_META[englishKey]
}

/** Resolve stored DB value (Arabic or English) to CountriesNow English key, or null if unknown / manual */
export function resolveGovernorateEn(stored: string): string | null {
  const t = stored.trim()
  if (!t) return null
  if (EGYPT_GOVERNORATE_META[t]) return t
  return AR_TO_EN[t] ?? null
}

export function governorateArabicForApi(englishKey: string): string {
  return governorateLabelAr(englishKey)
}
