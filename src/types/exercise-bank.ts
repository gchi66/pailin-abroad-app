import { LessonRichInline } from '@/src/types/lesson';

export type ExerciseBankTopic = {
  id: number | string;
  topic: string;
  display_title: string;
  category: string;
  sub_category: string | null;
  lesson_external_id: string;
  sort_order: number | null;
  is_featured: boolean;
  featured_sort_order: number | null;
  content_version?: number;
  progress?: ExerciseBankTopicProgress;
};

export type ExerciseBankTopicProgress = {
  total_questions: number;
  total_sets: number;
  mastered_questions: number;
  completed_sets: number;
  is_completed: boolean;
  is_current_version_completed: boolean;
  has_new_content: boolean;
  first_completed_at: string | null;
  completed_content_version: number | null;
  version_completed_at: string | null;
};

export type ExerciseBankSetSummary = {
  set_number: number;
  question_count: number;
  attempted_questions: number;
  mastered_questions: number;
  is_complete: boolean;
};

export type ExerciseBankTopicDetail = ExerciseBankTopic & {
  sets: ExerciseBankSetSummary[];
  next_incomplete_set: number | null;
  progress: ExerciseBankTopicProgress;
};

export type ExerciseBankV2Option = {
  label: string;
  text: string;
};

export type ExerciseBankV2QuestionContent = {
  text?: string;
  stem?: string;
  options?: ExerciseBankV2Option[];
  blanks?: { id?: string; min_len?: number }[];
  [key: string]: unknown;
};

export type ExerciseBankV2Question = {
  id: number;
  source_number: string | number | null;
  practice_order: number;
  set_number: number;
  set_position: number;
  exercise: {
    id: number;
    exercise_type: string;
    display_type: string;
    prompt: string;
    keywords: string[] | string | null;
  };
  content: ExerciseBankV2QuestionContent;
  progress: {
    attempt_count: number;
    has_answered_correctly: boolean;
    last_attempted_at: string | null;
  };
};

export type ExerciseBankV2Set = {
  set_number: number;
  question_count: number;
  mastered_questions: number;
  is_complete: boolean;
  questions: ExerciseBankV2Question[];
};

export type ExerciseBankAnswer = string | {
  marked_as_correct: boolean;
  rewrite: string;
};

export type ExerciseBankAnswerResult = {
  question_id: number;
  topic_id: number;
  correct: boolean;
  score: number;
  feedback_en: string;
  feedback_th: string;
  grading_method: 'deterministic' | 'ai';
  progress: Record<string, unknown> & {
    has_answered_correctly?: boolean;
    topic_complete?: boolean;
  };
};

export type ExerciseBankSectionSummary = {
  category?: string | null;
  category_label?: string | null;
  category_slug?: string | null;
  section?: string | null;
  section_th?: string | null;
  section_slug?: string | null;
  section_order?: number | null;
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
