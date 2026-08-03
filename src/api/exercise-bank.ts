import { env } from '@/src/config/env';
import { supabase } from '@/src/lib/supabase';
import {
  ExerciseBankCategory,
  ExerciseBankSectionDetail,
  ExerciseBankSectionSummary,
  ExerciseBankTopic,
  ExerciseBankTopicDetail,
  ExerciseBankV2Set,
  ExerciseBankAnswer,
  ExerciseBankAnswerResult,
} from '@/src/types/exercise-bank';

type ExerciseBankSectionsResponse = {
  sections?: ExerciseBankSectionSummary[];
  categories?: ExerciseBankCategory[];
};

type ExerciseBankFeaturedResponse = {
  featured?: ExerciseBankSectionSummary[];
};

type ExerciseBankSectionResponse = {
  section?: ExerciseBankSectionDetail | null;
};

const normalizeBaseUrl = (baseUrl: string) => baseUrl.trim().replace(/\/+$/, '');

const assertApiBaseUrl = () => {
  const baseUrl = normalizeBaseUrl(env.apiBaseUrl);
  if (!baseUrl) {
    throw new Error('Missing required env var: EXPO_PUBLIC_API_BASE_URL');
  }
  return baseUrl;
};

async function exerciseBankV2Request<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = assertApiBaseUrl();
  const { data, error: sessionError } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (sessionError || !accessToken) {
    throw new Error('Please sign in to use the Exercise Bank.');
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const json = (await response.json().catch(() => null)) as T | { error?: string } | null;

  if (!response.ok) {
    const message = json && typeof json === 'object' && 'error' in json && typeof json.error === 'string'
      ? json.error
      : 'Unable to load the Exercise Bank.';
    throw new Error(message);
  }

  return (json ?? {}) as T;
}

export async function fetchExerciseBankV2Topics(
  filters: { category?: string; featuredOnly?: boolean } = {}
): Promise<ExerciseBankTopic[]> {
  const query = new URLSearchParams();
  if (filters.category) query.set('category', filters.category);
  if (filters.featuredOnly) query.set('featured', 'true');
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const response = await exerciseBankV2Request<{ topics?: ExerciseBankTopic[] }>(
    `/api/exercise-bank-v2/topics${suffix}`
  );
  return Array.isArray(response.topics) ? response.topics : [];
}

export async function fetchExerciseBankV2Topic(topicId: number | string): Promise<ExerciseBankTopicDetail> {
  const response = await exerciseBankV2Request<{ topic?: ExerciseBankTopicDetail }>(
    `/api/exercise-bank-v2/topics/${encodeURIComponent(String(topicId))}`
  );
  if (!response.topic) throw new Error('Exercise topic not found.');
  return response.topic;
}

export async function fetchExerciseBankV2Set(topicId: number | string, setNumber: number) {
  return exerciseBankV2Request<{
    topic: Pick<ExerciseBankTopic, 'id' | 'topic' | 'display_title' | 'category' | 'content_version'>;
    set: ExerciseBankV2Set;
  }>(`/api/exercise-bank-v2/topics/${encodeURIComponent(String(topicId))}/sets/${setNumber}`);
}

export async function submitExerciseBankV2Answer(questionId: number, answer: ExerciseBankAnswer) {
  return exerciseBankV2Request<ExerciseBankAnswerResult>(
    `/api/exercise-bank-v2/questions/${questionId}/answer`,
    { method: 'POST', body: JSON.stringify({ user_answer: answer }) }
  );
}

export async function fetchExerciseBankTopics(
  filters: { category?: string; featuredOnly?: boolean } = {}
): Promise<ExerciseBankTopic[]> {
  let query = supabase
    .from('exercise_bank_topics')
    .select(
      'id, topic, display_title, category, sub_category, lesson_external_id, sort_order, is_featured, featured_sort_order'
    )
    .eq('is_active', true);

  if (filters.featuredOnly) {
    query = query.eq('is_featured', true).order('featured_sort_order', {
      ascending: true,
      nullsFirst: false,
    });
  }

  if (filters.category) {
    query = query.eq('category', filters.category);
  }

  const { data, error } = await query.order('sort_order', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Failed to fetch exercise bank topics');
  }

  return (Array.isArray(data) ? data : []).filter(
    (row): row is ExerciseBankTopic =>
      (typeof row.id === 'number' || typeof row.id === 'string') &&
      typeof row.topic === 'string' &&
      typeof row.display_title === 'string' &&
      typeof row.category === 'string' &&
      typeof row.lesson_external_id === 'string'
  );
}

export async function fetchExerciseBankSections() {
  const baseUrl = assertApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/exercise-bank/sections`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  const json = (await response.json().catch(() => null)) as ExerciseBankSectionsResponse | { error?: string } | null;
  if (!response.ok) {
    const message =
      json && typeof json === 'object' && 'error' in json && typeof json.error === 'string'
        ? json.error
        : 'Failed to fetch exercise bank sections';
    throw new Error(message);
  }

  const data = (json ?? {}) as ExerciseBankSectionsResponse;
  return {
    sections: Array.isArray(data.sections) ? data.sections : [],
    categories: Array.isArray(data.categories) ? data.categories : [],
  };
}

export async function fetchExerciseBankFeatured() {
  const baseUrl = assertApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/exercise-bank/featured`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  const json = (await response.json().catch(() => null)) as ExerciseBankFeaturedResponse | { error?: string } | null;
  if (!response.ok) {
    const message =
      json && typeof json === 'object' && 'error' in json && typeof json.error === 'string'
        ? json.error
        : 'Failed to fetch featured exercise sections';
    throw new Error(message);
  }

  const data = (json ?? {}) as ExerciseBankFeaturedResponse;
  return Array.isArray(data.featured) ? data.featured : [];
}

export async function fetchExerciseBankSection(params: { categorySlug: string; sectionSlug: string }) {
  const baseUrl = assertApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/exercise-bank/section/${encodeURIComponent(params.categorySlug)}/${encodeURIComponent(params.sectionSlug)}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    }
  );

  const json = (await response.json().catch(() => null)) as ExerciseBankSectionResponse | { error?: string } | null;
  if (!response.ok) {
    const message =
      json && typeof json === 'object' && 'error' in json && typeof json.error === 'string'
        ? json.error
        : 'Failed to fetch exercise section';
    throw new Error(message);
  }

  const data = (json ?? {}) as ExerciseBankSectionResponse;

  if (!data.section) {
    throw new Error('Exercise section not found');
  }

  return data.section;
}
