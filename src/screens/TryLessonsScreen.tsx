import React from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';

import blueCheckmarkImage from '@/assets/images/blue-checkmark.webp';
import { freeLessonImages } from '@/src/assets/app-images';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Stack } from '@/src/components/ui/Stack';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { homeMockData, pickText } from '@/src/mocks/home';
import { theme } from '@/src/theme/theme';
import { FreeLessonCard, UiLanguage } from '@/src/types/home';

const MEMBERSHIP_FEATURES: Record<UiLanguage, string[]> = {
  en: [
    "Our whole lesson library - that's over 200 lessons!",
    'Our extensive Exercise Bank',
    'Common mistakes made by Thai speakers',
    'Our Phrases & Phrasal Verbs Bank',
    'Our ESL Topic Library',
    'Cultural notes to help you understand English in context',
    'Comment on any lesson and get feedback from us!',
  ],
  th: [
    'คลังบทเรียนทั้งหมดของเรา มากกว่า 200 บทเรียน!',
    'คลังแบบฝึกหัดทั้งหมดมหาศาลของเรา',
    'ข้อผิดพลาดที่คนไทยมักใช้ผิด',
    'คลังวลีและกริยาวลีของเรา',
    'คลังหัวข้อการเรียนรู้ภาษาอังกฤษของเรา',
    'เกร็ดความรู้ทางวัฒนธรรมที่จะช่วยให้คุณเข้าใจบริบทการใช้ภาษาอังกฤษ',
    'ทิ้งความคิดเห็นของคุณไว้ได้ในทุกบทเรียน พร้อมรับการตอบกลับจากเรา!',
  ],
};

