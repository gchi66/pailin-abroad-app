import { Platform, StyleSheet, ViewStyle } from 'react-native';

export const createShadow = ({
  color,
  elevation,
  offsetX,
  offsetY,
  opacity,
  radius,
}: {
  color: string;
  elevation: number;
  offsetX: number;
  offsetY: number;
  opacity: number;
  radius: number;
}): ViewStyle => ({
  shadowColor: color,
  shadowOffset: { width: offsetX, height: offsetY },
  shadowOpacity: opacity,
  shadowRadius: radius,
  elevation,
});

export const createNeoShadow = ({
  color,
  elevation,
  offset = 2,
  opacity = 1,
}: {
  color: string;
  elevation?: number;
  offset?: number;
  opacity?: number;
}): ViewStyle =>
  createShadow({
    color,
    elevation: elevation ?? Math.max(1, Math.round(offset)),
    offsetX: offset,
    offsetY: offset,
    opacity,
    radius: 0,
  });

type AndroidNeoShadowConfig = {
  borderRadius: number;
  color: string;
  offset: number;
};

export const getAndroidNeoShadowConfig = (style: ViewStyle | undefined): AndroidNeoShadowConfig | null => {
  if (Platform.OS !== 'android' || !style) {
    return null;
  }

  const flattenedStyle = StyleSheet.flatten(style);
  const offsetWidth = flattenedStyle?.shadowOffset?.width;
  const offsetHeight = flattenedStyle?.shadowOffset?.height;

  if (
    typeof offsetWidth !== 'number' ||
    typeof offsetHeight !== 'number' ||
    offsetWidth <= 0 ||
    offsetHeight <= 0 ||
    flattenedStyle?.shadowRadius !== 0 ||
    typeof flattenedStyle?.shadowOpacity !== 'number' ||
    flattenedStyle.shadowOpacity <= 0 ||
    typeof flattenedStyle?.shadowColor !== 'string'
  ) {
    return null;
  }

  return {
    borderRadius: typeof flattenedStyle.borderRadius === 'number' ? flattenedStyle.borderRadius : 0,
    color: flattenedStyle.shadowColor,
    offset: Math.max(offsetWidth, offsetHeight),
  };
};

export const stripAndroidNeoShadow = (style: ViewStyle | undefined): ViewStyle | undefined => {
  if (Platform.OS !== 'android' || !style) {
    return style;
  }

  const flattenedStyle = StyleSheet.flatten(style);
  if (!flattenedStyle) {
    return flattenedStyle;
  }

  const {
    elevation: _elevation,
    shadowColor: _shadowColor,
    shadowOffset: _shadowOffset,
    shadowOpacity: _shadowOpacity,
    shadowRadius: _shadowRadius,
    ...rest
  } = flattenedStyle;

  return rest;
};
