import React, { useMemo, useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/src/components/ui/AppText';
import { theme } from '@/src/theme/theme';
import { UiLanguage } from '@/src/types/home';

type LessonConversationIntroOverlayProps = {
  language: UiLanguage;
  lessonLabel: string;
  eyebrow: string;
  title: string;
  body: string;
  hint: string;
  targetSectionIndex: number;
  sectionCount: number;
  audioUrl: string | null;
  isPlaying: boolean;
  isLoading?: boolean;
  currentMillis: number;
  durationMillis: number;
  rate: number;
  onDismiss: () => void;
  onPlay: () => void;
  onSkip: (millis: number) => void;
  onSeek: (ratio: number) => void;
  onSetRate: (rate: number) => void;
};

const rates = [0.5, 0.75, 1, 1.25, 1.5];

const formatTime = (millis: number) => {
  if (!millis || millis < 0) {
    return '0:00';
  }

  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export function LessonConversationIntroOverlay({
  language,
  lessonLabel,
  eyebrow,
  title,
  body,
  hint,
  targetSectionIndex,
  sectionCount,
  audioUrl,
  isPlaying,
  isLoading = false,
  currentMillis,
  durationMillis,
  rate,
  onDismiss,
  onPlay,
  onSkip,
  onSeek,
  onSetRate,
}: LessonConversationIntroOverlayProps) {
  const insets = useSafeAreaInsets();
  const [trackWidth, setTrackWidth] = useState(0);
  const [showRates, setShowRates] = useState(false);
  const [isBodyExpanded, setIsBodyExpanded] = useState(false);
  const [bodyCanExpand, setBodyCanExpand] = useState(false);
  const isDisabled = !audioUrl || isLoading;
  const shouldUseCompactTitle = title.trim().length > 30;
  const splitTitle = useMemo(() => {
    const match = title.trim().match(/^(.*?)(\s*\([^()]+\))$/);
    if (!match?.[1]?.trim() || !match[2]?.trim()) {
      return null;
    }

    return {
      main: match[1].trim(),
      suffix: match[2].trim(),
    };
  }, [title]);
  const progressRatio = useMemo(() => {
    if (!durationMillis || durationMillis <= 0) {
      return 0;
    }

    return Math.max(0, Math.min(1, currentMillis / durationMillis));
  }, [currentMillis, durationMillis]);

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

  return (
    <View style={[styles.overlay, { paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, theme.spacing.lg) }]}>
      <View style={styles.topBar}>
        <View style={styles.backPill}>
          <AppText language={language} variant="caption" style={styles.lessonLabel}>
            {lessonLabel}
          </AppText>
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="Close conversation intro" onPress={onDismiss} style={styles.closeButton}>
          <MaterialIcons name="close" size={20} color={theme.colors.text} />
        </Pressable>
      </View>

      <View style={[styles.content, isBodyExpanded ? styles.contentExpanded : null]}>
        <View style={styles.copyBlock}>
          <AppText language={language} variant="caption" style={styles.eyebrow}>
            {eyebrow}
          </AppText>
          <View style={styles.titleBlock}>
            <AppText
              language={language}
              variant="title"
              style={[styles.title, shouldUseCompactTitle ? styles.titleCompact : null]}>
              {splitTitle ? splitTitle.main : title}
            </AppText>
            {splitTitle ? (
              <AppText
                language={language}
                variant="title"
                style={[styles.title, styles.titleSuffix, shouldUseCompactTitle ? styles.titleSuffixCompact : null]}>
                {splitTitle.suffix}
              </AppText>
            ) : null}
          </View>
          <View style={styles.bodyWrap}>
            <AppText
              language={language}
              variant="muted"
              numberOfLines={isBodyExpanded ? undefined : 4}
              style={styles.body}>
              {body}
            </AppText>
            <AppText
              language={language}
              variant="muted"
              onTextLayout={(event) => {
                setBodyCanExpand((event.nativeEvent.lines?.length ?? 0) > 4);
              }}
              style={[styles.body, styles.bodyMeasure]}>
              {body}
            </AppText>
            {bodyCanExpand ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isBodyExpanded ? 'Collapse backstory' : 'See more backstory'}
                onPress={() => setIsBodyExpanded((previous) => !previous)}
                style={styles.bodyToggle}>
                <AppText language={language} variant="caption" style={styles.bodyToggleText}>
                  {isBodyExpanded ? (language === 'th' ? 'ซ่อน' : 'See less') : (language === 'th' ? 'ดูเพิ่ม' : 'See more')}
                </AppText>
                <MaterialIcons
                  name={isBodyExpanded ? 'expand-less' : 'expand-more'}
                  size={18}
                  color={theme.colors.mutedText}
                />
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={[styles.controlsBlock, isBodyExpanded ? styles.controlsBlockExpanded : null]}>
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
              <MaterialIcons name="replay-10" size={44} color={theme.colors.text} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'Pause audio' : 'Play audio'}
              disabled={isDisabled}
              onPress={() => {
                setShowRates(false);
                onPlay();
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
              <MaterialIcons name="forward-10" size={44} color={theme.colors.text} />
            </Pressable>
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
            <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
          </View>

          <View style={styles.metaRow}>
            <AppText language="en" variant="caption" style={styles.timeLabel}>
              {formatTime(currentMillis)}
            </AppText>

            <View style={styles.rateWrap}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Toggle playback rates"
                onPress={() => setShowRates((previous) => !previous)}
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

            <AppText language="en" variant="caption" style={styles.timeLabel}>
              {formatTime(durationMillis)}
            </AppText>
          </View>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  backPill: {
    minWidth: 72,
  },
  lessonLabel: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: theme.typography.weights.semibold,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  contentExpanded: {
    justifyContent: 'flex-start',
    paddingTop: theme.spacing.xl,
  },
  copyBlock: {
    gap: theme.spacing.md,
    alignItems: 'center',
  },
  titleBlock: {
    width: '100%',
    paddingHorizontal: theme.spacing.sm,
    alignItems: 'center',
  },
  eyebrow: {
    color: theme.colors.accent,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: theme.typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    color: theme.colors.text,
    textAlign: 'center',
    fontSize: 38,
    lineHeight: 42,
    fontWeight: theme.typography.weights.bold,
    width: '100%',
  },
  titleCompact: {
    fontSize: 32,
    lineHeight: 36,
  },
  titleSuffix: {
    marginTop: theme.spacing.md,
    fontSize: 24,
    lineHeight: 28,
  },
  titleSuffixCompact: {
    fontSize: 22,
    lineHeight: 26,
  },
  body: {
    maxWidth: 320,
    textAlign: 'center',
    color: theme.colors.mutedText,
    fontSize: 16,
    lineHeight: 24,
  },
  bodyWrap: {
    width: '100%',
    alignItems: 'center',
  },
  bodyMeasure: {
    position: 'absolute',
    opacity: 0,
    zIndex: -1,
  },
  bodyToggle: {
    marginTop: theme.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 2,
  },
  bodyToggleText: {
    color: theme.colors.mutedText,
    fontWeight: theme.typography.weights.semibold,
  },
  controlsBlock: {
    gap: theme.spacing.md,
  },
  controlsBlockExpanded: {
    marginTop: 'auto',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  skipButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainPlayButton: {
    width: 86,
    height: 86,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  playGlyphLarge: {
    width: 0,
    height: 0,
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderLeftWidth: 20,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: theme.colors.surface,
    marginLeft: 4,
  },
  pauseGlyphLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pauseBarLarge: {
    width: 6,
    height: 24,
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
  },
  progressTrack: {
    height: 4,
    borderRadius: 999,
    overflow: 'hidden',
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
    zIndex: 2,
  },
  ratePill: {
    minWidth: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semibold,
  },
  rateMenu: {
    position: 'absolute',
    bottom: 30,
    minWidth: 64,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  rateOption: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateOptionActive: {
    backgroundColor: theme.colors.accentMuted,
  },
  rateOptionText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.medium,
  },
  disabledControl: {
    opacity: 0.45,
  },
});
