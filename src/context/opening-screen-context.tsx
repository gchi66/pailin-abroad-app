import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const OPENING_SCREEN_SEEN_STORAGE_KEY = 'pailin-abroad.opening-screen-seen.v1';

type OpeningScreenContextValue = {
  hasSeenOpeningScreen: boolean;
  isOpeningScreenStateReady: boolean;
  completeOpeningScreen: () => Promise<void>;
};

const OpeningScreenContext = createContext<OpeningScreenContextValue | null>(null);

export function OpeningScreenProvider({ children }: PropsWithChildren) {
  const [hasSeenOpeningScreen, setHasSeenOpeningScreen] = useState(false);
  const [isOpeningScreenStateReady, setIsOpeningScreenStateReady] = useState(false);

  useEffect(() => {
    let isActive = true;

    void AsyncStorage.getItem(OPENING_SCREEN_SEEN_STORAGE_KEY)
      .then((storedValue) => {
        if (isActive) setHasSeenOpeningScreen(storedValue === 'true');
      })
      .catch((error) => {
        console.warn('[opening-screen] Could not load opening-screen state', error);
      })
      .finally(() => {
        if (isActive) setIsOpeningScreenStateReady(true);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const completeOpeningScreen = useCallback(async () => {
    setHasSeenOpeningScreen(true);
    try {
      await AsyncStorage.setItem(OPENING_SCREEN_SEEN_STORAGE_KEY, 'true');
    } catch (error) {
      setHasSeenOpeningScreen(false);
      throw error;
    }
  }, []);

  const value = useMemo(
    () => ({ hasSeenOpeningScreen, isOpeningScreenStateReady, completeOpeningScreen }),
    [completeOpeningScreen, hasSeenOpeningScreen, isOpeningScreenStateReady]
  );

  return <OpeningScreenContext.Provider value={value}>{children}</OpeningScreenContext.Provider>;
}

export function useOpeningScreen() {
  const context = useContext(OpeningScreenContext);
  if (!context) throw new Error('useOpeningScreen must be used inside OpeningScreenProvider.');
  return context;
}
