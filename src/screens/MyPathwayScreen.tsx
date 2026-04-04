import React, { useMemo } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import lockImage from '@/assets/images/lock.webp';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Stack } from '@/src/components/ui/Stack';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { PathwayLessonRow, usePathwayData } from '@/src/hooks/use-pathway-data';
import { resolveAvatarSource } from '@/src/lib/avatar';
import { theme } from '@/src/theme/theme';
import { LessonListItem } from '@/src/types/lesson';

type UiLanguage = 'en' | 'th';

type PathwayCopy = {
  welcomeBack: string;
  freePlanBadge: string;
  paidBadge: string;
  upgrade: string;
  progressTitle: string;
  viewDetails: string;
  lessonsDone: string;
  levelsDone: string;
  currentLevel: string;
  levelShort: string;
  lessonsCompleteForLevel: (completedCount: number, totalCount: number, level: number | null) => string;
  continueLearning: string;
  upNext: string;
  openLesson: string;
  becomeMember: string;
  browseLibrary: string;
  browseFreeLibrary: string;
  untitledLesson: string;
  noResumeLesson: string;
  noUpcomingLessons: string;
  freePlanBody: string;
};

const getCopy = (uiLanguage: UiLanguage): PathwayCopy => {
  if (uiLanguage === 'th') {
    return {
      welcomeBack: 'ยินดีต้อนรับกลับมา',
      freePlanBadge: 'แพ็กเกจฟรี',
      paidBadge: 'สมาชิก',
      upgrade: 'อัปเกรด',
      progressTitle: 'ความคืบหน้าของฉัน',
      viewDetails: 'ดูรายละเอียด →',
      lessonsDone: 'บทเรียนที่จบ',
      levelsDone: 'เลเวลที่จบ',
      currentLevel: 'เลเวลปัจจุบัน',
      levelShort: 'เลเวล',
      lessonsCompleteForLevel: (completedCount, totalCount, level) =>
        `${completedCount} จาก ${totalCount} บทเรียนที่เรียนจบสำหรับเลเวล ${typeof level === 'number' ? level : '–'}`,
      continueLearning: 'เรียนต่อ',
      upNext: 'ถัดไป',
      openLesson: 'เปิดบทเรียน →',
      becomeMember: 'เป็นสมาชิก →',
      browseLibrary: 'เปิดคลังบทเรียน',
      browseFreeLibrary: 'เปิดคลังบทเรียนฟรี',
      untitledLesson: 'ไม่มีชื่อบทเรียน',
      noResumeLesson: 'ยังไม่มีบทเรียนถัดไปในตอนนี้',
      noUpcomingLessons: 'ยังไม่มีบทเรียนถัดไปเพิ่มเติมในตอนนี้',
      freePlanBody: 'แพ็กเกจฟรียังเรียนบทแรกของแต่ละเลเวลได้ และอัปเกรดเมื่อพร้อมเพื่อปลดล็อกบทเรียนทั้งหมด',
    };
  }

  return {
    welcomeBack: 'Welcome back',
    freePlanBadge: 'Free plan',
    paidBadge: 'Member',
    upgrade: 'Upgrade',
    progressTitle: 'My Progress',
    viewDetails: 'View details →',
    lessonsDone: 'Lessons done',
    levelsDone: 'Levels done',
    currentLevel: 'Current level',
    levelShort: 'Level',
    lessonsCompleteForLevel: (completedCount, totalCount, level) =>
      `${completedCount} of ${totalCount} lessons complete for Level ${typeof level === 'number' ? level : '–'}`,
    continueLearning: 'Continue Learning',
    upNext: 'Up Next',
    openLesson: 'Open lesson →',
    becomeMember: 'Become a member →',
    browseLibrary: 'Browse lesson library',
    browseFreeLibrary: 'Browse free lesson library',
    untitledLesson: 'Untitled lesson',
    noResumeLesson: 'There is no next lesson right now.',
    noUpcomingLessons: 'There are no more upcoming lessons right now.',
    freePlanBody: 'Your free plan still includes the first lesson of each level. Upgrade whenever you are ready for full pathway access.',
  };
};

