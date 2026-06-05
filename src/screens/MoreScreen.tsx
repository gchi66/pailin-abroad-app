import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { prefetchPricing } from '@/src/api/pricing';
import { AuthScreen } from '@/src/screens/AuthScreen';
import { AppText } from '@/src/components/ui/AppText';
import { Stack } from '@/src/components/ui/Stack';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
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

const actionIconMap: Record<MoreAction['key'], { icon: React.ComponentProps<typeof MaterialIcons>['name']; tint: string; bg: string }> = {
  profile: {
    icon: 'person',
    tint: '#1A2332',
    bg: '#DCEEFF',
  },
  settings: {
    icon: 'tune',
    tint: '#1A2332',
    bg: '#E8F3E0',
  },
  about: {
    icon: 'auto-awesome',
    tint: '#1A2332',
    bg: '#FFF1CC',
  },
  contact: {
    icon: 'mail',
    tint: '#1A2332',
    bg: '#FFE3DF',
  },
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
            { key: 'settings', label: 'การตั้งค่า', href: '/(tabs)/account/settings' },
            { key: 'about', label: 'เกี่ยวกับเรา', href: '/(tabs)/account/about' },
            { key: 'contact', label: 'ติดต่อเรา', href: '/(tabs)/account/contact' },
          ] satisfies MoreAction[],
        }
      : {
          membershipTitle: 'Membership',
          membershipBody: 'Unlock all lessons and our full content library.',
          actions: [
            { key: 'profile', label: 'Profile', href: '/(tabs)/account/profile' },
            { key: 'settings', label: 'Settings', href: '/(tabs)/account/settings' },
            { key: 'about', label: 'About', href: '/(tabs)/account/about' },
            { key: 'contact', label: 'Contact', href: '/(tabs)/account/contact' },
          ] satisfies MoreAction[],
        };

  if (!hasAccount) {
    return <AuthScreen />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <ResponsivePageShell style={styles.pageShell}>
      <Stack gap="md" style={styles.pageContent}>
        <View style={styles.headerBlock}>
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
        </View>

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
                <View style={styles.actionLeading}>
                  <View style={[styles.iconBadge, styles.membershipIconBadge]}>
                    <MaterialIcons name="workspace-premium" size={24} color="#1A2332" />
                  </View>
                  <View style={styles.membershipCopy}>
                    <AppText language={uiLanguage} variant="body" style={styles.membershipTitle}>
                      {copy.membershipTitle}
                    </AppText>
                    <AppText language={uiLanguage} variant="muted" style={styles.membershipBody}>
                      {copy.membershipBody}
                    </AppText>
                  </View>
                </View>
                <AppText language={uiLanguage} variant="body" style={styles.linkChevron}>
                  ›
                </AppText>
              </Pressable>
            ) : null}

            {copy.actions.map((action) => {
              const iconConfig = actionIconMap[action.key];

              return (
                <Pressable key={action.key} accessibilityRole="button" style={styles.actionCard} onPress={() => router.push(action.href)}>
                  <View style={styles.actionLeading}>
                    <View style={[styles.iconBadge, { backgroundColor: iconConfig.bg }]}>
                      <MaterialIcons name={iconConfig.icon} size={22} color={iconConfig.tint} />
                    </View>
                    <AppText language={uiLanguage} variant="body" style={styles.linkText}>
                      {action.label}
                    </AppText>
                  </View>
                <AppText language={uiLanguage} variant="body" style={styles.linkChevron}>
                  ›
                </AppText>
                </Pressable>
              );
            })}
          </Stack>
        </View>
      </Stack>
          </ResponsivePageShell>
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
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  pageContent: {
    flex: 1,
  },
  pageShell: {
    flex: 1,
  },
  headerBlock: {
    marginHorizontal: -theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    minHeight: 58,
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
  actionsWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  membershipCard: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: theme.spacing.xs,
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
  actionLeading: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minWidth: 0,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 1.5, height: 1.5 },
    shadowOpacity: 0.65,
    shadowRadius: 0,
    elevation: 1,
  },
  membershipIconBadge: {
    backgroundColor: '#FFE6A8',
  },
  membershipCopy: {
    flex: 1,
    gap: theme.spacing.xs,
    minWidth: 0,
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
    marginHorizontal: theme.spacing.xs,
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
    flex: 1,
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
