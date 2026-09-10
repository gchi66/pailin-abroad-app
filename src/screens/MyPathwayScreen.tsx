import React, { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import exerciseBankImage from '@/assets/images/resources_exercise_bank.webp';
import lockWhiteImage from '@/assets/images/lock-white.png';
import pathwayExerciseBankImage from '@/assets/images/my-pathway-exercise-bank.png';
import pathwayNextLessonImage from '@/assets/images/my-pathway-next-lesson.png';
import pathwayProgressImage from '@/assets/images/my-pathway-progress.png';
import pailinBlueCircleRight from '@/assets/images/characters/pailin_blue_circle_right.webp';
import { resolveLocalLessonHeaderImage } from '@/src/assets/lesson-header-images';
import { prefetchResolvedLesson } from '@/src/api/lessons';
import { prefetchPricing } from '@/src/api/pricing';
import { AppText } from '@/src/components/ui/AppText';
import { AndroidNeoShadowLayer } from '@/src/components/ui/AndroidNeoShadowLayer';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { Stack } from '@/src/components/ui/Stack';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
import { FLOATING_TAB_BAR_PAGE_BOTTOM_PADDING } from '@/src/components/navigation/layout';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { PathwayLessonRow, usePathwayData } from '@/src/hooks/use-pathway-data';
import { resolveAvatarSource } from '@/src/lib/avatar';
import { setLessonLibrarySelection } from '@/src/lib/lesson-library-selection';
import { getFreePathwaySummary } from '@/src/lib/free-pathway';
import { env } from '@/src/config/env';
import { theme } from '@/src/theme/theme';
import { LessonListItem } from '@/src/types/lesson';

type UiLanguage = 'en' | 'th';

type LessonCopyProps = { title: string; focus: string; language: UiLanguage };

function MeasuredLessonCopy({ title, focus, language, width }: LessonCopyProps & { width: number }) {
  const [fontSize, setFontSize] = useState(24);
  const [fits, setFits] = useState(false);
  const focusFontSize = Math.min(14, Math.max(1, fontSize - 2), fontSize * 0.85);
  const titleStyle = {
    width,
    fontSize,
    lineHeight: Math.ceil(fontSize * 29 / 24),
    fontFamily: theme.typography.fontFaces[language].bold,
  };

  return (
    <View style={{ width, gap: 7 }}>
      {/* Measure without truncation: native auto-fit can treat clipped text as fitting. */}
      {!fits ? (
        <AppText
          key={fontSize}
          language={language}
          variant="title"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[titleStyle, styles.titleMeasurement]}
          onTextLayout={({ nativeEvent }) => {
            if (nativeEvent.lines.length > 2 && fontSize > 1) {
              setFontSize(fontSize - 1);
            } else {
              setFits(true);
            }
          }}>
          {title}
        </AppText>
      ) : null}
      <AppText language={language} variant="title" style={[titleStyle, !fits ? styles.titlePending : null]}>
        {title}
      </AppText>
      {focus ? (
        <AppText
          language={language}
          variant="muted"
          numberOfLines={2}
          ellipsizeMode="tail"
          style={[styles.resumeFocus, { fontSize: focusFontSize, lineHeight: Math.ceil(focusFontSize * 19 / 14) }]}>
          {focus}
        </AppText>
      ) : null}
    </View>
  );
}

function LessonCopy({ title, focus, language }: LessonCopyProps) {
  const [width, setWidth] = useState(0);
  const { fontScale } = useWindowDimensions();

  return (
    <View style={styles.titleZone} onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}>
      {width > 0 ? (
        <MeasuredLessonCopy key={`${title}-${language}-${width}-${fontScale}`} title={title} focus={focus} language={language} width={width} />
      ) : null}
    </View>
  );
}

