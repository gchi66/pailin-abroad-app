import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import fullLogoImage from '../../assets/images/full-logo.webp';
import { AppText } from '@/src/components/ui/AppText';
import { LanguageToggle } from '@/src/components/ui/LanguageToggle';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { createNeoShadow } from '@/src/theme/shadows';

export function EmailConfirmationScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const { uiLanguage } = useUiLanguage();
  const { resendSignUpEmail } = useAppSession();
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const email = (Array.isArray(params.email) ? params.email[0] : params.email)?.trim() ?? '';

  const copy = useMemo(
    () =>
      uiLanguage === 'th'
        ? {
            heading: 'คุณได้รับอีเมลใหม่!',
            prefix: 'เราได้ส่งอีเมลไปให้คุณที่',
            instructions: 'กรุณาคลิกลิงก์ในอีเมลเพื่อยืนยันอีเมลและดำเนินการสมัครให้เสร็จสมบูรณ์',
            help: 'หากไม่ได้รับอีเมลภายในไม่กี่นาที กรุณาตรวจสอบโฟลเดอร์สแปมหรือจดหมายขยะ หรือส่งอีเมลอีกครั้งด้านล่าง',
            resend: 'ส่งอีเมลอีกครั้ง',
            sending: 'กำลังส่ง...',
            success: 'ส่งอีเมลยืนยันแล้ว! กรุณาตรวจสอบกล่องจดหมายของคุณ',
            failure: 'ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
            missingEmail: 'ไม่พบอีเมล กรุณากลับไปสมัครอีกครั้ง',
          }
        : {
            heading: "You've got mail!",
            prefix: 'We just sent a message to',
            instructions: 'Click the link inside to verify your email and complete your sign-up.',
            help: "If it doesn't arrive within a few minutes, check your spam or junk folder, or resend it below.",
            resend: 'Resend email',
            sending: 'Sending...',
            success: 'Verification email sent! Check your inbox.',
            failure: 'Failed to send the email. Please try again.',
            missingEmail: 'No email was found. Please return and sign up again.',
          },
    [uiLanguage]
  );

  const handleResend = async () => {
    if (!email || isResending) {
      if (!email) {
        setResendStatus({ type: 'error', message: copy.missingEmail });
      }
      return;
    }

    setIsResending(true);
    setResendStatus(null);
    const { error } = await resendSignUpEmail(email);
    setResendStatus({
      type: error ? 'error' : 'success',
      message: error ?? copy.success,
    });
    setIsResending(false);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Math.max(insets.top + 12, 28),
          paddingBottom: Math.max(insets.bottom + 24, 40),
        },
      ]}
      bounces={false}>
      <View style={styles.topRow}>
        <Image source={fullLogoImage} style={styles.logo} contentFit="contain" />
        <LanguageToggle />
      </View>

      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <MaterialIcons name="mark-email-unread" size={42} color="#1A2332" />
        </View>

        <AppText language={uiLanguage} variant="title" style={styles.heading}>
          {copy.heading}
        </AppText>

        <AppText language={uiLanguage} variant="body" style={styles.message}>
          {copy.prefix}
        </AppText>
        {email ? (
          <AppText language={uiLanguage} variant="body" style={styles.email}>
            {email}
          </AppText>
        ) : null}
        <AppText language={uiLanguage} variant="body" style={styles.instructions}>
          {email ? copy.instructions : copy.missingEmail}
        </AppText>

        <View style={styles.divider} />

        <AppText language={uiLanguage} variant="caption" style={styles.help}>
          {copy.help}
        </AppText>

        <Pressable
          accessibilityRole="button"
          disabled={isResending || !email}
          onPress={handleResend}
          style={({ pressed }) => [
            styles.resendButton,
            pressed && styles.buttonPressed,
            (isResending || !email) && styles.buttonDisabled,
          ]}>
          {isResending ? <ActivityIndicator color="#FFFFFF" /> : null}
          <AppText language={uiLanguage} variant="caption" style={styles.resendText}>
            {isResending ? copy.sending : copy.resend}
          </AppText>
        </Pressable>

        {resendStatus ? (
          <AppText
            language={uiLanguage}
            variant="caption"
            style={[styles.status, resendStatus.type === 'error' ? styles.error : styles.success]}>
            {resendStatus.message}
          </AppText>
        ) : null}

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7FAFD',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  topRow: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    width: 142,
    height: 26,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    alignItems: 'center',
    marginVertical: 'auto',
    paddingHorizontal: 24,
    paddingVertical: 32,
    borderWidth: 2,
    borderColor: '#1A2332',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    ...createNeoShadow({
      color: '#1A2332',
      elevation: 4,
      offset: 2,
    }),
  },
  iconCircle: {
    width: 82,
    height: 82,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    borderWidth: 2,
    borderColor: '#1A2332',
    borderRadius: 41,
    backgroundColor: '#DCEEFF',
  },
  heading: {
    color: '#1A2332',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    textAlign: 'center',
  },
  message: {
    marginTop: 18,
    color: '#5A6A7E',
    textAlign: 'center',
  },
  email: {
    marginTop: 4,
    color: '#1A2332',
    fontWeight: '800',
    textAlign: 'center',
  },
  instructions: {
    marginTop: 12,
    color: '#1A2332',
    lineHeight: 23,
    textAlign: 'center',
  },
  divider: {
    width: '100%',
    height: 2,
    marginVertical: 22,
    backgroundColor: '#DCE5ED',
  },
  help: {
    color: '#5A6A7E',
    lineHeight: 20,
    textAlign: 'center',
  },
  resendButton: {
    minHeight: 54,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 22,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: '#FF4545',
    ...createNeoShadow({
      color: '#1A2332',
      elevation: 3,
      offset: 1.75,
    }),
  },
  resendText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ translateY: 1 }],
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  status: {
    marginTop: 16,
    lineHeight: 19,
    textAlign: 'center',
  },
  success: {
    color: '#26703B',
  },
  error: {
    color: '#C73131',
  },
});