const pickText = (preferred: string | null, fallback: string | null, emptyFallback: string) => {
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
  uiLanguage === 'th' ? pickText(lesson.focus_th, lesson.focus, '') : pickText(lesson.focus, lesson.focus_th, '');

const getLessonNumber = (lesson: LessonListItem) => {
  if (typeof lesson.level === 'number' && typeof lesson.lesson_order === 'number') {
    return `${lesson.level}.${lesson.lesson_order}`;
  }

  return '–';
};

const getFirstName = (displayName: string) => {
  const trimmed = displayName.trim();
  if (!trimmed) {
    return 'Pailin Abroad';
  }

  const [firstToken] = trimmed.split(/\s+/);
  return firstToken || trimmed;
};

const getStageLabel = (stage: string | null, uiLanguage: UiLanguage) => {
  if (!stage?.trim()) {
    return uiLanguage === 'th' ? 'เส้นทางหลัก' : 'Main pathway';
  }

  return stage.trim();
};

const getProgressContext = (
  pathwayRows: PathwayLessonRow[],
  allLessons: LessonListItem[],
  completedLessons: LessonListItem[],
  resumeRow: PathwayLessonRow | null,
) => {
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
    stage: anchorStage,
    level: anchorLevel,
    levelCompletedCount,
    levelTotalCount,
    levelPercent,
  };
};

