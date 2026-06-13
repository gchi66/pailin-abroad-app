import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isErrorWithCode, isSuccessResponse, statusCodes, GoogleSignin } from '@react-native-google-signin/google-signin';
import { Session, User } from '@supabase/supabase-js';
import type { CustomerInfo } from 'react-native-purchases';
import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri } from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { UserProfile, fetchUserProfile, syncAppStoreMembership } from '@/src/api/user';
import { env } from '@/src/config/env';
import {
  addRevenueCatCustomerInfoUpdateListener,
  getRevenueCatCustomerInfo,
  hasRevenueCatFullAccess,
  invalidateRevenueCatCustomerInfoCache,
  removeRevenueCatCustomerInfoUpdateListener,
  syncRevenueCatPurchases,
  syncRevenueCatUser,
} from '@/src/lib/revenuecat';
import { clearResolvedLessonCache } from '@/src/api/lessons';
import { supabase } from '@/src/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const APP_BOOTSTRAP_LABEL = '[app-bootstrap]';
const GUEST_MODE_STORAGE_KEY = 'pailin-abroad.guest-mode';
const GUEST_REVENUECAT_USER_ID_STORAGE_KEY = 'pailin-abroad.guest-revenuecat-user-id';

const getBootstrapStartedAt = () =>
  (globalThis as typeof globalThis & { __pailinAppBootstrapStartedAt?: number }).__pailinAppBootstrapStartedAt ?? null;

const getBootstrapElapsedMs = () => {
  const startedAt = getBootstrapStartedAt();
  return startedAt ? Date.now() - startedAt : null;
};

const logBootstrap = (message: string, metadata?: Record<string, unknown>) => {
  console.info(APP_BOOTSTRAP_LABEL, message, {
    elapsedMs: getBootstrapElapsedMs(),
    ...(metadata ?? {}),
  });
};

