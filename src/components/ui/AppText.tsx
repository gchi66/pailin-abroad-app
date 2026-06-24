import React from 'react';
import { StyleProp, StyleSheet, Text, TextProps, TextStyle } from 'react-native';

import { containsThaiGlyphs, ScriptLanguage, splitTextByScript } from '@/src/lib/script-aware-text';
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

export function AppText({
  variant = 'body',
  language,
  style,
  children,
  ...rest
}: AppTextProps) {
  const flattenedStyle = StyleSheet.flatten(style);
  const explicitFontFamily = flattenedStyle?.fontFamily;
  const resolvedLanguage = language ?? (containsThaiGlyphs(children) ? 'th' : 'en');
  const resolvedFontFamily = explicitFontFamily ?? theme.typography.fontFaces[resolvedLanguage][variantWeights[variant]];
  const getSegmentFontFamily = (segmentLanguage: ScriptLanguage) =>
    explicitFontFamily ?? theme.typography.fontFaces[segmentLanguage][variantWeights[variant]];

  const renderStringWithBlankRuns = (value: string, keyPrefix: string) => {
    const parts = value.split(/(_{2,})/g).filter((part) => part.length > 0);

    return parts.map((part, index) => {
      if (/^_{2,}$/.test(part)) {
        return (
          <Text key={`${keyPrefix}-blank-${index}`} style={styles.inlineBlank}>
            {'\u00A0'.repeat(12)}
          </Text>
        );
      }

      return splitTextByScript(part).map((segment, segmentIndex) => (
        <Text key={`${keyPrefix}-${index}-${segmentIndex}`} style={{ fontFamily: getSegmentFontFamily(segment.language) }}>
          {segment.text}
        </Text>
      ));
    });
  };

  const renderChildren = (node: React.ReactNode, keyPrefix: string): React.ReactNode => {
    if (typeof node === 'string' || typeof node === 'number') {
      return renderStringWithBlankRuns(String(node), keyPrefix);
    }

    if (typeof node === 'boolean' || node == null) {
      return node;
    }

    if (Array.isArray(node)) {
      return node.map((child, index) => (
        <React.Fragment key={`${keyPrefix}-${index}`}>{renderChildren(child, `${keyPrefix}-${index}`)}</React.Fragment>
      ));
    }

    if (React.isValidElement(node)) {
      const element = node as React.ReactElement<{ children?: React.ReactNode }>;

      // Preserve explicitly constructed nested Text spans as-is so callers can
      // control font family, italics, links, and other rich-text styling.
      if (element.type === Text) {
        return element;
      }

      return React.cloneElement(element, undefined, renderChildren(element.props.children, `${keyPrefix}-child`));
    }

    return node;
  };

  return (
    <Text {...rest} style={[styles.base, { fontFamily: resolvedFontFamily }, variantStyles[variant], style]}>
      {renderChildren(children, 'app-text')}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: theme.colors.text,
  },
  inlineBlank: {
    color: 'transparent',
    textDecorationLine: 'underline',
    textDecorationColor: theme.colors.text,
  },
});
