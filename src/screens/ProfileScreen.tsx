import React from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Stack } from '@/src/components/ui/Stack';
import { useAppSession } from '@/src/context/app-session-context';
import { useOnboarding } from '@/src/context/onboarding-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { resolveAvatarSource } from '@/src/lib/avatar';
import { theme } from '@/src/theme/theme';

type UiLanguage = 'en' | 'th';

type ProfileDisplayData = {
  displayName: string;
  email: string;
  membershipLabel: string;
  joinedLabel: string;
};

const formatJoinedLabel = (value: string | null, uiLanguage: UiLanguage) => {
  if (!value) {
    return uiLanguage === 'th' ? 'เพิ่งเชื่อมต่อบัญชีในแอป' : 'Recently connected in the app';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(uiLanguage === 'th' ? 'th-TH' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getProfileDisplayData = (uiLanguage: UiLanguage, params: { displayName: string; email: string; hasMembership: boolean; createdAt: string | null }): ProfileDisplayData => {
  if (uiLanguage === 'th') {
    return {
      displayName: params.displayName,
      email: params.email,
      membershipLabel: params.hasMembership ? 'สมาชิกแบบชำระเงิน' : 'แพ็กเกจฟรี',
      joinedLabel: formatJoinedLabel(params.createdAt, uiLanguage),
    };
  }

  return {
    displayName: params.displayName,
    email: params.email,
    membershipLabel: params.hasMembership ? 'Paid member' : 'Free plan',
    joinedLabel: formatJoinedLabel(params.createdAt, uiLanguage),
  };
};

const getCopy = (uiLanguage: UiLanguage) => {
  if (uiLanguage === 'th') {
    return {
      title: 'โปรไฟล์',
      subtitle: 'นี่คือภาพรวมบัญชีจริงจาก session ปัจจุบันและข้อมูลโปรไฟล์จาก backend',
      guestTitle: 'ยังไม่ได้เข้าสู่ระบบ',
      guestBody: 'กลับไปที่หน้า Account เพื่อเข้าสู่ระบบหรือสมัครสมาชิกก่อน',
      profileCardTitle: 'ข้อมูลสมาชิก',
      membershipLabel: 'สถานะสมาชิก',
      languageLabel: 'ภาษาหน้าแอป',
      joinedLabel: 'เข้าร่วมเมื่อ',
      editProfile: 'แก้ไขโปรไฟล์',
      membership: 'Membership',
      signOut: 'ออกจากระบบ',
      actionPlaceholder: 'จะเชื่อม action นี้ในขั้นตอนถัดไป',
      languageValue: 'ไทย',
      signOutSuccess: 'ออกจากระบบแล้ว',
      avatarLabel: 'PP',
      devToolsTitle: 'Dev Tools',
      onboardingStatusLabel: 'สถานะ Onboarding',
      onboardingSeen: 'เสร็จแล้ว',
      onboardingNotSeen: 'ยังไม่เสร็จ',
      openOnboarding: 'เปิด Onboarding',
      resetOnboarding: 'รีเซ็ต Onboarding',
      completeOnboarding: 'ตั้งค่าเป็น Complete',
      onboardingResetSuccess: 'รีเซ็ต onboarding แล้ว',
      onboardingCompleteSuccess: 'ตั้งค่า onboarding เป็น complete แล้ว',
    };
  }

  return {
    title: 'Profile',
    subtitle: 'This screen now reads from the current auth session and backend profile data.',
    guestTitle: 'You are not signed in',
    guestBody: 'Go back to Account to sign in or create an account first.',
    profileCardTitle: 'Member Snapshot',
    membershipLabel: 'Membership',
    languageLabel: 'App Language',
    joinedLabel: 'Joined',
    editProfile: 'Edit Profile',
    membership: 'Membership',
    signOut: 'Sign Out',
    actionPlaceholder: 'This action will be connected in a later step.',
    languageValue: 'English',
    signOutSuccess: 'Signed out successfully.',
    avatarLabel: 'PP',
    devToolsTitle: 'Dev Tools',
    onboardingStatusLabel: 'Onboarding Status',
    onboardingSeen: 'Completed',
    onboardingNotSeen: 'Not completed',
    openOnboarding: 'Open Onboarding',
    resetOnboarding: 'Reset Onboarding',
    completeOnboarding: 'Mark Complete',
    onboardingResetSuccess: 'Onboarding state reset.',
    onboardingCompleteSuccess: 'Onboarding marked complete.',
  };
};

export function ProfileScreen() {
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();
  const { hasAccount, hasMembership, profile, signOut, user } = useAppSession();
  const { hasSeenOnboarding, markOnboardingComplete, resetOnboarding } = useOnboarding();
  const copy = getCopy(uiLanguage);
  const displayName =
    profile?.name?.trim() ||
    profile?.username?.trim() ||
    (typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name.trim() : '') ||
    (typeof user?.user_metadata?.username === 'string' ? user.user_metadata.username.trim() : '') ||
    user?.email ||
    'Pailin Abroad';
  const email = profile?.email?.trim() || user?.email || '—';
  const metadataAvatar = typeof user?.user_metadata?.avatar_image === 'string' ? user.user_metadata.avatar_image : null;
  const avatarSource = resolveAvatarSource(profile?.avatar_image || metadataAvatar);
  const profileData = getProfileDisplayData(uiLanguage, {
    displayName,
    email,
    hasMembership,
    createdAt: profile?.created_at ?? null,
  });
  const avatarLabel = displayName.slice(0, 2).toUpperCase();

  if (!hasAccount) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
        <Card padding="lg" radius="lg">
          <Stack gap="sm">
            <AppText language={uiLanguage} variant="title" style={styles.title}>
              {copy.guestTitle}
            </AppText>
            <AppText language={uiLanguage} variant="body" style={styles.subtitle}>
              {copy.guestBody}
            </AppText>
          </Stack>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <Stack gap="md">
        <View style={styles.headerBlock}>
          <Stack gap="sm">
            <AppText language={uiLanguage} variant="title" style={styles.title}>
              {copy.title}
            </AppText>
            <AppText language={uiLanguage} variant="body" style={styles.subtitle}>
              {copy.subtitle}
            </AppText>
          </Stack>
        </View>

        <Card padding="lg" radius="lg">
          <Stack gap="md">
            <View style={styles.profileHeaderRow}>
              <View style={styles.avatar}>
                {avatarSource ? (
                  <Image source={avatarSource} style={styles.avatarImage} resizeMode="cover" />
                ) : (
                  <AppText language={uiLanguage} variant="caption" style={styles.avatarText}>
                    {avatarLabel || copy.avatarLabel}
                  </AppText>
                )}
              </View>
              <View style={styles.profileIdentity}>
                <AppText language={uiLanguage} variant="body" style={styles.profileName}>
                  {profileData.displayName}
                </AppText>
                <AppText language={uiLanguage} variant="muted">
                  {profileData.email}
                </AppText>
              </View>
            </View>

            <Stack gap="sm">
              <AppText language={uiLanguage} variant="body" style={styles.sectionTitle}>
                {copy.profileCardTitle}
              </AppText>
              <View style={styles.metaRow}>
                <AppText language={uiLanguage} variant="muted" style={styles.metaLabel}>
                  {copy.membershipLabel}
                </AppText>
                <AppText language={uiLanguage} variant="body" style={styles.metaValue}>
                  {profileData.membershipLabel}
                </AppText>
              </View>
              <View style={styles.metaRow}>
                <AppText language={uiLanguage} variant="muted" style={styles.metaLabel}>
                  {copy.languageLabel}
                </AppText>
                <AppText language={uiLanguage} variant="body" style={styles.metaValue}>
                  {copy.languageValue}
                </AppText>
              </View>
              <View style={styles.metaRow}>
                <AppText language={uiLanguage} variant="muted" style={styles.metaLabel}>
                  {copy.joinedLabel}
                </AppText>
                <AppText language={uiLanguage} variant="body" style={styles.metaValue}>
                  {profileData.joinedLabel}
                </AppText>
              </View>
            </Stack>
          </Stack>
        </Card>

        <Card padding="lg" radius="lg">
          <Stack gap="sm">
            <Pressable
              accessibilityRole="button"
              style={styles.linkRow}
              onPress={() => Alert.alert(copy.editProfile, copy.actionPlaceholder)}>
              <AppText language={uiLanguage} variant="body" style={styles.linkText}>
                {copy.editProfile}
              </AppText>
              <AppText language={uiLanguage} variant="body" style={styles.linkChevron}>
                ›
              </AppText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              style={styles.linkRow}
              onPress={() => router.push('/(tabs)/account/membership')}>
              <AppText language={uiLanguage} variant="body" style={styles.linkText}>
                {copy.membership}
              </AppText>
              <AppText language={uiLanguage} variant="body" style={styles.linkChevron}>
                ›
              </AppText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              style={styles.linkRow}
              onPress={() => {
                void signOut().then(({ error }) => {
                  if (error) {
                    Alert.alert(copy.signOut, error);
                    return;
                  }
                  Alert.alert(copy.signOut, copy.signOutSuccess);
                  router.replace('/(tabs)/account');
                });
              }}>
              <AppText language={uiLanguage} variant="body" style={styles.signOutText}>
                {copy.signOut}
              </AppText>
              <AppText language={uiLanguage} variant="body" style={styles.linkChevron}>
                ›
              </AppText>
            </Pressable>
          </Stack>
        </Card>

        {__DEV__ ? (
          <Card padding="lg" radius="lg">
            <Stack gap="md">
              <Stack gap="xs">
                <AppText language={uiLanguage} variant="body" style={styles.sectionTitle}>
                  {copy.devToolsTitle}
                </AppText>
                <View style={styles.metaRow}>
                  <AppText language={uiLanguage} variant="muted" style={styles.metaLabel}>
                    {copy.onboardingStatusLabel}
                  </AppText>
                  <AppText language={uiLanguage} variant="body" style={styles.devStatusValue}>
                    {hasSeenOnboarding ? copy.onboardingSeen : copy.onboardingNotSeen}
                  </AppText>
                </View>
              </Stack>

              <Stack gap="sm">
                <Button title={copy.openOnboarding} language={uiLanguage} onPress={() => router.push('/onboarding')} />
                <Button
                  title={copy.resetOnboarding}
                  language={uiLanguage}
                  variant="outline"
                  onPress={() => {
                    void resetOnboarding().then(() => {
                      Alert.alert(copy.devToolsTitle, copy.onboardingResetSuccess);
                    });
                  }}
                />
                <Button
                  title={copy.completeOnboarding}
                  language={uiLanguage}
                  variant="outline"
                  onPress={() => {
                    void markOnboardingComplete().then(() => {
                      Alert.alert(copy.devToolsTitle, copy.onboardingCompleteSuccess);
                    });
                  }}
                />
              </Stack>
            </Stack>
          </Card>
        ) : null}
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
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  headerBlock: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  title: {
    color: theme.colors.text,
  },
  subtitle: {
    color: theme.colors.mutedText,
  },
  sectionTitle: {
    fontWeight: theme.typography.weights.semibold,
  },
  devStatusValue: {
    color: theme.colors.accent,
    fontWeight: theme.typography.weights.semibold,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#91CAFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.lg,
    lineHeight: theme.typography.lineHeights.lg,
    fontWeight: theme.typography.weights.bold,
  },
  profileIdentity: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  profileName: {
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.lg,
    lineHeight: theme.typography.lineHeights.lg,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  metaLabel: {
    flex: 1,
  },
  metaValue: {
    flex: 1,
    textAlign: 'right',
  },
  linkRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
  },
  linkText: {
    fontWeight: theme.typography.weights.medium,
  },
  signOutText: {
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.primary,
  },
  linkChevron: {
    fontSize: 20,
    lineHeight: 24,
    color: theme.colors.mutedText,
  },
});
