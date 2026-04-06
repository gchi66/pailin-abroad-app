import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Stack } from '@/src/components/ui/Stack';
import { StandardPageHeader } from '@/src/components/ui/StandardPageHeader';
import { updateOnboardingProfile } from '@/src/api/onboarding';
import { useAppSession } from '@/src/context/app-session-context';
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

const AVATAR_OPTIONS = [
  '/images/characters/avatar_1.webp',
  '/images/characters/avatar_2.webp',
  '/images/characters/avatar_3.webp',
  '/images/characters/avatar_4.webp',
  '/images/characters/avatar_5.webp',
  '/images/characters/avatar_6.webp',
  '/images/characters/avatar_7.webp',
  '/images/characters/avatar_8.webp',
] as const;

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
      edit: 'แก้ไข',
      cancel: 'ยกเลิก',
      guestTitle: 'ยังไม่ได้เข้าสู่ระบบ',
      guestBody: 'กลับไปที่หน้า Account เพื่อเข้าสู่ระบบหรือสมัครสมาชิกก่อน',
      profileCardTitle: 'ข้อมูลสมาชิก',
      editCardTitle: 'แก้ไขโปรไฟล์',
      usernameLabel: 'ชื่อผู้ใช้',
      usernamePlaceholder: 'ตั้งชื่อผู้ใช้',
      avatarPickerTitle: 'เลือกรูปโปรไฟล์',
      saveChanges: 'บันทึกการเปลี่ยนแปลง',
      saving: 'กำลังบันทึก...',
      profileNameError: 'กรุณากรอกชื่อผู้ใช้',
      updateSuccess: 'อัปเดตโปรไฟล์แล้ว',
      membershipLabel: 'สถานะสมาชิก',
      languageLabel: 'ภาษาหน้าแอป',
      joinedLabel: 'เข้าร่วมเมื่อ',
      signOut: 'ออกจากระบบ',
      onboardingDevtools: 'เปิด Onboarding Devtools',
      languageValue: 'ไทย',
      signOutSuccess: 'ออกจากระบบแล้ว',
      avatarLabel: 'PP',
    };
  }

  return {
    title: 'Profile',
    edit: 'Edit',
    cancel: 'Cancel',
    guestTitle: 'You are not signed in',
    guestBody: 'Go back to Account to sign in or create an account first.',
    profileCardTitle: 'Member Snapshot',
    editCardTitle: 'Edit Profile',
    usernameLabel: 'Username',
    usernamePlaceholder: 'Choose a username',
    avatarPickerTitle: 'Choose an avatar',
    saveChanges: 'Save Changes',
    saving: 'Saving...',
    profileNameError: 'Please enter a username.',
    updateSuccess: 'Profile updated.',
    membershipLabel: 'Membership',
    languageLabel: 'App Language',
    joinedLabel: 'Joined',
    signOut: 'Sign Out',
    onboardingDevtools: 'Open Onboarding Devtools',
    languageValue: 'English',
    signOutSuccess: 'Signed out successfully.',
    avatarLabel: 'PP',
  };
};

