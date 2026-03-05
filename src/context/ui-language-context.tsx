import React, { createContext, useContext, useMemo, useState } from 'react';

import { UiLanguage } from '../types/home';

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

  const value = useMemo(
    () => ({
      uiLanguage,
      setUiLanguage,
    }),
    [uiLanguage]
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

