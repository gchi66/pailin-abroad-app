import { useEffect, useMemo, useState } from 'react';

import { getLessonsIndex } from '@/src/api/lessons';
import {
  CompletedLessonProgress,
  UserStats,
  fetchUserCompletedLessons,
  fetchUserPathwayLessons,
  fetchUserStats,
  upsertLessonCompletion,
} from '@/src/api/user';
import { LessonListItem } from '@/src/types/lesson';

type StageName = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export type PathwayLessonState = 'available' | 'completed' | 'locked';

export type PathwayLessonRow = {
  lesson: LessonListItem;
  state: PathwayLessonState;
};

type UsePathwayDataParams = {
  enabled?: boolean;
  hasMembership: boolean;
};

const STAGE_ORDER: StageName[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const PATHWAY_TIMING_LABEL = '[pathway-load]';

const getElapsedMs = (startedAt: number) => Date.now() - startedAt;

const logRequestTiming = (name: string, startedAt: number, metadata?: Record<string, unknown>) => {
  console.info(PATHWAY_TIMING_LABEL, `${name} loaded`, {
    elapsedMs: getElapsedMs(startedAt),
    ...metadata,
  });
};

const logRequestFailure = (name: string, startedAt: number, error: unknown) => {
  console.warn(PATHWAY_TIMING_LABEL, `${name} failed`, {
    elapsedMs: getElapsedMs(startedAt),
    error: error instanceof Error ? error.message : 'Unknown error',
  });
};

const withRequestTiming = async <T,>(
  name: string,
  request: () => Promise<T>,
  getMetadata?: (result: T) => Record<string, unknown>,
) => {
  const startedAt = Date.now();

  try {
    const result = await request();
    logRequestTiming(name, startedAt, getMetadata?.(result));
    return result;
  } catch (error) {
    logRequestFailure(name, startedAt, error);
    throw error;
  }
};

const compareLessons = (left: LessonListItem, right: LessonListItem) => {
  const leftStageIndex = STAGE_ORDER.indexOf((left.stage ?? 'Beginner') as StageName);
  const rightStageIndex = STAGE_ORDER.indexOf((right.stage ?? 'Beginner') as StageName);
  const stageOrder = leftStageIndex - rightStageIndex;
  if (stageOrder !== 0) {
    return stageOrder;
  }

  const levelOrder = (left.level ?? Number.MAX_SAFE_INTEGER) - (right.level ?? Number.MAX_SAFE_INTEGER);
  if (levelOrder !== 0) {
    return levelOrder;
  }

  return (left.lesson_order ?? Number.MAX_SAFE_INTEGER) - (right.lesson_order ?? Number.MAX_SAFE_INTEGER);
};

const sortCompletedProgress = (left: CompletedLessonProgress, right: CompletedLessonProgress) => {
  const leftTimestamp = left.completed_at ? Date.parse(left.completed_at) : 0;
  const rightTimestamp = right.completed_at ? Date.parse(right.completed_at) : 0;

  if (leftTimestamp !== rightTimestamp) {
    return rightTimestamp - leftTimestamp;
  }

  if (left.lessons && right.lessons) {
    return compareLessons(right.lessons, left.lessons);
  }

  return 0;
};

export function usePathwayData({ enabled = true, hasMembership }: UsePathwayDataParams) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [pathwayLessons, setPathwayLessons] = useState<LessonListItem[]>([]);
  const [completedProgress, setCompletedProgress] = useState<CompletedLessonProgress[]>([]);
  const [allLessons, setAllLessons] = useState<LessonListItem[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isCompletedProgressLoading, setIsCompletedProgressLoading] = useState(enabled);
  const [isLessonIndexLoading, setIsLessonIndexLoading] = useState(enabled);
  const [isStatsLoading, setIsStatsLoading] = useState(enabled);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      setIsCompletedProgressLoading(false);
      setIsLessonIndexLoading(false);
      setIsStatsLoading(false);
      return;
    }

    let isMounted = true;

    const loadPathwayLessons = async () => {
      const startedAt = Date.now();
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const pathwayResult = await withRequestTiming('pathway lessons', fetchUserPathwayLessons, (result) => ({
          pathwayCount: result.length,
        }));

        if (!isMounted) {
          return;
        }

        setPathwayLessons([...pathwayResult].sort(compareLessons));
        console.info(PATHWAY_TIMING_LABEL, 'critical data loaded', {
          elapsedMs: getElapsedMs(startedAt),
          pathwayCount: pathwayResult.length,
        });
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Could not load pathway data.');
        }
        console.warn(PATHWAY_TIMING_LABEL, 'critical data failed', {
          elapsedMs: getElapsedMs(startedAt),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    const loadStats = async () => {
      setIsStatsLoading(true);

      try {
        const statsResult = await withRequestTiming('stats', fetchUserStats);

        if (!isMounted) {
          return;
        }

        setStats(statsResult);
      } catch {
        // Timing helper already logs the request failure; keep the main pathway usable.
      } finally {
        if (isMounted) {
          setIsStatsLoading(false);
        }
      }
    };

    const loadCompletedProgress = async () => {
      setIsCompletedProgressLoading(true);

      try {
        const completedResult = await withRequestTiming('completed lessons', fetchUserCompletedLessons, (result) => ({
          completedCount: result.length,
        }));

        if (!isMounted) {
          return;
        }

        setCompletedProgress([...completedResult].sort(sortCompletedProgress));
      } catch {
        // Timing helper already logs the request failure; keep the main pathway usable.
      } finally {
        if (isMounted) {
          setIsCompletedProgressLoading(false);
        }
      }
    };

    const loadLessonIndex = async () => {
      const startedAt = Date.now();
      setIsLessonIndexLoading(true);

      try {
        const lessonsIndex = await getLessonsIndex();

        if (!isMounted) {
          return;
        }

        setAllLessons([...lessonsIndex].sort(compareLessons));
        logRequestTiming('lesson index', startedAt, {
          lessonCount: lessonsIndex.length,
        });
      } catch (error) {
        logRequestFailure('lesson index', startedAt, error);
      } finally {
        if (isMounted) {
          setIsLessonIndexLoading(false);
        }
      }
    };

    void loadPathwayLessons();
    void loadStats();
    void loadCompletedProgress();
    void loadLessonIndex();

    return () => {
      isMounted = false;
    };
  }, [enabled]);

  const firstLessonIds = useMemo(() => {
    const firstByLevel = new Map<string, string>();

    allLessons.forEach((lesson) => {
      if (!lesson.id || !lesson.stage || typeof lesson.level !== 'number') {
        return;
      }

      const levelKey = `${lesson.stage}-${lesson.level}`;
      if (!firstByLevel.has(levelKey)) {
        firstByLevel.set(levelKey, lesson.id);
      }
    });

    return new Set(firstByLevel.values());
  }, [allLessons]);

  const completedLessons = useMemo(() => {
    return completedProgress
      .map((entry) => entry.lessons)
      .filter((lesson): lesson is LessonListItem => Boolean(lesson))
      .sort(compareLessons);
  }, [completedProgress]);

  const completedIds = useMemo(() => new Set(completedLessons.map((lesson) => lesson.id)), [completedLessons]);

  const pathwayRows = useMemo(() => {
    return pathwayLessons.map((lesson) => {
      if (completedIds.has(lesson.id)) {
        return { lesson, state: 'completed' } satisfies PathwayLessonRow;
      }

      const isFirstFreeLesson =
        firstLessonIds.size > 0 ? firstLessonIds.has(lesson.id) : lesson.lesson_order === 1;

      if (!hasMembership && !isFirstFreeLesson) {
        return { lesson, state: 'locked' } satisfies PathwayLessonRow;
      }

      return { lesson, state: 'available' } satisfies PathwayLessonRow;
    });
  }, [completedIds, firstLessonIds, hasMembership, pathwayLessons]);

  const resumeRow = useMemo(() => {
    const firstAvailable = pathwayRows.find((row) => row.state === 'available');
    return firstAvailable ?? pathwayRows[0] ?? null;
  }, [pathwayRows]);

  const setLessonCompletedOptimistically = async (params: { lesson: LessonListItem; completed: boolean }) => {
    const previousProgress = completedProgress;

    const nextProgress = (() => {
      const withoutLesson = previousProgress.filter((entry) => entry.lesson_id !== params.lesson.id);
      if (!params.completed) {
        return withoutLesson;
      }

      return [
        {
          lesson_id: params.lesson.id,
          lessons: params.lesson,
          is_completed: true,
          completed_at: new Date().toISOString(),
        },
        ...withoutLesson,
      ].sort(sortCompletedProgress);
    })();

    setCompletedProgress(nextProgress);
    setStats((current) => {
      if (!current) {
        return current;
      }

      const wasCompleted = previousProgress.some((entry) => entry.lesson_id === params.lesson.id && entry.is_completed);
      if (params.completed === wasCompleted) {
        return current;
      }

      return {
        ...current,
        lessons_completed: Math.max(0, current.lessons_completed + (params.completed ? 1 : -1)),
      };
    });

    try {
      await upsertLessonCompletion({ lessonId: params.lesson.id, completed: params.completed });
    } catch (error) {
      setCompletedProgress(previousProgress);
      setStats((current) => {
        if (!current) {
          return current;
        }

        const wasCompleted = previousProgress.some((entry) => entry.lesson_id === params.lesson.id && entry.is_completed);
        if (params.completed === wasCompleted) {
          return current;
        }

        return {
          ...current,
          lessons_completed: Math.max(0, current.lessons_completed + (params.completed ? -1 : 1)),
        };
      });
      throw error;
    }
  };

  return {
    stats,
    pathwayRows,
    resumeRow,
    completedLessons,
    completedProgress,
    allLessons,
    isLoading,
    isCompletedProgressLoading,
    isLessonIndexLoading,
    isStatsLoading,
    errorMessage,
    setLessonCompletedOptimistically,
  };
}
