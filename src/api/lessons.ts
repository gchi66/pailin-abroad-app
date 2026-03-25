import { env } from '../config/env';
import { supabase } from '../lib/supabase';
import { supabaseSelect } from '../lib/supabase-rest';
import { LessonListItem, ResolvedLessonPayload } from '../types/lesson';

const LESSON_SELECT_FIELDS =
  'id,stage,level,lesson_order,title,title_th,subtitle,subtitle_th,focus,focus_th,backstory,backstory_th,header_img';
const RESOLVED_LESSON_CACHE_TTL_MS = 5 * 60 * 1000;
const resolvedLessonCache = new Map<string, { payload: ResolvedLessonPayload; timestamp: number }>();
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

    const toPublicUrl = (path: string) => {
      const normalizedPath = path.startsWith('Try_Lessons/') ? path : `Try_Lessons/${path.replace(/^\/+/, '')}`;
      return `${env.supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/try-lessons/${normalizedPath}`;
    };

    return {
      main: resolvedSignedUrl || toPublicUrl(resolvedBasePath),
      noBg: toPublicUrl(resolvedBasePath.replace('.mp3', '_no_bg.mp3')),
      bg: toPublicUrl(resolvedBasePath.replace('.mp3', '_bg.mp3')),
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
