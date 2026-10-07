import React, { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Image, ImageSource } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { AppText } from '@/src/components/ui/AppText';
import { theme } from '@/src/theme/theme';

export type PracticeLanguage = 'en' | 'th';
export type PracticeAnswerStatus = 'idle' | 'correct' | 'incorrect';

export const practiceColors = {
  text: '#1E1E1E',
  question: '#BCECFF',
  example: '#FFFCE5',
  exampleAccent: '#C4A807',
  disabledButton: '#EAEAEA',
  disabledText: '#979797',
  checkButton: '#2563EB',
  correctPanel: '#EAFFC8',
  correctButton: '#99C64F',
  incorrectPanel: '#FFE4E4',
  incorrectButton: '#FD6969',
} as const;

export const practiceNeoShadowStyle: ViewStyle = {
  borderWidth: 1.5,
  borderColor: practiceColors.text,
  boxShadow: `2px 2px 0px ${practiceColors.text}`,
};

// Short internal aliases keep the fill-blank-specific example styles readable,
// while the public surface remains neutral for every exercise type.
const fillBlankColors = practiceColors;
const fillBlankNeoShadowStyle = practiceNeoShadowStyle;

type PracticeSurfaceProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'question' | 'example' | 'image';
};

export function PracticeSurface({ children, style, tone = 'question' }: PracticeSurfaceProps) {
  return (
    <View
      style={[
        styles.neoSurface,
        tone === 'question' ? styles.questionSurface : null,
        tone === 'example' ? styles.exampleSurface : null,
        tone === 'image' ? styles.imageSurface : null,
        style,
      ]}>
      {children}
    </View>
  );
}

export function PracticeSectionLabel({
  icon = '🧩',
  label,
  language,
}: {
  icon?: string;
  label: string;
  language: PracticeLanguage;
}) {
  const trimmedLabel = label.trimStart();
  const displayLabel = trimmedLabel.startsWith(icon)
    ? trimmedLabel.slice(icon.length).trimStart()
    : label;

  return (
    <View style={styles.sectionLabelRow}>
      <AppText language="en" style={styles.sectionLabelIcon}>{icon}</AppText>
      <AppText language={language} variant="caption" style={styles.sectionLabelText}>{displayLabel}</AppText>
    </View>
  );
}

export function PracticeImage({
  accessibilityLabel,
  source,
  style,
}: {
  accessibilityLabel: string;
  source: ImageSource;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <PracticeSurface tone="image" style={[styles.imageSurfaceSize, style]}>
      <Image source={source} accessibilityLabel={accessibilityLabel} contentFit="contain" style={styles.image} />
    </PracticeSurface>
  );
}

export function FillBlankExampleDisclosure({
  children,
  expanded,
  label,
  language,
  onToggle,
  style,
}: {
  children?: ReactNode;
  expanded: boolean;
  label: string;
  language: PracticeLanguage;
  onToggle: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <PracticeSurface tone="example" style={[styles.exampleDisclosure, expanded ? styles.exampleDisclosureExpanded : null, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        hitSlop={4}
        style={styles.exampleHeader}
        onPress={onToggle}>
        <AppText language={language} variant="caption" style={styles.exampleLabel}>
          {label}{' '}
          <Text style={styles.exampleArrow}>{expanded ? '▲' : '▼'}</Text>
        </AppText>
      </Pressable>
      {expanded && children ? <View style={styles.exampleBody}>{children}</View> : null}
    </PracticeSurface>
  );
}

export function FillBlankExampleSentence({
  answers,
  language,
  text,
}: {
  answers: string[];
  language: PracticeLanguage;
  text: string;
}) {
  let answerIndex = 0;
  const tokens = text.split(/(_{2,}|\[[^\]]+\])/g).filter(Boolean);

  return (
    <AppText language={language} variant="caption" style={styles.exampleSentence}>
      {tokens.map((token, index) => {
        if (/^_{2,}$/.test(token)) {
          const answer = answers[answerIndex] ?? '';
          answerIndex += 1;
          return <Text key={`answer-${index}`} style={styles.exampleAnswer}>{answer || '_____'}</Text>;
        }
        if (/^\[[^\]]+\]$/.test(token)) {
          return <Text key={`bracket-${index}`} style={styles.exampleBracket}>{token}</Text>;
        }
        return <Text key={`text-${index}`}>{token}</Text>;
      })}
    </AppText>
  );
}

