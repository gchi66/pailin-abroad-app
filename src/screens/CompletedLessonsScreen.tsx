import React from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';

import checkCircleImage from '@/assets/images/CheckCircle.png';
import { AppText } from '@/src/components/ui/AppText';
import { Card } from '@/src/components/ui/Card';
import { Stack } from '@/src/components/ui/Stack';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';

type UiLanguage = 'en' | 'th';

type CompletedLesson = {
  id: string;
  number: string;
  title: { en: string; th: string };
  focus: { en: string; th: string };
};

const COMPLETED_LESSONS: CompletedLesson[] = [
  {
    id: 'completed-1',
    number: '1.1',
    title: { en: 'Starting a Conversation', th: 'เริ่มต้นบทสนทนา' },
    focus: { en: 'Greetings and easy follow-up questions', th: 'คำทักทายและคำถามต่อยอดง่ายๆ' },
  },
  {
    id: 'completed-2',
    number: '1.2',
    title: { en: 'Talking About Your Day', th: 'คุยเรื่องวันของคุณ' },
    focus: { en: 'Daily routines and natural transitions', th: 'กิจวัตรประจำวันและการเชื่อมบทสนทนาอย่างเป็นธรรมชาติ' },
  },
  {
    id: 'completed-3',
    number: '2.1',
    title: { en: 'Catching Up With Friends', th: 'อัปเดตชีวิตกับเพื่อน' },
    focus: { en: 'Small talk with more detail and confidence', th: 'Small talk ที่มีรายละเอียดและมั่นใจมากขึ้น' },
  },
  {
    id: 'completed-4',
    number: '2.2',
    title: { en: 'Making Plans Together', th: 'วางแผนด้วยกัน' },
    focus: { en: 'Suggestions, timing, and confirming plans', th: 'การเสนอความคิด เวลา และการยืนยันแผน' },
  },
];

const getCopy = (uiLanguage: UiLanguage) => {
  if (uiLanguage === 'th') {
    return {
      title: 'บทเรียนที่เรียนจบ',
      subtitle: 'หน้าประวัติบทเรียนฉบับ native สำหรับดูความคืบหน้าที่เสร็จแล้วในพรีวิวนี้',
    };
  }

  return {
    title: 'Completed Lessons',
    subtitle: 'A native history view for the lessons already marked complete in this preview.',
  };
};

export function CompletedLessonsScreen() {
  const { uiLanguage } = useUiLanguage();
  const copy = getCopy(uiLanguage);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <Stack gap="md">
        <View style={styles.headerBlock}>
          <Stack gap="sm">
            <AppText language={uiLanguage} variant="title" style={styles.title}>
              {copy.title}
            </AppText>
            <AppText language={uiLanguage} variant="body" style={styles.subtitle}>
              {copy.subtitle}
            </AppText>
          </Stack>
        </View>

        <Stack gap="sm">
          {COMPLETED_LESSONS.map((lesson) => (
            <Card key={lesson.id} padding="md" radius="lg" style={styles.lessonCard}>
              <View style={styles.lessonRow}>
                <View style={styles.lessonMain}>
                  <AppText language={uiLanguage} variant="body" style={styles.lessonNumber}>
                    {lesson.number}
                  </AppText>
                  <View style={styles.lessonCopy}>
                    <AppText language={uiLanguage} variant="body" style={styles.lessonTitle}>
                      {uiLanguage === 'th' ? lesson.title.th : lesson.title.en}
                    </AppText>
                    <AppText language={uiLanguage} variant="muted" style={styles.lessonFocus}>
                      {uiLanguage === 'th' ? lesson.focus.th : lesson.focus.en}
                    </AppText>
                  </View>
                </View>
                <Image source={checkCircleImage} style={styles.icon} resizeMode="contain" />
              </View>
            </Card>
          ))}
        </Stack>
      </Stack>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  headerBlock: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  title: {
    color: theme.colors.text,
  },
  subtitle: {
    color: theme.colors.mutedText,
  },
  lessonCard: {
    backgroundColor: theme.colors.surface,
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  lessonMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  lessonNumber: {
    minWidth: 42,
    fontWeight: theme.typography.weights.semibold,
  },
  lessonCopy: {
    flex: 1,
    gap: 2,
  },
  lessonTitle: {
    fontWeight: theme.typography.weights.semibold,
  },
  lessonFocus: {
    color: theme.colors.mutedText,
  },
  icon: {
    width: 20,
    height: 20,
  },
});
