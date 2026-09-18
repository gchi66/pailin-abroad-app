import React from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image, Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';

const playIcon = require('../../../assets/images/speaking-coach/play-blue.png');
const pauseIcon = require('../../../assets/images/speaking-coach/pause-blue.png');

type LessonSnippetAudioButtonProps = {
  appearance?: 'default' | 'plain';
  accessibilityLabel: string;
  disabled?: boolean;
  hitSlop?: number;
  isLoading?: boolean;
  isPlaying?: boolean;
  onPress: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function LessonSnippetAudioButton({
  appearance = 'default',
  accessibilityLabel,
  disabled = false,
  hitSlop,
  isLoading = false,
  isPlaying = false,
  onPress,
  size = 28,
  style,
}: LessonSnippetAudioButtonProps) {
  const iconSize = Math.max(14, size - 4);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, busy: isLoading, selected: isPlaying }}
      disabled={disabled}
      hitSlop={hitSlop}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size },
        disabled ? styles.buttonDisabled : null,
        pressed && !disabled ? styles.buttonPressed : null,
        style,
      ]}>
      {appearance === 'plain' ? (
        <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={size} color="#91CAFF" />
      ) : (
        <Image
          source={isPlaying ? pauseIcon : playIcon}
          resizeMode="contain"
          style={[styles.icon, { width: iconSize, height: iconSize }]}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  icon: {
    width: 24,
    height: 24,
  },
});
