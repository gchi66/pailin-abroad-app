import React from 'react';
import { StyleSheet, View } from 'react-native';

import { pickText } from '../../mocks/home';
import { ChooseUsData, UiLanguage } from '../../types/home';
import { theme } from '../../theme/theme';
import { AppText } from '../ui/AppText';
import { Card } from '../ui/Card';
import { Stack } from '../ui/Stack';

type ChooseUsSectionProps = {
  data: ChooseUsData;
  ui: UiLanguage;
};

export function ChooseUsSection({ data, ui }: ChooseUsSectionProps) {
  return (
    <Card padding="lg" radius="lg" style={styles.card}>
      <Stack gap="md">
        <AppText language={ui} variant="title" style={styles.title}>
          {pickText(data.title, ui)}
        </AppText>
        <Stack gap="sm">
          {data.reasons.map((reason, index) => (
            <Stack key={`${pickText(reason.text, ui)}-${index}`} direction="horizontal" gap="sm" style={styles.reasonRow}>
              <View style={styles.iconDot}>
                <AppText language={ui} variant="caption" style={styles.iconText}>
                  ✓
                </AppText>
              </View>
              <View style={styles.reasonTextWrap}>
                <AppText language={ui} variant="body">{pickText(reason.text, ui)}</AppText>
              </View>
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  title: {
    textAlign: 'center',
  },
  reasonRow: {
    width: '100%',
    alignItems: 'flex-start',
  },
  iconDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.bold,
  },
  reasonTextWrap: {
    flex: 1,
  },
});
