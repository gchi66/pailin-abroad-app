import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import lockImage from '@/assets/images/lock.webp';
import { prefetchPricing } from '@/src/api/pricing';
import { fetchExerciseBankFeatured, fetchExerciseBankSections } from '@/src/api/exercise-bank';
import { StandardPageHeader } from '@/src/components/ui/StandardPageHeader';
import { AppText } from '@/src/components/ui/AppText';
import { Card } from '@/src/components/ui/Card';
import { NeoShadowPressable } from '@/src/components/ui/NeoShadowPressable';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { Stack } from '@/src/components/ui/Stack';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';
import { ExerciseBankCategory, ExerciseBankSectionSummary } from '@/src/types/exercise-bank';

type UiLanguage = 'en' | 'th';
type FilterMode = 'featured' | 'categories';

const CATEGORY_ORDER = [
  'verbs-and-tenses',
  'nouns-and-articles',
  'pronouns',
  'adjectives',
  'conjunctions',
  'prepositions',
  'other-concepts',
];

const CATEGORY_ORDER_INDEX = CATEGORY_ORDER.reduce<Record<string, number>>((acc, slug, index) => {
  acc[slug] = index;
  return acc;
}, {});

const CATEGORY_LABELS: Record<string, { en: string; th: string }> = {
  'verbs-and-tenses': { en: 'Verbs & Tenses', th: 'คำกริยา & รูปกาลกริยา' },
  'nouns-and-articles': { en: 'Nouns & Articles', th: 'คำนาม & คำนำหน้านาม' },
  pronouns: { en: 'Pronouns', th: 'คำสรรพนาม' },
  adjectives: { en: 'Adjectives', th: 'คำคุณศัพท์' },
  conjunctions: { en: 'Conjunctions', th: 'คำเชื่อม' },
  prepositions: { en: 'Prepositions', th: 'คำบุพบท' },
  'other-concepts': { en: 'Other Concepts', th: 'แนวคิดการเรียนอื่นๆ' },
};

const getCategoryLabel = ({
  category,
  categoryLabel,
  categorySlug,
  uiLanguage,
}: {
  category?: string | null;
  categoryLabel?: string | null;
  categorySlug?: string | null;
  uiLanguage: UiLanguage;
}) => {
  const normalizedSlug = categorySlug?.trim() ?? '';
  const mappedLabel = CATEGORY_LABELS[normalizedSlug];
  if (mappedLabel) {
    return uiLanguage === 'th' ? mappedLabel.th : mappedLabel.en;
  }

  return categoryLabel?.trim() || category?.trim() || '';
};

type Copy = {
  title: string;
  subtitle: string;
  featuredButton: string;
  categoriesButton: string;
  searchPlaceholder: string;
  searchLabel: string;
  featuredBadge: string;
  exercisesSuffixSingle: string;
  exercisesSuffixPlural: string;
  freeTitle: string;
  freeBody: string;
  noAccountTitle: string;
  noAccountBody: string;
  membershipCta: string;
  loadingFallback: string;
  emptyTitle: string;
  emptyBody: string;
};

