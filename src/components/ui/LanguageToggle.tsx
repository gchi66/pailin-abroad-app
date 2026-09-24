import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';

import { AppText } from './AppText';

export function LanguageToggle() {
  const { uiLanguage, setUiLanguage } = useUiLanguage();
  const toggleLabel = uiLanguage === 'th' ? 'EN' : 'TH';

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={uiLanguage === 'th' ? 'Switch language to English' : 'เปลี่ยนภาษาเป็นไทย'}
        onPress={() => setUiLanguage(uiLanguage === 'th' ? 'en' : 'th')}
        style={styles.languagePill}>
        <AppText
          language="en"
          variant="caption"
          style={styles.languagePillText}>
          {toggleLabel}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 60,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languagePill: {
    width: 60,
    height: 28,
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  languagePillText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.medium,
    fontSize: 11,
    lineHeight: 14,
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
});
