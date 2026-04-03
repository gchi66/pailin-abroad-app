import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { StandardPageHeader } from '@/src/components/ui/StandardPageHeader';
import { AppText } from '@/src/components/ui/AppText';
import { Card } from '@/src/components/ui/Card';
import { Stack } from '@/src/components/ui/Stack';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { PathwayLessonRow, usePathwayData } from '@/src/hooks/use-pathway-data';
import { theme } from '@/src/theme/theme';
import { LessonListItem } from '@/src/types/lesson';

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

const getLessonTitle = (lesson: LessonListItem, uiLanguage: UiLanguage, emptyFallback: string) =>
  uiLanguage === 'th'
    ? pickText(lesson.title_th, lesson.title, emptyFallback)
    : pickText(lesson.title, lesson.title_th, emptyFallback);

const getLessonNumber = (lesson: LessonListItem) => {
  if (typeof lesson.level === 'number' && typeof lesson.lesson_order === 'number') {
    return `${lesson.level}.${lesson.lesson_order}`;
  }

  return '–';
};

const getProgressContext = (pathwayRows: PathwayLessonRow[], resumeRow: PathwayLessonRow | null) => {
  const anchorLesson = resumeRow?.lesson ?? pathwayRows[pathwayRows.length - 1]?.lesson ?? null;
  const anchorStage = anchorLesson?.stage ?? null;
  const anchorLevel = anchorLesson?.level ?? null;
  const levelRows = pathwayRows.filter((row) => row.lesson.stage === anchorStage && row.lesson.level === anchorLevel);
  const levelCompletedCount = levelRows.filter((row) => row.state === 'completed').length;
  const levelTotalCount = levelRows.length;
  const levelPercent = levelTotalCount > 0 ? Math.round((levelCompletedCount / levelTotalCount) * 100) : 0;

  return {
    stage: anchorStage?.trim() || null,
    level: anchorLevel,
    levelCompletedCount,
    levelTotalCount,
    levelPercent,
  };
};

const getCopy = (uiLanguage: UiLanguage) => {
  if (uiLanguage === 'th') {
    return {
      title: 'ความคืบหน้าการเรียน',
      subtitle: 'หน้ารายละเอียดสำหรับติดตามสเตจ เลเวล และประวัติการเรียนของคุณ',
      stage: 'สเตจปัจจุบัน',
      level: 'เลเวลปัจจุบัน',
      lessonsCompleted: 'บทเรียนที่จบ',
      levelsCompleted: 'เลเวลที่จบ',
      currentLevelProgress: 'ความคืบหน้าเลเวลนี้',
      recentProgress: 'เรียนจบล่าสุด',
      upcomingHistory: 'ประวัติแบบละเอียด',
      upcomingHistoryBody: 'หน้านี้จะขยายต่อด้วยไทม์ไลน์การเรียน สรุปตามสเตจ และมุมมองย้อนหลังแบบละเอียด',
      emptyRecent: 'เมื่อคุณเรียนจบบทเรียน รายการล่าสุดจะปรากฏที่นี่',
      untitledLesson: 'ไม่มีชื่อบทเรียน',
      loading: 'กำลังโหลดข้อมูลความคืบหน้า...',
      fallbackStage: 'เส้นทางหลัก',
    };
  }

  return {
    title: 'Learning Progress',
    subtitle: 'A dedicated place for your stage, level, and a fuller view of your lesson progress history.',
    stage: 'Current stage',
    level: 'Current level',
    lessonsCompleted: 'Lessons completed',
    levelsCompleted: 'Levels completed',
    currentLevelProgress: 'Current level progress',
    recentProgress: 'Recent progress',
    upcomingHistory: 'Detailed history',
    upcomingHistoryBody: 'This page is ready to grow into a fuller progress history with timeline views, stage summaries, and deeper learning analytics.',
    emptyRecent: 'Completed lessons will appear here once you start marking lessons done.',
    untitledLesson: 'Untitled lesson',
    loading: 'Loading your progress...',
    fallbackStage: 'Main pathway',
  };
};

