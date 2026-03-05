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
import { homeMockData } from '@/src/mocks/home';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';
import { Stack } from '@/src/components/ui/Stack';

export default function HomeScreen() {
  const { uiLanguage } = useUiLanguage();

  const handlePrimaryPress = () => {
    Alert.alert('Sign up', 'Sign-up flow will be connected in a later step.');
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <View style={styles.pageWrap}>
        <Stack gap="xl" style={styles.sectionsWrap}>
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
});
