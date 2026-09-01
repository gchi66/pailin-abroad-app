import { env } from '@/src/config/env';
import { supabase } from '@/src/lib/supabase';
import {
  SpeakingCoachLesson,
  SpeakingCoachLessonSummary,
  SpeakingCoachSession,
  SpeakingEvaluationResponse,
} from '@/src/types/speaking-coach';

const normalizeBaseUrl = (baseUrl: string) => baseUrl.trim().replace(/\/+$/, '');
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

async function timedFetch(label: string, input: RequestInfo | URL, init?: RequestInit) {
  const started = nowMs();
  if (__DEV__) console.log(`[Speaking Coach] ${label} started`);
  try {
    const response = await fetch(input, init);
    if (__DEV__) {
      console.log(
        `[Speaking Coach] ${label} finished in ${Math.round(nowMs() - started)}ms (HTTP ${response.status})`
      );
    }
    return response;
  } catch (error) {
    if (__DEV__) {
      console.log(`[Speaking Coach] ${label} failed after ${Math.round(nowMs() - started)}ms`);
    }
    throw error;
  }
}

async function apiContext() {
  const baseUrl = normalizeBaseUrl(env.apiBaseUrl);
  if (!baseUrl) {
    throw new Error('Missing required env var: EXPO_PUBLIC_API_BASE_URL');
  }

  const { data, error } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (error || !accessToken) {
    throw new Error('Please sign in to test the speaking coach.');
  }
  return { baseUrl, accessToken };
}

async function responseJson<T>(response: Response): Promise<T> {
  const json = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) {
    throw new Error(json?.error || `Request failed with status ${response.status}`);
  }
  if (!json) throw new Error('The speaking coach returned an empty response.');
  return json;
}

export async function fetchSpeakingCoachLesson(lessonExternalId: string): Promise<SpeakingCoachLesson> {
  const { baseUrl, accessToken } = await apiContext();

  const response = await timedFetch(
    `lesson ${lessonExternalId}`,
    `${baseUrl}/api/speaking/lessons/${encodeURIComponent(lessonExternalId)}?include_test_answers=1`,
    {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  const json = await responseJson<{ lesson?: SpeakingCoachLesson }>(response);
  if (!json?.lesson) {
    throw new Error('Speaking lesson not found.');
  }
  return json.lesson;
}

export async function fetchAvailableSpeakingCoachLessons(): Promise<SpeakingCoachLessonSummary[]> {
  const { baseUrl, accessToken } = await apiContext();
  const response = await timedFetch('lesson catalog', `${baseUrl}/api/speaking/lessons`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const json = await responseJson<{ lessons?: SpeakingCoachLessonSummary[] }>(response);
  return Array.isArray(json.lessons) ? json.lessons : [];
}

export async function createOrResumeSpeakingSession(
  lessonExternalId: string,
  options?: { forceNew?: boolean }
): Promise<SpeakingCoachSession> {
  const { baseUrl, accessToken } = await apiContext();
  const response = await timedFetch('session', `${baseUrl}/api/speaking/sessions`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lesson_external_id: lessonExternalId,
      force_new: options?.forceNew === true,
    }),
  });
  const json = await responseJson<{ session?: SpeakingCoachSession }>(response);
  if (!json.session) throw new Error('The speaking session could not be started.');
  return json.session;
}

export async function evaluateSpeakingRecording(input: {
  uri: string;
  fileName?: string;
  mimeType?: string;
  sessionId: string;
  questionId: number;
  instructionalAttemptNumber: 1 | 2;
  previousAttemptId: string | null;
}): Promise<SpeakingEvaluationResponse> {
  const { baseUrl, accessToken } = await apiContext();
  if (__DEV__) {
    console.log('[Speaking Coach] Upload audio metadata', {
      file_name: input.fileName ?? 'speaking-recording.m4a',
      mime_type: input.mimeType ?? 'audio/mp4',
      uri_extension: input.uri.split('?')[0]?.split('.').pop()?.toLowerCase() ?? null,
    });
  }
  const form = new FormData();
  form.append('session_id', input.sessionId);
  form.append('question_id', String(input.questionId));
  form.append('instructional_attempt_number', String(input.instructionalAttemptNumber));
  if (input.previousAttemptId) form.append('previous_attempt_id', input.previousAttemptId);
  form.append(
    'audio',
    {
      uri: input.uri,
      name: input.fileName ?? 'speaking-recording.m4a',
      type: input.mimeType ?? 'audio/mp4',
    } as unknown as Blob
  );

  const response = await timedFetch('evaluation upload + response', `${baseUrl}/api/speaking/evaluate`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });
  return responseJson<SpeakingEvaluationResponse>(response);
}
