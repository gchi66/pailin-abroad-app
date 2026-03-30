import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { completeOnboarding, ensureOnboardingUserRecord, setOnboardingPassword, updateOnboardingProfile } from '@/src/api/onboarding';
import arrowLeftImage from '@/assets/images/black-carrot-arrow-left.webp';
import arrowRightImage from '@/assets/images/black-carrot-arrow-right.webp';
import blueCheckmarkImage from '@/assets/images/blue-checkmark.webp';
import greyPasswordCheckmarkImage from '@/assets/images/grey-password-checkmark.webp';
import hidePasswordImage from '@/assets/images/hide-password.webp';
import pailinWelcomeImage from '@/assets/images/characters/pailin_blue_circle_right.webp';
import passwordLockImage from '@/assets/images/password-lock.webp';
import showPasswordImage from '@/assets/images/show-password.webp';
import { AppText } from '@/src/components/ui/AppText';
import { Stack } from '@/src/components/ui/Stack';
import { useAppSession } from '@/src/context/app-session-context';
import { useOnboarding } from '@/src/context/onboarding-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';

type UiLanguage = 'en' | 'th';
type PasswordField = 'newPassword' | 'confirmPassword';

type OnboardingCopy = {
  welcomeTitle: string;
  welcomeSubtitle: string;
  welcomeDescription: string;
  passwordTitle: string;
  newPassword: string;
  confirmPassword: string;
  passwordMismatch: string;
  passwordRequirements: string;
  passwordRule1: string;
  passwordRule2: string;
  passwordRule3: string;
  whatToCallYou: string;
  firstNameLabel: string;
  chooseAvatar: string;
  namePlaceholder: string;
  profileNameError: string;
  profileAvatarError: string;
  benefitsTitle: string;
  benefitsSubtitle: string;
  freeLabel: string;
  fullLabel: string;
  freeTitle: string;
  paidTitle: string;
  freeBenefit1: string;
  freeBenefit2: string;
  freeBenefit3: string;
  freeBenefit4: string;
  paidBenefit1: string;
  paidBenefit2: string;
  paidBenefit3: string;
  paidBenefit4: string;
  upgradeCta: string;
  continueFree: string;
  confirmationTitle: string;
  confirmationSubtitle: string;
  confirmationCta: string;
  next: string;
  finish: string;
  back: string;
};

type StepBaseProps = {
  copy: OnboardingCopy;
  uiLanguage: UiLanguage;
  cardWidth: number;
  compact: boolean;
  veryCompact: boolean;
};

type PasswordStepProps = StepBaseProps & {
  passwords: {
    newPassword: string;
    confirmPassword: string;
  };
  onPasswordChange: (field: PasswordField, value: string) => void;
  errorMessage: string;
  meetsLength: boolean;
  meetsNumberOrSymbol: boolean;
  meetsUppercase: boolean;
};

type ProfileStepProps = StepBaseProps & {
  username: string;
  selectedAvatarPath: string;
  onUsernameChange: (value: string) => void;
  onAvatarSelect: (value: string) => void;
  errorMessage: string;
};

type BenefitsStepProps = StepBaseProps & {
  onContinueFree: () => void;
  onUpgrade: () => void;
};

const STEP_IDS = [0, 1, 2, 3, 4] as const;

const isEmailLike = (value: string | null | undefined) => {
  if (!value) {
    return false;
  }

  return /\S+@\S+\.\S+/.test(value.trim());
};

const AVATAR_OPTIONS = [
  { source: require('@/assets/images/characters/avatar_1.webp'), path: '/images/characters/avatar_1.webp' },
  { source: require('@/assets/images/characters/avatar_2.webp'), path: '/images/characters/avatar_2.webp' },
  { source: require('@/assets/images/characters/avatar_3.webp'), path: '/images/characters/avatar_3.webp' },
  { source: require('@/assets/images/characters/avatar_4.webp'), path: '/images/characters/avatar_4.webp' },
  { source: require('@/assets/images/characters/avatar_5.webp'), path: '/images/characters/avatar_5.webp' },
  { source: require('@/assets/images/characters/avatar_6.webp'), path: '/images/characters/avatar_6.webp' },
  { source: require('@/assets/images/characters/avatar_7.webp'), path: '/images/characters/avatar_7.webp' },
  { source: require('@/assets/images/characters/avatar_8.webp'), path: '/images/characters/avatar_8.webp' },
] as const;

