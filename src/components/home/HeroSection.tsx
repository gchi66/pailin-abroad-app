import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { homeHeroImage } from '@/src/assets/app-images';
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
          <Image source={homeHeroImage} style={styles.heroImage} resizeMode="contain" />
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
  heroImage: {
    width: '100%',
    height: 220,
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
