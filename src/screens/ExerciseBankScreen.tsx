import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { fetchExerciseBankTopics } from '@/src/api/exercise-bank';
import { prefetchPricing } from '@/src/api/pricing';
import { AndroidNeoShadowLayer } from '@/src/components/ui/AndroidNeoShadowLayer';
import { AppText } from '@/src/components/ui/AppText';
import { Card } from '@/src/components/ui/Card';
import { NeoShadowPressable } from '@/src/components/ui/NeoShadowPressable';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
import { Stack } from '@/src/components/ui/Stack';
import { StandardPageHeader } from '@/src/components/ui/StandardPageHeader';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import {
  EXERCISE_BANK_COLLECTIONS,
  ExerciseBankCollectionDefinition,
} from '@/src/lib/exercise-bank-collections';
import { theme } from '@/src/theme/theme';
import { ExerciseBankTopic } from '@/src/types/exercise-bank';

type UiLanguage = 'en' | 'th';

type TopicCollection = ExerciseBankCollectionDefinition & {
  topicCount: number;
};

const getCopy = (language: UiLanguage) =>
  language === 'th'
    ? {
        title: 'คลังแบบฝึกหัด',
        freeTitle: 'คุณกำลังใช้งานแพ็กเกจเรียนฟรี',
        freeBody: 'คุณสามารถเข้าถึงหัวข้อแนะนำทั้งหมดได้ อัปเกรดเพื่อเข้าถึงคลังทั้งหมด',
        noAccountTitle: 'ปลดล็อกคลังแบบฝึกหัด',
        noAccountBody: 'สร้างบัญชี จากนั้นอัปเกรดเพื่อเข้าถึงคลังทั้งหมด',
        membershipCta: 'อัปเกรด',
        loadingFallback: 'ไม่สามารถโหลดคลังแบบฝึกหัดได้',
        searchPlaceholder: 'ค้นหาหัวข้อแบบฝึกหัด',
        searchLabel: 'ค้นหาหัวข้อแบบฝึกหัด',
        emptyTitle: 'ยังไม่มีหัวข้อแบบฝึกหัด',
        emptyBody: 'หัวข้อจะปรากฏที่นี่เมื่อเพิ่มลงในคลังแบบฝึกหัด',
        noResultsTitle: 'ไม่พบหัวข้อที่ตรงกัน',
        noResultsBody: 'ลองใช้คำค้นหาอื่น',
        topicSingle: 'หัวข้อ',
        topicPlural: 'หัวข้อ',
      }
    : {
        title: 'Exercise Bank',
        freeTitle: 'Free plan',
        freeBody: 'You can access all featured topics. Upgrade to access the full bank.',
        noAccountTitle: 'Unlock the exercise bank',
        noAccountBody: 'Create an account, then upgrade for full access.',
        membershipCta: 'Upgrade',
        loadingFallback: 'Failed to load the exercise bank.',
        searchPlaceholder: 'Search exercise topics',
        searchLabel: 'Search exercise topics',
        emptyTitle: 'No exercise topics yet',
        emptyBody: 'Topics will appear here when they are added to the exercise bank.',
        noResultsTitle: 'No matching topics',
        noResultsBody: 'Try a different search.',
        topicSingle: 'topic',
        topicPlural: 'topics',
      };

