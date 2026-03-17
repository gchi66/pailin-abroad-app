import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppText } from '@/src/components/ui/AppText';
import { Card } from '@/src/components/ui/Card';
import { Stack } from '@/src/components/ui/Stack';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';

type UiLanguage = 'en' | 'th';

type ProfilePreviewData = {
  displayName: string;
  email: string;
  membershipLabel: string;
  joinedLabel: string;
};

const getProfilePreviewData = (uiLanguage: UiLanguage): ProfilePreviewData => {
  if (uiLanguage === 'th') {
    return {
      displayName: 'Pailin Preview',
      email: 'preview@pailinabroad.com',
      membershipLabel: 'สมาชิกตัวอย่าง',
      joinedLabel: 'เข้าร่วมเมื่อเร็วๆ นี้ในโหมดพรีวิว',
    };
  }

  return {
    displayName: 'Pailin Preview',
    email: 'preview@pailinabroad.com',
    membershipLabel: 'Preview Member',
    joinedLabel: 'Recently joined in preview mode',
  };
};

const getCopy = (uiLanguage: UiLanguage) => {
  if (uiLanguage === 'th') {
    return {
      title: 'โปรไฟล์',
      subtitle: 'ภาพรวมบัญชีของสมาชิกจะอยู่ที่นี่ เมื่อเชื่อม auth จริงแล้วหน้านี้จะดึงข้อมูลผู้ใช้จาก backend',
      guestTitle: 'ยังไม่มีบัญชีในพรีวิวนี้',
      guestBody: 'สลับกลับไปที่หน้า Account และเลือก Member เพื่อดูหน้าโปรไฟล์แบบตัวอย่าง',
      profileCardTitle: 'ข้อมูลสมาชิก',
      membershipLabel: 'สถานะสมาชิก',
      languageLabel: 'ภาษาหน้าแอป',
      joinedLabel: 'สถานะพรีวิว',
      editProfile: 'แก้ไขโปรไฟล์',
      membership: 'Membership',
      signOut: 'ออกจากระบบ',
      actionPlaceholder: 'จะเชื่อม action นี้ในขั้นตอนถัดไป',
      languageValue: 'ไทย',
      signOutSuccess: 'ออกจากโหมด Member preview แล้ว',
      avatarLabel: 'PP',
    };
  }

  return {
    title: 'Profile',
    subtitle: 'This is the member account summary shell. Once auth is wired, this page can read the real user profile from the backend.',
    guestTitle: 'No member account in this preview',
    guestBody: 'Go back to Account and switch the preview to Member to see the profile shell.',
    profileCardTitle: 'Member Snapshot',
    membershipLabel: 'Membership',
    languageLabel: 'App Language',
    joinedLabel: 'Preview State',
    editProfile: 'Edit Profile',
    membership: 'Membership',
    signOut: 'Sign Out',
    actionPlaceholder: 'This action will be connected in a later step.',
    languageValue: 'English',
    signOutSuccess: 'Signed out of member preview mode.',
    avatarLabel: 'PP',
  };
};

export function ProfileScreen() {
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();
  const { hasAccount, setHasAccount } = useAppSession();
  const copy = getCopy(uiLanguage);
  const previewData = getProfilePreviewData(uiLanguage);

  if (!hasAccount) {
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
            <Stack gap="sm">
              <AppText language={uiLanguage} variant="body" style={styles.sectionTitle}>
                {copy.guestTitle}
              </AppText>
              <AppText language={uiLanguage} variant="muted">
                {copy.guestBody}
              </AppText>
            </Stack>
          </Card>
        </Stack>
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
                <AppText language={uiLanguage} variant="caption" style={styles.avatarText}>
                  {copy.avatarLabel}
                </AppText>
              </View>
              <View style={styles.profileIdentity}>
                <AppText language={uiLanguage} variant="body" style={styles.profileName}>
                  {previewData.displayName}
                </AppText>
                <AppText language={uiLanguage} variant="muted">
                  {previewData.email}
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
                  {previewData.membershipLabel}
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
                  {previewData.joinedLabel}
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
              onPress={() => router.push('/account/membership')}>
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
                setHasAccount(false);
                Alert.alert(copy.signOut, copy.signOutSuccess);
                router.replace('/(tabs)/account');
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