export function LearningProgressScreen() {
  const { uiLanguage } = useUiLanguage();
  const { hasAccount, hasMembership, profile } = useAppSession();
  const copy = getCopy(uiLanguage);
  const { completedProgress, completedLessons, isLoading, pathwayRows, resumeRow, stats } = usePathwayData({
    enabled: hasAccount,
    hasMembership,
  });

  const progressContext = useMemo(() => getProgressContext(pathwayRows, resumeRow), [pathwayRows, resumeRow]);
  const recentCompleted = useMemo(() => completedProgress.slice(0, 5), [completedProgress]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <Stack gap="md">
        <StandardPageHeader language={uiLanguage} title={copy.title} subtitle={copy.subtitle} />

        <View style={styles.inner}>
          {isLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={theme.colors.accent} />
              <AppText language={uiLanguage} variant="muted" style={styles.stateText}>
                {copy.loading}
              </AppText>
            </View>
          ) : (
            <Stack gap="md">
              <Card padding="md" radius="lg" style={styles.summaryCard}>
                <Stack gap="sm">
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryCellWide}>
                      <AppText language={uiLanguage} variant="caption" style={styles.summaryLabel}>
                        {copy.stage}
                      </AppText>
                      <AppText language={uiLanguage} variant="body" style={styles.summaryValue}>
                        {progressContext.stage || copy.fallbackStage}
                      </AppText>
                    </View>

                    <View style={styles.summaryCell}>
                      <AppText language={uiLanguage} variant="caption" style={styles.summaryLabel}>
                        {copy.level}
                      </AppText>
                      <AppText language={uiLanguage} variant="body" style={styles.summaryValue}>
                        {typeof progressContext.level === 'number' ? progressContext.level : '–'}
                      </AppText>
                    </View>
                  </View>

                  <View style={styles.summaryRow}>
                    <View style={styles.summaryCell}>
                      <AppText language={uiLanguage} variant="caption" style={styles.summaryLabel}>
                        {copy.lessonsCompleted}
                      </AppText>
                      <AppText language={uiLanguage} variant="body" style={styles.summaryValue}>
                        {stats?.lessons_completed ?? profile?.lessons_complete ?? completedLessons.length}
                      </AppText>
                    </View>

                    <View style={styles.summaryCell}>
                      <AppText language={uiLanguage} variant="caption" style={styles.summaryLabel}>
                        {copy.levelsCompleted}
                      </AppText>
                      <AppText language={uiLanguage} variant="body" style={styles.summaryValue}>
                        {stats?.levels_completed ?? 0}
                      </AppText>
                    </View>
                  </View>
                </Stack>
              </Card>

              <Card padding="md" radius="lg" style={styles.levelCard}>
                <Stack gap="sm">
                  <AppText language={uiLanguage} variant="caption" style={styles.sectionLabel}>
                    {copy.currentLevelProgress}
                  </AppText>

                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${Math.max(progressContext.levelPercent, 4)}%` }]} />
                  </View>

                  <View style={styles.progressFooter}>
                    <AppText language={uiLanguage} variant="body" style={styles.progressBody}>
                      {progressContext.levelCompletedCount} / {progressContext.levelTotalCount || 0}
                    </AppText>
                    <AppText language={uiLanguage} variant="body" style={styles.progressBody}>
                      {progressContext.levelPercent}%
                    </AppText>
                  </View>
                </Stack>
              </Card>

              <Stack gap="sm">
                <AppText language={uiLanguage} variant="caption" style={styles.sectionLabel}>
                  {copy.recentProgress}
                </AppText>

                {recentCompleted.length > 0 ? (
                  recentCompleted.map((progress) => {
                    const lesson = progress.lessons;
                    if (!lesson) {
                      return null;
                    }

                    return (
                      <Card key={progress.id ?? progress.lesson_id} padding="md" radius="lg" style={styles.lessonCard}>
                        <View style={styles.lessonRow}>
                          <AppText language={uiLanguage} variant="caption" style={styles.lessonNumber}>
                            {getLessonNumber(lesson)}
                          </AppText>
                          <View style={styles.lessonCopy}>
                            <AppText language={uiLanguage} variant="body" style={styles.lessonTitle}>
                              {getLessonTitle(lesson, uiLanguage, copy.untitledLesson)}
                            </AppText>
                            <AppText language={uiLanguage} variant="muted" style={styles.lessonMeta}>
                              {lesson.stage || copy.fallbackStage}
                            </AppText>
                          </View>
                        </View>
                      </Card>
                    );
                  })
                ) : (
                  <Card padding="md" radius="lg" style={styles.lessonCard}>
                    <AppText language={uiLanguage} variant="muted" style={styles.stateText}>
                      {copy.emptyRecent}
                    </AppText>
                  </Card>
                )}
              </Stack>

              <Card padding="md" radius="lg" style={styles.placeholderCard}>
                <Stack gap="sm">
                  <AppText language={uiLanguage} variant="caption" style={styles.sectionLabel}>
                    {copy.upcomingHistory}
                  </AppText>
                  <AppText language={uiLanguage} variant="body" style={styles.placeholderBody}>
                    {copy.upcomingHistoryBody}
                  </AppText>
                </Stack>
              </Card>
            </Stack>
          )}
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
  inner: {
    paddingHorizontal: theme.spacing.md,
  },
  centerState: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  stateText: {
    textAlign: 'center',
    color: theme.colors.mutedText,
  },
  summaryCard: {
    backgroundColor: '#DCEEFF',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  summaryCellWide: {
    flex: 1.4,
    minHeight: 88,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  summaryCell: {
    flex: 1,
    minHeight: 88,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  summaryLabel: {
    color: '#66758A',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryValue: {
    fontWeight: theme.typography.weights.bold,
    fontSize: 22,
    lineHeight: 28,
  },
  sectionLabel: {
    color: '#7B8797',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: theme.typography.weights.bold,
  },
  levelCard: {
    backgroundColor: theme.colors.surface,
  },
  progressTrack: {
    height: 12,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
    borderRightWidth: 1,
    borderColor: theme.colors.border,
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBody: {
    fontWeight: theme.typography.weights.bold,
  },
  lessonCard: {
    backgroundColor: theme.colors.surface,
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  lessonNumber: {
    minWidth: 42,
    color: '#94A6BB',
    fontWeight: theme.typography.weights.bold,
  },
  lessonCopy: {
    flex: 1,
    gap: 2,
  },
  lessonTitle: {
    fontWeight: theme.typography.weights.bold,
  },
  lessonMeta: {
    color: '#7B8797',
  },
  placeholderCard: {
    backgroundColor: '#F8FCFF',
  },
  placeholderBody: {
    color: theme.colors.mutedText,
  },
});
