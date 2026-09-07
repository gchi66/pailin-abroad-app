import type { PathwayLessonRow } from '../hooks/use-pathway-data';

/** Follow the free library while retaining an unfinished lesson the learner opened. */
export function getFreePathwaySummary(
  rows: PathwayLessonRow[],
  freeLessonIds: Set<string>,
  resumeRow: PathwayLessonRow | null,
) {
  const freeRows = rows.filter((row) => freeLessonIds.has(row.lesson.id));
  const completedCount = freeRows.filter((row) => row.state === 'completed').length;
  const availableRows = freeRows.filter((row) => row.state === 'available');
  const resumeIndex = rows.findIndex((row) => row.lesson.id === resumeRow?.lesson.id);
  const nextLesson = availableRows.find((row) => row.lesson.id === resumeRow?.lesson.id)
    ?? rows.slice(Math.max(resumeIndex, 0)).find((row) => freeLessonIds.has(row.lesson.id) && row.state === 'available')
    ?? availableRows[0]
    ?? null;

  return {
    nextLesson,
    completedCount,
    totalCount: freeRows.length,
    isComplete: freeRows.length > 0 && completedCount === freeRows.length,
  };
}
