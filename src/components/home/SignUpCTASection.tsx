import React from 'react';
import { StyleSheet, View } from 'react-native';

import { pickText } from '../../mocks/home';
import { SignUpCTAData, UiLanguage } from '../../types/home';
import { theme } from '../../theme/theme';
import { AppText } from '../ui/AppText';
import { Button } from '../ui/Button';
import { Stack } from '../ui/Stack';

type SignUpCTASectionProps = {
  data: SignUpCTAData;
  ui: UiLanguage;
  onPrimaryPress?: () => void;
};

export function SignUpCTASection({ data, ui, onPrimaryPress }: SignUpCTASectionProps) {
  return (
    <View style={styles.container}>
      <Stack gap="md">
        <Stack gap="sm" style={styles.titleWrap}>
          <AppText language={ui} variant="title" style={styles.title}>
            {pickText(data.titleParts.beforeEm, ui)}{' '}
            <AppText language={ui} variant="title" style={styles.titleEmphasis}>
              {pickText(data.titleParts.emphasis, ui)}
            </AppText>{' '}
            {pickText(data.titleParts.afterEm, ui)}
          </AppText>
        </Stack>
        <Button language={ui} title={pickText(data.cta, ui)} onPress={onPrimaryPress} />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: theme.spacing.md,
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
