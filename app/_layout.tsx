import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useGlobalSearchParams, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PostHogProvider } from 'posthog-react-native';

import { posthog } from '@/src/config/posthog';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { DailyReminderManager } from '@/src/components/DailyReminderManager';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { AppSessionProvider, useAppSession } from '@/src/context/app-session-context';
import { OnboardingProvider } from '@/src/context/onboarding-context';
import { OpeningScreenProvider, useOpeningScreen } from '@/src/context/opening-screen-context';
import { UiLanguageProvider } from '@/src/context/ui-language-context';
import { takePendingLessonReturn } from '@/src/lib/pending-lesson-return';
import { theme } from '@/src/theme/theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

const APP_BOOTSTRAP_LABEL = '[app-bootstrap]';
const APP_BOOTSTRAP_STARTED_AT = Date.now();

const setBootstrapStart = () => {
  (globalThis as typeof globalThis & { __pailinAppBootstrapStartedAt?: number }).__pailinAppBootstrapStartedAt =
    APP_BOOTSTRAP_STARTED_AT;
};

const getBootstrapElapsedMs = () => Date.now() - APP_BOOTSTRAP_STARTED_AT;

const logBootstrap = (message: string, metadata?: Record<string, unknown>) => {
  console.info(APP_BOOTSTRAP_LABEL, message, {
    elapsedMs: getBootstrapElapsedMs(),
    ...(metadata ?? {}),
  });
};

setBootstrapStart();
void SplashScreen.preventAutoHideAsync();

function AppRouteGate() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ devtools?: string; preview?: string }>();
  const { authError, hasAccount, hasCompletedOnboarding, isGuestMode, isLoading, profile } = useAppSession();
  const { hasSeenOpeningScreen, isOpeningScreenStateReady } = useOpeningScreen();
  const previousPathname = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      posthog.screen(pathname, {
        previous_screen: previousPathname.current ?? null,
      });
      previousPathname.current = pathname;
    }
  }, [pathname]);

  const isOnOnboardingRoute = pathname === '/onboarding' || pathname.startsWith('/onboarding/');
  const isOnOpeningRoute = pathname === '/opening';
  const isOnMembershipRoute = pathname === '/membership';
  const isOnAuthRoute = pathname === '/account/auth';
  const isOnAuthCallbackRoute = pathname === '/auth/callback';
  const isOnEmailConfirmationRoute = pathname === '/email-confirmation';
  const isOnProtectedAccountRoute = pathname === '/account' || (pathname.startsWith('/account/') && pathname !== '/account/auth');
  const isOnboardingDevtoolsMode =
    isOnOnboardingRoute && params.devtools === '1' && profile?.is_admin === true;
  const shouldRedirectToOpening =
    !isLoading && isOpeningScreenStateReady && !hasSeenOpeningScreen && !isOnOpeningRoute;
  const shouldRedirectAwayFromOpening =
    !isLoading &&
    isOpeningScreenStateReady &&
    hasSeenOpeningScreen &&
    isOnOpeningRoute &&
    params.preview !== '1';
  const shouldRedirectToOnboarding =
    !isLoading &&
    isOpeningScreenStateReady &&
    hasSeenOpeningScreen &&
    hasAccount &&
    !hasCompletedOnboarding &&
    !isOnOpeningRoute &&
    !isOnOnboardingRoute &&
    !isOnMembershipRoute &&
    !(isOnAuthCallbackRoute && authError);
  const shouldRedirectToApp = !isLoading && hasAccount && hasCompletedOnboarding && isOnOnboardingRoute && !isOnboardingDevtoolsMode;
  const shouldResolveAuthenticatedEntryRoute =
    !isLoading &&
    hasAccount &&
    hasCompletedOnboarding &&
    (isOnAuthRoute || isOnAuthCallbackRoute || isOnEmailConfirmationRoute);
  const shouldRedirectSignedOutUser =
    !isLoading && !hasAccount && !isGuestMode && (isOnProtectedAccountRoute || isOnOnboardingRoute);

  useEffect(() => {
    logBootstrap('route gate ready', {
      hasAccount,
      isGuestMode,
      hasCompletedOnboarding,
      isLoading,
      pathname,
    });
  }, [authError, hasAccount, hasCompletedOnboarding, isGuestMode, isLoading, pathname]);

  useEffect(() => {
    if (isLoading || !isOpeningScreenStateReady) {
      return;
    }

    if (shouldRedirectToOpening) {
      router.replace('/opening');
      return;
    }

    if (shouldRedirectAwayFromOpening) {
      router.replace('/(tabs)');
      return;
    }

    if (shouldRedirectSignedOutUser) {
      router.replace('/(tabs)');
      return;
    }

    if (shouldResolveAuthenticatedEntryRoute) {
      let isActive = true;
      void takePendingLessonReturn()
        .then((destination) => {
          if (!isActive) return;
          if (destination) {
            router.replace({
              pathname: '/lessons/[id]',
              params: {
                id: destination.lessonId,
                overview: '1',
                ...(destination.libraryRoute ? { libraryRoute: destination.libraryRoute } : {}),
              },
            });
            return;
          }
          router.replace('/(tabs)');
        })
        .catch(() => {
          if (isActive) router.replace('/(tabs)');
        });
      return () => {
        isActive = false;
      };
    }

    if (shouldRedirectToOnboarding) {
      router.replace('/onboarding');
      return;
    }

    if (shouldRedirectToApp) {
      router.replace('/(tabs)');
    }
  }, [
    hasAccount,
    hasCompletedOnboarding,
    isGuestMode,
    isLoading,
    isOpeningScreenStateReady,
    router,
    shouldResolveAuthenticatedEntryRoute,
    shouldRedirectAwayFromOpening,
    shouldRedirectSignedOutUser,
    shouldRedirectToOpening,
    shouldRedirectToApp,
    shouldRedirectToOnboarding,
  ]);

  if (!isOpeningScreenStateReady || shouldRedirectToOpening || shouldRedirectAwayFromOpening || shouldRedirectSignedOutUser || shouldResolveAuthenticatedEntryRoute || shouldRedirectToOnboarding || shouldRedirectToApp) {
    return (
      <View pointerEvents="none" style={styles.routeGateOverlay}>
        <PageLoadingState />
      </View>
    );
  }

  return null;
}

