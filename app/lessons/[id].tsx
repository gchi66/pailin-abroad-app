import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { getLessonById } from '@/src/api/lessons';
import { AppText } from '@/src/components/ui/AppText';
import { Card } from '@/src/components/ui/Card';
import { Stack } from '@/src/components/ui/Stack';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';
import { LessonListItem } from '@/src/types/lesson';

export default function LessonDetailShellScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const lessonId = typeof params.id === 'string' ? params.id : '';
  const { uiLanguage } = useUiLanguage();

  const [lesson, setLesson] = useState<LessonListItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!lessonId) {
        setErrorMessage(uiLanguage === 'th' ? 'ไม่พบ lesson id' : 'Missing lesson id.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const row = await getLessonById(lessonId);
        if (!isMounted) {
          return;
        }
        if (!row) {
          setErrorMessage(uiLanguage === 'th' ? 'ไม่พบบทเรียน' : 'Lesson not found.');
        } else {
          setLesson(row);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }
        const message = error instanceof Error ? error.message : 'Failed to load lesson.';
        setErrorMessage(message);
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
  }, [lessonId, uiLanguage]);

  const resolvedTitle = useMemo(() => {
    if (!lesson) return null;
    return uiLanguage === 'th' ? lesson.title_th || lesson.title : lesson.title || lesson.title_th;
  }, [lesson, uiLanguage]);

  const resolvedSubtitle = useMemo(() => {
    if (!lesson) return null;
    return uiLanguage === 'th' ? lesson.subtitle_th || lesson.subtitle : lesson.subtitle || lesson.subtitle_th;
  }, [lesson, uiLanguage]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <Stack gap="md">
        {isLoading ? (
          <View style={styles.loadingWrap}>
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

        {!isLoading && !errorMessage && lesson ? (
          <>
            <Card padding="lg" radius="lg">
              <Stack gap="sm">
                <AppText language={uiLanguage} variant="caption" style={styles.metaText}>
                  {uiLanguage === 'th' ? 'บทเรียน' : 'Lesson'} {lesson.lesson_order ?? '-'}
                </AppText>
                <AppText language={uiLanguage} variant="title" style={styles.title}>
                  {resolvedTitle ?? (uiLanguage === 'th' ? 'ไม่มีชื่อบทเรียน' : 'Untitled lesson')}
                </AppText>
                {resolvedSubtitle ? (
                  <AppText language={uiLanguage} variant="muted">
                    {resolvedSubtitle}
                  </AppText>
                ) : null}
              </Stack>
            </Card>

            <Card padding="md" radius="md">
              <Stack gap="sm">
                <AppText language={uiLanguage} variant="body" style={styles.sectionTitle}>
                  {uiLanguage === 'th' ? 'Lesson Shell' : 'Lesson Shell'}
                </AppText>
                <AppText language={uiLanguage} variant="muted">
                  {uiLanguage === 'th'
                    ? 'หน้ารายละเอียดบทเรียนเชื่อม Supabase แล้ว ขั้นต่อไปคือดึง resolved payload และพอร์ต section renderer แบบ native'
                    : 'Supabase lesson detail is connected. Next step is resolved payload fetch and native section rendering.'}
                </AppText>
              </Stack>
            </Card>
          </>
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
  loadingWrap: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: theme.colors.primary,
  },
  metaText: {
    color: theme.colors.mutedText,
    fontWeight: theme.typography.weights.semibold,
    textTransform: 'uppercase',
  },
  title: {
    color: theme.colors.text,
  },
  sectionTitle: {
    fontWeight: theme.typography.weights.semibold,
  },
});
