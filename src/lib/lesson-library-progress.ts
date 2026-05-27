import {
  AppLessonProgressSummary,
  fetchAppLessonProgressSummaries,
} from '@/src/api/app-lesson-progress';

const LESSON_PROGRESS_BATCH_SIZE = 12;

type ProgressiveProgressLoadOptions = {
  lessonIds: string[];
  onPartial: (summaries: Record<string, AppLessonProgressSummary>) => void;
  isCancelled?: () => boolean;
  onError?: (error: unknown) => void;
};

export async function loadLessonProgressSummariesProgressively({
  lessonIds,
  onPartial,
  isCancelled,
  onError,
}: ProgressiveProgressLoadOptions) {
  if (!lessonIds.length) {
    return;
  }

  try {
    for (let start = 0; start < lessonIds.length; start += LESSON_PROGRESS_BATCH_SIZE) {
      if (isCancelled?.()) {
        return;
      }

      const lessonIdBatch = lessonIds.slice(start, start + LESSON_PROGRESS_BATCH_SIZE);
      const summaries = await fetchAppLessonProgressSummaries(lessonIdBatch);
      if (isCancelled?.()) {
        return;
      }

      onPartial(summaries);
    }
  } catch (error) {
    onError?.(error);
  }
}
