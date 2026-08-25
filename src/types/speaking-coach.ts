export type SpeakingPracticeType = 'pronunciation' | 'open' | 'translation';

export type SpeakingCoachExample = {
  en: string | null;
  th: string | null;
};

export type SpeakingCoachQuestion = {
  id: number;
  position: number;
  lesson_position: number;
  prompt_en: string | null;
  prompt_th: string | null;
  examples: SpeakingCoachExample[];
  prompt_audio_url: string | null;
};

export type SpeakingCoachPracticeSet = {
  id: number;
  practice_type: SpeakingPracticeType;
  position: number;
  tip_en: string | null;
  tip_th: string | null;
  question_count: number;
  questions: SpeakingCoachQuestion[];
};

export type SpeakingCoachLesson = {
  id: string;
  lesson_external_id: string;
  title: string | null;
  title_th: string | null;
  practice_set_count: number;
  question_count: number;
  practice_sets: SpeakingCoachPracticeSet[];
};

export type SpeakingCoachSession = {
  id: string;
  lesson_id: string;
  status: 'active' | 'completed' | 'abandoned';
  current_question_id: number | null;
  completed_question_ids: number[];
  instructional_attempt_number: 1 | 2;
  previous_attempt_id: string | null;
};

export type SpeakingEvaluationStatus =
  | 'pass'
  | 'retry'
  | 'continue_with_correction'
  | 'unclear_audio';

export type SpeakingEvaluationIssue = {
  category: string;
  description_en: string;
  description_th: string;
};

export type PronunciationAssessmentToken = {
  text: string;
  status: 'clear' | 'needs_work' | 'missing';
  issue_index: number | null;
};

export type SpeakingEvaluation = {
  status: SpeakingEvaluationStatus;
  transcript: string | null;
  content: {
    meaning_correct: boolean | null;
    relevant: boolean | null;
    target_usage_correct: boolean | null;
    grammar_correct: boolean | null;
  };
  pronunciation: {
    intelligible: boolean | null;
    issues: SpeakingEvaluationIssue[];
    assessment_tokens?: PronunciationAssessmentToken[];
  };
  detected_issues: SpeakingEvaluationIssue[];
  displayed_issues: SpeakingEvaluationIssue[];
  corrected_answer: string | null;
  feedback_en: string;
  feedback_th: string;
  retry_focus: string[];
};

export type SpeakingEvaluationResponse = {
  attempt: {
    id: string;
    instructional_attempt_number: 1 | 2;
    evaluation_sequence: number;
    evaluation: SpeakingEvaluation;
    debug?: {
      provider: string;
      model: string;
      latency_ms: number;
      usage: Record<string, unknown>;
      provider_response: Record<string, unknown>;
    };
  };
  session: SpeakingCoachSession;
};
