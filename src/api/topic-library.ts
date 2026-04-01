import { env } from '@/src/config/env';
import { TopicDetail, TopicLibraryTopic } from '@/src/types/topic-library';

type TopicLibraryResponse = {
  topics?: TopicLibraryTopic[];
};

type TopicDetailResponse = {
  topic?: TopicDetail | null;
};

const hasTopicsPayload = (value: TopicLibraryResponse | { error?: string } | null): value is TopicLibraryResponse =>
  Boolean(value && typeof value === 'object' && 'topics' in value);

const hasTopicPayload = (value: TopicDetailResponse | { error?: string } | null): value is TopicDetailResponse =>
  Boolean(value && typeof value === 'object' && 'topic' in value);

const normalizeBaseUrl = (baseUrl: string) => baseUrl.trim().replace(/\/+$/, '');

const assertApiBaseUrl = () => {
  const baseUrl = normalizeBaseUrl(env.apiBaseUrl);
  if (!baseUrl) {
    throw new Error('Missing required env var: EXPO_PUBLIC_API_BASE_URL');
  }
  return baseUrl;
};

export async function fetchTopicLibraryTopics(params: { language: 'en' | 'th' }) {
  const baseUrl = assertApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/topic-library?lang=${params.language}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  const json = (await response.json().catch(() => null)) as TopicLibraryResponse | { error?: string } | null;
  if (!response.ok) {
    const message =
      json && typeof json === 'object' && 'error' in json && typeof json.error === 'string'
        ? json.error
        : 'Failed to fetch topics';
    throw new Error(message);
  }

  return hasTopicsPayload(json) && Array.isArray(json.topics) ? json.topics : [];
}

export async function fetchTopicDetail(params: { slug: string; language: 'en' | 'th' }) {
  const baseUrl = assertApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/topic-library/${params.slug}?lang=${params.language}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  const json = (await response.json().catch(() => null)) as TopicDetailResponse | { error?: string } | null;
  if (!response.ok) {
    const message =
      json && typeof json === 'object' && 'error' in json && typeof json.error === 'string'
        ? json.error
        : 'Failed to fetch topic';
    throw new Error(message);
  }

  if (!hasTopicPayload(json) || !json.topic) {
    throw new Error('Topic not found');
  }

  return json.topic;
}
