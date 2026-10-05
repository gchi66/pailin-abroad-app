import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import pailinImage from '@/assets/images/speaking-coach/pailin-lesson-finished.webp';
import confettiImage from '@/assets/images/speaking-coach/lesson-complete-confetti.png';
import { AppText } from '@/src/components/ui/AppText';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { getLessonsIndex, prefetchResolvedLesson } from '@/src/api/lessons';

const LESSON_STAGE_ORDER = ['Beginner', 'Intermediate', 'Advanced', 'Expert'] as const;

const getCopy = (thai: boolean, lessonNumber: string) => {
  const checkpointMatch = lessonNumber.match(/^(\d+)\.chp$/i);
  const completionName = checkpointMatch
    ? thai
      ? `เช็คพอยต์เลเวล ${checkpointMatch[1]}`
      : `the Level ${checkpointMatch[1]} Checkpoint`
    : thai
      ? `บทเรียน ${lessonNumber}`
      : `Lesson ${lessonNumber}`;

  return thai
    ? {
        title: 'เรียนจบบทเรียนแล้ว!',
        subtitle: `คุณเรียนจบ${completionName}แล้ว!`,
        discussion: 'ร่วมพูดคุย',
        discussionBody: 'ตอบคำถามประจำบทเรียนหรือถามคำถามของคุณ',
        viewDiscussion: 'ดูการพูดคุย →',
        nextLesson: 'ไปบทเรียนถัดไป',
        close: 'ปิดตัวอย่าง',
        previewTitle: 'ตัวอย่างหน้าเรียนจบ',
        previewBody: 'ปุ่มนี้จะแสดงการทำงานเมื่อเชื่อมกับบทเรียนจริง',
      }
    : {
        title: 'LESSON COMPLETE!',
        subtitle: `You finished ${completionName}!`,
        discussion: 'JOIN THE DISCUSSION',
        discussionBody: 'Answer this lesson’s discussion question or ask a question you have!',
        viewDiscussion: 'VIEW DISCUSSION →',
        nextLesson: 'GO TO NEXT LESSON',
        close: 'Close preview',
        previewTitle: 'Lesson complete preview',
        previewBody: 'This action will be available when the page is connected to a real lesson.',
      };
};

