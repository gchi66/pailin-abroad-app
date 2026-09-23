import { ScriptAwareTextInput } from '@/src/components/ui/ScriptAwareTextInput';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { prefetchPricing } from '@/src/api/pricing';
import { fetchTopicLibraryTopics } from '@/src/api/topic-library';
import { ResourcePageHeader } from '@/src/components/resources/ResourcePageHeader';
import { ResourceUnlockCard } from '@/src/components/resources/ResourceUnlockCard';
import { AppText } from '@/src/components/ui/AppText';
import { Card } from '@/src/components/ui/Card';
import { NeoShadowPressable } from '@/src/components/ui/NeoShadowPressable';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { Stack } from '@/src/components/ui/Stack';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
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
  unlockTitle: string;
  unlockBody: string;
  unlockCta: string;
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
      title: 'คลังหัวข้อ',
      subtitle: 'คำอธิบายเพิ่มเติมเกี่ยวกับหัวข้อการใช้ภาษาอังกฤษที่น่าสนใจ',
      featuredButton: 'หัวข้อแนะนำ',
      allButton: 'ดูหัวข้อทั้งหมด',
      searchPlaceholder: 'ค้นหาหัวข้อ',
      searchLabel: 'ค้นหาหัวข้อ',
      emptyTitle: 'ยังไม่มีหัวข้อ',
      emptyBody: 'หัวข้อจะปรากฏที่นี่เมื่อมีการเพิ่มเข้าในคลัง',
      loadingErrorFallback: 'เราไม่สามารถโหลดคลังหัวข้อได้ กรุณาลองอีกครั้ง',
      untitledTopic: 'ไม่มีชื่อหัวข้อ',
      unlockTitle: 'ปลดล็อกหัวข้อทั้งหมด',
      unlockBody: 'คุณสามารถเข้าถึงหัวข้อแนะนำของเราได้\nอัปเกรดเพื่อปลดล็อกคลังหัวข้อทั้งหมด!',
      unlockCta: 'ดูแพ็กเกจ →',
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
    unlockTitle: 'UNLOCK ALL TOPICS',
    unlockBody: 'You have access to our featured topics.\nUpgrade to unlock the full Topic Library!',
    unlockCta: 'VIEW PLANS →',
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

function TopicCardSkeleton({ pulse }: { pulse: Animated.Value }) {
  return (
    <Animated.View style={{ opacity: pulse }}>
      <Card padding="lg" radius="lg" style={styles.topicCard}>
        <View style={styles.topicRow}>
          <View style={styles.topicCopy}>
            <View style={[styles.skeletonLine, styles.skeletonTitleLine]} />
            <View style={[styles.skeletonLine, styles.skeletonBodyLine]} />
            <View style={[styles.skeletonLine, styles.skeletonBodyLineShort]} />
            <View style={styles.skeletonTagRow}>
              <View style={[styles.skeletonChip, styles.skeletonChipWide]} />
              <View style={styles.skeletonChip} />
            </View>
          </View>

          <View style={styles.topicAside}>
            <View style={styles.skeletonArrow} />
          </View>
        </View>
      </Card>
    </Animated.View>
  );
}

