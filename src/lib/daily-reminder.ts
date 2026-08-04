import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const DAILY_REMINDER_ID_STORAGE_KEY = 'pailin-abroad.daily-reminder-id';
const DAILY_REMINDER_ENABLED_STORAGE_KEY = 'pailin-abroad.daily-reminder-enabled';
const DAILY_REMINDER_CHANNEL_ID = 'daily-reminders';
const DAILY_REMINDER_DATA_KEY = 'pailinDailyReminder';
const DAILY_REMINDER_HOUR = 19;
const DAILY_REMINDER_MINUTE = 0;
let dailyReminderOperation: Promise<void> = Promise.resolve();

export type ReminderLanguage = 'en' | 'th';

const reminderCopy: Record<ReminderLanguage, { title: string; body: string }> = {
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

const isLegacyDailyReminder = (request: Notifications.NotificationRequest) => {
  const { data, title } = request.content;
  const knownTitles = Object.values(reminderCopy).map((copy) => copy.title);

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

export const scheduleDailyReminder = (language: ReminderLanguage) =>
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

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        ...reminderCopy[language],
        data: {
          destination: '/(tabs)',
          [DAILY_REMINDER_DATA_KEY]: true,
        },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: DAILY_REMINDER_HOUR,
        minute: DAILY_REMINDER_MINUTE,
        channelId: Platform.OS === 'android' ? DAILY_REMINDER_CHANNEL_ID : undefined,
      },
    });

    await AsyncStorage.setItem(DAILY_REMINDER_ID_STORAGE_KEY, identifier);
    return true;
  });

export const requestDailyReminderPermission = async (language: ReminderLanguage) => {
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
  return scheduleDailyReminder(language);
};
