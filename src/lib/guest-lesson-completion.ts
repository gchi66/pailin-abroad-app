import AsyncStorage from '@react-native-async-storage/async-storage';

const GUEST_COMPLETED_LESSONS_STORAGE_KEY = 'guest-completed-lessons-v1';

const normalizeLessonIds = (value: unknown) => {
  if (!Array.isArray(value)) return [];

  return [...new Set(value.filter((lessonId): lessonId is string =>
    typeof lessonId === 'string' && lessonId.trim().length > 0
  ))];
};

export async function getGuestCompletedLessonIds() {
  try {
    const storedValue = await AsyncStorage.getItem(GUEST_COMPLETED_LESSONS_STORAGE_KEY);
    if (!storedValue) return new Set<string>();

    return new Set(normalizeLessonIds(JSON.parse(storedValue) as unknown));
  } catch {
    return new Set<string>();
  }
}

export async function markGuestLessonCompleted(lessonId: string) {
  const normalizedLessonId = lessonId.trim();
  if (!normalizedLessonId) return;

  const completedLessonIds = await getGuestCompletedLessonIds();
  completedLessonIds.add(normalizedLessonId);
  await AsyncStorage.setItem(
    GUEST_COMPLETED_LESSONS_STORAGE_KEY,
    JSON.stringify([...completedLessonIds])
  );
}
