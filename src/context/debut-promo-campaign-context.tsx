import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname, useRouter } from 'expo-router';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { prefetchPricing } from '@/src/api/pricing';
import { DebutPromoModal } from '@/src/components/promo/DebutPromoModal';
import { isMembershipPromotionActive, MEMBERSHIP_PROMOTION } from '@/src/config/membership-promotion';
import { posthog } from '@/src/config/posthog';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';

type DebutPromoCampaignState = {
  sessionCount: number;
  impressionCount: number;
  lastShownAt: number | null;
  lastDismissedAt: number | null;
  viewPlansAt: number | null;
};

type DebutPromoCampaignContextValue = {
  beginBlockingPrompt: () => () => void;
  notifyMeaningfulInteraction: () => void;
  notifyPathwayReady: () => void;
};

const EMPTY_CAMPAIGN_STATE: DebutPromoCampaignState = {
  sessionCount: 0,
  impressionCount: 0,
  lastShownAt: null,
  lastDismissedAt: null,
  viewPlansAt: null,
};

const STORAGE_KEY = `pailin-abroad.promo.${MEMBERSHIP_PROMOTION.campaignId}`;
const PROMPT_QUIET_PERIOD_MS = 5_000;
const PRIMARY_PATHS = new Set(['/', '/index']);
const MEANINGFUL_ROUTE_PREFIXES = ['/lessons', '/exercises', '/resources', '/pathway', '/account'];

let initialSessionRegistration: Promise<DebutPromoCampaignState> | null = null;

const parseCampaignState = (value: string | null): DebutPromoCampaignState => {
  if (!value) return { ...EMPTY_CAMPAIGN_STATE };

  try {
    const parsed = JSON.parse(value) as Partial<DebutPromoCampaignState>;
    return {
      sessionCount: typeof parsed.sessionCount === 'number' ? parsed.sessionCount : 0,
      impressionCount: typeof parsed.impressionCount === 'number' ? parsed.impressionCount : 0,
      lastShownAt: typeof parsed.lastShownAt === 'number' ? parsed.lastShownAt : null,
      lastDismissedAt: typeof parsed.lastDismissedAt === 'number' ? parsed.lastDismissedAt : null,
      viewPlansAt: typeof parsed.viewPlansAt === 'number' ? parsed.viewPlansAt : null,
    };
  } catch {
    return { ...EMPTY_CAMPAIGN_STATE };
  }
};

const persistCampaignState = async (state: DebutPromoCampaignState) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('[debut-promo] failed to persist campaign state', error);
  }
};

const registerInitialSession = () => {
  if (!initialSessionRegistration) {
    initialSessionRegistration = AsyncStorage.getItem(STORAGE_KEY)
      .then(parseCampaignState)
      .catch(() => ({ ...EMPTY_CAMPAIGN_STATE }))
      .then(async (storedState) => {
        const nextState = {
          ...storedState,
          sessionCount: storedState.sessionCount + 1,
        };
        await persistCampaignState(nextState);
        return nextState;
      });
  }

  return initialSessionRegistration;
};

const isMeaningfulRoute = (pathname: string) =>
  MEANINGFUL_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

const DebutPromoCampaignContext = createContext<DebutPromoCampaignContextValue | undefined>(undefined);

