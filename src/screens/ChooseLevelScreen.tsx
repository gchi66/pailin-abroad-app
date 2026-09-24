import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import pailinHead from '@/assets/images/characters/pailin_head.webp';
import placementTest0Bars from '@/assets/images/placement-test-0-bars.webp';
import placementTest1Bar from '@/assets/images/placement-test-1-bar.webp';
import placementTest2Bars from '@/assets/images/placement-test-2-bars.webp';
import placementTest3Bars from '@/assets/images/placement-test-3-bars.webp';
import placementTest4Bars from '@/assets/images/placement-test-4-bars.webp';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { LanguageToggle } from '@/src/components/ui/LanguageToggle';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { placementColors } from '@/src/theme/placement';
import { theme } from '@/src/theme/theme';

const LEVEL_OPTIONS = [
  { label: { en: "I'm just starting to learn English!", th: 'ฉันเพิ่งเริ่มเรียนภาษาอังกฤษ!' }, bars: placementTest0Bars, level: 1 },
  { label: { en: 'I know some basic English words and sentences', th: 'ฉันรู้คำศัพท์และประโยคง่ายๆ บางคำ' }, bars: placementTest1Bar, level: 2 },
  { label: { en: 'I can have basic conversations', th: 'ฉันสามารถสนทนาพื้นฐานได้' }, bars: placementTest2Bars, level: 5 },
  { label: { en: 'I can talk about my opinions and experiences', th: 'ฉันสามารถพูดคุยเกี่ยวกับความคิดเห็นและประสบการณ์ของตัวเองได้' }, bars: placementTest3Bars, level: 6 },
  { label: { en: 'I can discuss opinions, culture, and current events', th: 'ฉันสามารถอภิปรายเกี่ยวกับความคิดเห็น ธรรมเนียม และเหตุการณ์ปัจจุบันได้' }, bars: placementTest4Bars, level: 9 },
] as const;

const COPY = {
  en: {
    title: 'What is your English level?',
    body: 'You can change your level later at any time!',
    start: 'Start your first lesson!',
    test: 'Not sure yet? Take a short placement test instead!',
  },
  th: {
    title: 'ระดับอังกฤษคุณคือระดับไหน?',
    body: 'คุณสามารถเปลี่ยนระดับในภายหลังได้ตลอดเวลา!',
    start: 'เริ่มบทเรียนแรกของคุณ!',
    test: 'ยังไม่แน่ใจใช่ไหม? มาทำแบบทดสอบวัดระดับสั้นๆ แทนได้นะ!',
  },
} as const;

