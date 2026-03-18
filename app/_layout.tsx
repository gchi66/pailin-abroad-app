import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppSessionProvider } from '@/src/context/app-session-context';
import { UiLanguageProvider } from '@/src/context/ui-language-context';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AppSessionProvider>
      <UiLanguageProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="lessons/try" options={{ title: 'Try Lessons' }} />
            <Stack.Screen name="account/membership" options={{ title: 'Membership' }} />
            <Stack.Screen name="account/profile" options={{ title: 'Profile' }} />
            <Stack.Screen name="account/about" options={{ title: 'About' }} />
            <Stack.Screen name="account/contact" options={{ title: 'Contact' }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </UiLanguageProvider>
    </AppSessionProvider>
  );
}
