import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native';

import speakingImage from '@/assets/images/speaking-coach/pailin-time-to-speak.webp';
import { AppText } from '@/src/components/ui/AppText';
import { MotionPressable as Pressable } from '@/src/components/ui/MotionPressable';
import { createNeoShadow } from '@/src/theme/shadows';
import { theme } from '@/src/theme/theme';
import type { UiLanguage } from '@/src/types/home';

type Props = {
  language: UiLanguage;
  visible: boolean;
  isFinishing?: boolean;
  onClose: () => void;
  onCreateAccount: () => void;
  onSkipAndFinish: () => void;
};

export function GuestSpeakingPromptModal({
  language,
  visible,
  isFinishing = false,
  onClose,
  onCreateAccount,
  onSkipAndFinish,
}: Props) {
  const th = language === 'th';

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Pressable
            motionDisabled
            accessibilityRole="button"
            accessibilityLabel={th ? 'ปิด' : 'Close'}
            disabled={isFinishing}
            hitSlop={10}
            onPress={onClose}
            style={styles.closeButton}>
            <MaterialIcons name="close" size={28} color={theme.colors.text} />
          </Pressable>

          <Image source={speakingImage} contentFit="contain" style={styles.image} />
          <AppText language={language} style={styles.title}>
            {th ? 'อยากฝึกพูดไหม?' : 'Want to practice\nspeaking?'}
          </AppText>
          <AppText language={language} style={styles.body}>
            {th
              ? 'พัฒนาการออกเสียงและทักษะการพูด พร้อมรับคำแนะนำจาก AI ทันที'
              : 'Improve your pronunciation and\nspeaking skills with instant AI feedback!'}
          </AppText>

          <Pressable
            accessibilityRole="button"
            disabled={isFinishing}
            onPress={onCreateAccount}
            style={({ pressed }) => [
              styles.createAccountButton,
              pressed ? styles.pressed : null,
              isFinishing ? styles.disabled : null,
            ]}>
            <AppText language={language} style={styles.createAccountText}>
              {th ? 'สร้างบัญชีฟรี' : 'CREATE FREE ACCOUNT'}
            </AppText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={isFinishing}
            onPress={onSkipAndFinish}
            style={({ pressed }) => [styles.skipButton, pressed ? styles.pressed : null]}>
            {isFinishing ? (
              <ActivityIndicator color={theme.colors.text} size="small" />
            ) : (
              <AppText language={language} style={styles.skipText}>
                {th ? 'ข้ามและจบบทเรียน' : 'Skip & finish lesson'}
              </AppText>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(20, 27, 38, 0.30)',
  },
  card: {
    width: '100%',
    maxWidth: 430,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 42,
    paddingBottom: 20,
    backgroundColor: theme.colors.surface,
    ...createNeoShadow({ color: theme.colors.border, elevation: 5, offset: 6 }),
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 176,
    height: 134,
  },
  title: {
    marginTop: 4,
    color: theme.colors.text,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    marginTop: 8,
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 25,
    textAlign: 'center',
  },
  createAccountButton: {
    width: '100%',
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 25,
    paddingHorizontal: 18,
    paddingVertical: 5,
    backgroundColor: '#2563EB',
  },
  createAccountText: {
    color: theme.colors.surface,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  skipButton: {
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
    paddingHorizontal: 12,
  },
  skipText: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.55,
  },
});
