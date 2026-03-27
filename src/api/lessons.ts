import { env } from '../config/env';
import { supabase } from '../lib/supabase';
import { supabaseSelect } from '../lib/supabase-rest';
import {
  LessonAudioSnippet,
  LessonAudioSnippetIndex,
  LessonListItem,
  LessonPhraseAudioSnippetIndex,
  ResolvedLessonPayload,
} from '../types/lesson';

const LESSON_SELECT_FIELDS =
  'id,stage,level,lesson_order,title,title_th,subtitle,subtitle_th,focus,focus_th,backstory,backstory_th,header_img';
const RESOLVED_LESSON_CACHE_TTL_MS = 5 * 60 * 1000;
const resolvedLessonCache = new Map<string, { payload: ResolvedLessonPayload; timestamp: number }>();
const inflightResolvedLessonRequests = new Map<string, Promise<ResolvedLessonPayload>>();
const TRY_LESSON_IDS = new Set([
  'a34f5a4b-0729-430e-9b92-900dcad2f977',
  '5f9d09b4-ed35-40ac-b89f-50dbd7e96c0c',
  '27e50504-7021-4a7b-b30d-0cae34a094bf',
]);

const normalizeBaseUrl = (baseUrl: string) => baseUrl.trim().replace(/\/+$/, '');

const assertApiBaseUrl = () => {
  const baseUrl = normalizeBaseUrl(env.apiBaseUrl);
  if (!baseUrl) {
    throw new Error('Missing required env var: EXPO_PUBLIC_API_BASE_URL');
  }
  return baseUrl;
};

const resolvedLessonCacheKey = (lessonId: string, lang: 'en' | 'th') => `${lessonId}:${lang}`;

const getCachedResolvedLesson = (lessonId: string, lang: 'en' | 'th') => {
  const key = resolvedLessonCacheKey(lessonId, lang);
  const entry = resolvedLessonCache.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() - entry.timestamp > RESOLVED_LESSON_CACHE_TTL_MS) {
    resolvedLessonCache.delete(key);
    return null;
  }
  return entry.payload;
};

const setCachedResolvedLesson = (lessonId: string, lang: 'en' | 'th', payload: ResolvedLessonPayload) => {
  const key = resolvedLessonCacheKey(lessonId, lang);
  resolvedLessonCache.set(key, { payload, timestamp: Date.now() });
};

async function getLessonAuthHeaders() {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  let currentSession = session ?? null;
  if (!sessionError && currentSession?.expires_at) {
    const now = Math.floor(Date.now() / 1000);
    if (currentSession.expires_at <= now) {
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError) {
        currentSession = refreshed.session ?? null;
      }
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (currentSession?.access_token) {
    headers.Authorization = `Bearer ${currentSession.access_token}`;
  }

  return headers;
}

async function getCurrentLessonSession() {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  let currentSession = session ?? null;
  if (!sessionError && currentSession?.expires_at) {
    const now = Math.floor(Date.now() / 1000);
    if (currentSession.expires_at <= now) {
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError) {
        currentSession = refreshed.session ?? null;
      }
    }
  }

  return currentSession;
}

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

export async function fetchResolvedLesson(
  lessonId: string,
  lang: 'en' | 'th' = 'en'
): Promise<ResolvedLessonPayload> {
  const cached = getCachedResolvedLesson(lessonId, lang);
  if (cached) {
    return cached;
  }

  const requestKey = resolvedLessonCacheKey(lessonId, lang);
  const inflightRequest = inflightResolvedLessonRequests.get(requestKey);
  if (inflightRequest) {
    return inflightRequest;
  }

  const requestPromise = (async () => {
    const baseUrl = assertApiBaseUrl();
    const headers = await getLessonAuthHeaders();
    const response = await fetch(`${baseUrl}/api/lessons/${lessonId}/resolved?lang=${lang}`, {
      method: 'GET',
      headers,
    });

    const json = (await response.json().catch(() => null)) as
      | ResolvedLessonPayload
      | { error?: string }
      | null;

    if (!response.ok) {
      const message =
        json && typeof json === 'object' && 'error' in json && typeof json.error === 'string'
          ? json.error
          : `Failed to fetch lesson (${response.status})`;
      throw new Error(message);
    }

    const payload = json as ResolvedLessonPayload;
    setCachedResolvedLesson(lessonId, lang, payload);
    return payload;
  })();

  inflightResolvedLessonRequests.set(requestKey, requestPromise);

  try {
    return await requestPromise;
  } finally {
    inflightResolvedLessonRequests.delete(requestKey);
  }
}

export function prefetchResolvedLesson(lessonId: string, lang: 'en' | 'th') {
  void fetchResolvedLesson(lessonId, lang).catch(() => undefined);
}

export type EvaluateLessonAnswerInput = {
  exerciseType: 'fill_blank' | 'open' | 'sentence_transform';
  userAnswer: string;
  correctAnswer?: string | null;
  sourceType: 'practice' | 'bank';
  exerciseId: string;
  questionNumber?: number | string;
  questionPrompt?: string;
};

