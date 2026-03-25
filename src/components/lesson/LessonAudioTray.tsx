import React, { useMemo, useState } from 'react';
import { Image, LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';

import adjustVolumeIcon from '@/assets/images/adjust-volume-audio-lesson.webp';
import forwardIcon from '@/assets/images/forward-audio-10-seconds.webp';
import pauseIcon from '@/assets/images/pause-audio-lesson.webp';
import playIcon from '@/assets/images/play-audio-lesson.webp';
import rewindIcon from '@/assets/images/rewind-audio-10-seconds.webp';
import { AppText } from '@/src/components/ui/AppText';
import { theme } from '@/src/theme/theme';
import { UiLanguage } from '@/src/types/home';

type LessonAudioTrayProps = {
  language: UiLanguage;
  title: string;
  subtitle?: string | null;
  statusLabel: string;
  audioUrl: string | null;
  isPlaying: boolean;
  isLoading?: boolean;
  currentMillis: number;
  durationMillis: number;
  rate: number;
  onTogglePlay: () => void;
  onSkip: (millis: number) => void;
  onSeek: (ratio: number) => void;
  onSetRate: (rate: number) => void;
};

const formatTime = (millis: number) => {
  if (!millis || millis < 0) {
    return '0:00';
  }

  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export function LessonAudioTray({
  language,
  title,
  subtitle,
  statusLabel,
  audioUrl,
  isPlaying,
  isLoading = false,
  currentMillis,
  durationMillis,
  rate,
  onTogglePlay,
  onSkip,
  onSeek,
  onSetRate,
}: LessonAudioTrayProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showRates, setShowRates] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);
  const rates = [0.5, 0.75, 1, 1.25, 1.5];

  const progressRatio = useMemo(() => {
    if (!durationMillis || durationMillis <= 0) {
      return 0;
    }

    return Math.max(0, Math.min(1, currentMillis / durationMillis));
  }, [currentMillis, durationMillis]);

  const playIconSource = isPlaying ? pauseIcon : playIcon;
  const isDisabled = !audioUrl || isLoading;
  const trackFillStyle = { width: `${progressRatio * 100}%` as const };
  const trackKnobStyle = { left: `${progressRatio * 100}%` as const };

  const handleTrackLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const seekFromLocation = (locationX: number) => {
    if (isDisabled || trackWidth <= 0) {
      return;
    }

    const ratio = Math.max(0, Math.min(1, locationX / trackWidth));
    onSeek(ratio);
  };

  const handleToggleCollapsed = () => {
    setIsCollapsed((previous) => {
      const next = !previous;
      if (next) {
        setShowRates(false);
      }
      return next;
    });
  };

  return (
    <View style={styles.shell}>
      <View style={[styles.card, isCollapsed ? styles.cardCollapsed : null]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isCollapsed ? 'Expand audio controls' : 'Collapse audio controls'}
          onPress={handleToggleCollapsed}
          style={styles.handleHitArea}>
          <View style={[styles.handle, isCollapsed ? styles.handleCollapsed : null]} />
        </Pressable>

        <Pressable
          accessibilityRole={isCollapsed ? 'button' : undefined}
          disabled={!isCollapsed}
          onPress={() => {
            if (isCollapsed) {
              setIsCollapsed(false);
            }
          }}
          style={styles.topRow}>
          <View style={styles.copyBlock}>
            <AppText language={language} variant="caption" style={styles.statusLabel}>
              {statusLabel}
            </AppText>
            <AppText language={language} variant="body" style={styles.title} numberOfLines={1}>
              {title}
            </AppText>
            {!isCollapsed && subtitle ? (
              <AppText language={language} variant="muted" style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </AppText>
            ) : null}
          </View>

          <View style={styles.topRowRight}>
            <View style={styles.volumeWrap}>
              <Image source={adjustVolumeIcon} style={styles.volumeIcon} resizeMode="contain" />
            </View>
            {isCollapsed ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isPlaying ? 'Pause audio' : 'Play audio'}
                disabled={isDisabled}
                onPress={() => {
                  setShowRates(false);
                  onTogglePlay();
                }}
                style={[styles.playButtonCollapsed, isDisabled ? styles.disabledControl : null]}>
                <Image source={playIconSource} style={styles.playIconCollapsed} resizeMode="contain" />
              </Pressable>
            ) : null}
          </View>
        </Pressable>

        {!isCollapsed ? (
          <>
            <View style={styles.controlsRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Rewind 10 seconds"
                disabled={isDisabled}
                onPress={() => {
                  setShowRates(false);
                  onSkip(-10000);
                }}
                style={[styles.iconButton, isDisabled ? styles.disabledControl : null]}>
                <Image source={rewindIcon} style={styles.secondaryIcon} resizeMode="contain" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isPlaying ? 'Pause audio' : 'Play audio'}
                disabled={isDisabled}
                onPress={() => {
                  setShowRates(false);
                  onTogglePlay();
                }}
                style={[styles.playButton, isDisabled ? styles.disabledControl : null]}>
                <Image source={playIconSource} style={styles.playIcon} resizeMode="contain" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Forward 10 seconds"
                disabled={isDisabled}
                onPress={() => {
                  setShowRates(false);
                  onSkip(10000);
                }}
                style={[styles.iconButton, isDisabled ? styles.disabledControl : null]}>
                <Image source={forwardIcon} style={styles.secondaryIcon} resizeMode="contain" />
              </Pressable>
            </View>

            <View style={styles.progressMetaRow}>
              <AppText language="en" variant="caption" style={styles.timeLabel}>
                {formatTime(currentMillis)}
              </AppText>
              <View style={styles.progressRightMeta}>
                <View style={styles.rateGroup}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Toggle playback rates"
                    onPress={() => setShowRates((previous) => !previous)}
                    style={styles.rateButton}>
                    <AppText language="en" variant="caption" style={styles.rateButtonText}>
                      {rate}x
                    </AppText>
                  </Pressable>

                  {showRates ? (
                    <View style={styles.rateOptions}>
                      {rates
                        .filter((option) => option !== rate)
                        .map((option) => (
                          <Pressable
                            key={option}
                            accessibilityRole="button"
                            accessibilityLabel={`Set playback rate to ${option}x`}
                            onPress={() => {
                              onSetRate(option);
                              setShowRates(false);
                            }}
                            style={styles.rateOptionButton}>
                            <AppText language="en" variant="caption" style={styles.rateOptionText}>
                              {option}x
                            </AppText>
                          </Pressable>
                        ))}
                    </View>
                  ) : null}
                </View>

                <AppText language="en" variant="caption" style={styles.timeLabel}>
                  {formatTime(durationMillis)}
                </AppText>
              </View>
            </View>

            <View
              onLayout={handleTrackLayout}
              onStartShouldSetResponder={() => !isDisabled}
              onMoveShouldSetResponder={() => !isDisabled}
              onResponderGrant={(event) => {
                setShowRates(false);
                seekFromLocation(event.nativeEvent.locationX);
              }}
              onResponderMove={(event) => {
                setShowRates(false);
                seekFromLocation(event.nativeEvent.locationX);
              }}
              style={styles.trackRow}>
              <View style={styles.track} />
              <View style={[styles.trackFill, trackFillStyle]} />
              <View style={[styles.trackKnob, trackKnobStyle]} />
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  cardCollapsed: {
    paddingTop: 4,
    paddingBottom: theme.spacing.sm,
  },
  handleHitArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: theme.radii.xl,
    backgroundColor: '#D9D9D9',
    marginBottom: theme.spacing.sm,
  },
  handleCollapsed: {
    marginBottom: theme.spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  topRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  copyBlock: {
    flex: 1,
    gap: 2,
  },
  statusLabel: {
    color: theme.colors.primary,
    textTransform: 'uppercase',
    fontWeight: theme.typography.weights.semibold,
  },
  title: {
    fontWeight: theme.typography.weights.semibold,
  },
  subtitle: {
    color: theme.colors.mutedText,
  },
  volumeWrap: {
    width: 36,
    height: 36,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  volumeIcon: {
    width: 18,
    height: 18,
  },
  playButtonCollapsed: {
    width: 36,
    height: 36,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accentSurface,
  },
  playIconCollapsed: {
    width: 16,
    height: 16,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.accentSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledControl: {
    opacity: 0.45,
  },
  playIcon: {
    width: 22,
    height: 22,
  },
  secondaryIcon: {
    width: 26,
    height: 26,
  },
  progressMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: theme.spacing.xs,
  },
  progressRightMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  rateGroup: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  rateButton: {
    minWidth: 48,
    height: 28,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  rateButtonText: {
    fontWeight: theme.typography.weights.semibold,
  },
  rateOptions: {
    position: 'absolute',
    bottom: 34,
    right: 0,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xs,
    gap: theme.spacing.xs,
    minWidth: 68,
  },
  rateOptionButton: {
    minHeight: 28,
    borderRadius: theme.radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.sm,
  },
  rateOptionText: {
    fontWeight: theme.typography.weights.medium,
  },
  timeLabel: {
    color: theme.colors.mutedText,
  },
  trackRow: {
    height: 12,
    borderRadius: theme.radii.xl,
    backgroundColor: '#E7EDF5',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  track: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E7EDF5',
  },
  trackFill: {
    height: '100%',
    backgroundColor: theme.colors.text,
    borderRadius: theme.radii.xl,
  },
  trackKnob: {
    position: 'absolute',
    top: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.text,
    transform: [{ translateX: -9 }],
  },
});
