import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import rw from './locales/rw';

export const LANG_KEY = 'gov_lang';

const savedLang = typeof window !== 'undefined' ? window.localStorage.getItem(LANG_KEY) : null;

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    rw: { translation: rw },
  },
  lng: savedLang && ['en', 'rw'].includes(savedLang) ? savedLang : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
  returnEmptyString: false,
});

export default i18n;
