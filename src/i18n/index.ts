import i18n from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"

import ar from "@/i18n/locales/ar.json"
import en from "@/i18n/locales/en.json"

function syncDocumentLangDir(lng: string) {
  const html = document.documentElement
  const base = lng.split("-")[0] ?? lng
  html.lang = lng
  html.dir = base === "ar" ? "rtl" : "ltr"
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "ar"],
    load: "languageOnly",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "orbex-locale",
    },
  })
  .then(() => {
    syncDocumentLangDir(i18n.language)
  })

i18n.on("languageChanged", syncDocumentLangDir)

export default i18n
