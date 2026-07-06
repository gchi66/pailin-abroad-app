import React from 'react';
import { StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';

type NeoShadowViewProps = ViewProps & {
  style?: StyleProp<ViewStyle>;
};

export function NeoShadowView({ style, children, ...rest }: NeoShadowViewProps) {
  const resolvedStyle = StyleSheet.flatten(style);

  return (
    <View {...rest} style={resolvedStyle}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({});
