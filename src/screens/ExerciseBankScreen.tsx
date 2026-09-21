import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import pailinImage from '@/assets/images/speaking-coach/pailin-time-to-speak.webp';

import { fetchExerciseBankTopics } from '@/src/api/exercise-bank';
import { prefetchPricing } from '@/src/api/pricing';
import { FLOATING_TAB_BAR_PAGE_BOTTOM_PADDING } from '@/src/components/navigation/layout';
import { AndroidNeoShadowLayer } from '@/src/components/ui/AndroidNeoShadowLayer';
import { AppText } from '@/src/components/ui/AppText';
import { Card } from '@/src/components/ui/Card';
import { NeoShadowPressable } from '@/src/components/ui/NeoShadowPressable';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
import { Stack } from '@/src/components/ui/Stack';
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
        resources: 'สื่อการเรียน',
        intro: 'เลือกหมวดหมู่เพื่อเริ่มฝึกไวยากรณ์ทีละหัวข้อ',
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
        resources: 'ALL RESOURCES',
        intro: 'Choose a category to get started! You can practise skills by topic.',
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
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
            <AppText language={uiLanguage} variant="caption" style={styles.backText}>‹  {copy.resources}</AppText>
          </Pressable>
          <AppText language={uiLanguage} variant="title" style={styles.pageTitle}>{copy.title}</AppText>
          <View style={styles.introRow}>
            <AppText language={uiLanguage} variant="caption" style={styles.intro}>{copy.intro}</AppText>
            <Image source={pailinImage} contentFit="cover" style={styles.pailin} />
          </View>
          <View style={styles.contentWrap}>
            <Stack gap="lg">

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
                          params: { returnTo: '/(tabs)/exercises' },
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
  backButton: { alignSelf: 'flex-start', paddingVertical: 5 },
  backText: { fontSize: 10, textDecorationLine: 'underline', letterSpacing: 0.5 },
  pageTitle: { marginTop: 8, fontSize: 22, lineHeight: 29, fontWeight: theme.typography.weights.bold },
  introRow: { minHeight: 78, position: 'relative' },
  intro: { width: '60%', paddingTop: 14, fontSize: 11, lineHeight: 15 },
  pailin: { position: 'absolute', right: 0, bottom: -6, width: 126, height: 98, transform: [{ scaleX: -1 }] },
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
    boxShadow: `2px 2px 0px ${theme.colors.shadow}`,
  },
  noticeButtonText: {
    color: theme.colors.surface,
    fontWeight: theme.typography.weights.bold,
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