const decodeJwtPayload = (token: string) => {
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const decoded = globalThis.atob ? globalThis.atob(padded) : null;

    if (!decoded) {
      return null;
    }

    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const isEmailLike = (value: string | null | undefined) => {
  if (!value) {
    return false;
  }

  return /\S+@\S+\.\S+/.test(value.trim());
};

const isPrivateRelayEmail = (value: string | null | undefined) => {
  if (!value) {
    return false;
  }

  return value.trim().toLowerCase().endsWith('@privaterelay.appleid.com');
};

const getPreferredMetadataName = (currentUser: User) => {
  const givenName = typeof currentUser.user_metadata?.given_name === 'string' ? currentUser.user_metadata.given_name.trim() : '';
  const familyName = typeof currentUser.user_metadata?.family_name === 'string' ? currentUser.user_metadata.family_name.trim() : '';
  const combinedName = [givenName, familyName].filter(Boolean).join(' ').trim();

  const candidates = [
    combinedName,
    typeof currentUser.user_metadata?.full_name === 'string' ? currentUser.user_metadata.full_name.trim() : '',
    typeof currentUser.user_metadata?.name === 'string' ? currentUser.user_metadata.name.trim() : '',
    typeof currentUser.user_metadata?.username === 'string' ? currentUser.user_metadata.username.trim() : '',
  ];

  return candidates.find((value) => value && !isEmailLike(value)) ?? null;
};

type AppProfile = UserProfile & {
  is_paid: boolean;
  onboarding_completed: boolean;
  subscription_status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  cancel_at: string | null;
};

type AppUserRow = {
  id: string;
  username: string | null;
  email: string | null;
  avatar_image: string | null;
  is_admin: boolean | null;
  created_at: string | null;
  is_paid: boolean | null;
  onboarding_completed: boolean | null;
  subscription_status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  cancel_at: string | null;
};

type AppSessionContextValue = {
  session: Session | null;
  user: User | null;
  profile: AppProfile | null;
  isLoading: boolean;
  authError: string | null;
  hasAccount: boolean;
  isGuestMode: boolean;
  isGuestConversionPending: boolean;
  hasMembership: boolean;
  hasCompletedOnboarding: boolean;
  signIn: (params: { email: string; password: string }) => Promise<{ error: string | null }>;
  signUp: (params: { email: string; password: string }) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
  signInWithApple: () => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  continueAsGuest: () => Promise<void>;
  exitGuestMode: () => Promise<void>;
  signOut: () => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
  refreshMembershipAccess: () => Promise<void>;
};

const AppSessionContext = createContext<AppSessionContextValue | undefined>(undefined);

const getAppleDisplayName = (credential: AppleAuthentication.AppleAuthenticationCredential) => {
  const givenName = credential.fullName?.givenName?.trim() ?? '';
  const familyName = credential.fullName?.familyName?.trim() ?? '';
  const fullName = [givenName, familyName].filter(Boolean).join(' ').trim();

  if (!fullName) {
    return null;
  }

  return {
    fullName,
    givenName: givenName || null,
    familyName: familyName || null,
  };
};

type AppSessionProviderProps = {
  children: React.ReactNode;
};

export function AppSessionProvider({ children }: AppSessionProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [revenueCatCustomerInfo, setRevenueCatCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [guestRevenueCatUserId, setGuestRevenueCatUserId] = useState<string | null>(null);
  const [isGuestConversionPending, setIsGuestConversionPending] = useState(false);
  const hasIgnoredInitialSession = useRef(false);
  const guestConversionPendingRef = useRef(false);
  const guestConversionShouldCarryMembershipRef = useRef(false);

  const redirectTo = makeRedirectUri({
    scheme: 'pailinabroadmobile',
    path: 'auth/callback',
  });

  const logAuth = (...args: unknown[]) => {
    console.log('[auth]', ...args);
  };

  const persistGuestMode = useCallback(async (enabled: boolean) => {
    try {
      if (enabled) {
        await AsyncStorage.setItem(GUEST_MODE_STORAGE_KEY, 'true');
        return;
      }

      await AsyncStorage.removeItem(GUEST_MODE_STORAGE_KEY);
    } catch (error) {
      console.warn('[guest-mode] failed to persist state', error);
    }
  }, []);

  const persistGuestRevenueCatUserId = useCallback(async (nextGuestUserId: string | null) => {
    try {
      if (nextGuestUserId) {
        await AsyncStorage.setItem(GUEST_REVENUECAT_USER_ID_STORAGE_KEY, nextGuestUserId);
        return;
      }

      await AsyncStorage.removeItem(GUEST_REVENUECAT_USER_ID_STORAGE_KEY);
    } catch (error) {
      console.warn('[guest-mode] failed to persist RevenueCat guest user id', error);
    }
  }, []);

  const ensureGuestRevenueCatUserId = useCallback(async () => {
    if (guestRevenueCatUserId) {
      return guestRevenueCatUserId;
    }

    try {
      const storedGuestUserId = await AsyncStorage.getItem(GUEST_REVENUECAT_USER_ID_STORAGE_KEY);
      if (storedGuestUserId) {
        setGuestRevenueCatUserId(storedGuestUserId);
        return storedGuestUserId;
      }
    } catch (error) {
      console.warn('[guest-mode] failed to read RevenueCat guest user id', error);
    }

    const nextGuestUserId = `guest:${Crypto.randomUUID()}`;
    setGuestRevenueCatUserId(nextGuestUserId);
    await persistGuestRevenueCatUserId(nextGuestUserId);
    return nextGuestUserId;
  }, [guestRevenueCatUserId, persistGuestRevenueCatUserId]);

  const clearGuestRevenueCatUserId = useCallback(async () => {
    setGuestRevenueCatUserId(null);
    await persistGuestRevenueCatUserId(null);
  }, [persistGuestRevenueCatUserId]);

  const fetchUsersRow = useCallback(async (userId: string) => {
    return supabase
      .from('users')
      .select(
        'id, username, email, avatar_image, is_admin, created_at, is_paid, onboarding_completed, subscription_status, current_period_end, cancel_at_period_end, cancel_at'
      )
      .eq('id', userId)
      .maybeSingle<AppUserRow>();
  }, []);

  const persistAppleDisplayName = useCallback(
    async (displayName: NonNullable<ReturnType<typeof getAppleDisplayName>>) => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        return;
      }

      try {
        await supabase.auth.updateUser({
          data: {
            full_name: displayName.fullName,
            name: displayName.fullName,
            username: displayName.fullName,
            given_name: displayName.givenName,
            family_name: displayName.familyName,
          },
        });
      } catch (updateError) {
        logAuth('apple:updateUser:error', updateError instanceof Error ? updateError.message : 'Unknown error');
      }

      try {
        const { data: userRow } = await fetchUsersRow(currentUser.id);
        const currentUsername = userRow?.username?.trim() ?? '';
        const shouldReplaceUsername = !currentUsername || isEmailLike(currentUsername) || isPrivateRelayEmail(currentUsername);

        const updatePayload: Partial<AppUserRow> & { avatar_image?: string | null } = {};

        if (shouldReplaceUsername) {
          updatePayload.username = displayName.fullName;
        }

        if (Object.keys(updatePayload).length > 0) {
          const { error: usersUpdateError } = await supabase.from('users').update(updatePayload).eq('id', currentUser.id);
          if (usersUpdateError) {
            logAuth('apple:updateUsersRow:error', usersUpdateError.message);
          }
        }
      } catch (usersRowError) {
        logAuth('apple:updateUsersRow:error', usersRowError instanceof Error ? usersRowError.message : 'Unknown error');
      }

      await fetchProfile(currentUser, { waitForEnrichment: true });
    },
    [fetchProfile, fetchUsersRow]
  );

  const buildMinimalProfile = useCallback((currentUser: User, userRow: AppUserRow | null): AppProfile => {
    const preferredMetadataName = getPreferredMetadataName(currentUser);
    const rowUsername = userRow?.username?.trim() ?? null;

    return {
      id: userRow?.id ?? currentUser.id,
      name: preferredMetadataName ?? rowUsername ?? currentUser.user_metadata?.username ?? currentUser.user_metadata?.name ?? null,
      username: rowUsername ?? preferredMetadataName ?? currentUser.user_metadata?.username ?? currentUser.user_metadata?.name ?? null,
      email: userRow?.email ?? currentUser.email ?? null,
      avatar_image:
        userRow?.avatar_image ??
        (typeof currentUser.user_metadata?.avatar_image === 'string' ? currentUser.user_metadata.avatar_image : null),
      is_admin: userRow?.is_admin === true,
      created_at: userRow?.created_at ?? null,
      is_paid: userRow?.is_paid === true,
      onboarding_completed: userRow?.onboarding_completed === true,
      lessons_complete: 0,
      subscription_status: userRow?.subscription_status ?? null,
      current_period_end: userRow?.current_period_end ?? null,
      cancel_at_period_end: userRow?.cancel_at_period_end === true,
      cancel_at: userRow?.cancel_at ?? null,
    };
  }, []);

  const mergeEnrichedProfile = useCallback((currentUser: User, userRow: AppUserRow | null, backendProfile: UserProfile): AppProfile => {
    const preferredMetadataName = getPreferredMetadataName(currentUser);
    const rowUsername = userRow?.username?.trim() ?? null;
    const backendName = backendProfile.name?.trim() ?? null;
    const backendUsername = backendProfile.username?.trim() ?? null;

    return {
      id: userRow?.id ?? backendProfile.id ?? currentUser.id,
      name:
        (backendName && !isEmailLike(backendName) ? backendName : null) ??
        preferredMetadataName ??
        (rowUsername && !isEmailLike(rowUsername) ? rowUsername : null) ??
        backendName ??
        rowUsername ??
        backendUsername ??
        currentUser.user_metadata?.username ??
        currentUser.user_metadata?.name ??
        null,
      username:
        rowUsername ??
        backendUsername ??
        preferredMetadataName ??
        currentUser.user_metadata?.username ??
        currentUser.user_metadata?.name ??
        null,
      email: userRow?.email ?? backendProfile.email ?? currentUser.email ?? null,
      avatar_image:
        userRow?.avatar_image ??
        backendProfile.avatar_image ??
        (typeof currentUser.user_metadata?.avatar_image === 'string' ? currentUser.user_metadata.avatar_image : null),
      is_admin: userRow?.is_admin ?? backendProfile.is_admin ?? false,
      created_at: userRow?.created_at ?? backendProfile.created_at ?? null,
      is_paid: userRow?.is_paid === true,
      onboarding_completed: userRow?.onboarding_completed === true,
      lessons_complete: backendProfile.lessons_complete ?? 0,
      subscription_status: userRow?.subscription_status ?? backendProfile.subscription_status ?? null,
      current_period_end: userRow?.current_period_end ?? backendProfile.current_period_end ?? null,
      cancel_at_period_end: userRow?.cancel_at_period_end === true || backendProfile.cancel_at_period_end === true,
      cancel_at: userRow?.cancel_at ?? backendProfile.cancel_at ?? null,
    };
  }, []);

  const enrichProfile = useCallback(async (currentUser: User, userRow: AppUserRow | null) => {
    const enrichStartedAt = Date.now();

    try {
      logBootstrap('profile enrichment started', {
        userId: currentUser.id,
      });
      const backendProfileStartedAt = Date.now();
      const backendProfile = await fetchUserProfile();
      logBootstrap('profile backend loaded', {
        userId: currentUser.id,
        stepElapsedMs: Date.now() - backendProfileStartedAt,
      });

      setAuthError(null);
      setProfile((previousProfile) => ({
        ...(previousProfile ?? buildMinimalProfile(currentUser, userRow)),
        ...mergeEnrichedProfile(currentUser, userRow, backendProfile),
      }));
      logBootstrap('profile enrichment completed', {
        userId: currentUser.id,
        stepElapsedMs: Date.now() - enrichStartedAt,
      });
    } catch (error) {
      logBootstrap('profile enrichment failed', {
        userId: currentUser.id,
        stepElapsedMs: Date.now() - enrichStartedAt,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      setAuthError((previousError) => previousError ?? (error instanceof Error ? error.message : 'Could not load profile.'));
    }
  }, [buildMinimalProfile, mergeEnrichedProfile]);

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

  const fetchProfile = useCallback(async (
    currentUser: User | null,
    options?: { background?: boolean; waitForEnrichment?: boolean }
  ) => {
    if (!currentUser) {
      logBootstrap('profile skipped', {
        reason: 'no current user',
      });
      setProfile(null);
      return;
    }

    const profileStartedAt = Date.now();
    const shouldEnrich = options?.background !== false;
    const shouldWaitForEnrichment = options?.waitForEnrichment === true;

    try {
      logBootstrap('profile fetch started', {
        userId: currentUser.id,
        backgroundEnrichment: shouldEnrich,
        waitForEnrichment: shouldWaitForEnrichment,
      });
      const usersRowStartedAt = Date.now();
      const { data: userRow, error: usersError } = await fetchUsersRow(currentUser.id);
      logBootstrap('profile users row loaded', {
        userId: currentUser.id,
        stepElapsedMs: Date.now() - usersRowStartedAt,
        hasUsersError: Boolean(usersError),
      });

      if (usersError) {
        throw usersError;
      }

      const minimalProfile = buildMinimalProfile(currentUser, userRow ?? null);
      setAuthError(null);
      setProfile(minimalProfile);
      logBootstrap('profile minimal loaded', {
        userId: currentUser.id,
        stepElapsedMs: Date.now() - profileStartedAt,
      });

      if (shouldEnrich) {
        const enrichmentPromise = enrichProfile(currentUser, userRow ?? null);
        if (shouldWaitForEnrichment) {
          await enrichmentPromise;
        }
      }

      return;
    } catch (error) {
      logBootstrap('profile minimal load failed', {
        userId: currentUser.id,
        stepElapsedMs: Date.now() - profileStartedAt,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      const fallbackUsersRowStartedAt = Date.now();
      const { data, error: usersError } = await fetchUsersRow(currentUser.id);
      logBootstrap('profile fallback users row loaded', {
        userId: currentUser.id,
        stepElapsedMs: Date.now() - fallbackUsersRowStartedAt,
        hasUsersError: Boolean(usersError),
      });

      if (usersError) {
        setAuthError(error instanceof Error ? error.message : usersError.message);
        const preferredMetadataName = getPreferredMetadataName(currentUser);
        setProfile({
          id: currentUser.id,
          name: preferredMetadataName ?? currentUser.user_metadata?.username ?? currentUser.user_metadata?.name ?? null,
          username: currentUser.user_metadata?.username ?? preferredMetadataName ?? currentUser.user_metadata?.name ?? null,
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
        logBootstrap('profile fallback completed with minimal data', {
          userId: currentUser.id,
          stepElapsedMs: Date.now() - profileStartedAt,
        });
        return;
      }

      setAuthError(null);
      setProfile(buildMinimalProfile(currentUser, data ?? null));
      logBootstrap('profile fallback completed', {
        userId: currentUser.id,
        stepElapsedMs: Date.now() - profileStartedAt,
      });

      if (shouldEnrich) {
        const enrichmentPromise = enrichProfile(currentUser, data ?? null);
        if (shouldWaitForEnrichment) {
          await enrichmentPromise;
        }
      }
    }
  }, [buildMinimalProfile, enrichProfile, fetchUsersRow]);

  const syncMembershipForAuthenticatedUser = useCallback(async (source: string) => {
    try {
      const response = await syncAppStoreMembership(source);
      logAuth('membership:sync:success', {
        source,
        hasAccess: response.has_access,
        subscriptionStatus: response.subscription_status,
        billingProvider: response.billing_provider,
      });
      return response;
    } catch (error) {
      logAuth('membership:sync:error', {
        source,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }, []);

  const finalizeGuestConversion = useCallback(async () => {
    guestConversionPendingRef.current = false;
    setIsGuestConversionPending(false);
    setIsGuestMode(false);
    await persistGuestMode(false);
    await clearGuestRevenueCatUserId();
  }, [clearGuestRevenueCatUserId, persistGuestMode]);

  const delay = useCallback((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)), []);

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }

    GoogleSignin.configure({
      iosClientId: env.googleIosClientId || undefined,
      webClientId: env.googleWebClientId || undefined,
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      const hydrateStartedAt = Date.now();
      logBootstrap('session hydrate started');
      setIsLoading(true);

      const getSessionStartedAt = Date.now();
      const [{ data, error }, storedGuestMode, storedGuestRevenueCatUserId] = await Promise.all([
        supabase.auth.getSession(),
        AsyncStorage.getItem(GUEST_MODE_STORAGE_KEY).catch(() => null),
        AsyncStorage.getItem(GUEST_REVENUECAT_USER_ID_STORAGE_KEY).catch(() => null),
      ]);
      logAuth('hydrate:getSession', {
        hasSession: Boolean(data.session),
        userId: data.session?.user?.id ?? null,
        error: error?.message ?? null,
      });
      logBootstrap('session getSession completed', {
        stepElapsedMs: Date.now() - getSessionStartedAt,
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
      setIsGuestMode(nextSession ? false : storedGuestMode === 'true');
      setGuestRevenueCatUserId(nextSession ? null : storedGuestRevenueCatUserId);
      await fetchProfile(nextSession?.user ?? null);
      if (isMounted) {
        setIsLoading(false);
        logBootstrap('session hydrate completed', {
          stepElapsedMs: Date.now() - hydrateStartedAt,
          hasSession: Boolean(nextSession),
          userId: nextSession?.user?.id ?? null,
        });
      }
    };

    void hydrate();

    void Linking.getInitialURL()
      .then((initialUrl) => {
        if (!initialUrl) {
          return;
        }

        logAuth('linking:initialUrl');
        return createSessionFromUrl(initialUrl).catch((error: unknown) => {
          if (error instanceof Error) {
            logAuth('linking:initialUrl:error', error.message);
            setAuthError(error.message);
            return;
          }

          logAuth('linking:initialUrl:error', 'Could not complete sign-in.');
          setAuthError('Could not complete sign-in.');
        });
      })
      .catch((error: unknown) => {
        if (error instanceof Error) {
          logAuth('linking:getInitialURL:error', error.message);
          return;
        }

        logAuth('linking:getInitialURL:error', 'Unknown error');
      });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'TOKEN_REFRESHED') {
        logBootstrap('auth state change ignored', {
          event,
          reason: 'token refresh does not require profile reload',
          hasSession: Boolean(nextSession),
          userId: nextSession?.user?.id ?? null,
        });
        setSession(nextSession);
        return;
      }

      if (event === 'INITIAL_SESSION' && !hasIgnoredInitialSession.current) {
        hasIgnoredInitialSession.current = true;
        logBootstrap('auth state change ignored', {
          event,
          reason: 'hydrate handles initial session',
          hasSession: Boolean(nextSession),
          userId: nextSession?.user?.id ?? null,
        });
        return;
      }

      logAuth('onAuthStateChange', {
        event,
        hasSession: Boolean(nextSession),
        userId: nextSession?.user?.id ?? null,
      });
      const authStateStartedAt = Date.now();
      logBootstrap('auth state change started', {
        event,
        hasSession: Boolean(nextSession),
        userId: nextSession?.user?.id ?? null,
      });
      setSession(nextSession);
      setIsLoading(true);
      void (async () => {
        const shouldSyncMembership =
          Boolean(nextSession?.user?.id) &&
          (event === 'SIGNED_IN' || event === 'USER_UPDATED');
        const isGuestConversion =
          Boolean(nextSession?.user?.id) &&
          (guestConversionPendingRef.current || (isGuestMode && Boolean(guestRevenueCatUserId)));
        const shouldCarryGuestMembership = isGuestConversion && guestConversionShouldCarryMembershipRef.current;

        if (shouldSyncMembership) {
          await syncRevenueCatUser(nextSession?.user?.id ?? null);
          let syncedMembership = null;
          let latestCustomerInfo: CustomerInfo | null = null;

          for (let attempt = 0; attempt < (shouldCarryGuestMembership ? 3 : 1); attempt += 1) {
            if (shouldCarryGuestMembership) {
              latestCustomerInfo = await syncRevenueCatPurchases();
            }

            await invalidateRevenueCatCustomerInfoCache();
            latestCustomerInfo = (await getRevenueCatCustomerInfo()) ?? latestCustomerInfo;
            setRevenueCatCustomerInfo(latestCustomerInfo);
            syncedMembership = await syncMembershipForAuthenticatedUser(`auth_state:${event.toLowerCase()}`);

            const hasLocalAccess = hasRevenueCatFullAccess(latestCustomerInfo);
            const hasBackendAccess = syncedMembership?.has_access === true;
            if (hasLocalAccess || hasBackendAccess) {
              break;
            }

            if (shouldCarryGuestMembership && attempt < 2) {
              await delay(1200);
            }
          }
        }

        if (isGuestConversion) {
          await finalizeGuestConversion();
        }

        await fetchProfile(nextSession?.user ?? null);
        if (isMounted) {
          setIsLoading(false);
          logBootstrap('auth state change completed', {
            event,
            stepElapsedMs: Date.now() - authStateStartedAt,
            hasSession: Boolean(nextSession),
            userId: nextSession?.user?.id ?? null,
          });
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
  }, [createSessionFromUrl, delay, fetchProfile, finalizeGuestConversion, guestRevenueCatUserId, isGuestMode, syncMembershipForAuthenticatedUser]);

  useEffect(() => {
    logBootstrap('revenuecat sync started', {
      userId: session?.user?.id ?? (isGuestMode ? guestRevenueCatUserId : null),
      isGuestMode,
    });
    void (async () => {
      try {
        if (isGuestMode && !session?.user?.id) {
          const nextGuestUserId = await ensureGuestRevenueCatUserId();
          await syncRevenueCatUser(nextGuestUserId);
        } else {
          await syncRevenueCatUser(session?.user?.id ?? null);
        }
        const customerInfo = await getRevenueCatCustomerInfo();
        setRevenueCatCustomerInfo(customerInfo);
      } catch (error) {
        logAuth('revenuecat:sync:error', error instanceof Error ? error.message : 'Unknown error');
        setRevenueCatCustomerInfo(null);
      }
    })();
  }, [ensureGuestRevenueCatUserId, guestRevenueCatUserId, isGuestMode, session?.user?.id]);

  useEffect(() => {
    const handleCustomerInfoUpdated = (nextCustomerInfo: CustomerInfo) => {
      setRevenueCatCustomerInfo(nextCustomerInfo);
    };

    addRevenueCatCustomerInfoUpdateListener(handleCustomerInfoUpdated);

    return () => {
      removeRevenueCatCustomerInfoUpdateListener(handleCustomerInfoUpdated);
    };
  }, []);

  const signIn = async ({ email, password }: { email: string; password: string }) => {
    guestConversionPendingRef.current = isGuestMode || Boolean(guestRevenueCatUserId);
    guestConversionShouldCarryMembershipRef.current =
      guestConversionPendingRef.current && hasRevenueCatFullAccess(revenueCatCustomerInfo);
    setIsGuestConversionPending(guestConversionPendingRef.current);
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
    guestConversionPendingRef.current = isGuestMode || Boolean(guestRevenueCatUserId);
    guestConversionShouldCarryMembershipRef.current =
      guestConversionPendingRef.current && hasRevenueCatFullAccess(revenueCatCustomerInfo);
    setIsGuestConversionPending(guestConversionPendingRef.current);
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

  const signInWithApple = async () => {
    try {
      guestConversionPendingRef.current = isGuestMode || Boolean(guestRevenueCatUserId);
      guestConversionShouldCarryMembershipRef.current =
        guestConversionPendingRef.current && hasRevenueCatFullAccess(revenueCatCustomerInfo);
      setIsGuestConversionPending(guestConversionPendingRef.current);
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        const message = 'Sign in with Apple is not available on this device.';
        setAuthError(message);
        return { error: message };
      }

      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      logAuth('apple:credential', {
        user: credential.user ?? null,
        email: credential.email ?? null,
        fullName: credential.fullName
          ? {
              givenName: credential.fullName.givenName ?? null,
              middleName: credential.fullName.middleName ?? null,
              familyName: credential.fullName.familyName ?? null,
              nickname: credential.fullName.nickname ?? null,
            }
          : null,
      });

      if (!credential.identityToken) {
        const message = 'Missing Apple identity token.';
        setAuthError(message);
        return { error: message };
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });

      if (error) {
        setAuthError(error.message);
        return { error: error.message };
      }

      const displayName = getAppleDisplayName(credential);
      if (displayName) {
        await persistAppleDisplayName(displayName);
      }

      setAuthError(null);
      return { error: null };
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ERR_REQUEST_CANCELED'
      ) {
        return { error: null };
      }

      const message = error instanceof Error ? error.message : 'Apple sign-in did not complete.';
      setAuthError(message);
      return { error: message };
    }
  };

  const signOut = async () => {
    guestConversionPendingRef.current = false;
    guestConversionShouldCarryMembershipRef.current = false;
    setIsGuestConversionPending(false);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthError(error.message);
      return { error: error.message };
    }

    setAuthError(null);
    setIsGuestMode(false);
    await persistGuestMode(false);
    await clearGuestRevenueCatUserId();
    setProfile(null);

    if (Platform.OS === 'ios') {
      try {
        if (GoogleSignin.hasPreviousSignIn()) {
          await GoogleSignin.signOut();
        }
      } catch (googleSignOutError) {
        logAuth(
          'google:signOut:error',
          googleSignOutError instanceof Error ? googleSignOutError.message : 'Unknown error'
        );
      }
    }

    return { error: null };
  };

  const signInWithGoogle = async () => {
    guestConversionPendingRef.current = isGuestMode || Boolean(guestRevenueCatUserId);
    guestConversionShouldCarryMembershipRef.current =
      guestConversionPendingRef.current && hasRevenueCatFullAccess(revenueCatCustomerInfo);
    setIsGuestConversionPending(guestConversionPendingRef.current);

    if (Platform.OS === 'ios') {
      if (!env.googleIosClientId || !env.googleWebClientId) {
        const message = 'Google sign-in is not configured for iOS.';
        setAuthError(message);
        return { error: message };
      }

      try {
        const response = await GoogleSignin.signIn();
        if (!isSuccessResponse(response)) {
          logAuth('google:native:cancelled');
          return { error: null };
        }

        const idToken = response.data.idToken;
        if (!idToken) {
          const message = 'Missing Google identity token.';
          logAuth('google:native:missingIdToken');
          setAuthError(message);
          return { error: message };
        }

        const tokenPayload = decodeJwtPayload(idToken);
        const nonceClaim =
          typeof tokenPayload?.nonce === 'string' && tokenPayload.nonce.trim().length > 0
            ? tokenPayload.nonce
            : undefined;
        const tokens = await GoogleSignin.getTokens().catch(() => null);

        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
          access_token: tokens?.accessToken,
          nonce: nonceClaim,
        });

        if (error) {
          logAuth('google:native:signInWithIdToken:error', error.message);
          setAuthError(error.message);
          return { error: error.message };
        }

        setAuthError(null);
        logAuth('google:native:success');
        return { error: null };
      } catch (error) {
        if (isErrorWithCode(error)) {
          if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
            const message = 'Google Play Services are not available on this device.';
            setAuthError(message);
            return { error: message };
          }

          if (error.code === statusCodes.SIGN_IN_CANCELLED) {
            logAuth('google:native:cancelled');
            return { error: null };
          }
        }

        const message = error instanceof Error ? error.message : 'Google sign-in did not complete.';
        logAuth('google:native:error', message);
        setAuthError(message);
        return { error: message };
      }
    }

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

  const continueAsGuest = async () => {
    setAuthError(null);
    guestConversionPendingRef.current = false;
    guestConversionShouldCarryMembershipRef.current = false;
    setIsGuestConversionPending(false);
    await ensureGuestRevenueCatUserId();
    setIsGuestMode(true);
    await persistGuestMode(true);
  };

  const exitGuestMode = async () => {
    guestConversionPendingRef.current = false;
    guestConversionShouldCarryMembershipRef.current = false;
    setIsGuestConversionPending(false);
    setIsGuestMode(false);
    await persistGuestMode(false);
    await clearGuestRevenueCatUserId();
  };

  const refreshProfile = async () => {
    await fetchProfile(session?.user ?? null, { background: true, waitForEnrichment: true });
  };

  const refreshMembershipAccess = async () => {
    await invalidateRevenueCatCustomerInfoCache();
    const customerInfo = await getRevenueCatCustomerInfo();
    setRevenueCatCustomerInfo(customerInfo);
    clearResolvedLessonCache();
    await fetchProfile(session?.user ?? null, { background: true, waitForEnrichment: true });
  };

  const user = session?.user ?? null;
  const hasAccount = user !== null;
  const hasMembership = profile?.is_paid === true || hasRevenueCatFullAccess(revenueCatCustomerInfo);
  const hasCompletedOnboarding = profile?.onboarding_completed === true;

  const value = {
    session,
    user,
    profile,
    isLoading,
    authError,
    hasAccount,
    isGuestMode,
    isGuestConversionPending,
    hasMembership,
    hasCompletedOnboarding,
    signIn,
    signUp,
    signInWithApple,
    signInWithGoogle,
    continueAsGuest,
    exitGuestMode,
    signOut,
    refreshProfile,
    refreshMembershipAccess,
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