const getCopy = (uiLanguage: UiLanguage) => uiLanguage === 'th' ? {
  welcomeBack: 'ยินดีต้อนรับกลับมา',
  welcome: 'ยินดีต้อนรับ!',
  welcomeTo: 'ยินดีต้อนรับสู่',
  guestWelcome: 'เส้นทางการเรียนของคุณ',
  guestBannerTitle: 'ติดตามความคืบหน้า',
  guestBannerBody: 'สร้างบัญชีฟรีเพื่อบันทึกความคืบหน้าของคุณ',
  guestBannerCta: 'สมัครฟรี →',
  progressTitle: 'สถิติของคุณ',
  viewDetails: 'ดูความคืบหน้าในการเรียน →',
  lessonsDone: 'บทเรียนที่จบ',
  levelsDone: 'เลเวลที่จบ',
  dailyStreak: 'สตรีคประจำวัน',
  levelShort: 'เลเวล',
  continueLearning: 'เรียนต่อ',
  openLesson: 'เริ่มบทเรียน',
  lesson: 'บทเรียน',
  becomeMember: 'อัปเกรดเพื่อเรียนต่อ →',
  browseFreeLibrary: 'เปิดคลังบทเรียนฟรี →',
  untitledLesson: 'ไม่มีชื่อบทเรียน',
  noResumeLesson: 'ยังไม่มีบทเรียนถัดไปในตอนนี้',
  upgradeTitle: 'ปลดล็อกคอร์สทั้งหมด',
  upgradeCta: 'ดูแพ็กเกจ →',
  upgradeBody: (total: number) => `คุณสามารถเรียนฟรีได้ ${total} บทเรียน อัปเกรดเพื่อปลดล็อกคลังบทเรียนทั้งหมด!`,
  allFreeComplete: 'คุณเรียนครบทุกบทเรียนฟรีแล้ว!',
  allFreeCompleteBody: 'เรียนต่อด้วยคอร์สเต็ม และพัฒนาทักษะของคุณต่อไป',
  progressSummary: (done: number, total: number, free: boolean) => `เรียนจบ ${done} จาก ${total} ${free ? 'บทเรียนฟรี' : 'บทเรียน'}`,
  practice: 'ฝึกฝน',
  exerciseBank: 'คลังแบบฝึกหัด',
  practiceBody: 'ฝึกฝนสิ่งที่คุณได้เรียนรู้!',
  guestOverlayTitle: 'หากต้องการดูเนื้อหาใน My Pathway โปรดสร้างบัญชีฟรี',
  guestOverlayBody: 'บัญชีฟรีช่วยให้คุณบันทึกความคืบหน้า และปลดล็อกประสบการณ์การเรียนส่วนตัวของคุณ',
  guestOverlayCta: 'สร้างบัญชีฟรี',
} : {
  welcomeBack: 'Welcome back',
  welcome: 'Welcome!',
  welcomeTo: 'Welcome to',
  guestWelcome: 'Your learning pathway',
  guestBannerTitle: 'Track your progress',
  guestBannerBody: 'Create a free account to save your progress.',
  guestBannerCta: 'Sign up free →',
  progressTitle: 'Your stats',
  viewDetails: 'View learning progress →',
  lessonsDone: 'Lessons\ncomplete',
  levelsDone: 'Levels\ncomplete',
  dailyStreak: 'Day\nstreak',
  levelShort: 'Level',
  continueLearning: 'Continue learning',
  openLesson: 'Start lesson',
  lesson: 'Lesson',
  becomeMember: 'Upgrade to continue →',
  browseFreeLibrary: 'Browse the free lesson library →',
  untitledLesson: 'Untitled lesson',
  noResumeLesson: 'There is no next lesson right now.',
  upgradeTitle: 'Unlock the full course',
  upgradeCta: 'View plans →',
  upgradeBody: (total: number) => `You have access to ${total} free lessons. Upgrade to unlock the full lesson library!`,
  allFreeComplete: 'You’ve finished all your free lessons!',
  allFreeCompleteBody: 'Keep learning with the full course and build on your progress.',
  progressSummary: (done: number, total: number, free: boolean) => `${done} of ${total} ${free ? 'free lessons completed' : 'lessons complete'}`,
  practice: 'Practice',
  exerciseBank: 'Exercise Bank',
  practiceBody: 'Practice what you’ve learned!',
  guestOverlayTitle: 'To view My Pathway content, make a free account.',
  guestOverlayBody: 'A free account lets you save progress and unlock your personal pathway experience.',
  guestOverlayCta: 'Create free account',
};

