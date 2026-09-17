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
import { theme } from '@/src/theme/theme';
import { UiLanguage } from '@/src/types/home';

type RichSectionType = 'understand' | 'common_mistake' | 'culture_note' | 'extra_tip';

type LessonRichSectionIntroProps = {
  sectionType: RichSectionType;
  language: UiLanguage;
  topInset: number;
  bottomInset: number;
  onContinue: () => void;
  onClose: () => void;
};

const introCopy = {
  understand: {
    en: {
      title: 'UNDERSTAND',
      tagline: 'Let’s break it down!',
      body: 'Dive deeper into the lesson focus with examples from the conversation!',
    },
    th: {
      title: 'ทำความเข้าใจ',
      tagline: 'มาทำความเข้าใจกัน!',
      body: 'เจาะลึกเนื้อหาหลักของบทเรียน พร้อมตัวอย่างจากบทสนทนา',
    },
    accent: '#C99500',
    artwork: require('@/assets/images/speaking-coach/pailin-do-the-task.webp'),
  },
  common_mistake: {
    en: {
      title: 'COMMON MISTAKES',
      tagline: 'Watch out for these!',
      body: 'Common mistakes that Thai people often make when learning this concept!',
    },
    th: {
      title: 'ข้อผิดพลาดที่พบบ่อย',
      tagline: 'ระวังจุดนี้!',
      body: 'ดูข้อผิดพลาดที่คนไทยมักเจอเมื่อเรียนหัวข้อนี้',
    },
    accent: '#EA5858',
    artwork: require('@/assets/images/pailin-common-mistakes.webp'),
  },
  culture_note: {
    en: {
      title: 'CULTURE NOTE',
      tagline: 'Hello USA!',
      body: 'Learn interesting parts of American culture that are mentioned in the conversation!',
    },
    th: {
      title: 'เกร็ดวัฒนธรรม',
      tagline: 'สวัสดีอเมริกา!',
      body: 'เรียนรู้วัฒนธรรมอเมริกันที่กล่าวถึงในบทสนทนา',
    },
    accent: '#77B93A',
    artwork: require('@/assets/images/speaking-coach/pailin-good-job.webp'),
  },
  extra_tip: {
    en: {
      title: 'EXTRA TIPS',
      tagline: 'Bonus!',
      body: 'These aren’t the main focus of the lesson, but they’re useful to know.',
    },
    th: {
      title: 'เคล็ดลับเพิ่มเติม',
      tagline: 'โบนัส!',
      body: 'เนื้อหาเหล่านี้ไม่ใช่หัวข้อหลักของบทเรียน แต่มีประโยชน์ที่ควรรู้',
    },
    accent: '#C99500',
    artwork: require('@/assets/images/characters/pailin_thumbs_up_head.webp'),
  },
} as const;

export function LessonRichSectionIntro({
  sectionType,
  language,
  topInset,
  bottomInset,
  onContinue,
  onClose,
}: LessonRichSectionIntroProps) {
  const { width } = useWindowDimensions();
  const config = introCopy[sectionType];
  const copy = config[language];
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
          style={[styles.card, { width: Math.min(width * 0.86, 360) }]}>
          <View style={styles.artworkWrap}>
            <Image source={config.artwork} contentFit="contain" style={styles.artwork} />
            {sectionType === 'understand' ? (
              <MaterialIcons name="lightbulb" size={31} color="#F1D15A" style={styles.bulbIcon} />
            ) : null}
            {sectionType === 'culture_note' ? (
              <Image
                source={require('@/assets/images/free_lesson_intermediate_hollywood.webp')}
                contentFit="contain"
                style={styles.hollywoodArt}
              />
            ) : null}
          </View>
          <AppText language={language} style={[styles.title, language === 'th' ? styles.titleThai : null]}>
            {copy.title}
          </AppText>
          <AppText language={language} style={[styles.tagline, { color: config.accent }]}>
            {copy.tagline}
          </AppText>
          <AppText language={language} style={[styles.body, language === 'th' ? styles.bodyThai : null]}>
            {copy.body}
          </AppText>
        </Animated.View>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(bottomInset, 16) + 16 }]}>
        <Pressable
          accessibilityRole="button"
          disabled={isLeaving}
          onPress={handleContinue}
          style={({ pressed }) => [styles.continueButton, pressed ? styles.continueButtonPressed : null]}>
          <AppText language={language} style={styles.continueText}>
            {language === 'th' ? 'ดำเนินการต่อ' : 'CONTINUE'}
          </AppText>
        </Pressable>
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
    minHeight: 82,
    alignItems: 'flex-end',
    paddingHorizontal: 24,
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
    paddingBottom: 34,
  },
  card: {
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 9,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 22,
    paddingVertical: 24,
    boxShadow: `4px 4px 0px ${theme.colors.shadow}`,
  },
  artworkWrap: {
    width: 170,
    height: 150,
    marginBottom: 9,
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  bulbIcon: {
    position: 'absolute',
    right: -4,
    top: 16,
  },
  hollywoodArt: {
    position: 'absolute',
    right: -12,
    bottom: 6,
    width: 95,
    height: 50,
  },
  title: {
    width: '100%',
    color: theme.colors.text,
    fontFamily: theme.typography.fontFaces.en.bold,
    fontSize: 22,
    lineHeight: 30,
    textAlign: 'center',
  },
  titleThai: {
    fontSize: 21,
    lineHeight: 31,
  },
  tagline: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  body: {
    width: '100%',
    maxWidth: 270,
    marginTop: 7,
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  bodyThai: {
    fontSize: 13,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 28,
  },
  continueButton: {
    minHeight: 43,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    backgroundColor: '#2860E8',
    boxShadow: `3px 3px 0px ${theme.colors.shadow}`,
  },
  continueButtonPressed: {
    transform: [{ translateX: 2 }, { translateY: 2 }],
    boxShadow: `1px 1px 0px ${theme.colors.shadow}`,
  },
  continueText: {
    color: theme.colors.surface,
    fontSize: 11,
    lineHeight: 17,
    fontFamily: theme.typography.fontFaces.en.semibold,
    textAlign: 'center',
  },
});
