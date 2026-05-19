import {
  AppLessonProgressSummary,
  fetchAppLessonProgressSummaries,
} from '@/src/api/app-lesson-progress';

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
    for (const lessonId of lessonIds) {
      if (isCancelled?.()) {
        return;
      }

      const summaries = await fetchAppLessonProgressSummaries([lessonId]);
      if (isCancelled?.()) {
        return;
      }

      onPartial(summaries);
    }
  } catch (error) {
    onError?.(error);
  }
}
