import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { fetchExerciseBankTopics } from '@/src/api/exercise-bank';
import { AndroidNeoShadowLayer } from '@/src/components/ui/AndroidNeoShadowLayer';
import { AppText } from '@/src/components/ui/AppText';
import { Card } from '@/src/components/ui/Card';
import { LanguageToggle } from '@/src/components/ui/LanguageToggle';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
import { Stack } from '@/src/components/ui/Stack';
import { StandardPageHeader } from '@/src/components/ui/StandardPageHeader';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { getExerciseBankCollection } from '@/src/lib/exercise-bank-collections';
import { theme } from '@/src/theme/theme';
import { ExerciseBankTopic } from '@/src/types/exercise-bank';

const TOPIC_CARD_RADIUS = 16;

const getParam = (value?: string | string[]) => (Array.isArray(value) ? value[0] ?? '' : value ?? '');

const getCopy = (language: 'en' | 'th') =>
  language === 'th'
    ? {
        pageTitle: 'เลือกหัวข้อ',
        back: 'กลับ',
        loadingError: 'ไม่สามารถโหลดหัวข้อแบบฝึกหัดได้',
        emptyTitle: 'ยังไม่มีหัวข้อ',
        emptyBody: 'ยังไม่มีหัวข้อแบบฝึกหัดในหมวดหมู่นี้',
        missingCollection: 'ไม่พบหมวดหมู่แบบฝึกหัดนี้',
      }
    : {
        pageTitle: 'Pick a topic',
        back: 'Back',
        loadingError: 'Failed to load exercise topics.',
        emptyTitle: 'No topics yet',
        emptyBody: 'There are no exercise topics in this collection yet.',
        missingCollection: 'Exercise collection not found.',
      };

export function ExerciseBankCollectionScreen() {
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();
  const copy = getCopy(uiLanguage);
  const params = useLocalSearchParams<{
    collectionSlug?: string | string[];
    search?: string | string[];
  }>();
  const collectionSlug = getParam(params.collectionSlug);
  const searchTerm = getParam(params.search).trim();
  const collection = getExerciseBankCollection(collectionSlug);
  const [topics, setTopics] = useState<ExerciseBankTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!collection) {
        setErrorMessage(copy.missingCollection);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      try {
        const rows = await fetchExerciseBankTopics(
          collection.slug === 'featured'
            ? { featuredOnly: true }
            : { category: collection.category ?? undefined }
        );
        if (isMounted) {
          setTopics(rows);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : copy.loadingError);
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
  }, [collection, copy.loadingError, copy.missingCollection]);

  const visibleTopics = useMemo(() => {
    if (!searchTerm) {
      return topics;
    }
    const normalizedSearch = searchTerm.toLocaleLowerCase(uiLanguage === 'th' ? 'th' : 'en');
    return topics.filter((topic) =>
      [topic.topic, topic.display_title]
        .join(' ')
        .toLocaleLowerCase(uiLanguage === 'th' ? 'th' : 'en')
        .includes(normalizedSearch)
    );
  }, [searchTerm, topics, uiLanguage]);

  if (isLoading) {
    return <PageLoadingState language={uiLanguage} />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <ResponsivePageShell>
        <Stack gap="md">
          <StandardPageHeader
            language={uiLanguage}
            title=""
            hideTitle
            bottomSpacing={14}
            onBackPress={() => router.back()}
            backLabel={copy.back}
            rightElement={<LanguageToggle compact />}
          />

          <View style={styles.contentWrap}>
            {collection ? (
              <View style={styles.pageHeading}>
                <AppText language={uiLanguage} variant="body" style={styles.collectionLabel}>
                  {collection.label[uiLanguage]}
                </AppText>
                <AppText language={uiLanguage} variant="title" style={styles.pageTitle}>
                  {copy.pageTitle}
                </AppText>
              </View>
            ) : null}

            {errorMessage ? (
              <Card padding="lg" radius="lg" style={styles.stateCard}>
                <AppText language={uiLanguage} variant="body" style={styles.stateTitle}>
                  {errorMessage}
                </AppText>
              </Card>
            ) : null}

            {!errorMessage && visibleTopics.length === 0 ? (
              <Card padding="lg" radius="lg" style={styles.stateCard}>
                <Stack gap="xs">
                  <AppText language={uiLanguage} variant="body" style={styles.stateTitle}>
                    {copy.emptyTitle}
                  </AppText>
                  <AppText language={uiLanguage} variant="muted" style={styles.stateBody}>
                    {copy.emptyBody}
                  </AppText>
                </Stack>
              </Card>
            ) : null}

            {!errorMessage && visibleTopics.length > 0 ? (
              <Stack gap="md" style={styles.topicList}>
                {visibleTopics.map((topic) => (
                  <Pressable
                    key={String(topic.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${topic.display_title}, ${topic.topic}`}
                    style={styles.topicCardWrap}>
                    <AndroidNeoShadowLayer
                      borderRadius={TOPIC_CARD_RADIUS}
                      color={theme.colors.shadow}
                      offset={2}
                    />
                    <View style={styles.topicCard}>
                      <AppText language="en" variant="body" style={styles.topicDisplayTitle}>
                        {topic.display_title}
                      </AppText>
                      <AppText language="en" variant="muted" style={styles.topicTechnicalTitle}>
                        {topic.topic}
                      </AppText>
                    </View>
                  </Pressable>
                ))}
              </Stack>
            ) : null}
          </View>
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
    paddingBottom: theme.spacing.xl * 2,
  },
  contentWrap: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xs,
    gap: theme.spacing.lg,
  },
  pageHeading: {
    width: '100%',
    gap: 10,
  },
  collectionLabel: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: theme.typography.weights.regular,
  },
  pageTitle: {
    textAlign: 'left',
    color: theme.colors.text,
    fontSize: 27,
    lineHeight: 31,
    fontWeight: '800',
  },
  topicCardWrap: {
    position: 'relative',
    width: '100%',
  },
  topicList: {
    width: '100%',
    gap: 12,
  },
  topicCard: {
    minHeight: 88,
    borderRadius: TOPIC_CARD_RADIUS,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    justifyContent: 'center',
    gap: theme.spacing.xs,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 2, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 0,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  topicDisplayTitle: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: theme.typography.weights.bold,
  },
  topicTechnicalTitle: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18,
  },
  stateCard: {
    backgroundColor: theme.colors.surface,
  },
  stateTitle: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semibold,
  },
  stateBody: {
    color: theme.colors.mutedText,
  },
});
