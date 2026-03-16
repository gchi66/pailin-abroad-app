import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';

import { AppText } from './AppText';

type LanguageToggleProps = {
  style?: StyleProp<ViewStyle>;
};

export function LanguageToggle({ style }: LanguageToggleProps) {
  const { uiLanguage, setUiLanguage } = useUiLanguage();

  return (
    <View style={[styles.wrap, style]}>
      <Pressable
        accessibilityRole="button"
        style={[styles.option, uiLanguage === 'th' ? styles.optionActive : null]}
        onPress={() => setUiLanguage('th')}>
        <AppText variant="caption" style={uiLanguage === 'th' ? styles.optionTextActive : styles.optionText}>
          TH
        </AppText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        style={[styles.option, uiLanguage === 'en' ? styles.optionActive : null]}
        onPress={() => setUiLanguage('en')}>
        <AppText variant="caption" style={uiLanguage === 'en' ? styles.optionTextActive : styles.optionText}>
          EN
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    gap: 4,
  },
  option: {
    minWidth: 56,
    minHeight: 36,
    borderRadius: theme.radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  optionActive: {
    backgroundColor: '#91CAFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  optionText: {
    color: theme.colors.mutedText,
    fontWeight: theme.typography.weights.semibold,
  },
  optionTextActive: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
  },
});
