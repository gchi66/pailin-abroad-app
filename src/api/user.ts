import { supabase } from '@/src/lib/supabase';
import { env } from '@/src/config/env';
import { LessonListItem } from '@/src/types/lesson';

export type UserProfile = {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  avatar_image: string | null;
  onboarding_completed?: boolean | null;
  is_admin: boolean;
  created_at: string | null;
  lessons_complete: number;
};

type UserProfileResponse = {
  profile: UserProfile;
};

export type UserStats = {
  lessons_completed: number;
  levels_completed: number;
};

export type CompletedLessonProgress = {
  id?: string | null;
  lesson_id: string;
  is_completed?: boolean | null;
  completed_at?: string | null;
  lessons?: LessonListItem | null;
};

type CompletedLessonsResponse = {
  completed_lessons: CompletedLessonProgress[];
};

type PathwayLessonsResponse = {
  pathway_lessons: LessonListItem[];
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

async function fetchAuthedJson<T>(path: string): Promise<T> {
  const baseUrl = assertApiBaseUrl();
  const accessToken = await getAccessToken();
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
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

export async function fetchUserProfile() {
  const json = await fetchAuthedJson<UserProfileResponse>('/api/user/profile');
  return json.profile;
}

export async function fetchUserStats() {
  return fetchAuthedJson<UserStats>('/api/user/stats');
}

export async function fetchUserCompletedLessons() {
  const json = await fetchAuthedJson<CompletedLessonsResponse>('/api/user/completed-lessons');
  return (json.completed_lessons ?? []).filter(
    (entry): entry is CompletedLessonProgress => typeof entry.lesson_id === 'string'
  );
}

export async function fetchUserPathwayLessons() {
  const json = await fetchAuthedJson<PathwayLessonsResponse>('/api/user/pathway-lessons');
  return json.pathway_lessons ?? [];
}

export async function upsertLessonCompletion(params: { lessonId: string; completed: boolean }) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be signed in to update lesson progress.');
  }

  const { error } = await supabase.from('user_lesson_progress').upsert(
    {
      user_id: user.id,
      lesson_id: params.lessonId,
      is_completed: params.completed,
      completed_at: params.completed ? new Date().toISOString() : null,
    },
    {
      onConflict: 'user_id,lesson_id',
    }
  );

  if (error) {
    throw new Error(error.message);
  }
}
