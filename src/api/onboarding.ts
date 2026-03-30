import { env } from '@/src/config/env';
import { supabase } from '@/src/lib/supabase';

const normalizeBaseUrl = (baseUrl: string) => baseUrl.trim().replace(/\/+$/, '');

const assertApiBaseUrl = () => {
  const baseUrl = normalizeBaseUrl(env.apiBaseUrl);
  if (!baseUrl) {
    throw new Error('Missing required env var: EXPO_PUBLIC_API_BASE_URL');
  }
  return baseUrl;
};

async function getSessionOrThrow() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error('Authentication required. Please sign in again.');
  }

  return session;
}

async function fetchAuthedJson<T>(path: string, options: { method: 'POST' | 'PUT'; body?: Record<string, unknown> }) {
  const baseUrl = assertApiBaseUrl();
  const session = await getSessionOrThrow();
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
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

export async function ensureOnboardingUserRecord() {
  const baseUrl = assertApiBaseUrl();
  const session = await getSessionOrThrow();
  const response = await fetch(`${baseUrl}/api/confirm-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ access_token: session.access_token }),
  });

  const json = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(json?.error || 'Failed to verify account record.');
  }
}

type SetPasswordResponse = {
  session?: {
    access_token: string;
    refresh_token: string;
  };
};

export async function setOnboardingPassword(password: string) {
  const json = await fetchAuthedJson<SetPasswordResponse>('/api/set-password', {
    method: 'POST',
    body: { password },
  });

  if (json.session?.access_token && json.session?.refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token: json.session.access_token,
      refresh_token: json.session.refresh_token,
    });

    if (error) {
      throw new Error(error.message);
    }
  }
}

export async function updateOnboardingProfile(params: { username: string; avatarImage: string }) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not found.');
  }

  const username = params.username.trim();
  if (!username) {
    throw new Error('Username is required.');
  }

  const { error: profileError } = await supabase
    .from('users')
    .update({
      username,
      avatar_image: params.avatarImage,
    })
    .eq('id', user.id);

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { error: authUpdateError } = await supabase.auth.updateUser({
    data: {
      username,
      name: username,
      avatar_image: params.avatarImage,
    },
  });

  if (authUpdateError) {
    throw new Error(authUpdateError.message);
  }

  try {
    await fetchAuthedJson('/api/user/profile', {
      method: 'PUT',
      body: {
        username,
        avatar_image: params.avatarImage,
      },
    });
  } catch (error) {
    console.warn('[onboarding] backend profile sync skipped:', error);
  }
}

export async function completeOnboarding() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not found.');
  }

  const { error } = await supabase
    .from('users')
    .update({ onboarding_completed: true })
    .eq('id', user.id);

  if (error) {
    throw new Error(error.message);
  }
}