export function ChooseLevelScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { uiLanguage } = useUiLanguage();
  const copy = COPY[uiLanguage];
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isStartPressed, setIsStartPressed] = useState(false);

  return (
    <View style={styles.screen}>
      <ScrollView
        bounces={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}>
        <ResponsivePageShell style={styles.pageShell}>
          <View style={styles.topBar}>
            <LanguageToggle />
          </View>

          <View style={styles.levelContent}>
            <View style={styles.introRow}>
              <Image source={pailinHead} style={styles.pailinImage} resizeMode="contain" />

              <View style={styles.bubbleWrap}>
                <View pointerEvents="none" style={styles.bubbleShadow} />
                <View style={styles.bubble}>
                  <AppText language={uiLanguage} variant="body" style={styles.bubbleTitle}>
                    {copy.title}
                  </AppText>
                  <AppText language={uiLanguage} variant="muted" style={styles.bubbleBody}>
                    {copy.body}
                  </AppText>
                </View>
              </View>
            </View>

            <View style={styles.optionsList}>
              {LEVEL_OPTIONS.map((option, index) => {
                const isSelected = selectedOption === index;
                return (
                  <View key={option.level} style={styles.optionWrap}>
                    <View pointerEvents="none" style={styles.optionShadow} />
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => setSelectedOption(index)}
                      style={({ pressed }) => [
                        styles.optionCard,
                        isSelected ? styles.optionCardSelected : null,
                        pressed ? styles.optionCardPressed : null,
                      ]}>
                      <Image source={option.bars} style={styles.barsImage} resizeMode="contain" />
                      <AppText language={uiLanguage} variant="body" style={styles.optionLabel}>
                        {option.label[uiLanguage]}
                      </AppText>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.footer}>
            {selectedOption !== null ? (
              <View style={styles.startButtonWrap}>
                <View pointerEvents="none" style={[styles.startButtonShadow, isStartPressed ? styles.shadowPressed : null]} />
                <Button
                  language={uiLanguage}
                  size="compact"
                  title={copy.start}
                  onPress={() => router.push({
                    pathname: '/choose-level-result',
                    params: { level: String(LEVEL_OPTIONS[selectedOption].level) },
                  })}
                  onPressIn={() => setIsStartPressed(true)}
                  onPressOut={() => setIsStartPressed(false)}
                  style={[styles.startButton, isStartPressed ? styles.startButtonPressed : null]}
                />
              </View>
            ) : null}

            <Pressable accessibilityRole="link" onPress={() => router.push('/placement-test')} style={styles.testLinkButton}>
              <AppText language={uiLanguage} variant="muted" style={styles.testLinkText}>
                {copy.test}
              </AppText>
            </Pressable>
          </View>
        </ResponsivePageShell>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  pageShell: {
    flex: 1,
    width: '100%',
  },
  topBar: {
    width: '100%',
    maxWidth: 440,
    minHeight: 32,
    alignSelf: 'center',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  levelContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
  },
  introRow: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    transform: [{ translateX: -10 }],
  },
  pailinImage: {
    width: 70,
    height: 72,
    marginRight: -2,
    zIndex: 2,
  },
  bubbleWrap: {
    flex: 1,
    minHeight: 76,
    position: 'relative',
    transform: [{ translateX: 6 }, { translateY: -21 }],
  },
  bubbleShadow: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ translateX: 5 }, { translateY: 5 }],
    borderRadius: theme.radii.lg,
    borderBottomLeftRadius: 0,
    backgroundColor: theme.colors.shadow,
  },
  bubble: {
    minHeight: 76,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderBottomLeftRadius: 0,
    backgroundColor: theme.colors.surface,
  },
  bubbleTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: theme.typography.weights.bold,
  },
  bubbleBody: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.mutedText,
  },
  optionsList: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    gap: 13,
    marginTop: 12,
  },
  optionWrap: {
    width: '100%',
    minHeight: 74,
    position: 'relative',
  },
  optionShadow: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ translateX: 5 }, { translateY: 6 }],
    borderRadius: 17,
    backgroundColor: theme.colors.shadow,
  },
  optionCard: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 17,
    paddingVertical: 13,
    borderWidth: 1.25,
    borderColor: theme.colors.border,
    borderRadius: 17,
    backgroundColor: theme.colors.surface,
  },
  optionCardSelected: {
    backgroundColor: placementColors.paleLime,
  },
  optionCardPressed: {
    transform: [{ translateX: 4 }, { translateY: 5 }],
  },
  barsImage: {
    width: 36,
    height: 28,
  },
  optionLabel: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: theme.typography.weights.semibold,
  },
  footer: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    marginTop: 'auto',
    paddingTop: 48,
    paddingBottom: theme.spacing.md,
  },
  startButtonWrap: {
    width: '100%',
    position: 'relative',
  },
  startButtonShadow: {
    position: 'absolute',
    top: 5,
    right: -4,
    bottom: -5,
    left: 4,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.shadow,
  },
  startButton: {
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xl,
    backgroundColor: placementColors.blue,
  },
  startButtonPressed: {
    transform: [{ translateX: 4 }, { translateY: 5 }],
  },
  shadowPressed: {
    opacity: 0,
  },
  testLinkButton: {
    alignSelf: 'center',
    marginTop: 22,
    padding: 4,
  },
  testLinkText: {
    color: '#676767',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
