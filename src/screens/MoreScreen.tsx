import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { moreCardImages } from '@/src/assets/more-card-images';
import { prefetchPricing } from '@/src/api/pricing';
import { NavigationCard } from '@/src/components/ui/NavigationCard';
import { NeoShadowView } from '@/src/components/ui/NeoShadowView';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
import { FLOATING_TAB_BAR_PAGE_BOTTOM_PADDING } from '@/src/components/navigation/layout';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { resolveAvatarSource } from '@/src/lib/avatar';
import { theme } from '@/src/theme/theme';

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

export function MoreScreen() {
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();
  const { hasAccount, hasMembership, isGuestMode, profile, user } = useAppSession();
  const membershipSource = isGuestMode && !hasAccount ? 'guest' : 'free-account';
  const metadataAvatar = typeof user?.user_metadata?.avatar_image === 'string' ? user.user_metadata.avatar_image : null;
  const avatarSource = resolveAvatarSource(profile?.avatar_image || metadataAvatar);

  const copy =
    uiLanguage === 'th'
      ? {
          title: 'เพิ่มเติม',
          subtitle: 'จัดการบัญชี การตั้งค่า และข้อมูลเพิ่มเติม',
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
          title: 'More',
          subtitle: 'Manage your account, preferences, and more',
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
      <ResponsivePageShell>
        <View style={styles.page}>
          <PageHeader language={uiLanguage} variant="root" title={copy.title} subtitle={copy.subtitle} />

          <View style={styles.cards}>
            {!hasMembership ? (
              <NavigationCard
                language={uiLanguage}
                title={copy.membershipTitle}
                description={copy.membershipBody}
                leadingElement={(
                  <NeoShadowView style={[styles.iconBadge, styles.membershipIconBadge]}>
                    <MaterialIcons name="workspace-premium" size={24} color="#1A2332" />
                  </NeoShadowView>
                )}
                onPress={() => {
                  prefetchPricing();
                  router.push({
                    pathname: '/membership',
                    params: { source: membershipSource },
                  });
                }}
              />
            ) : null}
            {copy.actions.map((action) => {
              const actionImage = action.key === 'profile' ? avatarSource : moreCardImages[action.key];

              return (
                <NavigationCard
                  key={action.key}
                  language={uiLanguage}
                  title={action.label}
                  description={action.description}
                  imageSource={actionImage}
                  imageResizeMode={action.key === 'profile' ? 'cover' : 'contain'}
                  imageStyle={action.key === 'profile' ? styles.profileImage : undefined}
                  leadingElement={action.key === 'profile' && !avatarSource ? (
                    <NeoShadowView style={[styles.iconBadge, styles.profileIconBadge]}>
                      <MaterialIcons name="person" size={22} color="#1A2332" />
                    </NeoShadowView>
                  ) : undefined}
                  onPress={() => router.push(action.href)}
                />
              );
            })}
          </View>
        </View>
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
    paddingBottom: FLOATING_TAB_BAR_PAGE_BOTTOM_PADDING,
  },
  page: {
    paddingHorizontal: 32,
    paddingTop: 16,
  },
  cards: {
    marginTop: 18,
    gap: 15,
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
  profileIconBadge: {
    backgroundColor: '#DCEEFF',
  },
  profileImage: {
    width: 64,
    height: 64,
    marginLeft: 8,
    marginRight: 24,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
