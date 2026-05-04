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
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },
  body: {
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.lineHeights.md,
    fontWeight: theme.typography.weights.regular,
    color: theme.colors.text,
  },
  caption: {
    fontSize: theme.typography.sizes.sm,
    lineHeight: theme.typography.lineHeights.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },
  muted: {
    fontSize: theme.typography.sizes.sm,
    lineHeight: theme.typography.lineHeights.sm,
    fontWeight: theme.typography.weights.regular,
    color: theme.colors.mutedText,
  },
};

const fontFamilyStyles: Record<Language, TextStyle> = {
  en: {
    fontFamily: theme.typography.fonts.en,
  },
  th: {
    fontFamily: theme.typography.fonts.th,
  },
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

  return (
    <Text {...rest} style={[styles.base, fontFamilyStyles[resolvedLanguage], variantStyles[variant], style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: theme.colors.text,
  },
});
