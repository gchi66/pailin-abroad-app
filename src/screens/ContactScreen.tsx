import { ScriptAwareTextInput } from '@/src/components/ui/ScriptAwareTextInput';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { submitContactMessage } from '@/src/api/contact';
import { AccountPageHeader } from '@/src/components/ui/AccountPageHeader';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { NeoShadowView } from '@/src/components/ui/NeoShadowView';
import { Stack } from '@/src/components/ui/Stack';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
import { FLOATING_TAB_BAR_PAGE_BOTTOM_PADDING } from '@/src/components/navigation/layout';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { FACEBOOK_URL, INSTAGRAM_URL, LINE_URL } from '@/src/config/social';
import { theme } from '@/src/theme/theme';

type ContactFormState = {
  name: string;
  email: string;
  message: string;
};

type Status = 'idle' | 'sending' | 'success' | 'error';

const INITIAL_FORM_STATE: ContactFormState = {
  name: '',
  email: '',
  message: '',
};

const SOCIAL_LINKS = [
  {
    key: 'instagram',
    label: 'Instagram',
    url: INSTAGRAM_URL,
    icon: require('@/assets/images/instagram_icon.png'),
  },
  {
    key: 'line',
    label: 'LINE',
    url: LINE_URL,
    icon: require('@/assets/images/line_icon.png'),
  },
  {
    key: 'facebook',
    label: 'Facebook',
    url: FACEBOOK_URL,
    icon: require('@/assets/images/facebook_icon.png'),
  },
] as const;

const getCopy = (uiLanguage: 'en' | 'th') => {
  if (uiLanguage === 'th') {
    return {
      title: 'ติดต่อเรา',
      back: 'ย้อนกลับ',
      subtitle: 'เรายินดีรับฟังคำถามและความคิดเห็นจากคุณเสมอ',
      intro:
        'เราพร้อมช่วยเหลือคุณ หากต้องการติดต่อเรา กรุณาส่งข้อความผ่านช่องทางต่อไปนี้ หรือกรอกแบบฟอร์มด้านล่าง',
      nameLabel: 'ชื่อ',
      namePlaceholder: 'ชื่อ',
      emailLabel: 'อีเมล',
      emailPlaceholder: 'อีเมล',
      messageLabel: 'พิมพ์คำถาม ข้อเสนอแนะ หรือความคิดเห็นของคุณ กรุณาเขียนรายละเอียดให้มากที่สุดเท่าที่จะทำได้',
      messagePlaceholder: 'พิมพ์ข้อความของคุณที่นี่...',
      submit: 'ส่งข้อความ',
      sending: 'กำลังส่ง...',
      emptyFields: 'กรุณากรอกชื่อ อีเมล และข้อความให้ครบถ้วน',
      success: 'ส่งข้อความสำเร็จแล้ว! เราจะติดต่อกลับโดยเร็วที่สุด',
      failedMessage: 'ส่งข้อความไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
      unexpectedMessage: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
      failedSocial: 'ไม่สามารถเปิดลิงก์นี้ได้ในขณะนี้',
    };
  }

  return {
    title: 'Contact Us',
    back: 'Back',
    subtitle: 'We love to hear from you! Ask us your questions or leave your feedback.',
    intro:
      'We’re here to help. To contact us, please message us through any of the following platforms, or fill out the form below.',
    nameLabel: 'Name',
    namePlaceholder: 'Name',
    emailLabel: 'Email',
    emailPlaceholder: 'Email',
    messageLabel: 'Type your question, suggestion, or feedback. Please provide as much detail as possible.',
    messagePlaceholder: 'Your message here...',
    submit: 'Send',
    sending: 'Sending...',
    emptyFields: 'Please fill in your name, email, and message.',
    success: "Message sent successfully! We'll get back to you soon.",
    failedMessage: 'Error sending message. Please try again.',
    unexpectedMessage: 'Something went wrong. Please try again.',
    failedSocial: 'Unable to open this link right now.',
  };
};

