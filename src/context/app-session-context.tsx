import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

import { UserProfile, fetchUserProfile } from '@/src/api/user';
import { supabase } from '@/src/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

type AppProfile = UserProfile & {
  is_paid: boolean;
  onboarding_completed: boolean;
  subscription_status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  cancel_at: string | null;
};

type AppSessionContextValue = {
  session: Session | null;
  user: User | null;
  profile: AppProfile | null;
  isLoading: boolean;
  authError: string | null;
  hasAccount: boolean;
  hasMembership: boolean;
  hasCompletedOnboarding: boolean;
  signIn: (params: { email: string; password: string }) => Promise<{ error: string | null }>;
  signUp: (params: { email: string; password: string }) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
};

const AppSessionContext = createContext<AppSessionContextValue | undefined>(undefined);

type AppSessionProviderProps = {
  children: React.ReactNode;
};

export function AppSessionProvider({ children }: AppSessionProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const redirectTo = makeRedirectUri({
    scheme: 'pailinabroadmobile',
    path: 'auth/callback',
  });

  const logAuth = (...args: unknown[]) => {
    console.log('[auth]', ...args);
  };

  const createSessionFromUrl = useCallback(async (url: string) => {
    logAuth('createSessionFromUrl:start');
    const { params, errorCode } = QueryParams.getQueryParams(url);

    if (errorCode) {
      logAuth('createSessionFromUrl:errorCode', errorCode);
      throw new Error(errorCode);
    }

    const accessToken = typeof params.access_token === 'string' ? params.access_token : null;
    const refreshToken = typeof params.refresh_token === 'string' ? params.refresh_token : null;

    if (!accessToken || !refreshToken) {
      logAuth('createSessionFromUrl:missingTokens', {
        hasAccessToken: Boolean(accessToken),
        hasRefreshToken: Boolean(refreshToken),
      });
      return;
    }

    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      logAuth('createSessionFromUrl:setSessionError', error.message);
      throw error;
    }

    logAuth('createSessionFromUrl:success');
  }, []);

  const fetchProfile = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null);
      return;
    }

    try {
      const data = await fetchUserProfile();
      const { data: userRow } = await supabase
        .from('users')
        .select(
          'id, username, email, avatar_image, is_admin, created_at, is_paid, onboarding_completed, subscription_status, current_period_end, cancel_at_period_end, cancel_at'
        )
        .eq('id', currentUser.id)
        .maybeSingle();
      setAuthError(null);
      setProfile({
        id: userRow?.id ?? data.id ?? currentUser.id,
        name: data.name ?? userRow?.username ?? currentUser.user_metadata?.username ?? currentUser.user_metadata?.name ?? null,
        username: userRow?.username ?? data.username ?? currentUser.user_metadata?.username ?? currentUser.user_metadata?.name ?? null,
        email: userRow?.email ?? data.email ?? currentUser.email ?? null,
        avatar_image: userRow?.avatar_image ?? data.avatar_image ?? null,
        is_admin: userRow?.is_admin ?? data.is_admin ?? false,
        created_at: userRow?.created_at ?? data.created_at ?? null,
        is_paid: userRow?.is_paid === true,
        onboarding_completed: userRow?.onboarding_completed === true,
        lessons_complete: data.lessons_complete ?? 0,
        subscription_status: userRow?.subscription_status ?? data.subscription_status ?? null,
        current_period_end: userRow?.current_period_end ?? data.current_period_end ?? null,
        cancel_at_period_end: userRow?.cancel_at_period_end === true || data.cancel_at_period_end === true,
        cancel_at: userRow?.cancel_at ?? data.cancel_at ?? null,
      });
      return;
    } catch (error) {
      const { data, error: usersError } = await supabase
        .from('users')
        .select(
          'id, username, email, avatar_image, is_admin, created_at, is_paid, onboarding_completed, subscription_status, current_period_end, cancel_at_period_end, cancel_at'
        )
        .eq('id', currentUser.id)
        .maybeSingle();

      if (usersError) {
        setAuthError(error instanceof Error ? error.message : usersError.message);
        setProfile({
          id: currentUser.id,
          name: currentUser.user_metadata?.username ?? currentUser.user_metadata?.name ?? null,
          username: currentUser.user_metadata?.username ?? currentUser.user_metadata?.name ?? null,
          email: currentUser.email ?? null,
          avatar_image: null,
          is_admin: false,
          created_at: null,
          is_paid: false,
          onboarding_completed: false,
          lessons_complete: 0,
          subscription_status: null,
          current_period_end: null,
          cancel_at_period_end: false,
          cancel_at: null,
        });
        return;
      }

      setAuthError(null);
      setProfile({
        id: data?.id ?? currentUser.id,
        name: data?.username ?? currentUser.user_metadata?.username ?? currentUser.user_metadata?.name ?? null,
        username: data?.username ?? currentUser.user_metadata?.username ?? currentUser.user_metadata?.name ?? null,
        email: data?.email ?? currentUser.email ?? null,
        avatar_image: data?.avatar_image ?? null,
        is_admin: data?.is_admin ?? false,
        created_at: data?.created_at ?? null,
        is_paid: data?.is_paid === true,
        onboarding_completed: data?.onboarding_completed === true,
        lessons_complete: 0,
        subscription_status: data?.subscription_status ?? null,
        current_period_end: data?.current_period_end ?? null,
        cancel_at_period_end: data?.cancel_at_period_end === true,
        cancel_at: data?.cancel_at ?? null,
      });
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      setIsLoading(true);
      const { data, error } = await supabase.auth.getSession();
      logAuth('hydrate:getSession', {
        hasSession: Boolean(data.session),
        userId: data.session?.user?.id ?? null,
        error: error?.message ?? null,
      });
      if (!isMounted) {
        return;
      }

      if (error) {
        setAuthError(error.message);
      }

      const nextSession = data.session ?? null;
      setSession(nextSession);
      await fetchProfile(nextSession?.user ?? null);
      if (isMounted) {
        setIsLoading(false);
      }
    };

    void hydrate();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      logAuth('onAuthStateChange', {
        event,
        hasSession: Boolean(nextSession),
        userId: nextSession?.user?.id ?? null,
      });
      setSession(nextSession);
      setIsLoading(true);
      void (async () => {
        await fetchProfile(nextSession?.user ?? null);
        if (isMounted) {
          setIsLoading(false);
        }
      })();
    });

    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      logAuth('linking:url');
      void createSessionFromUrl(url).catch((error: unknown) => {
        if (error instanceof Error) {
          logAuth('linking:error', error.message);
          setAuthError(error.message);
          return;
        }
        logAuth('linking:error', 'Could not complete sign-in.');
        setAuthError('Could not complete sign-in.');
      });
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, [createSessionFromUrl, fetchProfile]);

  const signIn = async ({ email, password }: { email: string; password: string }) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setAuthError(error.message);
      return { error: error.message };
    }

    setAuthError(null);
    return { error: null };
  };

  const signUp = async ({ email, password }: { email: string; password: string }) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      setAuthError(error.message);
      return { error: error.message, needsEmailConfirmation: false };
    }

    setAuthError(null);
    return {
      error: null,
      needsEmailConfirmation: data.session === null,
    };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthError(error.message);
      return { error: error.message };
    }

    setAuthError(null);
    setProfile(null);
    return { error: null };
  };

  const signInWithGoogle = async () => {
    logAuth('google:start', { redirectTo });
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      logAuth('google:signInWithOAuth:error', error.message);
      setAuthError(error.message);
      return { error: error.message };
    }

    const authUrl = data?.url;
    logAuth('google:signInWithOAuth:urlReady', Boolean(authUrl));
    if (!authUrl) {
      const message = 'Missing Google sign-in URL.';
      logAuth('google:missingUrl');
      setAuthError(message);
      return { error: message };
    }

    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectTo);
    logAuth('google:openAuthSessionAsync:result', { type: result.type });
    if (result.type === 'success') {
      try {
        await createSessionFromUrl(result.url);
        setAuthError(null);
        logAuth('google:success');
        return { error: null };
      } catch (sessionError) {
        const message = sessionError instanceof Error ? sessionError.message : 'Could not establish session.';
        logAuth('google:sessionError', message);
        setAuthError(message);
        return { error: message };
      }
    }

    if (result.type === 'cancel' || result.type === 'dismiss') {
      logAuth('google:cancelled', result.type);
      return { error: null };
    }

    const message = 'Google sign-in did not complete.';
    logAuth('google:incomplete');
    setAuthError(message);
    return { error: message };
  };

  const refreshProfile = async () => {
    await fetchProfile(session?.user ?? null);
  };

  const user = session?.user ?? null;
  const hasAccount = user !== null;
  const hasMembership = profile?.is_paid === true;
  const hasCompletedOnboarding = profile?.onboarding_completed === true;

  const value = {
    session,
    user,
    profile,
    isLoading,
    authError,
    hasAccount,
    hasMembership,
    hasCompletedOnboarding,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    refreshProfile,
  };

  return <AppSessionContext.Provider value={value}>{children}</AppSessionContext.Provider>;
}

export function useAppSession() {
  const context = useContext(AppSessionContext);
  if (!context) {
    throw new Error('useAppSession must be used within AppSessionProvider');
  }
  return context;
}
