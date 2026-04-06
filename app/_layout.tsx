import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useGlobalSearchParams, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppSessionProvider, useAppSession } from '@/src/context/app-session-context';
import { OnboardingProvider } from '@/src/context/onboarding-context';
import { UiLanguageProvider } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AppRouteGate() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ devtools?: string }>();
  const { hasAccount, hasCompletedOnboarding, isLoading } = useAppSession();

  const isOnOnboardingRoute = pathname === '/onboarding' || pathname.startsWith('/onboarding/');
  const isOnboardingDevtoolsMode = isOnOnboardingRoute && params.devtools === '1';
  const shouldRedirectToOnboarding = !isLoading && hasAccount && !hasCompletedOnboarding && !isOnOnboardingRoute;
  const shouldRedirectToApp = !isLoading && hasAccount && hasCompletedOnboarding && isOnOnboardingRoute && !isOnboardingDevtoolsMode;

  useEffect(() => {
    if (isLoading || !hasAccount) {
      return;
    }

    if (shouldRedirectToOnboarding) {
      router.replace('/onboarding');
      return;
    }

    if (shouldRedirectToApp) {
      router.replace('/(tabs)');
    }
  }, [hasAccount, isLoading, router, shouldRedirectToApp, shouldRedirectToOnboarding]);

  if (shouldRedirectToOnboarding || shouldRedirectToApp) {
    return (
      <View pointerEvents="none" style={styles.routeGateOverlay}>
        <ActivityIndicator color={theme.colors.text} />
      </View>
    );
  }

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={styles.root}>
      <AppSessionProvider>
        <OnboardingProvider>
          <UiLanguageProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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
});
