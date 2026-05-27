import React from 'react';
import { StyleProp, StyleSheet, View, ViewProps, ViewStyle, useWindowDimensions } from 'react-native';

type ResponsivePageShellProps = ViewProps & {
  style?: StyleProp<ViewStyle>;
};

export function ResponsivePageShell({ children, style, ...rest }: ResponsivePageShellProps) {
  const { width } = useWindowDimensions();
  const isTabletScreen = width >= 768;
  const isLargeTabletScreen = width >= 1024;

  return (
    <View
      {...rest}
      style={[
        styles.base,
        isTabletScreen ? styles.tablet : null,
        isLargeTabletScreen ? styles.largeTablet : null,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    alignSelf: 'center',
  },
  tablet: {
    maxWidth: 680,
  },
  largeTablet: {
    maxWidth: 760,
  },
});
