import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';

import { fetchExerciseBankTopics } from '@/src/api/exercise-bank';
import { prefetchPricing } from '@/src/api/pricing';
import { resourceCardImages } from '@/src/assets/resource-images';
import { FLOATING_TAB_BAR_PAGE_BOTTOM_PADDING } from '@/src/components/navigation/layout';
import { ResourcePageHeader } from '@/src/components/resources/ResourcePageHeader';
import { AndroidNeoShadowLayer } from '@/src/components/ui/AndroidNeoShadowLayer';
import { AppText } from '@/src/components/ui/AppText';
import { Card } from '@/src/components/ui/Card';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
import { Stack } from '@/src/components/ui/Stack';
import { ResourceUnlockCard } from '@/src/components/resources/ResourceUnlockCard';
import { useAppSession } from '@/src/context/app-session-context';
import { localizeExerciseBankTopic } from '@/src/lib/exercise-bank-localization';
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
        intro: 'เลือกหมวดหมู่เพื่อเริ่มฝึกไวยากรณ์ทีละหัวข้อ',
        unlockTitle: 'ปลดล็อกแบบฝึกหัดทั้งหมด',
        unlockBody: 'คุณสามารถใช้แบบฝึกหัดแนะนำของเราได้\nอัปเกรดเพื่อปลดล็อกคลังแบบฝึกหัดทั้งหมด!',
        membershipCta: 'ดูแพ็กเกจ →',
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
        intro: 'Choose a category to get started! You can practise skills by topic.',
        unlockTitle: 'UNLOCK ALL EXERCISES',
        unlockBody: 'You have access to our featured exercises.\nUpgrade to unlock the full Exercise Bank!',
        membershipCta: 'VIEW PLANS →',
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
  const { hasMembership } = useAppSession();
  const copy = getCopy(uiLanguage);
  const [topics, setTopics] = useState<ExerciseBankTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const rows = await fetchExerciseBankTopics({}, (freshRows) => {
          if (isMounted) setTopics(freshRows);
        });
        if (isMounted) {
          setTopics(rows);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load the Exercise Bank.');
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
  }, []);

  const localizedTopics = useMemo(
    () => topics.map((topic) => localizeExerciseBankTopic(topic, uiLanguage)),
    [topics, uiLanguage]
  );

  const collections = useMemo<TopicCollection[]>(() => {
    return EXERCISE_BANK_COLLECTIONS.map((collection) => {
      const collectionTopics =
        collection.slug === 'featured'
          ? localizedTopics.filter((topic) => topic.is_featured)
          : localizedTopics.filter((topic) => topic.category === collection.category);

      return { ...collection, topicCount: collectionTopics.length };
    }).filter((collection) => collection.topicCount > 0);
  }, [localizedTopics]);

  const handleCollectionPress = (collection: TopicCollection) => {
    router.push({
      pathname: '/(tabs)/exercises/[collectionSlug]',
      params: {
        collectionSlug: collection.slug,
        title: collection.label[uiLanguage],
      },
    });
  };

  if (isLoading) {
    return <PageLoadingState language={uiLanguage} />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <ResponsivePageShell>
        <View style={styles.page}>
          <ResourcePageHeader
            language={uiLanguage}
            title={copy.title}
            subtitle={copy.intro}
            onBackPress={() => router.push('/(tabs)/resources')}
            illustration={<Image source={resourceCardImages['exercise-bank']} contentFit="contain" style={styles.headerIllustration} />}
          />
          <View style={styles.contentWrap}>
            <Stack gap="lg">

              {!hasMembership ? (
                <ResourceUnlockCard
                  language={uiLanguage}
                  title={copy.unlockTitle}
                  body={copy.unlockBody}
                  italicWord={uiLanguage === 'en' ? 'full' : undefined}
                  buttonLabel={copy.membershipCta}
                  onPress={() => {
                    prefetchPricing();
                    router.push({
                      pathname: '/(tabs)/account/membership',
                      params: { returnTo: '/(tabs)/exercises' },
                    });
                  }}
                />
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
                      <View style={[styles.collectionCard, collection.slug === 'verbs-and-tenses' ? styles.featuredCollectionCard : null]}>
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
        </View>
      </ResponsivePageShell>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FBFF',
  },
  contentContainer: {
    paddingBottom: FLOATING_TAB_BAR_PAGE_BOTTOM_PADDING,
  },
  page: { paddingHorizontal: 18, paddingTop: 12 },
  headerIllustration: { position: 'absolute', right: 4, bottom: -3, width: 112, height: 86 },
  contentWrap: { paddingTop: theme.spacing.sm },
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
  collectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  collectionCardWrap: {
    position: 'relative',
    width: '48.5%',
    minHeight: 116,
  },
  collectionCard: {
    flex: 1,
    borderRadius: theme.radii.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 15,
    justifyContent: 'flex-start',
  },
  featuredCollectionCard: { backgroundColor: '#C8F0FF' },
  collectionEmoji: {
    alignSelf: 'flex-start',
    minHeight: 32,
    fontSize: 24,
    lineHeight: 32,
    includeFontPadding: true,
  },
  collectionCopy: {
    marginTop: 5,
    gap: 2,
  },
  collectionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: theme.typography.weights.bold,
  },
  collectionCount: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 17,
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
