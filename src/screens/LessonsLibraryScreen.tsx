import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import blueCheckmarkImage from '@/assets/images/blue-checkmark.webp';
import blueCompletedCheckImage from '@/assets/images/check_circle_blue.webp';
import { AppLessonProgressSummary } from '@/src/api/app-lesson-progress';
import { getLessonsIndex, prefetchResolvedLesson } from '@/src/api/lessons';
import { prefetchPricing } from '@/src/api/pricing';
import { LessonProgressCircle } from '@/src/components/lesson/LessonProgressCircle';
import { AppText } from '@/src/components/ui/AppText';
import { AndroidNeoShadowLayer } from '@/src/components/ui/AndroidNeoShadowLayer';
import { Card } from '@/src/components/ui/Card';
import { NeoShadowPressable } from '@/src/components/ui/NeoShadowPressable';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { Stack } from '@/src/components/ui/Stack';
import { StandardPageHeader } from '@/src/components/ui/StandardPageHeader';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import {
  clearLessonLibraryAnchor,
  getLessonLibraryProgressRefreshToken,
  getLessonLibrarySelection,
  hydrateLessonLibrarySelection,
  setLessonLibrarySelection,
} from '@/src/lib/lesson-library-selection';
import { loadLessonProgressSummariesProgressively } from '@/src/lib/lesson-library-progress';
import { theme } from '@/src/theme/theme';
import { LessonListItem } from '@/src/types/lesson';

type StageName = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

