import React from 'react';
import { StyleProp, StyleSheet, Text, TextProps, TextStyle } from 'react-native';

import { theme } from '../../theme/theme';

type TextVariant = 'title' | 'body' | 'caption' | 'muted';
type Language = 'en' | 'th';

type AppTextProps = TextProps & {
  variant?: TextVariant;
  language?: Language;
  style?: StyleProp<TextStyle>;
};

const variantStyles: Record<TextVariant, TextStyle> = {
  title: {
    fontSize: theme.typography.sizes.xl,
    lineHeight: theme.typography.lineHeights.xl,
    color: theme.colors.text,
  },
  body: {
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.lineHeights.md,
    color: theme.colors.text,
  },
  caption: {
    fontSize: theme.typography.sizes.sm,
    lineHeight: theme.typography.lineHeights.sm,
    color: theme.colors.text,
  },
  muted: {
    fontSize: theme.typography.sizes.sm,
    lineHeight: theme.typography.lineHeights.sm,
    color: theme.colors.mutedText,
  },
};

const variantWeights: Record<TextVariant, keyof typeof theme.typography.fontFaces.en> = {
  title: 'semibold',
  body: 'regular',
  caption: 'medium',
  muted: 'regular',
};

const THAI_SCRIPT_PATTERN = /[\u0E00-\u0E7F]/;

function containsThaiGlyphs(node: React.ReactNode): boolean {
  if (typeof node === 'string') {
    return THAI_SCRIPT_PATTERN.test(node);
  }

  if (typeof node === 'number' || typeof node === 'boolean' || node == null) {
    return false;
  }

  if (Array.isArray(node)) {
    return node.some((child) => containsThaiGlyphs(child));
  }

  if (React.isValidElement(node)) {
    return containsThaiGlyphs((node.props as { children?: React.ReactNode }).children);
  }

  return false;
}

export function AppText({
  variant = 'body',
  language,
  style,
  children,
  ...rest
}: AppTextProps) {
  const resolvedLanguage = language ?? (containsThaiGlyphs(children) ? 'th' : 'en');
  const resolvedFontFamily = theme.typography.fontFaces[resolvedLanguage][variantWeights[variant]];

  return (
    <Text {...rest} style={[styles.base, { fontFamily: resolvedFontFamily }, variantStyles[variant], style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: theme.colors.text,
  },
});
