import React from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';

type AndroidNeoShadowLayerProps = {
  borderRadius: number;
  color: string;
  offset?: number;
  style?: ViewStyle;
};

export function AndroidNeoShadowLayer({
  borderRadius,
  color,
  offset = 2,
  style,
}: AndroidNeoShadowLayerProps) {
  if (Platform.OS !== 'android') {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={[
        styles.base,
        {
          backgroundColor: color,
          borderRadius,
          transform: [{ translateX: offset }, { translateY: offset }],
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
});
