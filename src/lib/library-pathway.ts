import type { LessonListItem } from '../types/lesson';
import type { AppLessonProgressSummary } from '../api/app-lesson-progress';

export const LIBRARY_STAGES = ['Beginner', 'Intermediate', 'Advanced', 'Expert'] as const;
export type LibraryStage = typeof LIBRARY_STAGES[number];

export function lessonNumber(lesson: LessonListItem) {
  const checkpoint = [lesson.title, lesson.title_th].some((title) => title?.toLowerCase().includes('checkpoint'));
  return `${lesson.level ?? '–'}.${checkpoint ? 'chp' : lesson.lesson_order ?? '–'}`;
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

// Temporary display copy only; replace with bilingual short-focus fields when supplied.
const SHORT_FOCUS: Record<string, { en: string; th: string }> = {
  '5.1': { en: 'there is · there are', th: 'การใช้ there is · there are' },
  '5.2': { en: 'can · could', th: 'การใช้ can · could' },
  '5.3': { en: 'object pronouns', th: 'สรรพนามที่เป็นกรรม' },
  '5.4': { en: 'like', th: 'การใช้ like' },
  '5.5': { en: 'this · that · these · those', th: 'การใช้ this · that · these · those' },
  '8.1': { en: 'present perfect continuous', th: 'ปัจจุบันสมบูรณ์ต่อเนื่อง' },
  '8.2': { en: 'need', th: 'การใช้ need' },
  '8.3': { en: 'just', th: 'การใช้ just' },
  '8.4': { en: 'hope', th: 'การใช้ hope' },
};

export function shortLessonFocus(lesson: LessonListItem, language: 'en' | 'th') {
  return SHORT_FOCUS[lessonNumber(lesson)]?.[language]
    || (language === 'th' ? lesson.focus_th?.trim() || lesson.focus?.trim() : lesson.focus?.trim() || lesson.focus_th?.trim())
    || '';
}

export function matchesLessonSearch(lesson: LessonListItem, query: string) {
  const normalize = (text: string) => text.normalize('NFC').toLocaleLowerCase().trim();
  const text = normalize([lesson.title, lesson.title_th, lesson.focus, lesson.focus_th, lessonNumber(lesson),
    lesson.stage, shortLessonFocus(lesson, 'en'), shortLessonFocus(lesson, 'th')].join(' '));
  return normalize(query).split(/\s+/).every((word) => text.includes(word));
}

export function lessonMarker(selected: boolean, progress?: AppLessonProgressSummary) {
  if (selected) return { kind: 'selected' as const };
  if (progress?.is_completed) return { kind: 'complete' as const };
  if ((progress?.percent_complete ?? 0) > 0) return { kind: 'progress' as const, percent: Math.max(1, Math.min(99, Math.round(progress!.percent_complete))) };
  return { kind: 'empty' as const };
}
