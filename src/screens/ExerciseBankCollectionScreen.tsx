import React, { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { fetchExerciseBankTopics, fetchExerciseBankV2Topics } from '@/src/api/exercise-bank';
import { AndroidNeoShadowLayer } from '@/src/components/ui/AndroidNeoShadowLayer';
import { AppText } from '@/src/components/ui/AppText';
import { Card } from '@/src/components/ui/Card';
import { LanguageToggle } from '@/src/components/ui/LanguageToggle';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
import { Stack } from '@/src/components/ui/Stack';
import { StandardPageHeader } from '@/src/components/ui/StandardPageHeader';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { useAppSession } from '@/src/context/app-session-context';
import { getExerciseBankCollection } from '@/src/lib/exercise-bank-collections';
import { theme } from '@/src/theme/theme';
import { ExerciseBankTopic } from '@/src/types/exercise-bank';

const TOPIC_CARD_RADIUS = 16;
type TenseFilter = 'past_tense' | 'present_tense' | 'future_tense';

const TENSE_FILTERS: TenseFilter[] = ['past_tense', 'present_tense', 'future_tense'];

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
        complete: 'ชุดสำเร็จ',
        newContent: 'เนื้อหาใหม่',
        tenseFilters: {
          past_tense: 'อดีตกาล',
          present_tense: 'ปัจจุบันกาล',
          future_tense: 'อนาคตกาล',
        },
      }
    : {
        pageTitle: 'Pick a topic',
        back: 'Back',
        loadingError: 'Failed to load exercise topics.',
        emptyTitle: 'No topics yet',
        emptyBody: 'There are no exercise topics in this collection yet.',
        missingCollection: 'Exercise collection not found.',
        complete: 'sets complete',
        newContent: 'new content',
        tenseFilters: {
          past_tense: 'Past Tense',
          present_tense: 'Present Tense',
          future_tense: 'Future Tense',
        },
      };

export function ExerciseBankCollectionScreen() {
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();
  const { hasAccount, hasMembership } = useAppSession();
  const copy = getCopy(uiLanguage);
  const params = useLocalSearchParams<{
    collectionSlug?: string | string[];
    search?: string | string[];
  }>();
  const collectionSlug = getParam(params.collectionSlug);
  const searchTerm = getParam(params.search).trim();
  const collection = getExerciseBankCollection(collectionSlug);
  const [topics, setTopics] = useState<ExerciseBankTopic[]>([]);
  const [tenseFilter, setTenseFilter] = useState<TenseFilter>('present_tense');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
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
        const filters =
          collection.slug === 'featured'
            ? { featuredOnly: true }
            : { category: collection.category ?? undefined };
        const rows = hasAccount
          ? await fetchExerciseBankV2Topics(filters)
          : await fetchExerciseBankTopics(filters);
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
  }, [collection, copy.loadingError, copy.missingCollection, hasAccount]));

  const handleTopicPress = (topic: ExerciseBankTopic) => {
    if (!hasAccount) {
      router.push('/account/auth');
      return;
    }
    if (!hasMembership && !topic.is_featured) {
      router.push({
        pathname: '/(tabs)/account/membership',
        params: { returnTo: `/(tabs)/resources/exercise-bank/${collectionSlug}` },
      });
      return;
    }
    router.push({
      pathname: '/(tabs)/resources/exercise-bank/topic/[topicId]',
      params: { topicId: String(topic.id) },
    });
  };

  const visibleTopics = useMemo(() => {
    const collectionTopics = collection?.category === 'verbs_and_tenses'
      ? topics.filter((topic) => topic.sub_category === tenseFilter)
      : topics;
    if (!searchTerm) return collectionTopics;

    const normalizedSearch = searchTerm.toLocaleLowerCase(uiLanguage === 'th' ? 'th' : 'en');
    return collectionTopics.filter((topic) =>
      [topic.topic, topic.display_title]
        .join(' ')
        .toLocaleLowerCase(uiLanguage === 'th' ? 'th' : 'en')
        .includes(normalizedSearch)
    );
  }, [collection?.category, searchTerm, tenseFilter, topics, uiLanguage]);

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

            {collection?.category === 'verbs_and_tenses' ? (
              <View accessibilityRole="tablist" style={styles.tenseFilterRow}>
                {TENSE_FILTERS.map((filter) => {
                  const isSelected = tenseFilter === filter;
                  return (
                    <Pressable
                      key={filter}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: isSelected }}
                      style={[styles.tenseFilterButton, isSelected ? styles.tenseFilterButtonActive : null]}
                      onPress={() => setTenseFilter(filter)}>
                      <AppText
                        language={uiLanguage}
                        variant="body"
                        style={[styles.tenseFilterText, isSelected ? styles.tenseFilterTextActive : null]}>
                        {copy.tenseFilters[filter]}
                      </AppText>
                    </Pressable>
                  );
                })}
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
                    style={styles.topicCardWrap}
                    onPress={() => handleTopicPress(topic)}>
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
                      {topic.progress ? (
                        <View style={styles.progressBlock}>
                          <View style={styles.progressCopyRow}>
                            <AppText language={uiLanguage} variant="caption" style={styles.progressCopy}>
                              {`${topic.progress.completed_sets}/${topic.progress.total_sets} ${copy.complete}`}
                            </AppText>
                            {topic.progress.has_new_content ? (
                              <AppText language={uiLanguage} variant="caption" style={styles.newContentBadge}>
                                {copy.newContent}
                              </AppText>
                            ) : null}
                          </View>
                          <View style={styles.progressTrack}>
                            <View
                              style={[
                                styles.progressFill,
                                {
                                  width: `${topic.progress.total_sets > 0
                                    ? (topic.progress.completed_sets / topic.progress.total_sets) * 100
                                    : 0}%`,
                                },
                              ]}
                            />
                          </View>
                        </View>
                      ) : null}
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
  tenseFilterRow: {
    width: '100%',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  tenseFilterButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.25,
    borderColor: '#C8C8C8',
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
  },
  tenseFilterButtonActive: {
    borderColor: '#6A6A6A',
    backgroundColor: '#F0F0F0',
  },
  tenseFilterText: {
    color: '#6A6A6A',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: theme.typography.weights.regular,
  },
  tenseFilterTextActive: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
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
  progressBlock: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  progressCopyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  progressCopy: {
    color: theme.colors.mutedText,
    fontSize: 12,
  },
  newContentBadge: {
    overflow: 'hidden',
    borderRadius: theme.radii.xl,
    backgroundColor: '#FFD66B',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
  },
  progressTrack: {
    height: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xl,
    backgroundColor: '#EEEEEE',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
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
