import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { UiLanguage } from '../types/home';

const UI_LANGUAGE_STORAGE_KEY = 'pailin-abroad.ui-language';

type UiLanguageContextValue = {
  uiLanguage: UiLanguage;
  setUiLanguage: (value: UiLanguage) => void;
};

const UiLanguageContext = createContext<UiLanguageContextValue | undefined>(undefined);

type UiLanguageProviderProps = {
  children: React.ReactNode;
};

export function UiLanguageProvider({ children }: UiLanguageProviderProps) {
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>('en');

  useEffect(() => {
    let isMounted = true;

    void AsyncStorage.getItem(UI_LANGUAGE_STORAGE_KEY)
      .then((storedLanguage) => {
        if (isMounted && (storedLanguage === 'en' || storedLanguage === 'th')) {
          setUiLanguage(storedLanguage);
        }
      })
      .catch((error) => {
        console.warn('[ui-language] failed to restore language', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const updateUiLanguage = useCallback((value: UiLanguage) => {
    setUiLanguage(value);
    void AsyncStorage.setItem(UI_LANGUAGE_STORAGE_KEY, value).catch((error) => {
      console.warn('[ui-language] failed to persist language', error);
    });
  }, []);

  const value = useMemo(
    () => ({
      uiLanguage,
      setUiLanguage: updateUiLanguage,
    }),
    [uiLanguage, updateUiLanguage]
  );

  return <UiLanguageContext.Provider value={value}>{children}</UiLanguageContext.Provider>;
}

export function useUiLanguage() {
  const context = useContext(UiLanguageContext);
  if (!context) {
    throw new Error('useUiLanguage must be used within UiLanguageProvider');
  }
  return context;
}
