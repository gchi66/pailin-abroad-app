import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { prefetchPricing } from '@/src/api/pricing';
import { fetchTopicLibraryTopics } from '@/src/api/topic-library';
import { StandardPageHeader } from '@/src/components/ui/StandardPageHeader';
import { AppText } from '@/src/components/ui/AppText';
import { Card } from '@/src/components/ui/Card';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { Stack } from '@/src/components/ui/Stack';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';
import { TopicLibraryTopic } from '@/src/types/topic-library';

type FilterMode = 'featured' | 'all';
type UiLanguage = 'en' | 'th';

type TopicLibraryCopy = {
  title: string;
  subtitle: string;
  featuredButton: string;
  allButton: string;
  searchPlaceholder: string;
  searchLabel: string;
  emptyTitle: string;
  emptyBody: string;
  loadingErrorFallback: string;
  untitledTopic: string;
  freeTitle: string;
  freeDesc: string;
  freeCta: string;
  lockedLabel: string;
  lockedBody: string;
  openTopicPlaceholder: string;
};

const MINOR_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'but',
  'by',
  'for',
  'in',
  'nor',
  'of',
  'on',
  'or',
  'per',
  'the',
  'to',
  'vs',
  'via',
]);

const getCopy = (uiLanguage: UiLanguage): TopicLibraryCopy => {
  if (uiLanguage === 'th') {
    return {
      title: 'คลังหัวข้อการเรียนรู้',
      subtitle: 'คำอธิบายเพิ่มเติมเกี่ยวกับหัวข้อการใช้ภาษาอังกฤษที่น่าสนใจ',
      featuredButton: 'แนะนำ',
      allButton: 'ทั้งหมด',
      searchPlaceholder: 'ค้นหาหัวข้อ',
      searchLabel: 'ค้นหาหัวข้อ',
      emptyTitle: 'ไม่พบหัวข้อที่ตรงกัน',
      emptyBody: 'ลองล้างคำค้นหาหรือเปลี่ยนตัวกรองแล้วค้นหาอีกครั้ง',
      loadingErrorFallback: 'ไม่สามารถโหลดหัวข้อได้',
      untitledTopic: 'ไม่มีชื่อหัวข้อ',
      freeTitle: 'แพ็กเกจฟรี',
      freeDesc: 'หัวข้อแนะนำยังอ่านได้ อัปเกรดเพื่อเปิดทั้งคลัง',
      freeCta: 'อัปเกรด',
      lockedLabel: 'สมาชิก',
      lockedBody: 'อัปเกรดเพื่อปลดล็อกหัวข้อนี้',
      openTopicPlaceholder: 'หน้ารายละเอียดหัวข้อจะเชื่อมในขั้นตอนถัดไป',
    };
  }

  return {
    title: 'Topic Library',
    subtitle: 'Further explanations on a range of interesting ESL topics',
    featuredButton: 'Featured',
    allButton: 'All',
    searchPlaceholder: 'Search topics',
    searchLabel: 'Search topics',
    emptyTitle: 'No topics found',
    emptyBody: 'Try clearing your search or switching the active filter.',
    loadingErrorFallback: 'Failed to load topics.',
    untitledTopic: 'Untitled topic',
    freeTitle: 'Free plan',
    freeDesc: 'Featured topics stay open. Upgrade for the full library.',
    freeCta: 'Upgrade',
    lockedLabel: 'Members',
    lockedBody: 'Upgrade to unlock this topic',
    openTopicPlaceholder: 'Topic detail will be connected in the next step.',
  };
};

const formatTopicTitle = (title = '') => {
  if (!title) return '';
  const words = title.trim().split(/\s+/);
  return words
    .map((word, index) => {
      const leading = word.match(/^[^A-Za-z0-9]*/)?.[0] ?? '';
      const trailing = word.match(/[^A-Za-z0-9]*$/)?.[0] ?? '';
      const core = word.slice(leading.length, word.length - trailing.length);
      if (!core) {
        return word;
      }

      const lowerCore = core.toLowerCase();
      const shouldCapitalize = index === 0 || index === words.length - 1 || !MINOR_WORDS.has(lowerCore);
      const capitalizeSegment = (segment: string) => (segment ? segment[0].toUpperCase() + segment.slice(1) : segment);
      const formattedCore = shouldCapitalize
        ? lowerCore
            .split('-')
            .map((segment) => capitalizeSegment(segment))
            .join('-')
        : lowerCore;

      return `${leading}${formattedCore}${trailing}`;
    })
    .join(' ');
};