export function TopicLibraryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const returnToParam = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const returnTo = typeof returnToParam === 'string' && returnToParam.trim() ? returnToParam : null;
  const { uiLanguage } = useUiLanguage();
  const { hasMembership } = useAppSession();
  const copy = getCopy(uiLanguage);
  const [topics, setTopics] = useState<TopicLibraryTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingTopics, setIsRefreshingTopics] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('featured');
  const [searchTerm, setSearchTerm] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => {
      animation.stop();
    };
  }, [pulseAnim]);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      const shouldShowLoadingState = topics.length === 0;
      if (shouldShowLoadingState) {
        setIsLoading(true);
      } else {
        setIsRefreshingTopics(true);
      }
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
          setIsRefreshingTopics(false);
        }
      }
    };

    void run();

    return () => {
      isMounted = false;
    };
  }, [copy.loadingErrorFallback, topics.length, uiLanguage]);

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

  if (isLoading && topics.length === 0) {
    return <PageLoadingState language={uiLanguage} />;
  }

  const handleTopicPress = (topic: TopicLibraryTopic) => {
    const isLocked = !hasMembership && !topic.is_featured;
    if (isLocked) {
      prefetchPricing();
      router.push({
        pathname: '/(tabs)/account/membership',
        params: { returnTo: '/(tabs)/resources/topic-library' },
      });
      return;
    }

    if (!topic.slug?.trim()) {
      Alert.alert(formatTopicTitle(topic.name) || copy.untitledTopic, copy.openTopicPlaceholder);
      return;
    }

    if (returnTo) {
      router.push(`/(tabs)/resources/topic-library/${topic.slug}?returnTo=${encodeURIComponent(returnTo)}`);
    } else {
      router.push(`/(tabs)/resources/topic-library/${topic.slug}`);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <ResponsivePageShell>
      <Stack gap="md">
        <View style={styles.pageHeader}>
          <ResourcePageHeader
            language={uiLanguage}
            title={copy.title}
            subtitle={copy.subtitle}
            onBackPress={() => router.push((returnTo || '/(tabs)/resources') as never)}
          />
        </View>

        <View style={styles.contentWrap}>
          <Stack gap="md">
            {!hasMembership ? (
              <ResourceUnlockCard
                language={uiLanguage}
                title={copy.unlockTitle}
                body={copy.unlockBody}
                italicWord={uiLanguage === 'en' ? 'full' : undefined}
                buttonLabel={copy.unlockCta}
                onPress={() => {
                  prefetchPricing();
                  router.push({
                    pathname: '/(tabs)/account/membership',
                    params: { returnTo: '/(tabs)/resources/topic-library' },
                  });
                }}
              />
            ) : null}

            <View style={styles.toolbarShell}>
              <View style={styles.filterRow}>
                <NeoShadowPressable
                  accessibilityRole="button"
                  style={[styles.filterButton, filterMode === 'featured' ? styles.filterButtonActive : null]}
                  onPress={() => setFilterMode('featured')}>
                  <AppText
                    language={uiLanguage}
                    variant="caption"
                    style={[styles.filterButtonText, filterMode === 'featured' ? styles.filterButtonTextActive : null]}>
                    {copy.featuredButton}
                  </AppText>
                </NeoShadowPressable>

                <NeoShadowPressable
                  accessibilityRole="button"
                  style={[styles.filterButton, filterMode === 'all' ? styles.filterButtonActive : null]}
                  onPress={() => setFilterMode('all')}>
                  <AppText
                    language={uiLanguage}
                    variant="caption"
                    style={[styles.filterButtonText, filterMode === 'all' ? styles.filterButtonTextActive : null]}>
                    {copy.allButton}
                  </AppText>
                </NeoShadowPressable>
              </View>

              <View style={styles.searchShell}>
                <ScriptAwareTextInput
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

            <Stack gap="sm">
              {isRefreshingTopics ? (
                <>
                  <TopicCardSkeleton pulse={pulseAnim} />
                  <TopicCardSkeleton pulse={pulseAnim} />
                  <TopicCardSkeleton pulse={pulseAnim} />
                </>
              ) : visibleTopics.length > 0 ? (
                visibleTopics.map((topic) => {
                  const isLocked = !hasMembership && !topic.is_featured;
                  const topicCopy = (
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
                  );
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
                        {isLocked ? (
                          <View style={styles.lockedCardRow}>
                            <View style={styles.lockedCardCopy}>
                              {topicCopy}
                              <AppText language={uiLanguage} variant="muted" style={styles.lockedBody}>
                                {copy.lockedBody}
                              </AppText>
                            </View>
                            <View style={styles.lockBlock}>
                              <MaterialIcons name="lock-outline" size={24} color="#666666" />
                            </View>
                          </View>
                        ) : (
                          <View style={styles.topicRow}>
                            {topicCopy}
                            <View style={styles.topicAside}>
                              <AppText language="en" variant="body" style={styles.topicArrow}>
                                ▸
                              </AppText>
                            </View>
                          </View>
                        )}
                      </Card>
                    </Pressable>
                  );
                })
              ) : !errorMessage ? (
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
              ) : null}
            </Stack>
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
    paddingBottom: theme.spacing.xl * 2,
  },
  pageHeader: {
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  contentWrap: {
    paddingHorizontal: theme.spacing.md,
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
    boxShadow: '1.75px 1.75px 0px #132042',
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
    height: 24,
    paddingLeft: 0,
    paddingRight: theme.spacing.sm,
    paddingVertical: 0,
    marginTop: 0,
    color: theme.colors.text,
    fontSize: theme.typography.sizes.md,
    lineHeight: 20,
    textAlignVertical: 'center',
  },
  searchInputEnglish: {
    fontFamily: theme.typography.fontFaces.en.regular,
  },
  searchInputThai: {
    fontFamily: theme.typography.fontFaces.th.regular,
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
    position: 'relative',
    backgroundColor: theme.colors.surface,
    boxShadow: `2px 2px 0px ${theme.colors.shadow}`,
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
  lockedCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  lockedCardCopy: {
    flex: 1,
    minWidth: 0,
  },
  lockBlock: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicArrow: {
    fontSize: 24,
    lineHeight: 28,
  },
  skeletonLine: {
    borderRadius: 999,
    backgroundColor: '#D7E6F7',
  },
  skeletonTitleLine: {
    width: '74%',
    height: 20,
    marginBottom: theme.spacing.sm,
  },
  skeletonBodyLine: {
    width: '92%',
    height: 12,
    marginBottom: theme.spacing.xs,
  },
  skeletonBodyLineShort: {
    width: '64%',
    height: 12,
    marginBottom: theme.spacing.md,
  },
  skeletonTagRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  skeletonChip: {
    width: 72,
    height: 24,
    borderRadius: theme.radii.xl,
    backgroundColor: '#E8F1FB',
  },
  skeletonChipWide: {
    width: 104,
  },
  skeletonArrow: {
    width: 14,
    height: 20,
    borderRadius: 6,
    backgroundColor: '#D7E6F7',
    marginTop: 2,
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
