import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import translationEn from './translation/en.json';
import translationRu from './translation/ru.json';
import uiRu from './translation/ui.ru.json';
import nounsRu from './translation/nouns.ru.json';

export const LANGUAGE_STORAGE_KEY = 'bruno-clean.language';
let language = 'ru';
try {
  const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (saved === 'en' || saved === 'ru') language = saved;
} catch {
  // Restricted storage must not prevent the application from starting.
}

const resources = {
  en: {
    translation: translationEn
  },
  ru: {
    translation: translationRu,
    ui: uiRu,
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
