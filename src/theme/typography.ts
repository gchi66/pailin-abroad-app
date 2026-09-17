import { Platform, TextStyle } from 'react-native';

import { theme } from './theme';

type Language = keyof typeof theme.typography.fontFaces;

const normalizeWeight = (weight: TextStyle['fontWeight'] | undefined): number => {
  if (typeof weight === 'number') {
    return weight;
  }

  const parsedWeight = Number.parseInt(weight ?? '', 10);
  if (Number.isFinite(parsedWeight)) {
    return parsedWeight;
  }

  return 400;
};

const getFontFaceKey = (weight: TextStyle['fontWeight'] | undefined, italic: boolean): string => {
  const normalizedWeight = normalizeWeight(weight);

  if (italic) {
    if (normalizedWeight >= 700) {
      return 'boldItalic';
    }

    if (normalizedWeight >= 600) {
      return 'semiboldItalic';
    }

    if (normalizedWeight >= 500) {
      return 'mediumItalic';
    }

    return 'italic';
  }

  if (normalizedWeight >= 900) {
    return 'black';
  }

  if (normalizedWeight >= 800) {
    return 'extraBold' in theme.typography.fontFaces.en ? 'extraBold' : 'bold';
  }

  if (normalizedWeight >= 700) {
    return 'bold';
  }

  if (normalizedWeight >= 600) {
    return 'semibold';
  }

  if (normalizedWeight >= 500) {
    return 'medium';
  }

  return 'regular';
};

const getFallbackFontFaceKey = (fontFaceKey: string, fontFaces: Record<string, string>) => {
  if (fontFaces[fontFaceKey]) {
    return fontFaceKey;
  }

  if (fontFaceKey === 'black' || fontFaceKey === 'extraBold') {
    return fontFaces.bold ? 'bold' : fontFaces.semibold ? 'semibold' : 'regular';
  }

  if (fontFaceKey === 'boldItalic') {
    return fontFaces.semiboldItalic ? 'semiboldItalic' : fontFaces.italic ? 'italic' : 'regular';
  }

  if (fontFaceKey === 'semiboldItalic') {
    return fontFaces.italic ? 'italic' : 'regular';
  }

  if (fontFaceKey === 'mediumItalic') {
    return fontFaces.italic ? 'italic' : 'regular';
  }

  if (fontFaceKey === 'medium') {
    return fontFaces.semibold ? 'semibold' : 'regular';
  }

  if (fontFaceKey === 'semibold') {
    return fontFaces.bold ? 'bold' : 'regular';
  }

  if (fontFaceKey === 'bold') {
    return fontFaces.semibold ? 'semibold' : 'regular';
  }

  return 'regular';
};

export const resolveFontFamily = (
  language: Language,
  options?: {
    italic?: boolean;
    weight?: TextStyle['fontWeight'];
  }
) => {
  const italic = options?.italic ?? false;
  const fontFaceKey = getFontFaceKey(options?.weight, italic);
  const fontFaces = theme.typography.fontFaces[language] as Record<string, string>;
  const resolvedFontFaceKey = getFallbackFontFaceKey(fontFaceKey, fontFaces);

  return fontFaces[resolvedFontFaceKey] ?? fontFaces.regular;
};

const fontWeightFromFamily = (family: string | undefined): TextStyle['fontWeight'] | undefined => {
  if (!family) return undefined;
  if (/(?:ExtraBold|Black)/i.test(family)) return '800';
  if (/Bold/i.test(family) && !/SemiBold/i.test(family)) return '700';
  if (/SemiBold/i.test(family)) return '600';
  if (/Medium/i.test(family)) return '500';
  return '400';
};

export const resolveScriptFontFamily = (
  language: Language,
  options: {
    explicitFontFamily?: string;
    weight?: TextStyle['fontWeight'];
    italic?: boolean;
  } = {}
) => {
  const { explicitFontFamily, weight, italic } = options;
  if (language === 'en' && explicitFontFamily) return explicitFontFamily;
  const isItalic = italic || /Italic/i.test(explicitFontFamily ?? '');
  if (language === 'th' && explicitFontFamily?.startsWith('Anuphan') && weight === undefined && !isItalic) {
    return explicitFontFamily;
  }
  return resolveFontFamily(language, {
    weight: weight ?? fontWeightFromFamily(explicitFontFamily),
    italic: isItalic,
  });
};

export const stripFontSynthesis = (style: TextStyle | undefined): TextStyle | undefined => {
  if (Platform.OS !== 'android' || !style) {
    return style;
  }

  const { fontStyle: _fontStyle, fontWeight: _fontWeight, ...rest } = style;
  return rest;
};
