import React from 'react';
import { StyleSheet, View } from 'react-native';

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
  return (
    <Stack gap="lg">
      <Stack gap="sm">
        <AppText language={ui} variant="title" style={styles.headerTitle}>
          {pickText(data.headerTitleFirst, ui)}
        </AppText>
        <AppText language={ui} variant="title" style={styles.headerTitle}>
          {pickText(data.headerTitleSecond, ui)}
        </AppText>
        <AppText language={ui} variant="muted">
          {pickText(data.headerSubtitle, ui)}
        </AppText>
      </Stack>

      <Stack gap="md">
        {data.cards.map((card) => (
          <Card key={card.id} padding="md" radius="lg" style={styles.lessonCard}>
            <Stack gap="sm">
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
      </Stack>
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    fontSize: theme.typography.sizes.xl,
    lineHeight: theme.typography.lineHeights.lg,
  },
  lessonCard: {
    width: '100%',
  },
  badgeWrap: {
    alignItems: 'flex-end',
  },
  badgeText: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.bold,
  },
  levelText: {
    color: theme.colors.mutedText,
  },
  cardTitle: {
    fontWeight: theme.typography.weights.semibold,
  },
  imagePlaceholder: {
    height: 108,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.semibold,
  },
  focusLabel: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semibold,
  },
});
