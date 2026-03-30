import { env } from '@/src/config/env';
import {
  ExerciseBankCategory,
  ExerciseBankSectionDetail,
  ExerciseBankSectionSummary,
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
