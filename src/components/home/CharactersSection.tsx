import React, { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';

import { characterImages } from '@/src/assets/app-images';
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
  const selectedImages = getCharacterImages(selected.id);

  return (
    <Card padding="lg" radius="lg" style={styles.card}>
      <Stack gap="md">
        <AppText language={ui} variant="title" style={styles.title}>
          {pickText(data.title, ui)}
        </AppText>
        <Stack gap="sm" style={styles.selectedWrap}>
          <Image source={selectedImages.hero} style={styles.heroAvatarImage} resizeMode="contain" />
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
            const entryImages = getCharacterImages(entry.id);
            return (
              <Pressable
                key={entry.id}
                accessibilityRole="button"
                onPress={() => setSelectedIndex(index)}
                style={[styles.thumbnailButton, isSelected ? styles.thumbnailButtonSelected : styles.thumbnailButtonDefault]}>
                <Image
                  source={isSelected ? entryImages.thumbnailActive : entryImages.thumbnailDefault}
                  style={styles.thumbnailImage}
                  resizeMode="contain"
                />
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
  heroAvatarImage: {
    width: 172,
    height: 172,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailButtonDefault: {
    backgroundColor: 'transparent',
  },
  thumbnailButtonSelected: {
    backgroundColor: 'transparent',
  },
  thumbnailImage: {
    width: 44,
    height: 44,
  },
});

function getCharacterImages(id: string) {
  return characterImages[id as keyof typeof characterImages];
}
