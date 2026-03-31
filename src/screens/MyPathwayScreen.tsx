import React, { useMemo } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import checkCircleImage from '@/assets/images/CheckCircle.png';
import lockImage from '@/assets/images/lock.webp';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Stack } from '@/src/components/ui/Stack';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { usePathwayData } from '@/src/hooks/use-pathway-data';
import { resolveAvatarSource } from '@/src/lib/avatar';
import { theme } from '@/src/theme/theme';
import { LessonListItem } from '@/src/types/lesson';

type UiLanguage = 'en' | 'th';

type PathwayCopy = {
  headerEyebrow: string;
  welcomeBack: string;
  freePlanBadge: string;
  paidBadge: string;
  lessonsCompletedLabel: string;
  levelsCompletedLabel: string;
  continueLearning: string;
  resumeHint: string;
  freePlanHeading: string;
  freePlanBody: string;
  becomeMember: string;
  pathwayTitle: string;
  pathwaySubtitleFree: string;
  pathwaySubtitlePaid: string;
  openLesson: string;
  openLibrary: string;
  openFreeLibrary: string;
  seeCompleted: string;
  completedTitle: string;
  completedEmpty: string;
  untitledLesson: string;
  noResumeLesson: string;
};

const getCopy = (uiLanguage: UiLanguage): PathwayCopy => {
  if (uiLanguage === 'th') {
    return {
      headerEyebrow: 'เส้นทางของฉัน',
      welcomeBack: 'ยินดีต้อนรับกลับมา',
      freePlanBadge: 'แพ็กเกจฟรี',
      paidBadge: 'สมาชิก',
      lessonsCompletedLabel: 'บทเรียนที่เรียนจบ',
      levelsCompletedLabel: 'เลเวลที่เรียนจบ',
      continueLearning: 'เรียนต่อ',
      resumeHint: 'กลับไปยังบทเรียนที่เหมาะที่สุดสำหรับการเรียนต่อในแอป',
      freePlanHeading: 'แพ็กเกจฟรีของคุณยังใช้งานได้',
      freePlanBody: 'คุณยังเข้าถึงบทเรียนแรกของแต่ละเลเวลได้ตามปกติ และอัปเกรดได้ทุกเมื่อเพื่อปลดล็อกคลังบทเรียนทั้งหมด',
      becomeMember: 'เป็นสมาชิก',
      pathwayTitle: 'เส้นทางบทเรียน',
      pathwaySubtitleFree: 'บทเรียนที่เปิดได้ในแพ็กเกจปัจจุบันจะแสดงที่นี่ พร้อมบทเรียนถัดไปที่ต้องอัปเกรดเพื่อปลดล็อก',
      pathwaySubtitlePaid: 'บทเรียนถัดไปที่แนะนำสำหรับการเรียนต่อในลำดับปัจจุบันของคุณ',
      openLesson: 'เปิดบทเรียน',
      openLibrary: 'เปิดคลังบทเรียน',
      openFreeLibrary: 'เปิดคลังบทเรียนฟรี',
      seeCompleted: 'ดูบทเรียนที่เรียนจบ',
      completedTitle: 'เรียนจบแล้ว',
      completedEmpty: 'เมื่อคุณเรียนจบบทเรียน รายการล่าสุดจะปรากฏที่นี่',
      untitledLesson: 'ไม่มีชื่อบทเรียน',
      noResumeLesson: 'ยังไม่มีบทเรียนถัดไปในตอนนี้',
    };
  }

  return {
    headerEyebrow: 'My Pathway',
    welcomeBack: 'Welcome back',
    freePlanBadge: 'Free Plan',
    paidBadge: 'Member',
    lessonsCompletedLabel: 'Lessons completed',
    levelsCompletedLabel: 'Levels completed',
    continueLearning: 'Continue learning',
    resumeHint: 'Jump back into the lesson that makes the most sense as your next step in the app.',
    freePlanHeading: 'Your free plan is active',
    freePlanBody: 'You can still access the first lesson of each level, and upgrade whenever you are ready for the full library.',
    becomeMember: 'Become a member',
    pathwayTitle: 'Pathway lessons',
    pathwaySubtitleFree: 'Lessons available on your current plan appear here, alongside the next lessons membership unlocks.',
    pathwaySubtitlePaid: 'Your next recommended lessons in the order you are currently moving through.',
    openLesson: 'Open lesson',
    openLibrary: 'Open lesson library',
    openFreeLibrary: 'Open free lesson library',
    seeCompleted: 'See completed lessons',
    completedTitle: 'Completed',
    completedEmpty: 'Once lessons are completed, your latest progress will show here.',
    untitledLesson: 'Untitled lesson',
    noResumeLesson: 'There is no next lesson right now.',
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

const isCheckpointLesson = (lesson: LessonListItem) => {
  const title = lesson.title?.toLowerCase() ?? '';
  const thaiTitle = lesson.title_th?.toLowerCase() ?? '';
  return title.includes('checkpoint') || thaiTitle.includes('checkpoint');
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

export function MyPathwayScreen() {
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();
  const { hasAccount, hasMembership, profile, user } = useAppSession();
  const copy = getCopy(uiLanguage);
  const { completedLessons, completedProgress, errorMessage, isLoading, pathwayRows, resumeRow, stats } = usePathwayData({
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
  const metadataAvatar = typeof user?.user_metadata?.avatar_image === 'string' ? user.user_metadata.avatar_image : null;
  const avatarSource = resolveAvatarSource(profile?.avatar_image || metadataAvatar);

  const completedPreview = useMemo(() => {
    return completedProgress
      .map((entry) => entry.lessons)
      .filter((lesson): lesson is LessonListItem => Boolean(lesson))
      .slice(0, 3);
  }, [completedProgress]);

  const handleOpenLesson = (lessonId: string | null) => {
    if (!lessonId) {
      return;
    }

    router.push(`/lessons/${lessonId}`);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <Stack gap="md">
        <Card padding="lg" radius="lg" style={styles.headerCard}>
          <View style={styles.headerRow}>
            {avatarSource ? (
              <Image source={avatarSource} style={styles.avatar} resizeMode="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <AppText language={uiLanguage} variant="caption" style={styles.avatarFallbackText}>
                  {displayName.slice(0, 2).toUpperCase()}
                </AppText>
              </View>
            )}

            <View style={styles.headerCopy}>
              <AppText language={uiLanguage} variant="caption" style={styles.eyebrow}>
                {copy.headerEyebrow}
              </AppText>
              <AppText language={uiLanguage} variant="title" style={styles.headerTitle}>
                {copy.welcomeBack}, {displayName}
              </AppText>

              <View style={[styles.planBadge, hasMembership ? styles.planBadgePaid : styles.planBadgeFree]}>
                <AppText language={uiLanguage} variant="caption" style={styles.planBadgeText}>
                  {hasMembership ? copy.paidBadge : copy.freePlanBadge}
                </AppText>
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <AppText language={uiLanguage} variant="caption" style={styles.statLabel}>
                {copy.lessonsCompletedLabel}
              </AppText>
              <AppText language={uiLanguage} variant="title" style={styles.statValue}>
                {stats?.lessons_completed ?? profile?.lessons_complete ?? completedLessons.length}
              </AppText>
            </View>

            <View style={styles.statCard}>
              <AppText language={uiLanguage} variant="caption" style={styles.statLabel}>
                {copy.levelsCompletedLabel}
              </AppText>
              <AppText language={uiLanguage} variant="title" style={styles.statValue}>
                {stats?.levels_completed ?? 0}
              </AppText>
            </View>
          </View>
        </Card>

        <Card padding="lg" radius="lg" style={styles.heroCard}>
          <Stack gap="sm">
            <AppText language={uiLanguage} variant="body" style={styles.sectionTitle}>
              {copy.continueLearning}
            </AppText>
            <AppText language={uiLanguage} variant="muted" style={styles.heroHint}>
              {copy.resumeHint}
            </AppText>
          </Stack>

          {isLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={theme.colors.accent} />
            </View>
          ) : resumeRow ? (
            <View style={styles.resumeCard}>
              <View style={styles.resumeMeta}>
                {isCheckpointLesson(resumeRow.lesson) ? (
                  <Image source={checkCircleImage} style={styles.resumeCheckpointIcon} resizeMode="contain" />
                ) : (
                  <AppText language={uiLanguage} variant="body" style={styles.resumeNumber}>
                    {getLessonNumber(resumeRow.lesson)}
                  </AppText>
                )}

                <View style={styles.resumeTextGroup}>
                  <AppText language={uiLanguage} variant="body" style={styles.resumeTitle}>
                    {getLessonTitle(resumeRow.lesson, uiLanguage, copy.untitledLesson)}
                  </AppText>
                  {getLessonFocus(resumeRow.lesson, uiLanguage) ? (
                    <AppText language={uiLanguage} variant="muted" style={styles.resumeFocus}>
                      {getLessonFocus(resumeRow.lesson, uiLanguage)}
                    </AppText>
                  ) : null}
                </View>
              </View>

              <Button
                language={uiLanguage}
                title={resumeRow.state === 'locked' ? copy.becomeMember : copy.openLesson}
                onPress={() => {
                  if (resumeRow.state === 'locked') {
                    router.push('/account/membership');
                    return;
                  }

                  handleOpenLesson(resumeRow.lesson.id ?? null);
                }}
              />
            </View>
          ) : (
            <AppText language={uiLanguage} variant="muted" style={styles.heroHint}>
              {errorMessage || copy.noResumeLesson}
            </AppText>
          )}
        </Card>

        {!hasMembership ? (
          <Card padding="lg" radius="lg" style={styles.noticeCard}>
            <Stack gap="sm">
              <AppText language={uiLanguage} variant="body" style={styles.noticeTitle}>
                {copy.freePlanHeading}
              </AppText>
              <AppText language={uiLanguage} variant="muted" style={styles.noticeBody}>
                {copy.freePlanBody}
              </AppText>
              <Button language={uiLanguage} title={copy.becomeMember} onPress={() => router.push('/account/membership')} />
            </Stack>
          </Card>
        ) : null}

        <Card padding="lg" radius="lg" style={styles.sectionCard}>
          <Stack gap="sm">
            <AppText language={uiLanguage} variant="body" style={styles.sectionTitle}>
              {copy.pathwayTitle}
            </AppText>
            <AppText language={uiLanguage} variant="muted" style={styles.sectionSubtitle}>
              {hasMembership ? copy.pathwaySubtitlePaid : copy.pathwaySubtitleFree}
            </AppText>
          </Stack>

          {isLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={theme.colors.accent} />
            </View>
          ) : (
            <Stack gap="sm">
              {pathwayRows.map((row, index) => {
                const title = getLessonTitle(row.lesson, uiLanguage, copy.untitledLesson);
                const focus = getLessonFocus(row.lesson, uiLanguage);
                const isLocked = row.state === 'locked';
                const isCompleted = row.state === 'completed';

                return (
                  <Pressable
                    key={row.lesson.id}
                    accessibilityRole="button"
                    style={[
                      styles.lessonRow,
                      index === 0 && !isLocked ? styles.lessonRowPrimary : null,
                      isLocked ? styles.lessonRowLocked : null,
                    ]}
                    onPress={() => {
                      if (isLocked) {
                        router.push('/account/membership');
                        return;
                      }

                      handleOpenLesson(row.lesson.id);
                    }}>
                    <View style={styles.lessonMain}>
                      {isCheckpointLesson(row.lesson) ? (
                        <Image source={checkCircleImage} style={styles.checkpointIcon} resizeMode="contain" />
                      ) : (
                        <AppText language={uiLanguage} variant="body" style={styles.lessonNumber}>
                          {getLessonNumber(row.lesson)}
                        </AppText>
                      )}

                      <View style={styles.lessonCopy}>
                        <AppText language={uiLanguage} variant="body" style={styles.lessonTitle}>
                          {title}
                        </AppText>
                        {focus ? (
                          <AppText language={uiLanguage} variant="muted" style={styles.lessonFocus}>
                            {focus}
                          </AppText>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.lessonRight}>
                      {isLocked ? (
                        <Image source={lockImage} style={styles.lockIcon} resizeMode="contain" />
                      ) : isCompleted ? (
                        <Image source={checkCircleImage} style={styles.completedIcon} resizeMode="contain" />
                      ) : (
                        <AppText language={uiLanguage} variant="body" style={styles.chevron}>
                          ›
                        </AppText>
                      )}
                    </View>
                  </Pressable>
                );
              })}

              <Pressable accessibilityRole="button" style={styles.linkButton} onPress={() => router.push('/(tabs)/lessons')}>
                <AppText language={uiLanguage} variant="caption" style={styles.linkButtonText}>
                  {hasMembership ? copy.openLibrary : copy.openFreeLibrary}
                </AppText>
              </Pressable>
            </Stack>
          )}
        </Card>

        <Card padding="lg" radius="lg" style={styles.sectionCard}>
          <Stack gap="sm">
            <AppText language={uiLanguage} variant="body" style={styles.sectionTitle}>
              {copy.completedTitle}
            </AppText>
          </Stack>

          {completedPreview.length > 0 ? (
            <Stack gap="sm">
              {completedPreview.map((lesson) => (
                <View key={`completed-${lesson.id}`} style={styles.completedRow}>
                  <View style={styles.completedRowMain}>
                    <AppText language={uiLanguage} variant="body" style={styles.completedNumber}>
                      {getLessonNumber(lesson)}
                    </AppText>
                    <View style={styles.completedCopy}>
                      <AppText language={uiLanguage} variant="body" style={styles.completedTitle}>
                        {getLessonTitle(lesson, uiLanguage, copy.untitledLesson)}
                      </AppText>
                      {getLessonFocus(lesson, uiLanguage) ? (
                        <AppText language={uiLanguage} variant="muted" style={styles.completedFocus}>
                          {getLessonFocus(lesson, uiLanguage)}
                        </AppText>
                      ) : null}
                    </View>
                  </View>
                  <Image source={checkCircleImage} style={styles.completedIcon} resizeMode="contain" />
                </View>
              ))}

              <Pressable accessibilityRole="button" style={styles.linkButton} onPress={() => router.push('/pathway/completed')}>
                <AppText language={uiLanguage} variant="caption" style={styles.linkButtonText}>
                  {copy.seeCompleted}
                </AppText>
              </Pressable>
            </Stack>
          ) : (
            <AppText language={uiLanguage} variant="muted" style={styles.sectionSubtitle}>
              {errorMessage || copy.completedEmpty}
            </AppText>
          )}
        </Card>
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
  headerCard: {
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: theme.typography.sizes.lg,
    lineHeight: theme.typography.lineHeights.lg,
    fontWeight: theme.typography.weights.bold,
  },
  headerCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  eyebrow: {
    color: theme.colors.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  headerTitle: {
    fontSize: theme.typography.sizes['2xl'],
    lineHeight: theme.typography.lineHeights.xl,
  },
  planBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xl,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  planBadgeFree: {
    backgroundColor: theme.colors.warningSurface,
  },
  planBadgePaid: {
    backgroundColor: theme.colors.success,
  },
  planBadgeText: {
    fontWeight: theme.typography.weights.semibold,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.accentSurface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  statLabel: {
    color: theme.colors.mutedText,
  },
  statValue: {
    fontSize: theme.typography.sizes.xl,
    lineHeight: theme.typography.lineHeights.lg,
  },
  heroCard: {
    gap: theme.spacing.md,
    backgroundColor: theme.colors.accentMuted,
  },
  sectionCard: {
    gap: theme.spacing.md,
  },
  noticeCard: {
    backgroundColor: theme.colors.surface,
  },
  sectionTitle: {
    fontWeight: theme.typography.weights.bold,
  },
  sectionSubtitle: {
    color: theme.colors.mutedText,
  },
  heroHint: {
    color: theme.colors.mutedText,
  },
  noticeTitle: {
    fontWeight: theme.typography.weights.bold,
  },
  noticeBody: {
    color: theme.colors.mutedText,
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
  },
  resumeCard: {
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
  },
  resumeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  resumeCheckpointIcon: {
    width: 28,
    height: 28,
  },
  resumeNumber: {
    minWidth: 44,
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.lg,
    lineHeight: theme.typography.lineHeights.lg,
  },
  resumeTextGroup: {
    flex: 1,
    gap: 2,
  },
  resumeTitle: {
    fontWeight: theme.typography.weights.bold,
  },
  resumeFocus: {
    color: theme.colors.mutedText,
  },
  lessonRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  lessonRowPrimary: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentSurface,
  },
  lessonRowLocked: {
    opacity: 0.78,
  },
  lessonMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  lessonNumber: {
    minWidth: 42,
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.lg,
    lineHeight: theme.typography.lineHeights.lg,
  },
  checkpointIcon: {
    width: 28,
    height: 28,
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
  lessonRight: {
    width: 28,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  lockIcon: {
    width: 20,
    height: 20,
  },
  completedIcon: {
    width: 20,
    height: 20,
  },
  chevron: {
    fontSize: 24,
    lineHeight: 24,
    color: theme.colors.mutedText,
  },
  linkButton: {
    alignSelf: 'flex-start',
    paddingVertical: theme.spacing.xs,
  },
  linkButtonText: {
    color: theme.colors.text,
    textDecorationLine: 'underline',
    textTransform: 'uppercase',
    fontWeight: theme.typography.weights.semibold,
  },
  completedRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  completedRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  completedNumber: {
    minWidth: 42,
    fontWeight: theme.typography.weights.semibold,
  },
  completedCopy: {
    flex: 1,
    gap: 2,
  },
  completedTitle: {
    fontWeight: theme.typography.weights.semibold,
  },
  completedFocus: {
    color: theme.colors.mutedText,
  },
});
