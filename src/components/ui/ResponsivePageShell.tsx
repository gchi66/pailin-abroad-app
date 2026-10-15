import React from 'react';
import { StyleProp, StyleSheet, View, ViewProps, ViewStyle, useWindowDimensions } from 'react-native';

type ResponsivePageShellProps = ViewProps & {
  style?: StyleProp<ViewStyle>;
};

export const TABLET_PAGE_MAX_WIDTH = 680;
export const LARGE_TABLET_PAGE_MAX_WIDTH = 760;

export const getResponsivePageMaxWidth = (viewportWidth: number) =>
  viewportWidth >= 1024
    ? LARGE_TABLET_PAGE_MAX_WIDTH
    : viewportWidth >= 768
      ? TABLET_PAGE_MAX_WIDTH
      : viewportWidth;

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
    maxWidth: TABLET_PAGE_MAX_WIDTH,
  },
  largeTablet: {
    maxWidth: LARGE_TABLET_PAGE_MAX_WIDTH,
  },
});
