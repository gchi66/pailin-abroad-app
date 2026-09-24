import React, { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import pathwayProgressImage from '@/assets/images/my-pathway-progress.png';
import { FLOATING_TAB_BAR_PAGE_BOTTOM_PADDING } from '@/src/components/navigation/layout';
import { ResourcePageHeader } from '@/src/components/resources/ResourcePageHeader';
import { AppText } from '@/src/components/ui/AppText';
import { Card } from '@/src/components/ui/Card';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { Stack } from '@/src/components/ui/Stack';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
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

const getLessonFocus = (lesson: LessonListItem, uiLanguage: UiLanguage) =>
  uiLanguage === 'th' ? pickText(lesson.focus_th, lesson.focus) : pickText(lesson.focus, lesson.focus_th);

const isCheckpointLesson = (lesson: LessonListItem) =>
  [lesson.title, lesson.title_th].some((value) => String(value ?? '').toLowerCase().includes('checkpoint'));

const getLessonNumber = (lesson: LessonListItem) => {
  if (typeof lesson.level === 'number' && isCheckpointLesson(lesson)) {
    return `${lesson.level}.chp`;
  }

  if (typeof lesson.level === 'number' && typeof lesson.lesson_order === 'number') {
    return `${lesson.level}.${lesson.lesson_order}`;
  }

  return '–';
};

const getStageLabel = (stage: string | null, uiLanguage: UiLanguage) => {
  if (!stage?.trim()) {
    return uiLanguage === 'th' ? 'เส้นทางหลัก' : 'Main pathway';
  }

  const normalizedStage = stage.trim();

  if (uiLanguage === 'th') {
    const stageMap: Record<string, string> = {
      Beginner: 'ระดับเริ่มต้น',
      Intermediate: 'ระดับกลาง',
      Advanced: 'ระดับสูง',
      Expert: 'ระดับเชี่ยวชาญ',
    };

    return stageMap[normalizedStage] || normalizedStage;
  }

  return normalizedStage;
};

const getLevelLabel = (level: number, uiLanguage: UiLanguage) =>
  uiLanguage === 'th' ? `เลเวล ${level}` : `Level ${level}`;

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

  return date.toLocaleDateString(uiLanguage === 'th' ? 'th-TH-u-ca-gregory' : 'en-US', {
    month: 'short',
    year: 'numeric',
  });
};

const getCopy = (uiLanguage: UiLanguage) => {
  if (uiLanguage === 'th') {
    return {
      title: 'ความคืบหน้าการเรียน',
      currentStage: 'สเตจปัจจุบัน',
      learningSince: 'เริ่มเรียนเมื่อ',
      lessonsCompleted: 'บทเรียนที่จบ',
      levelsCompleted: 'เลเวลที่จบ',
      dailyStreak: 'สตรีคประจำวัน',
      stageBreakdown: 'ภาพรวมแต่ละสเตจ',
      recentLessons: 'บทเรียนล่าสุด',
      untitledLesson: 'ไม่มีชื่อบทเรียน',
      fallbackStage: 'เส้นทางหลัก',
      loading: 'กำลังโหลดข้อมูลความคืบหน้า...',
    };
  }

  return {
    title: 'Learning Progress',
    currentStage: 'Current stage',
    learningSince: 'Learning since',
    lessonsCompleted: 'Lessons completed',
    levelsCompleted: 'Levels completed',
    dailyStreak: 'Day streak',
    stageBreakdown: 'Stage breakdown',
    recentLessons: 'Recent lessons',
    untitledLesson: 'Untitled lesson',
    fallbackStage: 'Main pathway',
    loading: 'Loading your progress...',
  };
};

