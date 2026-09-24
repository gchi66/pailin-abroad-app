import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { fetchTopicDetail } from '@/src/api/topic-library';
import { ResourcePageHeader } from '@/src/components/resources/ResourcePageHeader';
import { FLOATING_TAB_BAR_PAGE_BOTTOM_PADDING } from '@/src/components/navigation/layout';
import { TopicRichContent } from '@/src/components/topic/TopicRichContent';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { Stack } from '@/src/components/ui/Stack';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';
import { TopicDetail } from '@/src/types/topic-library';

type ContentLanguage = 'en' | 'th';
type UiLanguage = 'en' | 'th';

type TopicDetailCopy = {
  backLabel: string;
  loadingBody: string;
  notFoundTitle: string;
  notFoundBody: string;
  retry: string;
  emptyBody: string;
  translating: string;
};

const getCopy = (uiLanguage: UiLanguage): TopicDetailCopy => {
  if (uiLanguage === 'th') {
    return {
      backLabel: 'กลับไปคลังหัวข้อ',
      loadingBody: 'กำลังโหลดหัวข้อ...',
      notFoundTitle: 'ไม่พบหัวข้อ',
      notFoundBody: 'ไม่สามารถโหลดหัวข้อนี้ได้ในตอนนี้',
      retry: 'ลองอีกครั้ง',
      emptyBody: 'หัวข้อนี้ยังไม่มีเนื้อหา',
      translating: 'กำลังแปล...',
    };
  }

  return {
    backLabel: 'Back to Topic Library',
    loadingBody: 'Loading topic...',
    notFoundTitle: 'Topic not found',
    notFoundBody: 'We could not load this topic right now.',
    retry: 'Try again',
    emptyBody: 'This topic does not have content yet.',
    translating: 'Translating...',
  };
};

export function TopicDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slug?: string | string[]; returnTo?: string | string[] }>();
  const slugParam = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const slug = typeof slugParam === 'string' ? slugParam : '';
  const returnToParam = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const returnTo = typeof returnToParam === 'string' && returnToParam.trim() ? returnToParam : null;
  const { uiLanguage } = useUiLanguage();
  const copy = getCopy(uiLanguage);
  const backLabel = returnTo ? (uiLanguage === 'th' ? 'กลับ' : 'Back') : copy.backLabel;
  const [contentLang, setContentLang] = useState<ContentLanguage>('en');
  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefetching, setIsRefetching] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const hasLoadedRef = useRef(false);
  const contentToggleLabel = contentLang === 'th' ? 'Translate to English' : 'Translate to Thai';
  const contentToggleText = contentLang === 'th' ? 'EN' : 'TH';

  useEffect(() => {
    let isMounted = true;
    const firstLoad = !hasLoadedRef.current;

    const run = async () => {
      if (firstLoad) {
        setIsLoading(true);
      } else {
        setIsRefetching(true);
      }

      setErrorMessage(null);

      try {
        const nextTopic = await fetchTopicDetail({ slug, language: contentLang });
        if (isMounted) {
          setTopic(nextTopic);
          hasLoadedRef.current = true;
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : copy.notFoundBody);
          if (firstLoad) {
            setTopic(null);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsRefetching(false);
        }
      }
    };

    if (slug) {
      void run();
    } else {
      setIsLoading(false);
      setErrorMessage(copy.notFoundBody);
    }

    return () => {
      isMounted = false;
    };
  }, [contentLang, copy.notFoundBody, reloadKey, slug]);

  const topicName = topic?.name?.trim() || copy.notFoundTitle;

  if (isLoading) {
    return <PageLoadingState language={uiLanguage} />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <View style={styles.topRowWrap}>
        <ResponsivePageShell>
          <View style={styles.topRowShell}>
            <ResourcePageHeader
              language={uiLanguage}
              title={topicName}
              subtitle={topic?.subtitle ?? undefined}
              backLabel={backLabel}
              onBackPress={() => router.push((returnTo || '/(tabs)/resources/topic-library') as never)}
              rightElement={<Pressable
                accessibilityRole="button"
                accessibilityLabel={contentToggleLabel}
                disabled={isRefetching}
                onPress={() => setContentLang((previous) => (previous === 'en' ? 'th' : 'en'))}
                style={[styles.translatePill, isRefetching ? styles.translatePillDisabled : null]}>
                <View style={styles.translatePillLabel}>
                  <AppText language="en" variant="caption" style={styles.translatePillText}>
                    {contentToggleText}
                  </AppText>
                </View>
              </Pressable>}
            />
          </View>
        </ResponsivePageShell>
      </View>

      <ResponsivePageShell>
        <Stack gap="md">
          <View style={styles.contentWrap}>
            <Stack gap="md">
              {!topic ? (
                <Card padding="lg" radius="lg" style={styles.stateCard}>
                  <Stack gap="sm">
                    <AppText language={uiLanguage} variant="body" style={styles.stateTitle}>
                      {copy.notFoundTitle}
                    </AppText>
                    <AppText language={uiLanguage} variant="muted" style={styles.stateText}>
                      {errorMessage || copy.notFoundBody}
                    </AppText>
                    <Button language={uiLanguage} title={copy.retry} onPress={() => setReloadKey((current) => current + 1)} />
                  </Stack>
                </Card>
              ) : null}

              {topic ? (
                <View style={styles.topicContentBlock}>
                  {topic.tags.length > 0 || isRefetching ? <View style={styles.heroSection}>
                    <Stack gap="sm">
                      {topic.tags.length > 0 ? (
                        <View style={styles.tagRow}>
                          {topic.tags.map((tag) => (
                            <View key={`${topic.id}-${tag}`} style={styles.tagChip}>
                              <AppText language={uiLanguage} variant="caption" style={styles.tagText}>
                                {tag}
                              </AppText>
                            </View>
                          ))}
                        </View>
                      ) : null}

                      {isRefetching ? (
                        <AppText language={uiLanguage} variant="muted" style={styles.translatingText}>
                          {copy.translating}
                        </AppText>
                      ) : null}
                    </Stack>
                  </View> : null}

                  {Array.isArray(topic.content_jsonb) && topic.content_jsonb.length > 0 ? (
                    <TopicRichContent contentLang={contentLang} nodes={topic.content_jsonb} />
                  ) : (
                    <Card padding="lg" radius="lg" style={styles.stateCard}>
                      <AppText language={uiLanguage} variant="muted" style={styles.stateText}>
                        {copy.emptyBody}
                      </AppText>
                    </Card>
                  )}
                </View>
              ) : null}
            </Stack>
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
    paddingBottom: FLOATING_TAB_BAR_PAGE_BOTTOM_PADDING,
  },
  contentWrap: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  topRowShell: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  topRowWrap: {
    backgroundColor: theme.colors.background,
  },
  centerState: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  stateCard: {
    backgroundColor: theme.colors.surface,
  },
  stateTitle: {
    fontWeight: theme.typography.weights.semibold,
  },
  stateText: {
    color: theme.colors.mutedText,
  },
  heroSection: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#D9D9D9',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  topicContentBlock: {
    gap: 0,
  },
  translatePill: {
    minWidth: 60,
    minHeight: 26,
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  translatePillDisabled: {
    opacity: 0.7,
  },
  translatePillLabel: {
    minWidth: 28,
    minHeight: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  translatePillText: {
    color: theme.colors.text,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: theme.typography.weights.medium,
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  tagChip: {
    borderRadius: theme.radii.xl,
    backgroundColor: '#F0F0F0',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  tagText: {
    color: '#666666',
  },
  translatingText: {
    color: theme.colors.mutedText,
  },
});
