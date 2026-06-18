import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Stack, useGlobalSearchParams, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { AppSessionProvider, useAppSession } from '@/src/context/app-session-context';
import { OnboardingProvider } from '@/src/context/onboarding-context';
import { UiLanguageProvider } from '@/src/context/ui-language-context';
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
  const params = useGlobalSearchParams<{ devtools?: string }>();
  const { hasAccount, hasCompletedOnboarding, isGuestMode, isLoading } = useAppSession();

  const isOnOnboardingRoute = pathname === '/onboarding' || pathname.startsWith('/onboarding/');
  const isOnAuthRoute = pathname === '/account/auth';
  const isOnProtectedAccountRoute = pathname === '/account' || (pathname.startsWith('/account/') && pathname !== '/account/auth');
  const isOnboardingDevtoolsMode = isOnOnboardingRoute && params.devtools === '1';
  const shouldRedirectToOnboarding = !isLoading && hasAccount && !hasCompletedOnboarding && !isOnOnboardingRoute;
  const shouldRedirectToApp = !isLoading && hasAccount && hasCompletedOnboarding && isOnOnboardingRoute && !isOnboardingDevtoolsMode;
  const shouldRedirectAuthenticatedAuthRoute = !isLoading && hasAccount && isOnAuthRoute;
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
  }, [hasAccount, hasCompletedOnboarding, isGuestMode, isLoading, pathname]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (shouldRedirectSignedOutUser) {
      router.replace('/(tabs)');
      return;
    }

    if (shouldRedirectAuthenticatedAuthRoute) {
      router.replace(hasCompletedOnboarding ? '/(tabs)' : '/onboarding');
      return;
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
    router,
    shouldRedirectAuthenticatedAuthRoute,
    shouldRedirectSignedOutUser,
    shouldRedirectToApp,
    shouldRedirectToOnboarding,
  ]);

  if (shouldRedirectSignedOutUser || shouldRedirectAuthenticatedAuthRoute || shouldRedirectToOnboarding || shouldRedirectToApp) {
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

  useEffect(() => {
    if (fontsLoaded && !isLoading) {
      logBootstrap('splash hidden');
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoading]);

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
    Anuphan: require('@/assets/fonts/Anuphan-Regular.ttf'),
    'Anuphan-Medium': require('@/assets/fonts/Anuphan-Medium.ttf'),
    'Anuphan-SemiBold': require('@/assets/fonts/Anuphan-SemiBold.ttf'),
    'Anuphan-Bold': require('@/assets/fonts/Anuphan-Bold.ttf'),
    'Kanit-LightItalic': require('@/assets/fonts/Kanit-LightItalic.ttf'),
    'Kanit-Italic': require('@/assets/fonts/Kanit-Italic.ttf'),
    'Kanit-MediumItalic': require('@/assets/fonts/Kanit-MediumItalic.ttf'),
    'Kanit-SemiBoldItalic': require('@/assets/fonts/Kanit-SemiBoldItalic.ttf'),
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
      <AppSessionProvider>
        <OnboardingProvider>
          <UiLanguageProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <SplashVisibilityGate fontsLoaded={fontsLoaded} />
              <AppRouteGate />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="onboarding/index" />
                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
              </Stack>
              <StatusBar style="dark" />
            </ThemeProvider>
          </UiLanguageProvider>
        </OnboardingProvider>
      </AppSessionProvider>
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
