import { env } from '../config/env';
import { supabase } from '../lib/supabase';
import { supabaseSelect } from '../lib/supabase-rest';
import { LessonListItem, ResolvedLessonPayload } from '../types/lesson';

const LESSON_SELECT_FIELDS =
  'id,stage,level,lesson_order,title,title_th,subtitle,subtitle_th,focus,focus_th,backstory,backstory_th,header_img';
const RESOLVED_LESSON_CACHE_TTL_MS = 5 * 60 * 1000;
const resolvedLessonCache = new Map<string, { payload: ResolvedLessonPayload; timestamp: number }>();

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
