import React from 'react';
import { Image, ImageSourcePropType, Pressable, StyleSheet, View } from 'react-native';

import { theme } from '@/src/theme/theme';
import { AppText } from './AppText';

type Props = {
  language: 'en' | 'th';
  title: string;
  backLabel: string;
  onBackPress: () => void;
  subtitle?: string;
  illustration?: ImageSourcePropType;
  flipIllustration?: boolean;
};

export function AccountPageHeader({ language, title, backLabel, onBackPress, subtitle, illustration, flipIllustration = false }: Props) {
  return (
    <View>
      <Pressable accessibilityRole="button" onPress={onBackPress} style={styles.backLink}>
        <AppText language={language} variant="caption" style={styles.backText}>‹ {backLabel}</AppText>
      </Pressable>
      <AppText language={language} variant="title" style={styles.title}>{title}</AppText>
      {subtitle || illustration ? (
        <View style={[styles.introRow, !illustration && styles.introRowTextOnly]}>
          {subtitle ? <AppText language={language} variant="caption" style={styles.subtitle}>{subtitle}</AppText> : null}
          {illustration ? <Image source={illustration} resizeMode="contain" style={[styles.illustration, flipIllustration && styles.flipped]} /> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backLink: { alignSelf: 'flex-start', marginTop: 12, paddingVertical: 6 },
  backText: { fontWeight: theme.typography.weights.bold, textTransform: 'uppercase', textDecorationLine: 'underline', letterSpacing: 0.8, fontSize: 12 },
  title: { fontSize: 25, lineHeight: 34, fontWeight: theme.typography.weights.bold, marginTop: 6, marginBottom: 12 },
  introRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', minHeight: 48, marginBottom: 8 },
  introRowTextOnly: { minHeight: 24, marginBottom: 0 },
  subtitle: { flex: 1, marginRight: 12 },
  illustration: { width: 84, height: 84, marginTop: -50 },
  flipped: { transform: [{ scaleX: -1 }] },
});
