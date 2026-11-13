import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import translationEn from './translation/en.json';
import translationRu from './translation/ru.json';
import uiRu from './translation/ui.ru.json';
import nounsRu from './translation/nouns.ru.json';
import uiRuIt from './translation/ui.ru-it.json';

export const LANGUAGE_STORAGE_KEY = 'bruno-clean.language';
export const ENGLISH_TERMS_STORAGE_KEY = 'bruno-clean.english-it-terms';
let language = 'ru';
export let englishTermsEnabled = false;
try {
  const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (saved === 'en' || saved === 'ru') language = saved;
  englishTermsEnabled = window.localStorage.getItem(ENGLISH_TERMS_STORAGE_KEY) === 'true';
} catch {
  // Restricted storage must not prevent the application from starting.
}

const resources = {
  en: {
    translation: translationEn
  },
  ru: {
    translation: translationRu,
    ui: englishTermsEnabled ? { ...uiRu, ...uiRuIt } : uiRu,
    nouns: nounsRu
  }
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: language,
    fallbackLng: 'en',
    initImmediate: false,

    ns: ['translation', 'ui', 'nouns'],
    defaultNS: 'translation',

    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
