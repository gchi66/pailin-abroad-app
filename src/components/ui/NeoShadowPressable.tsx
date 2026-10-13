import React from 'react';
import { PressableProps, PressableStateCallbackType, StyleSheet, ViewStyle } from 'react-native';

import { theme } from '../../theme/theme';
import { InsetBorderSurface } from './InsetBorderSurface';
import { MotionPressable } from './MotionPressable';

type NeoShadowPressableProps = Omit<PressableProps, 'children' | 'style'> & {
  children?: React.ReactNode;
  style?: PressableProps['style'];
};

export function NeoShadowPressable({ style, children, ...rest }: NeoShadowPressableProps) {
  const resolveStyle = (state: PressableStateCallbackType) =>
    StyleSheet.flatten(typeof style === 'function' ? style(state) : style) as ViewStyle | undefined;

  return (
    <MotionPressable
      {...rest}
      style={(state) => {
        const resolvedStyle = resolveStyle(state);
        const borderWidth = typeof resolvedStyle?.borderWidth === 'number' ? resolvedStyle.borderWidth : 0;
        const borderColor = typeof resolvedStyle?.borderColor === 'string' ? resolvedStyle.borderColor : theme.colors.border;
        const hasNeoShadow = typeof resolvedStyle?.boxShadow === 'string' && resolvedStyle.boxShadow !== 'none';

        return [
          resolvedStyle,
          hasNeoShadow && borderWidth > 0 ? { borderWidth: 0, backgroundColor: borderColor } : null,
        ];
      }}>
      {(state) => {
        const resolvedStyle = resolveStyle(state);
        const borderWidth = typeof resolvedStyle?.borderWidth === 'number' ? resolvedStyle.borderWidth : 0;
        const borderRadius = typeof resolvedStyle?.borderRadius === 'number' ? resolvedStyle.borderRadius : 0;
        const backgroundColor = typeof resolvedStyle?.backgroundColor === 'string' ? resolvedStyle.backgroundColor : 'transparent';
        const hasNeoShadow = typeof resolvedStyle?.boxShadow === 'string' && resolvedStyle.boxShadow !== 'none';

        return (
          <>
            {hasNeoShadow && borderWidth > 0 ? (
              <InsetBorderSurface backgroundColor={backgroundColor} borderRadius={borderRadius} borderWidth={borderWidth} />
            ) : null}
            {children}
          </>
        );
      }}
    </MotionPressable>
  );
}
