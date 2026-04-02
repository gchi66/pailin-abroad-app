import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
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

import { AppText } from '@/src/components/ui/AppText';
import { LanguageToggle } from '@/src/components/ui/LanguageToggle';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';

type AuthMode = 'signup' | 'signin';

export function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const { uiLanguage } = useUiLanguage();
  const { authError, isLoading, signIn, signInWithGoogle, signUp } = useAppSession();
  const [mode, setMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const modeAnim = useRef(new Animated.Value(1)).current;

  const copy = useMemo(
    () =>
      uiLanguage === 'th'
        ? {
            wordmark: 'Pailin Abroad',
            signUpTitleLineOne: 'สร้าง',
            signUpTitleAccent: 'บัญชี',
            signUpTitleTail: 'ของคุณ',
            signUpSubtitle: 'Real English, made for Thai speakers.',
            signInTitleLineOne: 'ยินดี',
            signInTitleAccent: 'ต้อนรับ',
            signInTitleTail: 'กลับมา',
            signInSubtitle: 'ดีใจที่ได้เจอคุณอีกครั้ง',
            google: 'สมัครด้วย Google',
            googleLoading: 'กำลังเชื่อมต่อ Google...',
            divider: 'or email',
            email: 'อีเมล',
            password: 'รหัสผ่าน',
            confirmPassword: 'ยืนยันรหัสผ่าน',
            submitSignUp: 'สร้างบัญชี ->',
            submitSignIn: 'เข้าสู่ระบบ ->',
            footerSignupPrefix: 'เป็นสมาชิกอยู่แล้ว? ',
            footerSignupAction: 'เข้าสู่ระบบ',
            footerSigninPrefix: 'ยังไม่ได้เป็นสมาชิก? ',
            footerSigninAction: 'สมัครสมาชิก',
            passwordMismatch: 'รหัสผ่านไม่ตรงกัน',
            passwordShort: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร',
            passwordRuleOne: 'อย่างน้อย 8 ตัวอักษร',
            passwordRuleTwo: 'ตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว',
            passwordRuleThree: 'ตัวเลขหรือสัญลักษณ์อย่างน้อย 1 ตัว',
            authSuccess: 'เข้าสู่ระบบสำเร็จ',
            signupSuccess: 'สร้างบัญชีสำเร็จ',
            signupConfirm: 'สร้างบัญชีสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชีก่อน',
            authErrorTitle: 'เกิดข้อผิดพลาด',
            termsPrefix: 'การสมัครถือว่าคุณยอมรับ ',
            termsTerms: 'ข้อกำหนด',
            termsMiddle: ' และ ',
            termsPrivacy: 'นโยบายความเป็นส่วนตัว',
          }
        : {
            wordmark: 'Pailin Abroad',
            signUpTitleLineOne: 'Create your',
            signUpTitleAccent: 'account.',
            signUpTitleTail: '',
            signUpSubtitle: 'Real English, made for Thai speakers.',
            signInTitleLineOne: 'Welcome',
            signInTitleAccent: 'back.',
            signInTitleTail: '',
            signInSubtitle: 'Good to see you again.',
            google: 'Continue with Google',
            googleLoading: 'Connecting Google...',
            divider: 'or email',
            email: 'Email',
            password: 'Password',
            confirmPassword: 'Confirm password',
            submitSignUp: 'Create account ->',
            submitSignIn: 'Log in ->',
            footerSignupPrefix: 'Already a member? ',
            footerSignupAction: 'Log in',
            footerSigninPrefix: 'Not a member yet? ',
            footerSigninAction: 'Sign up',
            passwordMismatch: 'Passwords do not match.',
            passwordShort: 'Password must be at least 8 characters.',
            passwordRuleOne: 'At least 8 characters',
            passwordRuleTwo: 'At least 1 uppercase letter',
            passwordRuleThree: 'At least 1 number or symbol',
            authSuccess: 'Signed in successfully.',
            signupSuccess: 'Account created successfully.',
            signupConfirm: 'Account created. Check your email to confirm before signing in.',
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

  const meetsLength = password.length >= 8;
  const meetsUppercase = /[A-Z]/.test(password);
  const meetsNumberOrSymbol = /[\d!@#$%^&*(),.?":{}|<>_\-+=/\\[\]~`]/.test(password);
  const isBusy = isSubmitting || isLoading || isGoogleSubmitting;
  const isCompactScreen = height <= 720 || width <= 350;

  const handleSubmit = async () => {
    if (mode === 'signup') {
      if (password.length < 8) {
        Alert.alert(copy.authErrorTitle, copy.passwordShort);
        return;
      }

      if (password !== confirmPassword) {
        Alert.alert(copy.authErrorTitle, copy.passwordMismatch);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signin') {
        const { error } = await signIn({ email, password });
        if (error) {
          Alert.alert(copy.authErrorTitle, error);
          return;
        }
        Alert.alert(copy.authErrorTitle, copy.authSuccess);
        return;
      }

      const { error, needsEmailConfirmation } = await signUp({ email, password });
      if (error) {
        Alert.alert(copy.authErrorTitle, error);
        return;
      }

      Alert.alert(copy.authErrorTitle, needsEmailConfirmation ? copy.signupConfirm : copy.signupSuccess);
      if (needsEmailConfirmation) {
        setMode('signin');
      }
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

  const switchMode = (nextMode: AuthMode) => {
    if (nextMode === mode) {
      return;
    }

    setMode(nextMode);
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
        bounces={false}>
        <View style={[styles.centerShell, isCompactScreen ? styles.centerShellCompact : null]}>
          <View style={[styles.panel, isCompactScreen ? styles.panelCompact : null]}>
            <View style={[styles.topRow, isCompactScreen ? styles.topRowCompact : null]}>
              <AppText language={uiLanguage} variant="caption" style={[styles.wordmark, isCompactScreen ? styles.wordmarkCompact : null]}>
                {copy.wordmark}
              </AppText>
              <LanguageToggle />
            </View>

            <Animated.View style={[styles.headerBlock, isCompactScreen ? styles.headerBlockCompact : null, modeContentStyle]}>
              {mode === 'signup' ? (
                <>
                  <AppText language={uiLanguage} variant="title" style={[styles.headlineLine, isCompactScreen ? styles.headlineLineCompact : null]}>
                    {copy.signUpTitleLineOne}
                  </AppText>
                  <AppText language={uiLanguage} variant="title" style={[styles.headlineLine, isCompactScreen ? styles.headlineLineCompact : null]}>
                    <AppText language={uiLanguage} variant="title" style={[styles.headlineAccent, isCompactScreen ? styles.headlineLineCompact : null]}>
                      {copy.signUpTitleAccent}
                    </AppText>
                    {copy.signUpTitleTail ? ` ${copy.signUpTitleTail}` : ''}
                  </AppText>
                  <AppText language={uiLanguage} variant="caption" style={[styles.subtitle, isCompactScreen ? styles.subtitleCompact : null]}>
                    {copy.signUpSubtitle}
                  </AppText>
                </>
              ) : (
                <>
                  <AppText language={uiLanguage} variant="title" style={[styles.headlineLine, isCompactScreen ? styles.headlineLineCompact : null]}>
                    {copy.signInTitleLineOne}
                  </AppText>
                  <AppText language={uiLanguage} variant="title" style={[styles.headlineLine, isCompactScreen ? styles.headlineLineCompact : null]}>
                    <AppText language={uiLanguage} variant="title" style={[styles.headlineAccent, isCompactScreen ? styles.headlineLineCompact : null]}>
                      {copy.signInTitleAccent}
                    </AppText>
                    {copy.signInTitleTail ? ` ${copy.signInTitleTail}` : ''}
                  </AppText>
                  <AppText language={uiLanguage} variant="caption" style={[styles.subtitle, isCompactScreen ? styles.subtitleCompact : null]}>
                    {copy.signInSubtitle}
                  </AppText>
                </>
              )}
            </Animated.View>

            <View style={[styles.formShell, isCompactScreen ? styles.formShellCompact : null]}>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.googleButton,
                  isCompactScreen ? styles.googleButtonCompact : null,
                  pressed && !isGoogleSubmitting ? styles.buttonPressed : null,
                  isGoogleSubmitting ? styles.buttonDisabled : null,
                ]}
                onPress={handleGoogle}
                disabled={isGoogleSubmitting}>
                <GoogleBadge />
                <AppText language={uiLanguage} variant="caption" style={[styles.googleButtonText, isCompactScreen ? styles.googleButtonTextCompact : null]}>
                  {isGoogleSubmitting ? copy.googleLoading : copy.google}
                </AppText>
              </Pressable>

              <View style={[styles.dividerRow, isCompactScreen ? styles.dividerRowCompact : null]}>
                <View style={styles.dividerLine} />
                <AppText language={uiLanguage} variant="caption" style={styles.dividerText}>
                  {copy.divider}
                </AppText>
                <View style={styles.dividerLine} />
              </View>

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
                  isCompact={isCompactScreen}
                />

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
                  style={styles.fieldSpacing}
                  isCompact={isCompactScreen}
                  trailingAccessory={
                    <PasswordVisibilityButton
                      isVisible={showPassword}
                      onPress={() => setShowPassword((current) => !current)}
                    />
                  }
                />

                {mode === 'signup' ? (
                  <>
                    <FormField
                      uiLanguage={uiLanguage}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder={copy.confirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="password"
                      autoComplete="password"
                      style={styles.fieldSpacing}
                      isCompact={isCompactScreen}
                      trailingAccessory={
                        <PasswordVisibilityButton
                          isVisible={showConfirmPassword}
                          onPress={() => setShowConfirmPassword((current) => !current)}
                        />
                      }
                    />

                    <View style={[styles.rulesCard, isCompactScreen ? styles.rulesCardCompact : null]}>
                      <PasswordRule language={uiLanguage} text={copy.passwordRuleOne} isMet={meetsLength} isCompact={isCompactScreen} />
                      <PasswordRule language={uiLanguage} text={copy.passwordRuleTwo} isMet={meetsUppercase} isCompact={isCompactScreen} />
                      <PasswordRule language={uiLanguage} text={copy.passwordRuleThree} isMet={meetsNumberOrSymbol} isCompact={isCompactScreen} />
                    </View>
                  </>
                ) : null}
              </Animated.View>

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
                  pressed && !isBusy ? styles.buttonPressed : null,
                  isBusy ? styles.buttonDisabled : null,
                ]}
                onPress={handleSubmit}
                disabled={isBusy}>
                {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : null}
                <AppText language={uiLanguage} variant="caption" style={[styles.ctaText, isCompactScreen ? styles.ctaTextCompact : null]}>
                  {mode === 'signup' ? copy.submitSignUp : copy.submitSignIn}
                </AppText>
              </Pressable>

              <Pressable accessibilityRole="button" onPress={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}>
                <AppText language={uiLanguage} variant="caption" style={[styles.footerText, isCompactScreen ? styles.footerTextCompact : null]}>
                  {mode === 'signup' ? copy.footerSignupPrefix : copy.footerSigninPrefix}
                  <AppText language={uiLanguage} variant="caption" style={styles.footerAction}>
                    {mode === 'signup' ? copy.footerSignupAction : copy.footerSigninAction}
                  </AppText>
                </AppText>
              </Pressable>

              {mode === 'signup' ? (
                <AppText language={uiLanguage} variant="caption" style={[styles.termsText, isCompactScreen ? styles.termsTextCompact : null]}>
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
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FormField({
  autoCapitalize,
  autoComplete,
  autoCorrect,
  keyboardType,
  onChangeText,
  placeholder,
  secureTextEntry,
  isCompact,
  style,
  textContentType,
  trailingAccessory,
  uiLanguage,
  value,
}: {
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: 'email' | 'password';
  autoCorrect?: boolean;
  keyboardType?: 'default' | 'email-address';
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  style?: object;
  textContentType?: 'emailAddress' | 'password';
  trailingAccessory?: React.ReactNode;
  isCompact?: boolean;
  uiLanguage: 'en' | 'th';
  value: string;
}) {
  return (
    <View style={[styles.inputShell, isCompact ? styles.inputShellCompact : null, style]}>
      <TextInput
        accessibilityLabel={placeholder}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        autoCorrect={autoCorrect}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor="#B0BFCC"
        secureTextEntry={secureTextEntry}
        selectionColor={theme.colors.text}
        style={[styles.input, isCompact ? styles.inputCompact : null, uiLanguage === 'th' ? styles.inputThai : styles.inputEnglish]}
        textContentType={textContentType}
        value={value}
        onChangeText={onChangeText}
      />
      {trailingAccessory ? <View style={styles.inputAccessory}>{trailingAccessory}</View> : null}
    </View>
  );
}

function PasswordVisibilityButton({ isVisible, onPress }: { isVisible: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" hitSlop={8} onPress={onPress} style={styles.iconButton}>
      <MaterialIcons name={isVisible ? 'visibility-off' : 'visibility'} size={20} color="#8899AA" />
    </Pressable>
  );
}

function PasswordRule({ isMet, isCompact, language, text }: { isMet: boolean; isCompact?: boolean; language: 'en' | 'th'; text: string }) {
  return (
    <View style={styles.ruleRow}>
      <View style={[styles.ruleDot, isCompact ? styles.ruleDotCompact : null, isMet ? styles.ruleDotMet : null]}>
        {isMet ? <MaterialIcons name="check" size={12} color="#1A2332" /> : null}
      </View>
      <AppText language={language} variant="caption" style={[styles.ruleText, isCompact ? styles.ruleTextCompact : null]}>
        {text}
      </AppText>
    </View>
  );
}

function GoogleBadge() {
  return (
    <View style={styles.googleBadgeOuter}>
      <View style={[styles.googleBadgeQuarter, styles.googleBadgeBlue]} />
      <View style={[styles.googleBadgeQuarter, styles.googleBadgeRed]} />
      <View style={[styles.googleBadgeQuarter, styles.googleBadgeYellow]} />
      <View style={[styles.googleBadgeQuarter, styles.googleBadgeGreen]} />
      <View style={styles.googleBadgeInner} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7FAFD',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  centerShell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerShellCompact: {
    justifyContent: 'flex-start',
  },
  panel: {
    width: '100%',
    maxWidth: 360,
  },
  panelCompact: {
    maxWidth: 340,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topRowCompact: {
    marginBottom: 2,
  },
  wordmark: {
    color: '#3CA0FE',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    letterSpacing: 0.96,
    textTransform: 'uppercase',
  },
  wordmarkCompact: {
    fontSize: 11,
    lineHeight: 14,
  },
  headerBlock: {
    marginTop: 18,
    marginBottom: 18,
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
  formShell: {
    gap: 14,
  },
  formShellCompact: {
    gap: 10,
  },
  googleButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#1A2332',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    shadowColor: '#1A2332',
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: {
      width: 1.75,
      height: 1.75,
    },
    elevation: 3,
  },
  googleButtonCompact: {
    minHeight: 50,
    borderRadius: 12,
  },
  googleButtonText: {
    color: '#1A2332',
    fontWeight: '800',
  },
  googleButtonTextCompact: {
    fontSize: 13,
    lineHeight: 16,
  },
  googleBadgeOuter: {
    width: 18,
    height: 18,
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: '#1A2332',
  },
  googleBadgeQuarter: {
    width: 9,
    height: 9,
  },
  googleBadgeBlue: {
    backgroundColor: '#4285F4',
  },
  googleBadgeRed: {
    backgroundColor: '#EA4335',
  },
  googleBadgeYellow: {
    backgroundColor: '#FBBC05',
  },
  googleBadgeGreen: {
    backgroundColor: '#34A853',
  },
  googleBadgeInner: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
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
    shadowColor: '#1A2332',
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: {
      width: 1.75,
      height: 1.75,
    },
    elevation: 3,
  },
  inputShellCompact: {
    minHeight: 50,
    borderRadius: 12,
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
  inputEnglish: {
    fontFamily: theme.typography.fonts.en,
  },
  inputThai: {
    fontFamily: theme.typography.fonts.th,
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
  rulesCard: {
    marginTop: 12,
    gap: 8,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  rulesCardCompact: {
    marginTop: 10,
    gap: 6,
    paddingHorizontal: 2,
    paddingVertical: 0,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ruleDot: {
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#1A2332',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  ruleDotCompact: {
    width: 14,
    height: 14,
    marginRight: 6,
  },
  ruleDotMet: {
    backgroundColor: '#CDEB8B',
  },
  ruleText: {
    flex: 1,
    color: '#1A2332',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  ruleTextCompact: {
    fontSize: 12,
    lineHeight: 15,
  },
  errorText: {
    color: '#FF4545',
    fontWeight: '800',
    textAlign: 'center',
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
    shadowColor: '#1A2332',
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: {
      width: 1.75,
      height: 1.75,
    },
    elevation: 4,
  },
  ctaButtonCompact: {
    minHeight: 50,
    borderRadius: 12,
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
  footerAction: {
    color: '#FF4545',
    fontWeight: '800',
    borderBottomWidth: 1,
    borderBottomColor: '#FF4545',
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
});
