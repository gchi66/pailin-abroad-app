import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { theme } from '@/src/theme/theme';
import type { UiLanguage } from '@/src/types/home';

type Props = {
  language: UiLanguage;
  title: string;
  focus?: string | null;
  backstory?: string | null;
  audioUrl: string | null;
  isPlaying: boolean;
  isLoading: boolean;
  currentMillis: number;
  durationMillis: number;
  rate: number;
  onTogglePlay: () => void;
  onSkip: (millis: number) => void;
  onSeek: (ratio: number) => void;
  onSetRate: (rate: number) => void;
};

const rates = [0.5, 0.75, 1, 1.25, 1.5];

const formatTime = (millis: number) => {
  const totalSeconds = Math.max(0, Math.floor((millis || 0) / 1000));
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
};

export function LessonListenPage({
  language,
  title,
  focus,
  backstory,
  audioUrl,
  isPlaying,
  isLoading,
  currentMillis,
  durationMillis,
  rate,
  onTogglePlay,
  onSkip,
  onSeek,
  onSetRate,
}: Props) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [showRates, setShowRates] = useState(false);
  const isDisabled = !audioUrl || isLoading;
  const progressRatio = useMemo(
    () => durationMillis > 0 ? Math.max(0, Math.min(1, currentMillis / durationMillis)) : 0,
    [currentMillis, durationMillis]
  );

  const seekFromLocation = (locationX: number) => {
    if (isDisabled || trackWidth <= 0) return;
    onSeek(Math.max(0, Math.min(1, locationX / trackWidth)));
  };

  return (
    <View style={styles.card}>
      <View style={styles.peopleRow}>
        <View style={styles.avatars}>
          <View style={[styles.avatar, styles.avatarFront]}>
            <MaterialIcons name="person-outline" size={18} color={theme.colors.text} />
          </View>
          <View style={[styles.avatar, styles.avatarBack]}>
            <MaterialIcons name="person-outline" size={18} color={theme.colors.text} />
          </View>
        </View>
        <AppText language={language} style={styles.peopleLabel}>
          {language === 'th' ? 'บทสนทนา' : 'Conversation'}
        </AppText>
      </View>

      <View style={styles.copyBlock}>
        <AppText language={language} style={styles.title}>
          {title}
        </AppText>
        {focus ? (
          <AppText language={language} style={styles.focus}>
            {focus}
          </AppText>
        ) : null}
      </View>

      {backstory ? (
        <View style={styles.backstoryCard}>
          <AppText language={language} style={styles.backstory}>
            {backstory}
          </AppText>
        </View>
      ) : null}

      <View style={styles.playerBlock}>
        <View style={styles.controlsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Rewind 10 seconds"
            disabled={isDisabled}
            onPress={() => onSkip(-10000)}
            style={[styles.skipButton, isDisabled ? styles.disabled : null]}>
            <MaterialIcons name="replay-10" size={48} color={theme.colors.text} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause conversation' : 'Play conversation'}
            disabled={isDisabled}
            onPress={() => {
              setShowRates(false);
              onTogglePlay();
            }}
            style={[styles.playButton, isDisabled ? styles.disabled : null]}>
            {isLoading ? (
              <ActivityIndicator color={theme.colors.text} />
            ) : isPlaying ? (
              <View style={styles.pauseGlyph}>
                <View style={styles.pauseBar} />
                <View style={styles.pauseBar} />
              </View>
            ) : (
              <View style={styles.playGlyph} />
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Forward 10 seconds"
            disabled={isDisabled}
            onPress={() => onSkip(10000)}
            style={[styles.skipButton, isDisabled ? styles.disabled : null]}>
            <MaterialIcons name="forward-10" size={48} color={theme.colors.text} />
          </Pressable>
        </View>

        <View
          onLayout={(event: LayoutChangeEvent) => setTrackWidth(event.nativeEvent.layout.width)}
          onStartShouldSetResponder={() => !isDisabled}
          onMoveShouldSetResponder={() => !isDisabled}
          onResponderGrant={(event) => seekFromLocation(event.nativeEvent.locationX)}
          onResponderMove={(event) => seekFromLocation(event.nativeEvent.locationX)}
          style={styles.progressTrack}>
          <View style={styles.progressBase} />
          <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
        </View>

        <View style={styles.timeRow}>
          <AppText language="en" style={styles.time}>
            {formatTime(currentMillis)}
          </AppText>
          <AppText language="en" style={styles.time}>
            {formatTime(durationMillis)}
          </AppText>
        </View>

        <View style={styles.rateWrap}>
          {showRates ? (
            <View style={styles.rateMenu}>
              {rates.map((option) => (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityLabel={`Set playback speed to ${option}x`}
                  onPress={() => {
                    onSetRate(option);
                    setShowRates(false);
                  }}
                  style={[styles.rateOption, option === rate ? styles.rateOptionActive : null]}>
                  <AppText language="en" style={styles.rateOptionText}>{option}x</AppText>
                </Pressable>
              ))}
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change playback speed"
            onPress={() => setShowRates((visible) => !visible)}
            style={styles.ratePill}>
            <AppText language="en" style={styles.rateText}>{rate}x</AppText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#1E1E1E',
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
    gap: 20,
  },
  peopleRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  avatars: { width: 57, height: 32, flexDirection: 'row' },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E1E1E',
    backgroundColor: '#BDEDFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFront: { zIndex: 2 },
  avatarBack: { marginLeft: -7, backgroundColor: '#EAF6FF' },
  peopleLabel: { color: '#2864F0', fontSize: 13, lineHeight: 18 },
  copyBlock: { gap: 3 },
  title: {
    color: '#000000',
    fontFamily: theme.typography.fontFaces.en.bold,
    fontSize: 25,
    lineHeight: 29,
    letterSpacing: -0.25,
  },
  focus: { color: '#666666', fontSize: 15, lineHeight: 21 },
  backstoryCard: {
    minHeight: 75,
    borderWidth: 1,
    borderColor: '#1E1E1E',
    borderRadius: 10,
    backgroundColor: '#FFFCe5',
    paddingHorizontal: 14,
    paddingVertical: 13,
    justifyContent: 'center',
  },
  backstory: { color: theme.colors.text, fontSize: 12, lineHeight: 18 },
  playerBlock: { gap: 8, paddingTop: 4 },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    marginBottom: 14,
  },
  skipButton: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  playButton: {
    width: 97,
    height: 97,
    borderRadius: 49,
    borderWidth: 2,
    borderColor: '#1E1E1E',
    backgroundColor: '#B9E671',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E1E1E',
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  playGlyph: {
    width: 0,
    height: 0,
    borderTopWidth: 15,
    borderBottomWidth: 15,
    borderLeftWidth: 23,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: theme.colors.surface,
    marginLeft: 5,
  },
  pauseGlyph: { flexDirection: 'row', gap: 7 },
  pauseBar: { width: 7, height: 29, borderRadius: 2, backgroundColor: theme.colors.surface },
  progressTrack: {
    height: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E1E1E',
    overflow: 'hidden',
  },
  progressBase: { ...StyleSheet.absoluteFillObject, backgroundColor: '#EBF5FF' },
  progressFill: { height: '100%', borderRadius: 10, backgroundColor: '#3CBFF2' },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { color: '#3F3F3F', fontSize: 11, lineHeight: 15 },
  rateWrap: { alignItems: 'center', position: 'relative', zIndex: 3, marginTop: -2 },
  ratePill: {
    minWidth: 62,
    minHeight: 28,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#1E1E1E',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E1E1E',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  rateText: { color: theme.colors.text, fontSize: 12, lineHeight: 16 },
  rateMenu: {
    position: 'absolute',
    bottom: 34,
    borderWidth: 1,
    borderColor: '#1E1E1E',
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    padding: 4,
    overflow: 'hidden',
  },
  rateOption: { minWidth: 58, paddingHorizontal: 9, paddingVertical: 7, alignItems: 'center' },
  rateOptionActive: { backgroundColor: '#EBF5FF', borderRadius: 6 },
  rateOptionText: { color: theme.colors.text, fontSize: 11, lineHeight: 15 },
  disabled: { opacity: 0.45 },
});
