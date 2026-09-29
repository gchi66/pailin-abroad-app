import React from 'react';
import { StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';

import { theme } from '../../theme/theme';
import { InsetBorderSurface } from './InsetBorderSurface';

type RadiusKey = keyof typeof theme.radii;
type SpacingKey = keyof typeof theme.spacing;

type CardProps = ViewProps & {
  insetBorder?: boolean;
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

export function Card({ insetBorder, radius = 'lg', padding = 'md', style, children, ...rest }: CardProps) {
  const combinedStyle = StyleSheet.flatten([styles.base, radiusStyles[radius], paddingStyles[padding], style]) as ViewStyle;
  const borderWidth = typeof combinedStyle.borderWidth === 'number' ? combinedStyle.borderWidth : 0;
  const borderRadius = typeof combinedStyle.borderRadius === 'number' ? combinedStyle.borderRadius : 0;
  const borderColor = typeof combinedStyle.borderColor === 'string' ? combinedStyle.borderColor : theme.colors.border;
  const backgroundColor = typeof combinedStyle.backgroundColor === 'string' ? combinedStyle.backgroundColor : 'transparent';
  const hasNeoShadow = typeof combinedStyle.boxShadow === 'string' && combinedStyle.boxShadow !== 'none';
  const shouldInsetBorder = borderWidth > 0 && (insetBorder ?? hasNeoShadow);

  return (
    <View
      {...rest}
      style={[
        combinedStyle,
        shouldInsetBorder ? { borderWidth: 0, backgroundColor: borderColor } : null,
      ]}>
      {shouldInsetBorder ? (
        <InsetBorderSurface
          backgroundColor={backgroundColor}
          borderRadius={borderRadius}
          borderWidth={borderWidth}
        />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
});
