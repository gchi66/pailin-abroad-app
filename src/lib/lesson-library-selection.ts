import AsyncStorage from '@react-native-async-storage/async-storage';

type StageName = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

type LessonLibrarySelection = {
  stage: StageName;
  level: number | null;
};

const LESSON_LIBRARY_SELECTION_STORAGE_KEY = 'lesson-library-selection';
const STAGES: StageName[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

let currentSelection: LessonLibrarySelection = {
  stage: 'Beginner',
  level: null,
};
let progressRefreshToken = 0;
let hasHydratedSelection = false;

const normalizeSelection = (value: unknown): LessonLibrarySelection | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as { stage?: unknown; level?: unknown };
  if (!STAGES.includes(candidate.stage as StageName)) {
    return null;
  }

  const level =
    candidate.level === null || typeof candidate.level === 'number'
      ? (candidate.level as number | null)
      : null;

  return {
    stage: candidate.stage as StageName,
    level,
  };
};

export function getLessonLibrarySelection() {
  return currentSelection;
}

export function setLessonLibrarySelection(selection: LessonLibrarySelection) {
  currentSelection = selection;
  hasHydratedSelection = true;
  void AsyncStorage.setItem(LESSON_LIBRARY_SELECTION_STORAGE_KEY, JSON.stringify(selection)).catch(() => {});
}

export async function hydrateLessonLibrarySelection() {
  if (hasHydratedSelection) {
    return currentSelection;
  }

  hasHydratedSelection = true;

  try {
    const storedValue = await AsyncStorage.getItem(LESSON_LIBRARY_SELECTION_STORAGE_KEY);
    if (!storedValue) {
      return currentSelection;
    }

    const parsedValue = JSON.parse(storedValue) as unknown;
    const normalizedSelection = normalizeSelection(parsedValue);
    if (normalizedSelection) {
      currentSelection = normalizedSelection;
    }
  } catch {
    return currentSelection;
  }

  return currentSelection;
}

export function getLessonLibraryProgressRefreshToken() {
  return progressRefreshToken;
}

export function bumpLessonLibraryProgressRefreshToken() {
  progressRefreshToken += 1;
  return progressRefreshToken;
}
