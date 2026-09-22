import { ScriptAwareTextInput } from '@/src/components/ui/ScriptAwareTextInput';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  InputAccessoryView,
  Keyboard,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { completeOnboarding, ensureOnboardingUserRecord, setOnboardingPassword, updateOnboardingProfile } from '@/src/api/onboarding';
import { prefetchPricing } from '@/src/api/pricing';
import arrowLeftImage from '@/assets/images/black-carrot-arrow-left.webp';
import arrowRightImage from '@/assets/images/black-carrot-arrow-right.webp';
import blueCheckmarkImage from '@/assets/images/blue-checkmark.webp';
import fullLogoImage from '@/assets/images/full-logo.webp';
import greyPasswordCheckmarkImage from '@/assets/images/grey-password-checkmark.webp';
import hidePasswordImage from '@/assets/images/hide-password.webp';
import pailinWelcomeImage from '@/assets/images/characters/pailin_blue_circle.webp';
import pailinThumbsUpImage from '@/assets/images/characters/pailin_thumbs_up_head.webp';
import pailinPlanImage from '@/assets/images/speaking-coach/pailin-lesson-finished.webp';
import passwordLockImage from '@/assets/images/password-lock.webp';
import showPasswordImage from '@/assets/images/show-password.webp';
import { AppText } from '@/src/components/ui/AppText';
import { LanguageToggle } from '@/src/components/ui/LanguageToggle';
import { Stack } from '@/src/components/ui/Stack';
import { useAppSession } from '@/src/context/app-session-context';
import { useOnboarding } from '@/src/context/onboarding-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { getPlanPackageMap, getRevenueCatOffering, isRevenueCatAvailable } from '@/src/lib/revenuecat';
import { theme } from '@/src/theme/theme';
import { usePostHog } from 'posthog-react-native';

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
  optionalLabel: string;
  chooseAvatar: string;
  namePlaceholder: string;
  profileNameError: string;
  profileAvatarError: string;
  benefitsTitle: string;
  benefitsSubtitle: string;
  freeTitle: string;
  paidTitle: string;
  freeBenefit1: string;
  freeBenefit2: string;
  freeBenefit3: string;
  paidBenefit1: string;
  paidBenefit2: string;
  paidBenefit3: string;
  paidBenefit4: string;
  paidBenefit5: string;
  pricingFrom: string;
  pricingAmount: string;
  pricingPerMonth: string;
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
  meetsNumberAndSymbol: boolean;
  meetsLetterCases: boolean;
};

type ProfileStepProps = StepBaseProps & {
  username: string;
  selectedAvatarPath: string;
  onUsernameChange: (value: string) => void;
  onAvatarSelect: (value: string) => void;
  errorMessage: string;
  keyboardAccessoryViewID?: string;
  isUsernameOptional?: boolean;
};

type BenefitsStepProps = StepBaseProps & {
  threeMonthMonthlyPrice: string | null;
  onContinueFree: () => void;
  onUpgrade: () => void;
};

const STEP_IDS = [0, 1, 2, 3, 4] as const;
type StepId = (typeof STEP_IDS)[number];

const isEmailLike = (value: string | null | undefined) => {
  if (!value) {
    return false;
  }

  return /\S+@\S+\.\S+/.test(value.trim());
};

const formatStorefrontMonthlyPrice = (currency: string, value: number) => {
  const minimumFractionDigits = currency === 'USD' ? 2 : 0;
  const maximumFractionDigits = currency === 'THB' ? 0 : 2;
  const formattedAmount = value.toLocaleString(undefined, {
    maximumFractionDigits,
    minimumFractionDigits,
  });

  if (currency === 'USD') {
    return `$${formattedAmount}`;
  }

  if (currency === 'THB') {
    return `฿${formattedAmount}`;
  }

  try {
    return new Intl.NumberFormat(undefined, {
      currency,
      maximumFractionDigits,
      minimumFractionDigits,
      style: 'currency',
    }).format(value);
  } catch {
    return `${currency} ${formattedAmount}`;
  }
};

