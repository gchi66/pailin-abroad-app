import React, { forwardRef, useState } from 'react';
import {
  Pressable,
  PressableProps,
  PressableStateCallbackType,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

type MotionPressableProps = Omit<PressableProps, 'children' | 'style'> & {
  children?: PressableProps['children'];
  style?: PressableProps['style'];
  /** Disable motion for invisible hit targets such as modal backdrops. */
  motionDisabled?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * App-wide tactile press feedback. The surface moves as one piece, so its
 * border and shadow styling are never rewritten or compressed.
 */
export const MotionPressable = forwardRef<View, MotionPressableProps>(function MotionPressable(
  {
    children,
    disabled,
    motionDisabled = false,
    onPressIn,
    onPressOut,
    style,
    ...rest
  },
  ref
) {
  const [pressed, setPressed] = useState(false);
  const progress = useSharedValue(0);
  const state: PressableStateCallbackType = { pressed, hovered: false };
  // Legacy press callbacks used several different opacity/transform recipes.
  // Resolve the resting visual style here; this component owns the one shared
  // tactile treatment while children can still react to the real press state.
  const restingState: PressableStateCallbackType = { pressed: false, hovered: false };
  const resolvedStyle = StyleSheet.flatten(
    typeof style === 'function' ? style(restingState) : style
  ) as ViewStyle | undefined;
  const baseTransform = resolvedStyle?.transform ?? [];
  const baseOpacity = typeof resolvedStyle?.opacity === 'number' ? resolvedStyle.opacity : 1;
  const styleWithoutTransform = resolvedStyle
    ? Object.fromEntries(Object.entries(resolvedStyle).filter(([key]) => key !== 'transform')) as ViewStyle
    : undefined;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      ...baseTransform,
      { translateX: progress.value * 2 },
      { translateY: progress.value * 2 },
      { scale: 1 - progress.value * 0.015 },
    ],
    opacity: baseOpacity * (1 - progress.value * 0.1),
  } as ViewStyle), [baseOpacity, baseTransform]);

  const shouldAnimate = !disabled && !motionDisabled;

  return (
    <AnimatedPressable
      {...rest}
      ref={ref}
      disabled={disabled}
      onPressIn={(event) => {
        setPressed(true);
        if (shouldAnimate) {
          progress.value = withTiming(1, { duration: 90, reduceMotion: ReduceMotion.System });
        }
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        if (shouldAnimate) {
          progress.value = withSpring(0, {
            stiffness: 350,
            damping: 24,
            reduceMotion: ReduceMotion.System,
          });
        }
        onPressOut?.(event);
      }}
      style={[styleWithoutTransform, shouldAnimate ? animatedStyle : baseTransform.length ? { transform: baseTransform } : null]}>
      {typeof children === 'function' ? children(state) : children}
    </AnimatedPressable>
  );
});
