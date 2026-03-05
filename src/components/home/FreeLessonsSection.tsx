import React, { useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, useWindowDimensions, View } from 'react-native';

import { pickText } from '../../mocks/home';
import { FreeLessonsData, UiLanguage } from '../../types/home';
import { theme } from '../../theme/theme';
import { AppText } from '../ui/AppText';
import { Card } from '../ui/Card';
import { Stack } from '../ui/Stack';

type FreeLessonsSectionProps = {
  data: FreeLessonsData;
  ui: UiLanguage;
};

export function FreeLessonsSection({ data, ui }: FreeLessonsSectionProps) {
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = Math.min(330, Math.round(windowWidth * 0.72));
  const cardGap = theme.spacing.sm;
  const sideInset = theme.spacing.xs;
  const [containerWidth, setContainerWidth] = useState(0);

  const trackWidth = data.cards.length * cardWidth + Math.max(0, data.cards.length - 1) * cardGap;
  const maxTranslate = Math.max(0, trackWidth - containerWidth + sideInset * 2);

  const translateX = useRef(new Animated.Value(0)).current;
  const currentXRef = useRef(0);
  const startXRef = useRef(0);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 8,
        onPanResponderGrant: () => {
          startXRef.current = currentXRef.current;
          translateX.stopAnimation();
        },
        onPanResponderMove: (_, gesture) => {
          const next = Math.max(-maxTranslate, Math.min(0, startXRef.current + gesture.dx));
          currentXRef.current = next;
          translateX.setValue(next);
        },
        onPanResponderRelease: () => {
          currentXRef.current = Math.max(-maxTranslate, Math.min(0, currentXRef.current));
          translateX.setValue(currentXRef.current);
        },
        onPanResponderTerminate: () => {
          currentXRef.current = Math.max(-maxTranslate, Math.min(0, currentXRef.current));
          translateX.setValue(currentXRef.current);
        },
      }),
    [maxTranslate, translateX]
  );

  const animatedTrackStyle = useMemo(
    () => ({
      transform: [{ translateX }],
    }),
    [translateX]
  );

  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        carouselViewport: {
          marginHorizontal: -theme.spacing.md,
          paddingHorizontal: theme.spacing.md,
          overflow: 'hidden',
        },
        cardsTrack: {
          flexDirection: 'row',
          width: trackWidth,
          paddingHorizontal: sideInset,
          gap: cardGap,
        },
        lessonCard: {
          width: cardWidth,
        },
      }),
    [cardGap, cardWidth, sideInset, trackWidth]
  );

  return (
    <Stack gap="md">
      <Stack gap="xs" style={styles.headerWrap}>
        <AppText language={ui} variant="title" style={styles.headerTitle}>
          {pickText(data.headerTitleFirst, ui)}
        </AppText>
        <AppText language={ui} variant="title" style={styles.headerTitle}>
          {pickText(data.headerTitleSecond, ui)}
        </AppText>
        <AppText language={ui} variant="muted" style={styles.headerSubtitle}>
          {pickText(data.headerSubtitle, ui)}
        </AppText>
      </Stack>

      <View
        style={dynamicStyles.carouselViewport}
        onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
        {...panResponder.panHandlers}>
        <Animated.View style={[dynamicStyles.cardsTrack, animatedTrackStyle]}>
          {data.cards.map((card) => (
            <Card
              key={card.id}
              padding="md"
              radius="lg"
              style={[dynamicStyles.lessonCard, card.comingSoon ? styles.lessonCardDisabled : styles.lessonCardEnabled]}>
              <Stack gap="xs">
                {card.comingSoon ? (
                  <View style={styles.badgeWrap}>
                    <AppText language={ui} variant="caption" style={styles.badgeText}>
                      {ui === 'th' ? 'เร็วๆนี้!' : 'COMING SOON!'}
                    </AppText>
                  </View>
                ) : null}

                <AppText language={ui} variant="caption" style={styles.levelText}>
                  {pickText(card.level, ui)}
                </AppText>
                <AppText language={ui} variant="body" style={styles.cardTitle}>
                  {pickText(card.title, ui)}
                </AppText>
                <View style={styles.imagePlaceholder}>
                  <AppText language={ui} variant="caption" style={styles.imagePlaceholderText}>
                    {pickText(card.level, ui)}
                  </AppText>
                </View>
                <AppText language={ui} variant="caption" style={styles.focusLabel}>
                  {pickText(card.focusLabel, ui)}
                </AppText>
                <AppText language={ui} variant="muted">
                  {pickText(card.description, ui)}
                </AppText>
              </Stack>
            </Card>
          ))}
        </Animated.View>
      </View>
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    width: '100%',
  },
  headerTitle: {
    fontSize: theme.typography.sizes['2xl'],
    lineHeight: theme.typography.lineHeights.xl,
    textAlign: 'left',
    fontWeight: theme.typography.weights.semibold,
  },
  headerSubtitle: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.lineHeights.md,
  },
  lessonCardEnabled: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.border,
    shadowOpacity: 0.18,
    shadowRadius: 0,
    shadowOffset: {
      width: 3,
      height: 3,
    },
    elevation: 2,
  },
  lessonCardDisabled: {
    backgroundColor: '#F3F3F3',
    opacity: 0.78,
  },
  badgeWrap: {
    alignItems: 'flex-end',
    marginBottom: theme.spacing.xs,
  },
  badgeText: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 0.5,
  },
  levelText: {
    color: theme.colors.mutedText,
    letterSpacing: 0.8,
    fontWeight: theme.typography.weights.semibold,
    textTransform: 'uppercase',
  },
  cardTitle: {
    minHeight: 44,
    fontWeight: theme.typography.weights.semibold,
    fontSize: theme.typography.sizes.lg,
    lineHeight: theme.typography.lineHeights.md,
  },
  imagePlaceholder: {
    height: 104,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  imagePlaceholderText: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.semibold,
  },
  focusLabel: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semibold,
    marginBottom: theme.spacing.xs,
  },
});
