import React, { useEffect } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  FadeInUp,
  FadeOutUp,
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export function AnimatedPlusMinus({
  color = '#222222',
  expanded,
  size = 18,
}: {
  color?: string;
  expanded: boolean;
  size?: number;
}) {
  const progress = useSharedValue(expanded ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, {
      duration: 180,
      reduceMotion: ReduceMotion.System,
    });
  }, [expanded, progress]);

  const verticalStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ scaleY: 1 - progress.value }],
  }));
  const thickness = Math.max(1.5, Math.round(size / 10));

  return (
    <View accessibilityElementsHidden importantForAccessibility="no" style={{ width: size, height: size }}>
      <View style={[styles.iconBar, { width: size, height: thickness, top: (size - thickness) / 2, backgroundColor: color }]} />
      <Animated.View
        style={[
          styles.iconBar,
          { width: thickness, height: size, left: (size - thickness) / 2, backgroundColor: color },
          verticalStyle,
        ]}
      />
    </View>
  );
}

export function DisclosureContent({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View
      entering={FadeInUp.duration(180).reduceMotion(ReduceMotion.System)}
      exiting={FadeOutUp.duration(130).reduceMotion(ReduceMotion.System)}
      layout={LinearTransition.duration(180).reduceMotion(ReduceMotion.System)}
      style={style}>
      {children}
    </Animated.View>
  );
}

export function FeedbackEntrance({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View
      entering={FadeInUp.duration(220).reduceMotion(ReduceMotion.System)}
      style={style}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  iconBar: {
    position: 'absolute',
    borderRadius: 999,
  },
});
