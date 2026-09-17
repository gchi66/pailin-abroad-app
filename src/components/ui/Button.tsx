import React, { useState } from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  TextStyle,
  ViewStyle,
} from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { theme } from '../../theme/theme';
import { AppText } from './AppText';

type ButtonVariant = 'primary' | 'outline';

type ButtonProps = Omit<PressableProps, 'style'> & {
  title: string;
  leadingIcon?: React.ReactNode;
  variant?: ButtonVariant;
  language?: 'en' | 'th';
  style?: StyleProp<ViewStyle>;
  disabledStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.border,
  },
  outline: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
};

const textVariantStyles: Record<ButtonVariant, TextStyle> = {
  primary: {
    color: theme.colors.surface,
  },
  outline: {
    color: theme.colors.text,
  },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  title,
  leadingIcon,
  variant = 'primary',
  language = 'en',
  disabled,
  style,
  disabledStyle,
  textStyle,
  onPressIn,
  onPressOut,
  ...rest
}: ButtonProps) {
  const [pressed, setPressed] = useState(false);
  const pressProgress = useSharedValue(0);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: pressProgress.value * 2 },
      { translateY: pressProgress.value * 2 },
      { scale: 1 - pressProgress.value * 0.015 },
    ],
  }));
  const resolvedBaseStyle = StyleSheet.flatten([styles.base, variantStyles[variant], style]) as ViewStyle;
  const pressedShadow = typeof resolvedBaseStyle.boxShadow === 'string'
    ? resolvedBaseStyle.boxShadow.replace(/^(-?\d+(?:\.\d+)?)px\s+(-?\d+(?:\.\d+)?)px/, '1px 1px')
    : null;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={disabled}
      onPressIn={(event) => {
        setPressed(true);
        pressProgress.value = withTiming(1, { duration: 90, reduceMotion: ReduceMotion.System });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        pressProgress.value = withSpring(0, { stiffness: 350, damping: 24, reduceMotion: ReduceMotion.System });
        onPressOut?.(event);
      }}
      style={[
        resolvedBaseStyle,
        pressed && !disabled && pressedShadow ? { boxShadow: pressedShadow } : null,
        pressed && !disabled ? styles.pressed : null,
        disabled ? [styles.disabled, disabledStyle] : null,
        pressStyle,
      ]}
      {...rest}>
      {leadingIcon}
      <AppText language={language} variant="caption" style={[styles.label, textVariantStyles[variant], textStyle]}>
        {title}
      </AppText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: theme.radii.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  label: {
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.lineHeights.md,
    fontWeight: theme.typography.weights.semibold,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.6,
  },
});