export function TopicLibraryScreen() {
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();
  const { hasMembership } = useAppSession();
  const copy = getCopy(uiLanguage);
  const [topics, setTopics] = useState<TopicLibraryTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('featured');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const rows = await fetchTopicLibraryTopics({ language: uiLanguage });
        if (isMounted) {
          setTopics(rows);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : copy.loadingErrorFallback);
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
  }, [copy.loadingErrorFallback, uiLanguage]);

  const visibleTopics = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return topics
      .filter((topic) => (filterMode === 'featured' ? topic.is_featured : true))
      .filter((topic) => {
        if (!normalizedSearch) {
          return true;
        }

        const haystack = [topic.name || '', topic.subtitle || '', ...(Array.isArray(topic.tags) ? topic.tags : [])]
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalizedSearch);
      });
  }, [filterMode, searchTerm, topics]);

  if (isLoading) {
    return <PageLoadingState language={uiLanguage} />;
  }

  const handleTopicPress = (topic: TopicLibraryTopic) => {
    const isLocked = !hasMembership && !topic.is_featured;
    if (isLocked) {
      prefetchPricing();
      router.push('/(tabs)/account/membership');
      return;
    }

    if (!topic.slug?.trim()) {
      Alert.alert(formatTopicTitle(topic.name) || copy.untitledTopic, copy.openTopicPlaceholder);
      return;
    }

    router.push(`/(tabs)/resources/topic-library/${topic.slug}`);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <Stack gap="md">
        <StandardPageHeader language={uiLanguage} title={copy.title} />

        <View style={styles.contentWrap}>
          <Stack gap="md">
            {!hasMembership ? (
              <Card padding="lg" radius="lg" style={styles.noticeCard}>
                <View style={styles.noticeRow}>
                  <View style={styles.noticeCopy}>
                    <AppText language={uiLanguage} variant="body" style={styles.noticeTitle}>
                      {copy.freeTitle}
                    </AppText>
                    <AppText language={uiLanguage} variant="muted" style={styles.noticeBody}>
                      {copy.freeDesc}
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
                      {copy.freeCta}
                    </AppText>
                  </Pressable>
                </View>
              </Card>
            ) : null}

            <View style={styles.toolbarShell}>
              <View style={styles.filterRow}>
                <Pressable
                  accessibilityRole="button"
                  style={[styles.filterButton, filterMode === 'featured' ? styles.filterButtonActive : null]}
                  onPress={() => setFilterMode('featured')}>
                  <AppText
                    language={uiLanguage}
                    variant="caption"
                    style={[styles.filterButtonText, filterMode === 'featured' ? styles.filterButtonTextActive : null]}>
                    {copy.featuredButton}
                  </AppText>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  style={[styles.filterButton, filterMode === 'all' ? styles.filterButtonActive : null]}
                  onPress={() => setFilterMode('all')}>
                  <AppText
                    language={uiLanguage}
                    variant="caption"
                    style={[styles.filterButtonText, filterMode === 'all' ? styles.filterButtonTextActive : null]}>
                    {copy.allButton}
                  </AppText>
                </Pressable>
              </View>

              <View style={styles.searchShell}>
                <TextInput
                  accessibilityLabel={copy.searchLabel}
                  autoCapitalize="none"
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                  placeholder={copy.searchPlaceholder}
                  placeholderTextColor={theme.colors.mutedText}
                  style={[styles.searchInput, uiLanguage === 'th' ? styles.searchInputThai : styles.searchInputEnglish]}
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                />
                <View pointerEvents="none" style={styles.searchIconWrap}>
                  <AppText language="en" variant="caption" style={styles.searchIcon}>
                    ⌕
                  </AppText>
                </View>
              </View>
            </View>

            {errorMessage ? (
              <Card padding="md" radius="md" style={styles.errorCard}>
                <AppText language={uiLanguage} variant="body" style={styles.errorText}>
                  {errorMessage}
                </AppText>
              </Card>
            ) : null}

            {!errorMessage ? (
              <Stack gap="sm">
                {visibleTopics.length > 0 ? (
                  visibleTopics.map((topic) => {
                    const isLocked = !hasMembership && !topic.is_featured;
                    return (
                      <Pressable
                        key={topic.id}
                        accessibilityRole="button"
                        style={styles.topicPressable}
                        onPress={() => handleTopicPress(topic)}>
                        <Card
                          padding="lg"
                          radius="lg"
                          style={[
                            styles.topicCard,
                            isLocked ? styles.topicCardLocked : null,
                            isLocked ? styles.topicCardLockedAccent : null,
                          ]}>
                          <View style={styles.topicRow}>
                            <View style={styles.topicCopy}>
                              <AppText language={uiLanguage} variant="body" style={styles.topicTitle}>
                                {formatTopicTitle(topic.name) || copy.untitledTopic}
                              </AppText>
                              {topic.subtitle ? (
                                <AppText language={uiLanguage} variant="muted" style={styles.topicSubtitle}>
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
                            </View>

                            <View style={styles.topicAside}>
                              {isLocked ? (
                                <View style={styles.lockBadge}>
                                  <AppText language={uiLanguage} variant="caption" style={styles.lockBadgeText}>
                                    {copy.lockedLabel}
                                  </AppText>
                                </View>
                              ) : null}
                              <AppText language="en" variant="body" style={styles.topicArrow}>
                                ▸
                              </AppText>
                            </View>
                          </View>

                          {isLocked ? (
                            <AppText language={uiLanguage} variant="muted" style={styles.lockedBody}>
                              {copy.lockedBody}
                            </AppText>
                          ) : null}
                        </Card>
                      </Pressable>
                    );
                  })
                ) : (
                  <Card padding="lg" radius="lg" style={styles.emptyCard}>
                    <Stack gap="xs">
                      <AppText language={uiLanguage} variant="body" style={styles.emptyTitle}>
                        {copy.emptyTitle}
                      </AppText>
                      <AppText language={uiLanguage} variant="muted" style={styles.emptyBody}>
                        {copy.emptyBody}
                      </AppText>
                    </Stack>
                  </Card>
                )}
              </Stack>
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
  toolbarShell: {
    gap: theme.spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  filterButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: '#132042',
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    shadowColor: '#132042',
    shadowOffset: { width: 1.75, height: 1.75 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  filterButtonActive: {
    backgroundColor: '#8EC5FF',
    borderColor: '#132042',
  },
  filterButtonText: {
    color: '#132042',
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 0.2,
  },
  filterButtonTextActive: {
    color: '#132042',
  },
  searchShell: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: '#132042',
    backgroundColor: theme.colors.surface,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.md,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    alignSelf: 'center',
    height: 22,
    paddingLeft: 0,
    paddingRight: theme.spacing.sm,
    paddingVertical: 0,
    marginTop: 1,
    color: theme.colors.text,
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.sizes.md,
  },
  searchInputEnglish: {
    fontFamily: theme.typography.fonts.en,
  },
  searchInputThai: {
    fontFamily: theme.typography.fonts.th,
  },
  searchIconWrap: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIcon: {
    color: '#132042',
    fontSize: 28,
    lineHeight: 28,
  },
  centerState: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCard: {
    backgroundColor: theme.colors.surface,
  },
  errorText: {
    color: theme.colors.text,
  },
  topicPressable: {
    width: '100%',
  },
  topicCard: {
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  topicCardLocked: {
    backgroundColor: '#F7F7F7',
  },
  topicCardLockedAccent: {
    borderColor: '#9D9D9D',
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  topicCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  topicTitle: {
    fontWeight: theme.typography.weights.semibold,
  },
  topicSubtitle: {
    color: theme.colors.mutedText,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
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
  topicAside: {
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
  },
  lockBadge: {
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#FFF4E8',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  lockBadgeText: {
    fontWeight: theme.typography.weights.semibold,
  },
  topicArrow: {
    fontSize: 24,
    lineHeight: 28,
  },
  lockedBody: {
    marginTop: theme.spacing.sm,
    color: '#666666',
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
  },
  emptyTitle: {
    fontWeight: theme.typography.weights.semibold,
  },
  emptyBody: {
    color: theme.colors.mutedText,
  },
});