export function ProfileScreen() {
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();
  const { hasAccount, hasMembership, profile, refreshProfile, signOut, user } = useAppSession();
  const copy = getCopy(uiLanguage);
  const [isEditing, setIsEditing] = useState(false);
  const [draftUsername, setDraftUsername] = useState('');
  const [draftAvatarPath, setDraftAvatarPath] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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
  const initialUsername =
    profile?.username?.trim() ||
    profile?.name?.trim() ||
    (typeof user?.user_metadata?.username === 'string' ? user.user_metadata.username.trim() : '') ||
    (typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name.trim() : '') ||
    '';
  const initialAvatarPath =
    profile?.avatar_image ||
    (typeof user?.user_metadata?.avatar_image === 'string' ? user.user_metadata.avatar_image : null) ||
    AVATAR_OPTIONS[0];
  const draftAvatarSource = useMemo(() => resolveAvatarSource(draftAvatarPath), [draftAvatarPath]);

  useEffect(() => {
    if (isEditing) {
      return;
    }

    setDraftUsername(initialUsername);
    setDraftAvatarPath(initialAvatarPath);
  }, [initialAvatarPath, initialUsername, isEditing]);

  const handleStartEditing = () => {
    setDraftUsername(initialUsername);
    setDraftAvatarPath(initialAvatarPath);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setDraftUsername(initialUsername);
    setDraftAvatarPath(initialAvatarPath);
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    const username = draftUsername.trim();
    if (!username) {
      Alert.alert(copy.editCardTitle, copy.profileNameError);
      return;
    }

    if (!draftAvatarPath) {
      return;
    }

    setIsSaving(true);
    try {
      await updateOnboardingProfile({
        username,
        avatarImage: draftAvatarPath,
      });
      await refreshProfile();
      setIsEditing(false);
      Alert.alert(copy.editCardTitle, copy.updateSuccess);
    } catch (error) {
      Alert.alert(copy.editCardTitle, error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!hasAccount) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
        <Card padding="lg" radius="lg" style={styles.neoCard}>
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
        <StandardPageHeader
          language={uiLanguage}
          title={copy.title}
          onBackPress={() => router.push('/(tabs)/account')}
          rightActionLabel={isEditing ? copy.cancel : copy.edit}
          onRightActionPress={isEditing ? handleCancelEditing : handleStartEditing}
          topInsetOffset={52}
        />

        <Card padding="lg" radius="lg" style={styles.neoCard}>
          <Stack gap="md">
            <View style={styles.profileHeaderRow}>
              <View style={styles.avatar}>
                {isEditing && draftAvatarSource ? (
                  <Image source={draftAvatarSource} style={styles.avatarImage} resizeMode="cover" />
                ) : avatarSource ? (
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

            {isEditing ? (
              <Stack gap="md">
                <AppText language={uiLanguage} variant="body" style={styles.sectionTitle}>
                  {copy.editCardTitle}
                </AppText>
                <Stack gap="xs">
                  <AppText language={uiLanguage} variant="caption" style={styles.fieldLabel}>
                    {copy.usernameLabel}
                  </AppText>
                  <View style={styles.inputShell}>
                    <TextInput
                      placeholder={copy.usernamePlaceholder}
                      placeholderTextColor={theme.colors.mutedText}
                      style={styles.textInput}
                      value={draftUsername}
                      onChangeText={setDraftUsername}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </Stack>

                <Stack gap="xs">
                  <AppText language={uiLanguage} variant="caption" style={styles.fieldLabel}>
                    {copy.avatarPickerTitle}
                  </AppText>
                  <View style={styles.avatarGrid}>
                    {AVATAR_OPTIONS.map((avatarPath) => {
                      const optionSource = resolveAvatarSource(avatarPath);
                      if (!optionSource) {
                        return null;
                      }

                      return (
                        <Pressable
                          key={avatarPath}
                          accessibilityRole="button"
                          style={styles.avatarOption}
                          onPress={() => setDraftAvatarPath(avatarPath)}>
                          <Image source={optionSource} style={styles.avatarOptionImage} resizeMode="contain" />
                          {draftAvatarPath === avatarPath ? <View style={styles.avatarSelectedRing} /> : null}
                        </Pressable>
                      );
                    })}
                  </View>
                </Stack>

                <Button
                  title={isSaving ? copy.saving : copy.saveChanges}
                  language={uiLanguage}
                  onPress={() => {
                    void handleSaveProfile();
                  }}
                  disabled={isSaving}
                />
              </Stack>
            ) : (
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
            )}
          </Stack>
        </Card>

        <Pressable
          accessibilityRole="button"
          style={styles.signOutRow}
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
        </Pressable>

        <Pressable
          accessibilityRole="button"
          style={styles.devtoolsRow}
          onPress={() =>
            router.push({
              pathname: '/onboarding',
              params: { devtools: '1' },
            })
          }>
          <AppText language={uiLanguage} variant="body" style={styles.devtoolsText}>
            {copy.onboardingDevtools}
          </AppText>
        </Pressable>
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
  neoCard: {
    borderWidth: 1.5,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 1.75, height: 1.75 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  sectionTitle: {
    fontWeight: theme.typography.weights.semibold,
  },
  title: {
    color: theme.colors.text,
  },
  subtitle: {
    color: theme.colors.mutedText,
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
  fieldLabel: {
    color: theme.colors.mutedText,
  },
  inputShell: {
    minHeight: 56,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
  },
  textInput: {
    minHeight: 56,
    color: theme.colors.text,
    fontFamily: theme.typography.fonts.en,
    fontSize: theme.typography.sizes.md,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: theme.spacing.md,
  },
  avatarOption: {
    width: '23%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOptionImage: {
    width: '100%',
    height: '100%',
  },
  avatarSelectedRing: {
    position: 'absolute',
    top: -3,
    right: -3,
    bottom: -3,
    left: -3,
    borderWidth: 2,
    borderColor: theme.colors.text,
    borderRadius: 999,
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
  signOutRow: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  devtoolsRow: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: 0,
    paddingBottom: theme.spacing.sm,
  },
  devtoolsText: {
    color: theme.colors.mutedText,
    fontWeight: theme.typography.weights.medium,
  },
  linkChevron: {
    fontSize: 20,
    lineHeight: 24,
    color: theme.colors.mutedText,
  },
});
