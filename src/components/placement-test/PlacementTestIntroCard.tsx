import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { theme } from '@/src/theme/theme';

type PlacementTestIntroCardProps = {
  onClose: () => void;
  onChooseManually: () => void;
  onStart: () => void;
};

export function PlacementTestIntroCard({ onChooseManually, onClose, onStart }: PlacementTestIntroCardProps) {
  return (
    <View style={styles.cardWrap}>
      <View pointerEvents="none" style={styles.cardShadow} />
      <View style={styles.card}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ปิดหน้าทดสอบวัดระดับ"
          hitSlop={12}
          onPress={onClose}
          style={styles.closeButton}>
          <MaterialIcons name="close" size={23} color={theme.colors.text} />
        </Pressable>

        <AppText language="th" variant="title" style={styles.title}>
          มาค้นหาระดับของคุณกัน!
        </AppText>
        <AppText language="th" variant="body" style={styles.body}>
          ทำแบบทดสอบวัดระดับสั้น ๆ เพื่อค้นหาจุดเริ่มต้นที่เหมาะกับคุณ ใช้เวลาเพียงไม่กี่นาที!
        </AppText>

        <View style={styles.instructions}>
          <View style={[styles.instructionRow, styles.headphonesRow]}>
            <MaterialIcons name="headphones" size={23} color={theme.colors.text} />
            <AppText language="th" variant="body" style={styles.instructionText}>
              เตรียมหูฟังให้พร้อม
            </AppText>
          </View>
          <View style={[styles.instructionRow, styles.listenRow]}>
            <MaterialIcons name="chat-bubble-outline" size={22} color={theme.colors.text} />
            <AppText language="th" variant="body" style={styles.instructionText}>
              ฟังบทสนทนาสั้น ๆ
            </AppText>
          </View>
          <View style={[styles.instructionRow, styles.answerRow]}>
            <MaterialIcons name="help-outline" size={24} color={theme.colors.text} />
            <AppText language="th" variant="body" style={styles.instructionText}>
              ตอบคำถามสองสามข้อ
            </AppText>
          </View>
        </View>

        <View style={styles.buttonWrap}>
          <View pointerEvents="none" style={styles.buttonShadow} />
          <Button
            language="th"
            title="เริ่มทำแบบทดสอบวัดระดับ"
            onPress={onStart}
            style={styles.button}
            textStyle={styles.buttonText}
          />
        </View>

        <Pressable accessibilityRole="button" onPress={onChooseManually} style={styles.manualLinkButton}>
          <AppText language="th" variant="muted" style={styles.manualLink}>
            เลือกระดับด้วยตัวเองแทน
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
  },
  cardShadow: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ translateX: 5 }, { translateY: 5 }],
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.shadow,
  },
  card: {
    paddingHorizontal: 30,
    paddingTop: 47,
    paddingBottom: 16,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surface,
  },
  closeButton: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  title: {
    fontSize: 25,
    lineHeight: 32,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: -0.25,
  },
  body: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
  },
  instructions: {
    gap: 8,
    marginTop: 16,
  },
  instructionRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: theme.radii.md,
  },
  headphonesRow: { backgroundColor: '#FFF3BF' },
  listenRow: { backgroundColor: '#FDE4E7' },
  answerRow: { backgroundColor: '#E9FBCB' },
  instructionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: theme.typography.weights.medium,
  },
  buttonWrap: {
    position: 'relative',
    marginTop: 16,
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
    backgroundColor: theme.colors.accent,
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
