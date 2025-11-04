import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import usePersistentState from '../hooks/usePersistentState';

// JSON files will be fetched, not imported.

type Language = 'en-US' | 'vi-VN';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, options?: { [key: string]: string | number }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// This will act as a cache for the fetched translations
const loadedTranslations: { [key: string]: any } = {};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = usePersistentState<Language>('language', 'en-US');
  const [translationsLoaded, setTranslationsLoaded] = useState(false);

  useEffect(() => {
    const fetchTranslations = async () => {
      // Check if already loaded to avoid re-fetching
      if (Object.keys(loadedTranslations).length > 0) {
        setTranslationsLoaded(true);
        return;
      }
      try {
        // Use absolute paths from the root, which is more robust for fetch
        const [enRes, viRes] = await Promise.all([
          fetch('/locales/en.json'),
          fetch('/locales/vi.json')
        ]);

        if (!enRes.ok || !viRes.ok) {
          throw new Error('Failed to fetch translation files');
        }

        loadedTranslations['en-US'] = await enRes.json();
        loadedTranslations['vi-VN'] = await viRes.json();
        
        setTranslationsLoaded(true);
      } catch (error) {
        console.error("Error loading translations:", error);
      }
    };

    fetchTranslations();
  }, []); // Empty dependency array ensures this runs only once

  const t = useCallback((key: string, options?: { [key: string]: string | number }) => {
    if (!translationsLoaded) {
      return key;
    }
    
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
  }, [language, translationsLoaded]);

  if (!translationsLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-contest-dark text-white font-sans">
        <div className="flex items-center space-x-3 text-lg">
          <div className="w-6 h-6 border-4 border-contest-primary border-t-transparent rounded-full animate-spin"></div>
          <span>Loading translations...</span>
        </div>
      </div>
    );
  }

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
