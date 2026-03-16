import React from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { CharactersSection } from '@/src/components/home/CharactersSection';
import { ChooseUsSection } from '@/src/components/home/ChooseUsSection';
import { FAQSection } from '@/src/components/home/FAQSection';
import { FreeLessonsSection } from '@/src/components/home/FreeLessonsSection';
import { HeroSection } from '@/src/components/home/HeroSection';
import { HowItWorksSection } from '@/src/components/home/HowItWorksSection';
import { SignUpCTASection } from '@/src/components/home/SignUpCTASection';
import { TakeTheLeapSection } from '@/src/components/home/TakeTheLeapSection';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { LanguageToggle } from '@/src/components/ui/LanguageToggle';
import { Stack } from '@/src/components/ui/Stack';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { homeMockData } from '@/src/mocks/home';
import { theme } from '@/src/theme/theme';

export function PrimaryScreen() {
  const { uiLanguage } = useUiLanguage();
  const { hasAccount } = useAppSession();

  const handlePrimaryPress = () => {
    Alert.alert(
      hasAccount ? 'Continue' : 'Sign up',
      hasAccount ? 'Pathway actions will be connected in a later step.' : 'Sign-up flow will be connected in a later step.'
    );
  };

  if (hasAccount) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
        <View style={styles.pageWrap}>
          <Stack gap="lg">
            <View style={styles.pathwayHeader}>
              <Stack gap="sm">
                <AppText language={uiLanguage} variant="caption" style={styles.pathwayEyebrow}>
                  {uiLanguage === 'th' ? 'My Pathway' : 'My Pathway'}
                </AppText>
                <AppText language={uiLanguage} variant="title" style={styles.pathwayTitle}>
                  {uiLanguage === 'th' ? 'ยินดีต้อนรับกลับมา เรียนต่อจากจุดที่ค้างไว้' : 'Welcome back. Pick up where you left off.'}
                </AppText>
                <AppText language={uiLanguage} variant="body" style={styles.pathwaySubtitle}>
                  {uiLanguage === 'th'
                    ? 'นี่คือพื้นที่หลักของแอปเมื่อผู้ใช้มีบัญชีแล้ว แทนที่หน้า landing เดิม'
                    : 'This becomes the app’s primary surface once the user has an account, replacing the old landing page.'}
                </AppText>
              </Stack>
            </View>

            <Card padding="lg" radius="lg" style={styles.pathwayCard}>
              <Stack gap="md">
                <AppText language={uiLanguage} variant="body" style={styles.sectionTitle}>
                  {uiLanguage === 'th' ? 'Current Progress' : 'Current Progress'}
                </AppText>
                <View style={styles.progressTrack}>
                  <View style={styles.progressFill} />
                </View>
                <AppText language={uiLanguage} variant="muted">
                  {uiLanguage === 'th' ? '62% ของ Beginner Path เสร็จแล้ว' : '62% of the Beginner path completed'}
                </AppText>
                <Button
                  language={uiLanguage}
                  title={uiLanguage === 'th' ? 'เรียนต่อ' : 'Continue learning'}
                  onPress={handlePrimaryPress}
                />
              </Stack>
            </Card>

            <Card padding="lg" radius="lg" style={styles.lessonSnapshotCard}>
              <Stack gap="sm">
                <AppText language={uiLanguage} variant="body" style={styles.sectionTitle}>
                  {uiLanguage === 'th' ? 'Up Next' : 'Up Next'}
                </AppText>
                <AppText language={uiLanguage} variant="muted">
                  {uiLanguage === 'th'
                    ? 'บทเรียนต่อไป, checkpoint, และ recommendation ต่าง ๆ จะมาอยู่ตรงนี้'
                    : 'Your next lesson, checkpoints, and recommendations can live here.'}
                </AppText>
              </Stack>
            </Card>
          </Stack>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <View style={styles.pageWrap}>
        <Stack gap="xl" style={styles.sectionsWrap}>
          <View style={styles.languageRow}>
            <LanguageToggle />
          </View>
          <HeroSection data={homeMockData.hero} ui={uiLanguage} onPrimaryPress={handlePrimaryPress} />
          <FreeLessonsSection data={homeMockData.freeLessons} ui={uiLanguage} />
          <SignUpCTASection data={homeMockData.signUpCTA} ui={uiLanguage} onPrimaryPress={handlePrimaryPress} />
          <ChooseUsSection data={homeMockData.chooseUs} ui={uiLanguage} />
          <HowItWorksSection data={homeMockData.howItWorks} ui={uiLanguage} />
          <SignUpCTASection data={homeMockData.signUpCTA} ui={uiLanguage} onPrimaryPress={handlePrimaryPress} />
          <CharactersSection data={homeMockData.characters} ui={uiLanguage} />
          <TakeTheLeapSection data={homeMockData.takeTheLeap} ui={uiLanguage} onPrimaryPress={handlePrimaryPress} />
          <FAQSection data={homeMockData.faq} ui={uiLanguage} />
        </Stack>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    paddingVertical: theme.spacing.xl,
  },
  pageWrap: {
    paddingHorizontal: theme.spacing.md,
  },
  sectionsWrap: {
    width: '100%',
  },
  languageRow: {
    alignItems: 'flex-end',
  },
  pathwayHeader: {
    paddingTop: theme.spacing.sm,
  },
  pathwayEyebrow: {
    color: theme.colors.mutedText,
    fontWeight: theme.typography.weights.semibold,
  },
  pathwayTitle: {
    color: theme.colors.text,
  },
  pathwaySubtitle: {
    color: theme.colors.mutedText,
  },
  pathwayCard: {
    backgroundColor: '#CDEB8B',
  },
  lessonSnapshotCard: {
    backgroundColor: theme.colors.surface,
  },
  sectionTitle: {
    fontWeight: theme.typography.weights.semibold,
  },
  progressTrack: {
    height: 14,
    borderRadius: theme.radii.xl,
    backgroundColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
  },
  progressFill: {
    width: '62%',
    height: '100%',
    backgroundColor: theme.colors.text,
  },
});
