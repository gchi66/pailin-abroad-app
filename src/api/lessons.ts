import { supabaseSelect } from '../lib/supabase-rest';
import { LessonListItem } from '../types/lesson';

const LESSON_SELECT_FIELDS =
  'id,stage,level,lesson_order,title,title_th,subtitle,subtitle_th,focus,focus_th,backstory,backstory_th,header_img';

export async function getLessonsIndex(): Promise<LessonListItem[]> {
  return supabaseSelect<LessonListItem>({
    table: 'lessons',
    select: LESSON_SELECT_FIELDS,
    orderBy: { column: 'lesson_order', ascending: true },
    limit: 500,
  });
}

export async function getLessonById(lessonId: string): Promise<LessonListItem | null> {
  const rows = await supabaseSelect<LessonListItem>({
    table: 'lessons',
    select: LESSON_SELECT_FIELDS,
    filters: [`id=eq.${encodeURIComponent(lessonId)}`],
    limit: 1,
  });
  return rows[0] ?? null;
}
