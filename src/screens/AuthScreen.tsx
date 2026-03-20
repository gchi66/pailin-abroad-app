import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { homeHeroImage } from '@/src/assets/app-images';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { LanguageToggle } from '@/src/components/ui/LanguageToggle';
import { Stack } from '@/src/components/ui/Stack';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';

type AuthMode = 'signup' | 'signin';

const GOOGLE_BLUE = '#4285F4';

export function AuthScreen() {
  const { uiLanguage } = useUiLanguage();
  const { authError, isLoading, signIn, signInWithGoogle, signUp } = useAppSession();
  const [mode, setMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const copy = useMemo(
    () =>
      uiLanguage === 'th'
        ? {
            eyebrow: 'Pailin Abroad',
            headline: 'เริ่มเรียนกับเราได้ทันที',
            body: 'สมัครสมาชิกหรือเข้าสู่ระบบเพื่อปลดล็อกเส้นทางการเรียนแบบ native และเชื่อมบัญชีจริงของคุณกับแอป',
            cardTitle: 'สร้างบัญชี',
            signUpTab: 'สมัครสมาชิก',
            signInTab: 'เข้าสู่ระบบ',
            google: 'สมัครด้วย Google',
            divider: 'หรือใช้อีเมล',
            email: 'อีเมล',
            password: 'รหัสผ่าน',
            confirmPassword: 'ยืนยันรหัสผ่าน',
            submitSignUp: 'เริ่มต้นใช้งาน',
            submitSignIn: 'เข้าสู่ระบบ',
            footerSignup: 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ',
            footerSignin: 'ยังไม่มีบัญชี? สมัครสมาชิก',
            passwordMismatch: 'รหัสผ่านไม่ตรงกัน',
            passwordShort: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร',
            passwordRuleOne: 'อย่างน้อย 8 ตัวอักษร',
            passwordRuleTwo: 'มีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว',
            passwordRuleThree: 'มีตัวเลขหรือสัญลักษณ์อย่างน้อย 1 ตัว',
            authSuccess: 'เข้าสู่ระบบสำเร็จ',
            signupSuccess: 'สมัครสำเร็จแล้ว',
            signupConfirm: 'สมัครสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชีก่อน',
            authErrorTitle: 'เกิดข้อผิดพลาด',
            googleLoading: 'กำลังเชื่อมต่อ Google...',
          }
        : {
            eyebrow: 'Pailin Abroad',
            headline: 'Start with a real account',
            body: 'Sign up or sign in to unlock the native learning flow and connect your real account to the app.',
            cardTitle: 'Create your account',
            signUpTab: 'Sign up',
            signInTab: 'Sign in',
            google: 'Continue with Google',
            divider: 'or use email',
            email: 'Email',
            password: 'Password',
            confirmPassword: 'Confirm password',
            submitSignUp: 'Create account',
            submitSignIn: 'Sign in',
            footerSignup: 'Already have an account? Sign in',
            footerSignin: "Don't have an account? Sign up",
            passwordMismatch: 'Passwords do not match.',
            passwordShort: 'Password must be at least 8 characters.',
            passwordRuleOne: 'At least 8 characters',
            passwordRuleTwo: 'At least 1 uppercase letter',
            passwordRuleThree: 'At least 1 number or symbol',
            authSuccess: 'Signed in successfully.',
            signupSuccess: 'Account created successfully.',
            signupConfirm: 'Account created. Check your email to confirm before signing in.',
            authErrorTitle: 'Error',
            googleLoading: 'Connecting Google...',
          },
    [uiLanguage]
  );

  const meetsLength = password.length >= 8;
  const meetsUppercase = /[A-Z]/.test(password);
  const meetsNumberOrSymbol = /[\d!@#$%^&*(),.?":{}|<>]/.test(password);

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
        Alert.alert(copy.cardTitle, copy.authSuccess);
        return;
      }

      const { error, needsEmailConfirmation } = await signUp({ email, password });
      if (error) {
        Alert.alert(copy.authErrorTitle, error);
        return;
      }

      Alert.alert(copy.cardTitle, needsEmailConfirmation ? copy.signupConfirm : copy.signupSuccess);
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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <Stack gap="lg">
        <View style={styles.languageRow}>
          <LanguageToggle />
        </View>

        <View style={styles.heroShell}>
          <View style={styles.heroCopy}>
            <AppText language={uiLanguage} variant="caption" style={styles.eyebrow}>
              {copy.eyebrow}
            </AppText>
            <AppText language={uiLanguage} variant="title" style={styles.headline}>
              {copy.headline}
            </AppText>
            <AppText language={uiLanguage} variant="body" style={styles.heroBody}>
              {copy.body}
            </AppText>
          </View>
          <Image source={homeHeroImage} resizeMode="contain" style={styles.heroImage} />
        </View>

        <Card padding="lg" radius="lg" style={styles.authCard}>
          <Stack gap="md">
            <View style={styles.authHeaderRow}>
              <AppText language={uiLanguage} variant="body" style={styles.cardTitle}>
                {copy.cardTitle}
              </AppText>
              {isLoading ? <ActivityIndicator color={theme.colors.text} /> : null}
            </View>

            <View style={styles.modeSwitch}>
              <Pressable
                accessibilityRole="button"
                style={[styles.modeOption, mode === 'signup' ? styles.modeOptionActive : null]}
                onPress={() => setMode('signup')}>
                <AppText language={uiLanguage} variant="caption" style={mode === 'signup' ? styles.modeOptionTextActive : styles.modeOptionText}>
                  {copy.signUpTab}
                </AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={[styles.modeOption, mode === 'signin' ? styles.modeOptionActive : null]}
                onPress={() => setMode('signin')}>
                <AppText language={uiLanguage} variant="caption" style={mode === 'signin' ? styles.modeOptionTextActive : styles.modeOptionText}>
                  {copy.signInTab}
                </AppText>
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.googleButton,
                pressed && !isGoogleSubmitting ? styles.googleButtonPressed : null,
                isGoogleSubmitting ? styles.googleButtonDisabled : null,
              ]}
              onPress={handleGoogle}
              disabled={isGoogleSubmitting}>
              <View style={styles.googleMark}>
                <AppText variant="caption" style={styles.googleMarkText}>
                  G
                </AppText>
              </View>
              <AppText language={uiLanguage} variant="caption" style={styles.googleButtonText}>
                {isGoogleSubmitting ? copy.googleLoading : copy.google}
              </AppText>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <AppText language={uiLanguage} variant="caption" style={styles.dividerText}>
                {copy.divider}
              </AppText>
              <View style={styles.dividerLine} />
            </View>

            <TextInput
              accessibilityLabel={copy.email}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder={copy.email}
              style={[styles.input, uiLanguage === 'th' ? styles.inputThai : styles.inputEnglish]}
              value={email}
              onChangeText={setEmail}
            />

            <TextInput
              accessibilityLabel={copy.password}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={copy.password}
              secureTextEntry
              style={[styles.input, uiLanguage === 'th' ? styles.inputThai : styles.inputEnglish]}
              value={password}
              onChangeText={setPassword}
            />

            {mode === 'signup' ? (
              <>
                <TextInput
                  accessibilityLabel={copy.confirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder={copy.confirmPassword}
                  secureTextEntry
                  style={[styles.input, uiLanguage === 'th' ? styles.inputThai : styles.inputEnglish]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />

                <View style={styles.ruleBlock}>
                  <PasswordRule language={uiLanguage} text={copy.passwordRuleOne} isMet={meetsLength} />
                  <PasswordRule language={uiLanguage} text={copy.passwordRuleTwo} isMet={meetsUppercase} />
                  <PasswordRule language={uiLanguage} text={copy.passwordRuleThree} isMet={meetsNumberOrSymbol} />
                </View>
              </>
            ) : null}

            {authError ? (
              <AppText language={uiLanguage} variant="caption" style={styles.errorText}>
                {authError}
              </AppText>
            ) : null}

            <Button
              language={uiLanguage}
              title={mode === 'signup' ? copy.submitSignUp : copy.submitSignIn}
              onPress={handleSubmit}
              disabled={isSubmitting || isLoading || isGoogleSubmitting}
              style={styles.submitButton}
            />

            <Pressable accessibilityRole="button" onPress={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
              <AppText language={uiLanguage} variant="caption" style={styles.footerLink}>
                {mode === 'signup' ? copy.footerSignup : copy.footerSignin}
              </AppText>
            </Pressable>
          </Stack>
        </Card>
      </Stack>
    </ScrollView>
  );
}

function PasswordRule({ isMet, language, text }: { isMet: boolean; language: 'en' | 'th'; text: string }) {
  return (
    <View style={styles.ruleRow}>
      <View style={[styles.ruleDot, isMet ? styles.ruleDotMet : null]} />
      <AppText language={language} variant="caption" style={isMet ? styles.ruleTextMet : styles.ruleText}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    paddingTop: theme.spacing.md,
  },
  languageRow: {
    alignItems: 'flex-end',
  },
  heroShell: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    backgroundColor: '#DCEEFF',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  heroCopy: {
    gap: theme.spacing.sm,
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headline: {
    fontSize: theme.typography.sizes['2xl'],
    lineHeight: 42,
  },
  heroBody: {
    color: theme.colors.mutedText,
  },
  heroImage: {
    width: '100%',
    height: 180,
    alignSelf: 'center',
  },
  authCard: {
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 0,
    shadowOffset: {
      width: 4,
      height: 4,
    },
    elevation: 3,
  },
  authHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontWeight: theme.typography.weights.semibold,
    fontSize: theme.typography.sizes.lg,
    lineHeight: theme.typography.lineHeights.lg,
  },
  modeSwitch: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xl,
    backgroundColor: '#F3F6FA',
    padding: 4,
    gap: 4,
  },
  modeOption: {
    flex: 1,
    minHeight: 42,
    borderRadius: theme.radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeOptionActive: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modeOptionText: {
    color: theme.colors.mutedText,
  },
  modeOptionTextActive: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
  },
  googleButton: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xl,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  googleButtonPressed: {
    opacity: 0.92,
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleMark: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: GOOGLE_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleMarkText: {
    color: '#FFFFFF',
    fontWeight: theme.typography.weights.bold,
  },
  googleButtonText: {
    fontWeight: theme.typography.weights.semibold,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#CDD7E2',
  },
  dividerText: {
    color: theme.colors.mutedText,
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.text,
  },
  inputEnglish: {
    fontFamily: theme.typography.fonts.en,
  },
  inputThai: {
    fontFamily: theme.typography.fonts.th,
  },
  ruleBlock: {
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: '#CDD7E2',
    borderRadius: theme.radii.md,
    backgroundColor: '#FAFCFE',
    padding: theme.spacing.md,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  ruleDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#8B97A8',
    backgroundColor: '#FFFFFF',
  },
  ruleDotMet: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.border,
  },
  ruleText: {
    color: theme.colors.mutedText,
  },
  ruleTextMet: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semibold,
  },
  errorText: {
    color: theme.colors.primary,
  },
  submitButton: {
    marginTop: theme.spacing.xs,
  },
  footerLink: {
    textAlign: 'center',
    color: theme.colors.text,
    textDecorationLine: 'underline',
  },
});
