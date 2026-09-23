import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { prefetchPricing } from '@/src/api/pricing';
import { AppText } from '@/src/components/ui/AppText';
import { LanguageToggle } from '@/src/components/ui/LanguageToggle';
import { NeoShadowPressable } from '@/src/components/ui/NeoShadowPressable';
import { NeoShadowView } from '@/src/components/ui/NeoShadowView';
import { Stack } from '@/src/components/ui/Stack';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
import { FLOATING_TAB_BAR_PAGE_BOTTOM_PADDING } from '@/src/components/navigation/layout';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';

import fullLogo from '@/assets/images/full-logo.webp';

type MoreAction = {
  key: 'profile' | 'comments' | 'about' | 'contact' | 'settings';
  label: string;
  description: string;
  href:
    | '/(tabs)/account/profile'
    | '/(tabs)/account/comments'
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
  comments: {
    icon: 'chat-bubble-outline',
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
  const { uiLanguage } = useUiLanguage();
  const { hasAccount, hasMembership, isGuestMode } = useAppSession();
  const membershipSource = isGuestMode && !hasAccount ? 'guest' : 'free-account';

  const copy =
    uiLanguage === 'th'
      ? {
          membershipTitle: 'สมาชิก',
          membershipBody: 'ปลดล็อกบทเรียนทั้งหมดและคลังเนื้อหาทั้งหมดของเรา',
          actions: [
            { key: 'profile', label: 'โปรไฟล์ของฉัน', description: 'ดูบัญชี เปลี่ยนรหัสผ่าน และรูปโปรไฟล์', href: '/(tabs)/account/profile' },
            ...(hasAccount ? ([{ key: 'comments', label: 'ความคิดเห็นของฉัน', description: 'ดูความคิดเห็นที่คุณโพสต์', href: '/(tabs)/account/comments' }] as const) : []),
            { key: 'about', label: 'เกี่ยวกับเรา', description: 'รู้จัก Pailin Abroad ให้มากขึ้น', href: '/(tabs)/account/about' },
            { key: 'contact', label: 'ติดต่อเรา', description: 'พูดคุยกับทีมงานของเรา', href: '/(tabs)/account/contact' },
            ...(hasAccount ? ([{ key: 'settings', label: 'การตั้งค่า', description: 'สมาชิกและการชำระเงิน', href: '/(tabs)/account/settings' }] as const) : []),
          ] satisfies MoreAction[],
        }
      : {
          membershipTitle: 'Membership',
          membershipBody: 'Unlock all lessons and our full content library.',
          actions: [
            { key: 'profile', label: 'My Profile', description: 'View account, update password, change avatar', href: '/(tabs)/account/profile' },
            ...(hasAccount ? ([{ key: 'comments', label: 'My Comments', description: 'See your posted comments', href: '/(tabs)/account/comments' }] as const) : []),
            { key: 'about', label: 'About', description: 'Learn more about Pailin Abroad', href: '/(tabs)/account/about' },
            { key: 'contact', label: 'Contact', description: 'Get in touch with our team', href: '/(tabs)/account/contact' },
            ...(hasAccount ? ([{ key: 'settings', label: 'Settings', description: 'Membership and billing', href: '/(tabs)/account/settings' }] as const) : []),
          ] satisfies MoreAction[],
        };

  if (!hasAccount && !isGuestMode) {
    return null;
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
              <LanguageToggle pathway />
            </View>
          </View>

          <View style={styles.actionsWrap}>
            <Stack gap="lg">
              {!hasMembership ? (
                <NeoShadowPressable
                  accessibilityRole="button"
                  style={styles.membershipCard}
                  onPress={() => {
                    prefetchPricing();
                    router.push({
                      pathname: '/membership',
                      params: { source: membershipSource },
                    });
                  }}>
                  <View style={styles.actionLeading}>
                    <NeoShadowView style={[styles.iconBadge, styles.membershipIconBadge]}>
                      <MaterialIcons name="workspace-premium" size={24} color="#1A2332" />
                    </NeoShadowView>
                    <View style={styles.membershipCopy}>
                      <AppText language={uiLanguage} variant="body" style={styles.linkText}>{copy.membershipTitle}</AppText>
                      <AppText language={uiLanguage} variant="muted" style={styles.description}>{copy.membershipBody}</AppText>
                    </View>
                  </View>
                  <AppText language={uiLanguage} variant="body" style={styles.linkChevron}>›</AppText>
                </NeoShadowPressable>
              ) : null}
              {copy.actions.map((action) => {
                const iconConfig = actionIconMap[action.key];

                return (
                  <NeoShadowPressable key={action.key} accessibilityRole="button" style={styles.actionCard} onPress={() => router.push(action.href)}>
                    <View style={styles.actionLeading}>
                      <NeoShadowView style={[styles.iconBadge, { backgroundColor: iconConfig.bg }]}>
                        <MaterialIcons name={iconConfig.icon} size={22} color={iconConfig.tint} />
                      </NeoShadowView>
                      <View style={styles.actionCopy}>
                        <AppText language={uiLanguage} variant="body" style={styles.linkText}>{action.label}</AppText>
                        <AppText language={uiLanguage} variant="muted" style={styles.description}>{action.description}</AppText>
                      </View>
                    </View>
                    <AppText language={uiLanguage} variant="body" style={styles.linkChevron}>›</AppText>
                  </NeoShadowPressable>
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
    paddingBottom: FLOATING_TAB_BAR_PAGE_BOTTOM_PADDING,
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
  actionsWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  membershipCard: {
    minHeight: 108,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: theme.spacing.xs,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#FFF4D6',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    boxShadow: `5px 5px 0px ${theme.colors.shadow}`,
  },
  actionLeading: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
    minWidth: 0,
  },
  iconBadge: {
    width: 58,
    height: 58,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  membershipIconBadge: {
    backgroundColor: '#FFE6A8',
  },
  membershipCopy: {
    flex: 1,
    gap: theme.spacing.xs,
    minWidth: 0,
  },
  actionCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  description: {
    color: '#555B62',
    fontSize: 13,
    lineHeight: 20,
  },
  actionCard: {
    minHeight: 108,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: theme.spacing.xs,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    boxShadow: `5px 5px 0px ${theme.colors.shadow}`,
  },
  linkText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: theme.typography.weights.bold,
    textTransform: 'uppercase',
  },
  linkChevron: {
    fontSize: 28,
    lineHeight: 30,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.regular,
  },
});
