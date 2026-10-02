import AsyncStorage from '@react-native-async-storage/async-storage';

export type LessonContentLanguage = 'en' | 'th';

const LESSON_CONTENT_LANGUAGE_STORAGE_KEY = 'pailin-abroad.lesson-content-language';

let currentLanguage: LessonContentLanguage = 'en';
let hydrationPromise: Promise<LessonContentLanguage> | null = null;

export function getLessonContentLanguage(): LessonContentLanguage {
  return currentLanguage;
}

export function setLessonContentLanguage(language: LessonContentLanguage) {
  currentLanguage = language;
  void AsyncStorage.setItem(LESSON_CONTENT_LANGUAGE_STORAGE_KEY, language).catch((error) => {
    console.warn('[lesson-language] failed to persist language', error);
  });
}

export function hydrateLessonContentLanguage(): Promise<LessonContentLanguage> {
  if (hydrationPromise) return hydrationPromise.then(() => currentLanguage);

  hydrationPromise = AsyncStorage.getItem(LESSON_CONTENT_LANGUAGE_STORAGE_KEY)
    .then((storedLanguage) => {
      if (storedLanguage === 'en' || storedLanguage === 'th') {
        currentLanguage = storedLanguage;
      }
      return currentLanguage;
    })
    .catch((error) => {
      console.warn('[lesson-language] failed to restore language', error);
      return currentLanguage;
    });

  return hydrationPromise;
}
