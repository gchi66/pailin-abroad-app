import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

type InsetBorderSurfaceProps = {
  backgroundColor: string;
  borderRadius: number;
  borderWidth: number;
  style?: StyleProp<ViewStyle>;
};

export function InsetBorderSurface({
  backgroundColor,
  borderRadius,
  borderWidth,
  style,
}: InsetBorderSurfaceProps) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.surface,
        {
          top: borderWidth,
          right: borderWidth,
          bottom: borderWidth,
          left: borderWidth,
          borderRadius: Math.max(0, borderRadius - borderWidth),
          backgroundColor,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  surface: {
    position: 'absolute',
  },
});
