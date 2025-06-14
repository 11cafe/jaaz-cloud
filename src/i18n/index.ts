import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import translation files
import commonZh from "./locales/zh-CN/common.json";
import commonEn from "./locales/en/common.json";
import billingZh from "./locales/zh-CN/billing.json";
import billingEn from "./locales/en/billing.json";

const resources = {
  "zh-CN": {
    common: commonZh,
    billing: billingZh,
  },
  en: {
    common: commonEn,
    billing: billingEn,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "zh-CN",
    defaultNS: "common",
    ns: ["common", "billing"],

    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: "language",
      caches: ["localStorage"],
    },

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: false, // 避免 SSR 问题
    },
  });

export default i18n;
