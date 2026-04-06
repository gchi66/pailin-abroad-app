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
  rightActionLabel?: string;
  onRightActionPress?: (() => void) | undefined;
  topInsetOffset?: number;
};

export function StandardPageHeader({ language, title, onBackPress, rightActionLabel, onRightActionPress, topInsetOffset = 28 }: StandardPageHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.headerBlock}>
      <View style={{ height: Math.max(insets.top - topInsetOffset, 0) }} />
      <View style={styles.actionRow}>
        {onBackPress ? (
          <Pressable accessibilityRole="button" style={styles.backButton} onPress={onBackPress}>
            <AppText language={language} variant="caption" style={styles.backButtonText}>
              ←
            </AppText>
          </Pressable>
        ) : (
          <View style={styles.actionSpacer} />
        )}

        {rightActionLabel && onRightActionPress ? (
          <Pressable accessibilityRole="button" style={styles.rightActionButton} onPress={onRightActionPress}>
            <AppText language={language} variant="caption" style={styles.rightActionText}>
              {rightActionLabel}
            </AppText>
          </Pressable>
        ) : (
          <View style={styles.actionSpacer} />
        )}
      </View>

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
  actionRow: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionSpacer: {
    width: 56,
    minHeight: 32,
  },
  backButton: {
    width: 56,
    minHeight: 32,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backButtonText: {
    color: theme.colors.text,
    fontSize: 24,
    lineHeight: 24,
    fontWeight: theme.typography.weights.bold,
  },
  rightActionButton: {
    minWidth: 56,
    minHeight: 32,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  rightActionText: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.lineHeights.md,
    fontWeight: theme.typography.weights.semibold,
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
