import { createContext, useContext, useState } from 'react';
import { translations } from '../utils/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('preferred_language');
      if (saved === 'en' || saved === 'hi') return saved;
      
      // Auto-detect browser language
      const browserLang = navigator.language || navigator.userLanguage;
      if (browserLang && browserLang.startsWith('hi')) {
        return 'hi';
      }
    }
    return 'en'; // default
  });

  const setLanguage = (lang) => {
    if (lang === 'en' || lang === 'hi') {
      setLanguageState(lang);
      if (typeof window !== 'undefined') {
        localStorage.setItem('preferred_language', lang);
      }
    }
  };

  // Helper to translate key paths like 'hero.title'
  const t = (path, params = {}) => {
    const keys = path.split('.');
    let translation = translations[language];
    
    for (const key of keys) {
      if (translation && translation[key] !== undefined) {
        translation = translation[key];
      } else {
        // Fallback to English if Hindi key is missing
        let fallback = translations['en'];
        for (const fKey of keys) {
          if (fallback && fallback[fKey] !== undefined) {
            fallback = fallback[fKey];
          } else {
            fallback = path; // key path itself
            break;
          }
        }
        translation = fallback;
        break;
      }
    }

    if (typeof translation === 'string') {
      let result = translation;
      Object.keys(params).forEach(key => {
        result = result.replace(new RegExp(`{${key}}`, 'g'), params[key]);
      });
      return result;
    }

    return translation || path;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