const getCopy = (uiLanguage: UiLanguage): OnboardingCopy => {
  if (uiLanguage === 'th') {
    return {
      welcomeTitle: 'ยินดีต้อนรับเข้าสู่ Pailin Abroad!',
      welcomeSubtitle: 'สวัสดีค่ะ ฉันชื่อไพลินนะคะ! ฉันตื่นเต้นมากๆที่จะได้เป็นไกด์พาคุณเรียนรู้ภาษาอังกฤษไปด้วยกัน',
      welcomeDescription:
        'อีกในไม่กี่ขั้นตอนข้างหน้า เราจะพาคุณเตรียมพร้อมไปสำรวจโลกและภาษาอังกฤษที่ฉันใช้จริงในชีวิตประจำวันในทุกๆวันกันค่ะ',
      passwordTitle: 'มาตั้งรหัสผ่านของคุณกันเถอะ',
      newPassword: 'รหัสผ่านใหม่',
      confirmPassword: 'ยืนยันรหัสผ่าน',
      passwordMismatch: 'รหัสผ่านไม่ตรงกัน',
      passwordRequirements: 'กรุณาตั้งรหัสผ่านให้ตรงตามเงื่อนไขทั้งหมด',
      passwordRule1: 'อย่างน้อย 8 ตัวอักษร',
      passwordRule2: 'มีตัวเลขหรือตัวอักษรพิเศษอย่างน้อย 1 ตัว',
      passwordRule3: 'มีตัวอักษรพิมพ์ใหญ่อย่างน้อย 1 ตัว',
      whatToCallYou: 'อยากให้เราเรียกคุณว่าอะไรดีล่ะ?',
      firstNameLabel: 'ชื่อจริง หรือ ชื่อเล่น',
      chooseAvatar: 'เลือกรูปโปรไฟล์ของคุณกัน',
      namePlaceholder: 'พิมพ์ชื่อของคุณ',
      profileNameError: 'กรุณาใส่ชื่อของคุณ',
      profileAvatarError: 'กรุณาเลือกรูปโปรไฟล์',
      benefitsTitle: 'เลือกวิธีเรียนของคุณ',
      benefitsSubtitle: 'ดูว่าคุณจะได้อะไรเมื่ออัปเกรด',
      freeLabel: 'FREE',
      fullLabel: 'FULL',
      freeTitle: 'เริ่มต้นเรียน',
      paidTitle: 'สมาชิกแบบเต็ม',
      freeBenefit1: 'บทเรียนแรกของแต่ละระดับ',
      freeBenefit2: 'แบบฝึกหัดแนะนำ',
      freeBenefit3: 'พรีวิวคลังหัวข้อ',
      freeBenefit4: 'ฟีดแบ็กในบทเรียนฟรี',
      paidBenefit1: 'ปลดล็อกทุกบทเรียน',
      paidBenefit2: 'เส้นทางการเรียนแบบเต็ม',
      paidBenefit3: 'คลังแบบฝึกหัดครบ',
      paidBenefit4: 'เครื่องมือเรียน + ทบทวนคำศัพท์',
      upgradeCta: 'ปลดล็อกการเข้าถึงทั้งหมด',
      continueFree: 'ใช้บัญชีฟรีต่อ',
      confirmationTitle: 'คุณพร้อมแล้ว!',
      confirmationSubtitle: 'โปรไฟล์ผู้ใช้ของคุณสมบูรณ์แล้ว และตอนนี้คุณก็ได้เป็นส่วนหนึ่งของชุมชน Pailin Abroad อย่างเป็นทางการ',
      confirmationCta: 'มาเตรียมตัวเริ่มเรียนกันเถอะ!',
      next: 'ถัดไป',
      finish: 'เริ่มเรียนเลย!',
      back: 'ย้อนกลับ',
    };
  }

  return {
    welcomeTitle: 'Welcome to Pailin Abroad!',
    welcomeSubtitle: "Hi, I'm Pailin! I'm so excited to be your guide on this English journey.",
    welcomeDescription: "In a few quick steps, we'll get you ready to explore my world and the language I use every day.",
    passwordTitle: "Let's set up your password",
    newPassword: 'New password',
    confirmPassword: 'Confirm password',
    passwordMismatch: 'Passwords do not match.',
    passwordRequirements: 'Please meet all password requirements.',
    passwordRule1: 'At least 8 characters',
    passwordRule2: 'At least 1 number or special character',
    passwordRule3: 'At least 1 uppercase letter',
    whatToCallYou: 'What should we call you?',
    firstNameLabel: 'First Name or Nickname',
    chooseAvatar: 'Choose an avatar',
    namePlaceholder: 'Enter your name',
    profileNameError: 'Please enter your name.',
    profileAvatarError: 'Please select an avatar.',
    benefitsTitle: 'Choose how you learn',
    benefitsSubtitle: "See what's waiting when you upgrade",
    freeLabel: 'FREE',
    fullLabel: 'FULL',
    freeTitle: 'Getting started',
    paidTitle: 'Full membership',
    freeBenefit1: '1st lesson of each level',
    freeBenefit2: 'Featured exercises',
    freeBenefit3: 'Topics library preview',
    freeBenefit4: 'Feedback on free lessons',
    paidBenefit1: 'All lessons unlocked',
    paidBenefit2: 'Complete pathway access',
    paidBenefit3: 'Full exercise library',
    paidBenefit4: 'Study tools + vocab review',
    upgradeCta: 'Unlock Full Access',
    continueFree: 'Continue with free account',
    confirmationTitle: "You're all set!",
    confirmationSubtitle: "Your profile is complete and you're officially part of the Pailin Abroad community.",
    confirmationCta: 'Get ready to learn!',
    next: 'Next',
    finish: 'GET STARTED!',
    back: 'Back',
  };
};

