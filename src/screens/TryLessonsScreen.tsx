import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { getLessonsIndex, prefetchResolvedLesson } from '@/src/api/lessons';
import { prefetchPricing } from '@/src/api/pricing';
import { freeLessonImages } from '@/src/assets/app-images';
import { StandardPageHeader } from '@/src/components/ui/StandardPageHeader';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { Stack } from '@/src/components/ui/Stack';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { homeMockData, pickText } from '@/src/mocks/home';
import { theme } from '@/src/theme/theme';
import { LessonListItem } from '@/src/types/lesson';
import { FreeLessonCard, UiLanguage } from '@/src/types/home';

type FreeLessonRouteMap = Partial<Record<'beginner' | 'intermediate' | 'advanced' | 'expert', string>>;

const STATIC_FREE_LESSON_IDS: FreeLessonRouteMap = {
  beginner: 'a34f5a4b-0729-430e-9b92-900dcad2f977',
  intermediate: '5f9d09b4-ed35-40ac-b89f-50dbd7e96c0c',
  advanced: '27e50504-7021-4a7b-b30d-0cae34a094bf',
};

const MEMBERSHIP_FEATURES: Record<UiLanguage, string[]> = {
  en: [
    "Our whole lesson library - that's over 200 lessons!",
    'Our extensive Exercise Bank',
    'Common mistakes made by Thai speakers',
    'Our Phrases & Phrasal Verbs Bank',
    'Our ESL Topic Library',
  ],
  th: [
    'คลังบทเรียนทั้งหมดของเรา มากกว่า 200 บทเรียน!',
    'คลังแบบฝึกหัดทั้งหมดมหาศาลของเรา',
    'ข้อผิดพลาดที่คนไทยมักใช้ผิด',
    'คลังวลีและกริยาวลีของเรา',
    'คลังหัวข้อการเรียนรู้ภาษาอังกฤษของเรา',
  ],
};

const resolveExpertLessonId = (items: LessonListItem[]) => {
  const directTitleMatch = items.find((lesson) => {
    const title = lesson.title?.trim().toLowerCase();
    const titleTh = lesson.title_th?.trim().toLowerCase();

    return title === 'spaghetti sauce everywhere!' || titleTh === 'ซอสสปาเก็ตตี้เลอะเทอะไปหมด!';
  });

  if (directTitleMatch?.id) {
    return directTitleMatch.id;
  }

  const firstExpertLesson = [...items]
    .filter((lesson) => lesson.stage === 'Expert' && typeof lesson.level === 'number')
    .sort((a, b) => {
      const levelOrder = (a.level ?? 0) - (b.level ?? 0);
      if (levelOrder !== 0) {
        return levelOrder;
      }

      return (a.lesson_order ?? Number.MAX_SAFE_INTEGER) - (b.lesson_order ?? Number.MAX_SAFE_INTEGER);
    })[0];

  return firstExpertLesson?.id ?? null;
};

