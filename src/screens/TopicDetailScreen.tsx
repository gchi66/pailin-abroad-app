import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { fetchTopicDetail } from '@/src/api/topic-library';
import { TopicRichContent } from '@/src/components/topic/TopicRichContent';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Stack } from '@/src/components/ui/Stack';
import { StandardPageHeader } from '@/src/components/ui/StandardPageHeader';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';
import { TopicDetail } from '@/src/types/topic-library';

type ContentLanguage = 'en' | 'th';
type UiLanguage = 'en' | 'th';

type TopicDetailCopy = {
  title: string;
  subtitle: string;
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
      title: 'คลังหัวข้อการเรียนรู้',
      subtitle: 'คำอธิบายเพิ่มเติมเกี่ยวกับหัวข้อการใช้ภาษาอังกฤษที่น่าสนใจ',
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
    title: 'Topic Library',
    subtitle: 'Further explanations on a range of interesting ESL topics',
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
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slugParam = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const slug = typeof slugParam === 'string' ? slugParam : '';
  const { uiLanguage } = useUiLanguage();
  const copy = getCopy(uiLanguage);
  const [contentLang, setContentLang] = useState<ContentLanguage>('en');
  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefetching, setIsRefetching] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const hasLoadedRef = useRef(false);

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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <Stack gap="md">
        <StandardPageHeader language={uiLanguage} title={copy.title} subtitle={copy.subtitle} />

        <View style={styles.contentWrap}>
          <Stack gap="md">
            <View style={styles.topRow}>
              <Pressable accessibilityRole="button" style={styles.backButton} onPress={() => router.back()}>
                <AppText language={uiLanguage} variant="caption" style={styles.backButtonText}>
                  ← {copy.backLabel}
                </AppText>
              </Pressable>

              <View style={styles.languageToggle}>
                <Pressable
                  accessibilityRole="button"
                  style={[styles.languageButton, contentLang === 'th' ? styles.languageButtonActive : null]}
                  onPress={() => setContentLang('th')}>
                  <AppText
                    language="en"
                    variant="caption"
                    style={[styles.languageButtonText, contentLang === 'th' ? styles.languageButtonTextActive : null]}>
                    TH
                  </AppText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  style={[styles.languageButton, contentLang === 'en' ? styles.languageButtonActive : null]}
                  onPress={() => setContentLang('en')}>
                  <AppText
                    language="en"
                    variant="caption"
                    style={[styles.languageButtonText, contentLang === 'en' ? styles.languageButtonTextActive : null]}>
                    EN
                  </AppText>
                </Pressable>
              </View>
            </View>

            {isLoading ? (
              <View style={styles.centerState}>
                <ActivityIndicator color={theme.colors.accent} />
                <AppText language={uiLanguage} variant="muted" style={styles.stateText}>
                  {copy.loadingBody}
                </AppText>
              </View>
            ) : null}

            {!isLoading && !topic ? (
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

            {!isLoading && topic ? (
              <>
                <View style={styles.heroSection}>
                  <Stack gap="sm">
                    <AppText language={uiLanguage} variant="title" style={styles.heroTitle}>
                      {topicName}
                    </AppText>

                    {topic.subtitle ? (
                      <AppText language={uiLanguage} variant="body" style={styles.heroSubtitle}>
                        {topic.subtitle}
                      </AppText>
                    ) : null}

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
                </View>

                {Array.isArray(topic.content_jsonb) && topic.content_jsonb.length > 0 ? (
                  <TopicRichContent contentLang={contentLang} nodes={topic.content_jsonb} />
                ) : (
                  <Card padding="lg" radius="lg" style={styles.stateCard}>
                    <AppText language={uiLanguage} variant="muted" style={styles.stateText}>
                      {copy.emptyBody}
                    </AppText>
                  </Card>
                )}
              </>
            ) : null}
          </Stack>
        </View>
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
    paddingBottom: theme.spacing.xl * 2,
  },
  contentWrap: {
    paddingHorizontal: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    minHeight: 36,
    paddingHorizontal: theme.spacing.md,
  },
  backButton: {
    flex: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  backButtonText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semibold,
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
  heroTitle: {
    fontSize: theme.typography.sizes.lg,
    lineHeight: 36,
  },
  heroSubtitle: {
    color: theme.colors.mutedText,
  },
  languageToggle: {
    flexDirection: 'row',
    gap: 4,
  },
  languageButton: {
    minWidth: 56,
    minHeight: 36,
    borderRadius: theme.radii.xl,
    paddingHorizontal: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageButtonActive: {
    backgroundColor: '#91CAFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  languageButtonText: {
    color: theme.colors.mutedText,
    fontWeight: theme.typography.weights.semibold,
  },
  languageButtonTextActive: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
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
