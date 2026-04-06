import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { getLegalDocumentCopy, LegalDocumentKey } from '@/src/copy/legal';
import { AppText } from '@/src/components/ui/AppText';
import { Card } from '@/src/components/ui/Card';
import { Stack } from '@/src/components/ui/Stack';
import { StandardPageHeader } from '@/src/components/ui/StandardPageHeader';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';

export function LegalScreen({ document }: { document: LegalDocumentKey }) {
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();
  const copy = getLegalDocumentCopy(uiLanguage, document);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
      <Stack gap="md">
        <StandardPageHeader language={uiLanguage} title={copy.title} onBackPress={() => router.push('/(tabs)/account/settings')} topInsetOffset={52} />

        <Card padding="lg" radius="lg" style={styles.neoCard}>
          <Stack gap="md">
            {copy.paragraphs.map((paragraph, index) => (
              <AppText
                key={`${document}-${index}`}
                language={uiLanguage}
                variant="body"
                style={index < 2 ? styles.leadText : styles.bodyText}>
                {paragraph}
              </AppText>
            ))}
          </Stack>
        </Card>
      </Stack>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  neoCard: {
    borderWidth: 1.5,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 1.75, height: 1.75 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  leadText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semibold,
  },
  bodyText: {
    color: theme.colors.mutedText,
  },
});