const AVATAR_OPTIONS = [
  { source: require('@/assets/images/characters/avatar1_blue_circle.webp'), path: '/images/characters/avatar1_blue_circle.webp' },
  { source: require('@/assets/images/characters/avatar2_blue_circle.webp'), path: '/images/characters/avatar2_blue_circle.webp' },
  { source: require('@/assets/images/characters/avatar3_blue_circle.webp'), path: '/images/characters/avatar3_blue_circle.webp' },
  { source: require('@/assets/images/characters/avatar4_blue_circle.webp'), path: '/images/characters/avatar4_blue_circle.webp' },
  { source: require('@/assets/images/characters/avatar5_blue_circle.webp'), path: '/images/characters/avatar5_blue_circle.webp' },
  { source: require('@/assets/images/characters/avatar6_blue_circle.webp'), path: '/images/characters/avatar6_blue_circle.webp' },
  { source: require('@/assets/images/characters/avatar7_blue_circle.webp'), path: '/images/characters/avatar7_blue_circle.webp' },
  { source: require('@/assets/images/characters/avatar8_blue_circle.webp'), path: '/images/characters/avatar8_blue_circle.webp' },
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
      passwordRule2: 'มีตัวเลขและอักขระพิเศษอย่างน้อยอย่างละ 1 ตัว',
      passwordRule3: 'มีตัวอักษรพิมพ์ใหญ่และพิมพ์เล็กอย่างน้อยอย่างละ 1 ตัว',
      whatToCallYou: 'อยากให้เราเรียกคุณว่าอะไรดีล่ะ?',
      firstNameLabel: 'ชื่อผู้ใช้',
      optionalLabel: 'ไม่บังคับ',
      chooseAvatar: 'เลือกรูปโปรไฟล์ของคุณกัน',
      namePlaceholder: 'พิมพ์ชื่อของคุณ',
      profileNameError: 'กรุณาใส่ชื่อของคุณ',
      profileAvatarError: 'กรุณาเลือกรูปโปรไฟล์',
      benefitsTitle: 'เลือกแพ็กเกจ',
      benefitsSubtitle: 'ดูสิ่งที่รอคุณอยู่เมื่ออัปเกรด!',
      freeTitle: 'บัญชีฟรี',
      paidTitle: 'สมาชิกแบบเต็ม',
      freeBenefit1: 'บทเรียนฟรี 16 บท',
      freeBenefit2: 'แบบฝึกหัดแนะนำใน Exercise Bank',
      freeBenefit3: 'หัวข้อแนะนำใน Topic Library',
      paidBenefit1: 'ฝึกพูดกับ AI',
      paidBenefit2: 'เข้าถึงคลังบทเรียนทั้งหมด 250+ บท!',
      paidBenefit3: 'เข้าถึง Exercise Bank ทั้งหมด พร้อมแบบฝึกหัด 1,900+ ข้อ!',
      paidBenefit4: 'เข้าถึง Topic Library ทั้งหมด',
      paidBenefit5: 'สถิติความก้าวหน้าแบบละเอียด',
      pricingFrom: 'เริ่มต้น',
      pricingAmount: '฿350',
      pricingPerMonth: '/ เดือน',
      upgradeCta: 'ดูราคา',
      continueFree: 'ไปต่อ',
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
    passwordRule2: 'At least 1 number and 1 special character',
    passwordRule3: 'At least 1 uppercase and 1 lowercase letter',
    whatToCallYou: 'What should we call you?',
    firstNameLabel: 'Username',
    optionalLabel: 'Optional',
    chooseAvatar: 'Choose an avatar',
    namePlaceholder: 'Enter your name',
    profileNameError: 'Please enter your name.',
    profileAvatarError: 'Please select an avatar.',
    benefitsTitle: 'Choose a plan',
    benefitsSubtitle: "See what's waiting for you when you upgrade!",
    freeTitle: 'Free Account',
    paidTitle: 'Full Membership',
    freeBenefit1: '16 free lessons',
    freeBenefit2: 'Featured exercises in Exercise Bank access',
    freeBenefit3: 'Featured topics in Topic Library access',
    paidBenefit1: 'AI-guided speaking practice',
    paidBenefit2: 'Full lesson library access, 250+ lessons!',
    paidBenefit3: 'Full Exercise Bank access, 1,900+ exercises!',
    paidBenefit4: 'Full Topic Library access',
    paidBenefit5: 'Detailed stats on your progress',
    pricingFrom: 'FROM',
    pricingAmount: '฿350',
    pricingPerMonth: '/ month',
    upgradeCta: 'SEE PRICING',
    continueFree: 'CONTINUE',
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
      <Stack gap={compact ? 'md' : 'lg'} align="center" style={styles.centeredStep}>
        <AppText language={uiLanguage} variant="title" style={[styles.welcomeTitle, compact ? styles.welcomeTitleCompact : null]}>
          {copy.welcomeTitle}
        </AppText>
        <View style={[styles.avatarWrap, compact ? styles.avatarWrapCompact : null, veryCompact ? styles.avatarWrapVeryCompact : null]}>
          <Image source={pailinWelcomeImage} style={styles.welcomeAvatar} contentFit="contain" />
        </View>
        <Stack gap={compact ? 'sm' : 'lg'} align="center">
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
  meetsNumberAndSymbol,
  meetsLetterCases,
}: PasswordStepProps) {
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const rules = [
    { label: copy.passwordRule1, met: meetsLength },
    { label: copy.passwordRule2, met: meetsNumberAndSymbol },
    { label: copy.passwordRule3, met: meetsLetterCases },
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
              <ScriptAwareTextInput
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
              <ScriptAwareTextInput
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
  keyboardAccessoryViewID,
  isUsernameOptional,
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
            {isUsernameOptional ? ` (${copy.optionalLabel})` : ''}
          </AppText>
          <View style={[styles.simpleInputShell, compact ? styles.simpleInputShellCompact : null]}>
            <ScriptAwareTextInput
              placeholder={copy.namePlaceholder}
              placeholderTextColor={theme.colors.mutedText}
              style={styles.simpleTextInput}
              inputAccessoryViewID={keyboardAccessoryViewID}
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
                style={[
                  styles.avatarOption,
                  compact ? styles.avatarOptionCompact : null,
                  selectedAvatarPath === avatar.path ? styles.avatarOptionSelected : null,
                ]}
                onPress={() => onAvatarSelect(avatar.path)}>
                <Image source={avatar.source} style={styles.avatarOptionImage} contentFit="contain" />
              </Pressable>
            ))}
          </View>
        </Stack>
      </Stack>
    </View>
  );
}