function SplashVisibilityGate({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { isLoading } = useAppSession();
  const { isOpeningScreenStateReady } = useOpeningScreen();

  useEffect(() => {
    if (fontsLoaded && !isLoading && isOpeningScreenStateReady) {
      logBootstrap('splash hidden');
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoading, isOpeningScreenStateReady]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    Poppins: require('@/assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Italic': require('@/assets/fonts/Poppins-Italic.ttf'),
    'Poppins-Medium': require('@/assets/fonts/Poppins-Medium.ttf'),
    'Poppins-MediumItalic': require('@/assets/fonts/Poppins-MediumItalic.ttf'),
    'Poppins-SemiBold': require('@/assets/fonts/Poppins-SemiBold.ttf'),
    'Poppins-SemiBoldItalic': require('@/assets/fonts/Poppins-SemiBoldItalic.ttf'),
    'Poppins-Bold': require('@/assets/fonts/Poppins-Bold.ttf'),
    'Poppins-BoldItalic': require('@/assets/fonts/Poppins-BoldItalic.ttf'),
    'Poppins-ExtraBold': require('@/assets/fonts/Poppins-ExtraBold.ttf'),
    'Poppins-Black': require('@/assets/fonts/Poppins-Black.ttf'),
    Anuphan: require('@/assets/fonts/Anuphan-Regular.ttf'),
    'Anuphan-Medium': require('@/assets/fonts/Anuphan-Medium.ttf'),
    'Anuphan-SemiBold': require('@/assets/fonts/Anuphan-SemiBold.ttf'),
    'Anuphan-Bold': require('@/assets/fonts/Anuphan-Bold.ttf'),
    'Kanit-LightItalic': require('@/assets/fonts/Kanit-LightItalic.ttf'),
    'Kanit-MediumItalic': require('@/assets/fonts/Kanit-MediumItalic.ttf'),
    'Kanit-SemiBoldItalic': require('@/assets/fonts/Kanit-SemiBoldItalic.ttf'),
    'Kanit-BoldItalic': require('@/assets/fonts/Kanit-BoldItalic.ttf'),
  });

  useEffect(() => {
    logBootstrap('root layout mounted');
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      logBootstrap('fonts loaded');
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.fontsLoadingScreen}>
          <PageLoadingState />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <PostHogProvider
        client={posthog}
        autocapture={{
          captureScreens: false,
          captureTouches: true,
          propsToCapture: ['testID'],
        }}
      >
      <OpeningScreenProvider>
        <AppSessionProvider>
          <OnboardingProvider>
            <UiLanguageProvider>
            <DailyReminderManager />
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <SplashVisibilityGate fontsLoaded={fontsLoaded} />
              <AppRouteGate />
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'none',
                  presentation: 'card',
                }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="lesson-preview/[id]"
                  options={{
                    presentation: 'transparentModal',
                    animation: 'none',
                    contentStyle: { backgroundColor: 'transparent' },
                    gestureEnabled: false,
                  }}
                />
                <Stack.Screen name="onboarding/index" />
                <Stack.Screen
                  name="modal"
                  options={{
                    animation: 'none',
                    presentation: 'card',
                    title: 'Modal',
                  }}
                />
              </Stack>
              <StatusBar style="dark" />
            </ThemeProvider>
            </UiLanguageProvider>
          </OnboardingProvider>
        </AppSessionProvider>
      </OpeningScreenProvider>
      </PostHogProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  routeGateOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  fontsLoadingScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
