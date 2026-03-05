import React from 'react';
import { StyleSheet } from 'react-native';

import { pickText } from '../../mocks/home';
import { TakeTheLeapData, UiLanguage } from '../../types/home';
import { theme } from '../../theme/theme';
import { AppText } from '../ui/AppText';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Stack } from '../ui/Stack';

type TakeTheLeapSectionProps = {
  data: TakeTheLeapData;
  ui: UiLanguage;
  onPrimaryPress?: () => void;
};

export function TakeTheLeapSection({ data, ui, onPrimaryPress }: TakeTheLeapSectionProps) {
  return (
    <Card padding="lg" radius="lg" style={styles.card}>
      <Stack gap="md" style={styles.content}>
        <AppText language={ui} variant="title" style={styles.title}>
          {pickText(data.title, ui)}
        </AppText>
        <Button language={ui} title={pickText(data.cta, ui)} onPress={onPrimaryPress} />
      </Stack>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    fontSize: theme.typography.sizes.lg,
    lineHeight: theme.typography.lineHeights.lg,
  },
});
