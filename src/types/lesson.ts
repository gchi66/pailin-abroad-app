export type LessonListItem = {
  id: string;
  stage: string | null;
  level: number | null;
  lesson_order: number | null;
  title: string | null;
  title_th: string | null;
  subtitle: string | null;
  subtitle_th: string | null;
  focus: string | null;
  focus_th: string | null;
  backstory: string | null;
  backstory_th: string | null;
  header_img: string | null;
};

export type LessonRichInline = {
  text?: string | null;
  bold?: boolean | null;
  italic?: boolean | null;
  underline?: boolean | null;
  [key: string]: unknown;
};

export type LessonRichNode = {
  kind?: string | null;
  text?: string | { en?: string | null; th?: string | null } | null;
  text_th?: string | null;
  inlines?: LessonRichInline[] | null;
  audio_key?: string | null;
  audio_seq?: number | null;
  [key: string]: unknown;
};

export type LessonSectionText = {
  en?: string | null;
  th?: string | null;
};

export type ResolvedLessonSection = {
  id?: string | null;
  type?: string | null;
  section_type?: string | null;
  title?: string | null;
  title_th?: string | null;
  header_en?: string | null;
  header_th?: string | null;
  content?: string | null;
  text?: LessonSectionText | null;
  content_jsonb?: LessonRichNode[] | null;
  content_jsonb_th?: LessonRichNode[] | null;
  audio_url?: string | null;
  conversation_audio_url?: string | null;
  [key: string]: unknown;
};

export type ResolvedLessonQuestion = {
  id?: string | null;
  [key: string]: unknown;
};

export type ResolvedLessonExercise = {
  id?: string | null;
  [key: string]: unknown;
};

export type ResolvedLessonTranscriptLine = {
  id?: string | null;
  [key: string]: unknown;
};

export type ResolvedLessonPhrase = {
  id?: string | null;
  [key: string]: unknown;
};

export type ResolvedLessonPayload = LessonListItem & {
  title_en?: string | null;
  subtitle_en?: string | null;
  focus_en?: string | null;
  backstory_en?: string | null;
  image_url?: string | null;
  conversation_audio_url?: string | null;
  lesson_external_id?: string | null;
  header_image_path?: string | null;
  header_image_url?: string | null;
  locked?: boolean | null;
  sections?: ResolvedLessonSection[] | null;
  transcript?: ResolvedLessonTranscriptLine[] | null;
  questions?: ResolvedLessonQuestion[] | null;
  practice_exercises?: ResolvedLessonExercise[] | null;
  phrases?: ResolvedLessonPhrase[] | null;
  images?: Record<string, unknown> | null;
};
