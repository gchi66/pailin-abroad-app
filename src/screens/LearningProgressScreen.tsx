import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/src/components/ui/AppText';
import { Card } from '@/src/components/ui/Card';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { Stack } from '@/src/components/ui/Stack';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { PathwayLessonRow, usePathwayData } from '@/src/hooks/use-pathway-data';
import { theme } from '@/src/theme/theme';
import { LessonListItem } from '@/src/types/lesson';

type UiLanguage = 'en' | 'th';

type StageBreakdownRow = {
  stage: string;
  completedCount: number;
  totalCount: number;
  percent: number;
};

type ProgressContext = {
  stage: string | null;
  level: number | null;
  levelCompletedCount: number;
  levelTotalCount: number;
  levelPercent: number;
};

const STAGE_ORDER = ['Beginner', 'Intermediate', 'Advanced', 'Expert'] as const;

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

const getProgressContext = (
  pathwayRows: PathwayLessonRow[],
  allLessons: LessonListItem[],
  completedLessons: LessonListItem[],
  resumeRow: PathwayLessonRow | null,
): ProgressContext => {
  const anchorLesson = resumeRow?.lesson ?? pathwayRows[pathwayRows.length - 1]?.lesson ?? null;
  const anchorStage = anchorLesson?.stage ?? null;
  const anchorLevel = anchorLesson?.level ?? null;
  const levelLessons = allLessons.filter((lesson) => lesson.stage === anchorStage && lesson.level === anchorLevel);
  const completedIds = new Set(
    completedLessons
      .filter((lesson) => lesson.stage === anchorStage && lesson.level === anchorLevel)
      .map((lesson) => lesson.id),
  );
  const levelCompletedCount = levelLessons.filter((lesson) => completedIds.has(lesson.id)).length;
  const levelTotalCount = levelLessons.length;
  const levelPercent = levelTotalCount > 0 ? Math.round((levelCompletedCount / levelTotalCount) * 100) : 0;

  return {
    stage: anchorStage?.trim() || null,
    level: anchorLevel,
    levelCompletedCount,
    levelTotalCount,
    levelPercent,
  };
};

const getStageBreakdown = (allLessons: LessonListItem[], completedLessons: LessonListItem[]) => {
  const completedIds = new Set(completedLessons.map((lesson) => lesson.id));

  return STAGE_ORDER.map((stage) => {
    const stageLessons = allLessons.filter((lesson) => lesson.stage === stage);
    const completedCount = stageLessons.filter((lesson) => completedIds.has(lesson.id)).length;
    const totalCount = stageLessons.length;
    const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return {
      stage,
      completedCount,
      totalCount,
      percent,
    } satisfies StageBreakdownRow;
  });
};

