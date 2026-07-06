import React from 'react';
import { Pressable, PressableProps, StyleProp, StyleSheet, ViewStyle } from 'react-native';

type NeoShadowPressableProps = Omit<PressableProps, 'children' | 'style'> & {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function NeoShadowPressable({ style, children, ...rest }: NeoShadowPressableProps) {
  const resolvedStyle = StyleSheet.flatten(style);

  return (
    <Pressable {...rest} style={resolvedStyle}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({});
