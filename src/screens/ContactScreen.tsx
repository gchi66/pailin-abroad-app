import React, { useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { submitContactMessage } from '@/src/api/contact';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Stack } from '@/src/components/ui/Stack';
import { StandardPageHeader } from '@/src/components/ui/StandardPageHeader';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { FACEBOOK_URL, INSTAGRAM_URL } from '@/src/config/social';
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
  { key: 'facebook', label: 'Facebook', url: FACEBOOK_URL, icon: 'facebook-square' },
  { key: 'instagram', label: 'Instagram', url: INSTAGRAM_URL, icon: 'instagram' },
] as const;

const getCopy = (uiLanguage: 'en' | 'th') => {
  if (uiLanguage === 'th') {
    return {
      title: 'ติดต่อเรา',
      intro:
        'เราพร้อมช่วยเหลือคุณ ลองดูหน้า FAQ ก่อนเผื่อมีคำตอบอยู่แล้ว หรือส่งข้อความหาเราผ่านช่องทางด้านล่างและแบบฟอร์มนี้ได้เลย',
      nameLabel: 'ชื่อ',
      namePlaceholder: 'ชื่อ',
      emailLabel: 'อีเมล',
      emailPlaceholder: 'อีเมล',
      messageLabel: 'พิมพ์คำถาม ข้อเสนอแนะ หรือความคิดเห็นของคุณ',
      messagePlaceholder: 'พิมพ์ข้อความของคุณที่นี่...',
      submit: 'ส่งข้อความ',
      sending: 'กำลังส่ง...',
      emptyFields: 'กรุณากรอกชื่อ อีเมล และข้อความให้ครบถ้วน',
      success: 'ส่งข้อความสำเร็จแล้ว! เราจะติดต่อกลับโดยเร็วที่สุด',
      failedSocial: 'ไม่สามารถเปิดลิงก์นี้ได้ในขณะนี้',
    };
  }

  return {
    title: 'Contact Us',
    intro:
      'We are here to help. Check the FAQ first if your question may already be answered, or message us through the links below and the form here.',
    nameLabel: 'Name',
    namePlaceholder: 'Name',
    emailLabel: 'Email',
    emailPlaceholder: 'Email',
    messageLabel: 'Type your question, suggestion, or feedback.',
    messagePlaceholder: 'Your message here...',
    submit: 'Send',
    sending: 'Sending...',
    emptyFields: 'Please fill in your name, email, and message.',
    success: "Message sent successfully! We'll get back to you soon.",
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
      const messageText = error instanceof Error ? error.message : 'Failed to send message.';
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
        <Stack gap="md">
          <StandardPageHeader language={uiLanguage} title={copy.title} onBackPress={() => router.push('/(tabs)/account')} topInsetOffset={52} />

          <Card padding="lg" radius="lg" style={styles.neoCard}>
            <AppText language={uiLanguage} variant="body" style={styles.introText}>
              {copy.intro}
            </AppText>
          </Card>

          {status !== 'idle' ? (
            <View
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
            </View>
          ) : null}

          <Stack gap="sm">
            <View style={styles.fieldGroup}>
              <AppText language={uiLanguage} variant="caption" style={styles.label}>
                {copy.nameLabel}
              </AppText>
              <TextInput
                accessibilityLabel={copy.nameLabel}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isSending}
                onChangeText={(value) => updateField('name', value)}
                placeholder={copy.namePlaceholder}
                placeholderTextColor={theme.colors.mutedText}
                style={[styles.input, styles.neoInput, uiLanguage === 'th' ? styles.inputThai : styles.inputEnglish]}
                value={formData.name}
              />
            </View>

            <View style={styles.fieldGroup}>
              <AppText language={uiLanguage} variant="caption" style={styles.label}>
                {copy.emailLabel}
              </AppText>
              <TextInput
                accessibilityLabel={copy.emailLabel}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSending}
                keyboardType="email-address"
                onChangeText={(value) => updateField('email', value)}
                placeholder={copy.emailPlaceholder}
                placeholderTextColor={theme.colors.mutedText}
                style={[styles.input, styles.neoInput, uiLanguage === 'th' ? styles.inputThai : styles.inputEnglish]}
                value={formData.email}
              />
            </View>

            <View style={styles.fieldGroup}>
              <AppText language={uiLanguage} variant="caption" style={styles.label}>
                {copy.messageLabel}
              </AppText>
              <TextInput
                accessibilityLabel={copy.messageLabel}
                autoCapitalize="sentences"
                autoCorrect
                editable={!isSending}
                multiline
                onChangeText={(value) => updateField('message', value)}
                placeholder={copy.messagePlaceholder}
                placeholderTextColor={theme.colors.mutedText}
                style={[
                  styles.input,
                  styles.neoInput,
                  styles.messageInput,
                  uiLanguage === 'th' ? styles.inputThai : styles.inputEnglish,
                ]}
                textAlignVertical="top"
                value={formData.message}
              />
            </View>

            <Button
              disabled={isSending}
              language={uiLanguage}
              onPress={handleSubmit}
              title={isSending ? copy.sending : copy.submit}
              style={styles.submitButton}
            />
          </Stack>

          <View style={styles.socialLinksRow}>
            {SOCIAL_LINKS.map((link) => (
              <Pressable
                key={link.key}
                accessibilityRole="button"
                accessibilityLabel={link.label}
                style={styles.socialIconButton}
                onPress={() => openSocialLink(link.url)}>
                <FontAwesome name={link.icon} size={24} color={theme.colors.text} />
              </Pressable>
            ))}
          </View>
        </Stack>
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
  introText: {
    color: theme.colors.text,
  },
  socialLinksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  socialIconButton: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.xl,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: '#91CAFF',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 1.75, height: 1.75 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
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
    gap: theme.spacing.xs,
  },
  label: {
    fontWeight: theme.typography.weights.semibold,
  },
  input: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.lineHeights.md,
  },
  neoInput: {
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 1.75, height: 1.75 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  inputEnglish: {
    fontFamily: theme.typography.fonts.en,
  },
  inputThai: {
    fontFamily: theme.typography.fonts.th,
  },
  messageInput: {
    minHeight: 150,
  },
  submitButton: {
    marginTop: theme.spacing.xs,
  },
});