export function LessonCompletePreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    lesson?: string;
    lessonId?: string;
    libraryRoute?: string;
    language?: string;
  }>();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { uiLanguage } = useUiLanguage();
  const lessonNumber = typeof params.lesson === 'string' && params.lesson.trim() ? params.lesson : '5.3';
  const lessonId = typeof params.lessonId === 'string' && params.lessonId.trim() ? params.lessonId : null;
  const libraryRoute = typeof params.libraryRoute === 'string' ? params.libraryRoute : null;
  const lessonLanguage = params.language === 'en' || params.language === 'th' ? params.language : uiLanguage;
  const isCheckpoint = /^(\d+)\.chp$/i.test(lessonNumber);
  const [isNavigating, setIsNavigating] = useState(false);
  const copy = getCopy(lessonLanguage === 'th', lessonNumber);
  const showPreviewNotice = () => Alert.alert(copy.previewTitle, copy.previewBody);
  const closeCompletion = () => {
    router.back();
  };
  const openDiscussion = () => {
    if (!lessonId) {
      showPreviewNotice();
      return;
    }
    router.push({ pathname: '/lesson-discussion/[id]', params: { id: lessonId } });
  };
  const openNextLesson = async () => {
    if (!lessonId) {
      showPreviewNotice();
      return;
    }

    setIsNavigating(true);
    try {
      const lessons = [...await getLessonsIndex()].sort((left, right) => {
        const leftStage = LESSON_STAGE_ORDER.indexOf((left.stage ?? '') as (typeof LESSON_STAGE_ORDER)[number]);
        const rightStage = LESSON_STAGE_ORDER.indexOf((right.stage ?? '') as (typeof LESSON_STAGE_ORDER)[number]);
        const stageDelta = (leftStage < 0 ? Number.MAX_SAFE_INTEGER : leftStage) -
          (rightStage < 0 ? Number.MAX_SAFE_INTEGER : rightStage);
        if (stageDelta !== 0) return stageDelta;
        const levelDelta = (left.level ?? Number.MAX_SAFE_INTEGER) - (right.level ?? Number.MAX_SAFE_INTEGER);
        if (levelDelta !== 0) return levelDelta;
        return (left.lesson_order ?? Number.MAX_SAFE_INTEGER) - (right.lesson_order ?? Number.MAX_SAFE_INTEGER);
      });
      const currentIndex = lessons.findIndex((lesson) => lesson.id === lessonId);
      const nextLesson = currentIndex >= 0 ? lessons[currentIndex + 1] : null;
      if (!nextLesson?.id) {
        Alert.alert(copy.title, lessonLanguage === 'th' ? 'ไม่มีบทเรียนถัดไป' : 'There is no next lesson yet.');
        return;
      }
      prefetchResolvedLesson(nextLesson.id, lessonLanguage);
      router.replace({
        pathname: '/lessons/[id]',
        params: { id: nextLesson.id, ...(libraryRoute ? { libraryRoute } : {}) },
      });
    } catch {
      Alert.alert(copy.title, lessonLanguage === 'th' ? 'ไม่สามารถเปิดบทเรียนถัดไปได้' : 'Could not open the next lesson.');
    } finally {
      setIsNavigating(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" backgroundColor="#FFFDEB" />
      <Image source={confettiImage} contentFit="fill" style={styles.confetti} pointerEvents="none" />
      <View style={[styles.statusStrip, { height: insets.top }]} />
      <ScrollView
        contentContainerStyle={[styles.canvas, { minHeight: Math.max(0, height - insets.top - insets.bottom) }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.completionPanel}>
          <Image source={pailinImage} contentFit="contain" style={styles.pailin} pointerEvents="none" />

          <View style={styles.card}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.close}
              hitSlop={12}
              onPress={closeCompletion}
              style={styles.closeButton}>
              <MaterialIcons name="close" size={22} color="#232629" />
            </Pressable>

            <View style={styles.completionHeading}>
              <AppText language={lessonLanguage} style={styles.title}>{copy.subtitle}</AppText>
              <View
                pointerEvents="none"
                style={[styles.successRays, isCheckpoint ? styles.checkpointSuccessRays : null]}>
                <View style={[styles.successRay, styles.successRayTop]} />
                <View style={styles.successRay} />
                <View style={[styles.successRay, styles.successRayBottom]} />
              </View>
            </View>

            <View style={styles.divider} />

            <Pressable accessibilityRole="button" onPress={openDiscussion} style={styles.discussionSection}>
              <View style={styles.discussionHeading}>
                <MaterialIcons name="question-answer" size={18} color="#232629" />
                <AppText language={lessonLanguage} style={styles.discussionTitle}>{copy.discussion}</AppText>
              </View>
              <AppText language={lessonLanguage} style={styles.discussionBody}>{copy.discussionBody}</AppText>
              <AppText language={lessonLanguage} style={styles.discussionLink}>{copy.viewDiscussion}</AppText>
            </Pressable>

            <View style={[styles.divider, styles.discussionDivider]} />

            <Pressable accessibilityRole="button" disabled={isNavigating} onPress={() => void openNextLesson()} style={[styles.nextButton, isNavigating ? styles.disabled : null]}>
              <AppText language={lessonLanguage} style={styles.nextButtonText}>{copy.nextLesson}</AppText>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFDEB' },
  statusStrip: { backgroundColor: 'transparent' },
  canvas: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 64,
  },
  confetti: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  completionPanel: { width: '100%', maxWidth: 330, paddingTop: 222, alignItems: 'center' },
  pailin: {
    position: 'absolute',
    top: 0,
    width: 310,
    height: 310,
    alignSelf: 'center',
  },
  card: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#24272A',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    paddingTop: 34,
    paddingBottom: 24,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#1E1E1E',
    shadowOpacity: 1,
    shadowOffset: { width: 5, height: 7 },
    shadowRadius: 0,
    elevation: 6,
  },
  closeButton: { position: 'absolute', top: 13, right: 13, zIndex: 1 },
  completionHeading: {
    width: '100%',
    minHeight: 72,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    maxWidth: 235,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    textAlign: 'center',
    color: '#24272A',
  },
  successRays: {
    position: 'absolute',
    left: '50%',
    marginLeft: 101,
    width: 24,
    height: 54,
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  checkpointSuccessRays: { marginLeft: 122 },
  successRay: { width: 22, height: 4, borderRadius: 3, backgroundColor: '#A8DF67' },
  successRayTop: { transform: [{ rotate: '-20deg' }] },
  successRayBottom: { transform: [{ rotate: '39deg' }] },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#D2D2D2',
    marginVertical: 23,
  },
  discussionDivider: { marginTop: 18 },
  discussionSection: { width: '100%', alignItems: 'center', paddingHorizontal: 6 },
  discussionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  discussionTitle: { fontSize: 14, lineHeight: 21, fontWeight: '600', letterSpacing: 0.5, color: '#24272A' },
  discussionBody: { fontSize: 13, lineHeight: 21, color: '#24272A', textAlign: 'center', marginTop: 10 },
  discussionLink: { fontSize: 13, lineHeight: 20, fontWeight: '600', color: '#2861DB', textAlign: 'center', marginTop: 14 },
  nextButton: {
    width: '100%', minHeight: 50, borderRadius: 25, backgroundColor: '#2861DB',
    borderWidth: 1, borderColor: '#20252A',
    alignItems: 'center', justifyContent: 'center',
  },
  nextButtonText: { color: '#FFFFFF', fontSize: 14, lineHeight: 20, fontWeight: '600' },
  disabled: { opacity: 0.55 },
});
