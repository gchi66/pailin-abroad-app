import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Animated,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import googleLogoImage from '../../assets/images/google_logo.png';
import fullLogoImage from '../../assets/images/full-logo.webp';
import { AppText } from '@/src/components/ui/AppText';
import { LanguageToggle } from '@/src/components/ui/LanguageToggle';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { createNeoShadow } from '@/src/theme/shadows';
import { theme } from '@/src/theme/theme';
import { resolveFontFamily } from '@/src/theme/typography';

type AuthMode = 'signup' | 'signin';

export function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const { uiLanguage } = useUiLanguage();
  const { authError, continueAsGuest, isGuestMode, isLoading, signIn, signInWithApple, signInWithGoogle, signUp } = useAppSession();
  const [mode, setMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  const [isAppleSubmitting, setIsAppleSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isGuestSubmitting, setIsGuestSubmitting] = useState(false);
  const modeAnim = useRef(new Animated.Value(1)).current;
  const keyboardAccessoryId = 'auth-keyboard-accessory';

  const copy = useMemo(
    () =>
      uiLanguage === 'th'
        ? {
            signUpTitleLineOne: 'สร้าง',
            signUpTitleAccent: 'บัญชี',
            signUpTitleTail: 'ของคุณ',
            signUpSubtitle: 'Real English, made for Thai speakers.',
            signInTitleLineOne: 'ยินดี',
            signInTitleAccent: 'ต้อนรับ',
            signInTitleTail: 'กลับมา',
            signInSubtitle: 'ดีใจที่ได้เจอคุณอีกครั้ง',
            appleLoading: 'กำลังเชื่อมต่อ Apple...',
            google: 'สมัครด้วย Google',
            googleLoading: 'กำลังเชื่อมต่อ Google...',
            divider: 'or email',
            email: 'อีเมล',
            password: 'รหัสผ่าน',
            submitSignUp: 'สร้างบัญชี ->',
            submitSignIn: 'เข้าสู่ระบบ ->',
            footerSignupPrefix: 'เป็นสมาชิกอยู่แล้ว? ',
            footerSignupAction: 'เข้าสู่ระบบ',
            footerSigninPrefix: 'ยังไม่ได้เป็นสมาชิก? ',
            footerSigninAction: 'สมัครสมาชิก',
            continueGuestPrefix: 'หรือ',
            continueGuestAction: 'เข้าใช้งานแบบผู้เยี่ยมชม',
            authSuccessTitle: 'สำเร็จ',
            authSuccess: 'เข้าสู่ระบบสำเร็จ',
            signupConfirm: 'กรุณาตรวจสอบอีเมล แล้วกดลิงก์เพื่อยืนยันและดำเนินการต่อ',
            authErrorTitle: 'เกิดข้อผิดพลาด',
            termsPrefix: 'การสมัครถือว่าคุณยอมรับ ',
            termsTerms: 'ข้อกำหนด',
            termsMiddle: ' และ ',
            termsPrivacy: 'นโยบายความเป็นส่วนตัว',
          }
        : {
            signUpTitleLineOne: 'Create your',
            signUpTitleAccent: 'account.',
            signUpTitleTail: '',
            signUpSubtitle: 'Real English, made for Thai speakers.',
            signInTitleLineOne: 'Welcome',
            signInTitleAccent: 'back.',
            signInTitleTail: '',
            signInSubtitle: 'Good to see you again.',
            appleLoading: 'Connecting Apple...',
            google: 'Continue with Google',
            googleLoading: 'Connecting Google...',
            divider: 'or email',
            email: 'Email',
            password: 'Password',
            submitSignUp: 'Create account ->',
            submitSignIn: 'Log in ->',
            footerSignupPrefix: 'Already a member? ',
            footerSignupAction: 'Log in',
            footerSigninPrefix: 'Not a member yet? ',
            footerSigninAction: 'Sign up',
            continueGuestPrefix: 'Or ',
            continueGuestAction: 'continue as guest',
            authSuccessTitle: 'Success',
            authSuccess: 'Signed in successfully.',
            signupConfirm: 'Check your email, then tap the link to confirm and continue.',
            authErrorTitle: 'Error',
            termsPrefix: 'By signing up you agree to our ',
            termsTerms: 'Terms',
            termsMiddle: ' and ',
            termsPrivacy: 'Privacy Policy',
          },
    [uiLanguage]
  );

  useEffect(() => {
    modeAnim.setValue(0);
    Animated.timing(modeAnim, {
      duration: 180,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [mode, modeAnim]);

  const isBusy = isSubmitting || isLoading || isAppleSubmitting || isGoogleSubmitting || isGuestSubmitting;
  const isCompactScreen = height <= 720 || width <= 350;
  const isTabletScreen = width >= 768;
  const isLargeTabletScreen = width >= 1024;
  const showAppleButton = Platform.OS === 'ios' && isAppleAvailable;

  useEffect(() => {
    let isMounted = true;

    if (Platform.OS !== 'ios') {
      setIsAppleAvailable(false);
      return () => {
        isMounted = false;
      };
    }

    void AppleAuthentication.isAvailableAsync()
      .then((available) => {
        if (isMounted) {
          setIsAppleAvailable(available);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsAppleAvailable(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isGuestSubmitting && isGuestMode) {
      setIsGuestSubmitting(false);
      router.replace('/(tabs)');
    }
  }, [isGuestMode, isGuestSubmitting, router]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (mode === 'signin') {
        const { error } = await signIn({ email, password });
        if (error) {
          Alert.alert(copy.authErrorTitle, error);
          return;
        }
        Alert.alert(copy.authSuccessTitle, copy.authSuccess);
        return;
      }

      const { error } = await signUp({ email });
      if (error) {
        Alert.alert(copy.authErrorTitle, error);
        return;
      }

      Alert.alert(copy.authSuccessTitle, copy.signupConfirm);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setIsGoogleSubmitting(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        Alert.alert(copy.authErrorTitle, error);
      }
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const handleApple = async () => {
    setIsAppleSubmitting(true);
    try {
      const { error } = await signInWithApple();
      if (error) {
        Alert.alert(copy.authErrorTitle, error);
      }
    } finally {
      setIsAppleSubmitting(false);
    }
  };

  const handleContinueAsGuest = async () => {
    setIsGuestSubmitting(true);
    try {
      await continueAsGuest();
    } catch {
      setIsGuestSubmitting(false);
    }
  };

  const switchMode = (nextMode: AuthMode) => {
    if (nextMode === mode) {
      return;
    }

    setPassword('');
    setShowPassword(false);
    setMode(nextMode);
  };

  const collapseSignUpFields = () => {
    Keyboard.dismiss();
  };

  const modeContentStyle = {
    opacity: modeAnim,
    transform: [
      {
        translateY: modeAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [8, 0],
        }),
      },
    ],
  } as const;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop: Math.max(insets.top + theme.spacing.sm, 28),
            paddingBottom: Math.max(insets.bottom + theme.spacing.xl, 40),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        bounces={false}>
        <View style={[styles.centerShell, isCompactScreen ? styles.centerShellCompact : null]}>
          <View
            style={[
              styles.panel,
              isCompactScreen ? styles.panelCompact : null,
              isTabletScreen ? styles.panelTablet : null,
              isLargeTabletScreen ? styles.panelLargeTablet : null,
            ]}>
            <Pressable onPress={collapseSignUpFields}>
              <View style={[styles.topRow, isCompactScreen ? styles.topRowCompact : null]}>
                <Image
                  source={fullLogoImage}
                  style={[
                    styles.wordmarkLogo,
                    isCompactScreen ? styles.wordmarkLogoCompact : null,
                    isTabletScreen ? styles.wordmarkLogoTablet : null,
                    isLargeTabletScreen ? styles.wordmarkLogoLargeTablet : null,
                  ]}
                  contentFit="contain"
                />
                <LanguageToggle />
              </View>
            </Pressable>

            <Pressable onPress={collapseSignUpFields}>
              <Animated.View
                style={[
                  styles.headerBlock,
                  isCompactScreen ? styles.headerBlockCompact : null,
                  isTabletScreen ? styles.headerBlockTablet : null,
                  isLargeTabletScreen ? styles.headerBlockLargeTablet : null,
                  modeContentStyle,
                ]}>
                {mode === 'signup' ? (
                  <>
                    <AppText
                      language={uiLanguage}
                      variant="title"
                      style={[
                        styles.headlineLine,
                        isCompactScreen ? styles.headlineLineCompact : null,
                        isTabletScreen ? styles.headlineLineTablet : null,
                        isLargeTabletScreen ? styles.headlineLineLargeTablet : null,
                      ]}>
                      {copy.signUpTitleLineOne}
                    </AppText>
                    <AppText
                      language={uiLanguage}
                      variant="title"
                      style={[
                        styles.headlineLine,
                        isCompactScreen ? styles.headlineLineCompact : null,
                        isTabletScreen ? styles.headlineLineTablet : null,
                      ]}>
                      <AppText
                        language={uiLanguage}
                        variant="title"
                        style={[
                          styles.headlineAccent,
                          isCompactScreen ? styles.headlineLineCompact : null,
                          isTabletScreen ? styles.headlineLineTablet : null,
                          isLargeTabletScreen ? styles.headlineLineLargeTablet : null,
                        ]}>
                        {copy.signUpTitleAccent}
                      </AppText>
                      {copy.signUpTitleTail ? ` ${copy.signUpTitleTail}` : ''}
                    </AppText>
                    <AppText
                      language={uiLanguage}
                      variant="caption"
                      style={[
                        styles.subtitle,
                        isCompactScreen ? styles.subtitleCompact : null,
                        isTabletScreen ? styles.subtitleTablet : null,
                        isLargeTabletScreen ? styles.subtitleLargeTablet : null,
                      ]}>
                      {copy.signUpSubtitle}
                    </AppText>
                  </>
                ) : (
                  <>
                    <AppText
                      language={uiLanguage}
                      variant="title"
                      style={[
                        styles.headlineLine,
                        isCompactScreen ? styles.headlineLineCompact : null,
                        isTabletScreen ? styles.headlineLineTablet : null,
                        isLargeTabletScreen ? styles.headlineLineLargeTablet : null,
                      ]}>
                      {copy.signInTitleLineOne}
                    </AppText>
                    <AppText
                      language={uiLanguage}
                      variant="title"
                      style={[
                        styles.headlineLine,
                        isCompactScreen ? styles.headlineLineCompact : null,
                        isTabletScreen ? styles.headlineLineTablet : null,
                      ]}>
                      <AppText
                        language={uiLanguage}
                        variant="title"
                        style={[
                          styles.headlineAccent,
                          isCompactScreen ? styles.headlineLineCompact : null,
                          isTabletScreen ? styles.headlineLineTablet : null,
                          isLargeTabletScreen ? styles.headlineLineLargeTablet : null,
                        ]}>
                        {copy.signInTitleAccent}
                      </AppText>
                      {copy.signInTitleTail ? ` ${copy.signInTitleTail}` : ''}
                    </AppText>
                    <AppText
                      language={uiLanguage}
                      variant="caption"
                      style={[
                        styles.subtitle,
                        isCompactScreen ? styles.subtitleCompact : null,
                        isTabletScreen ? styles.subtitleTablet : null,
                        isLargeTabletScreen ? styles.subtitleLargeTablet : null,
                      ]}>
                      {copy.signInSubtitle}
                    </AppText>
                  </>
                )}
              </Animated.View>
            </Pressable>

            <View
              style={[
                styles.formShell,
                isCompactScreen ? styles.formShellCompact : null,
                isTabletScreen ? styles.formShellTablet : null,
                isLargeTabletScreen ? styles.formShellLargeTablet : null,
              ]}>
              <Pressable onPress={collapseSignUpFields}>
                <View style={styles.socialButtons}>
                  {showAppleButton ? (
                    <View
                      style={[
                        styles.appleButtonShell,
                        isCompactScreen ? styles.appleButtonShellCompact : null,
                        isTabletScreen ? styles.appleButtonShellTablet : null,
                        isLargeTabletScreen ? styles.appleButtonShellLargeTablet : null,
                        isAppleSubmitting ? styles.buttonDisabled : null,
                      ]}>
                      <View
                        style={[
                          styles.appleButtonInner,
                          isCompactScreen ? styles.appleButtonShellCompact : null,
                          isTabletScreen ? styles.appleButtonShellTablet : null,
                          isLargeTabletScreen ? styles.appleButtonShellLargeTablet : null,
                        ]}>
                        {isAppleSubmitting ? (
                          <View style={styles.appleButtonLoadingState}>
                            <ActivityIndicator color="#FFFFFF" />
                            <AppText language={uiLanguage} variant="caption" style={styles.appleButtonLoadingText}>
                              {copy.appleLoading}
                            </AppText>
                          </View>
                        ) : (
                          <AppleAuthentication.AppleAuthenticationButton
                            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                            cornerRadius={isLargeTabletScreen ? 20 : isTabletScreen ? 18 : isCompactScreen ? 12 : 14}
                            onPress={handleApple}
                            style={styles.appleButton}
                          />
                        )}
                      </View>
                    </View>
                  ) : null}

                  <Pressable
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.googleButton,
                      isCompactScreen ? styles.googleButtonCompact : null,
                      isTabletScreen ? styles.googleButtonTablet : null,
                      isLargeTabletScreen ? styles.googleButtonLargeTablet : null,
                      pressed && !isGoogleSubmitting ? styles.buttonPressed : null,
                      isGoogleSubmitting ? styles.buttonDisabled : null,
                    ]}
                    onPress={handleGoogle}
                    disabled={isGoogleSubmitting}>
                    <GoogleBadge />
                    <AppText
                      language={uiLanguage}
                      variant="caption"
                      style={[
                        styles.googleButtonText,
                        isCompactScreen ? styles.googleButtonTextCompact : null,
                        isTabletScreen ? styles.googleButtonTextTablet : null,
                        isLargeTabletScreen ? styles.googleButtonTextLargeTablet : null,
                      ]}>
                      {isGoogleSubmitting ? copy.googleLoading : copy.google}
                    </AppText>
                  </Pressable>
                </View>
              </Pressable>

              <Pressable onPress={collapseSignUpFields}>
                <View style={[styles.dividerRow, isCompactScreen ? styles.dividerRowCompact : null]}>
                  <View style={styles.dividerLine} />
                  <AppText language={uiLanguage} variant="caption" style={styles.dividerText}>
                    {copy.divider}
                  </AppText>
                  <View style={styles.dividerLine} />
                </View>
              </Pressable>

              <Animated.View style={modeContentStyle}>
                <FormField
                  uiLanguage={uiLanguage}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={copy.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="emailAddress"
                  autoComplete="email"
                  inputAccessoryViewID={Platform.OS === 'ios' ? keyboardAccessoryId : undefined}
                  isCompact={isCompactScreen}
                  isTablet={isTabletScreen}
                  isLargeTablet={isLargeTabletScreen}
                />

                {mode === 'signin' ? (
                    <FormField
                      uiLanguage={uiLanguage}
                      value={password}
                      onChangeText={setPassword}
                      placeholder={copy.password}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="password"
                      autoComplete="password"
                      inputAccessoryViewID={Platform.OS === 'ios' ? keyboardAccessoryId : undefined}
                      style={styles.fieldSpacing}
                      isCompact={isCompactScreen}
                      isTablet={isTabletScreen}
                      isLargeTablet={isLargeTabletScreen}
                      trailingAccessory={
                        <PasswordVisibilityButton
                          isVisible={showPassword}
                          onPress={() => setShowPassword((current) => !current)}
                        />
                      }
                    />

                ) : null}
              </Animated.View>

              <Pressable onPress={collapseSignUpFields}>
                <View style={styles.footerStack}>
                  {authError ? (
                    <AppText language={uiLanguage} variant="caption" style={styles.errorText}>
                      {authError}
                    </AppText>
                  ) : null}

                  <Pressable
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.ctaButton,
                      isCompactScreen ? styles.ctaButtonCompact : null,
                      isTabletScreen ? styles.ctaButtonTablet : null,
                      isLargeTabletScreen ? styles.ctaButtonLargeTablet : null,
                      pressed && !isBusy ? styles.buttonPressed : null,
                      isBusy ? styles.buttonDisabled : null,
                    ]}
                    onPress={handleSubmit}
                    disabled={isBusy}>
                    {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : null}
                    <AppText
                      language={uiLanguage}
                      variant="caption"
                      style={[
                        styles.ctaText,
                        isCompactScreen ? styles.ctaTextCompact : null,
                        isTabletScreen ? styles.ctaTextTablet : null,
                        isLargeTabletScreen ? styles.ctaTextLargeTablet : null,
                      ]}>
                      {mode === 'signup' ? copy.submitSignUp : copy.submitSignIn}
                    </AppText>
                  </Pressable>

                  <Pressable accessibilityRole="button" onPress={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}>
                    <AppText
                      language={uiLanguage}
                      variant="caption"
                      style={[
                        styles.footerText,
                        isCompactScreen ? styles.footerTextCompact : null,
                        isTabletScreen ? styles.footerTextTablet : null,
                        isLargeTabletScreen ? styles.footerTextLargeTablet : null,
                      ]}>
                      {mode === 'signup' ? copy.footerSignupPrefix : copy.footerSigninPrefix}
                      <AppText language={uiLanguage} variant="caption" style={styles.footerAction}>
                        {mode === 'signup' ? copy.footerSignupAction : copy.footerSigninAction}
                      </AppText>
                    </AppText>
                  </Pressable>

                  <Pressable accessibilityRole="button" onPress={handleContinueAsGuest}>
                    <AppText
                      language={uiLanguage}
                      variant="caption"
                      style={[
                        styles.guestLinkText,
                        isCompactScreen ? styles.footerTextCompact : null,
                        isTabletScreen ? styles.footerTextTablet : null,
                        isLargeTabletScreen ? styles.footerTextLargeTablet : null,
                      ]}>
                      {copy.continueGuestPrefix}
                      <AppText language={uiLanguage} variant="caption" style={styles.guestLinkUnderline}>
                        {copy.continueGuestAction}
                      </AppText>
                    </AppText>
                  </Pressable>

                  {mode === 'signup' ? (
                    <AppText
                      language={uiLanguage}
                      variant="caption"
                      style={[
                        styles.termsText,
                        isCompactScreen ? styles.termsTextCompact : null,
                        isTabletScreen ? styles.termsTextTablet : null,
                        isLargeTabletScreen ? styles.termsTextLargeTablet : null,
                      ]}>
                      {copy.termsPrefix}
                      <AppText language={uiLanguage} variant="caption" style={styles.termsAction}>
                        {copy.termsTerms}
                      </AppText>
                      {copy.termsMiddle}
                      <AppText language={uiLanguage} variant="caption" style={styles.termsAction}>
                        {copy.termsPrivacy}
                      </AppText>
                    </AppText>
                  ) : null}
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={keyboardAccessoryId}>
          <View style={styles.keyboardAccessoryBar}>
            <View style={styles.keyboardAccessorySpacer} />
            <Pressable accessibilityRole="button" hitSlop={8} onPress={Keyboard.dismiss} style={styles.keyboardAccessoryButton}>
              <MaterialIcons name="check" size={20} color="#1A2332" />
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function FormField({
  autoCapitalize,
  autoComplete,
  autoCorrect,
  keyboardType,
  onChangeText,
  onFocus,
  placeholder,
  secureTextEntry,
  inputAccessoryViewID,
  isCompact,
  isTablet,
  isLargeTablet,
  style,
  textContentType,
  trailingAccessory,
  uiLanguage,
  value,
}: {
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: 'email' | 'password' | 'new-password';
  autoCorrect?: boolean;
  keyboardType?: 'default' | 'email-address';
  onChangeText: (value: string) => void;
  onFocus?: () => void;
  placeholder: string;
  secureTextEntry?: boolean;
  inputAccessoryViewID?: string;
  style?: object;
  textContentType?: 'emailAddress' | 'password' | 'newPassword';
  trailingAccessory?: React.ReactNode;
  isCompact?: boolean;
  isTablet?: boolean;
  isLargeTablet?: boolean;
  uiLanguage: 'en' | 'th';
  value: string;
}) {
  return (
    <View
      style={[
        styles.inputShell,
        isCompact ? styles.inputShellCompact : null,
        isTablet ? styles.inputShellTablet : null,
        isLargeTablet ? styles.inputShellLargeTablet : null,
        style,
      ]}>
      <TextInput
        accessibilityLabel={placeholder}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        autoCorrect={autoCorrect}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor="#B0BFCC"
        inputAccessoryViewID={inputAccessoryViewID}
        secureTextEntry={secureTextEntry}
        selectionColor={theme.colors.text}
        style={[
          styles.input,
          isCompact ? styles.inputCompact : null,
          isTablet ? styles.inputTablet : null,
          isLargeTablet ? styles.inputLargeTablet : null,
          uiLanguage === 'th' ? styles.inputThai : styles.inputEnglish,
        ]}
        textContentType={textContentType}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
      />
      {trailingAccessory ? <View style={styles.inputAccessory}>{trailingAccessory}</View> : null}
    </View>
  );
}

function PasswordVisibilityButton({
  isVisible,
  onPress,
}: {
  isVisible: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" hitSlop={8} onPress={onPress} style={styles.iconButton}>
      <MaterialIcons name={isVisible ? 'visibility-off' : 'visibility'} size={20} color="#8899AA" />
    </Pressable>
  );
}

function GoogleBadge() {
  return <Image source={googleLogoImage} style={styles.googleBadgeImage} contentFit="contain" />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7FAFD',
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  centerShell: {
    flexGrow: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerShellCompact: {
    justifyContent: 'flex-start',
  },
  panel: {
    width: '100%',
  },
  panelTablet: {
    maxWidth: 520,
  },
  panelLargeTablet: {
    maxWidth: 680,
  },
  panelCompact: {},
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topRowCompact: {
    marginBottom: 2,
  },
  wordmarkLogo: {
    width: 142,
    height: 26,
  },
  wordmarkLogoCompact: {
    width: 128,
    height: 24,
  },
  wordmarkLogoTablet: {
    width: 176,
    height: 32,
  },
  wordmarkLogoLargeTablet: {
    width: 210,
    height: 38,
  },
  headerBlock: {
    marginTop: 18,
    marginBottom: 18,
  },
  headerBlockTablet: {
    marginTop: 24,
    marginBottom: 24,
  },
  headerBlockLargeTablet: {
    marginTop: 30,
    marginBottom: 30,
  },
  headerBlockCompact: {
    marginTop: 14,
    marginBottom: 14,
  },
  headlineLine: {
    fontSize: 28,
    lineHeight: 31,
    fontWeight: '900',
    color: '#1A2332',
  },
  headlineLineCompact: {
    fontSize: 24,
    lineHeight: 27,
  },
  headlineLineTablet: {
    fontSize: 40,
    lineHeight: 44,
  },
  headlineLineLargeTablet: {
    fontSize: 52,
    lineHeight: 56,
  },
  headlineAccent: {
    fontSize: 28,
    lineHeight: 31,
    fontWeight: '900',
    color: '#1A2332',
  },
  subtitle: {
    marginTop: 8,
    color: '#5A6A7E',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  subtitleCompact: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 16,
  },
  subtitleTablet: {
    marginTop: 10,
    fontSize: 17,
    lineHeight: 24,
  },
  subtitleLargeTablet: {
    marginTop: 12,
    fontSize: 20,
    lineHeight: 28,
  },
  formShell: {
    gap: 14,
  },
  formShellTablet: {
    gap: 18,
  },
  formShellLargeTablet: {
    gap: 22,
  },
  formShellCompact: {
    gap: 10,
  },
  socialButtons: {
    gap: 12,
    marginTop: 6,
  },
  appleButtonShell: {
    height: 50,
    borderRadius: 14,
    ...createNeoShadow({
      color: '#1A2332',
      elevation: 3,
      offset: 1.75,
    }),
  },
  appleButtonInner: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  appleButtonShellCompact: {
    height: 46,
    borderRadius: 12,
  },
  appleButtonShellTablet: {
    height: 62,
    borderRadius: 18,
  },
  appleButtonShellLargeTablet: {
    height: 72,
    borderRadius: 20,
  },
  appleButton: {
    width: '100%',
    height: '100%',
  },
  appleButtonLoadingState: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#111111',
    paddingHorizontal: 14,
  },
  appleButtonLoadingText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  googleButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#1A2332',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    ...createNeoShadow({
      color: '#1A2332',
      elevation: 3,
      offset: 1.75,
    }),
  },
  googleButtonCompact: {
    minHeight: 50,
    borderRadius: 12,
  },
  googleButtonTablet: {
    minHeight: 68,
    borderRadius: 18,
    paddingHorizontal: 18,
  },
  googleButtonLargeTablet: {
    minHeight: 78,
    borderRadius: 20,
    paddingHorizontal: 22,
  },
  googleButtonText: {
    color: '#1A2332',
    fontWeight: '800',
    fontSize: 17,
    lineHeight: 21,
  },
  googleButtonTextTablet: {
    fontSize: 19,
    lineHeight: 24,
  },
  googleButtonTextLargeTablet: {
    fontSize: 22,
    lineHeight: 28,
  },
  googleButtonTextCompact: {
    fontSize: 13,
    lineHeight: 16,
  },
  googleBadgeImage: {
    width: 20,
    height: 20,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 2,
  },
  dividerRowCompact: {
    marginVertical: 0,
  },
  dividerLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#1A2332',
  },
  dividerText: {
    color: '#1A2332',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  inputShell: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#1A2332',
    backgroundColor: '#FFFFFF',
    paddingLeft: 14,
    paddingRight: 10,
    ...createNeoShadow({
      color: '#1A2332',
      elevation: 3,
      offset: 1.75,
    }),
  },
  inputShellCompact: {
    minHeight: 50,
    borderRadius: 12,
  },
  inputShellTablet: {
    minHeight: 68,
    borderRadius: 18,
    paddingLeft: 18,
    paddingRight: 14,
  },
  inputShellLargeTablet: {
    minHeight: 78,
    borderRadius: 20,
    paddingLeft: 22,
    paddingRight: 18,
  },
  input: {
    flex: 1,
    minHeight: 52,
    color: '#1A2332',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    paddingVertical: 0,
  },
  inputCompact: {
    minHeight: 46,
    fontSize: 14,
    lineHeight: 18,
  },
  inputTablet: {
    minHeight: 62,
    fontSize: 19,
    lineHeight: 24,
  },
  inputLargeTablet: {
    minHeight: 72,
    fontSize: 22,
    lineHeight: 28,
  },
  inputEnglish: {
    fontFamily: Platform.OS === 'android' ? resolveFontFamily('en', { weight: '600' }) : theme.typography.fontFaces.en.regular,
  },
  inputThai: {
    fontFamily: Platform.OS === 'android' ? resolveFontFamily('th', { weight: '600' }) : theme.typography.fontFaces.th.regular,
  },
  inputAccessory: {
    marginLeft: 8,
  },
  iconButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldSpacing: {
    marginTop: 12,
  },
  errorText: {
    color: '#FF4545',
    fontWeight: '800',
    textAlign: 'center',
  },
  footerStack: {
    gap: 14,
  },
  ctaButton: {
    minHeight: 56,
    marginTop: 2,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#1A2332',
    backgroundColor: '#FF4545',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...createNeoShadow({
      color: '#1A2332',
      elevation: 4,
      offset: 1.75,
    }),
  },
  ctaButtonCompact: {
    minHeight: 50,
    borderRadius: 12,
  },
  ctaButtonTablet: {
    minHeight: 68,
    borderRadius: 18,
  },
  ctaButtonLargeTablet: {
    minHeight: 78,
    borderRadius: 20,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
  },
  ctaTextCompact: {
    fontSize: 14,
    lineHeight: 16,
  },
  ctaTextTablet: {
    fontSize: 19,
    lineHeight: 24,
  },
  ctaTextLargeTablet: {
    fontSize: 22,
    lineHeight: 28,
  },
  footerText: {
    marginTop: 2,
    textAlign: 'center',
    color: '#7A8998',
    fontWeight: '600',
  },
  footerTextCompact: {
    marginTop: 0,
    fontSize: 12,
    lineHeight: 16,
  },
  footerTextTablet: {
    fontSize: 17,
    lineHeight: 22,
  },
  footerTextLargeTablet: {
    fontSize: 20,
    lineHeight: 26,
  },
  footerAction: {
    color: '#FF4545',
    fontWeight: '800',
    borderBottomWidth: 1,
    borderBottomColor: '#FF4545',
  },
  guestLinkText: {
    textAlign: 'center',
    color: '#7A8998',
    fontWeight: '700',
  },
  guestLinkUnderline: {
    color: '#7A8998',
    textDecorationLine: 'underline',
  },
  termsText: {
    textAlign: 'center',
    color: '#AAB8C5',
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '600',
  },
  termsTextCompact: {
    fontSize: 9,
    lineHeight: 13,
  },
  termsTextTablet: {
    fontSize: 12,
    lineHeight: 18,
  },
  termsTextLargeTablet: {
    fontSize: 14,
    lineHeight: 20,
  },
  termsAction: {
    color: '#AAB8C5',
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  buttonPressed: {
    transform: [{ translateX: 1 }, { translateY: 1 }],
    shadowOffset: {
      width: 1.75,
      height: 1.75,
    },
  },
  buttonDisabled: {
    opacity: 0.72,
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
});