export function TryLessonsScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { uiLanguage } = useUiLanguage();
  const { hasMembership } = useAppSession();
  const freeLessons = homeMockData.freeLessons;
  const cardWidth = Math.min(280, Math.round(windowWidth * 0.68));

  const handleLessonPress = (card: FreeLessonCard) => {
    if (card.comingSoon) {
      return;
    }

    Alert.alert(
      pickText(card.title, uiLanguage),
      uiLanguage === 'th'
        ? 'หน้าบทเรียนจริงจะเชื่อมในขั้นตอนถัดไป'
        : 'The lesson page will be connected in a later step.'
    );
  };

  const handlePlaceholderAction = (kind: 'signup' | 'membership') => {
    if (kind === 'membership') {
      router.push('/(tabs)/account/membership');
      return;
    }

    Alert.alert(
      kind === 'signup' ? (uiLanguage === 'th' ? 'สมัครสมาชิกฟรี' : 'Sign up free') : uiLanguage === 'th' ? 'Membership' : 'Membership',
      uiLanguage === 'th'
        ? 'จะเชื่อม flow นี้ในขั้นตอนถัดไป'
        : 'This flow will be connected in a later step.'
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <Stack gap="xl">
        <View style={styles.headerBlock}>
          <Stack gap="sm">
            <AppText language={uiLanguage} variant="title" style={styles.title}>
              {uiLanguage === 'th' ? 'ทดลองเรียน' : 'Try Our Lessons'}
            </AppText>
            <AppText language={uiLanguage} variant="body" style={styles.subtitle}>
              {uiLanguage === 'th'
                ? 'ลองเรียนฟรี 4 บทเรียน ไม่จำเป็นต้องสมัครสมาชิก!'
                : '4 free lessons for you to try, no sign-up needed!'}
            </AppText>
          </Stack>
        </View>

        <View style={styles.introSection}>
          <AppText language={uiLanguage} variant="body" style={styles.introText}>
            {uiLanguage === 'th'
              ? 'เรามั่นใจว่าคุณจะหลงรักวิธีการเรียนภาษาอังกฤษแบบเล่าเรื่องที่ไม่เหมือนใครแบบเราแน่นอน ลองสำรวจบทเรียนแรกจากแต่ละระดับการเรียนด้วยตัวคุณเองดูก่อนสิ'
              : "We're confident you'll love our unique, narrative-driven method of learning English. Explore a lesson from each level to see for yourself."}
          </AppText>
        </View>

        <View style={styles.cardsSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardsContentContainer}>
            {freeLessons.cards.map((card) => (
              <Pressable
                key={card.id}
                accessibilityRole="button"
                onPress={() => handleLessonPress(card)}
                disabled={card.comingSoon}
                style={[styles.cardPressable, { width: cardWidth }]}>
                <Card
                  padding="lg"
                  radius="lg"
                  style={[styles.lessonCard, card.comingSoon ? styles.lessonCardDisabled : null]}>
                  <View style={styles.cardShell}>
                    {card.comingSoon ? (
                      <View style={styles.badgeWrap}>
                        <AppText language={uiLanguage} variant="caption" style={styles.comingSoonText}>
                          {uiLanguage === 'th' ? 'เร็วๆ นี้!' : 'COMING SOON!'}
                        </AppText>
                      </View>
                    ) : null}

                    <Stack gap="sm">
                      <AppText language={uiLanguage} variant="caption" style={styles.levelText}>
                        {pickText(card.level, uiLanguage)}
                      </AppText>

                      <AppText language={uiLanguage} variant="body" style={styles.cardTitle}>
                        {pickText(card.title, uiLanguage)}
                      </AppText>

                      <Image source={getFreeLessonImage(card.id)} style={styles.lessonImage} resizeMode="contain" />

                      <AppText language={uiLanguage} variant="caption" style={styles.focusLabel}>
                        {pickText(card.focusLabel, uiLanguage)}
                      </AppText>

                      <AppText language={uiLanguage} variant="muted" style={styles.description}>
                        {pickText(card.description, uiLanguage)}
                      </AppText>
                    </Stack>
                  </View>
                </Card>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.noticeSection}>
          <Stack gap="md">
            <AppText language={uiLanguage} variant="body" style={styles.noticeHeading}>
              {uiLanguage === 'th' ? 'พร้อมเรียนแล้วหรือยัง?' : 'Ready to continue your journey?'}
            </AppText>

            <AppText language={uiLanguage} variant="muted" style={styles.noticeText}>
              {hasMembership
                ? uiLanguage === 'th'
                  ? 'เข้าถึงบทเรียนมากกว่า 200 บททั้งหมด และพัฒนายกระดับภาษาอังกฤษของคุณขึ้นไปอีกขั้นด้วยการเป็นสมาชิก'
                  : 'Get full access to all 150+ lessons and take your English to the next level with a full membership.'
                : uiLanguage === 'th'
                  ? 'คุณมีสิทธิ์เข้าถึงบทเรียนฟรีแล้ว และสามารถอัปเกรดเป็นสมาชิกเพื่อเข้าถึงบทเรียนทั้งหมด'
                  : 'Your free plan already gives you access to free lessons. Upgrade to membership for the full library.'}
            </AppText>

            <Button
              language={uiLanguage}
              title={uiLanguage === 'th' ? 'ดู Membership' : 'BECOME A MEMBER'}
              onPress={() => handlePlaceholderAction('membership')}
            />
          </Stack>
        </View>

        <Card padding="lg" radius="lg" style={styles.featuresCard}>
          <Stack gap="md">
            <AppText language={uiLanguage} variant="body" style={styles.featuresTitle}>
              {uiLanguage === 'th' ? 'สิทธิของสมาชิกที่สามารถเข้าถึงได้:' : 'Membership gives you full access to:'}
            </AppText>

            <Stack gap="sm">
              {MEMBERSHIP_FEATURES[uiLanguage].map((feature) => (
                <View key={feature} style={styles.featureRow}>
                  <Image source={blueCheckmarkImage} style={styles.featureIcon} resizeMode="contain" />
                  <AppText language={uiLanguage} variant="body" style={styles.featureText}>
                    {feature}
                  </AppText>
                </View>
              ))}
            </Stack>
          </Stack>
        </Card>
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
    paddingBottom: theme.spacing.xl,
  },
  headerBlock: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: theme.colors.text,
    textAlign: 'center',
    fontSize: 44,
    lineHeight: 52,
  },
  subtitle: {
    color: theme.colors.mutedText,
    textAlign: 'center',
    fontSize: 17,
    lineHeight: 26,
  },
  introSection: {
    paddingHorizontal: theme.spacing.lg,
  },
  introText: {
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 28,
  },
  cardsSection: {
    width: '100%',
  },
  cardsContentContainer: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.md,
  },
  cardPressable: {
    flexShrink: 0,
  },
  lessonCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.border,
    shadowOpacity: 0.18,
    shadowRadius: 0,
    shadowOffset: {
      width: 3,
      height: 3,
    },
    elevation: 2,
  },
  lessonCardDisabled: {
    backgroundColor: '#F3F3F3',
    opacity: 0.7,
  },
  cardShell: {
    position: 'relative',
  },
  badgeWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1,
  },
  comingSoonText: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.bold,
  },
  levelText: {
    color: theme.colors.mutedText,
    letterSpacing: 0.8,
    fontWeight: theme.typography.weights.semibold,
    textTransform: 'uppercase',
  },
  cardTitle: {
    minHeight: 52,
    fontWeight: theme.typography.weights.semibold,
    fontSize: theme.typography.sizes.lg,
    lineHeight: theme.typography.lineHeights.md,
  },
  lessonImage: {
    height: 110,
    width: '100%',
    alignSelf: 'center',
    marginVertical: theme.spacing.sm,
  },
  focusLabel: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semibold,
  },
  description: {
    color: theme.colors.text,
    minHeight: 48,
  },
  noticeSection: {
    marginHorizontal: theme.spacing.md,
  },
  noticeHeading: {
    textAlign: 'center',
    fontWeight: theme.typography.weights.semibold,
    fontSize: theme.typography.sizes.lg,
  },
  noticeText: {
    color: theme.colors.mutedText,
    textAlign: 'center',
  },
  featuresCard: {
    marginHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  featuresTitle: {
    textAlign: 'center',
    fontWeight: theme.typography.weights.semibold,
    fontSize: theme.typography.sizes.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  featureIcon: {
    width: 20,
    height: 20,
    marginTop: 2,
  },
  featureText: {
    flex: 1,
    color: theme.colors.text,
  },
});

function getFreeLessonImage(id: string) {
  return freeLessonImages[id as keyof typeof freeLessonImages];
}
