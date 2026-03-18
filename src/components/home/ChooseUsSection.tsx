import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { pickText } from '../../mocks/home';
import { ChooseUsData, UiLanguage } from '../../types/home';
import { theme } from '../../theme/theme';
import { AppText } from '../ui/AppText';
import { Card } from '../ui/Card';
import { Stack } from '../ui/Stack';

import blueCheckImage from '@/assets/images/graphics_check_blue.webp';

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
              <Image source={blueCheckImage} style={styles.iconImage} resizeMode="contain" />
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
  iconImage: {
    width: 24,
    height: 24,
  },
  reasonTextWrap: {
    flex: 1,
  },
});
