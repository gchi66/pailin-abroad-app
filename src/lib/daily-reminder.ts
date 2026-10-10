import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  getCheckpointReminderCopy,
  getGenericReminderCopy,
  getInactivityReminderCopy,
  getLessonReminderCopy,
} from '@/src/copy/daily-reminders';

const DAILY_REMINDER_ID_STORAGE_KEY = 'pailin-abroad.daily-reminder-id';
const DAILY_REMINDER_ENABLED_STORAGE_KEY = 'pailin-abroad.daily-reminder-enabled';
const DAILY_REMINDER_RANDOM_SEED_STORAGE_KEY = 'pailin-abroad.daily-reminder-random-seed';
const DAILY_REMINDER_CHANNEL_ID = 'daily-reminders';
const DAILY_REMINDER_DATA_KEY = 'pailinDailyReminder';
const DAILY_REMINDER_START_HOUR = 17;
const DAILY_REMINDER_END_HOUR = 20;
const MINUTES_PER_HOUR = 60;
let dailyReminderOperation: Promise<void> = Promise.resolve();

export type ReminderLanguage = 'en' | 'th';

const legacyReminderCopy: Record<ReminderLanguage, { title: string; body: string }> = {
  en: {
    title: 'A little English every day',
    body: 'Keep your momentum going with a quick lesson today.',
  },
  th: {
    title: 'ฝึกภาษาอังกฤษวันละนิด',
    body: 'รักษาความต่อเนื่องด้วยบทเรียนสั้น ๆ วันนี้',
  },
};

const runDailyReminderOperation = <T,>(operation: () => Promise<T>) => {
  const result = dailyReminderOperation.then(operation, operation);
  dailyReminderOperation = result.then(
    () => undefined,
    () => undefined
  );
  return result;
};

const getDailyReminderRandomSeed = async () => {
  const storedValue = await AsyncStorage.getItem(DAILY_REMINDER_RANDOM_SEED_STORAGE_KEY);
  const storedSeed = storedValue === null ? Number.NaN : Number(storedValue);
  if (Number.isInteger(storedSeed) && storedSeed >= 0 && storedSeed <= 0xffff_ffff) {
    return storedSeed;
  }

  const seed = Math.floor(Math.random() * 0x1_0000_0000);
  await AsyncStorage.setItem(DAILY_REMINDER_RANDOM_SEED_STORAGE_KEY, String(seed));
  return seed;
};

const setRandomDailyReminderTime = (date: Date, seed: number) => {
  const startMinute = DAILY_REMINDER_START_HOUR * MINUTES_PER_HOUR;
  const endMinute = DAILY_REMINDER_END_HOUR * MINUTES_PER_HOUR;
  const localCalendarDay =
    date.getFullYear() * 10_000 + (date.getMonth() + 1) * 100 + date.getDate();
  let hash = seed ^ localCalendarDay;
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  hash ^= hash >>> 16;
  const randomFraction = (hash >>> 0) / 0x1_0000_0000;
  const minuteOfDay =
    startMinute + Math.floor(randomFraction * (endMinute - startMinute + 1));

  date.setHours(
    Math.floor(minuteOfDay / MINUTES_PER_HOUR),
    minuteOfDay % MINUTES_PER_HOUR,
    0,
    0,
  );
};

const isLegacyDailyReminder = (request: Notifications.NotificationRequest) => {
  const { data, title } = request.content;
  const knownTitles = Object.values(legacyReminderCopy).map((copy) => copy.title);

  return data?.destination === '/(tabs)' && typeof title === 'string' && knownTitles.includes(title);
};

const cancelAllDailyReminders = async () => {
  const storedIdentifier = await AsyncStorage.getItem(DAILY_REMINDER_ID_STORAGE_KEY);
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  const dailyReminders = scheduledNotifications.filter(
    (request) =>
      request.identifier === storedIdentifier ||
      request.content.data?.[DAILY_REMINDER_DATA_KEY] === true ||
      isLegacyDailyReminder(request)
  );

  await Promise.all(
    dailyReminders.map((request) =>
      Notifications.cancelScheduledNotificationAsync(request.identifier).catch(() => {})
    )
  );
  await AsyncStorage.removeItem(DAILY_REMINDER_ID_STORAGE_KEY);
};

