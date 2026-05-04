import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import checkCircleImage from '@/assets/images/CheckCircle.png';
import blueCompletedCheckImage from '@/assets/images/check_circle_blue.webp';
import lockImage from '@/assets/images/lock.webp';
import { getLessonsIndex } from '@/src/api/lessons';
import { prefetchPricing } from '@/src/api/pricing';
import { fetchUserCompletedLessons } from '@/src/api/user';
import { StandardPageHeader } from '@/src/components/ui/StandardPageHeader';
import { AppText } from '@/src/components/ui/AppText';
import { Card } from '@/src/components/ui/Card';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { Stack } from '@/src/components/ui/Stack';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
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

export function GuestLessonLibraryScreen() {
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();
  const { hasAccount } = useAppSession();
  const [items, setItems] = useState<LessonListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  const [isStageMenuOpen, setIsStageMenuOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<StageName>('Beginner');
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

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

  useEffect(() => {
    if (!hasAccount) {
      setCompletedLessonIds(new Set());
      return;
    }

    let isMounted = true;

    const run = async () => {
      try {
        const completedLessons = await fetchUserCompletedLessons();
        if (!isMounted) {
          return;
        }

        setCompletedLessonIds(
          new Set(
            completedLessons
              .filter((entry) => entry.is_completed !== false)
              .map((entry) => entry.lesson_id)
              .filter((lessonId): lessonId is string => Boolean(lessonId))
          )
        );
      } catch {
        if (isMounted) {
          setCompletedLessonIds(new Set());
        }
      }
    };

    void run();

    return () => {
      isMounted = false;
    };
  }, [hasAccount]);

  const freeLessonIds = useMemo(() => {
    const firstByLevel = new Map<string, string>();

    [...items]
      .filter((lesson) => lesson.stage && typeof lesson.level === 'number')
      .sort((a, b) => {
        if (a.stage !== b.stage) {
          return String(a.stage ?? '').localeCompare(String(b.stage ?? ''));
        }
        const levelOrder = (a.level ?? 0) - (b.level ?? 0);
        if (levelOrder !== 0) {
          return levelOrder;
        }
        return (a.lesson_order ?? Number.MAX_SAFE_INTEGER) - (b.lesson_order ?? Number.MAX_SAFE_INTEGER);
      })
      .forEach((lesson) => {
        if (!lesson.id || !lesson.stage || typeof lesson.level !== 'number') {
          return;
        }

        const key = `${lesson.stage}-${lesson.level}`;
        if (!firstByLevel.has(key)) {
          firstByLevel.set(key, lesson.id);
        }
      });

    return new Set(firstByLevel.values());
  }, [items]);

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

  if (isLoading) {
    return <PageLoadingState language={uiLanguage} />;
  }

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

  const handleLessonPress = (lesson: LessonListItem) => {
    const isLocked = !freeLessonIds.has(lesson.id);
    router.push({
      pathname: '/lessons/[id]',
      params: {
        id: lesson.id,
        locked: isLocked ? '1' : '0',
      },
    });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <Stack gap="md">
        <View style={styles.headerWrap}>
          <StandardPageHeader
            language={uiLanguage}
            title={uiLanguage === 'th' ? 'คลังบทเรียน' : 'Lesson Library'}
            subtitle={
              uiLanguage === 'th'
                ? 'ดูบทเรียนทั้งหมดได้ตามปกติ และแตะบทเรียนที่ล็อกไว้เพื่อพรีวิวหน้าปกก่อนอัปเกรด'
                : 'Browse the full lesson library and tap locked lessons to preview the cover before upgrading.'
            }
          />
        </View>

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
              <Pressable
                accessibilityRole="button"
                style={styles.noticeButton}
                onPress={() => {
                  prefetchPricing();
                  router.push('/(tabs)/account/membership');
                }}>
                <AppText language={uiLanguage} variant="caption" style={styles.noticeButtonText}>
                  {upgradeCopy.cta}
                </AppText>
              </Pressable>
            </View>
          </Card>
        </View>

        <Stack gap="sm">
          <View style={styles.stageSelector}>
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
              <Pressable
                key={`level-${level}`}
                accessibilityRole="button"
                style={[styles.levelButton, selectedLevel === level ? styles.levelButtonActive : null]}
                onPress={() => setSelectedLevel(level)}>
                <AppText
                  language={uiLanguage}
                  variant="body"
                  style={[styles.levelButtonText, selectedLevel === level ? styles.levelButtonTextActive : null]}>
                  {toLevelLabel(level, uiLanguage)}
                </AppText>
              </Pressable>
            ))}
          </View>
        </Stack>

        {errorMessage ? (
          <Card padding="md" radius="md">
            <AppText language={uiLanguage} variant="body" style={styles.errorText}>
              {errorMessage}
            </AppText>
          </Card>
        ) : null}

        {!errorMessage ? (
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
              const lessonNumber =
                typeof lesson.level === 'number' && typeof lesson.lesson_order === 'number'
                  ? `${lesson.level}.${lesson.lesson_order}`
                  : '-';

              return (
                <Pressable
                  key={lesson.id}
                  accessibilityRole="button"
                  style={styles.itemPressable}
                  onPress={() => handleLessonPress(lesson)}>
                  <Card padding="md" radius="md" style={styles.lessonCard}>
                    <View style={styles.lessonRow}>
                      <View style={styles.lessonLeft}>
                        <AppText language={uiLanguage} variant="body" style={styles.lessonNumber}>
                          {lessonNumber}
                        </AppText>
                        <View style={styles.lessonTextGroup}>
                          <AppText language={uiLanguage} variant="body" style={styles.lessonTitle}>
                            {titleText}
                          </AppText>
                          {focusText ? (
                            <AppText language={uiLanguage} variant="muted" style={styles.lessonSubtitle}>
                              {focusText}
                            </AppText>
                          ) : null}
                        </View>
                      </View>

                      <View style={styles.lessonRight}>
                        {(() => {
                          const isFreeLesson = freeLessonIds.has(lesson.id);
                          const isCompleted = completedLessonIds.has(lesson.id);
                          const statusImage = !isFreeLesson
                            ? lockImage
                            : isCompleted
                              ? blueCompletedCheckImage
                              : checkCircleImage;

                          return (
                        <Image
                          source={statusImage}
                          style={styles.statusIcon}
                          resizeMode="contain"
                        />
                          );
                        })()}
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
  headerWrap: {
    marginTop: theme.spacing.sm,
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
    marginTop: theme.spacing.sm,
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
    shadowColor: theme.colors.border,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
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
  levelButton: {
    width: '22%',
    minWidth: 74,
    minHeight: 56,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xs,
    shadowColor: theme.colors.border,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
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
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  lessonNumber: {
    minWidth: 36,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },
  lessonTextGroup: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  lessonTitle: {
    fontWeight: theme.typography.weights.semibold,
    flexShrink: 1,
  },
  lessonSubtitle: {
    color: theme.colors.mutedText,
    flexShrink: 1,
  },
  lessonRight: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statusIcon: {
    width: 22,
    height: 22,
  },
  emptyStateText: {
    textAlign: 'center',
  },
});
