import { ScriptAwareTextInput } from '@/src/components/ui/ScriptAwareTextInput';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { AppText } from '@/src/components/ui/AppText';
import { AccountPageHeader } from '@/src/components/ui/AccountPageHeader';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Stack } from '@/src/components/ui/Stack';
import { updateOnboardingProfile } from '@/src/api/onboarding';
import { fetchUserProfile, updateUserPassword } from '@/src/api/user';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
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
  '/images/characters/avatar1_blue_circle.webp',
  '/images/characters/avatar2_blue_circle.webp',
  '/images/characters/avatar3_blue_circle.webp',
  '/images/characters/avatar4_blue_circle.webp',
  '/images/characters/avatar5_blue_circle.webp',
  '/images/characters/avatar6_blue_circle.webp',
  '/images/characters/avatar7_blue_circle.webp',
  '/images/characters/avatar8_blue_circle.webp',
] as const;

const isPrivateRelayEmail = (value: string | null | undefined) => {
  if (typeof value !== 'string') {
    return false;
  }

  return value.trim().toLowerCase().endsWith('@privaterelay.appleid.com');
};

const isEmailLike = (value: string | null | undefined) => {
  if (typeof value !== 'string') {
    return false;
  }

  return /\S+@\S+\.\S+/.test(value.trim());
};

