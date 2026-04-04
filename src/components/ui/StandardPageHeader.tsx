import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/src/theme/theme';

import { AppText } from './AppText';

type StandardPageHeaderProps = {
  language: 'en' | 'th';
  title: string;
  subtitle?: string;
  onBackPress?: (() => void) | undefined;
  topInsetOffset?: number;
};

export function StandardPageHeader({ language, title, onBackPress, topInsetOffset = 28 }: StandardPageHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.headerBlock}>
      <View style={{ height: Math.max(insets.top - topInsetOffset, 0) }} />
      {onBackPress ? (
        <Pressable accessibilityRole="button" style={styles.backButton} onPress={onBackPress}>
          <AppText language={language} variant="caption" style={styles.backButtonText}>
            ←
          </AppText>
        </Pressable>
      ) : null}

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
  backButton: {
    width: 40,
    minHeight: 32,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: 2,
  },
  backButtonText: {
    color: theme.colors.text,
    fontSize: 24,
    lineHeight: 24,
    fontWeight: theme.typography.weights.bold,
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
