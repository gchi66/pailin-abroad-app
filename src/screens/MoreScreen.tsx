import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { prefetchPricing } from '@/src/api/pricing';
import { AuthScreen } from '@/src/screens/AuthScreen';
import { AppText } from '@/src/components/ui/AppText';
import { Stack } from '@/src/components/ui/Stack';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';

import fullLogo from '@/assets/images/full-logo.webp';

type MoreAction = {
  key: 'profile' | 'about' | 'contact' | 'settings';
  label: string;
  href:
    | '/(tabs)/account/profile'
    | '/(tabs)/account/about'
    | '/(tabs)/account/contact'
    | '/(tabs)/account/settings';
};

export function MoreScreen() {
  const router = useRouter();
  const { uiLanguage, setUiLanguage } = useUiLanguage();
  const { hasAccount, hasMembership } = useAppSession();
  const pathwayToggleLabel = uiLanguage === 'th' ? 'EN' : 'ไทย';

  const copy =
    uiLanguage === 'th'
      ? {
          membershipTitle: 'Membership',
          membershipBody: 'ปลดล็อกบทเรียนทั้งหมดและคลังเนื้อหาทั้งหมดของเรา',
          actions: [
            { key: 'profile', label: 'โปรไฟล์', href: '/(tabs)/account/profile' },
            { key: 'about', label: 'เกี่ยวกับเรา', href: '/(tabs)/account/about' },
            { key: 'contact', label: 'ติดต่อเรา', href: '/(tabs)/account/contact' },
            { key: 'settings', label: 'การตั้งค่า', href: '/(tabs)/account/settings' },
          ] satisfies MoreAction[],
        }
      : {
          membershipTitle: 'Membership',
          membershipBody: 'Unlock all lessons and our full content library.',
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={uiLanguage === 'th' ? 'Switch language to English' : 'เปลี่ยนภาษาเป็นไทย'}
            onPress={() => setUiLanguage(uiLanguage === 'th' ? 'en' : 'th')}
            style={styles.languagePill}>
            <AppText
              language={uiLanguage === 'th' ? 'en' : 'th'}
              variant="caption"
              style={styles.languagePillText}>
              {pathwayToggleLabel}
            </AppText>
          </Pressable>
        </View>

        <View style={styles.divider} />

        <View style={styles.actionsWrap}>
          <Stack gap="md">
            {!hasMembership ? (
              <Pressable
                accessibilityRole="button"
                style={styles.membershipCard}
                onPress={() => {
                  prefetchPricing();
                  router.push('/(tabs)/account/membership');
                }}>
                <View style={styles.membershipCopy}>
                  <AppText language={uiLanguage} variant="body" style={styles.membershipTitle}>
                    {copy.membershipTitle}
                  </AppText>
                  <AppText language={uiLanguage} variant="muted" style={styles.membershipBody}>
                    {copy.membershipBody}
                  </AppText>
                </View>
                <AppText language={uiLanguage} variant="body" style={styles.linkChevron}>
                  ›
                </AppText>
              </Pressable>
            ) : null}

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
  languagePill: {
    alignSelf: 'center',
    minWidth: 78,
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: '#91CAFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md + 2,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 1.5, height: 1.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  languagePillText: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 15,
    fontWeight: theme.typography.weights.bold,
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
    transform: [{ translateY: 1 }],
  },
  divider: {
    height: 2,
    backgroundColor: theme.colors.border,
  },
  actionsWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  membershipCard: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: '#FFF4D6',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 1.75, height: 1.75 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  membershipCopy: {
    flex: 1,
    gap: theme.spacing.xs,
    paddingRight: theme.spacing.md,
  },
  membershipTitle: {
    fontSize: theme.typography.sizes.lg,
    lineHeight: theme.typography.lineHeights.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  membershipBody: {
    color: theme.colors.mutedText,
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
