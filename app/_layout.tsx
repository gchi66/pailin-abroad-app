import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

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
  const { hasAccount, hasCompletedOnboarding, isLoading } = useAppSession();

  const isOnOnboardingRoute = pathname === '/onboarding' || pathname.startsWith('/onboarding/');
  const shouldRedirectToOnboarding = !isLoading && hasAccount && !hasCompletedOnboarding && !isOnOnboardingRoute;
  const shouldRedirectToApp = !isLoading && hasAccount && hasCompletedOnboarding && isOnOnboardingRoute;

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
    <AppSessionProvider>
      <OnboardingProvider>
        <UiLanguageProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <AppRouteGate />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="onboarding/index" />
              <Stack.Screen name="lessons/try" />
              <Stack.Screen name="lessons/library" />
              <Stack.Screen name="account/membership" />
              <Stack.Screen name="account/profile" />
              <Stack.Screen name="account/about" />
              <Stack.Screen name="account/contact" />
              <Stack.Screen name="resources/exercise-bank/index" />
              <Stack.Screen name="resources/exercise-bank/[categorySlug]/[sectionSlug]" />
              <Stack.Screen name="resources/topic-library" />
              <Stack.Screen name="resources/topic-library/[slug]" />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </UiLanguageProvider>
      </OnboardingProvider>
    </AppSessionProvider>
  );
}

const styles = StyleSheet.create({
  routeGateOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
});
