import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import discoImage from '@/assets/images/speaking-coach/lesson-complete-disco.webp';
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
  }>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { uiLanguage } = useUiLanguage();
  const lessonNumber = typeof params.lesson === 'string' && params.lesson.trim() ? params.lesson : '5.3';
  const lessonId = typeof params.lessonId === 'string' && params.lessonId.trim() ? params.lessonId : null;
  const libraryRoute = typeof params.libraryRoute === 'string' ? params.libraryRoute : null;
  const [isNavigating, setIsNavigating] = useState(false);
  const copy = getCopy(uiLanguage === 'th', lessonNumber);
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
        Alert.alert(copy.title, uiLanguage === 'th' ? 'ไม่มีบทเรียนถัดไป' : 'There is no next lesson yet.');
        return;
      }
      prefetchResolvedLesson(nextLesson.id, uiLanguage);
      router.replace({
        pathname: '/lessons/[id]',
        params: { id: nextLesson.id, ...(libraryRoute ? { libraryRoute } : {}) },
      });
    } catch {
      Alert.alert(copy.title, uiLanguage === 'th' ? 'ไม่สามารถเปิดบทเรียนถัดไปได้' : 'Could not open the next lesson.');
    } finally {
      setIsNavigating(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" backgroundColor="#FFFDEB" />
      <Image source={confettiImage} contentFit="fill" style={styles.confetti} pointerEvents="none" />
      <View pointerEvents="none" style={[styles.rightConfettiArea, { width: width * 0.32 }]}>
        <Image
          source={confettiImage}
          contentFit="fill"
          style={[styles.rightConfettiImage, { width, height }]}
        />
      </View>
      <View pointerEvents="none" style={[styles.hangingString, { height: insets.top + 8 }]} />
      <View style={[styles.statusStrip, { height: insets.top }]} />
      <ScrollView
        contentContainerStyle={[styles.canvas, { minHeight: Math.max(0, height - insets.top - insets.bottom) }]}
        showsVerticalScrollIndicator={false}>
        <Image source={discoImage} contentFit="contain" style={styles.disco} pointerEvents="none" />

        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.close}
            hitSlop={12}
            onPress={closeCompletion}
            style={styles.closeButton}>
            <MaterialIcons name="close" size={22} color="#232629" />
          </Pressable>

          <Image source={pailinImage} contentFit="contain" style={styles.pailin} />
          <AppText language={uiLanguage} style={styles.title}>{copy.title}</AppText>
          <AppText language={uiLanguage} style={styles.subtitle}>{copy.subtitle}</AppText>

          <Pressable accessibilityRole="button" onPress={openDiscussion} style={styles.discussionCard}>
            <View style={styles.discussionHeading}>
              <MaterialIcons name="question-answer" size={18} color="#232629" />
              <AppText language={uiLanguage} style={styles.discussionTitle}>{copy.discussion}</AppText>
            </View>
            <AppText language={uiLanguage} style={styles.discussionBody}>{copy.discussionBody}</AppText>
            <AppText language={uiLanguage} style={styles.discussionLink}>{copy.viewDiscussion}</AppText>
          </Pressable>

          <Pressable accessibilityRole="button" disabled={isNavigating} onPress={() => void openNextLesson()} style={[styles.nextButton, isNavigating ? styles.disabled : null]}>
            <AppText language={uiLanguage} style={styles.nextButtonText}>{copy.nextLesson}</AppText>
          </Pressable>
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
    paddingTop: 205,
    paddingBottom: 100,
  },
  confetti: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  rightConfettiArea: { position: 'absolute', top: 0, right: 0, bottom: 0, overflow: 'hidden' },
  rightConfettiImage: { position: 'absolute', top: 0, right: 0, transform: [{ scaleX: -1 }] },
  hangingString: {
    position: 'absolute', top: 0, alignSelf: 'center', width: 2,
    backgroundColor: '#623A02', transform: [{ translateX: 2.25 }],
  },
  disco: { position: 'absolute', top: -70, width: 215, height: 305, alignSelf: 'center' },
  card: {
    width: '100%',
    maxWidth: 355,
    borderWidth: 1,
    borderColor: '#24272A',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 35,
    alignItems: 'center',
    shadowColor: '#1E1E1E',
    shadowOpacity: 1,
    shadowOffset: { width: 5, height: 7 },
    shadowRadius: 0,
    elevation: 6,
  },
  closeButton: { position: 'absolute', top: 12, right: 12, zIndex: 1 },
  pailin: { width: 200, height: 170, marginBottom: 3 },
  title: { fontSize: 24, lineHeight: 31, fontWeight: '700', textAlign: 'center', color: '#24272A' },
  subtitle: { fontSize: 13, lineHeight: 19, textAlign: 'center', color: '#699832', marginTop: 4, marginBottom: 20 },
  discussionCard: {
    width: '100%', minHeight: 105, borderWidth: 1, borderColor: '#9BD0FF', borderRadius: 11,
    backgroundColor: '#F0F9FF', paddingHorizontal: 11, paddingTop: 11, paddingBottom: 9,
  },
  discussionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  discussionTitle: { fontSize: 11, lineHeight: 17, fontWeight: '600', letterSpacing: 0.5, color: '#24272A' },
  discussionBody: { fontSize: 11, lineHeight: 16, color: '#24272A', marginTop: 7 },
  discussionLink: { fontSize: 10, lineHeight: 15, color: '#1964C4', textAlign: 'right', marginTop: 5 },
  nextButton: {
    width: '100%', minHeight: 49, borderRadius: 27, backgroundColor: '#2861DB',
    borderWidth: 1, borderColor: '#20252A', alignItems: 'center', justifyContent: 'center',
    marginTop: 16, shadowColor: '#1E1E1E', shadowOpacity: 1,
    shadowOffset: { width: 3, height: 4 }, shadowRadius: 0, elevation: 4,
  },
  nextButtonText: { color: '#FFFFFF', fontSize: 12, lineHeight: 17, fontWeight: '600' },
  disabled: { opacity: 0.55 },
});
