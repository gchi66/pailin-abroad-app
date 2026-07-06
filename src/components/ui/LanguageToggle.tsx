import React from 'react';
import { Platform, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { useUiLanguage } from '@/src/context/ui-language-context';
import { AndroidNeoShadowLayer } from '@/src/components/ui/AndroidNeoShadowLayer';
import { theme } from '@/src/theme/theme';

import { AppText } from './AppText';

type LanguageToggleProps = {
  style?: StyleProp<ViewStyle>;
};

export function LanguageToggle({ style }: LanguageToggleProps) {
  const { uiLanguage, setUiLanguage } = useUiLanguage();
  const toggleLabel = uiLanguage === 'th' ? 'EN' : 'ไทย';

  return (
    <View style={styles.wrap}>
      <AndroidNeoShadowLayer borderRadius={999} color={theme.colors.shadow} offset={1.5} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={uiLanguage === 'th' ? 'Switch language to English' : 'เปลี่ยนภาษาเป็นไทย'}
        onPress={() => setUiLanguage(uiLanguage === 'th' ? 'en' : 'th')}
        style={[styles.languagePill, style]}>
        <AppText language={uiLanguage === 'th' ? 'en' : 'th'} variant="caption" style={styles.languagePillText}>
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
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 1.5, height: 1.5 },
        shadowOpacity: 1,
        shadowRadius: 0,
      },
      android: {
        elevation: 0,
      },
    }),
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
});
