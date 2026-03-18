import React from 'react';
import { Image, StyleSheet } from 'react-native';

import { pickText } from '../../mocks/home';
import { HowItWorksData, UiLanguage } from '../../types/home';
import { theme } from '../../theme/theme';
import { AppText } from '../ui/AppText';
import { Card } from '../ui/Card';
import { Stack } from '../ui/Stack';

import howItWorks1Image from '@/assets/images/how_it_works_1.png';
import howItWorks2Image from '@/assets/images/how_it_works_2.png';
import howItWorks3Image from '@/assets/images/how_it_works_3.png';

type HowItWorksSectionProps = {
  data: HowItWorksData;
  ui: UiLanguage;
};

export function HowItWorksSection({ data, ui }: HowItWorksSectionProps) {
  return (
    <Stack gap="md">
      <AppText language={ui} variant="title" style={styles.title}>
        {pickText(data.title, ui)}
      </AppText>
      <Stack gap="md">
        {data.steps.map((step, index) => (
          <Card key={step.number} padding="md" radius="lg" style={styles.stepCard}>
            <Stack gap="sm" style={styles.stepContent}>
              <Image source={getHowItWorksImage(index)} style={styles.numberImage} resizeMode="contain" />
              <AppText language={ui} variant="body" style={styles.stepHeader}>
                {pickText(step.header, ui)}
              </AppText>
              <AppText language={ui} variant="muted" style={styles.stepText}>
                {pickText(step.text, ui)}
              </AppText>
            </Stack>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}

const styles = StyleSheet.create({
  title: {
    textAlign: 'center',
  },
  stepCard: {
    width: '100%',
  },
  stepContent: {
    alignItems: 'center',
  },
  numberImage: {
    width: 40,
    height: 40,
  },
  stepHeader: {
    textAlign: 'center',
    fontWeight: theme.typography.weights.semibold,
  },
  stepText: {
    textAlign: 'center',
  },
});

function getHowItWorksImage(index: number) {
  switch (index) {
    case 0:
      return howItWorks1Image;
    case 1:
      return howItWorks2Image;
    default:
      return howItWorks3Image;
  }
}
