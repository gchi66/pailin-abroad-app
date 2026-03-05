import React from 'react';
import { StyleSheet, View } from 'react-native';

import { pickText } from '../../mocks/home';
import { HeroData, UiLanguage } from '../../types/home';
import { theme } from '../../theme/theme';
import { AppText } from '../ui/AppText';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Stack } from '../ui/Stack';

type HeroSectionProps = {
  data: HeroData;
  ui: UiLanguage;
  onPrimaryPress?: () => void;
};

export function HeroSection({ data, ui, onPrimaryPress }: HeroSectionProps) {
  return (
    <Card padding="lg" radius="lg" style={styles.card}>
      <Stack gap="lg">
        <View style={styles.artworkWrap}>
          <View style={styles.artworkCircle}>
            <AppText language={ui} variant="title" style={styles.artworkText}>
              PA
            </AppText>
          </View>
        </View>

        <Stack gap="md" style={styles.contentWrap}>
          <AppText language={ui} variant="title" style={styles.title}>
            {pickText(data.title, ui)}
          </AppText>
          <AppText language={ui} variant="body" style={styles.subtitle}>
            {pickText(data.subtitle, ui)}
          </AppText>
          <Button language={ui} title={pickText(data.cta, ui)} onPress={onPrimaryPress} />
        </Stack>
      </Stack>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  artworkWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkCircle: {
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkText: {
    fontSize: theme.typography.sizes.xl,
    lineHeight: theme.typography.lineHeights.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primary,
  },
  contentWrap: {
    width: '100%',
  },
  title: {
    fontSize: theme.typography.sizes['2xl'],
    lineHeight: theme.typography.lineHeights.xl,
  },
  subtitle: {
    color: theme.colors.mutedText,
  },
});
