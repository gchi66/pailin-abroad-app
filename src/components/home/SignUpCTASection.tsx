import React from 'react';
import { StyleSheet } from 'react-native';

import { pickText } from '../../mocks/home';
import { SignUpCTAData, UiLanguage } from '../../types/home';
import { theme } from '../../theme/theme';
import { AppText } from '../ui/AppText';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Stack } from '../ui/Stack';

type SignUpCTASectionProps = {
  data: SignUpCTAData;
  ui: UiLanguage;
  onPrimaryPress?: () => void;
};

export function SignUpCTASection({ data, ui, onPrimaryPress }: SignUpCTASectionProps) {
  return (
    <Card padding="lg" radius="lg" style={styles.card}>
      <Stack gap="md">
        <Stack gap="xs" style={styles.titleWrap}>
          <AppText language={ui} variant="title" style={styles.title}>
            {pickText(data.titleParts.beforeEm, ui)}
          </AppText>
          <AppText language={ui} variant="title" style={styles.titleEmphasis}>
            {pickText(data.titleParts.emphasis, ui)}
          </AppText>
          <AppText language={ui} variant="title" style={styles.title}>
            {pickText(data.titleParts.afterEm, ui)}
          </AppText>
        </Stack>
        <Button language={ui} title={pickText(data.cta, ui)} onPress={onPrimaryPress} />
      </Stack>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  titleWrap: {
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    fontSize: theme.typography.sizes.lg,
    lineHeight: theme.typography.lineHeights.lg,
  },
  titleEmphasis: {
    textAlign: 'center',
    color: theme.colors.primary,
    fontSize: theme.typography.sizes.lg,
    lineHeight: theme.typography.lineHeights.lg,
  },
});
