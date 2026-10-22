import React from 'react';
import { Platform, StyleProp, StyleSheet, Text, TextStyle, useWindowDimensions } from 'react-native';

type Props = {
  children: string;
  style: StyleProp<TextStyle>;
};

export function TranscriptEnglishText({ children, style }: Props) {
  const { fontScale } = useWindowDimensions();
  const textStyle = StyleSheet.flatten(style);
  // Fractional scaled line heights can make iOS collapse the final lines into
  // an overflowing run despite reserving their height. Keep the user's font
  // scale, but round the scaled line height to a whole point. Apply scaling
  // here so native Dynamic Type does not scale the rounded value again.
  const scaledStyle = Platform.OS === 'ios' ? {
    fontSize: (textStyle?.fontSize ?? 14) * fontScale,
    lineHeight: Math.round((textStyle?.lineHeight ?? 21) * fontScale),
  } : undefined;

  return (
    <Text allowFontScaling={Platform.OS !== 'ios'} style={[style, scaledStyle]}>
      {children}
    </Text>
  );
}