function WelcomeStep({ copy, uiLanguage, cardWidth, compact, veryCompact }: StepBaseProps) {
  return (
    <View style={[styles.stepPage, { width: cardWidth }]}>
      <Stack gap={compact ? 'sm' : 'md'} align="center" style={styles.centeredStep}>
        <View style={[styles.avatarWrap, compact ? styles.avatarWrapCompact : null, veryCompact ? styles.avatarWrapVeryCompact : null]}>
          <Image source={pailinWelcomeImage} style={styles.welcomeAvatar} contentFit="contain" />
        </View>
        <Stack gap={compact ? 'xs' : 'sm'} align="center">
          <AppText language={uiLanguage} variant="title" style={[styles.welcomeTitle, compact ? styles.welcomeTitleCompact : null]}>
            {copy.welcomeTitle}
          </AppText>
          <AppText language={uiLanguage} variant="body" style={[styles.centerText, compact ? styles.centerTextCompact : null]}>
            {copy.welcomeSubtitle}
          </AppText>
          <AppText language={uiLanguage} variant="body" style={[styles.welcomeDescription, compact ? styles.welcomeDescriptionCompact : null]}>
            {copy.welcomeDescription}
          </AppText>
        </Stack>
      </Stack>
    </View>
  );
}

function PasswordStep({
  copy,
  uiLanguage,
  cardWidth,
  compact,
  veryCompact,
  passwords,
  onPasswordChange,
  errorMessage,
  meetsLength,
  meetsNumberOrSymbol,
  meetsUppercase,
}: PasswordStepProps) {
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const rules = [
    { label: copy.passwordRule1, met: meetsLength },
    { label: copy.passwordRule2, met: meetsNumberOrSymbol },
    { label: copy.passwordRule3, met: meetsUppercase },
  ];

  return (
    <View style={[styles.stepPage, { width: cardWidth }]}>
      <Stack gap={compact ? 'lg' : 'xl'}>
        <AppText language={uiLanguage} variant="title" style={[styles.passwordTitle, compact ? styles.passwordTitleCompact : null]}>
          {copy.passwordTitle}
        </AppText>

        {errorMessage ? (
          <AppText language={uiLanguage} variant="caption" style={styles.errorText}>
            {errorMessage}
          </AppText>
        ) : null}

        <Stack gap={compact ? 'md' : 'lg'}>
          <Stack gap="xs">
            <AppText language={uiLanguage} variant="body" style={[styles.passwordFieldLabel, compact ? styles.passwordFieldLabelCompact : null]}>
              {copy.newPassword}
            </AppText>
            <View style={[styles.inputShell, compact ? styles.inputShellCompact : null]}>
              <View style={styles.inputIconBox}>
                <Image source={passwordLockImage} style={styles.inputIcon} contentFit="contain" />
              </View>
              <TextInput
                placeholder=""
                placeholderTextColor={theme.colors.mutedText}
                secureTextEntry={!showNewPassword}
                style={styles.textInput}
                value={passwords.newPassword}
                onChangeText={(value) => onPasswordChange('newPassword', value)}
              />
              <Pressable accessibilityRole="button" style={styles.inputAction} onPress={() => setShowNewPassword((value) => !value)}>
                <Image source={showNewPassword ? hidePasswordImage : showPasswordImage} style={styles.inputEyeIcon} contentFit="contain" />
              </Pressable>
            </View>
          </Stack>

          <Stack gap="xs">
            <AppText language={uiLanguage} variant="body" style={[styles.passwordFieldLabel, compact ? styles.passwordFieldLabelCompact : null]}>
              {copy.confirmPassword}
            </AppText>
            <View style={[styles.inputShell, compact ? styles.inputShellCompact : null]}>
              <View style={styles.inputIconBox}>
                <Image source={passwordLockImage} style={styles.inputIcon} contentFit="contain" />
              </View>
              <TextInput
                placeholder=""
                placeholderTextColor={theme.colors.mutedText}
                secureTextEntry={!showConfirmPassword}
                style={styles.textInput}
                value={passwords.confirmPassword}
                onChangeText={(value) => onPasswordChange('confirmPassword', value)}
              />
              <Pressable accessibilityRole="button" style={styles.inputAction} onPress={() => setShowConfirmPassword((value) => !value)}>
                <Image source={showConfirmPassword ? hidePasswordImage : showPasswordImage} style={styles.inputEyeIcon} contentFit="contain" />
              </Pressable>
            </View>
          </Stack>
        </Stack>

        <Stack gap={compact ? 'sm' : 'md'}>
          {rules.map((rule) => (
            <View key={rule.label} style={styles.ruleRow}>
              <Image source={rule.met ? blueCheckmarkImage : greyPasswordCheckmarkImage} style={styles.ruleIcon} contentFit="contain" />
              <AppText language={uiLanguage} variant="body" style={[styles.ruleText, compact ? styles.ruleTextCompact : null, veryCompact ? styles.ruleTextVeryCompact : null]}>
                {rule.label}
              </AppText>
            </View>
          ))}
        </Stack>
      </Stack>
    </View>
  );
}