export function ContactScreen() {
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();
  const copy = getCopy(uiLanguage);
  const [formData, setFormData] = useState<ContactFormState>(INITIAL_FORM_STATE);
  const [status, setStatus] = useState<Status>('idle');
  const [feedback, setFeedback] = useState('');

  const updateField = (field: keyof ContactFormState, value: string) => {
    if (status !== 'idle') {
      setStatus('idle');
      setFeedback('');
    }
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const openSocialLink = async (url: string) => {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert(copy.title, copy.failedSocial);
      return;
    }
    await Linking.openURL(url);
  };

  const handleSubmit = async () => {
    const name = formData.name.trim();
    const email = formData.email.trim();
    const message = formData.message.trim();

    if (!name || !email || !message) {
      setStatus('error');
      setFeedback(copy.emptyFields);
      return;
    }

    setStatus('sending');
    setFeedback('');

    try {
      await submitContactMessage({ name, email, message });
      setFormData(INITIAL_FORM_STATE);
      setStatus('success');
      setFeedback(copy.success);
    } catch (error) {
      const messageText = error instanceof Error && error.message ? error.message : copy.failedMessage;
      setStatus('error');
      setFeedback(messageText);
    }
  };

  const isSending = status === 'sending';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardAvoidingView}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <ResponsivePageShell>
        <Stack gap="md">
          <AccountPageHeader
            language={uiLanguage}
            title={copy.title}
            onBackPress={() => router.push('/(tabs)/account')}
            backLabel={copy.back}
          />

          <AppText language={uiLanguage} variant="body" style={styles.introText}>{copy.intro}</AppText>

          <View style={styles.socialLinksRow}>
            {SOCIAL_LINKS.map((link) => (
              <Pressable
                key={link.key}
                accessibilityRole="button"
                accessibilityLabel={link.label}
                style={styles.socialIconButton}
                onPress={() => openSocialLink(link.url)}>
                <Image source={link.icon} style={styles.socialIconImage} resizeMode="contain" />
              </Pressable>
            ))}
          </View>

          {status !== 'idle' ? (
            <NeoShadowView
              style={[
                styles.statusBox,
                styles.neoCard,
                status === 'success' ? styles.statusBoxSuccess : null,
                status === 'error' ? styles.statusBoxError : null,
              ]}>
              {isSending ? <ActivityIndicator color={theme.colors.text} /> : null}
              <AppText language={uiLanguage} variant="body" style={styles.statusText}>
                {isSending ? copy.sending : feedback}
              </AppText>
            </NeoShadowView>
          ) : null}

          <Stack gap="lg">
            <View style={styles.fieldGroup}>
              <AppText language={uiLanguage} variant="caption" style={styles.label}>
                {copy.nameLabel}
              </AppText>
              <NeoShadowView style={[styles.inputShell, styles.neoInput]}>
                <ScriptAwareTextInput
                  accessibilityLabel={copy.nameLabel}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!isSending}
                  onChangeText={(value) => updateField('name', value)}
                  placeholder={copy.namePlaceholder}
                  placeholderTextColor={theme.colors.mutedText}
                  style={[styles.input, uiLanguage === 'th' ? styles.inputThai : styles.inputEnglish]}
                  value={formData.name}
                />
              </NeoShadowView>
            </View>

            <View style={styles.fieldGroup}>
              <AppText language={uiLanguage} variant="caption" style={styles.label}>
                {copy.emailLabel}
              </AppText>
              <NeoShadowView style={[styles.inputShell, styles.neoInput]}>
                <ScriptAwareTextInput
                  accessibilityLabel={copy.emailLabel}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isSending}
                  keyboardType="email-address"
                  onChangeText={(value) => updateField('email', value)}
                  placeholder={copy.emailPlaceholder}
                  placeholderTextColor={theme.colors.mutedText}
                  style={[styles.input, uiLanguage === 'th' ? styles.inputThai : styles.inputEnglish]}
                  value={formData.email}
                />
              </NeoShadowView>
            </View>

            <View style={styles.fieldGroup}>
              <AppText language={uiLanguage} variant="caption" style={styles.label}>
                {copy.messageLabel}
              </AppText>
              <NeoShadowView style={[styles.inputShell, styles.neoInput, styles.messageInputShell]}>
                <ScriptAwareTextInput
                  accessibilityLabel={copy.messageLabel}
                  autoCapitalize="sentences"
                  autoCorrect
                  editable={!isSending}
                  multiline
                  onChangeText={(value) => updateField('message', value)}
                  placeholder={copy.messagePlaceholder}
                  placeholderTextColor={theme.colors.mutedText}
                  style={[styles.input, styles.messageInput, uiLanguage === 'th' ? styles.inputThai : styles.inputEnglish]}
                  textAlignVertical="top"
                  value={formData.message}
                />
              </NeoShadowView>
            </View>

            <Button
              disabled={isSending}
              language={uiLanguage}
              onPress={handleSubmit}
              title={isSending ? copy.sending : copy.submit}
              style={styles.submitButton}
              textStyle={styles.submitButtonText}
            />
          </Stack>
        </Stack>
            </ResponsivePageShell>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: theme.spacing.md,
    paddingBottom: FLOATING_TAB_BAR_PAGE_BOTTOM_PADDING,
  },
  neoCard: {
    borderWidth: 1.5,
    boxShadow: `1.75px 1.75px 0px ${theme.colors.shadow}`,
  },
  introText: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  socialLinksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  socialIconButton: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIconImage: {
    width: 48,
    height: 48,
  },
  statusBox: {
    minHeight: 52,
    borderRadius: theme.radii.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: '#F7F4C5',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  statusBoxSuccess: {
    backgroundColor: '#D9F5D3',
  },
  statusBoxError: {
    backgroundColor: '#FFD6D6',
  },
  statusText: {
    textAlign: 'center',
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontWeight: theme.typography.weights.semibold,
  },
  input: {
    minHeight: 36,
    paddingVertical: 4,
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 22,
  },
  inputShell: {
    minHeight: 36,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 0,
    justifyContent: 'center',
  },
  neoInput: {
    boxShadow: 'none',
  },
  inputEnglish: {
    fontFamily: theme.typography.fontFaces.en.regular,
  },
  inputThai: {
    fontFamily: theme.typography.fontFaces.th.regular,
  },
  messageInput: {
    minHeight: 116,
  },
  messageInputShell: {
    minHeight: 116,
    paddingVertical: 4,
    justifyContent: 'flex-start',
  },
  submitButton: {
    minHeight: 56,
    marginTop: 2,
    backgroundColor: '#2563EB',
    borderColor: theme.colors.border,
    boxShadow: `4px 4px 0px ${theme.colors.shadow}`,
  },
  submitButtonText: { color: '#FFFFFF', textTransform: 'uppercase', fontWeight: theme.typography.weights.medium },
});
