import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { theme } from '@/src/theme/theme';

const playIcon = require('../../../assets/images/snippet_play_button.png');
const pauseIcon = require('../../../assets/images/blue-pause-button.webp');

type LessonSnippetAudioButtonProps = {
  accessibilityLabel: string;
  disabled?: boolean;
  isLoading?: boolean;
  isPlaying?: boolean;
  onPress: () => void;
};

export function LessonSnippetAudioButton({
  accessibilityLabel,
  disabled = false,
  isLoading = false,
  isPlaying = false,
  onPress,
}: LessonSnippetAudioButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, busy: isLoading, selected: isPlaying }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        disabled ? styles.buttonDisabled : null,
        pressed && !disabled ? styles.buttonPressed : null,
      ]}>
      <Image source={isPlaying ? pauseIcon : playIcon} resizeMode="contain" style={styles.icon} />
      {isLoading ? <View style={styles.loadingDot} /> : null}
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
  loadingDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
