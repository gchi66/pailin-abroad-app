import React from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';

import checkCircleImage from '@/assets/images/CheckCircle.png';
import { AppText } from '@/src/components/ui/AppText';
import { Card } from '@/src/components/ui/Card';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { Stack } from '@/src/components/ui/Stack';
import { StandardPageHeader } from '@/src/components/ui/StandardPageHeader';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { usePathwayData } from '@/src/hooks/use-pathway-data';
import { theme } from '@/src/theme/theme';

type UiLanguage = 'en' | 'th';

const pickText = (preferred: string | null, fallback: string | null, emptyFallback = '') => {
  const preferredText = preferred?.trim();
  if (preferredText) {
    return preferredText;
  }

  const fallbackText = fallback?.trim();
  if (fallbackText) {
    return fallbackText;
  }

  return emptyFallback;
};

const getCopy = (uiLanguage: UiLanguage) => {
  if (uiLanguage === 'th') {
    return {
      title: 'บทเรียนที่เรียนจบ',
      subtitle: 'ประวัติบทเรียนที่เสร็จสมบูรณ์แล้วจากบัญชีปัจจุบันของคุณ',
      empty: 'เมื่อคุณเรียนจบบทเรียน รายการทั้งหมดจะปรากฏที่นี่',
      loading: 'กำลังโหลดประวัติบทเรียน...',
    };
  }

  return {
    title: 'Completed Lessons',
    subtitle: 'A history view of the lessons completed on your current account.',
    empty: 'Completed lessons will appear here once you start marking lessons done.',
    loading: 'Loading your completed lessons...',
  };
};

export function CompletedLessonsScreen() {
  const { uiLanguage } = useUiLanguage();
  const { hasAccount, hasMembership } = useAppSession();
  const copy = getCopy(uiLanguage);
  const { completedProgress, errorMessage, isCompletedProgressLoading } = usePathwayData({
    enabled: hasAccount,
    hasMembership,
  });

  if (isCompletedProgressLoading) {
    return <PageLoadingState language={uiLanguage} />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <Stack gap="md">
        <StandardPageHeader language={uiLanguage} title={copy.title} subtitle={copy.subtitle} />

        <View style={styles.listWrap}>
          <Stack gap="sm">
            {completedProgress.length > 0 ? (
              completedProgress.map((progress) => {
                const lesson = progress.lessons;
                if (!lesson) {
                  return null;
                }

                const lessonNumber =
                  typeof lesson.level === 'number' && typeof lesson.lesson_order === 'number'
                    ? `${lesson.level}.${lesson.lesson_order}`
                    : '–';
                const lessonTitle =
                  uiLanguage === 'th'
                    ? pickText(lesson.title_th, lesson.title, 'ไม่มีชื่อบทเรียน')
                    : pickText(lesson.title, lesson.title_th, 'Untitled lesson');
                const lessonFocus =
                  uiLanguage === 'th' ? pickText(lesson.focus_th, lesson.focus) : pickText(lesson.focus, lesson.focus_th);

                return (
                  <Card key={progress.id ?? progress.lesson_id} padding="md" radius="lg" style={styles.lessonCard}>
                    <View style={styles.lessonRow}>
                      <View style={styles.lessonMain}>
                        <AppText language={uiLanguage} variant="body" style={styles.lessonNumber}>
                          {lessonNumber}
                        </AppText>
                        <View style={styles.lessonCopy}>
                          <AppText language={uiLanguage} variant="body" style={styles.lessonTitle}>
                            {lessonTitle}
                          </AppText>
                          {lessonFocus ? (
                            <AppText language={uiLanguage} variant="muted" style={styles.lessonFocus}>
                              {lessonFocus}
                            </AppText>
                          ) : null}
                        </View>
                      </View>
                      <Image source={checkCircleImage} style={styles.icon} resizeMode="contain" />
                    </View>
                  </Card>
                );
              })
            ) : (
              <Card padding="lg" radius="lg" style={styles.emptyCard}>
                <AppText language={uiLanguage} variant="muted" style={styles.stateText}>
                  {errorMessage || copy.empty}
                </AppText>
              </Card>
            )}
          </Stack>
        </View>
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
    paddingBottom: theme.spacing.xl,
  },
  listWrap: {
    paddingHorizontal: theme.spacing.md,
  },
  centerState: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  stateText: {
    color: theme.colors.mutedText,
    textAlign: 'center',
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
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