export function DebutPromoCampaignProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { uiLanguage } = useUiLanguage();
  const {
    hasAccount,
    hasCompletedOnboarding,
    hasMembership,
    isGuestMode,
    isLoading,
  } = useAppSession();
  const [campaignState, setCampaignState] = useState<DebutPromoCampaignState | null>(null);
  const [activeUseMs, setActiveUseMs] = useState(0);
  const [hasMeaningfulInteraction, setHasMeaningfulInteraction] = useState(false);
  const [pathwayReadyAt, setPathwayReadyAt] = useState<number | null>(null);
  const [blockingPromptCount, setBlockingPromptCount] = useState(0);
  const [promptQuietUntil, setPromptQuietUntil] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const campaignStateRef = useRef<DebutPromoCampaignState | null>(null);
  const pathnameRef = useRef(pathname);
  const previousPathnameRef = useRef<string | null>(null);
  const isPathwayReadyRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const activeUseAccumulatedRef = useRef(0);
  const activeUseStartedAtRef = useRef<number | null>(null);
  const backgroundedAtRef = useRef<number | null>(null);
  const isEligibleRef = useRef(false);

  const isEligible =
    !isLoading
    && !hasMembership
    && (isGuestMode || (hasAccount && hasCompletedOnboarding))
    && isMembershipPromotionActive();

  useEffect(() => {
    isEligibleRef.current = isEligible;
    if (isEligible && appStateRef.current === 'active' && !activeUseStartedAtRef.current) {
      activeUseStartedAtRef.current = Date.now();
    }
  }, [isEligible]);

  useEffect(() => {
    campaignStateRef.current = campaignState;
  }, [campaignState]);

  useEffect(() => {
    pathnameRef.current = pathname;
    const previousPathname = previousPathnameRef.current;
    if (previousPathname && previousPathname !== pathname && isMeaningfulRoute(pathname)) {
      const timeout = setTimeout(() => setHasMeaningfulInteraction(true), 0);
      previousPathnameRef.current = pathname;
      return () => clearTimeout(timeout);
    }
    previousPathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!isEligible || campaignStateRef.current) return;

    let isMounted = true;
    void registerInitialSession().then((state) => {
      if (isMounted) setCampaignState(state);
    });
    return () => {
      isMounted = false;
    };
  }, [isEligible]);

  useEffect(() => {
    if (!isEligible) return;

    const updateActiveUse = () => {
      const startedAt = activeUseStartedAtRef.current;
      const elapsed = startedAt ? Date.now() - startedAt : 0;
      const nextValue = Math.min(
        activeUseAccumulatedRef.current + elapsed,
        MEMBERSHIP_PROMOTION.popup.firstSessionActiveUseMs,
      );
      setActiveUseMs((current) => current === nextValue ? current : nextValue);
    };

    const interval = setInterval(updateActiveUse, 1_000);
    return () => clearInterval(interval);
  }, [isEligible]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const now = Date.now();
      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (previousAppState === 'active' && nextAppState !== 'active') {
        const startedAt = activeUseStartedAtRef.current;
        if (startedAt) activeUseAccumulatedRef.current += now - startedAt;
        activeUseStartedAtRef.current = null;
        backgroundedAtRef.current = now;
        return;
      }

      if (previousAppState !== 'active' && nextAppState === 'active') {
        activeUseStartedAtRef.current = now;
        const backgroundedAt = backgroundedAtRef.current;
        if (
          isEligibleRef.current
          && backgroundedAt
          && now - backgroundedAt >= MEMBERSHIP_PROMOTION.popup.backgroundSessionGapMs
        ) {
          const currentState = campaignStateRef.current;
          if (currentState) {
            const nextState = { ...currentState, sessionCount: currentState.sessionCount + 1 };
            campaignStateRef.current = nextState;
            setCampaignState(nextState);
            void persistCampaignState(nextState);
          }
          activeUseAccumulatedRef.current = 0;
          setActiveUseMs(0);
          if (isPathwayReadyRef.current && PRIMARY_PATHS.has(pathnameRef.current)) {
            setPathwayReadyAt(now);
          }
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const notifyMeaningfulInteraction = useCallback(() => {
    setHasMeaningfulInteraction(true);
  }, []);

  const notifyPathwayReady = useCallback(() => {
    isPathwayReadyRef.current = true;
    setPathwayReadyAt((current) => current ?? Date.now());
  }, []);

  const beginBlockingPrompt = useCallback(() => {
    let released = false;
    setBlockingPromptCount((count) => count + 1);

    return () => {
      if (released) return;
      released = true;
      setBlockingPromptCount((count) => Math.max(0, count - 1));
      setPromptQuietUntil(Date.now() + PROMPT_QUIET_PERIOD_MS);
    };
  }, []);

  useEffect(() => {
    if (
      !isEligible
      || !campaignState
      || isVisible
      || !PRIMARY_PATHS.has(pathname)
      || !pathwayReadyAt
      || blockingPromptCount > 0
      || campaignState.viewPlansAt
      || campaignState.impressionCount >= MEMBERSHIP_PROMOTION.popup.maxImpressions
    ) {
      return;
    }

    const now = Date.now();
    const lastInterruptionAt = campaignState.lastDismissedAt ?? campaignState.lastShownAt;
    const cooldownRemaining = campaignState.impressionCount > 0 && lastInterruptionAt
      ? MEMBERSHIP_PROMOTION.popup.dismissalCooldownMs - (now - lastInterruptionAt)
      : 0;
    if (cooldownRemaining > 0) return;

    const isFirstSessionQualified =
      campaignState.sessionCount === 1
      && activeUseMs >= MEMBERSHIP_PROMOTION.popup.firstSessionActiveUseMs
      && hasMeaningfulInteraction;
    const returningDelayRemaining = Math.max(
      0,
      MEMBERSHIP_PROMOTION.popup.returningSessionDelayMs - (now - pathwayReadyAt),
    );
    const isReturningSessionQualified = campaignState.sessionCount >= 2;

    if (!isFirstSessionQualified && !isReturningSessionQualified) return;

    const delay = Math.max(
      isReturningSessionQualified ? returningDelayRemaining : 250,
      promptQuietUntil - now,
      0,
    );
    const timeout = setTimeout(() => {
      if (!isEligibleRef.current || !PRIMARY_PATHS.has(pathnameRef.current)) return;

      const shownAt = Date.now();
      const currentState = campaignStateRef.current;
      if (!currentState) return;
      const nextState = {
        ...currentState,
        impressionCount: currentState.impressionCount + 1,
        lastShownAt: shownAt,
      };
      campaignStateRef.current = nextState;
      setCampaignState(nextState);
      void persistCampaignState(nextState);
      setIsVisible(true);
      posthog.capture('debut_promo_popup_shown', {
        campaign_id: MEMBERSHIP_PROMOTION.campaignId,
        impression_number: nextState.impressionCount,
        session_number: nextState.sessionCount,
      });
    }, delay);

    return () => clearTimeout(timeout);
  }, [
    activeUseMs,
    blockingPromptCount,
    campaignState,
    hasMeaningfulInteraction,
    isEligible,
    isVisible,
    pathname,
    pathwayReadyAt,
    promptQuietUntil,
  ]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    const currentState = campaignStateRef.current;
    if (!currentState) return;
    const nextState = { ...currentState, lastDismissedAt: Date.now() };
    campaignStateRef.current = nextState;
    setCampaignState(nextState);
    void persistCampaignState(nextState);
    posthog.capture('debut_promo_popup_dismissed', {
      campaign_id: MEMBERSHIP_PROMOTION.campaignId,
      impression_number: nextState.impressionCount,
    });
  }, []);

  const handleViewPlans = useCallback(() => {
    setIsVisible(false);
    const currentState = campaignStateRef.current;
    if (currentState) {
      const nextState = { ...currentState, viewPlansAt: Date.now() };
      campaignStateRef.current = nextState;
      setCampaignState(nextState);
      void persistCampaignState(nextState);
      posthog.capture('debut_promo_popup_view_plans', {
        campaign_id: MEMBERSHIP_PROMOTION.campaignId,
        impression_number: nextState.impressionCount,
      });
    }
    prefetchPricing();
    router.push({
      pathname: '/(tabs)/account/membership',
      params: { source: 'debut-popup' },
    });
  }, [router]);

  const value = useMemo(() => ({
    beginBlockingPrompt,
    notifyMeaningfulInteraction,
    notifyPathwayReady,
  }), [beginBlockingPrompt, notifyMeaningfulInteraction, notifyPathwayReady]);

  return (
    <DebutPromoCampaignContext.Provider value={value}>
      {children}
      <DebutPromoModal
        language={uiLanguage}
        onClose={handleDismiss}
        onViewPlans={handleViewPlans}
        visible={isVisible}
      />
    </DebutPromoCampaignContext.Provider>
  );
}

export function useDebutPromoCampaign() {
  const context = useContext(DebutPromoCampaignContext);
  if (!context) {
    throw new Error('useDebutPromoCampaign must be used within DebutPromoCampaignProvider');
  }
  return context;
}
