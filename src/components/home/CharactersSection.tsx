import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { pickText } from '../../mocks/home';
import { CharactersData, UiLanguage } from '../../types/home';
import { theme } from '../../theme/theme';
import { AppText } from '../ui/AppText';
import { Card } from '../ui/Card';
import { Stack } from '../ui/Stack';

type CharactersSectionProps = {
  data: CharactersData;
  ui: UiLanguage;
};

export function CharactersSection({ data, ui }: CharactersSectionProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = useMemo(() => data.entries[selectedIndex] ?? data.entries[0], [data.entries, selectedIndex]);

  return (
    <Card padding="lg" radius="lg" style={styles.card}>
      <Stack gap="md">
        <AppText language={ui} variant="title" style={styles.title}>
          {pickText(data.title, ui)}
        </AppText>
        <Stack gap="sm" style={styles.selectedWrap}>
          <View style={styles.heroAvatar}>
            <AppText language={ui} variant="title" style={styles.heroAvatarText}>
              {pickText(selected.name, ui).slice(0, 2).toUpperCase()}
            </AppText>
          </View>
          <AppText language={ui} variant="body" style={styles.characterName}>
            {pickText(selected.name, ui)}
          </AppText>
          <AppText language={ui} variant="muted" style={styles.characterDescription}>
            {pickText(selected.description, ui)}
          </AppText>
        </Stack>
        <Stack direction="horizontal" gap="sm" style={styles.thumbnailRow}>
          {data.entries.map((entry, index) => {
            const isSelected = index === selectedIndex;
            return (
              <Pressable
                key={entry.id}
                accessibilityRole="button"
                onPress={() => setSelectedIndex(index)}
                style={[styles.thumbnailButton, isSelected ? styles.thumbnailButtonSelected : styles.thumbnailButtonDefault]}>
                <AppText
                  language={ui}
                  variant="caption"
                  style={[styles.thumbnailText, isSelected ? styles.thumbnailTextSelected : styles.thumbnailTextDefault]}>
                  {pickText(entry.name, ui).slice(0, 2).toUpperCase()}
                </AppText>
              </Pressable>
            );
          })}
        </Stack>
      </Stack>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  title: {
    textAlign: 'center',
  },
  selectedWrap: {
    alignItems: 'center',
  },
  heroAvatar: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarText: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.bold,
  },
  characterName: {
    fontWeight: theme.typography.weights.semibold,
  },
  characterDescription: {
    textAlign: 'center',
  },
  thumbnailRow: {
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  thumbnailButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailButtonDefault: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  thumbnailButtonSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.border,
  },
  thumbnailText: {
    fontWeight: theme.typography.weights.bold,
  },
  thumbnailTextDefault: {
    color: theme.colors.text,
  },
  thumbnailTextSelected: {
    color: theme.colors.surface,
  },
});
