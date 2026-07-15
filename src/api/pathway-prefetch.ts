import { getLessonsIndex } from '@/src/api/lessons';
import {
  CompletedLessonProgress,
  DailyStreakResponse,
  fetchDailyStreak,
  fetchUserCompletedLessons,
  fetchUserLessonEngagements,
} from '@/src/api/user';
import { LessonListItem } from '@/src/types/lesson';

const PATHWAY_PREFETCH_TTL_MS = 30_000;

export type PathwayDataPrefetch = {
  completedLessons: Promise<CompletedLessonProgress[]>;
  dailyStreak: Promise<DailyStreakResponse>;
  lessonEngagements: ReturnType<typeof fetchUserLessonEngagements>;
  lessonIndex: Promise<LessonListItem[]>;
  startedAt: number;
};

const pathwayPrefetches = new Map<string, PathwayDataPrefetch>();

const markRejectionHandled = <T,>(promise: Promise<T>) => {
  void promise.catch(() => undefined);
  return promise;
};

export const prefetchPathwayData = (userId: string) => {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return null;
  }

  const existing = pathwayPrefetches.get(normalizedUserId);
  if (existing && Date.now() - existing.startedAt <= PATHWAY_PREFETCH_TTL_MS) {
    return existing;
  }

  const prefetch: PathwayDataPrefetch = {
    completedLessons: markRejectionHandled(fetchUserCompletedLessons()),
    dailyStreak: markRejectionHandled(fetchDailyStreak()),
    lessonEngagements: markRejectionHandled(fetchUserLessonEngagements()),
    lessonIndex: markRejectionHandled(getLessonsIndex()),
    startedAt: Date.now(),
  };

  pathwayPrefetches.set(normalizedUserId, prefetch);
  console.info('[pathway-prefetch]', 'started');
  return prefetch;
};

export const consumePathwayDataPrefetch = (userId: string) => {
  const normalizedUserId = userId.trim();
  const prefetch = pathwayPrefetches.get(normalizedUserId) ?? null;
  pathwayPrefetches.delete(normalizedUserId);

  if (!prefetch || Date.now() - prefetch.startedAt > PATHWAY_PREFETCH_TTL_MS) {
    return null;
  }

  console.info('[pathway-prefetch]', 'consumed', {
    ageMs: Date.now() - prefetch.startedAt,
  });
  return prefetch;
};

export const clearPathwayDataPrefetch = () => {
  pathwayPrefetches.clear();
};
