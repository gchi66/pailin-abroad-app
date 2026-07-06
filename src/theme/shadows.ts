import { ViewStyle } from 'react-native';

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
