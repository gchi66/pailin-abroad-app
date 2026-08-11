import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { usePathwayData } from '@/src/hooks/use-pathway-data';
import type { DailyReminderLesson } from '@/src/lib/daily-reminder';
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
  const router = useRouter();
  const {
    hasAccount,
    hasCompletedOnboarding,
    hasMembership,
    isGuestMode,
    isLoading,
    user,
  } = useAppSession();
  const { uiLanguage } = useUiLanguage();
  const { resumeRow, isLoading: isPathwayLoading } = usePathwayData({
    enabled: hasAccount,
    hasMembership,
    userId: user?.id ?? null,
  });
  const promptStarted = useRef(false);
  const languageRef = useRef(uiLanguage);
  const lessonRef = useRef<DailyReminderLesson | null>(null);
  const resumeLesson = resumeRow?.lesson ?? null;
  const reminderLesson = useMemo<DailyReminderLesson | null>(
    () =>
      resumeLesson
        ? {
            id: resumeLesson.id,
            lessonExternalId:
              typeof resumeLesson.level === 'number' && typeof resumeLesson.lesson_order === 'number'
                ? `${resumeLesson.level}.${resumeLesson.lesson_order}`
                : null,
            level: resumeLesson.level,
            isCheckpoint: [resumeLesson.title, resumeLesson.title_th].some((title) =>
              String(title ?? '').toLowerCase().includes('checkpoint'),
            ),
          }
        : null,
    [resumeLesson],
  );

  useEffect(() => {
    languageRef.current = uiLanguage;
    lessonRef.current = reminderLesson;
  }, [reminderLesson, uiLanguage]);

  useEffect(() => {
    const openNotification = (response: Notifications.NotificationResponse) => {
      const destination = response.notification.request.content.data?.destination;
      if (typeof destination === 'string' && destination.startsWith('/')) {
        router.push(destination as never);
      }
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(openNotification);
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        openNotification(response);
        void Notifications.clearLastNotificationResponseAsync();
      }
    });
    return () => subscription.remove();
  }, [router]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    const refreshReminder = () => {
      void scheduleDailyReminder(languageRef.current, lessonRef.current).catch((error) => {
        console.warn('[daily-reminder] failed to refresh reminder', error);
      });
    };

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refreshReminder();
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const isEligible =
      !isLoading &&
      (!hasAccount || !isPathwayLoading) &&
      (hasCompletedOnboarding || isGuestMode);
    if (Platform.OS === 'web' || !isEligible) {
      return;
    }

    let isCancelled = false;

    void (async () => {
      const permissions = await Notifications.getPermissionsAsync();
      if (
        permissions.granted ||
        permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
      ) {
        await scheduleDailyReminder(uiLanguage, reminderLesson);
        return;
      }

      if (!permissions.canAskAgain || isCancelled || promptStarted.current) {
        return;
      }

      promptStarted.current = true;
      await requestDailyReminderPermission(uiLanguage, reminderLesson);
    })().catch((error) => {
      console.warn('[daily-reminder] failed to initialize reminder', error);
    });

    return () => {
      isCancelled = true;
    };
  }, [
    hasAccount,
    hasCompletedOnboarding,
    isGuestMode,
    isLoading,
    isPathwayLoading,
    reminderLesson,
    uiLanguage,
  ]);

  return null;
}
