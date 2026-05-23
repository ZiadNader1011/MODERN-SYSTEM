import i18n from 'i18next';
import { initReactI18next } from 'react-i18next'; // 👈 استيراد قياسي وسليم
import LanguageDetector from 'i18next-browser-languagedetector'; // 👈 استيراد متوافق مع نظام Vite و Vercel

import translationEN from './data/locales/en/translation.json';
import translationAR from './data/locales/ar/translation.json';

const resources = {
  en: {
    translation: translationEN,
  },
  ar: {
    translation: translationAR,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    detection: {
      order: ['localStorage', 'cookie', 'htmlTag', 'memory'],
      caches: ['localStorage', 'cookie'],
    },
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    react: {
      useSuspense: true, // 👈 متوافق تماماً مع الـ Suspense الذي أضفناه في الـ App.tsx
    }
  });

// Apply document direction automatically
const applyDir = (lng: string) => {
  if (typeof window !== 'undefined') {
    document.documentElement.dir = i18n.dir(lng);
    document.documentElement.lang = lng;
  }
};

// Initial apply
applyDir(i18n.language || 'en');

i18n.on('languageChanged', (lng) => {
  applyDir(lng);
});

export default i18n;