const STAGE_ORDER: StageName[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const toStageLabel = (stage: StageName, uiLanguage: 'en' | 'th') => {
  if (uiLanguage === 'th') {
    if (stage === 'Beginner') return 'ระดับเริ่มต้น';
    if (stage === 'Intermediate') return 'ระดับกลาง';
    if (stage === 'Advanced') return 'ระดับสูง';
    return 'ระดับเชี่ยวชาญ';
  }
  return stage.toUpperCase();
};

const toLevelLabel = (level: number, uiLanguage: 'en' | 'th') => {
  if (uiLanguage === 'th') {
    return `ระดับที่ ${level}`;
  }
  return `LEVEL ${level}`;
};

const isCheckpointLesson = (lesson: LessonListItem) =>
  [lesson.title, lesson.title_th].some((value) => String(value ?? '').toLowerCase().includes('checkpoint'));

const getCheckpointTitle = (lesson: LessonListItem, uiLanguage: 'en' | 'th', fallback: string) => {
  if (typeof lesson.level !== 'number') {
    return fallback;
  }

  if (uiLanguage === 'th') {
    return `ระดับที่ ${lesson.level} จุดตรวจสอบ`;
  }

  return `Level ${lesson.level} Checkpoint`;
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

const splitLessonFocusText = (focusText: string) => {
  const trimmed = focusText.trim();
  const match = /^(.*?)(\s*\([^)]+\))$/.exec(trimmed);

  if (!match) {
    return { main: trimmed, aside: '' };
  }

  return {
    main: match[1]?.trim() ?? trimmed,
    aside: match[2]?.trim() ?? '',
  };
};

export function LessonsLibraryScreen() {
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();
  const { hasMembership } = useAppSession();
  const initialSelection = getLessonLibrarySelection();
  const [items, setItems] = useState<LessonListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progressByLesson, setProgressByLesson] = useState<Record<string, AppLessonProgressSummary>>({});
  const [progressRefreshToken, setProgressRefreshToken] = useState(() => getLessonLibraryProgressRefreshToken());
  const [isStageMenuOpen, setIsStageMenuOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<StageName>(initialSelection.stage);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(initialSelection.level);
  const [pendingLessonId, setPendingLessonId] = useState<string | null>(initialSelection.lessonId ?? null);
  const [hasHydratedSelection, setHasHydratedSelection] = useState(false);
  const progressRequestIdRef = useRef(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const lessonOffsetByIdRef = useRef<Record<string, number>>({});

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

    run();

    return () => {
      isMounted = false;
    };
  }, []);

  const levelsByStage = useMemo(() => {
    const map = new Map<StageName, number[]>();
    STAGE_ORDER.forEach((stage) => map.set(stage, []));

    items.forEach((lesson) => {
      if (!lesson.stage || typeof lesson.level !== 'number') {
        return;
      }
      if (!STAGE_ORDER.includes(lesson.stage as StageName)) {
        return;
      }
      const stage = lesson.stage as StageName;
      const existingLevels = map.get(stage) ?? [];
      if (!existingLevels.includes(lesson.level)) {
        existingLevels.push(lesson.level);
      }
      map.set(stage, existingLevels);
    });

    STAGE_ORDER.forEach((stage) => {
      const sorted = [...(map.get(stage) ?? [])].sort((a, b) => a - b);
      map.set(stage, sorted);
    });

    return map;
  }, [items]);

  const availableStages = useMemo(() => {
    const stagesWithData = STAGE_ORDER.filter((stage) => (levelsByStage.get(stage)?.length ?? 0) > 0);
    return stagesWithData.length > 0 ? stagesWithData : STAGE_ORDER;
  }, [levelsByStage]);

  const levelsForSelectedStage = useMemo(() => {
    return levelsByStage.get(selectedStage) ?? [];
  }, [levelsByStage, selectedStage]);

  useEffect(() => {
    if (availableStages.includes(selectedStage)) {
      return;
    }
    setSelectedStage(availableStages[0] ?? 'Beginner');
  }, [availableStages, selectedStage]);

  useEffect(() => {
    if (levelsForSelectedStage.length === 0) {
      setSelectedLevel(null);
      return;
    }
    if (selectedLevel && levelsForSelectedStage.includes(selectedLevel)) {
      return;
    }
    setSelectedLevel(levelsForSelectedStage[0]);
  }, [levelsForSelectedStage, selectedLevel]);

  useEffect(() => {
    if (!hasHydratedSelection) {
      return;
    }

    setLessonLibrarySelection({
      stage: selectedStage,
      level: selectedLevel,
    });
  }, [hasHydratedSelection, selectedLevel, selectedStage]);

  const lessonsForSelection = useMemo(() => {
    if (selectedLevel === null) {
      return [];
    }

    return items
      .filter((lesson) => lesson.stage === selectedStage && lesson.level === selectedLevel)
      .sort((a, b) => {
        const aOrder = typeof a.lesson_order === 'number' ? a.lesson_order : Number.MAX_SAFE_INTEGER;
        const bOrder = typeof b.lesson_order === 'number' ? b.lesson_order : Number.MAX_SAFE_INTEGER;
        return aOrder - bOrder;
      });
  }, [items, selectedLevel, selectedStage]);

  const visibleLessonIds = useMemo(
    () => lessonsForSelection.map((lesson) => lesson.id).filter(Boolean),
    [lessonsForSelection]
  );

  const tryRestoreLessonScroll = React.useCallback(
    (lessonId: string | null) => {
      if (!lessonId || !lessonsForSelection.some((lesson) => lesson.id === lessonId)) {
        return false;
      }

      const y = lessonOffsetByIdRef.current[lessonId];
      if (typeof y !== 'number') {
        return false;
      }

      scrollViewRef.current?.scrollTo({
        y: Math.max(y - theme.spacing.lg, 0),
        animated: false,
      });
      setPendingLessonId(null);
      clearLessonLibraryAnchor();
      return true;
    },
    [lessonsForSelection]
  );

  const refreshProgressSummaries = React.useCallback(async () => {
    if (!hasMembership || !visibleLessonIds.length) {
      setProgressByLesson({});
      return;
    }

    const requestId = progressRequestIdRef.current + 1;
    progressRequestIdRef.current = requestId;

    await loadLessonProgressSummariesProgressively({
      lessonIds: visibleLessonIds,
      isCancelled: () => progressRequestIdRef.current !== requestId,
      onPartial: (summaries) => {
        console.info('[app-progress] lesson library summary ok', {
          lessonCount: Object.keys(summaries).length,
          requestedLessonCount: 1,
        });
        setProgressByLesson((prev) => ({
          ...prev,
          ...summaries,
        }));
      },
      onError: (error) => {
        console.warn('[app-progress] lesson library summaries fetch failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          requestedLessonCount: visibleLessonIds.length,
        });
        if (progressRequestIdRef.current === requestId) {
          setProgressByLesson({});
        }
      },
    });
  }, [hasMembership, visibleLessonIds]);

  useFocusEffect(
    React.useCallback(() => {
      const selection = getLessonLibrarySelection();
      setSelectedStage(selection.stage);
      setSelectedLevel(selection.level);
      setPendingLessonId(selection.lessonId ?? null);
      setProgressRefreshToken(getLessonLibraryProgressRefreshToken());
      setHasHydratedSelection(false);

      void hydrateLessonLibrarySelection().then((storedSelection) => {
        setSelectedStage(storedSelection.stage);
        setSelectedLevel(storedSelection.level);
        setPendingLessonId((currentPendingLessonId) => currentPendingLessonId ?? storedSelection.lessonId ?? null);
        setHasHydratedSelection(true);
      });
    }, [])
  );

  useEffect(() => {
    void refreshProgressSummaries();
  }, [progressRefreshToken, refreshProgressSummaries]);

  useEffect(() => {
    if (!pendingLessonId) {
      return;
    }

    const frameId = requestAnimationFrame(() => {
      tryRestoreLessonScroll(pendingLessonId);
    });

    return () => cancelAnimationFrame(frameId);
  }, [pendingLessonId, tryRestoreLessonScroll]);

  if (isLoading) {
    return <PageLoadingState language={uiLanguage} />;
  }

  const title = uiLanguage === 'th' ? 'คลังบทเรียน' : 'Lesson Library';
  const upgradeCopy =
    uiLanguage === 'th'
      ? {
          title: 'ปลดล็อกทุกบทเรียน',
          body: 'แพ็กเกจฟรียังเรียนบทแรกของแต่ละเลเวลได้ อัปเกรดเพื่อเข้าใช้คลังทั้งหมด',
          cta: 'อัปเกรด',
        }
      : {
          title: 'Unlock every lesson',
          body: 'Your free plan includes the first lesson of each level. Upgrade for full library access.',
          cta: 'Upgrade',
        };
  const prefetchLesson = (lessonId: string) => {
    prefetchResolvedLesson(lessonId, 'en');
  };

  return (
    <ScrollView ref={scrollViewRef} style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <ResponsivePageShell>
        <Stack gap="md">
        <StandardPageHeader language={uiLanguage} title={title} />

        {!hasMembership ? (
          <View style={styles.noticeWrap}>
            <Card padding="lg" radius="lg" style={styles.noticeCard}>
              <View style={styles.noticeRow}>
                <View style={styles.noticeCopy}>
                  <AppText language={uiLanguage} variant="body" style={styles.noticeTitle}>
                    {upgradeCopy.title}
                  </AppText>
                  <AppText language={uiLanguage} variant="muted" style={styles.noticeBody}>
                    {upgradeCopy.body}
                  </AppText>
                </View>
                <NeoShadowPressable
                  accessibilityRole="button"
                  style={styles.noticeButton}
                  onPress={() => {
                    prefetchPricing();
                    router.push('/(tabs)/account/membership');
                  }}>
                  <AppText language={uiLanguage} variant="caption" style={styles.noticeButtonText}>
                    {upgradeCopy.cta}
                  </AppText>
                </NeoShadowPressable>
              </View>
            </Card>
          </View>
        ) : null}

        <Stack gap="sm">
          <View style={styles.stageSelector}>
            <View style={styles.stageButtonWrap}>
              <AndroidNeoShadowLayer borderRadius={theme.radii.md} color={theme.colors.border} offset={2} />
              <Pressable
                accessibilityRole="button"
                style={styles.stageButton}
                onPress={() => setIsStageMenuOpen((prev) => !prev)}>
                <AppText language={uiLanguage} variant="body" style={styles.stageButtonText}>
                  {toStageLabel(selectedStage, uiLanguage)}
                </AppText>
                <AppText language={uiLanguage} variant="body" style={styles.stageButtonText}>
                  ▾
                </AppText>
              </Pressable>
            </View>
            {isStageMenuOpen ? (
              <View style={styles.stageMenu}>
                {availableStages.map((stage) => (
                  <Pressable
                    key={`stage-${stage}`}
                    accessibilityRole="button"
                    style={[styles.stageMenuItem, selectedStage === stage ? styles.stageMenuItemActive : null]}
                    onPress={() => {
                      setSelectedStage(stage);
                      setIsStageMenuOpen(false);
                    }}>
                    <AppText language={uiLanguage} variant="body" style={styles.stageMenuItemText}>
                      {toStageLabel(stage, uiLanguage)}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.levelRow}>
            {levelsForSelectedStage.map((level) => (
              <View key={`level-${level}`} style={styles.levelButtonWrap}>
                <AndroidNeoShadowLayer borderRadius={theme.radii.md} color={theme.colors.border} offset={2} />
                <Pressable
                  accessibilityRole="button"
                  style={[styles.levelButton, selectedLevel === level ? styles.levelButtonActive : null]}
                  onPress={() => {
                    if (selectedLevel !== level) {
                      setIsStageMenuOpen(false);
                    }
                    setSelectedLevel(level);
                  }}>
                  <AppText
                    language={uiLanguage}
                    variant="body"
                    style={[styles.levelButtonText, selectedLevel === level ? styles.levelButtonTextActive : null]}>
                    {toLevelLabel(level, uiLanguage)}
                  </AppText>
                </Pressable>
              </View>
            ))}
          </View>
        </Stack>

        {!isLoading && errorMessage ? (
          <Card padding="md" radius="md">
            <AppText language={uiLanguage} variant="body" style={styles.errorText}>
              {errorMessage}
            </AppText>
          </Card>
        ) : null}

        {!isLoading && !errorMessage ? (
          <Stack gap="sm">
            {lessonsForSelection.map((lesson) => {
              const baseTitleText =
                uiLanguage === 'th'
                  ? pickText(lesson.title_th, lesson.title, 'ไม่มีชื่อบทเรียน')
                  : pickText(lesson.title, lesson.title_th, 'Untitled lesson');
              const titleText = isCheckpointLesson(lesson)
                ? getCheckpointTitle(lesson, uiLanguage, baseTitleText)
                : baseTitleText;
              const focusText =
                uiLanguage === 'th'
                  ? pickText(lesson.focus_th, lesson.focus, '')
                  : pickText(lesson.focus, lesson.focus_th, '');
              const focusParts = splitLessonFocusText(focusText);
              const isCheckpoint = isCheckpointLesson(lesson);
              const lessonNumber =
                typeof lesson.level === 'number'
                  ? isCheckpoint
                    ? `${lesson.level}.chp`
                    : typeof lesson.lesson_order === 'number'
                      ? `${lesson.level}.${lesson.lesson_order}`
                      : '-'
                  : '-';
              const progress = progressByLesson[lesson.id];

              return (
                <Pressable
                  key={lesson.id}
                  accessibilityRole="button"
                  style={styles.itemPressable}
                  onLayout={(event) => {
                    lessonOffsetByIdRef.current[lesson.id] = event.nativeEvent.layout.y;
                    if (pendingLessonId === lesson.id) {
                      requestAnimationFrame(() => {
                        tryRestoreLessonScroll(lesson.id);
                      });
                    }
                  }}
                  onPressIn={() => prefetchLesson(lesson.id)}
                  onPress={() => {
                    setLessonLibrarySelection({
                      stage: selectedStage,
                      level: selectedLevel,
                      lessonId: lesson.id,
                      route: 'library',
                    });
                    router.push({
                      pathname: '/lessons/[id]',
                      params: {
                        id: lesson.id,
                        libraryRoute: 'library',
                      },
                    });
                  }}>
                  <Card padding="md" radius="md" style={styles.lessonCard}>
                    <View style={styles.lessonRow}>
                      <View style={styles.lessonLeft}>
                        {isCheckpoint ? (
                          <Image
                            source={blueCheckmarkImage}
                            style={styles.lessonNumberCheckmark}
                            resizeMode="contain"
                          />
                        ) : (
                          <AppText language={uiLanguage} variant="body" style={styles.lessonNumber}>
                            {lessonNumber}
                          </AppText>
                        )}
                        <View style={styles.lessonTextGroup}>
                          <AppText language={uiLanguage} variant="body" style={styles.lessonTitle}>
                            {titleText}
                          </AppText>
                          {focusText ? (
                            <View style={styles.lessonSubtitleGroup}>
                              {focusParts.main ? (
                                <AppText language={uiLanguage} variant="muted" style={styles.lessonSubtitle}>
                                  {focusParts.main}
                                </AppText>
                              ) : null}
                              {focusParts.aside ? (
                                <AppText language={uiLanguage} variant="muted" style={styles.lessonSubtitleAside}>
                                  {focusParts.aside}
                                </AppText>
                              ) : null}
                            </View>
                          ) : null}
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
                  </Card>
                </Pressable>
              );
            })}
            {selectedLevel !== null && lessonsForSelection.length === 0 ? (
              <Card padding="md" radius="md">
                <AppText language={uiLanguage} variant="muted" style={styles.emptyStateText}>
                  {uiLanguage === 'th' ? 'ยังไม่มีบทเรียนในเลเวลนี้' : 'No lessons in this level yet.'}
                </AppText>
              </Card>
            ) : null}
          </Stack>
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
  noticeWrap: {
    paddingHorizontal: theme.spacing.md,
  },
  noticeCard: {
    backgroundColor: '#FFF4E8',
  },
  noticeRow: {
    gap: theme.spacing.md,
  },
  noticeCopy: {
    gap: theme.spacing.xs,
  },
  noticeTitle: {
    fontWeight: theme.typography.weights.semibold,
  },
  noticeBody: {
    color: theme.colors.mutedText,
  },
  noticeButton: {
    minHeight: 44,
    width: '100%',
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  noticeButtonText: {
    color: theme.colors.surface,
    fontWeight: theme.typography.weights.bold,
  },
  stageSelector: {
    paddingHorizontal: theme.spacing.md,
  },
  stageButtonWrap: {
    position: 'relative',
  },
  stageButton: {
    minHeight: 62,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#91CAFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.border,
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 0,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  stageButtonText: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  stageMenu: {
    marginTop: theme.spacing.sm,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  stageMenuItem: {
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#E5E5E5',
  },
  stageMenuItemActive: {
    backgroundColor: '#91CAFF',
  },
  stageMenuItemText: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: theme.typography.weights.semibold,
  },
  levelRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'space-between',
    rowGap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  levelButtonWrap: {
    position: 'relative',
    width: '22%',
    minWidth: 74,
  },
  levelButton: {
    width: '100%',
    minHeight: 56,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xs,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.border,
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 0,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  levelButtonActive: {
    backgroundColor: '#91CAFF',
  },
  levelButtonText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    textAlign: 'center',
  },
  levelButtonTextActive: {
    fontWeight: theme.typography.weights.bold,
  },
  centerState: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  errorText: {
    color: theme.colors.primary,
  },
  itemPressable: {
    width: '100%',
    paddingHorizontal: theme.spacing.md,
  },
  lessonCard: {
    width: '100%',
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
  },
  lessonRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  lessonLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  lessonNumber: {
    minWidth: 36,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },
  lessonNumberCheckmark: {
    width: 22,
    height: 22,
    marginLeft: 6,
    marginRight: 8,
  },
  lessonTextGroup: {
    flex: 1,
    gap: 2,
  },
  lessonTitle: {
    fontWeight: theme.typography.weights.semibold,
  },
  lessonSubtitleGroup: {
    gap: 1,
  },
  lessonSubtitle: {
    color: theme.colors.mutedText,
  },
  lessonSubtitleAside: {
    color: '#8C8D93',
    marginTop: 2,
    fontSize: 12,
    lineHeight: 15,
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
  emptyStateText: {
    textAlign: 'center',
  },
});