export function TryLessonsScreen() {
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();
  const { hasMembership, isGuestMode } = useAppSession();
  const freeLessons = homeMockData.freeLessons.cards;
  const [routeMap, setRouteMap] = useState<FreeLessonRouteMap>(STATIC_FREE_LESSON_IDS);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadRoutes = async () => {
      try {
        const items = await getLessonsIndex();
        if (!isMounted) {
          return;
        }

        const expertLessonId = resolveExpertLessonId(items);
        setRouteMap((current) => ({
          ...current,
          expert: expertLessonId ?? current.expert,
        }));
        setErrorMessage(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : 'Failed to load lessons.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadRoutes();

    return () => {
      isMounted = false;
    };
  }, []);

  const freeLessonCards = useMemo(
    () =>
      freeLessons.map((card) => ({
        ...card,
        lessonId: routeMap[card.id as keyof FreeLessonRouteMap] ?? null,
      })),
    [freeLessons, routeMap]
  );

  const handleLessonPress = (card: FreeLessonCard & { lessonId: string | null }) => {
    if (!card.lessonId) {
      return;
    }

    router.push({
      pathname: '/lessons/[id]',
      params: {
        id: card.lessonId,
        locked: '0',
      },
    });
  };

  const handleMembershipPress = () => {
    prefetchPricing();
    router.push('/(tabs)/account/membership');
  };

  if (isLoading) {
    return <PageLoadingState language={uiLanguage} />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <ResponsivePageShell>
        <Stack gap="lg">
          <StandardPageHeader
            language={uiLanguage}
            title={uiLanguage === 'th' ? '4 บทเรียนฟรี' : '4 Free Lessons'}
            subtitle={
              uiLanguage === 'th'
                ? 'เริ่มเรียนได้ทันทีแบบไม่ต้องสมัครสมาชิก'
                : 'Start learning right away with no account required.'
            }
          />

          <View style={styles.introBlock}>
            <AppText language={uiLanguage} variant="body" style={styles.introText}>
              {uiLanguage === 'th'
                ? 'ลองเรียนบทแรกจากแต่ละระดับเพื่อสัมผัสวิธีการสอนแบบเล่าเรื่องของ Pailin Abroad ก่อนตัดสินใจสมัครสมาชิก'
                : 'Try the first lesson from each level to get a feel for Pailin Abroad before deciding on membership.'}
            </AppText>
          </View>

          {errorMessage ? (
            <Card padding="md" radius="md" style={styles.errorCard}>
              <AppText language={uiLanguage} variant="body" style={styles.errorText}>
                {errorMessage}
              </AppText>
            </Card>
          ) : null}

          <Stack gap="md">
            {freeLessonCards.map((card) => {
              const isDisabled = !card.lessonId;

              return (
                <Pressable
                  key={card.id}
                  accessibilityRole="button"
                  disabled={isDisabled}
                  onPressIn={() => {
                    if (card.lessonId) {
                      prefetchResolvedLesson(card.lessonId, 'en');
                    }
                  }}
                  onPress={() => handleLessonPress(card)}
                  style={({ pressed }) => [pressed && !isDisabled ? styles.cardPressed : null]}>
                  <Card padding="lg" radius="lg" style={[styles.lessonCard, isDisabled ? styles.lessonCardDisabled : null]}>
                    <View style={styles.lessonCardRow}>
                      <View style={styles.lessonCopy}>
                        <AppText language={uiLanguage} variant="caption" style={styles.lessonLevel}>
                          {pickText(card.level, uiLanguage)}
                        </AppText>
                        <AppText language={uiLanguage} variant="body" style={styles.lessonTitle}>
                          {pickText(card.title, uiLanguage)}
                        </AppText>
                        <AppText language={uiLanguage} variant="caption" style={styles.lessonFocusLabel}>
                          {pickText(card.focusLabel, uiLanguage)}
                        </AppText>
                        <AppText language={uiLanguage} variant="muted" style={styles.lessonDescription}>
                          {pickText(card.description, uiLanguage)}
                        </AppText>
                      </View>

                      <Image source={getFreeLessonImage(card.id)} style={styles.lessonImage} resizeMode="contain" />
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </Stack>

          <Card padding="lg" radius="lg" style={styles.membershipCard}>
            <Stack gap="md">
              <AppText language={uiLanguage} variant="body" style={styles.membershipHeading}>
                {uiLanguage === 'th' ? 'อยากเรียนต่อไหม?' : 'Ready for the full library?'}
              </AppText>

              <AppText language={uiLanguage} variant="muted" style={styles.membershipText}>
                {hasMembership
                  ? uiLanguage === 'th'
                    ? 'คุณเป็นสมาชิกอยู่แล้วและเข้าถึงบทเรียนทั้งหมดได้'
                    : 'You already have membership access to the full lesson library.'
                  : isGuestMode
                    ? uiLanguage === 'th'
                      ? 'สมัครสมาชิกเพื่อปลดล็อกบทเรียนทั้งหมด แล้วค่อยสร้างบัญชีฟรีเพื่อซิงก์ความคืบหน้าของคุณ'
                      : 'Become a member to unlock all lessons, then create a free account anytime to sync your progress.'
                    : uiLanguage === 'th'
                      ? 'สมัครสมาชิกเพื่อปลดล็อกบทเรียนทั้งหมด คลังแบบฝึกหัด และทรัพยากรการเรียนของเรา'
                      : 'Unlock the full lesson library, exercise bank, and learning resources with membership.'}
              </AppText>

              <Stack gap="sm">
                {MEMBERSHIP_FEATURES[uiLanguage].map((feature) => (
                  <View key={feature} style={styles.featureRow}>
                    <View style={styles.featureDot} />
                    <AppText language={uiLanguage} variant="body" style={styles.featureText}>
                      {feature}
                    </AppText>
                  </View>
                ))}
              </Stack>

              {!hasMembership ? (
                <Button
                  language={uiLanguage}
                  title={uiLanguage === 'th' ? 'ดู Membership' : 'BECOME A MEMBER'}
                  onPress={handleMembershipPress}
                />
              ) : null}
            </Stack>
          </Card>
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
    paddingBottom: theme.spacing.xl,
  },
  introBlock: {
    paddingHorizontal: theme.spacing.md,
  },
  introText: {
    textAlign: 'center',
    color: theme.colors.text,
    lineHeight: 24,
  },
  errorCard: {
    marginHorizontal: theme.spacing.md,
    backgroundColor: '#FFF4F1',
    borderWidth: 1,
    borderColor: '#F2C4BC',
  },
  errorText: {
    color: theme.colors.text,
    textAlign: 'center',
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
  },
  lessonCard: {
    marginHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.border,
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: {
      width: 3,
      height: 3,
    },
    elevation: 2,
  },
  lessonCardDisabled: {
    opacity: 0.65,
  },
  lessonCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  lessonCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  lessonLevel: {
    color: theme.colors.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: theme.typography.weights.bold,
  },
  lessonTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.lg,
    lineHeight: 28,
    fontWeight: theme.typography.weights.bold,
  },
  lessonFocusLabel: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semibold,
  },
  lessonDescription: {
    color: theme.colors.mutedText,
    lineHeight: 22,
  },
  lessonImage: {
    width: 116,
    height: 116,
  },
  membershipCard: {
    marginHorizontal: theme.spacing.md,
    backgroundColor: '#FFFDF9',
  },
  membershipHeading: {
    textAlign: 'center',
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
  },
  membershipText: {
    color: theme.colors.mutedText,
    textAlign: 'center',
    lineHeight: 22,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  featureDot: {
    width: 10,
    height: 10,
    marginTop: 7,
    borderRadius: 999,
    backgroundColor: '#3CA0FE',
  },
  featureText: {
    flex: 1,
    color: theme.colors.text,
  },
});

function getFreeLessonImage(id: string) {
  return freeLessonImages[id as keyof typeof freeLessonImages];
}