export function ExerciseBankScreen() {
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();
  const { hasAccount, hasMembership } = useAppSession();
  const copy = getCopy(uiLanguage);
  const [topics, setTopics] = useState<ExerciseBankTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const rows = await fetchExerciseBankTopics();
        if (isMounted) {
          setTopics(rows);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : copy.loadingFallback);
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
  }, [copy.loadingFallback]);

  const collections = useMemo<TopicCollection[]>(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase(uiLanguage === 'th' ? 'th' : 'en');

    return EXERCISE_BANK_COLLECTIONS.map((collection) => {
      const collectionTopics =
        collection.slug === 'featured'
          ? topics.filter((topic) => topic.is_featured)
          : topics.filter((topic) => topic.category === collection.category);

      if (!normalizedSearch) {
        return { ...collection, topicCount: collectionTopics.length };
      }

      const labelMatches = collection.label[uiLanguage].toLocaleLowerCase(uiLanguage === 'th' ? 'th' : 'en').includes(normalizedSearch);
      const matchingTopics = collectionTopics.filter((topic) =>
        [topic.topic, topic.display_title]
          .join(' ')
          .toLocaleLowerCase(uiLanguage === 'th' ? 'th' : 'en')
          .includes(normalizedSearch)
      );

      return {
        ...collection,
        topicCount: labelMatches ? collectionTopics.length : matchingTopics.length,
      };
    }).filter((collection) => collection.topicCount > 0);
  }, [searchTerm, topics, uiLanguage]);

  const handleCollectionPress = (collection: TopicCollection) => {
    router.push({
      pathname: '/(tabs)/resources/exercise-bank/[collectionSlug]',
      params: {
        collectionSlug: collection.slug,
        title: collection.label[uiLanguage],
        search: searchTerm.trim(),
      },
    });
  };

  if (isLoading) {
    return <PageLoadingState language={uiLanguage} />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <ResponsivePageShell>
        <Stack gap="md">
          <StandardPageHeader
            language={uiLanguage}
            title={copy.title}
          />

          <View style={styles.contentWrap}>
            <Stack gap="lg">
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

              {!hasMembership ? (
                <Card padding="lg" radius="lg" style={styles.noticeCard}>
                  <View style={styles.noticeRow}>
                    <View style={styles.noticeCopy}>
                      <AppText language={uiLanguage} variant="body" style={styles.noticeTitle}>
                        {hasAccount ? copy.freeTitle : copy.noAccountTitle}
                      </AppText>
                      <AppText language={uiLanguage} variant="muted" style={styles.noticeBody}>
                        {hasAccount ? copy.freeBody : copy.noAccountBody}
                      </AppText>
                    </View>
                    <NeoShadowPressable
                      accessibilityRole="button"
                      style={styles.noticeButton}
                      onPress={() => {
                        prefetchPricing();
                        router.push({
                          pathname: '/(tabs)/account/membership',
                          params: { returnTo: '/(tabs)/resources/exercise-bank' },
                        });
                      }}>
                      <AppText language={uiLanguage} variant="caption" style={styles.noticeButtonText}>
                        {copy.membershipCta}
                      </AppText>
                    </NeoShadowPressable>
                  </View>
                </Card>
              ) : null}

              {errorMessage ? (
                <Card padding="lg" radius="lg" style={styles.stateCard}>
                  <Stack gap="xs">
                    <AppText language={uiLanguage} variant="body" style={styles.stateTitle}>
                      {copy.loadingFallback}
                    </AppText>
                    <AppText language={uiLanguage} variant="muted" style={styles.stateBody}>
                      {errorMessage}
                    </AppText>
                  </Stack>
                </Card>
              ) : null}

              {!errorMessage && topics.length === 0 ? (
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

              {!errorMessage && topics.length > 0 && collections.length === 0 ? (
                <Card padding="lg" radius="lg" style={styles.stateCard}>
                  <Stack gap="xs">
                    <AppText language={uiLanguage} variant="body" style={styles.stateTitle}>
                      {copy.noResultsTitle}
                    </AppText>
                    <AppText language={uiLanguage} variant="muted" style={styles.stateBody}>
                      {copy.noResultsBody}
                    </AppText>
                  </Stack>
                </Card>
              ) : null}

              {!errorMessage && collections.length > 0 ? (
                <View style={styles.collectionGrid}>
                  {collections.map((collection) => (
                    <Pressable
                      key={collection.slug}
                      accessibilityRole="button"
                      accessibilityLabel={`${collection.label[uiLanguage]}, ${collection.topicCount} ${
                        collection.topicCount === 1 ? copy.topicSingle : copy.topicPlural
                      }`}
                      style={styles.collectionCardWrap}
                      onPress={() => handleCollectionPress(collection)}>
                      <AndroidNeoShadowLayer borderRadius={theme.radii.lg} color={theme.colors.shadow} offset={3} />
                      <View style={styles.collectionCard}>
                        <AppText language="en" variant="body" style={styles.collectionEmoji}>
                          {collection.emoji}
                        </AppText>
                        <View style={styles.collectionCopy}>
                          <AppText
                            language={uiLanguage}
                            variant="body"
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.78}
                            style={styles.collectionTitle}>
                            {collection.label[uiLanguage]}
                          </AppText>
                          <AppText language={uiLanguage} variant="muted" style={styles.collectionCount}>
                            {`${collection.topicCount} ${
                              collection.topicCount === 1 ? copy.topicSingle : copy.topicPlural
                            }`}
                          </AppText>
                        </View>
                      </View>
                    </Pressable>
                  ))}
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
    paddingBottom: theme.spacing.xl * 2,
  },
  contentWrap: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  searchShell: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.md,
  },
  searchInput: {
    flex: 1,
    alignSelf: 'center',
    height: 24,
    paddingLeft: 0,
    paddingRight: theme.spacing.sm,
    paddingVertical: 0,
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 19,
    textAlignVertical: 'center',
  },
  searchInputEnglish: {
    fontFamily: theme.typography.fontFaces.en.regular,
  },
  searchInputThai: {
    fontFamily: theme.typography.fontFaces.th.regular,
  },
  searchIconWrap: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIcon: {
    color: theme.colors.text,
    fontSize: 25,
    lineHeight: 25,
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
  collectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: theme.spacing.lg,
  },
  collectionCardWrap: {
    position: 'relative',
    width: '47.5%',
    minHeight: 132,
  },
  collectionCard: {
    flex: 1,
    borderRadius: theme.radii.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    justifyContent: 'flex-start',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 4, height: 5 },
        shadowOpacity: 1,
        shadowRadius: 0,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  collectionEmoji: {
    fontSize: 28,
    lineHeight: 32,
  },
  collectionCopy: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  collectionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: theme.typography.weights.bold,
  },
  collectionCount: {
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
