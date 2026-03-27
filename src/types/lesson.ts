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
  highlight?: string | null;
  [key: string]: unknown;
};

export type LessonRichNode = {
  kind?: string | null;
  text?: string | { en?: string | null; th?: string | null } | null;
  text_th?: string | null;
  inlines?: LessonRichInline[] | null;
  audio_key?: string | null;
  audio_section?: string | null;
  audio_seq?: number | null;
  is_response?: boolean | null;
  [key: string]: unknown;
};

export type LessonAudioSnippet = {
  audio_key?: string | null;
  section?: string | null;
  seq?: number | null;
  storage_path?: string | null;
  signed_url?: string | null;
  phrase_id?: string | null;
  variant?: number | null;
};

export type LessonAudioSnippetIndex = {
  byKey: Record<string, LessonAudioSnippet>;
  bySection: Record<string, Record<number, LessonAudioSnippet>>;
};

export type LessonPhraseAudioSnippetIndex = {
  byKey: Record<string, LessonAudioSnippet>;
  byPhrase: Record<string, Record<number, Record<number, LessonAudioSnippet>>>;
};

export type LessonApplyContent = {
  prompt?: string | null;
  response?: string | null;
  prompt_nodes?: LessonRichNode[] | null;
  response_nodes?: LessonRichNode[] | null;
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
  content_jsonb?: LessonRichNode[] | LessonApplyContent | null;
  content_jsonb_th?: LessonRichNode[] | LessonApplyContent | null;
  audio_url?: string | null;
  conversation_audio_url?: string | null;
  [key: string]: unknown;
};

export type ResolvedLessonQuestion = {
  id?: string | null;
  lesson_id?: string | null;
  sort_order?: number | null;
  question_type?: string | null;
  prompt?: string | null;
  prompt_en?: string | null;
  prompt_th?: string | null;
  options?: string | LessonQuestionOption[] | null;
  options_th?: string | LessonQuestionOption[] | null;
  correct_choice?: string | null;
  answer_key?: string | string[] | null;
  answer_key_th?: string | string[] | null;
  explanation?: string | null;
  explanation_th?: string | null;
  [key: string]: unknown;
};

export type LessonQuestionOption = {
  label?: string | null;
  letter?: string | null;
  text?: string | null;
  text_th?: string | null;
  textTh?: string | null;
  image_key?: string | null;
  alt_text?: string | null;
  alt_text_th?: string | null;
  altTextTh?: string | null;
};

export type ResolvedLessonExercise = {
  id?: string | null;
  [key: string]: unknown;
};

export type ResolvedLessonTranscriptLine = {
  id?: string | null;
  sort_order?: number | null;
  speaker?: string | null;
  speaker_th?: string | null;
  line_text?: string | null;
  line_text_th?: string | null;
  [key: string]: unknown;
};

export type ResolvedLessonPhrase = {
  id?: string | null;
  phrase?: string | null;
  phrase_th?: string | null;
  variant?: number | null;
  content?: string | null;
  content_md?: string | null;
  content_jsonb?: LessonRichNode[] | null;
  content_jsonb_th?: LessonRichNode[] | null;
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