export function SentenceTransformExampleDisclosure({
  correctedSentence,
  expanded,
  label,
  language,
  onToggle,
  sentence,
  sentenceInlines,
}: {
  correctedSentence?: string;
  expanded: boolean;
  label: string;
  language: PracticeLanguage;
  onToggle: () => void;
  sentence: string;
  sentenceInlines?: { text?: string | null; bold?: boolean | null }[];
}) {
  const visibleSentenceInlines = (sentenceInlines ?? []).filter((inline) => Boolean(inline.text));
  const sentenceParts = splitSentenceTransformLabel(sentence);
  const inlineSentenceText = visibleSentenceInlines.map((inline) => inline.text ?? '').join('');
  const sentenceBodyInlines = removeSentenceTransformLabelFromInlines(
    visibleSentenceInlines,
    inlineSentenceText.startsWith(sentenceParts.label) ? sentenceParts.label.length : 0
  );
  const correctionParts = correctedSentence
    ? splitSentenceTransformLabel(correctedSentence)
    : { label: '', sentence: '' };
  const correctionRuns = correctedSentence
    ? buildSentenceTransformCorrectionRuns(sentence, correctedSentence)
    : [];

  return (
    <FillBlankExampleDisclosure
      expanded={expanded}
      label={label}
      language={language}
      onToggle={onToggle}>
      <View style={styles.sentenceExampleContent}>
        <AppText language="en" variant="caption" style={styles.sentenceExampleText}>
          {sentenceParts.label ? (
            <Text style={styles.sentenceExampleIncorrectLabel}>{sentenceParts.label}</Text>
          ) : null}
          {sentenceBodyInlines.length
            ? sentenceBodyInlines.map((inline, index) => (
                <Text
                  key={`sentence-example-${index}`}
                  style={inline.bold ? styles.sentenceExampleEmphasis : undefined}>
                  {inline.text}
                </Text>
              ))
            : sentenceParts.sentence}
        </AppText>
        {correctedSentence ? (
          <AppText language="en" variant="caption" style={styles.sentenceExampleCorrectionText}>
            {correctionParts.label ? (
              <Text style={styles.sentenceExampleCorrectLabel}>{correctionParts.label}</Text>
            ) : null}
            {correctionRuns.map((run, index) => (
              <Text
                key={`sentence-correction-${index}`}
                style={run.bold ? styles.sentenceExampleEmphasis : undefined}>
                {run.text}
              </Text>
            ))}
          </AppText>
        ) : null}
      </View>
    </FillBlankExampleDisclosure>
  );
}

const splitSentenceTransformLabel = (value: string) => {
  const match = value.match(/^(.*?:\s*)(.*)$/s);
  return match ? { label: match[1], sentence: match[2] } : { label: '', sentence: value };
};

const sentenceTransformWords = (value: string) => value.match(/\S+\s*/g) ?? [];
const normalizedSentenceTransformWord = (value: string) =>
  value.trim().toLocaleLowerCase().replace(/[’]/g, "'");

const removeSentenceTransformLabelFromInlines = (
  inlines: { text?: string | null; bold?: boolean | null }[],
  labelLength: number
) => {
  let remainingLabelLength = labelLength;
  return inlines
    .map((inline) => {
      const text = inline.text ?? '';
      if (remainingLabelLength <= 0) return inline;
      const consumedLength = Math.min(remainingLabelLength, text.length);
      remainingLabelLength -= consumedLength;
      return { ...inline, text: text.slice(consumedLength) };
    })
    .filter((inline) => Boolean(inline.text));
};

const buildSentenceTransformCorrectionRuns = (source: string, correction: string) => {
  const sourceParts = splitSentenceTransformLabel(source);
  const correctionParts = splitSentenceTransformLabel(correction);
  const sourceWords = sentenceTransformWords(sourceParts.sentence);
  const correctionWords = sentenceTransformWords(correctionParts.sentence);

  let sharedPrefixCount = 0;
  while (
    sharedPrefixCount < sourceWords.length &&
    sharedPrefixCount < correctionWords.length &&
    normalizedSentenceTransformWord(sourceWords[sharedPrefixCount]) ===
      normalizedSentenceTransformWord(correctionWords[sharedPrefixCount])
  ) {
    sharedPrefixCount += 1;
  }

  let sharedSuffixCount = 0;
  while (
    sharedSuffixCount < sourceWords.length - sharedPrefixCount &&
    sharedSuffixCount < correctionWords.length - sharedPrefixCount &&
    normalizedSentenceTransformWord(sourceWords[sourceWords.length - 1 - sharedSuffixCount]) ===
      normalizedSentenceTransformWord(correctionWords[correctionWords.length - 1 - sharedSuffixCount])
  ) {
    sharedSuffixCount += 1;
  }

  const emphasizedEnd = correctionWords.length - sharedSuffixCount;
  const runs = [
    { text: correctionWords.slice(0, sharedPrefixCount).join(''), bold: false },
    { text: correctionWords.slice(sharedPrefixCount, emphasizedEnd).join(''), bold: true },
    { text: correctionWords.slice(emphasizedEnd).join(''), bold: false },
  ];

  return runs.filter((run) => run.text);
};

