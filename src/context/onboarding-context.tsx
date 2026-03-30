import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ONBOARDING_STORAGE_KEY = 'pailin-abroad.has-seen-onboarding';

type OnboardingContextValue = {
  hasSeenOnboarding: boolean;
  isHydrating: boolean;
  markOnboardingComplete: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

type OnboardingProviderProps = {
  children: React.ReactNode;
};

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        const storedValue = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
        if (!isMounted) {
          return;
        }
        setHasSeenOnboarding(storedValue === 'true');
      } catch (error) {
        console.warn('Failed to load onboarding state.', error);
      } finally {
        if (isMounted) {
          setIsHydrating(false);
        }
      }
    };

    void hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  const markOnboardingComplete = async () => {
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setHasSeenOnboarding(true);
  };

  const resetOnboarding = async () => {
    await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
    setHasSeenOnboarding(false);
  };

  const value = useMemo(
    () => ({
      hasSeenOnboarding,
      isHydrating,
      markOnboardingComplete,
      resetOnboarding,
    }),
    [hasSeenOnboarding, isHydrating]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}