const canDisplayNotifications = async () => {
  const permissions = await Notifications.getPermissionsAsync();
  return (
    permissions.granted ||
    permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
};

const configureAndroidChannel = async () => {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(DAILY_REMINDER_CHANNEL_ID, {
    name: 'Daily learning reminders',
    description: 'A daily reminder when you have not opened Pailin Abroad.',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#3CA0FE',
  });
};

export const cancelDailyReminder = () => runDailyReminderOperation(cancelAllDailyReminders);

export const isDailyReminderEnabled = async () =>
  (await AsyncStorage.getItem(DAILY_REMINDER_ENABLED_STORAGE_KEY)) === 'true';

export const disableDailyReminder = () =>
  runDailyReminderOperation(async () => {
    await AsyncStorage.setItem(DAILY_REMINDER_ENABLED_STORAGE_KEY, 'false');
    await cancelAllDailyReminders();
  });

export type DailyReminderLesson = {
  id: string;
  lessonExternalId?: string | null;
  level?: number | null;
  libraryRoute?: 'library' | 'free-library';
  isCheckpoint?: boolean;
};

const getReminderCopy = (
  inactiveDays: number,
  genericIndex: number,
  language: ReminderLanguage,
  lesson?: DailyReminderLesson | null,
) => {
  const inactivityCopy = getInactivityReminderCopy(inactiveDays, language);
  if (inactiveDays === 2 || inactiveDays === 5 || (inactiveDays >= 7 && inactiveDays % 7 === 0)) {
    return inactivityCopy;
  }

  if (lesson?.isCheckpoint && typeof lesson.level === 'number') {
    const checkpointCopy = getCheckpointReminderCopy(lesson.level, language);
    if (checkpointCopy) return checkpointCopy;
  }

  if (lesson?.lessonExternalId) {
    const lessonCopy = getLessonReminderCopy(lesson.lessonExternalId, language);
    if (lessonCopy) return lessonCopy;
  }

  return getGenericReminderCopy(genericIndex, language);
};

export const scheduleDailyReminder = (
  language: ReminderLanguage,
  lesson?: DailyReminderLesson | null,
) =>
  runDailyReminderOperation(async () => {
    if (Platform.OS === 'web') {
      return false;
    }

    // Clear every tagged reminder, plus reminders created by older app versions
    // that only stored one identifier and could leave duplicates behind.
    await cancelAllDailyReminders();

    if (!(await isDailyReminderEnabled()) || !(await canDisplayNotifications())) {
      return false;
    }

    await configureAndroidChannel();

    const identifiers: string[] = [];
    const now = new Date();
    const randomSeed = await getDailyReminderRandomSeed();

    // Date uses the device's local timezone. Each calendar day gets an independent
    // reminder time from 5:00 PM through 8:00 PM.
    for (let inactiveDays = 0; inactiveDays <= 28; inactiveDays += 1) {
      const notificationDate = new Date(now);
      notificationDate.setDate(now.getDate() + inactiveDays);
      setRandomDailyReminderTime(notificationDate, randomSeed);
      if (notificationDate.getTime() <= now.getTime()) continue;

      const calendarDayIndex = Math.floor(notificationDate.getTime() / 86_400_000);
      const copy = getReminderCopy(inactiveDays, calendarDayIndex, language, lesson);
      if (!copy) continue;

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          ...copy,
          data: {
            destination: lesson?.id
              ? `/(tabs)/lessons/${lesson.libraryRoute ?? 'free-library'}`
              : '/(tabs)',
            [DAILY_REMINDER_DATA_KEY]: true,
            ...(lesson?.id
              ? {
                  lessonId: lesson.id,
                  libraryRoute: lesson.libraryRoute,
                  overview: true,
                }
              : {}),
          },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: notificationDate,
          channelId: Platform.OS === 'android' ? DAILY_REMINDER_CHANNEL_ID : undefined,
        },
      });
      identifiers.push(identifier);
    }

    await AsyncStorage.setItem(DAILY_REMINDER_ID_STORAGE_KEY, JSON.stringify(identifiers));
    return true;
  });

export const requestDailyReminderPermission = async (
  language: ReminderLanguage,
  lesson?: DailyReminderLesson | null,
) => {
  if (Platform.OS === 'web') {
    return false;
  }

  await configureAndroidChannel();

  const currentPermissions = await Notifications.getPermissionsAsync();
  const permissions =
    currentPermissions.granted ||
    currentPermissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
      ? currentPermissions
      : await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: false,
            allowSound: true,
          },
        });

  const granted =
    permissions.granted ||
    permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

  if (!granted) {
    return false;
  }

  await AsyncStorage.setItem(DAILY_REMINDER_ENABLED_STORAGE_KEY, 'true');
  return scheduleDailyReminder(language, lesson);
};