const formatLearningSince = (value: string | null, uiLanguage: UiLanguage) => {
  if (!value) {
    return uiLanguage === 'th' ? 'เพิ่งเริ่มในแอป' : 'Recently';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(uiLanguage === 'th' ? 'th-TH' : 'en-US', {
    month: 'short',
    year: 'numeric',
  });
};

const formatCompletedAgo = (value: string | null, uiLanguage: UiLanguage) => {
  if (!value) {
    return uiLanguage === 'th' ? 'ล่าสุด' : 'Recently';
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }

  const diffMs = Date.now() - timestamp;
  const dayMs = 1000 * 60 * 60 * 24;
  const days = Math.max(0, Math.floor(diffMs / dayMs));

  if (uiLanguage === 'th') {
    if (days <= 0) {
      return 'วันนี้';
    }

    if (days === 1) {
      return '1 วันที่แล้ว';
    }

    return `${days} วันที่แล้ว`;
  }

  if (days <= 0) {
    return 'Today';
  }

  if (days === 1) {
    return '1 day ago';
  }

  return `${days} days ago`;
};

const getCopy = (uiLanguage: UiLanguage) => {
  if (uiLanguage === 'th') {
    return {
      backLink: 'เส้นทางของฉัน',
      titleLineOne: 'ความคืบหน้า',
      titleLineTwo: 'การเรียน',
      currentStage: 'สเตจปัจจุบัน',
      learningSince: 'เริ่มเรียนเมื่อ',
      lessonsCompleted: 'บทเรียนที่จบ',
      levelsCompleted: 'เลเวลที่จบ',
      currentLevel: 'เลเวลปัจจุบัน',
      totalLessonsAvailable: 'บทเรียนทั้งหมด',
      stageBreakdown: 'ภาพรวมแต่ละสเตจ',
      recentLessons: 'บทเรียนล่าสุด',
      untitledLesson: 'ไม่มีชื่อบทเรียน',
      fallbackStage: 'เส้นทางหลัก',
      loading: 'กำลังโหลดข้อมูลความคืบหน้า...',
    };
  }

  return {
    backLink: 'My Pathway',
    titleLineOne: 'Learning',
    titleLineTwo: 'Progress',
    currentStage: 'Current stage',
    learningSince: 'Learning since',
    lessonsCompleted: 'Lessons completed',
    levelsCompleted: 'Levels completed',
    currentLevel: 'Current level',
    totalLessonsAvailable: 'Total lessons available',
    stageBreakdown: 'Stage breakdown',
    recentLessons: 'Recent lessons',
    untitledLesson: 'Untitled lesson',
    fallbackStage: 'Main pathway',
    loading: 'Loading your progress...',
  };
};

export function LearningProgressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { uiLanguage } = useUiLanguage();
  const { hasAccount, hasMembership, profile } = useAppSession();
  const copy = getCopy(uiLanguage);
  const {
    allLessons,
    completedLessons,
    completedProgress,
    isCompletedProgressLoading,
    isLessonIndexLoading,
    isLoading,
    isStatsLoading,
    pathwayRows,
    resumeRow,
    stats,
  } = usePathwayData({
    enabled: hasAccount,
    hasMembership,
  });

  const progressContext = useMemo(
    () => getProgressContext(pathwayRows, allLessons, completedLessons, resumeRow),
    [allLessons, completedLessons, pathwayRows, resumeRow],
  );
  const stageBreakdown = useMemo(() => getStageBreakdown(allLessons, completedLessons), [allLessons, completedLessons]);
  const recentCompleted = useMemo(() => completedProgress.slice(0, 3), [completedProgress]);

  if (isLoading || isCompletedProgressLoading || isLessonIndexLoading || isStatsLoading) {
    return <PageLoadingState language={uiLanguage} />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <Stack gap="md">
        <View style={styles.headerBlock}>
          <View style={{ height: Math.max(insets.top - 6, theme.spacing.sm) }} />
          <Pressable accessibilityRole="button" style={styles.backLinkWrap} onPress={() => router.push('/(tabs)')}>
            <AppText language={uiLanguage} variant="caption" style={styles.backLink}>
              ‹ {copy.backLink}
            </AppText>
          </Pressable>

          <AppText language={uiLanguage} variant="title" style={styles.headerTitle}>
            {copy.titleLineOne}
          </AppText>
          <AppText language={uiLanguage} variant="title" style={styles.headerTitleAccent}>
            {copy.titleLineTwo}
          </AppText>
        </View>

        <Card padding="md" radius="lg" style={styles.stageCard}>
          <View style={styles.stageCardRow}>
            <View style={styles.stagePrimary}>
              <AppText language={uiLanguage} variant="caption" style={styles.cardEyebrow}>
                {copy.currentStage}
              </AppText>
              <AppText language={uiLanguage} variant="body" style={styles.stageValue}>
                {progressContext.stage || copy.fallbackStage}
              </AppText>
              {typeof progressContext.level === 'number' ? (
                <View style={styles.levelPill}>
                  <AppText language={uiLanguage} variant="caption" style={styles.levelPillText}>
                    Level {progressContext.level}
                  </AppText>
                </View>
              ) : null}
            </View>

            <View style={styles.sinceBlock}>
              <AppText language={uiLanguage} variant="caption" style={styles.sinceLabel}>
                {copy.learningSince}
              </AppText>
              <AppText language={uiLanguage} variant="body" style={styles.sinceValue}>
                {formatLearningSince(profile?.created_at ?? null, uiLanguage)}
              </AppText>
            </View>
          </View>
        </Card>

        <View style={styles.metricsGrid}>
          <Card padding="md" radius="lg" style={styles.metricCard}>
            <AppText language={uiLanguage} variant="body" style={styles.metricValue}>
              {stats?.lessons_completed ?? profile?.lessons_complete ?? completedLessons.length}
            </AppText>
            <AppText language={uiLanguage} variant="caption" style={styles.metricLabel}>
              {copy.lessonsCompleted}
            </AppText>
          </Card>

          <Card padding="md" radius="lg" style={styles.metricCard}>
            <AppText language={uiLanguage} variant="body" style={styles.metricValue}>
              {stats?.levels_completed ?? 0}
            </AppText>
            <AppText language={uiLanguage} variant="caption" style={styles.metricLabel}>
              {copy.levelsCompleted}
            </AppText>
          </Card>

          <Card padding="md" radius="lg" style={styles.metricCard}>
            <AppText language={uiLanguage} variant="body" style={styles.metricValue}>
              {typeof progressContext.level === 'number' ? progressContext.level : '–'}
            </AppText>
            <AppText language={uiLanguage} variant="caption" style={styles.metricLabel}>
              {copy.currentLevel}
            </AppText>
          </Card>

          <Card padding="md" radius="lg" style={styles.metricCard}>
            <AppText language={uiLanguage} variant="body" style={styles.metricValue}>
              {allLessons.length}
            </AppText>
            <AppText language={uiLanguage} variant="caption" style={styles.metricLabel}>
              {copy.totalLessonsAvailable}
            </AppText>
          </Card>
        </View>

        <Stack gap="sm">
          <AppText language={uiLanguage} variant="caption" style={styles.sectionEyebrow}>
            {copy.stageBreakdown}
          </AppText>

          <Stack gap="xs">
            {stageBreakdown.map((row) => (
              <View key={row.stage} style={styles.breakdownRow}>
                <AppText language={uiLanguage} variant="caption" style={styles.breakdownStage}>
                  {row.stage}
                </AppText>

                <View style={styles.breakdownTrack}>
                  <View style={[styles.breakdownFill, { width: `${row.percent}%` }]} />
                </View>

                <AppText language={uiLanguage} variant="caption" style={styles.breakdownCount}>
                  {row.completedCount}
                </AppText>
              </View>
            ))}
          </Stack>
        </Stack>

        <Stack gap="sm">
          <AppText language={uiLanguage} variant="caption" style={styles.sectionEyebrow}>
            {copy.recentLessons}
          </AppText>

          <Stack gap="sm">
            {recentCompleted.map((progress) => {
              const lesson = progress.lessons;
              if (!lesson) {
                return null;
              }

              return (
                <Card key={progress.id ?? progress.lesson_id} padding="md" radius="lg" style={styles.recentCard}>
                  <View style={styles.recentRow}>
                    <View style={styles.recentDot} />
                    <AppText language={uiLanguage} variant="caption" style={styles.recentNumber}>
                      {getLessonNumber(lesson)}
                    </AppText>
                    <View style={styles.recentCopy}>
                      <AppText language={uiLanguage} variant="body" style={styles.recentTitle}>
                        {getLessonTitle(lesson, uiLanguage, copy.untitledLesson)}
                      </AppText>
                      <AppText language={uiLanguage} variant="muted" style={styles.recentMeta}>
                        {formatCompletedAgo(progress.completed_at ?? null, uiLanguage)}
                      </AppText>
                    </View>
                  </View>
                </Card>
              );
            })}
          </Stack>
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
  loadingState: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  loadingText: {
    color: theme.colors.mutedText,
  },
  headerBlock: {
    marginHorizontal: -theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  backLinkWrap: {
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.xs,
  },
  backLink: {
    color: theme.colors.accent,
    fontWeight: theme.typography.weights.bold,
  },
  headerTitle: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: theme.typography.weights.bold,
  },
  headerTitleAccent: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginTop: -2,
  },
  stageCard: {
    backgroundColor: '#DCEEFF',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  stageCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  stagePrimary: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  cardEyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontWeight: theme.typography.weights.bold,
    color: '#6E7F95',
  },
  stageValue: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: theme.typography.weights.bold,
  },
  levelPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  levelPillText: {
    fontWeight: theme.typography.weights.bold,
  },
  sinceBlock: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  sinceLabel: {
    color: '#8B9AAF',
    fontWeight: theme.typography.weights.medium,
  },
  sinceValue: {
    textAlign: 'right',
    fontWeight: theme.typography.weights.bold,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  metricCard: {
    width: '48%',
    minHeight: 94,
    justifyContent: 'space-between',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  metricValue: {
    fontSize: 42,
    lineHeight: 44,
    fontWeight: theme.typography.weights.bold,
  },
  metricLabel: {
    color: '#7B8797',
    fontWeight: theme.typography.weights.medium,
  },
  sectionEyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontWeight: theme.typography.weights.bold,
    color: '#7B8797',
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  breakdownStage: {
    width: 96,
    color: theme.colors.accent,
    fontWeight: theme.typography.weights.bold,
  },
  breakdownTrack: {
    flex: 1,
    height: 8,
    borderRadius: theme.radii.xl,
    backgroundColor: '#E6EEF7',
    overflow: 'hidden',
  },
  breakdownFill: {
    height: '100%',
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.accent,
  },
  breakdownCount: {
    width: 24,
    textAlign: 'right',
    color: '#4E5E73',
    fontWeight: theme.typography.weights.bold,
  },
  recentCard: {
    borderColor: '#D3E0EE',
    backgroundColor: theme.colors.surface,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  recentDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: '#CDEB8B',
    borderWidth: 1,
    borderColor: '#88A64E',
  },
  recentNumber: {
    minWidth: 34,
    color: theme.colors.accent,
    fontWeight: theme.typography.weights.bold,
  },
  recentCopy: {
    flex: 1,
    gap: 1,
  },
  recentTitle: {
    fontWeight: theme.typography.weights.bold,
  },
  recentMeta: {
    color: '#8B9AAF',
  },
});
