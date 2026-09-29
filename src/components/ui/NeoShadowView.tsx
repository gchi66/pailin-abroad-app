import React from 'react';
import { StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';

import { theme } from '../../theme/theme';
import { InsetBorderSurface } from './InsetBorderSurface';

type NeoShadowViewProps = ViewProps & {
  style?: StyleProp<ViewStyle>;
};

export function NeoShadowView({ style, children, ...rest }: NeoShadowViewProps) {
  const resolvedStyle = StyleSheet.flatten(style);
  const borderWidth = typeof resolvedStyle?.borderWidth === 'number' ? resolvedStyle.borderWidth : 0;
  const borderRadius = typeof resolvedStyle?.borderRadius === 'number' ? resolvedStyle.borderRadius : 0;
  const borderColor = typeof resolvedStyle?.borderColor === 'string' ? resolvedStyle.borderColor : theme.colors.border;
  const backgroundColor = typeof resolvedStyle?.backgroundColor === 'string' ? resolvedStyle.backgroundColor : 'transparent';
  const hasNeoShadow = typeof resolvedStyle?.boxShadow === 'string' && resolvedStyle.boxShadow !== 'none';

  return (
    <View
      {...rest}
      style={[
        resolvedStyle,
        hasNeoShadow && borderWidth > 0 ? { borderWidth: 0, backgroundColor: borderColor } : null,
      ]}>
      {hasNeoShadow && borderWidth > 0 ? (
        <InsetBorderSurface backgroundColor={backgroundColor} borderRadius={borderRadius} borderWidth={borderWidth} />
      ) : null}
      {children}
    </View>
  );
}
