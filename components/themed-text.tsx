import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { theme } from '@/src/theme/theme';
import { resolveFontFamily, stripFontSynthesis } from '@/src/theme/typography';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const flattenedStyle = StyleSheet.flatten(style);
  const sanitizedStyle = stripFontSynthesis(flattenedStyle ?? undefined);
  const androidResolvedFontFamily =
    Platform.OS === 'android' && !flattenedStyle?.fontFamily
      ? resolveFontFamily('en', {
          italic: flattenedStyle?.fontStyle === 'italic',
          weight: flattenedStyle?.fontWeight,
        })
      : undefined;

  return (
    <Text
      style={[
        { color },
        androidResolvedFontFamily ? { fontFamily: androidResolvedFontFamily } : undefined,
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        sanitizedStyle,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: theme.typography.fontFaces.en.regular,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: theme.typography.fontFaces.en.semibold,
  },
  title: {
    fontSize: 32,
    lineHeight: 32,
    fontFamily: theme.typography.fontFaces.en.bold,
  },
  subtitle: {
    fontSize: 20,
    fontFamily: theme.typography.fontFaces.en.bold,
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: '#0a7ea4',
    fontFamily: theme.typography.fontFaces.en.regular,
  },
});
