import React, { createContext, useContext, useMemo, useState } from 'react';

type AppSessionContextValue = {
  hasAccount: boolean;
  setHasAccount: (value: boolean) => void;
};

const AppSessionContext = createContext<AppSessionContextValue | undefined>(undefined);

type AppSessionProviderProps = {
  children: React.ReactNode;
};

export function AppSessionProvider({ children }: AppSessionProviderProps) {
  const [hasAccount, setHasAccount] = useState(false);

  const value = useMemo(
    () => ({
      hasAccount,
      setHasAccount,
    }),
    [hasAccount]
  );

  return <AppSessionContext.Provider value={value}>{children}</AppSessionContext.Provider>;
}

export function useAppSession() {
  const context = useContext(AppSessionContext);
  if (!context) {
    throw new Error('useAppSession must be used within AppSessionProvider');
  }
  return context;
}
