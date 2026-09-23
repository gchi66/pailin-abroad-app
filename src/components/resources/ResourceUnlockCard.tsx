import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { UnlockArtwork } from '@/src/components/lesson/UnlockArtwork';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { theme } from '@/src/theme/theme';

type ResourceUnlockCardProps = {
  language: 'en' | 'th';
  title: string;
  body: string;
  italicWord?: string;
  buttonLabel: string;
  onPress: () => void;
};

export function ResourceUnlockCard({ language, title, body, italicWord, buttonLabel, onPress }: ResourceUnlockCardProps) {
  const italicIndex = italicWord ? body.indexOf(italicWord) : -1;

  return (
    <View style={styles.card}>
      <UnlockArtwork style={styles.artwork} />
      <View style={styles.copy}>
        <AppText language={language} variant="title" style={styles.title}>{title}</AppText>
        <AppText language={language} variant="muted" style={styles.body}>
          {italicIndex >= 0 && italicWord ? (
            <>
              {body.slice(0, italicIndex)}
              <Text style={styles.italic}>{italicWord}</Text>
              {body.slice(italicIndex + italicWord.length)}
            </>
          ) : body}
        </AppText>
        <Button
          language={language}
          title={buttonLabel}
          onPress={onPress}
          style={styles.button}
          textStyle={styles.buttonText}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDC743',
    borderRadius: 10,
    backgroundColor: '#FFFCE5',
    padding: 12,
    gap: 12,
  },
  artwork: {
    width: 96,
    height: 96,
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: theme.typography.weights.bold,
  },
  body: {
    fontSize: 11,
    lineHeight: 16,
    color: '#666666',
  },
  italic: {
    fontStyle: 'italic',
  },
  button: {
    minHeight: 32,
    alignSelf: 'flex-start',
    marginTop: 3,
    paddingHorizontal: 24,
    backgroundColor: '#F9DA60',
  },
  buttonText: {
    fontSize: 11,
    lineHeight: 17,
    color: '#222222',
  },
});
