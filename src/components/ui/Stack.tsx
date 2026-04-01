import React from 'react';
import { StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';

import { theme } from '../../theme/theme';

type StackDirection = 'vertical' | 'horizontal';
type SpacingKey = keyof typeof theme.spacing;

type StackProps = ViewProps & {
  direction?: StackDirection;
  gap?: SpacingKey;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  style?: StyleProp<ViewStyle>;
};

const directionStyles: Record<StackDirection, ViewStyle> = {
  vertical: { flexDirection: 'column' },
  horizontal: { flexDirection: 'row' },
};

const gapStyles: Record<SpacingKey, ViewStyle> = {
  xs: { gap: theme.spacing.xs },
  sm: { gap: theme.spacing.sm },
  md: { gap: theme.spacing.md },
  lg: { gap: theme.spacing.lg },
  xl: { gap: theme.spacing.xl },
};

export function Stack({
  direction = 'vertical',
  gap = 'md',
  align,
  justify,
  style,
  ...rest
}: StackProps) {
  const alignStyle = align ? stylesByAlign[align] : undefined;
  const justifyStyle = justify ? stylesByJustify[justify] : undefined;

  return (
    <View
      {...rest}
      style={[styles.base, directionStyles[direction], gapStyles[gap], alignStyle, justifyStyle, style]}
    />
  );
}

const stylesByAlign: Partial<Record<Exclude<NonNullable<ViewStyle['alignItems']>, 'auto'>, ViewStyle>> = {
  'flex-start': { alignItems: 'flex-start' },
  'flex-end': { alignItems: 'flex-end' },
  center: { alignItems: 'center' },
  stretch: { alignItems: 'stretch' },
  baseline: { alignItems: 'baseline' },
};

const stylesByJustify: Partial<Record<NonNullable<ViewStyle['justifyContent']>, ViewStyle>> = {
  'flex-start': { justifyContent: 'flex-start' },
  'flex-end': { justifyContent: 'flex-end' },
  center: { justifyContent: 'center' },
  'space-between': { justifyContent: 'space-between' },
  'space-around': { justifyContent: 'space-around' },
  'space-evenly': { justifyContent: 'space-evenly' },
};

const styles = StyleSheet.create({
  base: {
    width: '100%',
  },
});