const getCopy = (language: UiLanguage): Copy => {
  if (language === 'th') {
    return {
      title: 'สื่อการเรียน',
      subtitle: 'แบบฝึกหัดเพิ่มเติมสำหรับกฎไวยากรณ์ที่เข้าใจยาก',
      featuredButton: 'แบบฝึกหัดที่แนะนำ',
      categoriesButton: 'ดูตามหมวดหมู่',
      searchPlaceholder: 'ค้นหาแบบฝึกหัด',
      searchLabel: 'ค้นหาแบบฝึกหัด',
      featuredBadge: 'แบบฝึกหัดแนะนำ',
      exercisesSuffixSingle: 'แบบฝึกหัด',
      exercisesSuffixPlural: 'แบบฝึกหัด',
      freeTitle: 'คุณกำลังใช้งานแพ็กเกจเรียนฟรี',
      freeBody: 'ยังสามารถดูแบบฝึกหัดแนะนำที่ใช้ได้กับแผนของคุณ',
      noAccountTitle: 'ดูเหมือนว่าคุณยังไม่มีบัญชีผู้ใช้',
      noAccountBody: 'สมัครสมาชิกฟรีเพื่อเข้าถึงสื่อการเรียนแนะนำของเรา',
      membershipCta: 'สมัครสมาชิก',
      loadingFallback: 'ไม่สามารถโหลดคลังแบบฝึกหัดได้',
      emptyTitle: 'ไม่พบแบบฝึกหัดที่ตรงกัน',
      emptyBody: 'ลองเปลี่ยนคำค้นหาหรือหมวดหมู่แล้วค้นหาอีกครั้ง',
    };
  }

  return {
    title: 'Exercise Bank',
    subtitle: 'Additional practice exercises for those difficult grammar topics',
    featuredButton: 'Featured',
    categoriesButton: 'Categories',
    searchPlaceholder: 'Search exercise sections',
    searchLabel: 'Search exercise sections',
    featuredBadge: 'Featured',
    exercisesSuffixSingle: 'exercise',
    exercisesSuffixPlural: 'exercises',
    freeTitle: 'Free plan',
    freeBody: 'You can access all of our featured exercises. Upgrade to access the full bank.',
    noAccountTitle: 'Unlock the exercise bank',
    noAccountBody: 'Create an account, then upgrade for full access.',
    membershipCta: 'Upgrade',
    loadingFallback: 'Failed to load the exercise bank.',
    emptyTitle: 'No exercise sections found',
    emptyBody: 'Try changing your search or active category.',
  };
};