export function LearningProgressScreen() {
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();
  const { hasAccount, hasMembership, profile, user } = useAppSession();
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
    userId: user?.id ?? null,
  });

  const progressContext = useMemo(
    () => getProgressContext(pathwayRows, allLessons, completedLessons, resumeRow),
    [allLessons, completedLessons, pathwayRows, resumeRow],
  );
  const stageBreakdown = useMemo(() => getStageBreakdown(allLessons, completedLessons), [allLessons, completedLessons]);
  const recentCompleted = useMemo(() => completedProgress.slice(0, 3), [completedProgress]);
  const dailyStreak = stats?.daily_streak ?? 0;

  const sectionLabel = (label: string, icon: 'bars' | 'star' = 'bars') => (
    <View style={styles.sectionLabel}>
      {icon === 'star' ? (
        <View style={styles.currentStageIcon} accessible={false}>
          <MaterialIcons name="star" size={7} color="#FFFFFF" />
        </View>
      ) : (
        <Image source={pathwayProgressImage} style={styles.sectionIcon} resizeMode="contain" accessible={false} />
      )}
      <AppText language={uiLanguage} variant="caption" style={styles.sectionEyebrow}>
        {label}
      </AppText>
    </View>
  );

  if (isLoading || isCompletedProgressLoading || isLessonIndexLoading || isStatsLoading) {
    return <PageLoadingState language={uiLanguage} />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <ResponsivePageShell>
        <View style={styles.headerBlock}>
          <ResourcePageHeader
            language={uiLanguage}
            title={copy.title}
            onBackPress={() => router.back()}
          />
        </View>

        <Stack gap="md" style={styles.pageContent}>
          {sectionLabel(copy.currentStage, 'star')}

          <Card padding="md" radius="sm" style={styles.stageCard}>
            <View style={styles.stageCardRow}>
              <View style={styles.stagePrimary}>
                <AppText language={uiLanguage} variant="body" numberOfLines={1} adjustsFontSizeToFit style={styles.stageValue}>
                  {getStageLabel(progressContext.stage, uiLanguage)}
                </AppText>
                {typeof progressContext.level === 'number' ? (
                  <View style={styles.levelPill}>
                    <AppText language={uiLanguage} variant="caption" style={styles.levelPillText}>
                      {getLevelLabel(progressContext.level, uiLanguage)}
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

            <View style={styles.currentProgressRow}>
              <View
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: 100, now: progressContext.levelPercent }}
                style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressContext.levelPercent}%` }]} />
              </View>
              <AppText language={uiLanguage} variant="caption" style={styles.currentProgressCount}>
                {progressContext.levelCompletedCount} / {progressContext.levelTotalCount}
              </AppText>
            </View>
          </Card>

          <View style={styles.metricsGrid}>
            <Card padding="sm" radius="sm" style={styles.metricCard}>
              <AppText language={uiLanguage} variant="body" style={styles.metricValue}>
                {stats?.lessons_completed ?? profile?.lessons_complete ?? completedLessons.length}
              </AppText>
              <AppText language={uiLanguage} variant="caption" numberOfLines={2} style={styles.metricLabel}>
                {copy.lessonsCompleted}
              </AppText>
            </Card>

            <Card padding="sm" radius="sm" style={styles.metricCard}>
              <AppText language={uiLanguage} variant="body" style={styles.metricValue}>
                {stats?.levels_completed ?? 0}
              </AppText>
              <AppText language={uiLanguage} variant="caption" numberOfLines={2} style={styles.metricLabel}>
                {copy.levelsCompleted}
              </AppText>
            </Card>

            <Card padding="sm" radius="sm" style={styles.metricCard}>
              <AppText language={uiLanguage} variant="body" style={styles.metricValue}>
                {dailyStreak}
              </AppText>
              <AppText language={uiLanguage} variant="caption" numberOfLines={2} style={styles.metricLabel}>
                {copy.dailyStreak}
              </AppText>
            </Card>
          </View>

          <Stack gap="sm" style={styles.sectionBlock}>
            {sectionLabel(copy.stageBreakdown)}

            <Stack gap="xs">
              {stageBreakdown.map((row) => (
                <View key={row.stage} style={styles.breakdownRow}>
                  <AppText language={uiLanguage} variant="caption" numberOfLines={1} style={styles.breakdownStage}>
                    {getStageLabel(row.stage, uiLanguage)}
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

          <Stack gap="sm" style={styles.sectionBlock}>
            {sectionLabel(copy.recentLessons)}

            <Stack gap="sm">
              {recentCompleted.map((progress) => {
                const lesson = progress.lessons;
                if (!lesson) {
                  return null;
                }

                return (
                  <Card key={progress.id ?? progress.lesson_id} padding="md" radius="sm" style={styles.recentCard}>
                    <View style={styles.recentRow}>
                      <View style={styles.recentCheckBadge}>
                        <AppText language="en" variant="caption" style={styles.recentCheckText}>
                          ✓
                        </AppText>
                      </View>
                      <View style={styles.recentCopy}>
                        <View style={styles.recentMetaRow}>
                          <AppText language={uiLanguage} variant="caption" style={styles.recentNumber}>
                            {getLessonNumber(lesson)}
                          </AppText>
                          {getLessonFocus(lesson, uiLanguage) ? (
                            <AppText language={uiLanguage} variant="caption" numberOfLines={1} style={styles.recentFocus}>
                              {getLessonFocus(lesson, uiLanguage)}
                            </AppText>
                          ) : null}
                        </View>
                        <AppText language={uiLanguage} variant="body" numberOfLines={2} style={styles.recentTitle}>
                          {getLessonTitle(lesson, uiLanguage, copy.untitledLesson)}
                        </AppText>
                      </View>
                    </View>
                  </Card>
                );
              })}
            </Stack>
          </Stack>
        </Stack>
      </ResponsivePageShell>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    paddingBottom: FLOATING_TAB_BAR_PAGE_BOTTOM_PADDING,
  },
  headerBlock: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: '#D7D7D7',
  },
  pageContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  stageCard: {
    marginTop: -8,
    padding: 12,
    backgroundColor: '#EBF5FF',
    borderRadius: 6,
    boxShadow: `3px 4px 0px ${theme.colors.shadow}`,
  },
  stageCardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  stagePrimary: {
    flex: 1,
    gap: 6,
  },
  stageValue: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: theme.typography.weights.bold,
  },
  levelPill: {
    alignSelf: 'flex-start',
    minWidth: 84,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  levelPillText: {
    fontSize: 11,
    lineHeight: 17,
    fontWeight: theme.typography.weights.medium,
  },
  sinceBlock: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: 2,
    paddingTop: 6,
  },
  sinceLabel: {
    color: '#929292',
    fontWeight: theme.typography.weights.medium,
    fontSize: 9,
    lineHeight: 13,
  },
  sinceValue: {
    textAlign: 'right',
    fontWeight: theme.typography.weights.bold,
    fontSize: 13,
    lineHeight: 18,
  },
  currentProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderWidth: 0.75,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: theme.radii.xl,
    backgroundColor: '#B9E671',
  },
  currentProgressCount: {
    minWidth: 30,
    color: theme.colors.text,
    fontSize: 8,
    lineHeight: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 7,
  },
  metricCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 76,
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 6,
    boxShadow: `2px 3px 0px ${theme.colors.shadow}`,
  },
  metricValue: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: theme.typography.weights.bold,
  },
  metricLabel: {
    color: '#676767',
    fontSize: 9,
    lineHeight: 12,
    fontWeight: theme.typography.weights.regular,
  },
  sectionBlock: {
    marginTop: 4,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionIcon: {
    width: 12,
    height: 12,
  },
  currentStageIcon: {
    width: 11,
    height: 11,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3C8DFF',
  },
  sectionEyebrow: {
    fontSize: 9,
    lineHeight: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: theme.typography.weights.regular,
    color: '#666666',
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 22,
  },
  breakdownStage: {
    width: 78,
    color: theme.colors.text,
    fontSize: 8,
    lineHeight: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontWeight: theme.typography.weights.bold,
  },
  breakdownTrack: {
    flex: 1,
    height: 8,
    borderRadius: theme.radii.xl,
    borderWidth: 0.75,
    borderColor: '#68727C',
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  breakdownFill: {
    height: '100%',
    borderRadius: theme.radii.xl,
    backgroundColor: '#B9E671',
  },
  breakdownCount: {
    width: 14,
    textAlign: 'right',
    color: '#666666',
    fontSize: 9,
    lineHeight: 12,
  },
  recentCard: {
    minHeight: 66,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderColor: theme.colors.border,
    borderRadius: 7,
    backgroundColor: theme.colors.surface,
    boxShadow: `3px 4px 0px ${theme.colors.shadow}`,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 42,
  },
  recentCheckBadge: {
    position: 'absolute',
    left: -27,
    width: 20,
    height: 20,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C7F16F',
    borderWidth: 1,
    borderColor: theme.colors.border,
    zIndex: 1,
  },
  recentCheckText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
    lineHeight: 14,
  },
  recentCopy: {
    flex: 1,
    gap: 2,
  },
  recentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recentNumber: {
    color: theme.colors.text,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: theme.typography.weights.bold,
  },
  recentFocus: {
    flex: 1,
    color: '#777777',
    fontSize: 10,
    lineHeight: 15,
  },
  recentTitle: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: theme.typography.weights.medium,
  },
});
