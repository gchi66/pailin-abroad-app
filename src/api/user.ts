import { Platform } from 'react-native';

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
  subscription_status?: string | null;
  billing_provider?: string | null;
  membership_source?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean | null;
  cancel_at?: string | null;
};

type UserProfileResponse = {
  profile: UserProfile;
};

export type UserStats = {
  lessons_completed: number;
  levels_completed: number;
  daily_streak?: number;
  daily_streak_checked_in_today?: boolean;
  daily_streak_opened_on?: string | null;
  daily_streak_timezone?: string | null;
  daily_streak_last_checkin_date?: string | null;
};

export type DailyStreakResponse = {
  daily_streak: number;
  checked_in_today?: boolean;
  opened_on?: string | null;
  timezone?: string | null;
  last_checkin_date?: string | null;
  should_celebrate?: boolean;
};

export type CompletedLessonProgress = {
  id?: string | null;
  lesson_id: string;
  is_completed?: boolean | null;
  completed_at?: string | null;
  lessons?: LessonListItem | null;
};

export type LessonEngagementProgress = {
  lesson_id: string;
  last_visited_at?: string | null;
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

const getDeviceTimezone = () => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof timezone === 'string' && timezone.trim() ? timezone.trim() : null;
  } catch {
    return null;
  }
};

async function fetchAuthedJson<T>(
  path: string,
  options?: {
    method?: 'GET' | 'POST';
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  }
): Promise<T> {
  const baseUrl = assertApiBaseUrl();
  const accessToken = await getAccessToken();
  const timezone = getDeviceTimezone();
  const response = await fetch(`${baseUrl}${path}`, {
    method: options?.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(timezone ? { 'X-Timezone': timezone } : {}),
      ...(options?.headers ?? {}),
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

export async function fetchUserProfile() {
  const json = await fetchAuthedJson<UserProfileResponse>('/api/user/profile');
  return json.profile;
}

export async function fetchUserStats() {
  return fetchAuthedJson<UserStats>('/api/user/stats');
}

export async function checkInDailyStreak() {
  return fetchAuthedJson<DailyStreakResponse>('/api/app/user/daily-streak/check-in', {
    method: 'POST',
  });
}

export async function fetchDailyStreak() {
  return fetchAuthedJson<DailyStreakResponse>('/api/app/user/daily-streak');
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

export async function fetchUserLessonEngagements() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be signed in to load lesson engagement.');
  }

  const { data, error } = await supabase
    .from('user_lesson_unit_progress')
    .select('lesson_id, last_visited_at, unit_key')
    .eq('user_id', user.id)
    .like('unit_key', 'app:%')
    .not('last_visited_at', 'is', null)
    .order('last_visited_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).filter(
    (entry): entry is LessonEngagementProgress =>
      typeof entry.lesson_id === 'string' && entry.lesson_id.trim().length > 0
  );
}

type CancelSubscriptionResponse = {
  message?: string;
  cancel_at?: string | null;
  current_period_end?: string | null;
};

type DeleteAccountResponse = {
  message?: string;
};

export type AppStoreMembershipSyncResponse = {
  success: boolean;
  user_id: string;
  has_access: boolean;
  subscription_status: string | null;
  billing_provider: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  cancel_at: string | null;
  message?: string;
};

export type BillingPaymentMethod = {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
};

type BillingPaymentMethodResponse = {
  payment_method: BillingPaymentMethod | null;
};

export type BillingInvoice = {
  id: string;
  number: string | null;
  amount: number;
  currency: string;
  created: number;
  status: string | null;
  description: string | null;
  pdf_url: string | null;
};

type BillingInvoicesResponse = {
  invoices: BillingInvoice[];
};

export async function cancelUserSubscription() {
  return fetchAuthedJson<CancelSubscriptionResponse>('/api/cancel-subscription', {
    method: 'POST',
  });
}

export async function fetchBillingPaymentMethod() {
  return fetchAuthedJson<BillingPaymentMethodResponse>('/api/get-payment-method');
}

export async function fetchBillingInvoices() {
  return fetchAuthedJson<BillingInvoicesResponse>('/api/get-invoices');
}

export async function deleteUserAccount() {
  const baseUrl = assertApiBaseUrl();
  const accessToken = await getAccessToken();
  const response = await fetch(`${baseUrl}/api/delete_account`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ access_token: accessToken }),
  });

  const json = (await response.json().catch(() => null)) as DeleteAccountResponse | { error?: string } | null;
  if (!response.ok) {
    const message =
      json && typeof json === 'object' && 'error' in json && typeof json.error === 'string'
        ? json.error
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return json as DeleteAccountResponse;
}

export async function syncAppStoreMembership(source?: string) {
  return fetchAuthedJson<AppStoreMembershipSyncResponse>('/api/sync-app-store-membership', {
    method: 'POST',
    body: source ? { source } : {},
    headers: {
      'X-Platform': Platform.OS,
    },
  });
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
