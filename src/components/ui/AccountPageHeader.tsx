import React from 'react';
import { Image, ImageSourcePropType, StyleSheet } from 'react-native';

import { PageHeader } from './PageHeader';

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
    <PageHeader
      language={language}
      title={title}
      subtitle={subtitle}
      backLabel={backLabel}
      onBackPress={onBackPress}
      illustration={illustration
        ? <Image source={illustration} resizeMode="contain" style={[styles.illustration, flipIllustration && styles.flipped]} />
        : undefined}
    />
  );
}

const styles = StyleSheet.create({
  illustration: { position: 'absolute', right: 4, bottom: -12, width: 84, height: 84 },
  flipped: { transform: [{ scaleX: -1 }] },
});
