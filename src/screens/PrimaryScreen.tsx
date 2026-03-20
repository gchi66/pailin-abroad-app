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
import { LanguageToggle } from '@/src/components/ui/LanguageToggle';
import { Stack } from '@/src/components/ui/Stack';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { homeMockData } from '@/src/mocks/home';
import { theme } from '@/src/theme/theme';
import { MyPathwayScreen } from './MyPathwayScreen';

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
    return <MyPathwayScreen />;
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
});