function ProfileStep({
  copy,
  uiLanguage,
  cardWidth,
  compact,
  username,
  selectedAvatarPath,
  onUsernameChange,
  onAvatarSelect,
  errorMessage,
}: ProfileStepProps) {
  return (
    <View style={[styles.stepPage, { width: cardWidth }]}>
      <Stack gap={compact ? 'lg' : 'xl'}>
        <Stack gap={compact ? 'sm' : 'md'}>
          <AppText language={uiLanguage} variant="title" style={[styles.sectionTitle, styles.profileTitle, compact ? styles.sectionTitleCompact : null]}>
            {copy.whatToCallYou}
          </AppText>
          <AppText language={uiLanguage} variant="caption" style={[styles.fieldLabel, compact ? styles.fieldLabelCompact : null]}>
            {copy.firstNameLabel}
          </AppText>
          <View style={[styles.simpleInputShell, compact ? styles.simpleInputShellCompact : null]}>
            <TextInput
              placeholder={copy.namePlaceholder}
              placeholderTextColor={theme.colors.mutedText}
              style={styles.simpleTextInput}
              value={username}
              onChangeText={onUsernameChange}
            />
          </View>
        </Stack>

        {errorMessage ? (
          <AppText language={uiLanguage} variant="caption" style={styles.errorText}>
            {errorMessage}
          </AppText>
        ) : null}

        <Stack gap={compact ? 'sm' : 'md'}>
          <AppText language={uiLanguage} variant="title" style={[styles.sectionTitle, compact ? styles.sectionTitleCompact : null]}>
            {copy.chooseAvatar}
          </AppText>
          <View style={[styles.avatarGrid, compact ? styles.avatarGridCompact : null]}>
            {AVATAR_OPTIONS.map((avatar) => (
              <Pressable
                key={avatar.path}
                accessibilityRole="button"
                style={[styles.avatarOption, compact ? styles.avatarOptionCompact : null]}
                onPress={() => onAvatarSelect(avatar.path)}>
                <Image source={avatar.source} style={styles.avatarOptionImage} contentFit="contain" />
                {selectedAvatarPath === avatar.path ? <View style={styles.avatarSelectedRing} /> : null}
              </Pressable>
            ))}
          </View>
        </Stack>
      </Stack>
    </View>
  );
}

function BenefitsStep({ copy, uiLanguage, cardWidth, compact, veryCompact, onContinueFree, onUpgrade }: BenefitsStepProps) {
  const freeBenefits = [copy.freeBenefit1, copy.freeBenefit2, copy.freeBenefit3, copy.freeBenefit4];
  const paidBenefits = [copy.paidBenefit1, copy.paidBenefit2, copy.paidBenefit3, copy.paidBenefit4];

  return (
    <View style={[styles.stepPage, { width: cardWidth }]}>
      <Stack gap={compact ? 'md' : 'lg'} style={styles.benefitsStepContent}>
        <Stack gap="xs" align="center">
          <AppText language={uiLanguage} variant="title" style={[styles.benefitsTitle, compact ? styles.benefitsTitleCompact : null]}>
            {copy.benefitsTitle}
          </AppText>
          <AppText language={uiLanguage} variant="muted" style={[styles.benefitsSubtitle, compact ? styles.benefitsSubtitleCompact : null]}>
            {copy.benefitsSubtitle}
          </AppText>
        </Stack>

        <View style={styles.planCardsRow}>
          <View style={[styles.planCardFree, compact ? styles.planCardCompact : null]}>
            <View style={styles.planPillFree}>
              <AppText language={uiLanguage} variant="caption" style={styles.planPillFreeText}>
                {copy.freeLabel}
              </AppText>
            </View>
            <AppText language={uiLanguage} variant="body" style={[styles.planTitle, compact ? styles.planTitleCompact : null]}>
              {copy.freeTitle}
            </AppText>
            <Stack gap={compact ? 'xs' : 'sm'} style={styles.planFeatureList}>
              {freeBenefits.map((benefit) => (
                <View key={benefit} style={styles.planFeatureRow}>
                  <View style={styles.freeCheckCircle}>
                    <AppText language="en" variant="caption" style={styles.freeCheckMark}>
                      ✓
                    </AppText>
                  </View>
                  <AppText
                    language={uiLanguage}
                    variant="body"
                    style={[styles.planFeatureText, compact ? styles.planFeatureTextCompact : null, veryCompact ? styles.planFeatureTextVeryCompact : null]}>
                    {benefit}
                  </AppText>
                </View>
              ))}
            </Stack>
          </View>

          <View style={[styles.planCardPaid, compact ? styles.planCardCompact : null]}>
            <View style={styles.planPillPaid}>
              <AppText language={uiLanguage} variant="caption" style={styles.planPillPaidText}>
                {copy.fullLabel}
              </AppText>
            </View>
            <AppText language={uiLanguage} variant="body" style={[styles.planTitle, compact ? styles.planTitleCompact : null]}>
              {copy.paidTitle}
            </AppText>
            <Stack gap={compact ? 'xs' : 'sm'} style={styles.planFeatureList}>
              {paidBenefits.map((benefit) => (
                <View key={benefit} style={styles.planFeatureRow}>
                  <View style={styles.paidCheckCircle}>
                    <AppText language="en" variant="caption" style={styles.paidCheckMark}>
                      ✓
                    </AppText>
                  </View>
                  <AppText
                    language={uiLanguage}
                    variant="body"
                    style={[styles.planFeatureText, compact ? styles.planFeatureTextCompact : null, veryCompact ? styles.planFeatureTextVeryCompact : null]}>
                    {benefit}
                  </AppText>
                </View>
              ))}
            </Stack>
          </View>
        </View>

        <View style={styles.benefitsActions}>
          <Pressable accessibilityRole="button" style={[styles.upgradeButton, compact ? styles.upgradeButtonCompact : null]} onPress={onUpgrade}>
            <AppText language={uiLanguage} variant="caption" style={styles.upgradeButtonText}>
              {copy.upgradeCta}
            </AppText>
            <Image source={arrowRightImage} style={styles.upgradeButtonIcon} contentFit="contain" />
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onContinueFree}>
            <AppText language={uiLanguage} variant="caption" style={styles.continueFreeText}>
              {copy.continueFree}
            </AppText>
          </Pressable>
        </View>
      </Stack>
    </View>
  );
}

