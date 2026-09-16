import React from 'react';
import { Pressable, StyleProp, StyleSheet, TextStyle, View, ViewStyle } from 'react-native';

import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';

import { AppText } from './AppText';

type LanguageToggleProps = {
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function LanguageToggle({ compact = false, style, textStyle }: LanguageToggleProps) {
  const { uiLanguage, setUiLanguage } = useUiLanguage();
  const toggleLabel = uiLanguage === 'th' ? 'EN' : 'ไทย';

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={uiLanguage === 'th' ? 'Switch language to English' : 'เปลี่ยนภาษาเป็นไทย'}
        onPress={() => setUiLanguage(uiLanguage === 'th' ? 'en' : 'th')}
        style={[styles.languagePill, compact ? styles.compactPill : null, style]}>
        <AppText
          language={uiLanguage === 'th' ? 'en' : 'th'}
          variant="caption"
          style={[styles.languagePillText, compact ? styles.compactPillText : null, textStyle]}>
          {toggleLabel}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  languagePill: {
    minWidth: 78,
    minHeight: 42,
    borderRadius: 999,
    backgroundColor: '#91CAFF',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md + 2,
    boxShadow: `1.5px 1.5px 0px ${theme.colors.shadow}`,
  },
  languagePillText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
    fontSize: 15,
    lineHeight: 15,
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
    transform: [{ translateY: 1 }],
  },
  compactPill: {
    minWidth: 62,
    minHeight: 34,
    paddingHorizontal: theme.spacing.sm + 2,
  },
  compactPillText: {
    fontSize: 13,
    lineHeight: 13,
  },
});
