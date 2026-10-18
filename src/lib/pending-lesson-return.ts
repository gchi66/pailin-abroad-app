import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_LESSON_RETURN_STORAGE_KEY = 'pailin-abroad.pending-lesson-return';
const PENDING_LESSON_RETURN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type PendingLessonReturn = {
  lessonId: string;
  libraryRoute?: 'library' | 'free-library';
};

type StoredPendingLessonReturn = PendingLessonReturn & {
  createdAt: number;
};

const parsePendingLessonReturn = (value: string | null): StoredPendingLessonReturn | null => {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<StoredPendingLessonReturn>;
    if (
      typeof parsed.lessonId !== 'string' ||
      !parsed.lessonId.trim() ||
      typeof parsed.createdAt !== 'number' ||
      Date.now() - parsed.createdAt > PENDING_LESSON_RETURN_MAX_AGE_MS ||
      (parsed.libraryRoute !== undefined &&
        parsed.libraryRoute !== 'library' &&
        parsed.libraryRoute !== 'free-library')
    ) {
      return null;
    }

    return {
      lessonId: parsed.lessonId.trim(),
      createdAt: parsed.createdAt,
      ...(parsed.libraryRoute ? { libraryRoute: parsed.libraryRoute } : {}),
    };
  } catch {
    return null;
  }
};

export async function savePendingLessonReturn(destination: PendingLessonReturn) {
  const value: StoredPendingLessonReturn = {
    ...destination,
    lessonId: destination.lessonId.trim(),
    createdAt: Date.now(),
  };
  await AsyncStorage.setItem(PENDING_LESSON_RETURN_STORAGE_KEY, JSON.stringify(value));
}

export async function takePendingLessonReturn(): Promise<PendingLessonReturn | null> {
  const storedValue = await AsyncStorage.getItem(PENDING_LESSON_RETURN_STORAGE_KEY);
  const destination = parsePendingLessonReturn(storedValue);
  await AsyncStorage.removeItem(PENDING_LESSON_RETURN_STORAGE_KEY);
  if (!destination) return null;

  return {
    lessonId: destination.lessonId,
    ...(destination.libraryRoute ? { libraryRoute: destination.libraryRoute } : {}),
  };
}
