import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import blueCompletedCheckImage from '@/assets/images/check_circle_blue.webp';
import { AppLessonProgressSummary } from '@/src/api/app-lesson-progress';
import { getLessonsIndex, prefetchResolvedLesson } from '@/src/api/lessons';
import { LessonProgressCircle } from '@/src/components/lesson/LessonProgressCircle';
import { StandardPageHeader } from '@/src/components/ui/StandardPageHeader';
import { AppText } from '@/src/components/ui/AppText';
import { Card } from '@/src/components/ui/Card';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { Stack } from '@/src/components/ui/Stack';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { loadLessonProgressSummariesProgressively } from '@/src/lib/lesson-library-progress';
import { getLessonLibraryProgressRefreshToken } from '@/src/lib/lesson-library-selection';
import { theme } from '@/src/theme/theme';
import { LessonListItem } from '@/src/types/lesson';

type StageName = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

const STAGE_ORDER: StageName[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
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

const getStageTitle = (stage: StageName, uiLanguage: 'en' | 'th') => {
  if (uiLanguage === 'th') {
    if (stage === 'Beginner') return 'ระดับเริ่มต้น';
    if (stage === 'Intermediate') return 'ระดับกลาง';
    if (stage === 'Advanced') return 'ระดับสูง';
    return 'ระดับเชี่ยวชาญ';
  }
  return stage.toUpperCase();
};

export function FreeLessonLibraryScreen() {
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();
  const { hasAccount } = useAppSession();
  const [items, setItems] = useState<LessonListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progressByLesson, setProgressByLesson] = useState<Record<string, AppLessonProgressSummary>>({});
  const [progressRefreshToken, setProgressRefreshToken] = useState(() => getLessonLibraryProgressRefreshToken());
  const progressRequestIdRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const rows = await getLessonsIndex();
        if (isMounted) {
          setItems(rows);
        }
      } catch (error) {
        if (isMounted) {
          const message = error instanceof Error ? error.message : 'Failed to load lessons.';
          setErrorMessage(message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void run();

    return () => {
      isMounted = false;
    };
  }, []);

  const lessonsByStage = useMemo(() => {
    const grouped = new Map<StageName, LessonListItem[]>();
    STAGE_ORDER.forEach((stage) => grouped.set(stage, []));

    STAGE_ORDER.forEach((stage) => {
      const stageLessons = items
        .filter((lesson) => lesson.stage === stage && typeof lesson.level === 'number')
        .sort((a, b) => {
          const levelOrder = (a.level ?? 0) - (b.level ?? 0);
          if (levelOrder !== 0) {
            return levelOrder;
          }
          return (a.lesson_order ?? Number.MAX_SAFE_INTEGER) - (b.lesson_order ?? Number.MAX_SAFE_INTEGER);
        });

      const firstByLevel = new Map<number, LessonListItem>();
      stageLessons.forEach((lesson) => {
        if (typeof lesson.level !== 'number') {
          return;
        }
        if (!firstByLevel.has(lesson.level)) {
          firstByLevel.set(lesson.level, lesson);
        }
      });

      grouped.set(
        stage,
        [...firstByLevel.entries()]
          .sort((a, b) => a[0] - b[0])
          .map((entry) => entry[1])
      );
    });

    return grouped;
  }, [items]);

  const visibleLessonIds = useMemo(() => {
    return STAGE_ORDER.flatMap((stage) => (lessonsByStage.get(stage) ?? []).map((lesson) => lesson.id)).filter(Boolean);
  }, [lessonsByStage]);

  const refreshProgressSummaries = React.useCallback(async () => {
    if (!hasAccount || !visibleLessonIds.length) {
      setProgressByLesson({});
      return;
    }

    const requestId = progressRequestIdRef.current + 1;
    progressRequestIdRef.current = requestId;
    setProgressByLesson({});

    await loadLessonProgressSummariesProgressively({
      lessonIds: visibleLessonIds,
      isCancelled: () => progressRequestIdRef.current !== requestId,
      onPartial: (summaries) => {
        setProgressByLesson((prev) => ({
          ...prev,
          ...summaries,
        }));
      },
      onError: () => {
        if (progressRequestIdRef.current === requestId) {
          setProgressByLesson({});
        }
      },
    });
  }, [hasAccount, visibleLessonIds]);

  useFocusEffect(
    React.useCallback(() => {
      setProgressRefreshToken(getLessonLibraryProgressRefreshToken());
    }, [])
  );

  useEffect(() => {
    void refreshProgressSummaries();
  }, [progressRefreshToken, refreshProgressSummaries]);

  const handleLessonPress = (lesson: LessonListItem) => {
    router.push({
      pathname: '/lessons/[id]',
      params: {
        id: lesson.id,
        locked: '0',
      },
    });
  };

  const handleLessonPressIn = (lessonId: string) => {
    prefetchResolvedLesson(lessonId, 'en');
  };

  if (isLoading) {
    return <PageLoadingState language={uiLanguage} />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <ResponsivePageShell>
      <Stack gap="md">
        <StandardPageHeader language={uiLanguage} title={uiLanguage === 'th' ? 'คลังบทเรียนฟรี' : 'Free Lesson Library'} />

        {errorMessage ? (
          <Card padding="md" radius="md" style={styles.errorCard}>
            <AppText language={uiLanguage} variant="body" style={styles.errorText}>
              {errorMessage}
            </AppText>
          </Card>
        ) : null}

        {!errorMessage ? (
          <View style={styles.contentWrap}>
            <Stack gap="lg">
              {STAGE_ORDER.map((stage) => {
                const lessons = lessonsByStage.get(stage) ?? [];
                return (
                  <View key={stage} style={styles.stageSection}>
                    <View style={styles.stageDivider}>
                      <View style={styles.stageDividerLine} />
                      <View style={styles.stageHeaderChip}>
                        <AppText language={uiLanguage} variant="body" style={styles.stageTitle}>
                          {getStageTitle(stage, uiLanguage)}
                        </AppText>
                      </View>
                    </View>

                    <Card padding="xs" radius="lg" style={styles.stageCard}>
                      <View style={styles.lessonList}>
                        {lessons.map((lesson, index) => {
                          const titleText =
                            uiLanguage === 'th'
                              ? pickText(lesson.title_th, lesson.title, 'ไม่มีชื่อบทเรียน')
                              : pickText(lesson.title, lesson.title_th, 'Untitled lesson');
                          const lessonNumber =
                            typeof lesson.level === 'number' && typeof lesson.lesson_order === 'number'
                              ? `${lesson.level}.${lesson.lesson_order}`
                              : '-';
                          const progress = progressByLesson[lesson.id];

                          return (
                            <Pressable
                              key={lesson.id}
                              accessibilityRole="button"
                              style={[styles.itemPressable, index < lessons.length - 1 ? styles.lessonItemBorder : null]}
                              onPressIn={() => handleLessonPressIn(lesson.id)}
                              onPress={() => handleLessonPress(lesson)}>
                              <View style={styles.lessonRow}>
                                <View style={styles.lessonLeft}>
                                  <AppText language={uiLanguage} variant="body" style={styles.lessonNumber}>
                                    {lessonNumber}
                                  </AppText>
                                  <View style={styles.lessonTextGroup}>
                                    <AppText
                                      language={uiLanguage}
                                      variant="body"
                                      numberOfLines={3}
                                      style={styles.lessonTitle}>
                                      {titleText}
                                    </AppText>
                                  </View>
                                </View>
                                <View style={styles.lessonRight}>
                                  {progress?.is_completed ? (
                                    <Image
                                      source={blueCompletedCheckImage}
                                      style={styles.completedStatusIcon}
                                      resizeMode="contain"
                                    />
                                  ) : progress?.has_started && (progress.percent_complete ?? 0) > 0 ? (
                                    <LessonProgressCircle percent={progress.percent_complete} />
                                  ) : null}
                                </View>
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    </Card>
                  </View>
                );
              })}

            </Stack>
          </View>
        ) : null}
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
    paddingBottom: theme.spacing.xl,
  },
  centerState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCard: {
    marginHorizontal: theme.spacing.md,
  },
  errorText: {
    color: theme.colors.primary,
  },
  contentWrap: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  stageSection: {
    gap: theme.spacing.sm,
  },
  stageDivider: {
    position: 'relative',
    minHeight: 30,
    justifyContent: 'center',
  },
  stageDividerLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 1,
    backgroundColor: theme.colors.border,
    opacity: 0.16,
  },
  stageHeaderChip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xl,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    backgroundColor: theme.colors.background,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  stageCard: {
    padding: 0,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  stageTitle: {
    fontWeight: theme.typography.weights.semibold,
    letterSpacing: 0.8,
  },
  lessonList: {
    overflow: 'hidden',
  },
  itemPressable: {
    backgroundColor: theme.colors.surface,
  },
  lessonItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  lessonRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  lessonLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  lessonNumber: {
    minWidth: 42,
    fontWeight: theme.typography.weights.bold,
    lineHeight: 24,
  },
  lessonTextGroup: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  lessonTitle: {
    fontWeight: theme.typography.weights.semibold,
    flexShrink: 1,
    lineHeight: 22,
  },
  lessonRight: {
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  completedStatusIcon: {
    width: 20,
    height: 20,
  },
});
