import React, { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { theme } from '@/src/theme/theme';

import { AppText } from './AppText';
import { BackAction } from './BackAction';
import { LanguageToggle } from './LanguageToggle';

type PageHeaderProps = {
  language: 'en' | 'th';
  title: string;
  subtitle?: string;
  variant?: 'detail' | 'root';
  onBackPress?: () => void;
  backLabel?: string;
  illustration?: ReactNode;
  rightElement?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function PageHeader({
  language,
  title,
  subtitle,
  variant = 'detail',
  onBackPress,
  backLabel,
  illustration,
  rightElement,
  style,
}: PageHeaderProps) {
  const action = rightElement ?? <LanguageToggle />;

  if (variant === 'root' && !onBackPress) {
    return (
      <View style={style}>
        <View style={styles.rootTitleRow}>
          <AppText language={language} variant="title" style={styles.rootTitle}>
            {title}
          </AppText>
          {action}
        </View>
        {subtitle ? (
          <AppText language={language} variant="body" style={styles.rootSubtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
    );
  }

  return (
    <View style={style}>
      <View style={styles.actionRow}>
        {onBackPress ? (
          <BackAction
            language={language}
            label={backLabel ?? (language === 'th' ? 'กลับ' : 'Back')}
            onPress={onBackPress}
          />
        ) : (
          <View style={styles.actionSpacer} />
        )}
        {action}
      </View>
      <AppText language={language} variant="title" style={styles.detailTitle}>
        {title}
      </AppText>
      {subtitle || illustration ? (
        <View style={[styles.introRow, illustration ? styles.introRowWithIllustration : null]}>
          {subtitle ? (
            <AppText
              language={language}
              variant="caption"
              style={[styles.detailSubtitle, illustration ? styles.subtitleWithIllustration : null]}>
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
  actionRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionSpacer: {
    width: 44,
    height: 44,
  },
  detailTitle: {
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
    paddingBottom: 0,
    marginBottom: 8,
  },
  detailSubtitle: {
    color: theme.colors.text,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: theme.typography.weights.regular,
  },
  subtitleWithIllustration: {
    width: '60%',
  },
  rootTitleRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rootTitle: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 21,
    lineHeight: 30,
    fontWeight: theme.typography.weights.bold,
  },
  rootSubtitle: {
    marginTop: 2,
    color: '#6D737B',
    fontSize: 13,
    lineHeight: 20,
  },
});
