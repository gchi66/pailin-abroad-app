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

type GroupedLessons = {
  groupKey: string;
  groupLabel: string;
  items: LessonListItem[];
};

const toGroupKey = (stage: string | null, level: number | null) => {
  const safeStage = stage ?? 'Unknown';
  const safeLevel = typeof level === 'number' ? String(level) : 'NA';
  return `${safeStage}|${safeLevel}`;
};

const toGroupLabel = (stage: string | null, level: number | null) => {
  const safeStage = stage ?? 'Unknown Stage';
  const safeLevel = typeof level === 'number' ? `Level ${level}` : 'No Level';
  return `${safeStage} · ${safeLevel}`;
};

export default function LessonsIndexScreen() {
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();
  const [items, setItems] = useState<LessonListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const groupedLessons = useMemo<GroupedLessons[]>(() => {
    const groups = new Map<string, GroupedLessons>();

    items.forEach((lesson) => {
      const groupKey = toGroupKey(lesson.stage, lesson.level);
      const existing = groups.get(groupKey);
      if (existing) {
        existing.items.push(lesson);
        return;
      }
      groups.set(groupKey, {
        groupKey,
        groupLabel: toGroupLabel(lesson.stage, lesson.level),
        items: [lesson],
      });
    });

    return Array.from(groups.values());
  }, [items]);

  const title = uiLanguage === 'th' ? 'คลังบทเรียน' : 'Lesson Library';
  const subtitle =
    uiLanguage === 'th'
      ? 'เลือกบทเรียนเพื่อเริ่มดูหน้าเนื้อหา'
      : 'Select a lesson to open the lesson screen shell.';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <Stack gap="lg">
        <Stack gap="xs">
          <AppText language={uiLanguage} variant="title" style={styles.title}>
            {title}
          </AppText>
          <AppText language={uiLanguage} variant="muted">
            {subtitle}
          </AppText>
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
          <Stack gap="lg">
            {groupedLessons.map((group) => (
              <Stack key={group.groupKey} gap="sm">
                <AppText language={uiLanguage} variant="caption" style={styles.groupLabel}>
                  {group.groupLabel}
                </AppText>
                <Stack gap="sm">
                  {group.items.map((lesson) => {
                    const titleText = uiLanguage === 'th' ? lesson.title_th || lesson.title : lesson.title || lesson.title_th;
                    const subtitleText =
                      uiLanguage === 'th' ? lesson.subtitle_th || lesson.subtitle : lesson.subtitle || lesson.subtitle_th;

                    return (
                      <Pressable
                        key={lesson.id}
                        accessibilityRole="button"
                        style={styles.itemPressable}
                        onPress={() => router.push(`/lessons/${lesson.id}`)}>
                        <Card padding="md" radius="md" style={styles.lessonCard}>
                          <Stack gap="xs">
                            <AppText language={uiLanguage} variant="caption" style={styles.lessonMeta}>
                              {uiLanguage === 'th' ? 'บทเรียน' : 'Lesson'} {lesson.lesson_order ?? '-'}
                            </AppText>
                            <AppText language={uiLanguage} variant="body" style={styles.lessonTitle}>
                              {titleText ?? (uiLanguage === 'th' ? 'ไม่มีชื่อบทเรียน' : 'Untitled lesson')}
                            </AppText>
                            {subtitleText ? (
                              <AppText language={uiLanguage} variant="muted">
                                {subtitleText}
                              </AppText>
                            ) : null}
                          </Stack>
                        </Card>
                      </Pressable>
                    );
                  })}
                </Stack>
              </Stack>
            ))}
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
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  title: {
    color: theme.colors.text,
  },
  centerState: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: theme.colors.primary,
  },
  groupLabel: {
    color: theme.colors.mutedText,
    fontWeight: theme.typography.weights.semibold,
  },
  itemPressable: {
    width: '100%',
  },
  lessonCard: {
    width: '100%',
  },
  lessonMeta: {
    color: theme.colors.mutedText,
    textTransform: 'uppercase',
  },
  lessonTitle: {
    fontWeight: theme.typography.weights.semibold,
  },
});
