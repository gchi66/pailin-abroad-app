import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import {
  requestDailyReminderPermission,
  scheduleDailyReminder,
} from '@/src/lib/daily-reminder';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

export function DailyReminderManager() {
  const { hasCompletedOnboarding, isGuestMode, isLoading } = useAppSession();
  const { uiLanguage } = useUiLanguage();
  const promptStarted = useRef(false);
  const languageRef = useRef(uiLanguage);

  useEffect(() => {
    languageRef.current = uiLanguage;
    void scheduleDailyReminder(uiLanguage).catch((error) => {
      console.warn('[daily-reminder] failed to update reminder language', error);
    });
  }, [uiLanguage]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    const refreshReminder = () => {
      void scheduleDailyReminder(languageRef.current).catch((error) => {
        console.warn('[daily-reminder] failed to refresh reminder', error);
      });
    };

    refreshReminder();
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refreshReminder();
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const isEligible = !isLoading && (hasCompletedOnboarding || isGuestMode);
    if (Platform.OS === 'web' || !isEligible || promptStarted.current) {
      return;
    }

    promptStarted.current = true;
    let isCancelled = false;

    void (async () => {
      const permissions = await Notifications.getPermissionsAsync();
      if (
        permissions.granted ||
        permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
      ) {
        await scheduleDailyReminder(uiLanguage);
        return;
      }

      if (!permissions.canAskAgain || isCancelled) {
        return;
      }

      await requestDailyReminderPermission(uiLanguage);
    })().catch((error) => {
      console.warn('[daily-reminder] failed to initialize reminder', error);
    });

    return () => {
      isCancelled = true;
    };
  }, [hasCompletedOnboarding, isGuestMode, isLoading, uiLanguage]);

  return null;
}
