import React from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';

import { theme } from '@/src/theme/theme';

import { AppText } from './AppText';

type BackActionProps = {
  language: 'en' | 'th';
  label?: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

export function BackAction({ language, label, onPress, style, disabled = false }: BackActionProps) {
  const resolvedLabel = label ?? (language === 'th' ? 'กลับ' : 'Back');
  const displayLabel = language === 'en' ? resolvedLabel.toLocaleUpperCase('en') : resolvedLabel;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={resolvedLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={[styles.button, disabled ? styles.disabled : null, style]}>
      <AppText language={language} variant="caption" style={styles.label}>
        {`‹ ${displayLabel}`}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 44,
    minHeight: 44,
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  label: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: theme.typography.weights.semibold,
    letterSpacing: 0.6,
    textDecorationLine: 'underline',
  },
  disabled: {
    opacity: 0.5,
  },
});
