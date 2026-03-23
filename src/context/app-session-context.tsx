import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

import { fetchUserProfile } from '@/src/api/user';
import { supabase } from '@/src/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

type UserProfile = {
  id: string | null;
  name: string | null;
  username: string | null;
  email: string | null;
  avatar_image: string | null;
  created_at: string | null;
  is_paid: boolean;
  lessons_complete: number;
};

type AppSessionContextValue = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  authError: string | null;
  hasAccount: boolean;
  hasMembership: boolean;
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
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
      const { data: membershipData } = await supabase
        .from('users')
        .select('is_paid')
        .eq('id', currentUser.id)
        .maybeSingle();
      setAuthError(null);
      setProfile({
        id: data.id ?? currentUser.id,
        name: data.name ?? currentUser.user_metadata?.username ?? null,
        username: data.username ?? currentUser.user_metadata?.username ?? null,
        email: data.email ?? currentUser.email ?? null,
        avatar_image: data.avatar_image ?? null,
        created_at: data.created_at ?? null,
        is_paid: membershipData?.is_paid === true,
        lessons_complete: data.lessons_complete ?? 0,
      });
      return;
    }
    catch (error) {
      const { data, error: usersError } = await supabase
        .from('users')
        .select('id, username, email, avatar_image, created_at, is_paid')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (usersError) {
        setAuthError(error instanceof Error ? error.message : usersError.message);
        setProfile({
          id: currentUser.id,
          name: currentUser.user_metadata?.username ?? null,
          username: currentUser.user_metadata?.username ?? null,
          email: currentUser.email ?? null,
          avatar_image: null,
          created_at: null,
          is_paid: false,
          lessons_complete: 0,
        });
        return;
      }

      setAuthError(null);
      setProfile({
        id: data?.id ?? currentUser.id,
        name: data?.username ?? currentUser.user_metadata?.username ?? null,
        username: data?.username ?? currentUser.user_metadata?.username ?? null,
        email: data?.email ?? currentUser.email ?? null,
        avatar_image: data?.avatar_image ?? null,
        created_at: data?.created_at ?? null,
        is_paid: data?.is_paid === true,
        lessons_complete: 0,
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
      setIsLoading(false);
      void fetchProfile(nextSession?.user ?? null);
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

  const value = {
    session,
    user,
    profile,
    isLoading,
    authError,
    hasAccount,
    hasMembership,
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
