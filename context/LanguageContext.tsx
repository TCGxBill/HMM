import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import usePersistentState from '../hooks/usePersistentState';
import enTranslations from '../locales/en.json';
import viTranslations from '../locales/vi.json';

type Language = 'en-US' | 'vi-VN';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, options?: { [key: string]: string | number }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const loadedTranslations: { [key: string]: any } = {
  'en-US': enTranslations,
  'vi-VN': viTranslations,
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = usePersistentState<Language>('language', 'en-US');

  const t = useCallback((key: string, options?: { [key: string]: string | number }) => {
    const languageSet = loadedTranslations[language] || loadedTranslations['en-US'];
    let translation = languageSet;
    
    const keys = key.split('.');
    for (const k of keys) {
      if (translation && typeof translation === 'object' && k in translation) {
        translation = translation[k];
      } else {
        // Fallback to English
        const fallbackSet = loadedTranslations['en-US'];
        let fallbackTranslation = fallbackSet;
        if (!fallbackSet) return key;

        for (const k_en of keys) {
          if (fallbackTranslation && typeof fallbackTranslation === 'object' && k_en in fallbackTranslation) {
            fallbackTranslation = fallbackTranslation[k_en];
          } else {
            return key; // Return the key itself if not found anywhere
          }
        }
        translation = fallbackTranslation;
        break;
      }
    }

    if (typeof translation !== 'string') {
      return key;
    }
    
    if (options) {
      return translation.replace(/\{(\w+)\}/g, (_, key) => String(options[key] || `{${key}}`));
    }

    return translation;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return { t: context.t };
};
