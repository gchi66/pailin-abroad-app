import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthScreen } from '@/src/screens/AuthScreen';
import { AppText } from '@/src/components/ui/AppText';
import { LanguageToggle } from '@/src/components/ui/LanguageToggle';
import { Stack } from '@/src/components/ui/Stack';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';

import fullLogo from '@/assets/images/full-logo.webp';

type MoreAction = {
  key: 'profile' | 'about' | 'contact' | 'settings';
  label: string;
  href: '/(tabs)/account/profile' | '/(tabs)/account/about' | '/(tabs)/account/contact' | '/(tabs)/account/settings';
};

export function MoreScreen() {
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();
  const { hasAccount } = useAppSession();

  const copy =
    uiLanguage === 'th'
      ? {
          actions: [
            { key: 'profile', label: 'โปรไฟล์', href: '/(tabs)/account/profile' },
            { key: 'about', label: 'เกี่ยวกับเรา', href: '/(tabs)/account/about' },
            { key: 'contact', label: 'ติดต่อเรา', href: '/(tabs)/account/contact' },
            { key: 'settings', label: 'การตั้งค่า', href: '/(tabs)/account/settings' },
          ] satisfies MoreAction[],
        }
      : {
          actions: [
            { key: 'profile', label: 'Profile', href: '/(tabs)/account/profile' },
            { key: 'about', label: 'About', href: '/(tabs)/account/about' },
            { key: 'contact', label: 'Contact', href: '/(tabs)/account/contact' },
            { key: 'settings', label: 'Settings', href: '/(tabs)/account/settings' },
          ] satisfies MoreAction[],
        };

  if (!hasAccount) {
    return <AuthScreen />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <Stack gap="md" style={styles.pageContent}>
        <View style={styles.headerRow}>
          <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)')} style={styles.logoButton}>
            <Image source={fullLogo} style={styles.logo} resizeMode="contain" accessibilityLabel="Pailin Abroad" />
          </Pressable>
          <LanguageToggle style={styles.languageToggle} />
        </View>

        <View style={styles.divider} />

        <View style={styles.actionsWrap}>
          <Stack gap="md">
            {copy.actions.map((action) => (
              <Pressable key={action.key} accessibilityRole="button" style={styles.actionCard} onPress={() => router.push(action.href)}>
                <AppText language={uiLanguage} variant="body" style={styles.linkText}>
                  {action.label}
                </AppText>
                <AppText language={uiLanguage} variant="body" style={styles.linkChevron}>
                  ›
                </AppText>
              </Pressable>
            ))}
          </Stack>
        </View>
      </Stack>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: theme.spacing.xl,
  },
  pageContent: {
    flex: 1,
  },
  headerRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: 10,
    paddingBottom: 4,
  },
  logo: {
    width: 180,
    height: 28,
  },
  logoButton: {
    alignSelf: 'center',
  },
  languageToggle: {
    alignSelf: 'center',
  },
  divider: {
    height: 2,
    backgroundColor: theme.colors.border,
  },
  actionsWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  actionCard: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.radii.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 1.75, height: 1.75 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  linkText: {
    fontSize: theme.typography.sizes.lg,
    lineHeight: theme.typography.lineHeights.lg,
    fontWeight: theme.typography.weights.bold,
  },
  linkChevron: {
    fontSize: 28,
    lineHeight: 30,
    color: theme.colors.mutedText,
    fontWeight: theme.typography.weights.bold,
  },
});
