import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { LanguageToggle } from '@/src/components/ui/LanguageToggle';
import { theme } from '@/src/theme/theme';

type ResourcePageHeaderProps = {
  language: 'en' | 'th';
  title: string;
  subtitle?: string;
  onBackPress: () => void;
  illustration?: React.ReactNode;
};

export function ResourcePageHeader({ language, title, subtitle, onBackPress, illustration }: ResourcePageHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.actionRow}>
        <Pressable accessibilityRole="button" onPress={onBackPress} style={styles.backButton}>
          <AppText language={language} variant="caption" style={styles.backText}>
            {'‹  '}{language === 'th' ? 'กลับ' : 'BACK'}
          </AppText>
        </Pressable>
        <LanguageToggle compact />
      </View>
      <AppText language={language} variant="title" style={styles.title}>{title}</AppText>
      {subtitle || illustration ? (
        <View style={[styles.introRow, illustration ? styles.introRowWithIllustration : null]}>
          {subtitle ? (
            <AppText
              language={language}
              variant="caption"
              style={[styles.subtitle, illustration ? styles.subtitleWithIllustration : null]}>
              {subtitle}
            </AppText>
          ) : null}
          {illustration}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {},
  actionRow: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingVertical: 5,
  },
  backText: {
    fontSize: 10,
    lineHeight: 15,
    fontWeight: theme.typography.weights.regular,
    textDecorationLine: 'underline',
    letterSpacing: 0.5,
  },
  title: {
    marginTop: 8,
    fontSize: 22,
    lineHeight: 29,
    fontWeight: theme.typography.weights.bold,
  },
  introRow: {
    position: 'relative',
    paddingTop: 6,
    paddingBottom: 6,
  },
  introRowWithIllustration: {
    minHeight: 57,
    paddingBottom: 0,
    marginBottom: 8,
  },
  subtitle: {
    color: theme.colors.text,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: theme.typography.weights.regular,
  },
  subtitleWithIllustration: {
    width: '60%',
  },
});
