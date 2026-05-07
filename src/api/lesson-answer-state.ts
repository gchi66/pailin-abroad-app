import { supabase } from '@/src/lib/supabase';

export type LessonAnswerStateMap = Record<string, Record<string, unknown>>;

export function buildExerciseAnswerStateUnitKey(exerciseId: string) {
  return `exercise:${exerciseId}`;
}

export function buildComprehensionAnswerStateUnitKey() {
  return 'exercise:comprehension_quiz';
}

export async function fetchLessonAnswerStates(lessonId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !lessonId) {
    return {};
  }

  const { data, error } = await supabase
    .from('user_lesson_answer_state')
    .select('unit_key, answer_payload')
    .eq('user_id', user.id)
    .eq('lesson_id', lessonId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).reduce<LessonAnswerStateMap>((acc, row) => {
    if (!row?.unit_key) {
      return acc;
    }

    acc[row.unit_key] =
      row.answer_payload && typeof row.answer_payload === 'object'
        ? (row.answer_payload as Record<string, unknown>)
        : {};
    return acc;
  }, {});
}

type SaveLessonAnswerStateInput = {
  lessonId: string;
  unitKey: string;
  answerPayload: Record<string, unknown>;
  stateKey?: string;
};

export async function saveLessonAnswerState(input: SaveLessonAnswerStateInput) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be signed in to save lesson answers.');
  }

  const { error } = await supabase.from('user_lesson_answer_state').upsert(
    {
      user_id: user.id,
      lesson_id: input.lessonId,
      unit_key: input.unitKey,
      state_key: input.stateKey ?? 'default',
      answer_payload: input.answerPayload,
    },
    {
      onConflict: 'user_id,lesson_id,unit_key,state_key',
    }
  );

  if (error) {
    throw new Error(error.message);
  }
}

type ClearLessonAnswerStateInput = {
  lessonId: string;
  unitKey: string;
  stateKey?: string;
};

export async function clearLessonAnswerState(input: ClearLessonAnswerStateInput) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be signed in to clear lesson answers.');
  }

  const { error } = await supabase
    .from('user_lesson_answer_state')
    .delete()
    .eq('user_id', user.id)
    .eq('lesson_id', input.lessonId)
    .eq('unit_key', input.unitKey)
    .eq('state_key', input.stateKey ?? 'default');

  if (error) {
    throw new Error(error.message);
  }
}
