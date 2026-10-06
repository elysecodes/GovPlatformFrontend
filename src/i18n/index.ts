import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import rw from './locales/rw';

export const LANG_KEY = 'gov_lang';

type Dict = Record<string, any>;

function deepMerge(base: Dict, extra: Dict): Dict {
  const out: Dict = { ...base };
  for (const [k, v] of Object.entries(extra)) {
    const b = base[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && b && typeof b === 'object' && !Array.isArray(b)) {
      out[k] = deepMerge(b, v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

const extModules = import.meta.glob('./extends/*.ts', { eager: true });
const extList = Object.values(extModules) as Array<{ default?: { en?: Dict; rw?: Dict } }>;

let enBundle: Dict = en;
let rwBundle: Dict = rw;
for (const mod of extList) {
  const def = mod?.default;
  if (!def) continue;
  enBundle = deepMerge(enBundle, def.en ?? {});
  rwBundle = deepMerge(rwBundle, def.rw ?? {});
}

const savedLang =
  typeof window !== 'undefined' && typeof window.localStorage?.getItem === 'function' ? window.localStorage.getItem(LANG_KEY) : null;

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: enBundle },
    rw: { translation: rwBundle },
  },
  lng: savedLang && ['en', 'rw'].includes(savedLang) ? savedLang : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
  returnEmptyString: false,
});

export default i18n;