const formatJoinedLabel = (value: string | null, uiLanguage: UiLanguage) => {
  if (!value) {
    return uiLanguage === 'th' ? 'เพิ่งเชื่อมต่อบัญชีในแอป' : 'Recently connected in the app';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(uiLanguage === 'th' ? 'th-TH-u-ca-gregory' : 'en-US', {
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
      back: 'ย้อนกลับ',
      edit: 'แก้ไข',
      cancel: 'ยกเลิก',
      guestTitle: 'หากต้องการดูเนื้อหาในโปรไฟล์ โปรดสร้างบัญชีฟรี',
      guestBody: 'บัญชีฟรีช่วยให้คุณบันทึกความคืบหน้าและจัดการข้อมูลส่วนตัวของคุณได้',
      guestCta: 'สร้างบัญชีฟรี',
      editCardTitle: 'แก้ไขโปรไฟล์',
      usernameLabel: 'ชื่อผู้ใช้',
      usernamePlaceholder: 'ตั้งชื่อผู้ใช้',
      avatarPickerTitle: 'เลือกรูปโปรไฟล์',
      saveChanges: 'บันทึกการเปลี่ยนแปลง',
      saving: 'กำลังบันทึก...',
      profileNameError: 'กรุณากรอกชื่อผู้ใช้',
      updateSuccess: 'อัปเดตโปรไฟล์แล้ว',
      membershipLabel: 'สถานะสมาชิก',
      joinedLabel: 'เข้าร่วมเมื่อ',
      signOut: 'ออกจากระบบ',
      signOutSuccess: 'ออกจากระบบแล้ว',
      onboardingPreview: 'เปิดตัวอย่างการเริ่มต้นใช้งาน',
      placementPreview: 'ทำแบบประเมินระดับ',
      speakingCoachPreview: 'เปิดตัวอย่าง Speaking Coach',
      lessonCompletePreview: 'เปิดตัวอย่างหน้าเรียนจบบทเรียน',
      avatarLabel: 'PP',
      setPassword: 'ตั้งรหัสผ่าน',
      subtitle: 'จัดการข้อมูลบัญชีของคุณ', password: 'รหัสผ่าน', changePassword: 'เปลี่ยนรหัสผ่าน', currentPassword: 'รหัสผ่านปัจจุบัน', newPassword: 'รหัสผ่านใหม่', confirmPassword: 'ยืนยันรหัสผ่านใหม่', savePassword: 'บันทึกรหัสผ่าน', passwordSaved: 'เปลี่ยนรหัสผ่านแล้ว', passwordMismatch: 'รหัสผ่านใหม่ไม่ตรงกัน', passwordRules: 'กรุณาตั้งรหัสผ่านให้ตรงตามเงื่อนไขทั้งหมด', passwordRule1: 'อย่างน้อย 8 ตัวอักษร', passwordRule2: 'มีตัวเลขและอักขระพิเศษอย่างน้อยอย่างละ 1 ตัว', passwordRule3: 'มีตัวอักษรพิมพ์ใหญ่และพิมพ์เล็กอย่างน้อยอย่างละ 1 ตัว', saveAvatar: 'บันทึกรูปโปรไฟล์',
    };
  }

  return {
    title: 'Profile',
    back: 'Back',
    edit: 'Edit',
    cancel: 'Cancel',
    guestTitle: 'To access profile content, make a free account.',
    guestBody: 'A free account lets you save progress and manage your personal details.',
    guestCta: 'Create free account',
    editCardTitle: 'Edit Profile',
      usernameLabel: 'First Name/Nickname',
    usernamePlaceholder: 'Choose a username',
    avatarPickerTitle: 'Choose an avatar',
    saveChanges: 'Save Changes',
    saving: 'Saving...',
    profileNameError: 'Please enter a username.',
    updateSuccess: 'Profile updated.',
    membershipLabel: 'Membership',
    joinedLabel: 'Joined',
    signOut: 'Log Out',
    signOutSuccess: 'Signed out successfully.',
    onboardingPreview: 'Open onboarding preview',
    placementPreview: 'Take placement test',
    speakingCoachPreview: 'Open speaking coach preview',
    lessonCompletePreview: 'Open lesson complete preview',
    avatarLabel: 'PP',
    setPassword: 'Set Password',
    subtitle: 'Manage your account information.', password: 'Password', changePassword: 'Change Password', currentPassword: 'Current password', newPassword: 'New password', confirmPassword: 'Confirm new password', savePassword: 'Save Password', passwordSaved: 'Password updated.', passwordMismatch: 'New passwords do not match.', passwordRules: 'Please meet all password requirements.', passwordRule1: 'At least 8 characters', passwordRule2: 'At least 1 number and 1 special character', passwordRule3: 'At least 1 uppercase and 1 lowercase letter', saveAvatar: 'Save Avatar',
  };
};

export function ProfileScreen() {
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();
  const { hasAccount, hasMembership, isGuestMode, profile, refreshProfile, signOut, user } = useAppSession();
  const copy = getCopy(uiLanguage);
  const [isEditing, setIsEditing] = useState(false);
  const [draftUsername, setDraftUsername] = useState('');
  const [draftAvatarPath, setDraftAvatarPath] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordMode, setPasswordMode] = useState<boolean | null>(null);
  const [isOpeningPassword, setIsOpeningPassword] = useState(false);
  const displayName =
    (!isEmailLike(profile?.name) ? profile?.name?.trim() || '' : '') ||
    (!isEmailLike(profile?.username) ? profile?.username?.trim() || '' : '') ||
    (typeof user?.user_metadata?.name === 'string' && !isEmailLike(user.user_metadata.name) ? user.user_metadata.name.trim() : '') ||
    (typeof user?.user_metadata?.username === 'string' && !isEmailLike(user.user_metadata.username) ? user.user_metadata.username.trim() : '') ||
    'Pailin Abroad';
  const resolvedEmail = profile?.email?.trim() || user?.email || '—';
  const email = isPrivateRelayEmail(resolvedEmail) ? null : resolvedEmail;
  const metadataAvatar = typeof user?.user_metadata?.avatar_image === 'string' ? user.user_metadata.avatar_image : null;
  const avatarSource = resolveAvatarSource(profile?.avatar_image || metadataAvatar);
  const profileData = getProfileDisplayData(uiLanguage, {
    displayName,
    email: email ?? '',
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
      return false;
    }

    if (!draftAvatarPath) {
      return false;
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
      return true;
    } catch (error) {
      Alert.alert(copy.editCardTitle, error instanceof Error ? error.message : 'Something went wrong.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const passwordRules = [
    newPassword.length >= 8,
    /\d/.test(newPassword) && /[!@#$%^&*(),.?":{}|<>_;'\-+=/\\[\]~`]/.test(newPassword),
    /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword),
  ];

  const openPasswordScreen = async () => {
    if (isOpeningPassword) return;
    setIsOpeningPassword(true);
    try {
      const hasPassword = profile?.has_password ?? (await fetchUserProfile()).has_password;
      if (typeof hasPassword !== 'boolean') throw new Error('Could not load password settings.');
      setPasswordMode(hasPassword);
      setIsChangingPassword(true);
    } catch (error) {
      Alert.alert(copy.password, error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setIsOpeningPassword(false);
    }
  };

  const handleSavePassword = async () => {
    if (passwordMode === null) return;
    if (passwordMode && !currentPassword) {
      Alert.alert(copy.changePassword, copy.currentPassword);
      return;
    }
    if (!passwordRules.every(Boolean)) {
      Alert.alert(copy.changePassword, copy.passwordRules);
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(copy.changePassword, copy.passwordMismatch);
      return;
    }

    setIsSavingPassword(true);
    try {
      await updateUserPassword({ newPassword, ...(passwordMode ? { currentPassword } : {}) });
      setPasswordMode(true);
      await refreshProfile();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setVisiblePasswords({});
      setIsChangingPassword(false);
      Alert.alert(passwordMode ? copy.changePassword : copy.setPassword, copy.passwordSaved);
    } catch (error) {
      Alert.alert(passwordMode ? copy.changePassword : copy.setPassword, error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (!hasAccount) {
    return (
      <View style={styles.screen}>
        <View style={styles.contentContainerStatic}>
          <ResponsivePageShell style={styles.pageContent}>
            <View style={styles.pageCenterGroup}>
              <Card padding="lg" radius="lg" style={[styles.neoCard, styles.guestCard]}>
                <Stack gap="md">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={uiLanguage === 'th' ? 'ปิดหน้าต่างสร้างบัญชีฟรี' : 'Dismiss create free account prompt'}
                    onPress={() => router.push('/(tabs)/account')}
                    style={styles.guestCardCloseButton}>
                    <MaterialIcons name="close" size={22} color={theme.colors.mutedText} />
                  </Pressable>
                  <AppText language={uiLanguage} variant="title" style={styles.guestTitle}>
                    {copy.guestTitle}
                  </AppText>
                  <AppText language={uiLanguage} variant="body" style={styles.guestBody}>
                    {copy.guestBody}
                  </AppText>
                  {isGuestMode ? (
                    <View style={styles.guestButtonWrap}>
                      <View pointerEvents="none" style={styles.guestButtonShadow} />
                      <Button
                        language={uiLanguage}
                        title={copy.guestCta}
                        onPress={() => router.push('/account/auth')}
                        style={styles.guestButton}
                        textStyle={styles.guestButtonText}
                      />
                    </View>
                  ) : null}
                </Stack>
              </Card>
            </View>
          </ResponsivePageShell>
        </View>
      </View>
    );
  }

  const passwordField = (key: string, label: string, value: string, onChangeText: (value: string) => void) => (
    <View style={styles.passwordField}>
      <AppText language={uiLanguage} variant="caption" style={styles.passwordLabel}>{label}</AppText>
      <View style={styles.passwordInputRow}>
        <ScriptAwareTextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visiblePasswords[key]}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType={key === 'current' ? 'password' : 'newPassword'}
          style={styles.passwordInput}
        />
        <Pressable accessibilityRole="button" accessibilityLabel={visiblePasswords[key] ? 'Hide password' : 'Show password'} onPress={() => setVisiblePasswords((previous) => ({ ...previous, [key]: !previous[key] }))}>
          <MaterialIcons name={visiblePasswords[key] ? 'visibility-off' : 'visibility'} size={22} color="#85898C" />
        </Pressable>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
      <ResponsivePageShell>
        <AccountPageHeader
          language={uiLanguage}
          title={isChangingPassword ? (passwordMode ? copy.changePassword : copy.setPassword) : (uiLanguage === 'en' ? 'My Profile' : copy.title)}
          backLabel={isChangingPassword ? copy.title : copy.back}
          onBackPress={() => isChangingPassword ? setIsChangingPassword(false) : router.push('/(tabs)/account')}
          subtitle={isChangingPassword ? undefined : copy.subtitle}
          illustration={isChangingPassword ? undefined : require('@/assets/images/characters/pailin_thumbs_up_head.webp')}
          flipIllustration
        />

        {isChangingPassword ? (
          <View style={styles.passwordCard}>
            {passwordMode ? passwordField('current', copy.currentPassword, currentPassword, setCurrentPassword) : null}
            {passwordField('new', copy.newPassword, newPassword, setNewPassword)}
            <View style={styles.rules}>
              {[copy.passwordRule1, copy.passwordRule2, copy.passwordRule3].map((rule, index) => (
                <View key={rule} style={styles.ruleRow}>
                  <MaterialIcons name="check-circle" size={18} color={passwordRules[index] ? '#3CA0FE' : '#929698'} />
                  <AppText language={uiLanguage} variant="caption" style={styles.ruleText}>{rule}</AppText>
                </View>
              ))}
            </View>
            {passwordField('confirm', copy.confirmPassword, confirmPassword, setConfirmPassword)}
            <Pressable accessibilityRole="button" disabled={isSavingPassword} onPress={() => void handleSavePassword()} style={styles.savePasswordButton}>
              <AppText language={uiLanguage} variant="body" style={styles.savePasswordText}>{isSavingPassword ? copy.saving : copy.savePassword}</AppText>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.profileCard}>
              <View style={styles.profileHeaderRow}>
                <Pressable accessibilityRole="button" accessibilityLabel={copy.avatarPickerTitle} onPress={() => { setDraftAvatarPath(initialAvatarPath); setShowAvatarPicker(true); }} style={styles.avatar}>
                  {avatarSource ? <Image source={avatarSource} style={styles.avatarImage} resizeMode="cover" /> : <AppText language={uiLanguage} variant="caption" style={styles.avatarText}>{avatarLabel || copy.avatarLabel}</AppText>}
                  <View style={styles.avatarEditBadge}><MaterialIcons name="edit" size={12} color="#2563EB" /></View>
                </Pressable>
                <View style={styles.profileIdentity}>
                  {isEditing ? (
                    <View style={styles.editNameRow}>
                      <ScriptAwareTextInput value={draftUsername} onChangeText={setDraftUsername} style={styles.editNameInput} autoFocus />
                      <Pressable accessibilityRole="button" onPress={() => void handleSaveProfile()} disabled={isSaving}><MaterialIcons name="check" size={23} color="#2563EB" /></Pressable>
                      <Pressable accessibilityRole="button" onPress={handleCancelEditing}><MaterialIcons name="close" size={23} color={theme.colors.text} /></Pressable>
                    </View>
                  ) : (
                    <Pressable accessibilityRole="button" onPress={handleStartEditing} style={styles.nameRow}>
                      <AppText language={uiLanguage} variant="body" style={styles.profileName}>{profileData.displayName}</AppText>
                      <MaterialIcons name="edit" size={18} color="#2563EB" />
                    </Pressable>
                  )}
                  {email ? <AppText language={uiLanguage} variant="muted" numberOfLines={1} style={styles.email}>{profileData.email}</AppText> : null}
                </View>
              </View>
              <View style={styles.metaRow}>
                <MaterialIcons name="workspace-premium" size={24} color={theme.colors.text} />
                <AppText language={uiLanguage} variant="body" style={styles.metaLabel}>{copy.membershipLabel}</AppText>
                <AppText language={uiLanguage} variant="body" style={styles.metaValue}>{profileData.membershipLabel}</AppText>
              </View>
              <View style={styles.metaRow}>
                <MaterialIcons name="calendar-today" size={22} color={theme.colors.text} />
                <AppText language={uiLanguage} variant="body" style={styles.metaLabel}>{copy.joinedLabel}</AppText>
                <AppText language={uiLanguage} variant="body" style={styles.metaValue}>{profileData.joinedLabel}</AppText>
              </View>
            <Pressable accessibilityRole="button" onPress={() => void openPasswordScreen()} style={styles.metaRow}>
                <MaterialIcons name="lock-outline" size={23} color={theme.colors.text} />
                <AppText language={uiLanguage} variant="body" style={styles.metaLabel}>{copy.password}</AppText>
                <AppText language={uiLanguage} variant="body" style={styles.passwordDots}>{profile?.has_password === false ? copy.setPassword : profile?.has_password === true ? '********' : '…'}</AppText>
                <MaterialIcons name="chevron-right" size={22} color={theme.colors.text} />
              </Pressable>
            </View>
            {profile?.is_admin === true ? <Stack gap="sm" style={styles.adminLinks}>
              <Button title={copy.onboardingPreview} language={uiLanguage} variant="outline" onPress={() => router.push('/onboarding?devtools=1')} />
              <Button title={copy.placementPreview} language={uiLanguage} variant="outline" onPress={() => router.push('/placement-entry')} />
              <Button title={copy.speakingCoachPreview} language={uiLanguage} variant="outline" onPress={() => router.push('/speaking-coach?lesson=4.1')} />
              <Button title={copy.lessonCompletePreview} language={uiLanguage} variant="outline" onPress={() => router.push('/lesson-complete-preview')} />
            </Stack> : null}
            <Pressable accessibilityRole="button" style={styles.signOutRow} onPress={() => { void signOut().then(({ error }) => { if (error) { Alert.alert(copy.signOut, error); return; } router.replace('/(tabs)'); }); }}>
              <MaterialIcons name="logout" size={21} color="#FF4545" />
              <AppText language={uiLanguage} variant="body" style={styles.signOutText}>{copy.signOut}</AppText>
            </Pressable>
          </>
        )}
      </ResponsivePageShell>
      <Modal visible={showAvatarPicker} transparent animationType="fade" onRequestClose={() => setShowAvatarPicker(false)}>
        <View style={styles.modalShade}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowAvatarPicker(false)} />
          <View style={styles.avatarModal}>
            <View style={styles.avatarGrid}>
              {AVATAR_OPTIONS.map((avatarPath) => {
                const optionSource = resolveAvatarSource(avatarPath);
                return optionSource ? <Pressable key={avatarPath} accessibilityRole="button" accessibilityLabel={avatarPath} style={[styles.avatarOption, draftAvatarPath === avatarPath && styles.avatarOptionSelected]} onPress={() => setDraftAvatarPath(avatarPath)}><Image source={optionSource} style={styles.avatarOptionImage} resizeMode="contain" /></Pressable> : null;
              })}
            </View>
            <Pressable accessibilityRole="button" disabled={isSaving} onPress={() => { void handleSaveProfile().then((saved) => { if (saved) setShowAvatarPicker(false); }); }} style={styles.saveAvatarButton}>
              <AppText language={uiLanguage} variant="body" style={styles.saveAvatarText}>{isSaving ? copy.saving : copy.saveAvatar}</AppText>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    flexGrow: 1,
  },
  profileCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 13, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6, boxShadow: '4px 4px 0px #1E1E1E' },
  contentContainerStatic: {
    flex: 1,
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  pageContent: {
    flex: 1,
  },
  neoCard: {
    borderWidth: 1.5,
    boxShadow: `1.75px 1.75px 0px ${theme.colors.shadow}`,
  },
  guestCard: {
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#FFF4E8',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    boxShadow: `2px 2px 0px ${theme.colors.shadow}`,
  },
  guestCardCloseButton: {
    alignSelf: 'flex-end',
    marginBottom: -theme.spacing.xs,
    padding: 2,
  },
  sectionTitle: {
    fontWeight: theme.typography.weights.semibold,
  },
  title: {
    color: theme.colors.text,
  },
  guestTitle: {
    color: theme.colors.text,
    textAlign: 'left',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: theme.typography.weights.bold,
  },
  guestBody: {
    color: theme.colors.mutedText,
    textAlign: 'left',
    lineHeight: 22,
  },
  guestButton: {
    minHeight: 56,
    borderWidth: 2,
    borderRadius: 28,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.primary,
    overflow: 'hidden',
  },
  guestButtonWrap: {
    position: 'relative',
  },
  guestButtonShadow: {
    position: 'absolute',
    top: 3,
    right: -3,
    bottom: -3,
    left: 3,
    borderRadius: 28,
    backgroundColor: theme.colors.shadow,
  },
  guestButtonText: {
    fontWeight: theme.typography.weights.bold,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingBottom: 16,
  },
  profileCardContent: {
    minHeight: 148,
    justifyContent: 'center',
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#91CAFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  avatarEditBadge: { position: 'absolute', right: 0, bottom: 0, width: 21, height: 21, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#999', backgroundColor: '#FFFFFF' },
  avatarText: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.lg,
    lineHeight: theme.typography.lineHeights.lg,
    fontWeight: theme.typography.weights.bold,
  },
  profileIdentity: {
    flex: 1,
    gap: 2,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editNameInput: { minWidth: 0, flex: 1, borderBottomWidth: 1, borderColor: theme.colors.border, color: theme.colors.text, fontSize: 19 },
  email: { fontSize: 12 },
  profileName: {
    fontWeight: theme.typography.weights.bold,
    fontSize: 22,
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
    fontFamily: theme.typography.fontFaces.en.regular,
    fontSize: theme.typography.sizes.md,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  avatarOption: {
    width: '23%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    overflow: 'hidden',
  },
  avatarOptionSelected: {
    borderWidth: 2,
    borderColor: '#F6A75C',
  },
  avatarOptionImage: {
    width: '100%',
    height: '100%',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    borderTopWidth: 1,
    borderTopColor: '#D8D8D8',
  },
  metaLabel: {
    flex: 1,
    color: '#666666',
  },
  metaValue: {
    textAlign: 'right',
    fontWeight: theme.typography.weights.semibold,
    fontSize: 14,
  },
  passwordDots: { fontWeight: theme.typography.weights.bold },
  adminLinks: { marginTop: 22 },
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
    color: '#FF4545',
  },
  signOutRow: {
    minHeight: 56,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginTop: 34,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    backgroundColor: '#FFEDED',
    boxShadow: '4px 4px 0px #1E1E1E',
  },
  passwordCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 13, padding: 20, marginTop: 14, boxShadow: '4px 4px 0px #1E1E1E' },
  passwordField: { marginBottom: 24 },
  passwordLabel: { marginBottom: 7, fontWeight: theme.typography.weights.medium },
  passwordInputRow: { flexDirection: 'row', alignItems: 'center', height: 42, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 6, paddingHorizontal: 12 },
  passwordInput: { flex: 1, minWidth: 0, height: 42, color: theme.colors.text, fontSize: 15 },
  rules: { gap: 5, marginTop: -12, marginBottom: 25 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleText: { flex: 1, fontSize: 12 },
  savePasswordButton: { minHeight: 56, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 999, backgroundColor: '#BCECFF', boxShadow: '4px 4px 0px #1E1E1E' },
  savePasswordText: { textTransform: 'uppercase', fontWeight: theme.typography.weights.medium, letterSpacing: 0.5 },
  modalShade: { flex: 1, backgroundColor: '#00000040', alignItems: 'center', justifyContent: 'center', padding: 24 },
  avatarModal: { width: '100%', maxWidth: 360, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: 18, boxShadow: '4px 4px 0px #1E1E1E' },
  saveAvatarButton: { marginTop: 20, minHeight: 44, backgroundColor: '#2563EB', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 999, alignItems: 'center', justifyContent: 'center', boxShadow: '4px 4px 0px #1E1E1E' },
  saveAvatarText: { color: '#FFFFFF', textTransform: 'uppercase', fontWeight: theme.typography.weights.semibold },
  pageCenterGroup: {
    flex: 1,
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  linkChevron: {
    fontSize: 20,
    lineHeight: 24,
    color: theme.colors.mutedText,
  },
});
