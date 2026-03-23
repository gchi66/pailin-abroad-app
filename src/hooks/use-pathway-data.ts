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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const run = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [statsResult, completedResult, pathwayResult, lessonsIndex] = await Promise.all([
          fetchUserStats(),
          fetchUserCompletedLessons(),
          fetchUserPathwayLessons(),
          getLessonsIndex(),
        ]);

        if (!isMounted) {
          return;
        }

        setStats(statsResult);
        setCompletedProgress([...completedResult].sort(sortCompletedProgress));
        setPathwayLessons([...pathwayResult].sort(compareLessons));
        setAllLessons([...lessonsIndex].sort(compareLessons));
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Could not load pathway data.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void run();

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

      if (!hasMembership && firstLessonIds.size > 0 && !firstLessonIds.has(lesson.id)) {
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
    isLoading,
    errorMessage,
    setLessonCompletedOptimistically,
  };
}