function BenefitsStep({ copy, uiLanguage, cardWidth, compact, veryCompact, threeMonthMonthlyPrice, onContinueFree, onUpgrade }: BenefitsStepProps) {
  const [selectedPlan, setSelectedPlan] = useState<'paid' | 'free'>('paid');
  const freeBenefits = [copy.freeBenefit1, copy.freeBenefit2, copy.freeBenefit3];
  const paidBenefits = [copy.paidBenefit1, copy.paidBenefit2, copy.paidBenefit3, copy.paidBenefit4, copy.paidBenefit5];
  const isPaidSelected = selectedPlan === 'paid';

  const handlePlanCta = () => {
    if (isPaidSelected) {
      onUpgrade();
      return;
    }

    onContinueFree();
  };

  return (
    <View style={[styles.stepPage, { width: cardWidth }]}>
      <ScrollView
        style={styles.benefitsScroll}
        contentContainerStyle={styles.benefitsScrollContent}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={false}
        bounces={false}
        nestedScrollEnabled>
        <Stack gap={compact ? 'md' : 'lg'} style={styles.benefitsStepContent}>
          <Stack gap="xs" align="center">
            <AppText language={uiLanguage} variant="title" style={[styles.benefitsTitle, compact ? styles.benefitsTitleCompact : null]}>
              {copy.benefitsTitle}
            </AppText>
            <AppText language={uiLanguage} variant="muted" style={[styles.benefitsSubtitle, compact ? styles.benefitsSubtitleCompact : null]}>
              {copy.benefitsSubtitle}
            </AppText>
          </Stack>

          <Stack gap={compact ? 'sm' : 'md'}>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: isPaidSelected }}
              onPress={() => setSelectedPlan('paid')}
              style={[styles.planCard, isPaidSelected ? styles.planCardSelected : null]}>
              <View style={[styles.planCardHeader, isPaidSelected ? styles.planCardHeaderSelected : styles.planCardHeaderUnselected]}>
                <View style={styles.planCardTitleRow}>
                  <View style={[styles.planRadio, isPaidSelected ? styles.planRadioSelected : null]}>
                    {isPaidSelected ? <View style={styles.planRadioDot} /> : null}
                  </View>
                  <AppText language={uiLanguage} variant="body" style={[styles.planTitle, compact ? styles.planTitleCompact : null]}>
                    {copy.paidTitle}
                  </AppText>
                </View>
                <View style={styles.planPriceRow}>
                  <AppText language={uiLanguage} variant="caption" style={styles.planPriceFrom}>{copy.pricingFrom}</AppText>
                  <AppText language={uiLanguage} variant="body" style={styles.planPriceAmount}>
                    {threeMonthMonthlyPrice ?? copy.pricingAmount}
                  </AppText>
                  <AppText language={uiLanguage} variant="caption" style={styles.planPricePeriod}>{copy.pricingPerMonth}</AppText>
                </View>
              </View>
              <View style={[styles.planCardBody, styles.paidPlanCardBody]}>
                <Stack gap={compact ? 'xs' : 'sm'}>
                  {paidBenefits.map((benefit, index) => (
                    <View key={benefit} style={[styles.planFeatureRow, index >= 3 ? styles.planFeatureRowWithImage : null]}>
                      <AppText language="en" variant="body" style={styles.paidCheckMark}>✓</AppText>
                      {index === 0 ? (
                        <View style={styles.newFeatureRow}>
                          <AppText
                            language={uiLanguage}
                            variant="body"
                            numberOfLines={1}
                            style={[
                              styles.planFeatureText,
                              compact ? styles.planFeatureTextCompact : null,
                              veryCompact ? styles.planFeatureTextVeryCompact : null,
                              styles.newFeatureText,
                            ]}>
                            {benefit}
                          </AppText>
                          <AppText
                            language="en"
                            variant="body"
                            style={[
                              styles.featureEmoji,
                              compact ? styles.featureEmojiCompact : null,
                              veryCompact ? styles.featureEmojiVeryCompact : null,
                            ]}>
                            🎉
                          </AppText>
                        </View>
                      ) : (
                        <AppText
                          language={uiLanguage}
                          variant="body"
                          style={[styles.planFeatureText, compact ? styles.planFeatureTextCompact : null, veryCompact ? styles.planFeatureTextVeryCompact : null]}>
                          {benefit}
                        </AppText>
                      )}
                    </View>
                  ))}
                </Stack>
                <Image source={pailinPlanImage} style={styles.pailinPlanImage} contentFit="contain" contentPosition="bottom right" />
              </View>
            </Pressable>

            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: !isPaidSelected }}
              onPress={() => setSelectedPlan('free')}
              style={[styles.planCard, !isPaidSelected ? styles.planCardSelected : null]}>
              <View style={[styles.planCardHeader, !isPaidSelected ? styles.planCardHeaderSelected : styles.planCardHeaderUnselected]}>
                <View style={styles.planCardTitleRow}>
                  <View style={[styles.planRadio, !isPaidSelected ? styles.planRadioSelected : null]}>
                    {!isPaidSelected ? <View style={styles.planRadioDot} /> : null}
                  </View>
                  <AppText language={uiLanguage} variant="body" style={[styles.planTitle, compact ? styles.planTitleCompact : null]}>
                    {copy.freeTitle}
                  </AppText>
                </View>
              </View>
              <View style={styles.planCardBody}>
                <Stack gap={compact ? 'xs' : 'sm'}>
                  {freeBenefits.map((benefit) => (
                  <View key={benefit} style={styles.planFeatureRow}>
                    <AppText language="en" variant="body" style={styles.freeCheckMark}>✓</AppText>
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
            </Pressable>
          </Stack>

          <View style={styles.benefitsActions}>
            <Pressable accessibilityRole="button" style={[styles.upgradeButton, compact ? styles.upgradeButtonCompact : null]} onPress={handlePlanCta}>
              <AppText language={uiLanguage} variant="caption" style={styles.upgradeButtonText}>
                {isPaidSelected ? copy.upgradeCta : copy.continueFree}
              </AppText>
            </Pressable>
          </View>
        </Stack>
      </ScrollView>
    </View>
  );
}

function ConfirmationStep({ copy, uiLanguage, cardWidth, compact }: StepBaseProps) {
  return (
    <View style={[styles.stepPage, { width: cardWidth }]}>
      <Stack gap={compact ? 'lg' : 'xl'} align="center" style={styles.centeredStep}>
        <AppText language={uiLanguage} variant="title" style={[styles.sectionTitleCentered, compact ? styles.sectionTitleCenteredCompact : null]}>
          {copy.confirmationTitle}
        </AppText>
        <Image
          source={pailinThumbsUpImage}
          style={[styles.confirmationImage, compact ? styles.confirmationImageCompact : null]}
          contentFit="contain"
        />
        <AppText language={uiLanguage} variant="body" style={[styles.confirmationMessage, compact ? styles.centerTextCompact : null]}>
          {copy.confirmationSubtitle} {copy.confirmationCta}
        </AppText>
      </Stack>
    </View>
  );
}

export function OnboardingScreen() {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ devtools?: string }>();
  const { uiLanguage } = useUiLanguage();
  const { markOnboardingComplete } = useOnboarding();
  const { hasMembership, isGuestConversionPending, isLoading: sessionLoading, profile, refreshProfile, user } = useAppSession();
  const posthog = usePostHog();
  const keyboardAccessoryId = 'onboarding-keyboard-accessory';

  const copy = getCopy(uiLanguage);
  const scrollRef = useRef<ScrollView | null>(null);
  const hasEnsuredUserRecordRef = useRef(false);
  const ensureUserRecordPromiseRef = useRef<Promise<void> | null>(null);
  const [currentStep, setCurrentStep] = useState<StepId>(0);
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });
  const [username, setUsername] = useState('');
  const [selectedAvatarPath, setSelectedAvatarPath] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [threeMonthMonthlyPrice, setThreeMonthMonthlyPrice] = useState<string | null>(null);
  const authProvider = typeof user?.app_metadata?.provider === 'string' ? user.app_metadata.provider : null;
  const isAppleAuthProvider = authProvider === 'apple';
  const isDevtoolsMode = params.devtools === '1' && profile?.is_admin === true;
  const skipPasswordStep = !isDevtoolsMode && Boolean(authProvider && authProvider !== 'email');
  const skipBenefitsStep = !isDevtoolsMode && (hasMembership || isGuestConversionPending);
  const visibleStepIds = useMemo<StepId[]>(
    () =>
      STEP_IDS.filter((stepId) => {
        if (skipPasswordStep && stepId === 1) {
          return false;
        }
        if (skipBenefitsStep && stepId === 3) {
          return false;
        }
        return true;
      }) as StepId[],
    [skipBenefitsStep, skipPasswordStep]
  );
  const currentStepIndex = Math.max(0, visibleStepIds.indexOf(currentStep));

  const availableShellHeight =
    height - insets.top - insets.bottom - theme.spacing.sm - theme.spacing.md;
  const compact =
    Platform.OS === 'android'
      ? availableShellHeight <= 700 || width <= 380 || fontScale >= 1.15
      : height <= 700;
  const veryCompact =
    Platform.OS === 'android'
      ? availableShellHeight <= 620 || width <= 340 || fontScale >= 1.3
      : height <= 620;
  const shellInnerHorizontalPadding = theme.spacing.sm;
  const shellInnerWidth = Math.max(width - theme.spacing.md * 2 - shellInnerHorizontalPadding * 2 - 2, 240);
  const shellMaxHeight = currentStep === 3 ? (compact ? 600 : 650) : (compact ? 540 : 570);
  const shellHeight = Math.max(0, Math.min(shellMaxHeight, availableShellHeight));

  const meetsLength = passwords.newPassword.length >= 8;
  const meetsNumber = /\d/.test(passwords.newPassword);
  const meetsSymbol = /[!@#$%^&*(),.?":{}|<>_;'\-+=/\\[\]~`]/.test(passwords.newPassword);
  const meetsNumberAndSymbol = meetsNumber && meetsSymbol;
  const meetsLetterCases =
    /[A-Z]/.test(passwords.newPassword) &&
    /[a-z]/.test(passwords.newPassword);
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

  useEffect(() => {
    if (skipBenefitsStep && currentStep === 3) {
      setCurrentStep(4);
    }
  }, [currentStep, skipBenefitsStep]);

  useEffect(() => {
    let cancelled = false;

    const loadThreeMonthPrice = async () => {
      if ((Platform.OS !== 'ios' && Platform.OS !== 'android') || !isRevenueCatAvailable()) {
        return;
      }

      const offering = await getRevenueCatOffering();
      const threeMonthPackage = getPlanPackageMap(offering)['3-month'];
      const totalPrice = threeMonthPackage?.product.price;
      const currency = threeMonthPackage?.product.currencyCode;

      if (
        cancelled ||
        !currency ||
        typeof totalPrice !== 'number' ||
        !Number.isFinite(totalPrice) ||
        totalPrice <= 0
      ) {
        return;
      }

      setThreeMonthMonthlyPrice(formatStorefrontMonthlyPrice(currency, totalPrice / 3));
    };

    void loadThreeMonthPrice();

    return () => {
      cancelled = true;
    };
  }, []);

  const goToStep = useCallback(
    (nextStep: StepId) => {
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

  const ensureUserRecord = useCallback(async () => {
    if (hasEnsuredUserRecordRef.current) {
      return;
    }

    if (!ensureUserRecordPromiseRef.current) {
      ensureUserRecordPromiseRef.current = ensureOnboardingUserRecord()
        .then(() => {
          hasEnsuredUserRecordRef.current = true;
        })
        .finally(() => {
          ensureUserRecordPromiseRef.current = null;
        });
    }

    await ensureUserRecordPromiseRef.current;
  }, []);

  useEffect(() => {
    if (!sessionLoading && user && !isDevtoolsMode) {
      void ensureUserRecord().catch(() => {
        // The submitting step retries and surfaces the error if prefetching fails.
      });
    }
  }, [ensureUserRecord, isDevtoolsMode, sessionLoading, user]);

  const handleSetPassword = useCallback(async () => {
    setErrorMessage('');

    if (isDevtoolsMode) {
      goToStep(2);
      return;
    }

    if (!meetsLength || !meetsNumberAndSymbol || !meetsLetterCases) {
      setErrorMessage(copy.passwordRequirements);
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage(copy.passwordMismatch);
      return;
    }

    setIsSubmitting(true);
    try {
      await ensureUserRecord();
      await setOnboardingPassword(passwords.newPassword);
      setPasswords({ newPassword: '', confirmPassword: '' });
      goToStep(2);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to set password.');
    } finally {
      setIsSubmitting(false);
    }
  }, [copy.passwordMismatch, copy.passwordRequirements, ensureUserRecord, goToStep, isDevtoolsMode, meetsLength, meetsLetterCases, meetsNumberAndSymbol, passwords.newPassword, passwordsMatch]);

  const handleCompleteProfile = useCallback(async () => {
    setErrorMessage('');

    if (isDevtoolsMode) {
      goToStep(3);
      return;
    }

    const resolvedUsername = (
      username ||
      profile?.username ||
      profile?.name ||
      (typeof user?.user_metadata?.username === 'string' ? user.user_metadata.username : '') ||
      (typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name : '') ||
      (typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '')
    ).trim();

    if (!isAppleAuthProvider && !resolvedUsername) {
      setErrorMessage(copy.profileNameError);
      return;
    }

    if (!selectedAvatarPath) {
      setErrorMessage(copy.profileAvatarError);
      return;
    }

    setIsSubmitting(true);
    try {
      await ensureUserRecord();
      await updateOnboardingProfile(
        {
          username: resolvedUsername,
          avatarImage: selectedAvatarPath,
        },
        {
          waitForBackendSync: false,
        }
      );
      goToStep(skipBenefitsStep ? 4 : 3);
      void refreshProfile().catch((error) => {
        console.warn('[onboarding] background profile refresh failed:', error);
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update profile.');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    copy.profileAvatarError,
    copy.profileNameError,
    goToStep,
    isAppleAuthProvider,
    isDevtoolsMode,
    profile?.name,
    profile?.username,
    refreshProfile,
    selectedAvatarPath,
    skipBenefitsStep,
    user?.user_metadata?.full_name,
    user?.user_metadata?.name,
    user?.user_metadata?.username,
    username,
    ensureUserRecord,
  ]);

  const handleFinishOnboarding = useCallback(async () => {
    setErrorMessage('');

    if (isDevtoolsMode) {
      router.replace('/(tabs)/account/profile');
      return;
    }

    setIsSubmitting(true);
    try {
      await completeOnboarding();
      await markOnboardingComplete();
      await refreshProfile();
      posthog.capture('onboarding_completed', {
        skipped_password_step: skipPasswordStep,
        skipped_benefits_step: skipBenefitsStep,
      });
      router.replace('/placement-entry');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to complete onboarding.');
    } finally {
      setIsSubmitting(false);
    }
  }, [isDevtoolsMode, markOnboardingComplete, posthog, refreshProfile, router, skipBenefitsStep, skipPasswordStep]);

  const handleBack = useCallback(() => {
    setErrorMessage('');
    if (currentStep === 2 && skipPasswordStep) {
      goToStep(0);
      return;
    }
    if (currentStep > 0) {
      goToStep(visibleStepIds[currentStepIndex - 1] ?? visibleStepIds[0]);
    }
  }, [currentStep, currentStepIndex, goToStep, skipPasswordStep, visibleStepIds]);

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
      goToStep(visibleStepIds[currentStepIndex + 1] ?? visibleStepIds[visibleStepIds.length - 1]);
    }
  }, [currentStep, currentStepIndex, goToStep, handleCompleteProfile, handleFinishOnboarding, handleSetPassword, skipPasswordStep, visibleStepIds]);

  const steps = useMemo(() => {
    const stepMap: Record<StepId, React.ReactNode> = {
      0: (
        <WelcomeStep
          key="welcome"
          copy={copy}
          uiLanguage={uiLanguage}
          cardWidth={shellInnerWidth}
          compact={compact}
          veryCompact={veryCompact}
        />
      ),
      1: (
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
          meetsNumberAndSymbol={meetsNumberAndSymbol}
          meetsLetterCases={meetsLetterCases}
        />
      ),
      2: (
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
          keyboardAccessoryViewID={Platform.OS === 'ios' ? keyboardAccessoryId : undefined}
          isUsernameOptional={isAppleAuthProvider}
        />
      ),
      3: (
        <BenefitsStep
          key="benefits"
          copy={copy}
          uiLanguage={uiLanguage}
          cardWidth={shellInnerWidth}
          compact={compact}
          veryCompact={veryCompact}
          threeMonthMonthlyPrice={threeMonthMonthlyPrice}
          onContinueFree={() => {
            posthog.capture('onboarding_free_plan_chosen');
            goToStep(4);
          }}
          onUpgrade={() => {
            posthog.capture('onboarding_upgrade_pressed');
            prefetchPricing();
            router.push('/membership?source=onboarding');
          }}
        />
      ),
      4: (
        <ConfirmationStep
          key="confirmation"
          copy={copy}
          uiLanguage={uiLanguage}
          cardWidth={shellInnerWidth}
          compact={compact}
          veryCompact={veryCompact}
        />
      ),
    };

    return visibleStepIds.map((stepId) => stepMap[stepId]);
  }, [
    compact,
    copy,
    currentStep,
    errorMessage,
    handlePasswordChange,
    meetsLength,
    meetsLetterCases,
    meetsNumberAndSymbol,
    passwords,
    router,
    selectedAvatarPath,
    shellInnerWidth,
    isAppleAuthProvider,
    uiLanguage,
    username,
    veryCompact,
    visibleStepIds,
    goToStep,
    threeMonthMonthlyPrice,
    posthog,
  ]);

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
        <Stack gap="md" style={styles.onboardingLayout}>
          <View style={styles.onboardingHeader}>
            <Image source={fullLogoImage} style={styles.onboardingLogo} contentFit="contain" />
            <LanguageToggle />
          </View>
          <View style={[styles.onboardingShell, compact ? styles.onboardingShellCompact : null, { height: shellHeight, paddingHorizontal: shellInnerHorizontalPadding }]}>
            {currentStep !== 4 ? (
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${((currentStepIndex + 1) / visibleStepIds.length) * 100}%` },
                  ]}
                />
              </View>
            ) : null}

            <ScrollView
              ref={scrollRef}
              style={styles.pager}
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
              {currentStep === 4 ? (
                <View style={styles.confirmationFooter}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={isSubmitting}
                    onPress={handleNext}
                    style={[styles.confirmationButton, isSubmitting ? styles.navButtonDisabled : null]}>
                    {isSubmitting ? <ActivityIndicator color={theme.colors.text} size="small" /> : null}
                    <AppText language={uiLanguage} variant="body" style={styles.confirmationButtonText}>
                      {copy.finish}
                    </AppText>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={isSubmitting}
                    onPress={handleBack}
                    style={[styles.backButton, isSubmitting ? styles.navButtonDisabled : null]}>
                    <Image source={arrowLeftImage} style={styles.backButtonIcon} contentFit="contain" />
                    <AppText language={uiLanguage} variant="caption" style={styles.backButtonText}>
                      {copy.back}
                    </AppText>
                  </Pressable>
                </View>
              ) : (
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
                        {copy.next}
                      </AppText>
                      <Image source={arrowRightImage} style={styles.nextButtonIcon} contentFit="contain" />
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          </View>

        </Stack>
      </View>
      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={keyboardAccessoryId}>
          <View style={styles.keyboardAccessoryBar}>
            <View style={styles.keyboardAccessorySpacer} />
            <Pressable accessibilityRole="button" hitSlop={8} onPress={Keyboard.dismiss} style={styles.keyboardAccessoryButton}>
              <AppText language="en" variant="body" style={styles.keyboardAccessoryCheck}>
                ✓
              </AppText>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
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
  },
  onboardingLayout: {
    flex: 1,
    justifyContent: 'center',
  },
  onboardingHeader: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    zIndex: 2,
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.sm,
  },
  onboardingLogo: {
    width: 136,
    height: 30,
  },
  onboardingShell: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 28,
    backgroundColor: theme.colors.surface,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    boxShadow: `4px 4px 0px ${theme.colors.shadow}`,
  },
  onboardingShellCompact: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },
  progressTrack: {
    height: 8,
    overflow: 'hidden',
    marginTop: theme.spacing.xs,
    marginHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xl,
    backgroundColor: '#E8E8E8',
  },
  progressFill: {
    height: '100%',
    borderRadius: theme.radii.xl,
    backgroundColor: '#B9E671',
  },
  pagerContent: {
    alignItems: 'stretch',
  },
  pager: {
    flex: 1,
  },
  stepPage: {
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xs,
  },
  centeredStep: {
    flex: 1,
    justifyContent: 'center',
  },
  avatarWrap: {
    width: 142,
    height: 142,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrapCompact: {
    width: 124,
    height: 124,
  },
  avatarWrapVeryCompact: {
    width: 108,
    height: 108,
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
    fontFamily: theme.typography.fontFaces.en.regular,
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
    fontFamily: theme.typography.fontFaces.en.regular,
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
    borderRadius: 999,
    overflow: 'hidden',
  },
  avatarOptionCompact: {
    width: '22.5%',
  },
  avatarOptionSelected: {
    borderWidth: 2,
    borderColor: theme.colors.text,
  },
  avatarOptionImage: {
    width: '100%',
    height: '100%',
  },
  confirmationImage: {
    width: 156,
    height: 156,
  },
  confirmationImageCompact: {
    width: 128,
    height: 128,
  },
  confirmationMessage: {
    maxWidth: 330,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 25,
  },
  benefitsStepContent: {
    paddingTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
    justifyContent: 'flex-start',
  },
  benefitsScroll: {
    flex: 1,
  },
  benefitsScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: theme.spacing.xs,
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
  planCard: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.surface,
  },
  planCardSelected: {
    boxShadow: '0px 0px 12px #F2CF55',
    elevation: 4,
  },
  planCardHeader: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  planCardHeaderSelected: {
    backgroundColor: '#BCECFF',
  },
  planCardHeaderUnselected: {
    backgroundColor: '#E4E4E4',
  },
  planCardTitleRow: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  planRadio: {
    width: 20,
    height: 20,
    flexShrink: 0,
    borderWidth: 1.5,
    borderColor: '#2563EB',
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planRadioSelected: {
    backgroundColor: theme.colors.surface,
  },
  planRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#2563EB',
  },
  planTitle: {
    fontWeight: '800',
    fontSize: 17,
    lineHeight: 23,
  },
  planTitleCompact: {
    fontSize: 15,
    lineHeight: 20,
  },
  planPriceRow: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  planPriceFrom: {
    color: '#707780',
    fontSize: 9,
    lineHeight: 13,
    letterSpacing: 0.5,
  },
  planPriceAmount: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: theme.typography.weights.bold,
  },
  planPricePeriod: {
    fontSize: 11,
    lineHeight: 16,
  },
  planCardBody: {
    position: 'relative',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  paidPlanCardBody: {
    minHeight: 158,
  },
  planFeatureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  planFeatureRowWithImage: {
    paddingRight: 58,
  },
  freeCheckMark: {
    width: 18,
    color: '#C8C8C8',
    fontSize: 20,
    lineHeight: 20,
  },
  paidCheckMark: {
    width: 18,
    color: '#A9E64D',
    fontSize: 20,
    lineHeight: 20,
  },
  planFeatureText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 17,
  },
  planFeatureTextCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
  planFeatureTextVeryCompact: {
    fontSize: 11,
    lineHeight: 15,
  },
  featureEmoji: {
    flexShrink: 0,
    fontSize: 13,
    lineHeight: 17,
  },
  newFeatureText: {
    flex: 0,
    flexShrink: 1,
  },
  featureEmojiCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
  featureEmojiVeryCompact: {
    fontSize: 11,
    lineHeight: 15,
  },
  newFeatureRow: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  pailinPlanImage: {
    position: 'absolute',
    right: 4,
    bottom: 0,
    width: 74,
    height: 104,
    transform: [{ scaleX: -1 }],
  },
  benefitsActions: {
    width: '100%',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    paddingHorizontal: 4,
  },
  upgradeButton: {
    minHeight: 46,
    width: '100%',
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xl,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.md,
    boxShadow: `2px 2px 0px ${theme.colors.shadow}`,
  },
  upgradeButtonCompact: {
    minHeight: 42,
  },
  upgradeButtonText: {
    color: theme.colors.surface,
    fontWeight: '800',
  },
  keyboardAccessoryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#D7E0E8',
    backgroundColor: '#F7FAFD',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  keyboardAccessorySpacer: {
    flex: 1,
  },
  keyboardAccessoryButton: {
    minWidth: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  keyboardAccessoryCheck: {
    color: '#1A2332',
    fontSize: 22,
    lineHeight: 22,
    fontWeight: '900',
  },
  profileTitle: {
    marginTop: -10,
  },
  shellFooter: {
    marginTop: 'auto',
    paddingBottom: theme.spacing.xs,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  confirmationFooter: {
    width: '100%',
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.sm,
  },
  confirmationButton: {
    width: '100%',
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xl,
    backgroundColor: '#2563EB',
    boxShadow: `3px 3px 0px ${theme.colors.shadow}`,
  },
  confirmationButtonText: {
    color: theme.colors.surface,
    fontWeight: theme.typography.weights.semibold,
    textTransform: 'uppercase',
  },
  navigationRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.sm,
  },
  backButtonPlaceholder: {
    width: 110,
  },
  nextButtonPlaceholder: {
    width: 110,
  },
  backButton: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backButtonIcon: {
    width: 14,
    height: 14,
  },
  backButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: theme.typography.weights.semibold,
    textTransform: 'uppercase',
  },
  nextButton: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  navButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: theme.typography.weights.semibold,
    textTransform: 'uppercase',
  },
  nextButtonIcon: {
    width: 14,
    height: 14,
  },
  errorText: {
    textAlign: 'center',
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.medium,
  },
});
