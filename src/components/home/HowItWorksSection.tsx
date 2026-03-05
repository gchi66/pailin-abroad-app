import React from 'react';
import { StyleSheet, View } from 'react-native';

import { pickText } from '../../mocks/home';
import { HowItWorksData, UiLanguage } from '../../types/home';
import { theme } from '../../theme/theme';
import { AppText } from '../ui/AppText';
import { Card } from '../ui/Card';
import { Stack } from '../ui/Stack';

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
        {data.steps.map((step) => (
          <Card key={step.number} padding="md" radius="lg" style={styles.stepCard}>
            <Stack gap="sm" style={styles.stepContent}>
              <View style={styles.numberCircle}>
                <AppText language={ui} variant="body" style={styles.numberText}>
                  {step.number}
                </AppText>
              </View>
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
  numberCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.bold,
  },
  stepHeader: {
    textAlign: 'center',
    fontWeight: theme.typography.weights.semibold,
  },
  stepText: {
    textAlign: 'center',
  },
});
