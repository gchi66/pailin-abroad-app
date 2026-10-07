import React, { useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  FadeInDown,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { theme } from '@/src/theme/theme';
import { UiLanguage } from '@/src/types/home';

export type LessonSectionIntroType =
  | 'prepare'
  | 'listen'
  | 'comprehension'
  | 'transcript'
  | 'apply'
  | 'understand'
  | 'extra_tip'
  | 'common_mistake'
  | 'culture_note'
  | 'phrases_verbs'
  | 'practice'
  | 'speaking_practice';

type LessonRichSectionIntroProps = {
  sectionType: LessonSectionIntroType;
  language: UiLanguage;
  topInset: number;
  bottomInset: number;
  position: number;
  total: number;
  badgeLabel?: string;
  audioTray?: React.ReactNode;
  onContinue: () => void;
  onClose: () => void;
};

const placeholderArtwork = require('@/assets/images/speaking-coach/pailin-do-the-task.webp');
const TITLE_OUTLINE_OFFSETS = [
  { x: -1.25, y: 0 },
  { x: 1.25, y: 0 },
  { x: 0, y: -1.25 },
  { x: 0, y: 1.25 },
  { x: -1, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: 1, y: 1 },
] as const;

const introCopy = {
  prepare: {
    en: {
      title: 'Prepare',
      body: 'Get familiar with the words you’ll hear in the conversation!',
    },
    th: {
      title: 'เตรียมตัว',
      body: 'ทำความคุ้นเคยกับคำศัพท์ที่คุณจะได้ยินในบทสนทนา',
    },
    artwork: placeholderArtwork,
  },
  listen: {
    en: {
      title: 'Listen',
      body: 'Listen to the full conversation and hear the language in context!',
    },
    th: {
      title: 'ฟัง',
      body: 'ฟังบทสนทนาทั้งหมดและเรียนรู้การใช้ภาษาในสถานการณ์จริง',
    },
    artwork: placeholderArtwork,
  },
  comprehension: {
    en: {
      title: 'Check',
      body: 'Check what you understood from the conversation!',
    },
    th: {
      title: 'ตรวจสอบ',
      body: 'ตรวจสอบว่าคุณเข้าใจบทสนทนามากน้อยแค่ไหน',
    },
    artwork: placeholderArtwork,
  },
  transcript: {
    en: {
      title: 'Transcript',
      body: 'Read along and explore the conversation line by line!',
    },
    th: {
      title: 'สคริปต์บท',
      body: 'อ่านตามและสำรวจบทสนทนาทีละบรรทัด',
    },
    artwork: placeholderArtwork,
  },
  apply: {
    en: {
      title: 'Apply',
      body: 'Put the conversation language to work in a situation of your own!',
    },
    th: {
      title: 'นำไปใช้',
      body: 'ลองนำภาษาจากบทสนทนาไปใช้ในสถานการณ์ของคุณเอง',
    },
    artwork: placeholderArtwork,
  },
  understand: {
    en: {
      title: 'Understand',
      body: 'Dive deeper into the lesson focus with examples from the conversation!',
    },
    th: {
      title: 'ทำความเข้าใจ',
      body: 'เจาะลึกเนื้อหาหลักของบทเรียน พร้อมตัวอย่างจากบทสนทนา',
    },
    artwork: require('@/assets/images/pailin-understand.webp'),
  },
  extra_tip: {
    en: {
      title: 'Extra Tips',
      body: 'Pick up a few useful details that go beyond the lesson focus!',
    },
    th: {
      title: 'เคล็ดลับเพิ่มเติม',
      body: 'เรียนรู้รายละเอียดที่มีประโยชน์เพิ่มเติมจากหัวข้อหลักของบทเรียน',
    },
    artwork: require('@/assets/images/pailin-extra-tips.webp'),
  },
  common_mistake: {
    en: {
      title: 'Common Mistakes',
      body: 'Common mistakes that Thai people often make when learning this concept!',
    },
    th: {
      title: 'ข้อผิดพลาดที่พบบ่อย',
      body: 'ดูข้อผิดพลาดที่คนไทยมักเจอเมื่อเรียนหัวข้อนี้',
    },
    artwork: require('@/assets/images/pailin-common-mistakes.webp'),
  },
  culture_note: {
    en: {
      title: 'Culture Note',
      body: 'Learn interesting parts of American culture that are mentioned in the conversation!',
    },
    th: {
      title: 'เกร็ดวัฒนธรรม',
      body: 'เรียนรู้วัฒนธรรมอเมริกันที่กล่าวถึงในบทสนทนา',
    },
    artwork: require('@/assets/images/pailin-culture-note.webp'),
  },
  phrases_verbs: {
    en: {
      title: 'Phrases & Verbs',
      body: 'Explore useful phrases and phrasal verbs from the conversation, with examples you can use every day.',
    },
    th: {
      title: 'วลีและคำกริยา',
      body: 'เรียนรู้วลีและ phrasal verbs ที่ใช้ในบทสนทนา พร้อมตัวอย่างที่นำไปใช้ได้ในชีวิตประจำวัน',
    },
    artwork: require('@/assets/images/pailin-phrases-verbs.webp'),
  },
  practice: {
    en: {
      title: 'Practice',
      body: 'Put what you learned into practice!',
    },
    th: {
      title: 'ฝึกฝน',
      body: 'นำสิ่งที่คุณได้เรียนรู้มาฝึกใช้จริง',
    },
    artwork: placeholderArtwork,
  },
  speaking_practice: {
    en: {
      title: 'Speak',
      body: 'Put what you learned into practice by speaking out loud!',
    },
    th: {
      title: 'ฝึกพูด',
      body: 'นำสิ่งที่คุณเรียนรู้มาฝึกพูดออกเสียงจริง',
    },
    artwork: require('@/assets/images/speaking-coach/pailin-time-to-speak.webp'),
  },
} as const;

export function LessonRichSectionIntro({
  sectionType,
  language,
  topInset,
  bottomInset,
  position,
  total,
  badgeLabel,
  audioTray,
  onContinue,
  onClose,
}: LessonRichSectionIntroProps) {
  const { width } = useWindowDimensions();
  const config = introCopy[sectionType];
  const copy = config[language];
  const cardWidth = Math.min(width - 80, 315);
  const usesCompactTitle = copy.title.length > 13;
  const usesSingleLineWordTitle = language === 'en' && !copy.title.trim().includes(' ');
  const usesSingleLineFeatureTitle =
    language === 'en' && (sectionType === 'culture_note' || sectionType === 'phrases_verbs');
  const titleLineCount = usesSingleLineWordTitle || usesSingleLineFeatureTitle ? 1 : 2;
  const [isLeaving, setIsLeaving] = useState(false);
  const opacity = useSharedValue(1);
  const screenAnimation = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const handleContinue = () => {
    if (isLeaving) return;
    setIsLeaving(true);
    opacity.value = withTiming(0, { duration: 180, reduceMotion: ReduceMotion.System }, (finished) => {
      if (finished) runOnJS(onContinue)();
    });
  };

  return (
    <Animated.View style={[styles.screen, screenAnimation]}>
      <View style={[styles.topBar, { paddingTop: topInset + 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={language === 'th' ? 'กลับไปหน้าภาพรวมบทเรียน' : 'Back to lesson overview'}
          disabled={isLeaving}
          hitSlop={12}
          onPress={onClose}
          style={styles.closeButton}>
          <MaterialIcons name="close" size={25} color={theme.colors.text} />
        </Pressable>
      </View>

      <View style={styles.centerArea}>
        <Animated.View
          entering={FadeInDown.duration(220).reduceMotion(ReduceMotion.System)}
          style={styles.cardEntry}>
          <View style={[styles.card, { width: cardWidth }]}>
            <View pointerEvents="none" style={styles.progressBadgeWrap}>
              <View style={styles.progressBadgeShadow} />
              <View style={styles.progressBadge}>
                <AppText language="en" style={styles.progressBadgeText}>
                  {badgeLabel ?? `${position} / ${total}`}
                </AppText>
              </View>
            </View>

            <View pointerEvents="none" style={styles.decorativeMarks}>
              <View style={[styles.decorativeMark, styles.decorativeMarkOne]} />
              <View style={[styles.decorativeMark, styles.decorativeMarkTwo]} />
              <View style={[styles.decorativeMark, styles.decorativeMarkThree]} />
            </View>

            <View style={styles.content}>
              <View style={styles.artworkWrap}>
                <Image source={config.artwork} contentFit="contain" style={styles.artwork} />
              </View>
              <View style={styles.titleWrap}>
                <AppText
                  language={language}
                  numberOfLines={titleLineCount}
                  adjustsFontSizeToFit
                  minimumFontScale={0.72}
                  style={[
                    styles.title,
                    styles.titleLayer,
                    styles.titleOutline,
                    usesCompactTitle ? styles.titleCompact : null,
                    usesSingleLineFeatureTitle ? styles.titleSingleLineFeature : null,
                    language === 'th' ? styles.titleThai : null,
                    { transform: [{ translateX: 3 }, { translateY: 5 }] },
                  ]}>
                  {copy.title}
                </AppText>
                {TITLE_OUTLINE_OFFSETS.map((offset) => (
                  <AppText
                    key={`${offset.x}:${offset.y}`}
                    language={language}
                    numberOfLines={titleLineCount}
                    adjustsFontSizeToFit
                    minimumFontScale={0.72}
                    style={[
                      styles.title,
                      styles.titleLayer,
                      styles.titleOutline,
                      usesCompactTitle ? styles.titleCompact : null,
                      usesSingleLineFeatureTitle ? styles.titleSingleLineFeature : null,
                      language === 'th' ? styles.titleThai : null,
                      { transform: [{ translateX: offset.x }, { translateY: offset.y }] },
                    ]}>
                    {copy.title}
                  </AppText>
                ))}
                <AppText
                  language={language}
                  numberOfLines={titleLineCount}
                  adjustsFontSizeToFit
                  minimumFontScale={0.72}
                  style={[
                    styles.title,
                    usesCompactTitle ? styles.titleCompact : null,
                    usesSingleLineFeatureTitle ? styles.titleSingleLineFeature : null,
                    language === 'th' ? styles.titleThai : null,
                  ]}>
                  {copy.title}
                </AppText>
              </View>
              <AppText language={language} style={[styles.body, language === 'th' ? styles.bodyThai : null]}>
                {copy.body}
              </AppText>
            </View>
          </View>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <View
          style={[
            styles.continueButtonWrap,
            { paddingBottom: audioTray ? theme.spacing.lg : Math.max(bottomInset, 10) + 16 },
          ]}>
          <Button
            language={language}
            title={language === 'th' ? 'ไปกันเลย!' : 'LET’S GO!'}
            disabled={isLeaving}
            onPress={handleContinue}
            style={styles.continueButton}
            textStyle={styles.continueButtonText}
          />
        </View>
        {audioTray}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    minHeight: 70,
    alignItems: 'flex-end',
    paddingHorizontal: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  cardEntry: {
    alignItems: 'center',
  },
  card: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 13,
    backgroundColor: '#FFFDE8',
    paddingHorizontal: 18,
    paddingTop: 45,
    paddingBottom: 34,
    boxShadow: `5px 5px 0px ${theme.colors.shadow}`,
  },
  progressBadgeWrap: {
    position: 'absolute',
    top: -22,
    left: 16,
    width: 81,
    height: 47,
    zIndex: 3,
  },
  progressBadgeShadow: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 78,
    height: 44,
    borderRadius: 10,
    backgroundColor: theme.colors.shadow,
  },
  progressBadge: {
    width: 78,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 10,
    backgroundColor: '#DDF6FF',
  },
  progressBadgeText: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFaces.en.bold,
    fontSize: 17,
    lineHeight: 22,
  },
  decorativeMarks: {
    position: 'absolute',
    top: -17,
    right: -12,
    width: 58,
    height: 61,
  },
  decorativeMark: {
    position: 'absolute',
    width: 8,
    height: 39,
    borderRadius: 999,
    backgroundColor: '#36B9EE',
  },
  decorativeMarkOne: {
    top: -3,
    left: 12,
    transform: [{ rotate: '18deg' }],
  },
  decorativeMarkTwo: {
    top: 11,
    right: 12,
    transform: [{ rotate: '48deg' }],
  },
  decorativeMarkThree: {
    top: 36,
    right: -1,
    transform: [{ rotate: '80deg' }],
  },
  content: {
    width: '100%',
    alignItems: 'center',
    marginBottom: -30,
    transform: [{ translateY: -30 }],
  },
  artworkWrap: {
    width: '96%',
    height: 180,
    maxWidth: 275,
    marginTop: 0,
    marginBottom: -6,
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  title: {
    width: '100%',
    color: '#A6D957',
    fontFamily: theme.typography.fontFaces.en.bold,
    fontSize: 48,
    lineHeight: 56,
    textAlign: 'center',
    letterSpacing: -1,
  },
  titleWrap: {
    width: '100%',
    position: 'relative',
    alignItems: 'center',
  },
  titleLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  titleOutline: {
    color: theme.colors.text,
  },
  titleCompact: {
    fontSize: 39,
    lineHeight: 47,
  },
  titleSingleLineFeature: {
    fontSize: 35,
    lineHeight: 43,
  },
  titleThai: {
    fontSize: 37,
    lineHeight: 46,
    letterSpacing: 0,
  },
  body: {
    width: '100%',
    maxWidth: 275,
    marginTop: 24,
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: theme.typography.weights.medium,
    textAlign: 'center',
  },
  bodyThai: {
    fontSize: 15,
    lineHeight: 23,
  },
  footer: {
    paddingTop: 3,
  },
  continueButtonWrap: {
    paddingHorizontal: 10,
  },
  continueButton: {
    minHeight: 44,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    boxShadow: 'none',
  },
  continueButtonText: {
    color: theme.colors.surface,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: theme.typography.weights.semibold,
  },
});
