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

const radiusStyles: Record<RadiusKey, ViewStyle> = {
  sm: { borderRadius: theme.radii.sm },
  md: { borderRadius: theme.radii.md },
  lg: { borderRadius: theme.radii.lg },
  xl: { borderRadius: theme.radii.xl },
};

const paddingStyles: Record<SpacingKey, ViewStyle> = {
  xs: { padding: theme.spacing.xs },
  sm: { padding: theme.spacing.sm },
  md: { padding: theme.spacing.md },
  lg: { padding: theme.spacing.lg },
  xl: { padding: theme.spacing.xl },
};

export function Card({ radius = 'lg', padding = 'md', style, ...rest }: CardProps) {
  return <View {...rest} style={[styles.base, radiusStyles[radius], paddingStyles[padding], style]} />;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
});