function LessonArtwork({ path }: { path: string | null }) {
  const [failed, setFailed] = useState(false);
  const localImage = resolveLocalLessonHeaderImage(path);
  let normalized = path?.trim() || '';
  if (normalized && !/^https?:\/\//i.test(normalized)) {
    normalized = normalized.replace(/^\/+/, '').replace(/^lesson-images\//i, '').split(/[?#]/)[0];
    if (!normalized.includes('/')) normalized = `headers/${normalized}`;
    if (!/\.[a-z0-9]+$/i.test(normalized)) normalized += '.webp';
    normalized = env.supabaseUrl ? `${env.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/lesson-images/${normalized}` : '';
  }
  const source = !failed && localImage
    ? localImage
    : normalized && !failed
      ? { uri: normalized }
      : pailinBlueCircleRight;

  return <Image source={source}
    onError={() => setFailed(true)} style={styles.lessonArtwork} resizeMode="contain" accessible={false} />;
}

function UnlockArtwork({ large = false }: { large?: boolean }) {
  return (
    <View style={large ? styles.lessonArtwork : styles.upgradeArtwork} accessible={false}>
      <Svg width="100%" height="100%" viewBox="0 0 120 120">
        <Circle cx="59" cy="64" r="46" fill="#FFF3C5" />
        <G rotation={-16} origin="60,65" stroke="#333333" strokeWidth={1.5} strokeLinejoin="round">
          <Path d="M39 58V34a21 21 0 0 1 42 0" fill="none" strokeWidth={7} strokeLinecap="round" />
          <Path d="M39 58V34a21 21 0 0 1 42 0" fill="none" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" />
          <Rect x="28" y="55" width="64" height="48" fill="#F8D469" />
          <Path d="M60 68a6 6 0 0 0-3 11v10h6V79a6 6 0 0 0-3-11Z" fill="#BCA35C" />
        </G>
        <Path d="m100 29 2 5 5 2-5 2-2 5-2-5-5-2 5-2ZM15 75l2 4 5 1-4 3 1 5-4-3-4 2 1-5-3-3 5-1Z" fill="#F8D469" stroke="#333333" strokeWidth={1.2} />
      </Svg>
    </View>
  );
}

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

type MyPathwayScreenProps = {
  deferLoadingState?: boolean;
  onReady?: () => void;
};

export function MyPathwayScreen({ deferLoadingState = false, onReady }: MyPathwayScreenProps = {}) {
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
    resumeRow: defaultResumeRow,
    freeLessonIds,
    stats,
  } = usePathwayData({
    enabled: hasAccount,
    hasMembership,
    userId: user?.id ?? null,
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

  const freePathway = useMemo(
    () => getFreePathwaySummary(pathwayRows, freeLessonIds, defaultResumeRow),
    [pathwayRows, freeLessonIds, defaultResumeRow],
  );
  const resumeRow = hasMembership ? defaultResumeRow : freePathway.nextLesson;
  const freeCourseComplete = !showGuestUi && !hasMembership && freePathway.isComplete;
  const progressContext = useMemo(
    () => getProgressContext(pathwayRows, allLessons, completedLessons, resumeRow),
    [allLessons, completedLessons, pathwayRows, resumeRow],
  );
  const progressDone = hasMembership ? progressContext.levelCompletedCount : freePathway.completedCount;
  const progressTotal = hasMembership ? progressContext.levelTotalCount : freePathway.totalCount;
  const progressPercent = progressTotal > 0 ? Math.round(progressDone / progressTotal * 100) : 0;

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

    void AsyncStorage.setItem(getNoNameWelcomeSeenKey(user.id), 'true').catch(() => { });
  }, [shouldShowFirstNoNameWelcome, user?.id]);

  const isPathwayLoading = isLoading || isCompletedProgressLoading || isLessonIndexLoading || isStatsLoading;

  useEffect(() => {
    if (!isPathwayLoading) {
      onReady?.();
    }
  }, [isPathwayLoading, onReady]);

  if (isPathwayLoading) {
    if (deferLoadingState) {
      return <View style={styles.loadingBackground} />;
    }

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
    router.push({
      pathname: '/lesson-preview/[id]',
      params: {
        id: lessonId,
        libraryRoute: hasMembership ? 'library' : 'free-library',
      },
    });
  };

  const handleUpgrade = () => {
    prefetchPricing();
    router.push('/(tabs)/account/membership');
  };
  const sectionLabel = (label: string, icon: ImageSourcePropType) => (
    <View style={styles.sectionLabel}>
      <Image source={icon} style={styles.sectionIcon} resizeMode="contain" accessible={false} />
      <AppText language={uiLanguage} variant="caption" style={styles.sectionEyebrow}>{label}</AppText>
    </View>
  );

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
                              style={[styles.headerTitle, uiLanguage === 'th' ? styles.headerTitleThai : null]}>
                              {`${copy.welcomeBack},`}
                            </AppText>
                            <AppText language={uiLanguage} variant="title" style={styles.headerName}>
                              {`${firstName}!`}
                            </AppText>
                          </>
                        ) : shouldShowFirstNoNameWelcome ? (
                          <>
                            <AppText
                              language={uiLanguage}
                              variant="title"
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
                <Pressable accessibilityRole="button" style={styles.guestBanner} onPress={() => router.push('/account/auth')}>
                  <AppText language={uiLanguage} style={[styles.bannerTitle, uiLanguage === 'th' ? { fontFamily: theme.typography.fontFaces.th.bold } : null]}>{copy.guestBannerTitle}</AppText>
                  <AppText language={uiLanguage} variant="caption">{copy.guestBannerBody}</AppText>
                  <AppText language={uiLanguage} variant="caption" style={styles.libraryLink}>{copy.guestBannerCta}</AppText>
                </Pressable>
              ) : null}

              <Stack gap="sm">
                {sectionLabel(copy.continueLearning, pathwayNextLessonImage)}
                <View style={styles.cardWrap}>
                  <AndroidNeoShadowLayer borderRadius={5} color={theme.colors.shadow} offset={4} />
                  <Card style={styles.resumeCard}>
                    {freeCourseComplete ? (
                      <Stack gap="md">
                        <View style={styles.lessonMain}>
                          <View style={styles.resumeTextGroup}>
                            <AppText language={uiLanguage} variant="title" style={[styles.resumeTitle, uiLanguage === 'th' ? { fontFamily: theme.typography.fontFaces.th.bold } : null]}>{copy.allFreeComplete}</AppText>
                            <AppText language={uiLanguage} variant="muted" style={styles.resumeFocus}>{copy.allFreeCompleteBody}</AppText>
                          </View>
                          <UnlockArtwork large />
                        </View>
                        <Button language={uiLanguage} title={copy.becomeMember} onPress={handleUpgrade} style={styles.resumeButton} textStyle={styles.ctaText} />
                      </Stack>
                    ) : resumeRow ? (
                      <Stack gap="lg">
                        <View style={styles.lessonMain}>
                          <View style={styles.resumeTextGroup}>
                            <AppText language={uiLanguage} variant="caption" style={styles.lessonNumber}>{copy.lesson} {getLessonNumber(resumeRow.lesson)}</AppText>
                            <LessonCopy
                              language={uiLanguage}
                              title={getLessonTitle(resumeRow.lesson, uiLanguage, copy.untitledLesson)}
                              focus={getLessonFocus(resumeRow.lesson, uiLanguage)}
                            />
                          </View>
                          <LessonArtwork key={resumeRow.lesson.id} path={resumeRow.lesson.header_img} />
                        </View>
                        <Button language={uiLanguage} title={resumeRow.state === 'locked' ? copy.becomeMember : copy.openLesson}
                          leadingIcon={resumeRow.state === 'locked' ? <Image source={lockWhiteImage} style={styles.buttonLockIcon} resizeMode="contain" accessible={false} /> : undefined}
                          onPress={() => resumeRow.state === 'locked' ? handleUpgrade() : handleOpenLesson(resumeRow.lesson)}
                          style={styles.resumeButton} textStyle={styles.ctaText} />
                      </Stack>
                    ) : (
                      <AppText language={uiLanguage} variant="muted">{errorMessage || copy.noResumeLesson}</AppText>
                    )}
                  </Card>
                </View>
              </Stack>

              <Stack gap="sm">
                {sectionLabel(copy.progressTitle, pathwayProgressImage)}
                <Card style={styles.progressCard}>
                  <Stack gap="sm">
                    <View style={styles.progressHeader}>
                      <AppText language={uiLanguage} variant="caption" style={styles.stageText}>
                        {showGuestUi ? `${copy.levelShort} –` : `${getStageLabel(progressContext.stage, uiLanguage)} · ${copy.levelShort} ${progressContext.level ?? '–'}`}
                      </AppText>
                      <AppText language={uiLanguage} variant="caption" style={styles.progressSummary}>
                        {showGuestUi ? '–' : copy.progressSummary(progressDone, progressTotal, !hasMembership)}
                      </AppText>
                    </View>
                    <View accessibilityRole="progressbar" accessibilityLabel={copy.progressTitle}
                      accessibilityValue={{ min: 0, max: 100, now: progressPercent, text: copy.progressSummary(progressDone, progressTotal, !hasMembership) }}
                      style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                    </View>
                    {hasMembership || showGuestUi ? (
                      <>
                        <View style={styles.statsGrid}>
                          {[
                            { value: stats?.lessons_completed ?? completedLessons.length, label: copy.lessonsDone },
                            { value: stats?.levels_completed ?? 0, label: copy.levelsDone },
                            { value: stats?.daily_streak ?? 0, label: copy.dailyStreak },
                          ].map(({ value, label }) => (
                            <View key={label} style={styles.statBox}>
                              <AppText language={uiLanguage} variant="title" style={styles.statValue}>{showGuestUi ? '–' : value}</AppText>
                              <View style={styles.statLabelGroup}>{renderStatLabel(label, uiLanguage)}</View>
                            </View>
                          ))}
                        </View>
                        <Pressable accessibilityRole="link" onPress={() => router.push('/(tabs)/pathway/progress')} style={styles.detailsLinkTouch}>
                          <AppText language={uiLanguage} variant="caption" style={styles.detailsLink}>{copy.viewDetails}</AppText>
                        </Pressable>
                      </>
                    ) : null}
                  </Stack>
                </Card>
              </Stack>

              {!hasMembership && !showGuestUi ? (
                <Card style={styles.upgradeCard}>
                  {!freeCourseComplete ? (
                    <View style={styles.upgradeMain}>
                      <UnlockArtwork />
                      <View style={styles.upgradeCopy}>
                        <AppText language={uiLanguage} variant="title" style={[styles.bannerTitle, uiLanguage === 'th' ? { fontFamily: theme.typography.fontFaces.th.bold } : null]}>{copy.upgradeTitle}</AppText>
                        <AppText language={uiLanguage} variant="muted" style={styles.upgradeBody}>{copy.upgradeBody(freePathway.totalCount)}</AppText>
                        <Button language={uiLanguage} title={copy.upgradeCta} onPress={handleUpgrade} style={styles.upgradeButton} textStyle={styles.smallCtaText} />
                      </View>
                    </View>
                  ) : null}
                  <Pressable accessibilityRole="link" onPress={() => router.push('/(tabs)/lessons/free-library')}
                    style={[styles.libraryTouch, !freeCourseComplete ? styles.libraryDivider : null]}>
                    <AppText language={uiLanguage} variant="caption" style={styles.libraryLink}>{copy.browseFreeLibrary}</AppText>
                  </Pressable>
                </Card>
              ) : null}

              <Stack gap="sm">
                {sectionLabel(copy.practice, pathwayExerciseBankImage)}
                <Pressable accessibilityRole="button" accessibilityLabel={`${copy.exerciseBank}: ${copy.practice}`}
                  onPress={() => router.push('/(tabs)/exercises')} style={styles.practiceCard}>
                  <Image source={exerciseBankImage} style={styles.practiceArtwork} resizeMode="contain" accessible={false} />
                  <View style={styles.practiceCopy}>
                    <AppText language={uiLanguage} variant="title" style={[styles.practiceTitle, uiLanguage === 'th' ? { fontFamily: theme.typography.fontFaces.th.bold } : null]}>{copy.exerciseBank}</AppText>
                    <AppText language={uiLanguage} variant="muted" style={styles.practiceBody}>{copy.practiceBody}</AppText>
                  </View>
                  <View style={styles.practiceButton}>
                    <AppText language={uiLanguage} variant="caption" style={styles.smallCtaText}>{copy.practice}</AppText>
                  </View>
                </Pressable>
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
  loadingBackground: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    flexGrow: 1,
    padding: theme.spacing.md,
    paddingBottom: FLOATING_TAB_BAR_PAGE_BOTTOM_PADDING,
  },
  contentContainerTablet: {
    alignItems: 'center',
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
    borderColor: '#DDDDDD',
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
    color: theme.colors.text,
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
        shadowOffset: {
          width: 1.5,
          height: 1.5
        },
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
    shadowOffset: {
      width: 2,
      height: 2
    },
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
  cardWrap: { position: 'relative' },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8
  },
  sectionIcon: {
    width: 18,
    height: 18,
  },
  sectionEyebrow: {
    fontSize: 10,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#666666'
  },
  resumeCard: {
    backgroundColor: '#EAF4FF',
    borderRadius: 5,
    padding: 18,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: {
          width: 4,
          height: 4
        },
        shadowOpacity: 1,
        shadowRadius: 0
      }
    }),
  },
  lessonMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resumeTextGroup: {
    flex: 1,
    minWidth: 0,
    gap: 7
  },
  titleZone: {
    width: '100%',
    minWidth: 0,
  },
  titleMeasurement: {
    position: 'absolute',
    top: 0,
    left: 0,
    opacity: 0,
  },
  titlePending: {
    height: 58,
    opacity: 0,
  },
  lessonNumber: {
    fontFamily: theme.typography.fontFaces.en.semibold,
    fontSize: 10,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  resumeTitle: {
    fontSize: 24,
    lineHeight: 29,
    fontFamily: theme.typography.fontFaces.en.bold
  },
  resumeFocus: {
    fontSize: 14,
    lineHeight: 19,
    color: '#666666'
  },
  lessonArtwork: {
    width: '42%',
    flexShrink: 0,
    maxWidth: 210,
    height: 124
  },
  resumeButton: {
    backgroundColor: '#2860E8',
    minHeight: 40,
    paddingVertical: 6,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: {
          width: 2,
          height: 3
        },
        shadowOpacity: 1,
        shadowRadius: 0
      }
    }),
  },
  ctaText: {
    textTransform: 'uppercase',
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.3
  },
  buttonLockIcon: {
    width: 16,
    height: 16,
  },
  progressCard: {
    borderRadius: 7,
    borderColor: '#E0E0E0',
    padding: 16
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    flexWrap: 'wrap'
  },
  stageText: {
    fontSize: 11,
    lineHeight: 17,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: theme.typography.fontFaces.en.semibold
  },
  progressSummary: {
    fontSize: 10,
    lineHeight: 16
  },
  progressTrack: {
    height: 8,
    borderRadius: 5,
    borderWidth: 0.75,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    backgroundColor: '#EAF4FF'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#BCE574'
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4
  },
  statBox: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 3,
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#DEDEDE',
    borderRadius: 5,
    padding: 7
  },
  statValue: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: theme.typography.fontFaces.en.semibold
  },
  statLabelGroup: { flexShrink: 1 },
  statLabel: {
    fontSize: 10,
    lineHeight: 16,
    color: '#666666',
    textAlign: 'right'
  },
  detailsLinkTouch: {
    alignSelf: 'flex-end',
    minHeight: 32,
    justifyContent: 'center'
  },
  detailsLink: {
    fontSize: 9,
    lineHeight: 15,
    color: '#666666',
    textTransform: 'uppercase',
    textDecorationLine: 'underline'
  },
  upgradeCard: {
    backgroundColor: '#FFFBE5',
    borderColor: '#EDC743',
    borderRadius: 10,
    padding: 14
  },
  upgradeMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexWrap: 'wrap'
  },
  upgradeArtwork: {
    width: '30%',
    maxWidth: 140,
    height: 105
  },
  upgradeCopy: {
    flex: 1,
    minWidth: 165,
    gap: 6
  },
  bannerTitle: {
    fontSize: 14,
    lineHeight: 20,
    textTransform: 'uppercase',
    fontFamily: theme.typography.fontFaces.en.bold
  },
  upgradeBody: {
    fontSize: 11,
    lineHeight: 17,
    color: '#666666'
  },
  upgradeButton: {
    alignSelf: 'flex-start',
    minHeight: 32,
    backgroundColor: '#F9DA60',
    paddingHorizontal: 28,
    paddingVertical: 5
  },
  smallCtaText: {
    color: theme.colors.text,
    textTransform: 'uppercase',
    fontSize: 10,
    lineHeight: 16,
    letterSpacing: 0.3
  },
  libraryTouch: {
    minHeight: 36,
    justifyContent: 'center'
  },
  libraryDivider: {
    borderTopWidth: 1,
    borderColor: '#CCC7AC',
    borderStyle: 'dashed',
    marginTop: 18,
    paddingTop: 12
  },
  libraryLink: {
    fontSize: 10,
    lineHeight: 16,
    color: '#1F5CFF',
    textTransform: 'uppercase'
  },
  practiceCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: 5,
    padding: 12
  },
  practiceArtwork: {
    width: 70,
    height: 65
  },
  practiceCopy: {
    flex: 1,
    minWidth: 120,
    gap: 2
  },
  practiceTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: theme.typography.fontFaces.en.bold
  },
  practiceBody: {
    fontSize: 11,
    lineHeight: 16
  },
  practiceButton: {
    minHeight: 32,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 99,
    backgroundColor: '#BFEDFC',
    paddingHorizontal: 20,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center'
  },
  guestBanner: {
    backgroundColor: '#FFF8EA',
    borderRadius: 7,
    padding: 14,
    gap: 6
  },
});