export function MyPathwayScreen() {
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();
  const { hasAccount, hasMembership, profile, user } = useAppSession();
  const copy = getCopy(uiLanguage);
  const { allLessons, completedLessons, errorMessage, isLoading, pathwayRows, resumeRow, stats } = usePathwayData({
    enabled: hasAccount,
    hasMembership,
  });

  const displayName =
    profile?.name?.trim() ||
    profile?.username?.trim() ||
    (typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name.trim() : '') ||
    (typeof user?.user_metadata?.username === 'string' ? user.user_metadata.username.trim() : '') ||
    user?.email ||
    'Pailin Abroad';
  const firstName = getFirstName(displayName);
  const metadataAvatar = typeof user?.user_metadata?.avatar_image === 'string' ? user.user_metadata.avatar_image : null;
  const avatarSource = resolveAvatarSource(profile?.avatar_image || metadataAvatar);

  const progressContext = useMemo(
    () => getProgressContext(pathwayRows, allLessons, completedLessons, resumeRow),
    [allLessons, completedLessons, pathwayRows, resumeRow],
  );

  const upcomingRows = useMemo(() => {
    if (!resumeRow) {
      return pathwayRows.filter((row) => row.state !== 'completed').slice(0, 2);
    }

    const resumeIndex = pathwayRows.findIndex((row) => row.lesson.id === resumeRow.lesson.id);
    return pathwayRows.slice(resumeIndex + 1).filter((row) => row.state !== 'completed').slice(0, 2);
  }, [pathwayRows, resumeRow]);

  const handleOpenLesson = (lessonId: string | null) => {
    if (!lessonId) {
      return;
    }

    router.push(`/lessons/${lessonId}`);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <Stack gap="md">
        <View style={styles.headerBlock}>
          <View style={styles.headerRow}>
            <Pressable accessibilityRole="button" style={styles.avatarButton} onPress={() => router.push('/(tabs)/account/profile')}>
              {avatarSource ? (
                <Image source={avatarSource} style={styles.avatar} resizeMode="cover" />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <AppText language={uiLanguage} variant="caption" style={styles.avatarFallbackText}>
                    {firstName.slice(0, 1).toUpperCase()}
                  </AppText>
                </View>
              )}
            </Pressable>

            <View style={styles.headerCopy}>
              <View style={styles.headerTopRow}>
                <View style={styles.headerTextGroup}>
                  <AppText language={uiLanguage} variant="title" style={styles.headerTitle}>
                    {copy.welcomeBack},
                  </AppText>
                  <AppText language={uiLanguage} variant="title" style={styles.headerName}>
                    {firstName}.
                  </AppText>
                </View>

                <View style={styles.planMeta}>
                  <View style={[styles.planBadge, hasMembership ? styles.planBadgePaid : styles.planBadgeFree]}>
                    <AppText language={uiLanguage} variant="caption" style={styles.planBadgeText}>
                      {hasMembership ? copy.paidBadge : copy.freePlanBadge}
                    </AppText>
                  </View>
                  {!hasMembership ? (
                    <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/account/membership')}>
                      <AppText language={uiLanguage} variant="caption" style={styles.upgradeLink}>
                        {copy.upgrade}
                      </AppText>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </View>
          </View>
        </View>

        <Card padding="md" radius="lg" style={styles.progressCard}>
          <Stack gap="sm">
            <View style={styles.progressHeader}>
              <AppText language={uiLanguage} variant="caption" style={styles.sectionEyebrow}>
                {copy.progressTitle}
              </AppText>
              <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/pathway/progress')}>
                <AppText language={uiLanguage} variant="caption" style={styles.detailsLink}>
                  {copy.viewDetails}
                </AppText>
              </Pressable>
            </View>

            <View style={styles.progressMetrics}>
              <View style={styles.progressMetricPrimary}>
                <AppText language={uiLanguage} variant="body" style={styles.stageText}>
                  {getStageLabel(progressContext.stage, uiLanguage)}
                </AppText>
                {typeof progressContext.level === 'number' ? (
                  <View style={styles.levelPill}>
                    <AppText language={uiLanguage} variant="caption" style={styles.levelPillText}>
                      {copy.levelShort} {progressContext.level}
                    </AppText>
                  </View>
                ) : null}
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <AppText language={uiLanguage} variant="body" style={styles.statValue}>
                    {stats?.lessons_completed ?? profile?.lessons_complete ?? completedLessons.length}
                  </AppText>
                  <AppText language={uiLanguage} variant="caption" style={styles.statLabel}>
                    {copy.lessonsDone}
                  </AppText>
                </View>

                <View style={styles.statBox}>
                  <AppText language={uiLanguage} variant="body" style={styles.statValue}>
                    {stats?.levels_completed ?? 0}
                  </AppText>
                  <AppText language={uiLanguage} variant="caption" style={styles.statLabel}>
                    {copy.levelsDone}
                  </AppText>
                </View>
                <View style={styles.statBox}>
                  <AppText language={uiLanguage} variant="body" style={styles.statValue}>
                    {typeof progressContext.level === 'number' ? progressContext.level : '–'}
                  </AppText>
                  <AppText language={uiLanguage} variant="caption" style={styles.statLabel}>
                    {copy.currentLevel}
                  </AppText>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.max(progressContext.levelPercent, 6)}%` }]} />
              </View>

              <View style={styles.progressFooter}>
                <AppText language={uiLanguage} variant="caption" style={styles.progressSummary}>
                  {copy.lessonsCompleteForLevel(
                    progressContext.levelCompletedCount,
                    progressContext.levelTotalCount || 0,
                    progressContext.level,
                  )}
                </AppText>
                <AppText language={uiLanguage} variant="caption" style={styles.progressPercent}>
                  {progressContext.levelPercent}%
                </AppText>
              </View>
            </View>
          </Stack>
        </Card>

        <Stack gap="sm">
          <AppText language={uiLanguage} variant="caption" style={styles.sectionEyebrow}>
            {copy.continueLearning}
          </AppText>

          <Card padding="md" radius="lg" style={styles.resumeCard}>
            {isLoading ? (
              <View style={styles.centerState}>
                <ActivityIndicator color={theme.colors.accent} />
              </View>
            ) : resumeRow ? (
              <Stack gap="md">
                <View style={styles.resumeMeta}>
                  <AppText language={uiLanguage} variant="body" style={styles.resumeNumber}>
                    {getLessonNumber(resumeRow.lesson)}
                  </AppText>

                  <View style={styles.resumeTextGroup}>
                    <AppText language={uiLanguage} variant="body" style={styles.resumeTitle}>
                      {getLessonTitle(resumeRow.lesson, uiLanguage, copy.untitledLesson)}
                    </AppText>
                    {getLessonFocus(resumeRow.lesson, uiLanguage) ? (
                      <AppText language={uiLanguage} variant="muted" style={styles.resumeFocus}>
                        {getLessonFocus(resumeRow.lesson, uiLanguage)}
                      </AppText>
                    ) : null}
                    {!hasMembership && resumeRow.state === 'locked' ? (
                      <AppText language={uiLanguage} variant="muted" style={styles.membershipHint}>
                        {copy.freePlanBody}
                      </AppText>
                    ) : null}
                  </View>
                </View>

                <Button
                  language={uiLanguage}
                  title={resumeRow.state === 'locked' ? copy.becomeMember : copy.openLesson}
                  onPress={() => {
                    if (resumeRow.state === 'locked') {
                      router.push('/(tabs)/account/membership');
                      return;
                    }

                    handleOpenLesson(resumeRow.lesson.id ?? null);
                  }}
                  style={styles.resumeButton}
                />
              </Stack>
            ) : (
              <AppText language={uiLanguage} variant="muted" style={styles.emptyText}>
                {errorMessage || copy.noResumeLesson}
              </AppText>
            )}
          </Card>
        </Stack>

        <Stack gap="sm">
          <AppText language={uiLanguage} variant="caption" style={styles.sectionEyebrow}>
            {copy.upNext}
          </AppText>

          <Stack gap="sm">
            {isLoading ? (
              <Card padding="md" radius="lg" style={styles.upNextCard}>
                <View style={styles.centerState}>
                  <ActivityIndicator color={theme.colors.accent} />
                </View>
              </Card>
            ) : upcomingRows.length > 0 ? (
              upcomingRows.map((row) => {
                const isLocked = row.state === 'locked';

                return (
                  <Pressable
                    key={row.lesson.id}
                    accessibilityRole="button"
                    style={styles.upNextCard}
                    onPress={() => {
                      if (isLocked) {
                        router.push('/(tabs)/account/membership');
                        return;
                      }

                      handleOpenLesson(row.lesson.id);
                    }}>
                    <View style={styles.upNextMain}>
                      <AppText language={uiLanguage} variant="caption" style={styles.upNextNumber}>
                        {getLessonNumber(row.lesson)}
                      </AppText>

                      <View style={styles.upNextCopy}>
                        <AppText language={uiLanguage} variant="body" style={styles.upNextTitle}>
                          {getLessonTitle(row.lesson, uiLanguage, copy.untitledLesson)}
                        </AppText>
                        {getLessonFocus(row.lesson, uiLanguage) ? (
                          <AppText language={uiLanguage} variant="muted" style={styles.upNextFocus}>
                            {getLessonFocus(row.lesson, uiLanguage)}
                          </AppText>
                        ) : null}
                      </View>

                      {isLocked ? <Image source={lockImage} style={styles.lockIcon} resizeMode="contain" /> : null}
                    </View>
                  </Pressable>
                );
              })
            ) : (
              <Card padding="md" radius="lg" style={styles.upNextCard}>
                <AppText language={uiLanguage} variant="muted" style={styles.emptyText}>
                  {errorMessage || copy.noUpcomingLessons}
                </AppText>
              </Card>
            )}

            <Pressable
              accessibilityRole="button"
              style={styles.libraryButton}
              onPress={() => router.push('/(tabs)/lessons')}>
              <AppText language={uiLanguage} variant="caption" style={styles.libraryButtonText}>
                {hasMembership ? copy.browseLibrary : copy.browseFreeLibrary}
              </AppText>
            </Pressable>
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
  headerBlock: {
    marginHorizontal: -theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarButton: {
    borderRadius: 29,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.accent,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: theme.colors.surface,
    fontWeight: theme.typography.weights.bold,
  },
  headerCopy: {
    flex: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  headerTextGroup: {
    flex: 1,
    gap: 0,
  },
  headerTitle: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: theme.typography.weights.bold,
  },
  headerName: {
    marginTop: -2,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
  },
  planBadge: {
    flexShrink: 0,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  planBadgeFree: {
    backgroundColor: theme.colors.surface,
  },
  planBadgePaid: {
    backgroundColor: theme.colors.success,
  },
  planBadgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: theme.typography.weights.bold,
  },
  planMeta: {
    alignItems: 'flex-start',
    gap: 4,
  },
  upgradeLink: {
    marginTop: 2,
    marginLeft: 6,
    color: theme.colors.primary,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: theme.typography.weights.bold,
  },
  progressCard: {
    backgroundColor: '#DCEEFF',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  sectionEyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  detailsLink: {
    color: theme.colors.accent,
    fontWeight: theme.typography.weights.bold,
  },
  progressMetrics: {
    gap: theme.spacing.sm,
  },
  progressMetricPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  stageText: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: theme.typography.weights.bold,
  },
  levelPill: {
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
  statsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  statBox: {
    flex: 1,
    minHeight: 84,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  statValue: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: theme.typography.weights.bold,
  },
  statLabel: {
    color: '#66758A',
    fontWeight: theme.typography.weights.medium,
  },
  progressTrack: {
    height: 10,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  progressSummary: {
    color: '#435267',
  },
  progressPercent: {
    color: '#435267',
    fontWeight: theme.typography.weights.bold,
  },
  resumeCard: {
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  resumeMeta: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  resumeNumber: {
    minWidth: 54,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: theme.typography.weights.bold,
  },
  resumeTextGroup: {
    flex: 1,
    gap: 2,
  },
  resumeTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: theme.typography.weights.bold,
  },
  resumeFocus: {
    color: '#66758A',
  },
  membershipHint: {
    marginTop: theme.spacing.xs,
    color: '#66758A',
  },
  resumeButton: {
    width: '100%',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 1.75, height: 1.75 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  upNextCard: {
    minHeight: 84,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: '#C7D9EE',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    justifyContent: 'center',
  },
  upNextMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  upNextNumber: {
    minWidth: 34,
    color: '#94A6BB',
    fontWeight: theme.typography.weights.bold,
  },
  upNextCopy: {
    flex: 1,
    gap: 2,
  },
  upNextTitle: {
    fontWeight: theme.typography.weights.bold,
    fontSize: 18,
    lineHeight: 22,
  },
  upNextFocus: {
    color: '#7B8797',
  },
  lockIcon: {
    width: 18,
    height: 18,
  },
  libraryButton: {
    minHeight: 54,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  libraryButtonText: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: theme.typography.weights.bold,
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
  },
  emptyText: {
    color: theme.colors.mutedText,
  },
});