export function ExerciseBankScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const returnToParam = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const returnTo = typeof returnToParam === 'string' && returnToParam.trim() ? returnToParam : null;
  const { uiLanguage } = useUiLanguage();
  const { hasAccount, hasMembership } = useAppSession();
  const copy = getCopy(uiLanguage);
  const [sections, setSections] = useState<ExerciseBankSectionSummary[]>([]);
  const [categories, setCategories] = useState<ExerciseBankCategory[]>([]);
  const [featured, setFeatured] = useState<ExerciseBankSectionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('featured');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [sectionsResponse, featuredResponse] = await Promise.all([
          fetchExerciseBankSections(),
          fetchExerciseBankFeatured(),
        ]);

        if (!isMounted) {
          return;
        }

        setSections(sectionsResponse.sections);
        setCategories(sectionsResponse.categories);
        setFeatured(featuredResponse);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load the exercise bank.');
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

  const visibleCategoryOptions = useMemo(() => {
    const normalized = categories
      .filter((category) => typeof category.category_slug === 'string' && category.category_slug.trim())
      .map((category) => ({
        slug: category.category_slug?.trim() ?? '',
        label: getCategoryLabel({
          category: category.category,
          categoryLabel: category.category_label,
          categorySlug: category.category_slug,
          uiLanguage,
        }),
      }))
      .sort((a, b) => {
        const orderA = CATEGORY_ORDER_INDEX[a.slug] ?? Number.MAX_SAFE_INTEGER;
        const orderB = CATEGORY_ORDER_INDEX[b.slug] ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) {
          return orderA - orderB;
        }

        return a.label.localeCompare(b.label, uiLanguage === 'th' ? 'th' : 'en');
      });

    return [{ slug: 'all', label: uiLanguage === 'th' ? 'ทั้งหมด' : 'All' }, ...normalized];
  }, [categories, uiLanguage]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const visibleSections = useMemo(() => {
    const source = filterMode === 'featured' ? featured : sections;
    const filtered = source.filter((section) => {
      if (filterMode === 'categories' && selectedCategory !== 'all' && section.category_slug !== selectedCategory) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [section.section, section.section_th, section.category_label].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(normalizedSearch);
    });

    return [...filtered].sort((a, b) => {
      const categoryOrderA = CATEGORY_ORDER_INDEX[a.category_slug?.trim() ?? ''] ?? Number.MAX_SAFE_INTEGER;
      const categoryOrderB = CATEGORY_ORDER_INDEX[b.category_slug?.trim() ?? ''] ?? Number.MAX_SAFE_INTEGER;
      if (categoryOrderA !== categoryOrderB) {
        return categoryOrderA - categoryOrderB;
      }

      const sectionOrderA = typeof a.section_order === 'number' ? a.section_order : Number.MAX_SAFE_INTEGER;
      const sectionOrderB = typeof b.section_order === 'number' ? b.section_order : Number.MAX_SAFE_INTEGER;
      if (sectionOrderA !== sectionOrderB) {
        return sectionOrderA - sectionOrderB;
      }

      return String(a.section ?? '').localeCompare(String(b.section ?? ''));
    });
  }, [featured, filterMode, normalizedSearch, sections, selectedCategory]);

  const featuredSectionKeys = useMemo(() => {
    return new Set(
      featured
        .map((section) => {
          const categorySlug = section.category_slug?.trim();
          const sectionSlug = section.section_slug?.trim();
          return categorySlug && sectionSlug ? `${categorySlug}:${sectionSlug}` : null;
        })
        .filter((value): value is string => Boolean(value))
    );
  }, [featured]);

  const canAccessSection = (section: ExerciseBankSectionSummary) => {
    if (hasMembership) {
      return true;
    }

    if (!hasAccount) {
      return false;
    }

    const categorySlug = section.category_slug?.trim();
    const sectionSlug = section.section_slug?.trim();
    if (!categorySlug || !sectionSlug) {
      return false;
    }

    return featuredSectionKeys.has(`${categorySlug}:${sectionSlug}`);
  };

  const handleSectionPress = (section: ExerciseBankSectionSummary) => {
    if (!canAccessSection(section)) {
      prefetchPricing();
      router.push({
        pathname: '/(tabs)/account/membership',
        params: { returnTo: '/(tabs)/resources/exercise-bank' },
      });
      return;
    }

    const categorySlug = section.category_slug?.trim();
    const sectionSlug = section.section_slug?.trim();
    if (!categorySlug || !sectionSlug) {
      return;
    }

    router.push(`/(tabs)/resources/exercise-bank/${categorySlug}/${sectionSlug}`);
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
          onBackPress={() => router.push((returnTo || '/(tabs)/resources') as never)}
          backLabel={uiLanguage === 'th' ? 'กลับ' : 'Back'}
        />

        <View style={styles.contentWrap}>
          <Stack gap="md">
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

            <View style={styles.toolbarShell}>
              <View style={styles.filterRow}>
                <NeoShadowPressable
                  accessibilityRole="button"
                  style={[styles.filterButton, filterMode === 'featured' ? styles.filterButtonActive : null]}
                  onPress={() => setFilterMode('featured')}>
                  <AppText language={uiLanguage} variant="caption" style={[styles.filterButtonText, filterMode === 'featured' ? styles.filterButtonTextActive : null]}>
                    {copy.featuredButton}
                  </AppText>
                </NeoShadowPressable>
                <NeoShadowPressable
                  accessibilityRole="button"
                  style={[styles.filterButton, filterMode === 'categories' ? styles.filterButtonActive : null]}
                  onPress={() => setFilterMode('categories')}>
                  <AppText language={uiLanguage} variant="caption" style={[styles.filterButtonText, filterMode === 'categories' ? styles.filterButtonTextActive : null]}>
                    {copy.categoriesButton}
                  </AppText>
                </NeoShadowPressable>
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

              {filterMode === 'categories' ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                  {visibleCategoryOptions.map((category) => {
                    const isActive = category.slug === selectedCategory;
                    return (
                      <Pressable
                        key={category.slug}
                        accessibilityRole="button"
                        style={[styles.categoryChip, isActive ? styles.categoryChipActive : null]}
                        onPress={() => setSelectedCategory(category.slug)}>
                        <AppText language={uiLanguage} variant="caption" style={[styles.categoryChipText, isActive ? styles.categoryChipTextActive : null]}>
                          {category.label}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : null}
            </View>

            {errorMessage ? (
              <Card padding="lg" radius="lg" style={styles.emptyCard}>
                <Stack gap="xs">
                  <AppText language={uiLanguage} variant="body" style={styles.emptyTitle}>
                    {copy.loadingFallback}
                  </AppText>
                  <AppText language={uiLanguage} variant="muted" style={styles.emptyBody}>
                    {errorMessage}
                  </AppText>
                </Stack>
              </Card>
            ) : null}

            {!errorMessage && visibleSections.length === 0 ? (
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

            {!errorMessage ? (
              <Stack gap="md">
                {visibleSections.map((section) => {
                  const isLocked = !canAccessSection(section);
                  const exerciseCount = Number(section.exercise_count ?? 0);
                  return (
                    <Pressable
                      key={`${section.category_slug}:${section.section_slug}`}
                      accessibilityRole="button"
                      onPress={() => handleSectionPress(section)}>
                      <Card padding="lg" radius="lg" style={[styles.sectionCard, isLocked ? styles.sectionCardLocked : null]}>
                        <Stack gap="sm">
                          <View style={styles.sectionCardHeader}>
                            <View style={styles.sectionMetaWrap}>
                              <View style={styles.sectionChipRow}>
                                <View style={styles.sectionChip}>
                                  <AppText language={uiLanguage} variant="caption" style={styles.sectionChipText}>
                                    {getCategoryLabel({
                                      category: section.category,
                                      categoryLabel: section.category_label,
                                      categorySlug: section.category_slug,
                                      uiLanguage,
                                    })}
                                  </AppText>
                                </View>
                                {filterMode === 'featured' ? (
                                  <View style={[styles.sectionChip, styles.sectionChipFeatured]}>
                                    <AppText language={uiLanguage} variant="caption" style={styles.sectionChipText}>
                                      {copy.featuredBadge}
                                    </AppText>
                                  </View>
                                ) : null}
                              </View>

                              <AppText language="en" variant="body" style={styles.sectionTitle}>
                                {section.section || ''}
                              </AppText>

                              {uiLanguage === 'th' && section.section_th ? (
                                <AppText language="th" variant="body" style={styles.sectionThaiTitle}>
                                  {section.section_th}
                                </AppText>
                              ) : null}
                            </View>

                            {isLocked ? (
                              <Image source={lockImage} style={styles.sectionLockIcon} resizeMode="contain" />
                            ) : null}
                          </View>

                          <AppText language={uiLanguage} variant="muted" style={styles.sectionCount}>
                            {`${exerciseCount} ${exerciseCount === 1 ? copy.exercisesSuffixSingle : copy.exercisesSuffixPlural}`}
                          </AppText>
                        </Stack>
                      </Card>
                    </Pressable>
                  );
                })}
              </Stack>
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
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
  categoryRow: {
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.md,
  },
  categoryChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.accent,
  },
  categoryChipText: {
    color: theme.colors.text,
  },
  categoryChipTextActive: {
    color: theme.colors.surface,
  },
  loadingWrap: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyTitle: {
    color: theme.colors.text,
  },
  emptyBody: {
    color: theme.colors.mutedText,
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionCardLocked: {
    opacity: 0.72,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  sectionMetaWrap: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  sectionChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  sectionChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.warningSurface,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  sectionChipFeatured: {
    backgroundColor: theme.colors.accentMuted,
  },
  sectionChipText: {
    color: theme.colors.text,
  },
  sectionStatusPill: {
    minWidth: 24,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  sectionLockIcon: {
    width: 18,
    height: 18,
  },
  sectionThaiTitle: {
    color: theme.colors.mutedText,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: theme.typography.weights.bold,
  },
  sectionCount: {
    color: theme.colors.mutedText,
  },
});