export type EvaluateLessonAnswerResult = {
  correct?: boolean | null;
  score?: number | null;
  feedback_en?: string | null;
  feedback_th?: string | null;
};

export async function evaluateLessonAnswer(
  input: EvaluateLessonAnswerInput
): Promise<EvaluateLessonAnswerResult> {
  const baseUrl = assertApiBaseUrl();
  const session = await getCurrentLessonSession();
  const headers = await getLessonAuthHeaders();
  const userId = session?.user?.id?.trim();

  if (!userId) {
    throw new Error('Please log in to check your answers.');
  }

  const payload: Record<string, unknown> = {
    user_id: userId,
    exercise_type: input.exerciseType,
    user_answer: input.userAnswer,
    correct_answer: input.correctAnswer ?? '',
    source_type: input.sourceType,
    question_number: input.questionNumber,
    question_prompt: input.questionPrompt ?? '',
  };

  if (input.sourceType === 'practice') {
    payload.practice_exercise_id = input.exerciseId;
  } else {
    payload.exercise_bank_id = input.exerciseId;
  }

  const response = await fetch(`${baseUrl}/api/evaluate_answer`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const json = (await response.json().catch(() => null)) as
    | EvaluateLessonAnswerResult
    | { error?: string }
    | null;

  if (!response.ok) {
    const message =
      json && typeof json === 'object' && 'error' in json && typeof json.error === 'string'
        ? json.error
        : 'Unable to evaluate answer right now.';
    throw new Error(message);
  }

  return (json ?? {}) as EvaluateLessonAnswerResult;
}

type LessonAudioUrls = {
  main: string | null;
  noBg: string | null;
  bg: string | null;
};

type TryLessonAudioResponse = {
  conversation?: {
    path?: string | null;
    signed_url?: string | null;
  } | null;
  snippets?: LessonAudioSnippet[] | null;
};

const EMPTY_SNIPPET_INDEX: LessonAudioSnippetIndex = {
  byKey: {},
  bySection: {},
};

const EMPTY_PHRASE_SNIPPET_INDEX: LessonPhraseAudioSnippetIndex = {
  byKey: {},
  byPhrase: {},
};
const SIGNED_SNIPPET_URL_CACHE_TTL_MS = 60 * 1000;
const signedSnippetUrlCache = new Map<string, { url: string; timestamp: number }>();
const inflightSignedSnippetUrlRequests = new Map<string, Promise<string | null>>();

const buildLessonSnippetIndex = (snippets: LessonAudioSnippet[]): LessonAudioSnippetIndex => {
  const byKey: Record<string, LessonAudioSnippet> = {};
  const bySection: Record<string, Record<number, LessonAudioSnippet>> = {};

  snippets.forEach((snippet) => {
    const audioKey = snippet.audio_key?.trim();
    const section = snippet.section?.trim();
    const seq = typeof snippet.seq === 'number' ? snippet.seq : null;

    if (audioKey) {
      byKey[audioKey] = snippet;
    }

    if (!section || seq === null) {
      return;
    }

    if (!bySection[section]) {
      bySection[section] = {};
    }
    bySection[section][seq] = snippet;
  });

  return { byKey, bySection };
};

const buildPhraseSnippetIndex = (snippets: LessonAudioSnippet[]): LessonPhraseAudioSnippetIndex => {
  const byKey: Record<string, LessonAudioSnippet> = {};
  const byPhrase: Record<string, Record<number, Record<number, LessonAudioSnippet>>> = {};

  snippets.forEach((snippet) => {
    const audioKey = snippet.audio_key?.trim();
    const phraseId = snippet.phrase_id?.trim();
    const variant = typeof snippet.variant === 'number' ? snippet.variant : 0;
    const seq = typeof snippet.seq === 'number' ? snippet.seq : null;

    if (audioKey) {
      byKey[audioKey] = snippet;
    }

    if (!phraseId || seq === null) {
      return;
    }

    if (!byPhrase[phraseId]) {
      byPhrase[phraseId] = {};
    }
    if (!byPhrase[phraseId][variant]) {
      byPhrase[phraseId][variant] = {};
    }

    byPhrase[phraseId][variant][seq] = snippet;
  });

  return { byKey, byPhrase };
};

const toTryLessonPublicAudioUrl = (path: string) => {
  const normalizedPath = path.startsWith('Try_Lessons/') ? path : `Try_Lessons/${path.replace(/^\/+/, '')}`;
  return `${env.supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/try-lessons/${normalizedPath}`;
};

export async function fetchLessonAudioUrls(
  lesson: Pick<ResolvedLessonPayload, 'id' | 'conversation_audio_url'>
): Promise<LessonAudioUrls> {
  const basePath = lesson.conversation_audio_url?.trim();
  if (!lesson.id || !basePath) {
    return {
      main: null,
      noBg: null,
      bg: null,
    };
  }

  const session = await getCurrentLessonSession();
  const isTryLesson = TRY_LESSON_IDS.has(lesson.id);

  if (!session?.access_token && isTryLesson) {
    const baseUrl = assertApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/try-lessons/${lesson.id}/audio-url`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const payload = (await response.json().catch(() => null)) as TryLessonAudioResponse | null;
    const resolvedSignedUrl = payload?.conversation?.signed_url?.trim() || null;
    const resolvedBasePath = payload?.conversation?.path?.trim() || basePath;
    if (!resolvedBasePath) {
      return {
        main: null,
        noBg: null,
        bg: null,
      };
    }

    return {
      main: resolvedSignedUrl || toTryLessonPublicAudioUrl(resolvedBasePath),
      noBg: toTryLessonPublicAudioUrl(resolvedBasePath.replace('.mp3', '_no_bg.mp3')),
      bg: toTryLessonPublicAudioUrl(resolvedBasePath.replace('.mp3', '_bg.mp3')),
    };
  }

  const signAudioPath = async (path: string) => {
    const { data, error } = await supabase.storage.from('lesson-audio').createSignedUrl(path, 2 * 60 * 60);
    if (error) {
      return null;
    }
    return data?.signedUrl ?? null;
  };

  const [main, noBg, bg] = await Promise.all([
    signAudioPath(basePath),
    signAudioPath(basePath.replace('.mp3', '_no_bg.mp3')),
    signAudioPath(basePath.replace('.mp3', '_bg.mp3')),
  ]);

  return {
    main,
    noBg,
    bg,
  };
}

export async function fetchLessonAudioSnippetIndex(
  lesson: Pick<ResolvedLessonPayload, 'id' | 'lesson_external_id'>
): Promise<LessonAudioSnippetIndex> {
  const lessonExternalId = lesson.lesson_external_id?.trim();
  if (!lesson.id || !lessonExternalId) {
    return EMPTY_SNIPPET_INDEX;
  }

  const session = await getCurrentLessonSession();
  const isTryLesson = TRY_LESSON_IDS.has(lesson.id);

  if (!session?.access_token && isTryLesson) {
    const baseUrl = assertApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/try-lessons/${lesson.id}/audio-url`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const payload = (await response.json().catch(() => null)) as TryLessonAudioResponse | null;
    const snippets = (payload?.snippets ?? [])
      .filter((item): item is LessonAudioSnippet => Boolean(item?.audio_key && item?.storage_path))
      .map((item) => ({
        ...item,
        signed_url: item.storage_path ? toTryLessonPublicAudioUrl(item.storage_path) : null,
      }));

    return buildLessonSnippetIndex(snippets);
  }

  const { data, error } = await supabase
    .from('audio_snippets')
    .select('section, seq, storage_path, audio_key')
    .eq('lesson_external_id', lessonExternalId);

  if (error) {
    throw error;
  }

  return buildLessonSnippetIndex((data ?? []) as LessonAudioSnippet[]);
}

export async function fetchLessonPhraseAudioSnippetIndex(
  lesson: Pick<ResolvedLessonPayload, 'id'>
): Promise<LessonPhraseAudioSnippetIndex> {
  if (!lesson.id) {
    return EMPTY_PHRASE_SNIPPET_INDEX;
  }

  const { data: lessonPhrases, error: lessonPhrasesError } = await supabase
    .from('lesson_phrases')
    .select('phrases(id)')
    .eq('lesson_id', lesson.id);

  if (lessonPhrasesError) {
    throw lessonPhrasesError;
  }

  const phraseIds = (lessonPhrases ?? [])
    .map((row) => {
      const phrases = row && typeof row === 'object' && 'phrases' in row ? row.phrases : null;
      return phrases && typeof phrases === 'object' && 'id' in phrases ? String(phrases.id ?? '').trim() : '';
    })
    .filter(Boolean);

  if (!phraseIds.length) {
    return EMPTY_PHRASE_SNIPPET_INDEX;
  }

  const { data, error } = await supabase
    .from('phrases_audio_snippets')
    .select('phrase_id, variant, seq, storage_path, audio_key')
    .in('phrase_id', phraseIds);

  if (error) {
    throw error;
  }

  return buildPhraseSnippetIndex((data ?? []) as LessonAudioSnippet[]);
}

export async function fetchSignedLessonAudioUrl(path: string): Promise<string | null> {
  const trimmedPath = path.trim();
  if (!trimmedPath) {
    return null;
  }

  const cached = signedSnippetUrlCache.get(trimmedPath);
  if (cached && Date.now() - cached.timestamp < SIGNED_SNIPPET_URL_CACHE_TTL_MS) {
    return cached.url;
  }

  const inflightRequest = inflightSignedSnippetUrlRequests.get(trimmedPath);
  if (inflightRequest) {
    return inflightRequest;
  }

  const requestPromise = (async () => {
    const { data, error } = await supabase.storage.from('lesson-audio').createSignedUrl(trimmedPath, 60);
    if (error || !data?.signedUrl) {
      return null;
    }

    signedSnippetUrlCache.set(trimmedPath, {
      url: data.signedUrl,
      timestamp: Date.now(),
    });
    return data.signedUrl;
  })();

  inflightSignedSnippetUrlRequests.set(trimmedPath, requestPromise);

  try {
    return await requestPromise;
  } finally {
    inflightSignedSnippetUrlRequests.delete(trimmedPath);
  }
}