export function PracticeAnswerFooter({
  disabled = false,
  error,
  feedback,
  language,
  labels,
  loading = false,
  onPrimary,
  onSkip,
  review,
  status,
  style,
}: {
  disabled?: boolean;
  error?: string | null;
  feedback?: string | null;
  language: PracticeLanguage;
  labels: {
    check: string;
    checking: string;
    continue: string;
    correct: string;
    incorrect: string;
    clear: string;
    skip: string;
  };
  loading?: boolean;
  onPrimary: () => void;
  onSkip?: () => void;
  review?: {
    answer: string;
    expanded: boolean;
    hideLabel: string;
    onToggle: () => void;
    showLabel: string;
  };
  status: PracticeAnswerStatus;
  style?: StyleProp<ViewStyle>;
}) {
  const visibleStatus: PracticeAnswerStatus = loading ? 'idle' : status;
  const isCorrect = visibleStatus === 'correct';
  const isIncorrect = visibleStatus === 'incorrect';
  const isDisabled = disabled || loading;
  const primaryLabel = loading
    ? labels.checking
    : isCorrect
      ? labels.continue
      : isIncorrect
        ? labels.clear
        : labels.check;

  return (
    <View
      style={[
        styles.footer,
        isCorrect ? styles.correctFooter : null,
        isIncorrect ? styles.incorrectFooter : null,
        style,
      ]}>
      {error ? <AppText language={language} variant="caption" style={styles.errorText}>{error}</AppText> : null}
      {visibleStatus !== 'idle' ? (
        <View style={styles.resultCopy}>
          <View style={[styles.resultIcon, isCorrect ? styles.correctIcon : styles.incorrectIcon]}>
            {isCorrect ? (
              <AppText language="en" style={styles.resultIconText}>✓</AppText>
            ) : (
              <MaterialIcons name="close" size={10} color={fillBlankColors.text} />
            )}
          </View>
          <View style={styles.resultTextWrap}>
            <AppText language={language} variant="body" style={styles.resultTitle}>
              {isCorrect ? labels.correct : labels.incorrect}
            </AppText>
            {feedback ? <AppText language={language} variant="caption" style={styles.feedbackText}>{feedback}</AppText> : null}
            {isIncorrect && review ? (
              <View style={styles.reviewWrap}>
                <Pressable accessibilityRole="button" accessibilityState={{ expanded: review.expanded }} onPress={review.onToggle}>
                  <AppText language={language} variant="caption" style={styles.reviewToggle}>
                    {review.expanded ? review.hideLabel : review.showLabel} {review.expanded ? '−' : '+'}
                  </AppText>
                </Pressable>
                {review.expanded ? (
                  <AppText language={language} variant="caption" style={styles.reviewAnswer}>{review.answer}</AppText>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
        disabled={isDisabled}
        onPress={onPrimary}
        style={({ pressed }) => [
          styles.primaryButton,
          visibleStatus === 'idle' && !isDisabled ? styles.checkButton : null,
          visibleStatus === 'idle' && isDisabled ? styles.disabledButton : null,
          isCorrect ? styles.continueButton : null,
          isIncorrect ? styles.clearButton : null,
          pressed && !isDisabled ? styles.primaryButtonPressed : null,
        ]}>
        <AppText
          language={language}
          variant="caption"
          style={[
            styles.primaryButtonText,
            visibleStatus === 'idle' && isDisabled ? styles.disabledButtonText : null,
            visibleStatus === 'idle' && !isDisabled ? styles.lightButtonText : null,
          ]}>
          {primaryLabel}
        </AppText>
      </Pressable>
      {!isCorrect && onSkip ? (
        <Pressable accessibilityRole="button" style={styles.skipButton} onPress={onSkip}>
          <AppText language={language} variant="caption" style={styles.skipText}>{labels.skip}</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  neoSurface: {
    ...fillBlankNeoShadowStyle,
    borderRadius: 11,
  },
  questionSurface: {
    backgroundColor: fillBlankColors.question,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  exampleSurface: { backgroundColor: fillBlankColors.example },
  imageSurface: { backgroundColor: '#FFFFFF' },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: -8 },
  sectionLabelIcon: {
    color: fillBlankColors.text,
    width: 19,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: theme.typography.weights.medium,
  },
  sectionLabelText: {
    color: fillBlankColors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: theme.typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  imageSurfaceSize: { width: 184, height: 184, alignSelf: 'center', overflow: 'hidden', padding: 6 },
  image: { width: '100%', height: '100%' },
  exampleDisclosure: { alignSelf: 'flex-start', minWidth: 84, maxWidth: '100%', overflow: 'hidden' },
  exampleDisclosureExpanded: { width: '100%', minWidth: 220, alignSelf: 'stretch' },
  exampleHeader: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 7 },
  exampleLabel: { color: fillBlankColors.exampleAccent, fontSize: 13, lineHeight: 18, fontWeight: theme.typography.weights.bold },
  exampleArrow: { fontSize: 9, lineHeight: 13, fontWeight: theme.typography.weights.bold },
  exampleBody: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 14 },
  exampleSentence: { color: fillBlankColors.text, fontSize: 13, lineHeight: 19, fontWeight: theme.typography.weights.semibold },
  exampleAnswer: { color: fillBlankColors.text, textDecorationLine: 'underline', fontWeight: theme.typography.weights.bold },
  exampleBracket: { color: '#A7A9AF', fontWeight: theme.typography.weights.semibold },
  sentenceExampleContent: { gap: 8 },
  sentenceExampleText: { color: fillBlankColors.text, fontSize: 13, lineHeight: 19, fontWeight: theme.typography.weights.regular },
  sentenceExampleCorrectionText: { color: fillBlankColors.text, fontSize: 13, lineHeight: 19, fontWeight: theme.typography.weights.regular },
  sentenceExampleEmphasis: {
    fontFamily: theme.typography.fontFaces.en.bold,
    fontWeight: theme.typography.weights.bold,
  },
  sentenceExampleIncorrectLabel: {
    color: fillBlankColors.incorrectButton,
    fontFamily: theme.typography.fontFaces.en.bold,
    fontWeight: theme.typography.weights.bold,
  },
  sentenceExampleCorrectLabel: {
    color: fillBlankColors.correctButton,
    fontFamily: theme.typography.fontFaces.en.bold,
    fontWeight: theme.typography.weights.bold,
  },
  footer: { width: '100%', gap: 12, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  correctFooter: {
    backgroundColor: fillBlankColors.correctPanel,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: fillBlankColors.correctButton,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  incorrectFooter: {
    backgroundColor: fillBlankColors.incorrectPanel,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: fillBlankColors.incorrectButton,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  resultCopy: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  resultIcon: { width: 16, height: 16, marginTop: 2, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: fillBlankColors.text },
  correctIcon: { backgroundColor: fillBlankColors.correctButton },
  incorrectIcon: { backgroundColor: fillBlankColors.incorrectButton },
  resultIconText: { color: fillBlankColors.text, fontSize: 10, lineHeight: 12, fontWeight: theme.typography.weights.bold, includeFontPadding: false },
  resultTextWrap: { flex: 1, gap: 3 },
  resultTitle: { color: fillBlankColors.text, fontSize: 16, lineHeight: 20, fontWeight: theme.typography.weights.bold },
  feedbackText: { color: fillBlankColors.text, fontSize: 12, lineHeight: 17 },
  reviewWrap: { alignItems: 'flex-start', gap: 6, paddingTop: 2 },
  reviewToggle: { color: fillBlankColors.text, fontSize: 12, lineHeight: 17, fontWeight: theme.typography.weights.medium, textDecorationLine: 'underline' },
  reviewAnswer: { color: fillBlankColors.text, fontSize: 12, lineHeight: 18, fontWeight: theme.typography.weights.semibold },
  primaryButton: { minHeight: 44, width: '100%', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: fillBlankColors.text, borderRadius: 24, paddingHorizontal: 12, paddingVertical: 7, boxShadow: 'none' },
  checkButton: { backgroundColor: fillBlankColors.checkButton },
  disabledButton: { backgroundColor: fillBlankColors.disabledButton, borderColor: fillBlankColors.disabledText },
  continueButton: { backgroundColor: fillBlankColors.correctButton },
  clearButton: { backgroundColor: fillBlankColors.incorrectButton },
  primaryButtonPressed: { opacity: 0.86 },
  primaryButtonText: { color: fillBlankColors.text, fontSize: 12, lineHeight: 16, fontWeight: theme.typography.weights.bold, textTransform: 'uppercase' },
  lightButtonText: { color: '#FFFFFF' },
  disabledButtonText: { color: fillBlankColors.disabledText },
  skipButton: { alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 2 },
  skipText: { color: '#5E5E5E', fontSize: 10, lineHeight: 14, textDecorationLine: 'underline', textTransform: 'uppercase' },
  errorText: { color: theme.colors.error, textAlign: 'center' },
});
