import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { placementColors } from '@/src/theme/placement';
import { theme } from '@/src/theme/theme';

type PlacementLevelTitleProps = {
  language: 'en' | 'th';
  children: string;
};

const OUTLINE_OFFSETS = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
] as const;

export function PlacementLevelTitle({ language, children }: PlacementLevelTitleProps) {
  return (
    <View style={styles.container}>
      <AppText
        language={language}
        variant="title"
        style={[styles.text, styles.layer, styles.shadow]}>
        {children}
      </AppText>
      {OUTLINE_OFFSETS.map(([x, y]) => (
        <AppText
          key={`${x}-${y}`}
          language={language}
          variant="title"
          style={[styles.text, styles.layer, styles.outline, { transform: [{ translateX: x }, { translateY: y }] }]}>
          {children}
        </AppText>
      ))}
      <AppText language={language} variant="title" style={styles.text}>
        {children}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    marginTop: 8,
    marginBottom: 6,
  },
  text: {
    color: placementColors.level,
    fontSize: 40,
    lineHeight: 50,
    fontWeight: theme.typography.weights.bold,
    textAlign: 'center',
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  outline: {
    color: theme.colors.shadow,
  },
  shadow: {
    color: theme.colors.shadow,
    transform: [{ translateX: 2 }, { translateY: 3 }],
  },
});
