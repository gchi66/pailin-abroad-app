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
  tapFeedback?: boolean;
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
  tapFeedback = false,
}: LessonSnippetAudioButtonProps) {
  const iconSize = Math.max(14, size - 4);
  const [showTapFeedback, setShowTapFeedback] = React.useState(false);
  const feedbackTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => () => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
  }, []);

  const flashTapFeedback = () => {
    if (!tapFeedback) return;
    setShowTapFeedback(true);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setShowTapFeedback(false), 280);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, busy: isLoading, selected: isPlaying }}
      disabled={disabled}
      hitSlop={hitSlop}
      onPressIn={tapFeedback ? flashTapFeedback : undefined}
      onPress={() => {
        flashTapFeedback();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size },
        disabled ? styles.buttonDisabled : null,
        pressed && !disabled ? styles.buttonPressed : null,
        tapFeedback && (pressed || showTapFeedback) && !disabled ? styles.buttonTapFeedback : null,
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
  buttonTapFeedback: {
    backgroundColor: '#E6F6FF',
    borderRadius: 14,
    opacity: 0.75,
    transform: [{ translateY: 2 }, { scale: 0.9 }],
  },
  icon: {
    width: 24,
    height: 24,
  },
});
