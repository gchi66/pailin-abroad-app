import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { AppText } from '@/src/components/ui/AppText';
import { theme } from '@/src/theme/theme';

type ResultTone = 'perfect' | 'partial' | 'low';

type ExerciseSetResultCardProps = {
  body: string;
  imageSource: React.ComponentProps<typeof Image>['source'];
  language: 'en' | 'th';
  score: number;
  title: string;
  tone: ResultTone;
  total: number;
};

const SCORE_OUTLINE_OFFSETS = [
  [-2, -2],
  [0, -2],
  [2, -2],
  [-2, 0],
  [2, 0],
  [-2, 2],
  [0, 2],
  [2, 2],
] as const;

const cardToneStyles = {
  perfect: { backgroundColor: '#E8FFC7' },
  partial: { backgroundColor: '#FFFBE4' },
  low: { backgroundColor: '#FFF0F1' },
} as const;

const scoreToneStyles = {
  perfect: { color: '#B9E671' },
  partial: { color: '#FFD45A' },
  low: { color: '#FF9299' },
} as const;

export function ExerciseSetResultCard({
  body,
  imageSource,
  language,
  score,
  title,
  tone,
  total,
}: ExerciseSetResultCardProps) {
  const scoreLabel = `${score} / ${total}`;

  return (
    <View style={styles.result}>
      <Image
        source={imageSource}
        contentFit="contain"
        style={[
          styles.image,
          tone === 'partial' ? styles.imagePartial : null,
          tone === 'low' ? styles.imageLow : null,
        ]}
      />
      <View style={[styles.card, cardToneStyles[tone]]}>
        <AppText
          language={language}
          style={[styles.title, language === 'th' ? styles.titleThai : null]}>
          {title}
        </AppText>

        <View accessible accessibilityLabel={scoreLabel} style={styles.scoreWrap}>
          <AppText
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            language="en"
            style={[styles.score, styles.scoreSizer]}>
            {scoreLabel}
          </AppText>
          {SCORE_OUTLINE_OFFSETS.map(([translateX, translateY]) => (
            <AppText
              key={`${translateX}:${translateY}`}
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              language="en"
              style={[
                styles.score,
                styles.scoreLayer,
                styles.scoreOutline,
                { transform: [{ translateX }, { translateY }] },
              ]}>
              {scoreLabel}
            </AppText>
          ))}
          <AppText
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            language="en"
            style={[styles.score, styles.scoreLayer, scoreToneStyles[tone]]}>
            {scoreLabel}
          </AppText>
        </View>

        <AppText language={language} style={styles.body}>
          {body}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  result: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
    paddingTop: 2,
  },
  image: {
    zIndex: 1,
    width: 220,
    height: 220,
    marginBottom: -34,
    transform: [{ translateY: 24 }],
  },
  imageLow: {
    transform: [{ translateY: 4 }],
  },
  imagePartial: {
    transform: [{ translateY: 4 }],
  },
  card: {
    zIndex: 2,
    width: '100%',
    minHeight: 242,
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 25,
    boxShadow: `5px 6px 0px ${theme.colors.shadow}`,
  },
  title: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFaces.en.bold,
    fontSize: 24,
    lineHeight: 32,
    textAlign: 'center',
  },
  titleThai: {
    fontFamily: theme.typography.fontFaces.th.bold,
  },
  scoreWrap: {
    position: 'relative',
    alignSelf: 'center',
    marginTop: 5,
  },
  score: {
    fontFamily: theme.typography.fontFaces.en.bold,
    fontSize: 70,
    lineHeight: 82,
    letterSpacing: -2,
    textAlign: 'center',
  },
  scoreSizer: {
    opacity: 0,
  },
  scoreLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  scoreOutline: {
    color: theme.colors.text,
  },
  body: {
    maxWidth: 310,
    marginTop: 9,
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
});