function ConfirmationStep({ copy, uiLanguage, cardWidth, compact }: StepBaseProps) {
  return (
    <View style={[styles.stepPage, { width: cardWidth }]}>
      <Stack gap={compact ? 'md' : 'lg'} align="center" style={styles.centeredStep}>
        <View style={styles.confirmationBadge}>
          <Image source={blueCheckmarkImage} style={styles.confirmationIcon} contentFit="contain" />
        </View>
        <Stack gap={compact ? 'xs' : 'sm'} align="center">
          <AppText language={uiLanguage} variant="title" style={[styles.sectionTitleCentered, compact ? styles.sectionTitleCenteredCompact : null]}>
            {copy.confirmationTitle}
          </AppText>
          <AppText language={uiLanguage} variant="body" style={[styles.centerText, compact ? styles.centerTextCompact : null]}>
            {copy.confirmationSubtitle}
          </AppText>
          <AppText language={uiLanguage} variant="body" style={styles.confirmationCta}>
            {copy.confirmationCta}
          </AppText>
        </Stack>
      </Stack>
    </View>
  );
}

export function OnboardingScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { uiLanguage, setUiLanguage } = useUiLanguage();
  const { markOnboardingComplete } = useOnboarding();
  const { isLoading: sessionLoading, profile, refreshProfile, user } = useAppSession();

  const copy = getCopy(uiLanguage);
  const scrollRef = useRef<ScrollView | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });
  const [username, setUsername] = useState('');
  const [selectedAvatarPath, setSelectedAvatarPath] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const authProvider = typeof user?.app_metadata?.provider === 'string' ? user.app_metadata.provider : null;
  const skipPasswordStep = Boolean(authProvider && authProvider !== 'email');
  const visibleStepIds = skipPasswordStep ? STEP_IDS.filter((stepId) => stepId !== 1) : STEP_IDS;
  const currentStepIndex = Math.max(0, visibleStepIds.indexOf(currentStep));

  const compact = height <= 700;
  const veryCompact = height <= 620;
  const shellInnerHorizontalPadding = compact ? theme.spacing.md : theme.spacing.lg;
  const shellInnerWidth = Math.max(width - theme.spacing.md * 2 - shellInnerHorizontalPadding * 2 - 2, 240);
  const shellHeight = compact
    ? Math.max(520, Math.min(620, height - insets.top - theme.spacing.sm * 2 - 8))
    : Math.max(620, Math.min(720, height - insets.top - theme.spacing.md * 2 - 12));

  const meetsLength = passwords.newPassword.length >= 8;
  const meetsNumberOrSymbol = /[\d!@#$%^&*(),.?":{}|<>]/.test(passwords.newPassword);
  const meetsUppercase = /[A-Z]/.test(passwords.newPassword);
  const passwordsMatch =
    passwords.newPassword.length > 0 &&
    passwords.confirmPassword.length > 0 &&
    passwords.newPassword === passwords.confirmPassword;

  useEffect(() => {
    if (sessionLoading) {
      return;
    }

    if (!user) {
      router.replace('/(tabs)/account');
      return;
    }

    const profileName = profile?.username || profile?.name || '';
    if (!username && profileName && !isEmailLike(profileName)) {
      setUsername(profileName);
    }

    if (!selectedAvatarPath && profile?.avatar_image && profile?.onboarding_completed) {
      setSelectedAvatarPath(profile.avatar_image);
    }
  }, [profile?.avatar_image, profile?.name, profile?.onboarding_completed, profile?.username, router, selectedAvatarPath, sessionLoading, user, username]);

  useEffect(() => {
    if (skipPasswordStep && currentStep === 1) {
      setCurrentStep(2);
    }
  }, [currentStep, skipPasswordStep]);

  const goToStep = useCallback(
    (nextStep: number) => {
      const boundedStep = visibleStepIds.includes(nextStep) ? nextStep : visibleStepIds[0];
      const nextIndex = visibleStepIds.indexOf(boundedStep);
      setCurrentStep(boundedStep);
      scrollRef.current?.scrollTo({ x: nextIndex * shellInnerWidth, animated: true });
    },
    [shellInnerWidth, visibleStepIds]
  );

  const handlePasswordChange = useCallback((field: PasswordField, value: string) => {
    setPasswords((current) => ({
      ...current,
      [field]: value,
    }));
  }, []);

  const handleSetPassword = useCallback(async () => {
    setErrorMessage('');

    if (!meetsLength || !meetsNumberOrSymbol || !meetsUppercase) {
      setErrorMessage(copy.passwordRequirements);
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage(copy.passwordMismatch);
      return;
    }

    setIsSubmitting(true);
    try {
      await ensureOnboardingUserRecord();
      await setOnboardingPassword(passwords.newPassword);
      setPasswords({ newPassword: '', confirmPassword: '' });
      goToStep(2);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to set password.');
    } finally {
      setIsSubmitting(false);
    }
  }, [copy.passwordMismatch, copy.passwordRequirements, goToStep, meetsLength, meetsNumberOrSymbol, meetsUppercase, passwords.newPassword, passwordsMatch]);

  const handleCompleteProfile = useCallback(async () => {
    setErrorMessage('');

    if (!username.trim()) {
      setErrorMessage(copy.profileNameError);
      return;
    }

    if (!selectedAvatarPath) {
      setErrorMessage(copy.profileAvatarError);
      return;
    }

    setIsSubmitting(true);
    try {
      await ensureOnboardingUserRecord();
      await updateOnboardingProfile({
        username,
        avatarImage: selectedAvatarPath,
      });
      await refreshProfile();
      goToStep(3);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update profile.');
    } finally {
      setIsSubmitting(false);
    }
  }, [copy.profileAvatarError, copy.profileNameError, goToStep, refreshProfile, selectedAvatarPath, username]);

  const handleFinishOnboarding = useCallback(async () => {
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      await completeOnboarding();
      await markOnboardingComplete();
      await refreshProfile();
      router.replace('/(tabs)');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to complete onboarding.');
    } finally {
      setIsSubmitting(false);
    }
  }, [markOnboardingComplete, refreshProfile, router]);

  const handleBack = useCallback(() => {
    setErrorMessage('');
    if (currentStep === 2 && skipPasswordStep) {
      goToStep(0);
      return;
    }
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  }, [currentStep, goToStep, skipPasswordStep]);

  const handleNext = useCallback(() => {
    setErrorMessage('');

    if (currentStep === 0) {
      goToStep(skipPasswordStep ? 2 : 1);
      return;
    }

    if (currentStep === 1) {
      void handleSetPassword();
      return;
    }

    if (currentStep === 2) {
      void handleCompleteProfile();
      return;
    }

    if (currentStep === 4) {
      void handleFinishOnboarding();
      return;
    }

    if (currentStep !== 3) {
      goToStep(currentStep + 1);
    }
  }, [currentStep, goToStep, handleCompleteProfile, handleFinishOnboarding, handleSetPassword, skipPasswordStep]);

  const steps = useMemo(
    () => [
      <WelcomeStep
        key="welcome"
        copy={copy}
        uiLanguage={uiLanguage}
        cardWidth={shellInnerWidth}
        compact={compact}
        veryCompact={veryCompact}
      />,
      ...(skipPasswordStep
        ? []
        : [
            <PasswordStep
              key="password"
              copy={copy}
              uiLanguage={uiLanguage}
              cardWidth={shellInnerWidth}
              compact={compact}
              veryCompact={veryCompact}
              passwords={passwords}
              onPasswordChange={handlePasswordChange}
              errorMessage={currentStep === 1 ? errorMessage : ''}
              meetsLength={meetsLength}
              meetsNumberOrSymbol={meetsNumberOrSymbol}
              meetsUppercase={meetsUppercase}
            />,
          ]),
      <ProfileStep
        key="profile"
        copy={copy}
        uiLanguage={uiLanguage}
        cardWidth={shellInnerWidth}
        compact={compact}
        veryCompact={veryCompact}
        username={username}
        selectedAvatarPath={selectedAvatarPath}
        onUsernameChange={setUsername}
        onAvatarSelect={setSelectedAvatarPath}
        errorMessage={currentStep === 2 ? errorMessage : ''}
      />,
      <BenefitsStep
        key="benefits"
        copy={copy}
        uiLanguage={uiLanguage}
        cardWidth={shellInnerWidth}
        compact={compact}
        veryCompact={veryCompact}
        onContinueFree={() => goToStep(4)}
        onUpgrade={() => router.push('/account/membership')}
      />,
      <ConfirmationStep
        key="confirmation"
        copy={copy}
        uiLanguage={uiLanguage}
        cardWidth={shellInnerWidth}
        compact={compact}
        veryCompact={veryCompact}
      />,
    ],
    [
      compact,
      copy,
      currentStep,
      errorMessage,
      handlePasswordChange,
      meetsLength,
      meetsNumberOrSymbol,
      meetsUppercase,
      passwords,
      router,
      selectedAvatarPath,
      shellInnerWidth,
      skipPasswordStep,
      uiLanguage,
      username,
      veryCompact,
      goToStep,
    ]
  );

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / shellInnerWidth);
    const nextStep = visibleStepIds[nextIndex] ?? visibleStepIds[0];
    if (nextStep !== currentStep) {
      setCurrentStep(nextStep);
      setErrorMessage('');
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.contentContainer, { paddingTop: insets.top + theme.spacing.sm }]}>
        <Stack gap="md">
          <View style={[styles.onboardingShell, compact ? styles.onboardingShellCompact : null, { height: shellHeight, paddingHorizontal: shellInnerHorizontalPadding }]}>
            <View style={styles.shellTopRow}>
              <View style={styles.languageToggleInline}>
                <Pressable accessibilityRole="button" onPress={() => setUiLanguage('en')} style={styles.languageOption}>
                  <AppText language="en" variant="body" style={uiLanguage === 'en' ? styles.languageTextActive : styles.languageText}>
                    EN
                  </AppText>
                </Pressable>
                <AppText language="en" variant="body" style={styles.languageDivider}>
                  |
                </AppText>
                <Pressable accessibilityRole="button" onPress={() => setUiLanguage('th')} style={styles.languageOption}>
                  <AppText language="en" variant="body" style={uiLanguage === 'th' ? styles.languageTextActive : styles.languageText}>
                    TH
                  </AppText>
                </Pressable>
              </View>
            </View>

            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              scrollEnabled={currentStep !== 3 && !isSubmitting}
              showsHorizontalScrollIndicator={false}
              bounces={false}
              decelerationRate="fast"
              onMomentumScrollEnd={handleScrollEnd}
              contentContainerStyle={styles.pagerContent}>
              {steps}
            </ScrollView>

            <View style={styles.shellFooter}>
              <View style={styles.progressRow}>
                {visibleStepIds.map((stepId, index) => (
                  <View key={stepId} style={[styles.progressDot, index === currentStepIndex ? styles.progressDotActive : null]} />
                ))}
              </View>

              <View style={styles.navigationRow}>
                {currentStep > 0 ? (
                  <Pressable accessibilityRole="button" style={[styles.backButton, isSubmitting ? styles.navButtonDisabled : null]} disabled={isSubmitting} onPress={handleBack}>
                    <Image source={arrowLeftImage} style={styles.backButtonIcon} contentFit="contain" />
                    <AppText language={uiLanguage} variant="caption" style={styles.backButtonText}>
                      {copy.back}
                    </AppText>
                  </Pressable>
                ) : (
                  <View style={styles.backButtonPlaceholder} />
                )}

                {currentStep === 3 ? (
                  <View style={styles.nextButtonPlaceholder} />
                ) : (
                  <Pressable accessibilityRole="button" style={[styles.nextButton, isSubmitting ? styles.navButtonDisabled : null]} disabled={isSubmitting} onPress={handleNext}>
                    {isSubmitting ? <ActivityIndicator color={theme.colors.text} size="small" /> : null}
                    <AppText language={uiLanguage} variant="caption" style={styles.nextButtonText}>
                      {currentStep === 4 ? copy.finish : copy.next}
                    </AppText>
                    <Image source={arrowRightImage} style={styles.nextButtonIcon} contentFit="contain" />
                  </Pressable>
                )}
              </View>
            </View>
          </View>

          {sessionLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={theme.colors.text} />
            </View>
          ) : null}
        </Stack>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    justifyContent: 'center',
  },
  onboardingShell: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 28,
    backgroundColor: theme.colors.surface,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  onboardingShellCompact: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  shellTopRow: {
    alignItems: 'flex-end',
    minHeight: 22,
  },
  pagerContent: {
    alignItems: 'stretch',
  },
  stepPage: {
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xs,
  },
  centeredStep: {
    flex: 1,
    justifyContent: 'center',
  },
  languageToggleInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  languageOption: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: 2,
  },
  languageText: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.mutedText,
  },
  languageTextActive: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  languageDivider: {
    fontSize: 18,
    lineHeight: 24,
    color: '#B8B8B8',
  },
  avatarWrap: {
    width: 184,
    height: 184,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  avatarWrapCompact: {
    width: 150,
    height: 150,
  },
  avatarWrapVeryCompact: {
    width: 132,
    height: 132,
  },
  welcomeAvatar: {
    width: '100%',
    height: '100%',
  },
  welcomeTitle: {
    textAlign: 'center',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: theme.typography.weights.bold,
  },
  welcomeTitleCompact: {
    fontSize: 21,
    lineHeight: 26,
  },
  centerText: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  centerTextCompact: {
    fontSize: 14,
    lineHeight: 20,
  },
  welcomeDescription: {
    textAlign: 'center',
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  welcomeDescriptionCompact: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'center',
  },
  sectionTitleCompact: {
    fontSize: 21,
    lineHeight: 26,
  },
  passwordTitle: {
    textAlign: 'center',
    fontSize: 28,
    lineHeight: 34,
  },
  passwordTitleCompact: {
    fontSize: 24,
    lineHeight: 30,
  },
  sectionTitleCentered: {
    textAlign: 'center',
    fontSize: 32,
    lineHeight: 38,
  },
  sectionTitleCenteredCompact: {
    fontSize: 26,
    lineHeight: 31,
  },
  fieldLabel: {
    textAlign: 'center',
    fontWeight: theme.typography.weights.semibold,
  },
  fieldLabelCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  passwordFieldLabel: {
    textAlign: 'center',
    fontSize: 17,
    lineHeight: 24,
    fontWeight: theme.typography.weights.bold,
  },
  passwordFieldLabelCompact: {
    fontSize: 16,
    lineHeight: 22,
  },
  inputShell: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
  },
  inputShellCompact: {
    minHeight: 52,
  },
  inputIconBox: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  inputIcon: {
    width: 20,
    height: 20,
    opacity: 0.45,
  },
  textInput: {
    flex: 1,
    minHeight: 56,
    paddingHorizontal: theme.spacing.sm,
    color: theme.colors.text,
    fontFamily: theme.typography.fonts.en,
    fontSize: theme.typography.sizes.md,
  },
  inputAction: {
    width: 52,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputEyeIcon: {
    width: 22,
    height: 22,
    opacity: 0.45,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  ruleIcon: {
    width: 18,
    height: 18,
  },
  ruleText: {
    flex: 1,
    color: theme.colors.mutedText,
  },
  ruleTextCompact: {
    fontSize: 14,
    lineHeight: 18,
  },
  ruleTextVeryCompact: {
    fontSize: 13,
    lineHeight: 17,
  },
  simpleInputShell: {
    minHeight: 56,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
  },
  simpleInputShellCompact: {
    minHeight: 52,
  },
  simpleTextInput: {
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
  avatarGridCompact: {
    rowGap: theme.spacing.sm,
  },
  avatarOption: {
    width: '23%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOptionCompact: {
    width: '22.5%',
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
  avatarOptionImage: {
    width: '100%',
    height: '100%',
  },
  confirmationBadge: {
    width: 88,
    height: 88,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FCFF',
  },
  confirmationIcon: {
    width: 34,
    height: 34,
  },
  confirmationCta: {
    textAlign: 'center',
    fontWeight: theme.typography.weights.semibold,
  },
  benefitsStepContent: {
    paddingTop: theme.spacing.xs,
    justifyContent: 'flex-start',
  },
  benefitsTitle: {
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
  },
  benefitsTitleCompact: {
    fontSize: 20,
    lineHeight: 24,
  },
  benefitsSubtitle: {
    textAlign: 'center',
    color: '#7A7A7A',
  },
  benefitsSubtitleCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
  planCardsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'stretch',
  },
  planCardFree: {
    flex: 1,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
  },
  planCardPaid: {
    flex: 1,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 18,
    backgroundColor: theme.colors.accentMuted,
    padding: theme.spacing.md,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0,
  },
  planCardCompact: {
    padding: theme.spacing.sm,
  },
  planPillFree: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#EFEFEF',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
  },
  planPillPaid: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
  },
  planPillFreeText: {
    color: '#6E6E6E',
    fontWeight: '800',
  },
  planPillPaidText: {
    color: theme.colors.surface,
    fontWeight: '800',
  },
  planTitle: {
    marginTop: theme.spacing.sm,
    fontWeight: '800',
    fontSize: 16,
    lineHeight: 20,
  },
  planTitleCompact: {
    fontSize: 15,
    lineHeight: 18,
  },
  planFeatureList: {
    marginTop: theme.spacing.md,
  },
  planFeatureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
  },
  freeCheckCircle: {
    width: 18,
    height: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D9D9D9',
    marginTop: 2,
  },
  paidCheckCircle: {
    width: 18,
    height: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7DBE45',
    marginTop: 2,
  },
  freeCheckMark: {
    color: theme.colors.surface,
    fontSize: 11,
    lineHeight: 11,
    fontWeight: '800',
  },
  paidCheckMark: {
    color: theme.colors.surface,
    fontSize: 11,
    lineHeight: 11,
    fontWeight: '800',
  },
  planFeatureText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
  },
  planFeatureTextCompact: {
    fontSize: 13,
    lineHeight: 16,
  },
  planFeatureTextVeryCompact: {
    fontSize: 12,
    lineHeight: 15,
  },
  benefitsActions: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  upgradeButton: {
    minHeight: 46,
    width: '100%',
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.md,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0,
  },
  upgradeButtonCompact: {
    minHeight: 42,
  },
  upgradeButtonText: {
    color: theme.colors.surface,
    fontWeight: '800',
  },
  upgradeButtonIcon: {
    width: 16,
    height: 16,
    tintColor: theme.colors.surface,
  },
  continueFreeText: {
    color: '#7A7A7A',
    textDecorationLine: 'underline',
    fontSize: 12,
    lineHeight: 16,
  },
  profileTitle: {
    marginTop: -10,
  },
  shellFooter: {
    marginTop: theme.spacing.xs,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    width: '100%',
  },
  progressDot: {
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: '#DDDDDD',
  },
  progressDotActive: {
    backgroundColor: theme.colors.text,
  },
  navigationRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButtonPlaceholder: {
    width: 110,
  },
  nextButtonPlaceholder: {
    width: 110,
  },
  backButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backButtonIcon: {
    width: 18,
    height: 18,
  },
  backButtonText: {
    color: theme.colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: theme.typography.weights.semibold,
    textTransform: 'uppercase',
  },
  nextButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 6,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  navButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    color: theme.colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: theme.typography.weights.semibold,
    textTransform: 'uppercase',
  },
  nextButtonIcon: {
    width: 18,
    height: 18,
  },
  errorText: {
    textAlign: 'center',
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.medium,
  },
  loadingRow: {
    alignItems: 'center',
  },
});
