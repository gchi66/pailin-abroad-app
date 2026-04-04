import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/src/theme/theme';

import { AppText } from './AppText';

type StandardPageHeaderProps = {
  language: 'en' | 'th';
  title: string;
  subtitle?: string;
};

export function StandardPageHeader({ language, title }: StandardPageHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.headerBlock}>
      <View style={{ height: Math.max(insets.top - 28, 0) }} />
      <AppText language={language} variant="title" numberOfLines={1} style={styles.title}>
        {title}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    marginHorizontal: -theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderColor: theme.colors.border,
  },
  title: {
    marginTop: 0,
    marginBottom: 8,
    color: theme.colors.text,
    textAlign: 'center',
    fontSize: 36,
    lineHeight: 40,
    fontWeight: theme.typography.weights.bold,
  },
});
