import type { LessonListItem } from '../types/lesson';
import type { AppLessonProgressSummary } from '../api/app-lesson-progress';

export const LIBRARY_STAGES = ['Beginner', 'Intermediate', 'Advanced', 'Expert'] as const;
export type LibraryStage = typeof LIBRARY_STAGES[number];

export function isCheckpointLesson(lesson: LessonListItem) {
  return [lesson.title, lesson.title_th].some((title) => title?.toLowerCase().includes('checkpoint'));
}

export function lessonNumber(lesson: LessonListItem) {
  return `${lesson.level ?? '–'}.${isCheckpointLesson(lesson) ? 'CHP' : lesson.lesson_order ?? '–'}`;
}

export function lessonTitle(lesson: LessonListItem, language: 'en' | 'th', emptyFallback = '') {
  if (language === 'th' && isCheckpointLesson(lesson) && lesson.level != null) {
    return `ด่านทบทวนระดับ ${lesson.level}`;
  }

  const preferred = language === 'th' ? lesson.title_th : lesson.title;
  const fallback = language === 'th' ? lesson.title : lesson.title_th;
  return preferred?.trim() || fallback?.trim() || emptyFallback;
}

export function freeLibraryIds(lessons: LessonListItem[]) {
  const first = new Map<string, LessonListItem>();
  for (const lesson of lessons) {
    if (!lesson.stage || lesson.level == null) continue;
    const key = `${lesson.stage}:${lesson.level}`;
    const previous = first.get(key);
    if (!previous || (lesson.lesson_order ?? Infinity) < (previous.lesson_order ?? Infinity)) first.set(key, lesson);
  }
  return new Set([...first.values()].map((lesson) => lesson.id));
}

// Temporary fallback for cards until their database short-focus fields are filled.
const SHORT_FOCUS: Record<string, string> = {
  '5.1': 'there is · there are',
  '5.2': 'can · could',
  '5.3': 'object pronouns',
  '5.4': 'like',
  '5.5': 'this · that · these · those',
  '8.1': 'present perfect continuous',
  '8.2': 'need',
  '8.3': 'just',
  '8.4': 'hope',
};

export function shortLessonFocus(lesson: LessonListItem, _language: 'en' | 'th') {
  // SHORT_FOCUS is authored only in the English lesson document and should
  // remain English on cards even when the surrounding UI is Thai.
  return lesson.focus_short?.trim()
    || SHORT_FOCUS[lessonNumber(lesson)]
    || lesson.focus?.trim()
    || lesson.focus_th?.trim()
    || '';
}

export function matchesLessonSearch(lesson: LessonListItem, query: string) {
  const normalize = (text: string) => text.normalize('NFC').toLocaleLowerCase().trim();
  const text = normalize([lesson.title, lesson.title_th, lessonTitle(lesson, 'th'), lesson.focus, lesson.focus_th, lessonNumber(lesson),
    lesson.stage, shortLessonFocus(lesson, 'en'), shortLessonFocus(lesson, 'th')].join(' '));
  return normalize(query).split(/\s+/).every((word) => text.includes(word));
}

export function lessonMarker(selected: boolean, progress?: AppLessonProgressSummary) {
  if (selected) return { kind: 'selected' as const };
  if (progress?.is_completed) return { kind: 'complete' as const };
  if ((progress?.percent_complete ?? 0) > 0) return { kind: 'progress' as const, percent: Math.max(1, Math.min(99, Math.round(progress!.percent_complete))) };
  return { kind: 'empty' as const };
}
