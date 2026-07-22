import React, { useEffect, useMemo, useRef, useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  Animated,
  LayoutChangeEvent,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

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
  autoCollapseSignal?: string | null;
  autoExpandSignal?: string | null;
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

const rates = [0.5, 0.75, 1, 1.25, 1.5];
const RATE_MENU_WIDTH = 68;
const RATE_OPTION_HEIGHT = 44;
const RATE_MENU_GAP = 4;
const RATE_MENU_PADDING = 4;
const ANDROID_BOTTOM_BUFFER = 16;

export function LessonAudioTray({
  language,
  title,
  subtitle,
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
  autoCollapseSignal = null,
  autoExpandSignal = null,
}: LessonAudioTrayProps) {
  const usesFloatingRateMenu = Platform.OS === 'android' || Platform.OS === 'ios';
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showRates, setShowRates] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);
  const pulse = useRef(new Animated.Value(1)).current;
  const dragTranslateY = useRef(new Animated.Value(0)).current;

  const progressRatio = useMemo(() => {
    if (!durationMillis || durationMillis <= 0) {
      return 0;
    }

    return Math.max(0, Math.min(1, currentMillis / durationMillis));
  }, [currentMillis, durationMillis]);

  const isDisabled = !audioUrl || isLoading;
  const trackFillStyle = { width: `${progressRatio * 100}%` as const };

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 850,
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();

    return () => {
      loop.stop();
    };
  }, [pulse]);

  useEffect(() => {
    if (!autoCollapseSignal) {
      return;
    }

    setIsCollapsed(true);
    setShowRates(false);
    dragTranslateY.setValue(0);
  }, [autoCollapseSignal, dragTranslateY]);

  useEffect(() => {
    if (!autoExpandSignal) {
      return;
    }

    setIsCollapsed(false);
    setShowRates(false);
    dragTranslateY.setValue(0);
  }, [autoExpandSignal, dragTranslateY]);

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

  const animateDragReset = () => {
    Animated.spring(dragTranslateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 20,
    }).start();
  };

  const setCollapsedState = (next: boolean) => {
    setIsCollapsed(next);
    if (next) {
      setShowRates(false);
    }
    animateDragReset();
  };

  const handleToggleCollapsed = () => {
    setCollapsedState(!isCollapsed);
  };

  const handleToggleRates = () => {
    setShowRates((previous) => !previous);
  };

  const trayPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > 8 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          Math.abs(gestureState.dy) > 6 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderGrant: () => {
          setShowRates(false);
        },
        onPanResponderMove: (_, gestureState) => {
          const maxDrag = 72;
          const constrainedDrag = isCollapsed
            ? Math.max(-maxDrag, Math.min(0, gestureState.dy))
            : Math.max(0, Math.min(maxDrag, gestureState.dy));

          dragTranslateY.setValue(constrainedDrag);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (!isCollapsed && gestureState.dy > 36) {
            setCollapsedState(true);
            return;
          }

          if (isCollapsed && gestureState.dy < -36) {
            setCollapsedState(false);
            return;
          }

          animateDragReset();
        },
        onPanResponderTerminate: () => {
          animateDragReset();
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [dragTranslateY, isCollapsed]
  );

  const playButtonLabel = isPlaying ? 'Pause audio' : 'Play audio';
  const collapseLabel = isCollapsed ? 'Expand audio controls' : 'Collapse audio controls';

  const trayContent = (
    <>
      <View
        {...trayPanResponder.panHandlers}
        style={styles.handleHitArea}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={collapseLabel}
          onPress={handleToggleCollapsed}
          style={styles.handlePressable}>
          <View style={styles.handle} />
        </Pressable>
      </View>

      {isCollapsed ? (
        <View
          {...trayPanResponder.panHandlers}
          style={styles.collapsedRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Expand audio controls"
            onPress={() => setCollapsedState(false)}
            style={styles.collapsedRowPressable}>
            <Animated.View style={[styles.liveDot, { opacity: pulse }]} />

            <AppText language={language} variant="body" style={styles.collapsedTitle} numberOfLines={1}>
              {title}
            </AppText>

            <View style={styles.collapsedActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={playButtonLabel}
                disabled={isDisabled}
                onPress={onTogglePlay}
                style={[styles.collapsedPlayButton, isDisabled ? styles.disabledControl : null]}>
                <View style={styles.playButtonInner}>
                  {isPlaying ? (
                    <View style={styles.pauseGlyph}>
                      <View style={styles.pauseBar} />
                      <View style={styles.pauseBar} />
                    </View>
                  ) : (
                    <View style={styles.playGlyph} />
                  )}
                </View>
              </Pressable>
            </View>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.expandedWrap, usesFloatingRateMenu ? styles.expandedWrapAndroid : null]}>
          <View {...trayPanResponder.panHandlers}>
            <View style={styles.expandedTopRow}>
              <View
                style={[
                  styles.copyBlock,
                  usesFloatingRateMenu && showRates ? styles.copyBlockRateMenuOpenAndroid : null,
                ]}>
                <AppText language={language} variant="body" style={styles.trackTitle} numberOfLines={1}>
                  {title}
                </AppText>
                {subtitle ? (
                  <AppText language={language} variant="muted" style={styles.trackSubtitle} numberOfLines={1}>
                    {subtitle}
                  </AppText>
                ) : null}
              </View>

            </View>
          </View>

          <View style={styles.controlsRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Rewind 10 seconds"
              disabled={isDisabled}
              onPress={() => {
                setShowRates(false);
                onSkip(-10000);
              }}
              style={[styles.skipButton, isDisabled ? styles.disabledControl : null]}>
              <MaterialIcons name="replay-10" size={34} color={theme.colors.text} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={playButtonLabel}
              disabled={isDisabled}
              onPress={() => {
                setShowRates(false);
                onTogglePlay();
              }}
              style={[styles.mainPlayButton, isDisabled ? styles.disabledControl : null]}>
              {isPlaying ? (
                <View style={styles.pauseGlyphLarge}>
                  <View style={styles.pauseBarLarge} />
                  <View style={styles.pauseBarLarge} />
                </View>
              ) : (
                <View style={styles.playGlyphLarge} />
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Forward 10 seconds"
              disabled={isDisabled}
              onPress={() => {
                setShowRates(false);
                onSkip(10000);
              }}
              style={[styles.skipButton, isDisabled ? styles.disabledControl : null]}>
              <MaterialIcons name="forward-10" size={34} color={theme.colors.text} />
            </Pressable>

            {usesFloatingRateMenu ? (
              <View style={styles.rateControlsWrapAndroid}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Toggle playback rates"
                  accessibilityState={{ expanded: showRates }}
                  hitSlop={6}
                  onPress={handleToggleRates}
                  style={({ pressed }) => [styles.ratePillAndroid, pressed ? styles.ratePillPressed : null]}>
                  <AppText language="en" variant="caption" style={styles.rateTextAndroid}>
                    {rate}x
                  </AppText>
                </Pressable>
              </View>
            ) : null}
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
            style={styles.progressTrack}>
            <View style={styles.progressTrackBase} />
            <View style={[styles.progressFill, trackFillStyle]} />
          </View>

          <View style={styles.metaRow}>
            <AppText language="en" variant="caption" style={styles.timeLabel}>
              {formatTime(currentMillis)}
            </AppText>

            {!usesFloatingRateMenu ? (
              <View style={styles.rateWrap}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Toggle playback rates"
                  onPress={handleToggleRates}
                  style={styles.ratePill}>
                  <AppText language="en" variant="caption" style={styles.rateText}>
                    {rate}x
                  </AppText>
                </Pressable>

                {showRates ? (
                  <View style={styles.rateMenu}>
                    {rates.map((option) => (
                      <Pressable
                        key={option}
                        accessibilityRole="button"
                        accessibilityLabel={`Set playback rate to ${option}x`}
                        onPress={() => {
                          onSetRate(option);
                          setShowRates(false);
                        }}
                        style={[styles.rateOption, option === rate ? styles.rateOptionActive : null]}>
                        <AppText language="en" variant="caption" style={styles.rateOptionText}>
                          {option}x
                        </AppText>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}

            <AppText language="en" variant="caption" style={styles.timeLabel}>
              {formatTime(durationMillis)}
            </AppText>
          </View>
        </View>
      )}

    </>
  );

  return (
    <Animated.View
      style={[
        styles.shell,
        usesFloatingRateMenu ? styles.shellAndroid : null,
        { transform: [{ translateY: dragTranslateY }] },
      ]}>
      {usesFloatingRateMenu ? (
        <View style={styles.shellContentAndroid}>{trayContent}</View>
      ) : (
        trayContent
      )}

      {usesFloatingRateMenu && showRates ? (
        <View style={styles.rateMenuAndroid}>
          {rates.map((option) => (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityLabel={`Set playback rate to ${option}x`}
              onPress={() => {
                onSetRate(option);
                setShowRates(false);
              }}
              style={({ pressed }) => [
                styles.rateOptionAndroid,
                option === rate ? styles.rateOptionActive : null,
                pressed ? styles.ratePillPressed : null,
              ]}>
              <AppText language="en" variant="caption" style={styles.rateOptionTextAndroid}>
                {option}x
              </AppText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: 'transparent',
    paddingTop: 8,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  shellAndroid: {
    paddingTop: 0,
    paddingBottom: ANDROID_BOTTOM_BUFFER,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'visible',
  },
  shellContentAndroid: {
    backgroundColor: 'transparent',
    paddingTop: 8,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  handleHitArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 1,
    paddingBottom: 6,
    minHeight: 18,
  },
  handlePressable: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 18,
    alignSelf: 'stretch',
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D0D0D0',
  },
  expandedWrap: {
    backgroundColor: theme.colors.surface,
    gap: 8,
    paddingHorizontal: 10,
    paddingBottom: 6,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  expandedWrapAndroid: {
    backgroundColor: 'transparent',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  expandedTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  copyBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    paddingHorizontal: 4,
  },
  copyBlockRateMenuOpenAndroid: {
    paddingRight: RATE_MENU_WIDTH + 16,
  },
  trackTitle: {
    flexShrink: 1,
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: theme.typography.weights.bold,
  },
  trackSubtitle: {
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 15,
  },
  rateControlsWrapAndroid: {
    position: 'absolute',
    right: 0,
    top: 4,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratePillAndroid: {
    width: 44,
    height: 36,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateTextAndroid: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: theme.typography.weights.bold,
  },
  ratePillPressed: {
    opacity: 0.65,
  },
  collapsedRow: {
    backgroundColor: theme.colors.surface,
    width: '100%',
    paddingHorizontal: 10,
    paddingBottom: 6,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  collapsedRowPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 3,
    paddingBottom: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: theme.colors.accent,
  },
  collapsedTitle: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: theme.typography.weights.bold,
  },
  collapsedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  collapsedPlayButton: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingTop: 4,
  },
  skipButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainPlayButton: {
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playGlyph: {
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderLeftWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: theme.colors.surface,
    marginLeft: 1,
  },
  playGlyphLarge: {
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderLeftWidth: 11,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: theme.colors.surface,
    marginLeft: 2,
  },
  pauseGlyph: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  pauseBar: {
    width: 3,
    height: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
  },
  pauseGlyphLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pauseBarLarge: {
    width: 4,
    height: 14,
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
  },
  progressTrack: {
    height: 4,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressTrackBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.accentMuted,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: theme.colors.accent,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeLabel: {
    color: theme.colors.mutedText,
    fontSize: 11,
    lineHeight: 13,
  },
  rateWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  ratePill: {
    minWidth: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.accentMuted,
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateText: {
    color: theme.colors.text,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: theme.typography.weights.bold,
  },
  rateMenu: {
    position: 'absolute',
    bottom: 26,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    padding: 4,
    gap: 4,
  },
  rateOption: {
    minWidth: 48,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateOptionActive: {
    backgroundColor: theme.colors.accentMuted,
  },
  rateOptionText: {
    color: theme.colors.text,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: theme.typography.weights.medium,
  },
  rateMenuAndroid: {
    position: 'absolute',
    right: 10,
    bottom: 86,
    width: RATE_MENU_WIDTH,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    padding: RATE_MENU_PADDING,
    gap: RATE_MENU_GAP,
    elevation: 24,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  rateOptionAndroid: {
    width: '100%',
    height: RATE_OPTION_HEIGHT,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateOptionTextAndroid: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: theme.typography.weights.semibold,
  },
  disabledControl: {
    opacity: 0.45,
  },
});
