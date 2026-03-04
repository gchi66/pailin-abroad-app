import React from 'react';
import { StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';

import { theme } from '../../theme/theme';

type RadiusKey = keyof typeof theme.radii;
type SpacingKey = keyof typeof theme.spacing;

type CardProps = ViewProps & {
  radius?: RadiusKey;
  padding?: SpacingKey;
  style?: StyleProp<ViewStyle>;
};

export function Card({ radius = 'lg', padding = 'md', style, ...rest }: CardProps) {
  return (
    <View
      {...rest}
      style={[
        styles.base,
        {
          borderRadius: theme.radii[radius],
          padding: theme.spacing[padding],
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
});

