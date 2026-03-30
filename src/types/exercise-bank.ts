import { LessonRichInline } from '@/src/types/lesson';

export type ExerciseBankSectionSummary = {
  category?: string | null;
  category_label?: string | null;
  category_slug?: string | null;
  section?: string | null;
  section_th?: string | null;
  section_slug?: string | null;
  exercise_count?: number | null;
  featured_count?: number | null;
  is_featured?: boolean | null;
};

export type ExerciseBankCategory = {
  category?: string | null;
  category_label?: string | null;
  category_slug?: string | null;
  section_count?: number | null;
  exercise_count?: number | null;
};

export type ExerciseBankItemOption = {
  label?: string | null;
  letter?: string | null;
  text?: string | null;
  text_th?: string | null;
  textTh?: string | null;
  [key: string]: unknown;
};

export type ExerciseBankExerciseItem = {
  id?: string | null;
  number?: string | number | null;
  text?: string | null;
  text_th?: string | null;
  text_jsonb?: LessonRichInline[] | string | null;
  text_jsonb_th?: LessonRichInline[] | string | null;
  prompt?: string | null;
  prompt_th?: string | null;
  question?: string | null;
  question_th?: string | null;
  placeholder?: string | null;
  placeholder_th?: string | null;
  answer?: string | null;
  correct?: string | null;
  options?: ExerciseBankItemOption[] | string[] | null;
  blanks?: unknown;
  answers_v2?: unknown;
  image?: string | null;
  image_url?: string | null;
  image_key?: string | null;
  alt_text?: string | null;
  alt_text_th?: string | null;
  is_example?: boolean | null;
  [key: string]: unknown;
};

export type ExerciseBankExercise = {
  id?: string | null;
  title?: string | null;
  title_th?: string | null;
  prompt?: string | null;
  prompt_th?: string | null;
  paragraph?: string | null;
  paragraph_th?: string | null;
  exercise_type?: string | null;
  items?: ExerciseBankExerciseItem[] | null;
  items_th?: ExerciseBankExerciseItem[] | null;
  sort_order?: number | null;
  is_featured?: boolean | null;
  [key: string]: unknown;
};

export type ExerciseBankSectionDetail = {
  category?: string | null;
  category_label?: string | null;
  category_slug?: string | null;
  section?: string | null;
  section_th?: string | null;
  section_slug?: string | null;
  exercises?: ExerciseBankExercise[] | null;
};
