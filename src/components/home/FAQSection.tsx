import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { pickText } from '../../mocks/home';
import { FAQData, UiLanguage } from '../../types/home';
import { theme } from '../../theme/theme';
import { AppText } from '../ui/AppText';
import { Card } from '../ui/Card';
import { Stack } from '../ui/Stack';

type FAQSectionProps = {
  data: FAQData;
  ui: UiLanguage;
};

export function FAQSection({ data, ui }: FAQSectionProps) {
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <Stack gap="md">
      <AppText language={ui} variant="title" style={styles.title}>
        {pickText(data.title, ui)}
      </AppText>
      <Stack gap="sm">
        {data.items.map((item) => {
          const isOpen = openId === item.id;

          return (
            <Card key={item.id} padding="md" radius="lg" style={styles.card}>
              <Stack gap="sm">
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setOpenId(isOpen ? null : item.id)}
                  style={styles.headerButton}>
                  <View style={styles.questionWrap}>
                    <AppText language={ui} variant="body" style={styles.questionText}>
                      {pickText(item.question, ui)}
                    </AppText>
                  </View>
                  <AppText language={ui} variant="body" style={styles.arrow}>
                    {isOpen ? '▲' : '▼'}
                  </AppText>
                </Pressable>

                {isOpen ? (
                  <AppText language={ui} variant="muted" style={styles.answer}>
                    {pickText(item.answer, ui)}
                  </AppText>
                ) : null}
              </Stack>
            </Card>
          );
        })}
      </Stack>
    </Stack>
  );
}

const styles = StyleSheet.create({
  title: {
    textAlign: 'center',
  },
  card: {
    width: '100%',
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  questionWrap: {
    flex: 1,
  },
  questionText: {
    fontWeight: theme.typography.weights.semibold,
  },
  arrow: {
    color: theme.colors.mutedText,
  },
  answer: {
    color: theme.colors.mutedText,
  },
});
