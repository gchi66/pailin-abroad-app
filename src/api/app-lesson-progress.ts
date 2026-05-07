import { env } from '@/src/config/env';
import { supabase } from '@/src/lib/supabase';
import {
  AppLessonExpectedUnit,
  AppLessonProgressResume,
  AppLessonProgressUnitType,
} from '@/src/lib/app-lesson-progress';

export type AppLessonProgressSummary = {
  lesson_id: string;
  has_started: boolean;
  percent_complete: number;
  is_completed: boolean;
  completed_units: number;
  total_units: number;
  resume: AppLessonProgressResume;
};

export type AppLessonProgressDetail = AppLessonProgressSummary & {
  completed_unit_keys: string[];
  expected_units: AppLessonExpectedUnit[];
};

type AppLessonProgressSummariesResponse = {
  progress_by_lesson: Record<string, AppLessonProgressSummary>;
};

const normalizeBaseUrl = (baseUrl: string) => baseUrl.trim().replace(/\/+$/, '');

const assertApiBaseUrl = () => {
  const baseUrl = normalizeBaseUrl(env.apiBaseUrl);
  if (!baseUrl) {
    throw new Error('Missing required env var: EXPO_PUBLIC_API_BASE_URL');
  }
  return baseUrl;
};

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new Error('No authentication token found.');
  }

  return accessToken;
}

async function fetchAuthedJson<T>(
  path: string,
  options?: { method?: 'GET' | 'POST'; body?: Record<string, unknown> }
): Promise<T> {
  const baseUrl = assertApiBaseUrl();
  const accessToken = await getAccessToken();
  const response = await fetch(`${baseUrl}${path}`, {
    method: options?.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  const json = (await response.json().catch(() => null)) as T | { error?: string } | null;
  if (!response.ok) {
    const message =
      json && typeof json === 'object' && 'error' in json && typeof json.error === 'string'
        ? json.error
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return json as T;
}

export async function fetchAppLessonProgressSummaries(lessonIds: string[]) {
  if (!lessonIds.length) {
    return {};
  }
  const json = await fetchAuthedJson<AppLessonProgressSummariesResponse>('/api/app/user/lesson-progress-summaries', {
    method: 'POST',
    body: { lesson_ids: lessonIds },
  });
  return json.progress_by_lesson ?? {};
}

export async function fetchAppLessonProgressDetail(lessonId: string) {
  return fetchAuthedJson<AppLessonProgressDetail>(`/api/app/user/lesson-progress/${lessonId}`);
}

type WriteAppLessonProgressInput = {
  lessonId: string;
  unitType: AppLessonProgressUnitType;
  unitKey: string;
  sectionKey?: string | null;
};

export async function writeAppLessonProgress(input: WriteAppLessonProgressInput) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be signed in to update lesson progress.');
  }

  const now = new Date().toISOString();

  const { error: unitError } = await supabase.from('user_lesson_unit_progress').upsert(
    {
      user_id: user.id,
      lesson_id: input.lessonId,
      unit_type: input.unitType,
      unit_key: input.unitKey,
      section_key: input.sectionKey ?? null,
      is_completed: true,
      last_visited_at: now,
      completed_at: now,
    },
    {
      onConflict: 'user_id,lesson_id,unit_key',
    }
  );

  if (unitError) {
    throw new Error(unitError.message);
  }

  const { error: progressError } = await supabase.from('user_lesson_progress').upsert(
    {
      user_id: user.id,
      lesson_id: input.lessonId,
      started_at: now,
      last_unit_type: input.unitType,
      last_unit_key: input.unitKey,
    },
    {
      onConflict: 'user_id,lesson_id',
    }
  );

  if (progressError) {
    throw new Error(progressError.message);
  }
}
