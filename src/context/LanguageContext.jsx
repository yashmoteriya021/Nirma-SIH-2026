import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import translations from '../data/translations.json';

const LanguageContext = createContext();

const STORAGE_KEY = 'schemesetu-lang';

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang === 'hi' ? 'hi' : 'en';
    } catch {
      // localStorage not available
    }
  }, [lang]);

  const setLang = useCallback((newLang) => {
    setLangState(newLang);
  }, []);

  const toggleLang = useCallback(() => {
    setLangState(prev => prev === 'en' ? 'hi' : 'en');
  }, []);

  // Translation helper: t('home.hero.title') returns the string for current lang
  const t = useCallback((key) => {
    const keys = key.split('.');
    let value = translations;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // fallback to key if not found
      }
    }
    if (value && typeof value === 'object' && lang in value) {
      return value[lang];
    }
    if (typeof value === 'string') {
      return value;
    }
    return key;
  }, [lang]);

  // For accessing bilingual data objects directly (e.g., scheme.name)
  const tData = useCallback((obj) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[lang] || obj['en'] || '';
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t, tData }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLang must be used within a LanguageProvider');
  }
  return context;
}

export default LanguageContext;
