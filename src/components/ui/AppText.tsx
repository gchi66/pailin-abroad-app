import React from 'react';
import { Platform, StyleProp, StyleSheet, Text, TextProps, TextStyle } from 'react-native';

import { containsThaiGlyphs, ScriptLanguage, splitTextByScript } from '@/src/lib/script-aware-text';
import { theme } from '../../theme/theme';
import { resolveFontFamily, stripFontSynthesis } from '../../theme/typography';

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

const variantFontWeights: Record<TextVariant, TextStyle['fontWeight']> = {
  title: theme.typography.weights.semibold,
  body: theme.typography.weights.regular,
  caption: theme.typography.weights.medium,
  muted: theme.typography.weights.regular,
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
  const explicitFontWeight = flattenedStyle?.fontWeight;
  const explicitFontStyle = flattenedStyle?.fontStyle;
  const resolvedLanguage = language ?? (containsThaiGlyphs(children) ? 'th' : 'en');
  const languageFontFaces = theme.typography.fontFaces[resolvedLanguage] as Record<string, string>;
  const resolvedFontFamily =
    explicitFontFamily ??
    (Platform.OS === 'android'
      ? resolveFontFamily(resolvedLanguage, {
          italic: explicitFontStyle === 'italic',
          weight: explicitFontWeight ?? variantFontWeights[variant],
        })
      : languageFontFaces[variantWeights[variant]]);
  const getSegmentFontFamily = (segmentLanguage: ScriptLanguage) =>
    explicitFontFamily ??
    (Platform.OS === 'android'
      ? resolveFontFamily(segmentLanguage, {
          italic: explicitFontStyle === 'italic',
          weight: explicitFontWeight ?? variantFontWeights[variant],
        })
      : (theme.typography.fontFaces[segmentLanguage] as Record<string, string>)[variantWeights[variant]]);
  const sanitizedStyle = stripFontSynthesis(flattenedStyle ?? undefined);

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
    <Text {...rest} style={[styles.base, { fontFamily: resolvedFontFamily }, variantStyles[variant], sanitizedStyle]}>
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
