import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { prefetchPricing } from '@/src/api/pricing';
import { fetchExerciseBankFeatured, fetchExerciseBankSections } from '@/src/api/exercise-bank';
import { StandardPageHeader } from '@/src/components/ui/StandardPageHeader';
import { AppText } from '@/src/components/ui/AppText';
import { Card } from '@/src/components/ui/Card';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { Stack } from '@/src/components/ui/Stack';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';
import { ExerciseBankCategory, ExerciseBankSectionSummary } from '@/src/types/exercise-bank';

type UiLanguage = 'en' | 'th';
type FilterMode = 'featured' | 'categories';

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
  lockedLabel: string;
  openLabel: string;
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
      lockedLabel: 'สมาชิก',
      openLabel: 'ดูหัวข้อนี้ →',
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
    freeBody: 'Featured sections stay open. Upgrade for the full bank.',
    noAccountTitle: 'Unlock the exercise bank',
    noAccountBody: 'Create an account, then upgrade for full access.',
    membershipCta: 'Upgrade',
    lockedLabel: 'Members',
    openLabel: 'Open',
    loadingFallback: 'Failed to load the exercise bank.',
    emptyTitle: 'No exercise sections found',
    emptyBody: 'Try changing your search or active category.',
  };
};

export function ExerciseBankScreen() {
  const router = useRouter();
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

  useEffect(() => {
    if (selectedCategory !== 'all') {
      return;
    }

    const firstCategory = categories[0]?.category_slug?.trim();
    if (firstCategory && filterMode === 'categories') {
      setSelectedCategory(firstCategory);
    }
  }, [categories, filterMode, selectedCategory]);

  const visibleCategoryOptions = useMemo(() => {
    const normalized = categories
      .filter((category) => typeof category.category_slug === 'string' && category.category_slug.trim())
      .map((category) => ({
        slug: category.category_slug?.trim() ?? '',
        label: category.category_label?.trim() || category.category?.trim() || '',
      }));

    return [{ slug: 'all', label: uiLanguage === 'th' ? 'ทั้งหมด' : 'All' }, ...normalized];
  }, [categories, uiLanguage]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const visibleSections = useMemo(() => {
    const source = filterMode === 'featured' ? featured : sections;
    return source.filter((section) => {
      if (filterMode === 'categories' && selectedCategory !== 'all' && section.category_slug !== selectedCategory) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [section.section, section.section_th, section.category_label].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [featured, filterMode, normalizedSearch, sections, selectedCategory]);

  const handleSectionPress = (section: ExerciseBankSectionSummary) => {
    const isLocked = !hasMembership && (filterMode !== 'featured' || !hasAccount);
    if (isLocked) {
      prefetchPricing();
      router.push('/(tabs)/account/membership');
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
      <Stack gap="md">
        <StandardPageHeader language={uiLanguage} title={copy.title} />

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
                  <Pressable
                    accessibilityRole="button"
                    style={styles.noticeButton}
                    onPress={() => {
                      prefetchPricing();
                      router.push('/(tabs)/account/membership');
                    }}>
                    <AppText language={uiLanguage} variant="caption" style={styles.noticeButtonText}>
                      {copy.membershipCta}
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
                  <AppText language={uiLanguage} variant="caption" style={[styles.filterButtonText, filterMode === 'featured' ? styles.filterButtonTextActive : null]}>
                    {copy.featuredButton}
                  </AppText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  style={[styles.filterButton, filterMode === 'categories' ? styles.filterButtonActive : null]}
                  onPress={() => setFilterMode('categories')}>
                  <AppText language={uiLanguage} variant="caption" style={[styles.filterButtonText, filterMode === 'categories' ? styles.filterButtonTextActive : null]}>
                    {copy.categoriesButton}
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
                  const isLocked = !hasMembership && (filterMode !== 'featured' || !hasAccount);
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
                                    {section.category_label || section.category || ''}
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

                              {section.section_th ? (
                                <AppText language="th" variant="body" style={styles.sectionThaiTitle}>
                                  {section.section_th}
                                </AppText>
                              ) : null}
                            </View>

                            <View style={styles.sectionStatusPill}>
                              <AppText language={uiLanguage} variant="caption" style={styles.sectionStatusText}>
                                {isLocked ? copy.lockedLabel : copy.openLabel}
                              </AppText>
                            </View>
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
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  sectionStatusText: {
    color: theme.colors.text,
  },
  sectionThaiTitle: {
    color: theme.colors.mutedText,
  },
  sectionTitle: {
    color: theme.colors.text,
  },
  sectionCount: {
    color: theme.colors.mutedText,
  },
});
