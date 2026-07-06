import React, { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import blueCheckmarkImage from '@/assets/images/blue-checkmark.webp';
import lockImage from '@/assets/images/lock.webp';
import pailinBlueCircleRight from '@/assets/images/characters/pailin_blue_circle_right.webp';
import { prefetchResolvedLesson } from '@/src/api/lessons';
import { prefetchPricing } from '@/src/api/pricing';
import { AppText } from '@/src/components/ui/AppText';
import { AndroidNeoShadowLayer } from '@/src/components/ui/AndroidNeoShadowLayer';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { Stack } from '@/src/components/ui/Stack';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { PathwayLessonRow, usePathwayData } from '@/src/hooks/use-pathway-data';
import { resolveAvatarSource } from '@/src/lib/avatar';
import { setLessonLibrarySelection } from '@/src/lib/lesson-library-selection';
import { theme } from '@/src/theme/theme';
import { LessonListItem } from '@/src/types/lesson';

type UiLanguage = 'en' | 'th';

type PathwayCopy = {
  welcomeBack: string;
  welcome: string;
  welcomeTo: string;
  guestWelcome: string;
  freePlanBadge: string;
  paidBadge: string;
  upgrade: string;
  upgradeBannerTitle: string;
  upgradeBannerBody: string;
  upgradeBannerCta: string;
  guestBannerTitle: string;
  guestBannerBody: string;
  guestBannerCta: string;
  progressTitle: string;
  progressLoading: string;
  viewDetails: string;
  lessonsDone: string;
  levelsDone: string;
  dailyStreak: string;
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
  guestOverlayTitle: string;
  guestOverlayBody: string;
  guestOverlayCta: string;
};

const getCopy = (uiLanguage: UiLanguage): PathwayCopy => {
  if (uiLanguage === 'th') {
    return {
      welcomeBack: 'ยินดีต้อนรับกลับมา',
      welcome: 'ยินดีต้อนรับ!',
      welcomeTo: 'ยินดีต้อนรับสู่',
      guestWelcome: 'เส้นทางการเรียนของคุณ',
      freePlanBadge: 'แพ็กเกจฟรี',
      paidBadge: 'สมาชิก',
      upgrade: 'อัปเกรด',
      upgradeBannerTitle: 'ปลดล็อกการเข้าถึงทั้งหมด',
      upgradeBannerBody: 'ทุกบทเรียน ทุกเส้นทาง',
      upgradeBannerCta: 'อัปเกรด →',
      guestBannerTitle: 'ติดตามความคืบหน้า',
      guestBannerBody: 'สร้างบัญชีฟรีเพื่อบันทึกความคืบหน้าของคุณ',
      guestBannerCta: 'สมัครฟรี →',
      progressTitle: 'ความคืบหน้าของฉัน',
      progressLoading: 'กำลังโหลดรายละเอียดความคืบหน้า...',
      viewDetails: 'ดูรายละเอียด →',
      lessonsDone: 'บทเรียนที่จบ',
      levelsDone: 'เลเวลที่จบ',
      dailyStreak: 'สตรีคประจำวัน',
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
      guestOverlayTitle: 'หากต้องการดูเนื้อหาใน My Pathway โปรดสร้างบัญชีฟรี',
      guestOverlayBody: 'บัญชีฟรีช่วยให้คุณบันทึกความคืบหน้า และปลดล็อกประสบการณ์การเรียนส่วนตัวของคุณ',
      guestOverlayCta: 'สร้างบัญชีฟรี',
    };
  }

  return {
    welcomeBack: 'Welcome back',
    welcome: 'Welcome!',
    welcomeTo: 'Welcome to',
    guestWelcome: 'Your learning pathway',
    freePlanBadge: 'Free plan',
    paidBadge: 'Member',
    upgrade: 'Upgrade',
    upgradeBannerTitle: 'Unlock full access',
    upgradeBannerBody: 'All lessons · full pathway',
    upgradeBannerCta: 'Upgrade →',
    guestBannerTitle: 'Track your progress',
    guestBannerBody: 'Create a free account to save your progress.',
    guestBannerCta: 'Sign up free →',
    progressTitle: 'My Progress',
    progressLoading: 'Loading progress details...',
    viewDetails: 'View details →',
    lessonsDone: 'Lessons\ncomplete',
    levelsDone: 'Levels\ncomplete',
    dailyStreak: 'Day\nstreak',
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
    guestOverlayTitle: 'To view My Pathway content, make a free account.',
    guestOverlayBody: 'A free account lets you save progress and unlock your personal pathway experience.',
    guestOverlayCta: 'Create free account',
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

const isEmailLike = (value: string | null | undefined) => {
  if (!value) {
    return false;
  }

  return /\S+@\S+\.\S+/.test(value.trim());
};

const getFirstName = (displayName: string) => {
  const trimmed = displayName.trim();
  if (!trimmed) {
    return '';
  }

  const [firstToken] = trimmed.split(/\s+/);
  return firstToken || trimmed;
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

const renderStatLabel = (label: string, uiLanguage: UiLanguage) => {
  const labelLines = label.split('\n');

  return labelLines.map((line, index) => (
    <AppText key={`${label}-${index}`} language={uiLanguage} variant="caption" style={styles.statLabel}>
      {line}
    </AppText>
  ));
};

const getNoNameWelcomeSeenKey = (userId: string) => `pailin-abroad.no-name-welcome-seen.${userId}`;

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
  const { width } = useWindowDimensions();
  const { uiLanguage, setUiLanguage } = useUiLanguage();
  const { hasAccount, hasMembership, isGuestMode, profile, user } = useAppSession();
  const isTabletScreen = width >= 768;
  const isLargeTabletScreen = width >= 1024;
  const copy = getCopy(uiLanguage);
  const pathwayToggleLabel = uiLanguage === 'th' ? 'EN' : 'ไทย';
  const {
    allLessons,
    completedLessons,
    errorMessage,
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
  const showGuestUi = isGuestMode && !user?.id;

  const displayName =
    (showGuestUi ? copy.guestWelcome : '') ||
    (!isEmailLike(profile?.name) ? profile?.name?.trim() || '' : '') ||
    (!isEmailLike(profile?.username) ? profile?.username?.trim() || '' : '') ||
    (typeof user?.user_metadata?.name === 'string' && !isEmailLike(user.user_metadata.name) ? user.user_metadata.name.trim() : '') ||
    (typeof user?.user_metadata?.username === 'string' && !isEmailLike(user.user_metadata.username) ? user.user_metadata.username.trim() : '') ||
    '';
  const firstName = showGuestUi ? copy.guestWelcome : getFirstName(displayName);
  const hasDisplayName = Boolean(firstName);
  const [hasSeenNoNameWelcome, setHasSeenNoNameWelcome] = React.useState(false);
  const [isGuestOverlayDismissed, setIsGuestOverlayDismissed] = useState(false);
  const shouldShowFirstNoNameWelcome = !showGuestUi && !hasDisplayName && !hasSeenNoNameWelcome;
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

  useEffect(() => {
    const bootstrapStartedAt =
      (globalThis as typeof globalThis & { __pailinAppBootstrapStartedAt?: number }).__pailinAppBootstrapStartedAt ?? null;

    console.info('[app-bootstrap]', 'my pathway screen rendered', {
      elapsedMs: bootstrapStartedAt ? Date.now() - bootstrapStartedAt : null,
      hasAccount,
      hasMembership,
    });
  }, [hasAccount, hasMembership]);

  useEffect(() => {
    let isMounted = true;

    const loadNoNameWelcomeState = async () => {
      if (!user?.id || showGuestUi || hasDisplayName) {
        if (isMounted) {
          setHasSeenNoNameWelcome(true);
        }
        return;
      }

      try {
        const storedValue = await AsyncStorage.getItem(getNoNameWelcomeSeenKey(user.id));
        if (isMounted) {
          setHasSeenNoNameWelcome(storedValue === 'true');
        }
      } catch {
        if (isMounted) {
          setHasSeenNoNameWelcome(true);
        }
      }
    };

    void loadNoNameWelcomeState();

    return () => {
      isMounted = false;
    };
  }, [hasDisplayName, showGuestUi, user?.id]);

  useEffect(() => {
    if (!showGuestUi) {
      setIsGuestOverlayDismissed(false);
    }
  }, [showGuestUi]);

  useEffect(() => {
    if (!shouldShowFirstNoNameWelcome || !user?.id) {
      return;
    }

    void AsyncStorage.setItem(getNoNameWelcomeSeenKey(user.id), 'true').catch(() => {});
  }, [shouldShowFirstNoNameWelcome, user?.id]);

  if (isLoading || isCompletedProgressLoading || isLessonIndexLoading || isStatsLoading) {
    return <PageLoadingState language={uiLanguage} />;
  }

  const showGuestOverlay = showGuestUi && !isGuestOverlayDismissed;

  const handleOpenLesson = (lesson: LessonListItem | null) => {
    const lessonId = lesson?.id ?? null;
    if (!lessonId) {
      return;
    }

    const stage = lesson?.stage;
    const level = typeof lesson?.level === 'number' ? lesson.level : null;
    if (
      (stage === 'Beginner' || stage === 'Intermediate' || stage === 'Advanced' || stage === 'Expert') &&
      level !== null
    ) {
      setLessonLibrarySelection({ stage, level });
    }

    prefetchResolvedLesson(lessonId, 'en');
    router.push(`/lessons/${lessonId}`);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.contentContainer,
        isTabletScreen ? styles.contentContainerTablet : null,
      ]}>
      <ResponsivePageShell>
      <View style={styles.pageFrame}>
        <View pointerEvents={showGuestOverlay ? 'none' : 'auto'}>
      <Stack
        gap="md"
        style={[
          styles.pageShell,
          isTabletScreen ? styles.pageShellTablet : null,
          isLargeTabletScreen ? styles.pageShellLargeTablet : null,
          showGuestOverlay ? styles.pageShellGuest : null,
        ]}>
        <View style={styles.headerBlock}>
          <View style={styles.headerRow}>
            <Pressable accessibilityRole="button" style={styles.avatarButton} onPress={() => router.push('/(tabs)/account/profile')}>
              {showGuestUi ? (
                <Image source={pailinBlueCircleRight} style={styles.avatar} resizeMode="cover" />
              ) : avatarSource ? (
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
                  {showGuestUi ? (
                    <>
                      <AppText
                        language={uiLanguage}
                        variant="title"
                        numberOfLines={1}
                        style={[styles.headerTitle, uiLanguage === 'th' ? styles.headerTitleThai : null]}>
                        {copy.welcomeTo}
                      </AppText>
                      <AppText language="en" variant="title" style={styles.headerName}>
                        Pailin Abroad
                      </AppText>
                    </>
                  ) : hasDisplayName ? (
                    <>
                      <AppText
                        language={uiLanguage}
                        variant="title"
                        numberOfLines={1}
                        style={[styles.headerTitle, uiLanguage === 'th' ? styles.headerTitleThai : null]}>
                        {`${copy.welcomeBack},`}
                      </AppText>
                      <AppText language={uiLanguage} variant="title" style={styles.headerName}>
                        {`${firstName}.`}
                      </AppText>
                    </>
                  ) : shouldShowFirstNoNameWelcome ? (
                    <>
                      <AppText
                        language={uiLanguage}
                        variant="title"
                        numberOfLines={1}
                        style={[styles.headerTitle, styles.headerNoNameTitle, uiLanguage === 'th' ? styles.headerTitleThai : null]}>
                        {copy.welcomeTo}
                      </AppText>
                      <AppText language="en" variant="title" style={styles.headerName}>
                        Pailin Abroad
                      </AppText>
                    </>
                  ) : (
                    <AppText language={uiLanguage} variant="title" style={styles.headerNoNameReturning}>
                      {copy.welcomeBack}
                    </AppText>
                  )}
                </View>

                <View style={styles.planMeta}>
                  <View style={styles.languagePillWrap}>
                    <AndroidNeoShadowLayer borderRadius={999} color={theme.colors.shadow} offset={1.5} />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={uiLanguage === 'th' ? 'Switch language to English' : 'เปลี่ยนภาษาเป็นไทย'}
                      onPress={() => setUiLanguage(uiLanguage === 'th' ? 'en' : 'th')}
                      style={styles.languagePill}>
                      <AppText
                        language={uiLanguage === 'th' ? 'en' : 'th'}
                        variant="caption"
                        style={styles.languagePillText}>
                        {pathwayToggleLabel}
                      </AppText>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {showGuestUi && !showGuestOverlay ? (
          <Pressable
            accessibilityRole="button"
            style={styles.upgradeBanner}
            onPress={() => router.push('/account/auth')}>
            <View style={styles.upgradeBannerCopy}>
              <AppText language={uiLanguage} variant="body" style={styles.upgradeBannerTitle}>
                {copy.guestBannerTitle}
              </AppText>
              <AppText language={uiLanguage} variant="caption" style={styles.upgradeBannerBody}>
                {copy.guestBannerBody}
              </AppText>
            </View>

            <View style={styles.upgradeBannerButton}>
              <AppText language={uiLanguage} variant="caption" style={styles.upgradeBannerButtonText}>
                {copy.guestBannerCta}
              </AppText>
            </View>
          </Pressable>
        ) : !hasMembership ? (
          <Pressable
            accessibilityRole="button"
            style={styles.upgradeBanner}
            onPress={() => {
              prefetchPricing();
              router.push('/(tabs)/account/membership');
            }}>
            <View style={styles.upgradeBannerCopy}>
              <AppText language={uiLanguage} variant="body" style={styles.upgradeBannerTitle}>
                {copy.upgradeBannerTitle}
              </AppText>
              <AppText language={uiLanguage} variant="caption" style={styles.upgradeBannerBody}>
                {copy.upgradeBannerBody}
              </AppText>
            </View>

            <View style={styles.upgradeBannerButton}>
              <AppText language={uiLanguage} variant="caption" style={styles.upgradeBannerButtonText}>
                {copy.upgradeBannerCta}
              </AppText>
            </View>
          </Pressable>
        ) : null}

        <View style={styles.cardWrap}>
          <AndroidNeoShadowLayer borderRadius={theme.radii.lg} color={theme.colors.shadow} offset={2.5} />
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
                  {showGuestUi ? `${copy.levelShort} -` : getStageLabel(progressContext.stage, uiLanguage)}
                </AppText>
                {!showGuestUi && typeof progressContext.level === 'number' ? (
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
                    {showGuestUi ? '-' : (stats?.lessons_completed ?? completedLessons.length)}
                  </AppText>
                  <View style={styles.statLabelGroup}>{renderStatLabel(copy.lessonsDone, uiLanguage)}</View>
                </View>

                <View style={styles.statBox}>
                  <AppText language={uiLanguage} variant="body" style={styles.statValue}>
                    {showGuestUi ? '-' : (stats?.levels_completed ?? 0)}
                  </AppText>
                  <View style={styles.statLabelGroup}>{renderStatLabel(copy.levelsDone, uiLanguage)}</View>
                </View>
                <View style={styles.statBox}>
                  <AppText language={uiLanguage} variant="body" style={styles.statValue}>
                    {showGuestUi ? '-' : (stats?.daily_streak ?? 0)}
                  </AppText>
                  <View style={styles.statLabelGroup}>{renderStatLabel(copy.dailyStreak, uiLanguage)}</View>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.max(progressContext.levelPercent, 6)}%` }]} />
              </View>

              <View style={styles.progressFooter}>
                <AppText language={uiLanguage} variant="caption" style={styles.progressSummary}>
                  {(isCompletedProgressLoading || isLessonIndexLoading) && (allLessons.length === 0 || completedLessons.length === 0)
                    ? copy.progressLoading
                    : copy.lessonsCompleteForLevel(
                        progressContext.levelCompletedCount,
                        progressContext.levelTotalCount || 0,
                        progressContext.level,
                      )}
                </AppText>
                <AppText language={uiLanguage} variant="caption" style={styles.progressPercent}>
                  {(isCompletedProgressLoading || isLessonIndexLoading) && (allLessons.length === 0 || completedLessons.length === 0)
                    ? '–'
                    : `${progressContext.levelPercent}%`}
                </AppText>
              </View>
            </View>
            </Stack>
          </Card>
        </View>

        <Stack gap="sm">
          <AppText language={uiLanguage} variant="caption" style={styles.sectionEyebrow}>
            {copy.continueLearning}
          </AppText>

          <View style={styles.cardWrap}>
            <AndroidNeoShadowLayer borderRadius={theme.radii.lg} color={theme.colors.shadow} offset={2.5} />
            <Card padding="md" radius="lg" style={styles.resumeCard}>
              {resumeRow ? (
                <Stack gap="md">
                <View style={styles.resumeMeta}>
                  {(() => {
                    const lessonNumber = getLessonNumber(resumeRow.lesson);
                    const digitCount = lessonNumber.replace(/\D/g, '').length;
                    const isCheckpoint = isCheckpointLesson(resumeRow.lesson);

                    return (
                      <View style={styles.resumeNumberGroup}>
                        {isCheckpoint ? (
                          <Image
                            source={blueCheckmarkImage}
                            style={styles.resumeNumberCheckmark}
                            resizeMode="contain"
                          />
                        ) : (
                          <AppText
                            language={uiLanguage}
                            variant="body"
                            style={[styles.resumeNumber, digitCount >= 4 ? styles.resumeNumberCompact : null]}>
                            {lessonNumber}
                          </AppText>
                        )}
                        {!hasMembership && resumeRow.state === 'locked' ? (
                          <Image source={lockImage} style={styles.resumeLockIcon} resizeMode="contain" />
                        ) : null}
                      </View>
                    );
                  })()}

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

                <View style={styles.resumeButtonWrap}>
                  <AndroidNeoShadowLayer borderRadius={theme.radii.xl} color={theme.colors.shadow} offset={2.5} />
                  <Button
                    language={uiLanguage}
                    title={resumeRow.state === 'locked' ? copy.becomeMember : copy.openLesson}
                    onPress={() => {
                      if (resumeRow.state === 'locked') {
                        prefetchPricing();
                        router.push('/(tabs)/account/membership');
                        return;
                      }

                      handleOpenLesson(resumeRow.lesson);
                    }}
                    style={styles.resumeButton}
                  />
                </View>
                </Stack>
              ) : (
                <AppText language={uiLanguage} variant="muted" style={styles.emptyText}>
                  {errorMessage || copy.noResumeLesson}
                </AppText>
              )}
            </Card>
          </View>
        </Stack>

        <Stack gap="sm">
          <AppText language={uiLanguage} variant="caption" style={styles.sectionEyebrow}>
            {copy.upNext}
          </AppText>

          <Stack gap="sm">
            {upcomingRows.length > 0 ? (
              upcomingRows.map((row) => {
                const isLocked = row.state === 'locked';

                return (
                  <Pressable
                    key={row.lesson.id}
                    accessibilityRole="button"
                    style={styles.upNextCard}
                    onPress={() => {
                      if (isLocked) {
                        prefetchPricing();
                        router.push('/(tabs)/account/membership');
                        return;
                      }

                      handleOpenLesson(row.lesson);
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

            <View style={styles.libraryButtonWrap}>
              <AndroidNeoShadowLayer borderRadius={theme.radii.lg} color={theme.colors.shadow} offset={1.75} />
              <Pressable
                accessibilityRole="button"
                style={styles.libraryButton}
                onPress={() => router.push(hasMembership ? '/(tabs)/lessons/library' : '/(tabs)/lessons/free-library')}>
                <AppText language={uiLanguage} variant="caption" style={styles.libraryButtonText}>
                  {hasMembership ? copy.browseLibrary : copy.browseFreeLibrary}
                </AppText>
              </Pressable>
            </View>
          </Stack>
        </Stack>
      </Stack>
        </View>

        {showGuestOverlay ? (
          <View style={styles.guestOverlay}>
            <Card padding="lg" radius="lg" style={styles.guestOverlayCard}>
              <Stack gap="md">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={uiLanguage === 'th' ? 'ปิดหน้าต่างสร้างบัญชีฟรี' : 'Dismiss create free account prompt'}
                  onPress={() => setIsGuestOverlayDismissed(true)}
                  style={styles.guestOverlayCloseButton}>
                  <MaterialIcons name="close" size={22} color={theme.colors.mutedText} />
                </Pressable>
                <AppText language={uiLanguage} variant="body" style={styles.guestOverlayTitle}>
                  {copy.guestOverlayTitle}
                </AppText>
                <AppText language={uiLanguage} variant="muted" style={styles.guestOverlayBody}>
                  {copy.guestOverlayBody}
                </AppText>
                <View style={styles.guestOverlayButtonWrap}>
                  <View pointerEvents="none" style={styles.guestOverlayButtonShadow} />
                  <Button
                    language={uiLanguage}
                    title={copy.guestOverlayCta}
                    onPress={() => router.push('/account/auth')}
                    style={styles.guestOverlayButton}
                  />
                </View>
              </Stack>
            </Card>
          </View>
        ) : null}
      </View>
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
    flexGrow: 1,
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  contentContainerTablet: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  pageShell: {
    width: '100%',
  },
  pageShellTablet: {
    maxWidth: 820,
  },
  pageShellLargeTablet: {
    maxWidth: 920,
  },
  pageFrame: {
    position: 'relative',
  },
  pageShellGuest: {
    opacity: 0.22,
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
    fontSize: 22,
    lineHeight: 26,
    fontWeight: theme.typography.weights.bold,
  },
  headerTitleThai: {
    fontSize: 21,
    lineHeight: 26,
  },
  headerName: {
    marginTop: -2,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
  },
  headerNoNameTitle: {
    marginTop: 2,
  },
  headerNoNameReturning: {
    marginTop: 6,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  planMeta: {
    alignItems: 'flex-start',
    gap: 4,
  },
  languagePill: {
    minWidth: 78,
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: '#91CAFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md + 2,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 1.5, height: 1.5 },
        shadowOpacity: 1,
        shadowRadius: 0,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  languagePillWrap: {
    position: 'relative',
  },
  languagePillText: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 15,
    fontWeight: theme.typography.weights.bold,
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
    transform: [{ translateY: 1 }],
  },
  upgradeBanner: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: -theme.spacing.md,
    marginTop: -theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: '#FFF8EA',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  upgradeBannerCopy: {
    flex: 1,
    gap: 2,
    paddingRight: theme.spacing.md,
  },
  upgradeBannerTitle: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
  },
  upgradeBannerBody: {
    color: theme.colors.mutedText,
  },
  upgradeBannerButton: {
    minHeight: 36,
    borderRadius: theme.radii.xl,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 1.5, height: 1.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  upgradeBannerButtonText: {
    color: theme.colors.surface,
    fontWeight: theme.typography.weights.bold,
  },
  cardWrap: {
    position: 'relative',
  },
  progressCard: {
    backgroundColor: '#DCEEFF',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 0,
      },
      android: {
        elevation: 0,
      },
    }),
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
    fontWeight: theme.typography.weights.medium,
    color: '#7B8797',
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
    ...Platform.select({
      android: {
        paddingBottom: 4,
      },
    }),
  },
  stageText: {
    fontSize: 32,
    lineHeight: Platform.OS === 'android' ? 42 : 38,
    fontWeight: theme.typography.weights.semibold,
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
    fontWeight: theme.typography.weights.semibold,
  },
  statLabelGroup: {
    gap: 0,
  },
  statLabel: {
    color: '#66758A',
    fontWeight: theme.typography.weights.medium,
    lineHeight: 16,
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
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 0,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  resumeMeta: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  resumeNumberGroup: {
    minWidth: 42,
    alignItems: 'flex-start',
    gap: 4,
  },
  resumeNumber: {
    fontSize: 22,
    lineHeight: 28,
    marginTop: 2,
    fontFamily: theme.typography.fontFaces.en.medium,
  },
  resumeNumberCheckmark: {
    width: 22,
    height: 22,
    marginTop: 5,
    marginLeft: 2,
  },
  resumeNumberCompact: {
    fontSize: 17,
    lineHeight: 22,
  },
  resumeLockIcon: {
    width: 36,
    height: 36,
    marginLeft: -2,
  },
  resumeTextGroup: {
    flex: 1,
    gap: 2,
  },
  resumeTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: theme.typography.weights.semibold,
  },
  resumeFocus: {
    color: '#66758A',
  },
  membershipHint: {
    marginTop: theme.spacing.xs,
    color: '#66758A',
  },
  resumeButtonWrap: {
    position: 'relative',
  },
  resumeButton: {
    width: '100%',
    ...Platform.select({
      android: {
        elevation: 0,
      },
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 1.75, height: 1.75 },
        shadowOpacity: 1,
        shadowRadius: 0,
      },
    }),
  },
  upNextCard: {
    minHeight: 84,
    borderRadius: theme.radii.lg,
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
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 1.75, height: 1.75 },
        shadowOpacity: 1,
        shadowRadius: 0,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  libraryButtonWrap: {
    position: 'relative',
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
  guestOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255, 253, 249, 0.4)',
  },
  guestOverlayCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFF4E8',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  guestOverlayCloseButton: {
    alignSelf: 'flex-end',
    marginBottom: -theme.spacing.xs,
    padding: 2,
  },
  guestOverlayTitle: {
    textAlign: 'left',
    fontWeight: theme.typography.weights.bold,
    fontSize: 24,
    lineHeight: 30,
    color: theme.colors.text,
  },
  guestOverlayBody: {
    textAlign: 'left',
    color: theme.colors.mutedText,
    lineHeight: 22,
  },
  guestOverlayButton: {
    minHeight: 56,
    borderWidth: 2,
    borderRadius: 28,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.primary,
    overflow: 'hidden',
  },
  guestOverlayButtonWrap: {
    position: 'relative',
    marginTop: theme.spacing.xs,
  },
  guestOverlayButtonShadow: {
    position: 'absolute',
    top: 3,
    right: -3,
    bottom: -3,
    left: 3,
    borderRadius: 28,
    backgroundColor: theme.colors.shadow,
  },
});
