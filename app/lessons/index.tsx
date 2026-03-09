import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { getLessonsIndex } from '@/src/api/lessons';
import { AppText } from '@/src/components/ui/AppText';
import { Card } from '@/src/components/ui/Card';
import { Stack } from '@/src/components/ui/Stack';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';
import { LessonListItem } from '@/src/types/lesson';

type StageName = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

const STAGE_ORDER: StageName[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

const toStageLabel = (stage: StageName, uiLanguage: 'en' | 'th') => {
  if (uiLanguage === 'th') {
    if (stage === 'Beginner') return 'เริ่มต้น';
    if (stage === 'Intermediate') return 'ระดับกลาง';
    if (stage === 'Advanced') return 'ระดับสูง';
    return 'ผู้เชี่ยวชาญ';
  }
  return stage.toUpperCase();
};

const toLevelLabel = (level: number, uiLanguage: 'en' | 'th') => {
  if (uiLanguage === 'th') {
    return `เลเวล ${level}`;
  }
  return `LEVEL ${level}`;
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

export default function LessonsIndexScreen() {
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();
  const [items, setItems] = useState<LessonListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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

  const title = uiLanguage === 'th' ? 'คลังบทเรียน' : 'Lesson Library';
  const subtitle =
    uiLanguage === 'th'
      ? 'บทเรียนบทสนทนามากกว่า 150 บทเพื่อพัฒนาภาษาอังกฤษของคุณ'
      : 'Over 150 conversation-based lessons to improve your English';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <Stack gap="md">
        <View style={styles.headerBlock}>
          <Stack gap="sm">
            <AppText language={uiLanguage} variant="title" style={styles.title}>
              {title}
            </AppText>
            <AppText language={uiLanguage} variant="body" style={styles.subtitle}>
              {subtitle}
            </AppText>
          </Stack>
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

        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : null}

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
              const titleText =
                uiLanguage === 'th'
                  ? pickText(lesson.title_th, lesson.title, 'ไม่มีชื่อบทเรียน')
                  : pickText(lesson.title, lesson.title_th, 'Untitled lesson');
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
                  onPress={() => router.push(`/lessons/${lesson.id}`)}>
                  <Card padding="md" radius="md" style={styles.lessonCard}>
                    <View style={styles.lessonRow}>
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
  headerBlock: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: theme.colors.text,
    textAlign: 'center',
    fontSize: 56,
    lineHeight: 64,
  },
  subtitle: {
    color: theme.colors.mutedText,
    textAlign: 'center',
    fontSize: 20,
    lineHeight: 32,
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
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  levelButton: {
    minWidth: 102,
    minHeight: 62,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
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
    fontSize: 18,
    lineHeight: 22,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
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
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  lessonNumber: {
    width: 52,
    fontSize: 40,
    lineHeight: 42,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },
  lessonTextGroup: {
    flex: 1,
  },
  lessonTitle: {
    fontWeight: theme.typography.weights.semibold,
    fontSize: 22,
    lineHeight: 30,
  },
  lessonSubtitle: {
    marginTop: theme.spacing.xs,
    fontSize: 16,
    lineHeight: 24,
  },
  emptyStateText: {
    textAlign: 'center',
  },
});
