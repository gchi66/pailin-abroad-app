import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { placementColors } from '@/src/theme/placement';
import { theme } from '@/src/theme/theme';

type PlacementTestIntroCardProps = {
  language: 'en' | 'th';
  onChooseManually: () => void;
  onStart: () => void;
};

const copy = {
  en: {
    title: "Let's find your English level!",
    body: 'Take a short placement test so we can find the best starting point for you. It only takes a few minutes!',
    headphones: 'Grab headphones',
    listen: 'Listen to short conversations',
    answer: 'Answer a few questions',
    start: 'Start placement test',
    manual: 'Choose my level instead',
  },
  th: {
    title: 'มาวัดระดับภาษาอังกฤษคุณกัน!',
    body: 'ทำแบบทดสอบวัดระดับสั้น ๆ เพื่อค้นหาจุดเริ่มต้นที่เหมาะกับคุณ ใช้เวลาเพียงไม่กี่นาที!',
    headphones: 'หยิบหูฟัง',
    listen: 'ฟังบทสนทนาสั้น ๆ',
    answer: 'ตอบคำถามสองสามข้อ',
    start: 'ทำแบบทดสอบวัดระดับ',
    manual: 'เลือกระดับด้วยตัวเองแทน',
  },
} as const;

export function PlacementTestIntroCard({ language, onChooseManually, onStart }: PlacementTestIntroCardProps) {
  const [isStartPressed, setIsStartPressed] = useState(false);
  const text = copy[language];

  return (
    <View style={styles.cardWrap}>
      <View pointerEvents="none" style={styles.cardShadow} />
      <View style={styles.card}>
        <AppText language={language} variant="title" style={styles.title}>
          {text.title}
        </AppText>
        <AppText language={language} variant="body" style={styles.body}>
          {text.body}
        </AppText>

        <View style={styles.instructions}>
          <View style={styles.instructionRow}>
            <MaterialIcons name="headphones" size={23} color={theme.colors.text} />
            <AppText language={language} variant="body" style={styles.instructionText}>
              {text.headphones}
            </AppText>
          </View>
          <View style={styles.instructionRow}>
            <MaterialIcons name="chat-bubble-outline" size={22} color={theme.colors.text} />
            <AppText language={language} variant="body" style={styles.instructionText}>
              {text.listen}
            </AppText>
          </View>
          <View style={styles.instructionRow}>
            <MaterialIcons name="help-outline" size={24} color={theme.colors.text} />
            <AppText language={language} variant="body" style={styles.instructionText}>
              {text.answer}
            </AppText>
          </View>
        </View>

        <View style={styles.buttonWrap}>
          <View pointerEvents="none" style={[styles.buttonShadow, isStartPressed ? styles.shadowPressed : null]} />
          <Button
            language={language}
            title={text.start}
            onPress={onStart}
            onPressIn={() => setIsStartPressed(true)}
            onPressOut={() => setIsStartPressed(false)}
            style={[styles.button, isStartPressed ? styles.buttonPressed : null]}
            textStyle={styles.buttonText}
          />
        </View>

        <Pressable accessibilityRole="button" onPress={onChooseManually} style={styles.manualLinkButton}>
          <AppText language={language} variant="muted" style={styles.manualLink}>
            {text.manual}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    width: '100%',
    maxWidth: 440,
    position: 'relative',
    transform: [{ translateY: -12 }],
  },
  cardShadow: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ translateX: 5 }, { translateY: 5 }],
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.shadow,
  },
  card: {
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 20,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surface,
  },
  title: {
    fontSize: 23,
    lineHeight: 30,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: -0.25,
  },
  body: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 20,
  },
  instructions: {
    gap: 12,
    marginTop: 24,
  },
  instructionRow: {
    minHeight: 47,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: theme.radii.md,
    backgroundColor: placementColors.paleLime,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: theme.typography.weights.medium,
  },
  buttonWrap: {
    position: 'relative',
    marginTop: 22,
  },
  buttonShadow: {
    position: 'absolute',
    top: 4,
    right: -4,
    bottom: -4,
    left: 4,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.shadow,
  },
  button: {
    minHeight: 44,
    paddingVertical: 5,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xl,
    backgroundColor: placementColors.blue,
  },
  buttonPressed: {
    transform: [{ translateX: 4 }, { translateY: 4 }],
  },
  shadowPressed: {
    opacity: 0,
  },
  buttonText: {
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: 0.2,
    fontWeight: theme.typography.weights.medium,
  },
  manualLinkButton: {
    alignSelf: 'center',
    marginTop: 15,
  },
  manualLink: {
    color: '#676767',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
