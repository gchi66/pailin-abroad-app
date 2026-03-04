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

export function Stack({
  direction = 'vertical',
  gap = 'md',
  align,
  justify,
  style,
  ...rest
}: StackProps) {
  return (
    <View
      {...rest}
      style={[
        styles.base,
        {
          flexDirection: direction === 'horizontal' ? 'row' : 'column',
          gap: theme.spacing[gap],
          alignItems: align,
          justifyContent: justify,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
  },
});

