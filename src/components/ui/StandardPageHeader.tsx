import React from 'react';
import { StyleSheet, View } from 'react-native';

import { theme } from '@/src/theme/theme';

import { AppText } from './AppText';
import { Stack } from './Stack';

type StandardPageHeaderProps = {
  language: 'en' | 'th';
  title: string;
  subtitle: string;
};

export function StandardPageHeader({ language, title, subtitle }: StandardPageHeaderProps) {
  return (
    <View style={styles.headerBlock}>
      <Stack gap="sm">
        <AppText language={language} variant="title" style={styles.title}>
          {title}
        </AppText>
        <AppText language={language} variant="body" style={styles.subtitle}>
          {subtitle}
        </AppText>
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: theme.colors.text,
    textAlign: 'center',
    fontSize: 44,
    lineHeight: 52,
  },
  subtitle: {
    color: theme.colors.mutedText,
    textAlign: 'center',
    fontSize: 17,
    lineHeight: 26,
  },
});
