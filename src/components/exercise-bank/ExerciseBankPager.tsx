import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';

import { evaluateLessonAnswer, EvaluateLessonAnswerResult } from '@/src/api/lessons';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { LanguageToggle } from '@/src/components/ui/LanguageToggle';
import { Stack } from '@/src/components/ui/Stack';
import { theme } from '@/src/theme/theme';
import { ExerciseBankExercise } from '@/src/types/exercise-bank';
import { LessonRichInline } from '@/src/types/lesson';

type UiLanguage = 'en' | 'th';
type ContentLanguage = 'en' | 'th';

type ExerciseBankPagerProps = {
  language: UiLanguage;
  contentLang: ContentLanguage;
  sectionTitle: string;
  categoryLabel: string;
  exercises: ExerciseBankExercise[];
  onSetContentLang: (language: ContentLanguage) => void;
  onBack: () => void;
  onDone: () => void;
};

type NormalizedOption = {
  label: string;
  text: string;
  textTh: string;
};

type NormalizedItem = {
  key: string;
  numberLabel: string;
  text: string;
  textTh: string;
  textJsonb: LessonRichInline[];
  prompt: string;
  promptTh: string;
  placeholder: string;
  placeholderTh: string;
  answer: string;
  answerLetters: string[];
  options: NormalizedOption[];
  blanks: { id: string; minLen: number }[];
  answersV2: string[][];
  correctTag: string;
  imageUrl: string | null;
  altText: string;
  altTextTh: string;
  isExample: boolean;
};

type NormalizedExercise = {
  id: string;
  kind: 'multiple_choice' | 'open' | 'fill_blank' | 'sentence_transform' | null;
  title: string;
  prompt: string;
  paragraph: string;
  items: NormalizedItem[];
};

type EvaluationState = {
  loading: boolean;
  correct: boolean | null;
  score: number | null;
  feedbackEn: string;
  feedbackTh: string;
  error: string;
};

type PagerCopy = {
  exercisesLabel: string;
  nextExercise: string;
  backToBank: string;
  checkAnswers: string;
  checking: string;
  tryAgain: string;
  reset: string;
  answerAll: string;
  correct: string;
  needsWork: string;
  openPlaceholder: string;
  alreadyCorrect: string;
  rewriteSentence: string;
  exampleLabel: string;
  answerLabel: string;
  correctAnswerPrefix: string;
  previousCard: string;
  nextCard: string;
  contentToggle: string;
  emptyTitle: string;
  emptyBody: string;
  unsupportedTitle: string;
  unsupportedBody: string;
};

type FillBlankMeasureToken =
  | { id: string; type: 'text'; text: string; measureText: string }
  | { id: string; type: 'blank'; blankId: string; minLen: number; measureText: string };

const buildBlankMeasureText = (minLen: number) => ` ${'0'.repeat(Math.max(1, minLen) + 1)} `;

const estimateBlankWidth = ({
  minLen,
  fontSize,
  horizontalPadding,
  containerWidth,
  maxWidthRatio,
  hardMaxWidth,
}: {
  minLen: number;
  fontSize: number;
  horizontalPadding: number;
  containerWidth: number;
  maxWidthRatio: number;
  hardMaxWidth: number;
}) => {
  const safeLen = Math.max(1, minLen);
  const charCount = safeLen + 1;
  const charWidth = fontSize * 0.56;
  const rawWidth = charCount * charWidth + horizontalPadding * 2;
  const minWidth = fontSize * 4.2;
  const responsiveMax = containerWidth > 0 ? containerWidth * maxWidthRatio : hardMaxWidth;
  const maxWidth = Math.min(responsiveMax, hardMaxWidth);
  return Math.round(Math.max(minWidth, Math.min(maxWidth, rawWidth)));
};

const computeBankBlankWidth = (containerWidth: number, minLen: number) =>
  estimateBlankWidth({
    minLen,
    fontSize: theme.typography.sizes.md,
    horizontalPadding: theme.spacing.sm,
    containerWidth,
    maxWidthRatio: 0.72,
    hardMaxWidth: 220,
  });

const getCopy = (language: UiLanguage): PagerCopy => {
  if (language === 'th') {
    return {
      exercisesLabel: 'แบบฝึกหัด',
      nextExercise: 'แบบฝึกหัดถัดไป →',
      backToBank: 'กลับไปคลังแบบฝึกหัด',
      checkAnswers: 'ตรวจคำตอบ',
      checking: 'กำลังตรวจ...',
      tryAgain: 'ลองอีกครั้ง',
      reset: 'เริ่มใหม่',
      answerAll: 'กรุณาตอบให้ครบก่อนตรวจคำตอบ',
      correct: 'ถูกต้อง',
      needsWork: 'ลองอีกครั้ง',
      openPlaceholder: 'พิมพ์คำตอบของคุณ',
      alreadyCorrect: 'ประโยคนี้ถูกต้องแล้ว',
      rewriteSentence: 'เขียนประโยคใหม่',
      exampleLabel: 'ตัวอย่าง',
      answerLabel: 'คำตอบ',
      correctAnswerPrefix: 'คำตอบที่ถูก',
      previousCard: 'ก่อนหน้า',
      nextCard: 'ถัดไป',
      contentToggle: 'ไทย/EN',
      emptyTitle: 'ยังไม่มีแบบฝึกหัดในส่วนนี้',
      emptyBody: 'กลับไปหน้าก่อนหน้าแล้วเลือกหัวข้ออื่นได้เลย',
      unsupportedTitle: 'แบบฝึกหัดนี้ยังไม่พร้อมในแอป',
      unsupportedBody: 'หัวข้อนี้มีข้อมูลบางส่วน แต่ยังไม่มีรูปแบบแสดงผลที่รองรับในหน้านี้',
    };
  }

  return {
    exercisesLabel: 'Exercises',
    nextExercise: 'Next exercise →',
    backToBank: 'Back to exercise bank',
    checkAnswers: 'Check answers',
    checking: 'Checking...',
    tryAgain: 'Try again',
    reset: 'Reset',
    answerAll: 'Please answer every item before checking.',
    correct: 'Correct',
    needsWork: 'Needs work',
    openPlaceholder: 'Write your answer',
    alreadyCorrect: 'Already correct',
    rewriteSentence: 'Rewrite this sentence',
    exampleLabel: 'Example',
    answerLabel: 'Answer',
    correctAnswerPrefix: 'Correct answer',
    previousCard: 'Previous',
    nextCard: 'Next',
    contentToggle: 'ไทย/EN',
    emptyTitle: 'There are no exercises in this section yet.',
    emptyBody: 'Go back and try another section from the exercise bank.',
    unsupportedTitle: 'This exercise is not ready in the app yet.',
    unsupportedBody: 'This section has some exercise data, but the app does not support rendering this format yet.',
  };
};

const splitTextLines = (value: string | null | undefined) =>
  String(value ?? '')
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

const normalizeOptionLetter = (value: string) => value.trim().replace(/\.$/, '').toUpperCase();

const splitThaiText = (value: string) => {
  const thaiRegex = /[\u0E00-\u0E7F]/;
  const segments = splitTextLines(value);

  if (!segments.length) {
    return { en: '', th: '' };
  }

  let english = '';
  let thai = '';

  segments.forEach((segment) => {
    if (thaiRegex.test(segment)) {
      thai = thai ? `${thai}\n${segment}` : segment;
    } else if (!english) {
      english = segment;
    } else {
      english = `${english}\n${segment}`;
    }
  });

  if (!english) {
    english = segments[0] ?? '';
  }

  return { en: english, th: thai };
};

const getDisplayPromptPair = (primaryValue: string, secondaryValue: string) => {
  const primarySplit = splitThaiText(primaryValue);
  const secondarySplit = splitThaiText(secondaryValue);

  const english = primarySplit.en || secondarySplit.en || primaryValue || secondaryValue || '';
  const thai = secondarySplit.th || primarySplit.th || secondaryValue || '';

  const normalizedEnglish = english.replace(/\s+/g, ' ').trim();
  const normalizedThai = thai.replace(/\s+/g, ' ').trim();

  return {
    english,
    thai: normalizedThai && normalizedThai !== normalizedEnglish ? thai : '',
  };
};

const renderTextWithBlankRuns = (text: string, keyPrefix: string) => {
  const segments = String(text ?? '').split(/(_{2,})/g);
  return segments.map((segment, index) => {
    if (!segment) {
      return null;
    }
    if (/^_{2,}$/.test(segment)) {
      return (
        <Text key={`${keyPrefix}-blank-${index}`} style={styles.inlineBlank}>
          {'\u00A0'.repeat(Math.max(3, Math.min(segment.length, 4)))}
        </Text>
      );
    }
    return <React.Fragment key={`${keyPrefix}-text-${index}`}>{segment}</React.Fragment>;
  });
};

const safeParseArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const safeParseObjectArray = (value: unknown): Record<string, unknown>[] => {
  const parsed = safeParseArray<Record<string, unknown>>(value);
  return parsed.filter((item) => item && typeof item === 'object');
};

const safeParseStringMatrix = (value: unknown): string[][] => {
  const parsed = safeParseArray<unknown>(value);
  return parsed.map((entry) => (Array.isArray(entry) ? entry.map((item) => String(item ?? '').trim()).filter(Boolean) : []));
};

const safeParseAnswerKey = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeOptionLetter(String(item ?? ''))).filter(Boolean);
  }

  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(/[\s,;/]+/)
    .map((item) => normalizeOptionLetter(item))
    .filter(Boolean);
};

const cleanAudioTags = (text: string) => text.replace(/\[audio:[^\]]+\]/gi, '').replace(/\s+/g, ' ').trim();

const getFieldByLang = (value: Record<string, unknown>, field: string, language: ContentLanguage) => {
  const base = typeof value[field] === 'string' ? String(value[field]).trim() : '';
  const english = typeof value[`${field}_en`] === 'string' ? String(value[`${field}_en`]).trim() : '';
  const thai = typeof value[`${field}_th`] === 'string' ? String(value[`${field}_th`]).trim() : '';

  if (language === 'th') {
    return thai || base || english;
  }

  return english || base || thai;
};

const parseOption = (option: unknown): NormalizedOption => {
  if (typeof option === 'string') {
    const match = option.match(/^([A-Z])\.\s*(.*)$/s);
    const body = match?.[2] ?? option;
    const split = splitThaiText(body);
    return {
      label: normalizeOptionLetter(match?.[1] ?? ''),
      text: split.en,
      textTh: split.th,
    };
  }

  if (!option || typeof option !== 'object') {
    return { label: '', text: '', textTh: '' };
  }

  const raw = option as Record<string, unknown>;
  const split = splitThaiText(typeof raw.text === 'string' ? raw.text : '');
  const thaiSplit = splitThaiText(typeof raw.text_th === 'string' ? raw.text_th : typeof raw.textTh === 'string' ? raw.textTh : '');

  return {
    label: normalizeOptionLetter(String(raw.label ?? raw.letter ?? '')),
    text: split.en || thaiSplit.en,
    textTh: split.th || thaiSplit.th,
  };
};

const normalizeExerciseKind = (value: unknown) => {
  const kind = String(value ?? '').trim().toLowerCase();
  if (kind === 'multiple_choice' || kind === 'open' || kind === 'open_ended' || kind === 'fill_blank' || kind === 'sentence_transform') {
    return kind === 'open_ended' ? 'open' : kind;
  }
  return null;
};

const hasVisibleText = (value: unknown) => cleanAudioTags(String(value ?? '')).trim().length > 0;

const itemHasVisibleContent = (item: NormalizedItem) =>
  hasVisibleText(item.text) ||
  hasVisibleText(item.textTh) ||
  hasVisibleText(item.prompt) ||
  hasVisibleText(item.promptTh) ||
  item.textJsonb.some((inline) => hasVisibleText(inline?.text)) ||
  item.options.some((option) => hasVisibleText(option.text) || hasVisibleText(option.textTh)) ||
  item.blanks.length > 0 ||
  Boolean(item.imageUrl);

const exerciseHasVisibleContent = (exercise: NormalizedExercise) =>
  hasVisibleText(exercise.title) ||
  hasVisibleText(exercise.prompt) ||
  hasVisibleText(exercise.paragraph) ||
  exercise.items.some(itemHasVisibleContent);

const getImageUrl = (value: Record<string, unknown>) => {
  const candidates = [value.image_url, value.image, value.image_key];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && /^https?:\/\//i.test(candidate.trim())) {
      return candidate.trim();
    }
  }
  return null;
};

const normalizeExercises = (exercises: ExerciseBankExercise[], contentLang: ContentLanguage) =>
  exercises
    .map((exercise, exerciseIndex) => {
      const raw = exercise as Record<string, unknown>;
      const kind = normalizeExerciseKind(raw.exercise_type ?? raw.kind ?? raw.type);
      const englishItems = Array.isArray(raw.items) ? raw.items : [];
      const thaiItems = Array.isArray(raw.items_th) ? raw.items_th : [];
      const sourceItems =
        contentLang === 'th'
          ? thaiItems.length
            ? thaiItems
            : englishItems
          : englishItems.length
            ? englishItems
            : thaiItems;

      const items = sourceItems.map((item, itemIndex) => {
        const current = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
        const englishFallback =
          englishItems[itemIndex] && typeof englishItems[itemIndex] === 'object'
            ? (englishItems[itemIndex] as Record<string, unknown>)
            : {};
        const thaiFallback =
          thaiItems[itemIndex] && typeof thaiItems[itemIndex] === 'object'
            ? (thaiItems[itemIndex] as Record<string, unknown>)
            : {};
        const text = getFieldByLang(current, 'text', 'en') || getFieldByLang(englishFallback, 'text', 'en');
        const textTh = getFieldByLang(current, 'text', 'th') || getFieldByLang(thaiFallback, 'text', 'th');
        const prompt = getFieldByLang(current, 'prompt', 'en') || getFieldByLang(current, 'question', 'en');
        const promptTh = getFieldByLang(current, 'prompt', 'th') || getFieldByLang(current, 'question', 'th');
        const placeholder = getFieldByLang(current, 'placeholder', 'en') || getFieldByLang(englishFallback, 'placeholder', 'en');
        const placeholderTh = getFieldByLang(current, 'placeholder', 'th') || getFieldByLang(thaiFallback, 'placeholder', 'th');
        const richText = safeParseArray<LessonRichInline>(current.text_jsonb);
        const blankDefinitions = safeParseObjectArray(current.blanks).map((blank, blankIndex) => ({
          id: typeof blank.id === 'string' ? blank.id : `blank-${itemIndex + 1}-${blankIndex + 1}`,
          minLen:
            typeof blank.min_len === 'number'
              ? blank.min_len
              : Number.parseInt(String(blank.min_len ?? ''), 10) > 0
                ? Number.parseInt(String(blank.min_len ?? ''), 10)
                : 4,
        }));
        const inferredBlankCount = kind === 'fill_blank' ? (cleanAudioTags(text).match(/_{2,}/g)?.length ?? 0) : 0;
        const blanks =
          blankDefinitions.length > 0
            ? blankDefinitions
            : Array.from({ length: inferredBlankCount }, (_, blankIndex) => ({
                id: `blank-${itemIndex + 1}-${blankIndex + 1}`,
                minLen: 4,
              }));

        return {
          key: String(current.id ?? `${raw.id ?? `exercise-${exerciseIndex + 1}`}-${itemIndex + 1}`),
          numberLabel: String(current.number ?? itemIndex + 1),
          text,
          textTh,
          textJsonb: richText,
          prompt,
          promptTh,
          placeholder,
          placeholderTh,
          answer: typeof current.answer === 'string' ? current.answer.trim() : '',
          answerLetters: safeParseAnswerKey(current.answer),
          options: Array.isArray(current.options) ? current.options.map(parseOption) : [],
          blanks,
          answersV2: safeParseStringMatrix(current.answers_v2),
          correctTag: typeof current.correct === 'string' ? current.correct.trim().toLowerCase() : '',
          imageUrl: getImageUrl(current) || getImageUrl(englishFallback) || getImageUrl(thaiFallback),
          altText:
            getFieldByLang(current, 'alt_text', 'en') || getFieldByLang(englishFallback, 'alt_text', 'en') || text || prompt,
          altTextTh:
            getFieldByLang(current, 'alt_text', 'th') || getFieldByLang(thaiFallback, 'alt_text', 'th') || textTh || promptTh,
          isExample:
            typeof current.is_example === 'boolean'
              ? current.is_example
              : ['example', 'ex', 'ตัวอย่าง'].includes(String(current.number ?? '').trim().toLowerCase()),
        };
      });

      return {
        id: String(raw.id ?? `bank-exercise-${exerciseIndex + 1}`),
        kind,
        title: getFieldByLang(raw, 'title', contentLang) || getFieldByLang(raw, 'title', 'en') || getFieldByLang(raw, 'prompt', contentLang),
        prompt: getFieldByLang(raw, 'prompt', contentLang),
        paragraph: getFieldByLang(raw, 'paragraph', contentLang),
        items,
      } satisfies NormalizedExercise;
    })
    .sort((a, b) => {
      const aSort = Number((exercises.find((exercise) => String(exercise.id ?? '') === a.id)?.sort_order ?? 0) || 0);
      const bSort = Number((exercises.find((exercise) => String(exercise.id ?? '') === b.id)?.sort_order ?? 0) || 0);
      return aSort - bSort;
    })
    .filter((exercise) => exercise.kind !== null || exerciseHasVisibleContent(exercise));

const normalizeAnswerText = (value: string) => value.replace(/\s+/g, ' ').trim();
const normalizeAnswerTextLoose = (value: string) => normalizeAnswerText(value).toLowerCase();

const getItemStateKey = (exerciseId: string, itemKey: string) => `${exerciseId}:${itemKey}`;
const getBlankKey = (exerciseId: string, itemKey: string, blankId: string) => `${exerciseId}:${itemKey}:${blankId}`;

const areSelectionsCorrect = (selected: string[], answers: string[]) => {
  const selectedSet = new Set(selected.map(normalizeOptionLetter));
  const answerSet = new Set(answers.map(normalizeOptionLetter));
  if (selectedSet.size !== answerSet.size) {
    return false;
  }
  return Array.from(answerSet).every((answer) => selectedSet.has(answer));
};

const isBlankAnswerCorrect = (answer: string, acceptedAnswers: string[]) => {
  const normalizedAnswer = normalizeAnswerTextLoose(answer);
  if (!normalizedAnswer) {
    return false;
  }
  return acceptedAnswers.some((accepted) => normalizeAnswerTextLoose(accepted) === normalizedAnswer);
};

const segmentPracticeTextWithBlanks = (text: string) => {
  const tokens: ({ type: 'text'; text: string } | { type: 'blank'; length: number } | { type: 'line_break' })[] = [];
  let index = 0;
  let buffer = '';

  const flushBuffer = () => {
    if (buffer) {
      tokens.push({ type: 'text', text: buffer });
      buffer = '';
    }
  };

  while (index < text.length) {
    const char = text[index];
    if (char === '\n') {
      flushBuffer();
      tokens.push({ type: 'line_break' });
      index += 1;
      continue;
    }
    if (char === '_') {
      flushBuffer();
      let underscoreCount = 0;
      while (index + underscoreCount < text.length && text[index + underscoreCount] === '_') {
        underscoreCount += 1;
      }
      tokens.push({ type: 'blank', length: underscoreCount });
      index += underscoreCount;
      continue;
    }
    buffer += char;
    index += 1;
  }

  flushBuffer();
  return tokens;
};

const splitMeasureTextTokens = (text: string) => {
  const matches = text.match(/(\[[^\]]+\]|\s+|[^\s\[]+)/g);
  return matches ?? [text];
};

function FillBlankMeasuredRows(props: {
  rowTokens: ({ type: 'text'; text: string } | { type: 'blank'; blankId: string; minLen: number })[];
  exerciseId: string;
  itemKey: string;
  isExample: boolean;
  exampleAnswer: string;
  blankAnswers: Record<string, string>;
  editable: boolean;
  onBlankAnswerChange: (exerciseId: string, itemKey: string, blankId: string, value: string) => void;
}) {
  const { rowTokens, exerciseId, itemKey, isExample, exampleAnswer, blankAnswers, editable, onBlankAnswerChange } = props;
  const [lineTokens, setLineTokens] = useState<FillBlankMeasureToken[][]>([]);
  const [containerWidth, setContainerWidth] = useState(0);
  const fillBlankMeasureTextStyle = styles.fillBlankTextEnglish;
  const fillBlankTextStyle = styles.fillBlankTextEnglish;
  const fillBlankInputStyle = styles.fillBlankInputEnglish;

  const measureTokens = useMemo<FillBlankMeasureToken[]>(() => {
    return rowTokens.reduce<FillBlankMeasureToken[]>((tokens, token, index) => {
      if (token.type === 'text') {
        tokens.push(
          ...splitMeasureTextTokens(token.text).map((part, partIndex) => ({
            id: `text-${index}-${partIndex}`,
            type: 'text' as const,
            text: part,
            measureText: part,
          }))
        );
        return tokens;
      }

      tokens.push({
        id: `blank-${index}`,
        type: 'blank' as const,
        blankId: token.blankId,
        minLen: token.minLen,
        measureText: buildBlankMeasureText(token.minLen),
      });
      return tokens;
    }, []);
  }, [rowTokens]);

  const measurementText = useMemo(() => measureTokens.map((token) => token.measureText).join(''), [measureTokens]);

  const handleTextLayout = (event: { nativeEvent: { lines: { text: string }[] } }) => {
    const measuredLines = event.nativeEvent.lines ?? [];
    if (!measuredLines.length) {
      setLineTokens(measureTokens.length ? [measureTokens] : []);
      return;
    }

    const nextLines: FillBlankMeasureToken[][] = [];
    let tokenIndex = 0;

    measuredLines.forEach((line) => {
      const targetComparable = line.text.replace(/\s+/g, '');
      const bucket: FillBlankMeasureToken[] = [];
      let bucketComparable = '';

      while (tokenIndex < measureTokens.length) {
      const candidate = measureTokens[tokenIndex];
      if (!candidate) {
        break;
      }
      bucket.push(candidate);
        bucketComparable += candidate.measureText.replace(/\s+/g, '');
        tokenIndex += 1;

        if (bucketComparable === targetComparable) {
          break;
        }
      }

      const trimmedBucket = bucket.filter((token, index) => {
        if (token.type !== 'text' || token.text.replace(/\s+/g, '').length > 0) {
          return true;
        }
        const isLeading = index === 0;
        const isTrailing = index === bucket.length - 1;
        return !isLeading && !isTrailing;
      });

      nextLines.push(trimmedBucket);
    });

    if (tokenIndex < measureTokens.length) {
      nextLines.push(measureTokens.slice(tokenIndex));
    }

    setLineTokens(nextLines.length ? nextLines : [measureTokens]);
  };

  return (
    <View
      onLayout={(event) => {
        const width = Math.round(event.nativeEvent.layout.width);
        if (width && width !== containerWidth) {
          setContainerWidth(width);
        }
      }}>
      {containerWidth > 0 ? (
        <Text
          onTextLayout={handleTextLayout}
          style={[styles.fillBlankMeasureText, fillBlankMeasureTextStyle]}
          numberOfLines={0}>
          {measurementText}
        </Text>
      ) : null}

      <Stack gap="xs">
        {(lineTokens.length ? lineTokens : [measureTokens]).map((line, lineIndex) => (
          <View key={`${exerciseId}:${itemKey}:line-${lineIndex}`} style={styles.fillBlankRow}>
            {line.map((token) =>
              token.type === 'text' ? (
                <Text key={token.id} style={[styles.fillBlankText, fillBlankTextStyle]}>
                  {token.text}
                </Text>
              ) : (
                <TextInput
                  key={token.id}
                  editable={!isExample && editable}
                  value={isExample ? exampleAnswer : blankAnswers[getBlankKey(exerciseId, itemKey, token.blankId)] ?? ''}
                  onChangeText={(value) => onBlankAnswerChange(exerciseId, itemKey, token.blankId, value)}
                  style={[
                    styles.fillBlankInput,
                    fillBlankInputStyle,
                    isExample ? styles.fillBlankExampleInput : null,
                    {
                      width: computeBankBlankWidth(containerWidth, token.minLen),
                    },
                  ]}
                />
              )
            )}
          </View>
        ))}
      </Stack>
    </View>
  );
}

export function ExerciseBankPager({
  language,
  contentLang,
  sectionTitle,
  categoryLabel,
  exercises,
  onSetContentLang,
  onBack,
  onDone,
}: ExerciseBankPagerProps) {
  const copy = getCopy(language);
  const normalizedExercises = useMemo(() => normalizeExercises(exercises, contentLang), [contentLang, exercises]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [multipleChoiceSelections, setMultipleChoiceSelections] = useState<Record<string, string[]>>({});
  const [checkedExercises, setCheckedExercises] = useState<Record<string, boolean>>({});
  const [openAnswers, setOpenAnswers] = useState<Record<string, string>>({});
  const [blankAnswers, setBlankAnswers] = useState<Record<string, string>>({});
  const [evaluations, setEvaluations] = useState<Record<string, EvaluationState>>({});
  const [exerciseErrors, setExerciseErrors] = useState<Record<string, string>>({});
  const [markedCorrect, setMarkedCorrect] = useState<Record<string, boolean | null>>({});
  const contentScrollRef = useRef<ScrollView | null>(null);

  const activeExercise = normalizedExercises[activeIndex] ?? null;
  const isLastExercise = activeIndex >= normalizedExercises.length - 1;

  useEffect(() => {
    contentScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [activeIndex, contentLang]);

  const pagerPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          if (normalizedExercises.length <= 1) {
            return false;
          }

          const horizontalDistance = Math.abs(gestureState.dx);
          const verticalDistance = Math.abs(gestureState.dy);
          return horizontalDistance > 10 && horizontalDistance > verticalDistance * 1.1;
        },
        onPanResponderRelease: (_, gestureState) => {
          if (normalizedExercises.length <= 1) {
            return;
          }

          const horizontalDistance = gestureState.dx;
          const verticalDistance = Math.abs(gestureState.dy);
          if (Math.abs(horizontalDistance) < 24 || Math.abs(horizontalDistance) <= verticalDistance) {
            return;
          }

          if (horizontalDistance < 0 && activeIndex < normalizedExercises.length - 1) {
            setActiveIndex((previous) => Math.min(previous + 1, normalizedExercises.length - 1));
            return;
          }

          if (horizontalDistance > 0 && activeIndex > 0) {
            setActiveIndex((previous) => Math.max(previous - 1, 0));
          }
        },
      }),
    [activeIndex, normalizedExercises.length]
  );

  const handleChoice = (exerciseId: string, itemKey: string, optionLabel: string, isMulti: boolean) => {
    const selectionKey = getItemStateKey(exerciseId, itemKey);
    const normalizedLabel = normalizeOptionLetter(optionLabel);
    setMultipleChoiceSelections((previous) => {
      const current = previous[selectionKey] ?? [];
      const currentSet = new Set(current.map(normalizeOptionLetter));

      if (!isMulti) {
        return { ...previous, [selectionKey]: [normalizedLabel] };
      }

      if (currentSet.has(normalizedLabel)) {
        currentSet.delete(normalizedLabel);
      } else {
        currentSet.add(normalizedLabel);
      }

      return { ...previous, [selectionKey]: Array.from(currentSet) };
    });
    setCheckedExercises((previous) => ({ ...previous, [exerciseId]: false }));
    setExerciseErrors((previous) => ({ ...previous, [exerciseId]: '' }));
  };

  const handleCheckMultipleChoice = (exercise: NormalizedExercise) => {
    const missingAnswer = exercise.items.some((item) => {
      const selectionKey = getItemStateKey(exercise.id, item.key);
      return !item.isExample && (multipleChoiceSelections[selectionKey] ?? []).length === 0;
    });

    if (missingAnswer) {
      setExerciseErrors((previous) => ({ ...previous, [exercise.id]: copy.answerAll }));
      return;
    }

    setExerciseErrors((previous) => ({ ...previous, [exercise.id]: '' }));
    setCheckedExercises((previous) => ({ ...previous, [exercise.id]: true }));
  };

  const handleOpenAnswerChange = (exerciseId: string, itemKey: string, value: string) => {
    const answerKey = getItemStateKey(exerciseId, itemKey);
    setOpenAnswers((previous) => ({ ...previous, [answerKey]: value }));
    setCheckedExercises((previous) => ({ ...previous, [exerciseId]: false }));
    setMarkedCorrect((previous) => ({ ...previous, [answerKey]: null }));
    setEvaluations((previous) => {
      if (!(answerKey in previous)) {
        return previous;
      }
      const next = { ...previous };
      delete next[answerKey];
      return next;
    });
    setExerciseErrors((previous) => ({ ...previous, [exerciseId]: '' }));
  };

  const handleBlankAnswerChange = (exerciseId: string, itemKey: string, blankId: string, value: string) => {
    const answerKey = getBlankKey(exerciseId, itemKey, blankId);
    setBlankAnswers((previous) => ({ ...previous, [answerKey]: value }));
    setCheckedExercises((previous) => ({ ...previous, [exerciseId]: false }));
    setEvaluations((previous) => {
      const itemKeyState = getItemStateKey(exerciseId, itemKey);
      if (!(itemKeyState in previous)) {
        return previous;
      }
      const next = { ...previous };
      delete next[itemKeyState];
      return next;
    });
    setExerciseErrors((previous) => ({ ...previous, [exerciseId]: '' }));
  };

  const handleSentenceCorrectToggle = (exerciseId: string, itemKey: string, isCorrect: boolean, sourceText: string) => {
    const answerKey = getItemStateKey(exerciseId, itemKey);
    setCheckedExercises((previous) => ({ ...previous, [exerciseId]: false }));
    setMarkedCorrect((previous) => ({ ...previous, [answerKey]: isCorrect }));
    setOpenAnswers((previous) => ({ ...previous, [answerKey]: isCorrect ? sourceText : previous[answerKey] ?? '' }));
    setEvaluations((previous) => {
      if (!(answerKey in previous)) {
        return previous;
      }
      const next = { ...previous };
      delete next[answerKey];
      return next;
    });
    setExerciseErrors((previous) => ({ ...previous, [exerciseId]: '' }));
  };

  const runEvaluation = async (params: {
    exercise: NormalizedExercise;
    item: NormalizedItem;
    userAnswer: string;
    exerciseType: 'fill_blank' | 'open' | 'sentence_transform';
  }) => {
    const answerKey = getItemStateKey(params.exercise.id, params.item.key);
    setEvaluations((previous) => ({
      ...previous,
      [answerKey]: {
        loading: true,
        correct: null,
        score: null,
        feedbackEn: '',
        feedbackTh: '',
        error: '',
      },
    }));

    try {
      const result = await evaluateLessonAnswer({
        exerciseId: params.exercise.id,
        sourceType: 'bank',
        exerciseType: params.exerciseType,
        userAnswer: params.userAnswer,
        correctAnswer: params.item.answer || params.item.answersV2.flat().join(' | '),
        questionNumber: params.item.numberLabel,
        questionPrompt: params.item.prompt || params.item.text,
      });

      setEvaluations((previous) => ({
        ...previous,
        [answerKey]: mapEvaluationResult(result),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to check your answer right now.';
      setEvaluations((previous) => ({
        ...previous,
        [answerKey]: {
          loading: false,
          correct: null,
          score: null,
          feedbackEn: '',
          feedbackTh: '',
          error: message,
        },
      }));
      setExerciseErrors((previous) => ({ ...previous, [params.exercise.id]: message }));
    }
  };

  const handleCheckOpenExercise = async (exercise: NormalizedExercise) => {
    const missingAnswer = exercise.items.some((item) => {
      if (item.isExample) {
        return false;
      }

      if (exercise.kind === 'fill_blank') {
        return item.blanks.some((blank) => !normalizeAnswerText(blankAnswers[getBlankKey(exercise.id, item.key, blank.id)] ?? ''));
      }

      const answerKey = getItemStateKey(exercise.id, item.key);
      const markState = markedCorrect[answerKey];
      if (exercise.kind === 'sentence_transform' && markState === true) {
        return false;
      }

      return !normalizeAnswerText(openAnswers[answerKey] ?? '');
    });

    if (missingAnswer) {
      setExerciseErrors((previous) => ({ ...previous, [exercise.id]: copy.answerAll }));
      return;
    }

    const attemptedItems = exercise.items.filter((item) => !item.isExample);

    setExerciseErrors((previous) => ({ ...previous, [exercise.id]: '' }));
    setCheckedExercises((previous) => ({ ...previous, [exercise.id]: true }));

    await Promise.all(
      attemptedItems.map(async (item) => {
        const answerKey = getItemStateKey(exercise.id, item.key);
        const markState = markedCorrect[answerKey];
        let userAnswer = '';

        if (exercise.kind === 'fill_blank') {
          userAnswer = item.blanks.map((blank) => normalizeAnswerText(blankAnswers[getBlankKey(exercise.id, item.key, blank.id)] ?? '')).join(' | ');
        } else if (exercise.kind === 'sentence_transform' && markState === true) {
          userAnswer = item.text;
        } else {
          userAnswer = openAnswers[answerKey] ?? '';
        }

        await runEvaluation({
          exercise,
          item,
          userAnswer,
          exerciseType: exercise.kind,
        });
      })
    );
  };

  const isActiveExerciseChecking = useMemo(() => {
    if (!activeExercise) {
      return false;
    }

    return activeExercise.items.some((item) => {
      const evaluation = evaluations[getItemStateKey(activeExercise.id, item.key)];
      return Boolean(evaluation?.loading);
    });
  }, [activeExercise, evaluations]);

  const isActiveExerciseChecked = activeExercise ? Boolean(checkedExercises[activeExercise.id]) : false;

  const isActiveExerciseFullyCorrect = useMemo(() => {
    if (!activeExercise || !isActiveExerciseChecked) {
      return false;
    }

    if (activeExercise.kind === 'multiple_choice') {
      return activeExercise.items.every((item) => {
        if (item.isExample) {
          return true;
        }
        const selectionKey = getItemStateKey(activeExercise.id, item.key);
        return areSelectionsCorrect(multipleChoiceSelections[selectionKey] ?? [], item.answerLetters);
      });
    }

    if (activeExercise.kind === 'fill_blank' || activeExercise.kind === 'open' || activeExercise.kind === 'sentence_transform') {
      return activeExercise.items.every((item) => {
        if (item.isExample) {
          return true;
        }
        return evaluations[getItemStateKey(activeExercise.id, item.key)]?.correct === true;
      });
    }

    return true;
  }, [activeExercise, evaluations, isActiveExerciseChecked, multipleChoiceSelections]);

  const handleRetryExercise = () => {
    if (!activeExercise) {
      return;
    }

    setExerciseErrors((previous) => ({ ...previous, [activeExercise.id]: '' }));
    setCheckedExercises((previous) => ({ ...previous, [activeExercise.id]: false }));

    if (activeExercise.kind === 'multiple_choice') {
      setMultipleChoiceSelections((previous) => {
        const next = { ...previous };
        activeExercise.items.forEach((item) => {
          if (item.isExample) {
            return;
          }
          const selectionKey = getItemStateKey(activeExercise.id, item.key);
          const selections = previous[selectionKey] ?? [];
          if (!areSelectionsCorrect(selections, item.answerLetters)) {
            next[selectionKey] = [];
          }
        });
        return next;
      });
      return;
    }

    if (activeExercise.kind === 'fill_blank') {
      setBlankAnswers((previous) => {
        const next = { ...previous };
        activeExercise.items.forEach((item) => {
          if (item.isExample) {
            return;
          }
          item.blanks.forEach((blank, blankIndex) => {
            const blankKey = getBlankKey(activeExercise.id, item.key, blank.id);
            const currentAnswer = previous[blankKey] ?? '';
            const acceptedAnswers = item.answersV2[blankIndex] ?? [];
            if (!isBlankAnswerCorrect(currentAnswer, acceptedAnswers)) {
              next[blankKey] = '';
            }
          });
        });
        return next;
      });
    } else {
      setOpenAnswers((previous) => {
        const next = { ...previous };
        activeExercise.items.forEach((item) => {
          if (item.isExample) {
            return;
          }
          const itemKey = getItemStateKey(activeExercise.id, item.key);
          if (evaluations[itemKey]?.correct !== true) {
            next[itemKey] = '';
          }
        });
        return next;
      });
    }

    setMarkedCorrect((previous) => {
      const next = { ...previous };
      activeExercise.items.forEach((item) => {
        if (item.isExample) {
          return;
        }
        const itemKey = getItemStateKey(activeExercise.id, item.key);
        if (evaluations[itemKey]?.correct !== true) {
          next[itemKey] = null;
        }
      });
      return next;
    });

    setEvaluations((previous) => {
      const next = { ...previous };
      activeExercise.items.forEach((item) => {
        if (item.isExample) {
          return;
        }
        const itemKey = getItemStateKey(activeExercise.id, item.key);
        if (previous[itemKey]?.correct !== true) {
          delete next[itemKey];
        }
      });
      return next;
    });
  };

  if (!activeExercise) {
    return (
      <View style={styles.emptyWrap}>
        <Stack gap="sm">
          <AppText language={language} variant="body" style={styles.emptyTitle}>
            {copy.emptyTitle}
          </AppText>
          <AppText language={language} variant="muted" style={styles.emptyBody}>
            {copy.emptyBody}
          </AppText>
        </Stack>
        <Button language={language} title={copy.backToBank} onPress={onDone} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.topBarButton}>
          <AppText language={language} variant="caption" style={styles.topBarButtonText}>
            {`← ${copy.backToBank}`}
          </AppText>
        </Pressable>

        <LanguageToggle style={styles.translatePill} />
      </View>

      <View {...(normalizedExercises.length > 1 ? pagerPanResponder.panHandlers : {})} style={styles.pagerBody}>
        <ScrollView
          ref={contentScrollRef}
          style={styles.contentScroll}
          contentContainerStyle={styles.contentScrollContent}
          showsVerticalScrollIndicator={false}>
          <Stack gap="md">
            <View style={styles.headerBlock}>
              <View style={styles.headerTitleRow}>
                <AppText language={contentLang} variant="title" style={styles.sectionTitle}>
                  {sectionTitle}
                </AppText>

                <AppText language={language} variant="muted" style={styles.sectionMeta}>
                  {`${activeIndex + 1} / ${normalizedExercises.length} ${copy.exercisesLabel}`}
                </AppText>
              </View>

              <View style={styles.categoryChip}>
                <AppText language={language} variant="caption" style={styles.categoryChipText}>
                  {categoryLabel}
                </AppText>
              </View>
            </View>

            {activeExercise.title ? (
              <AppText language={contentLang} variant="body" style={styles.exerciseTitle}>
                {activeExercise.title}
              </AppText>
            ) : null}

            {activeExercise.prompt ? (
              <AppText language={contentLang} variant="muted" style={styles.exercisePrompt}>
                {activeExercise.prompt}
              </AppText>
            ) : null}

            {activeExercise.paragraph ? (
              <AppText language={contentLang} variant="muted" style={styles.exerciseParagraph}>
                {activeExercise.paragraph}
              </AppText>
            ) : null}

            {renderExerciseBody({
              copy,
              language,
              contentLang,
              exercise: activeExercise,
              checkedExercises,
              multipleChoiceSelections,
              openAnswers,
              blankAnswers,
              evaluations,
              exerciseErrors,
              markedCorrect,
              onChoice: handleChoice,
              onOpenAnswerChange: handleOpenAnswerChange,
              onBlankAnswerChange: handleBlankAnswerChange,
              onSentenceCorrectToggle: handleSentenceCorrectToggle,
            })}
          </Stack>
        </ScrollView>
      </View>

      <View style={styles.footer}>
        {!isActiveExerciseChecked ? (
          <Button
            language={language}
            title={isActiveExerciseChecking ? copy.checking : copy.checkAnswers}
            onPress={() => {
              if (!activeExercise || isActiveExerciseChecking) {
                return;
              }

              if (activeExercise.kind === 'multiple_choice') {
                handleCheckMultipleChoice(activeExercise);
                return;
              }

              if (
                activeExercise.kind === 'open' ||
                activeExercise.kind === 'fill_blank' ||
                activeExercise.kind === 'sentence_transform'
              ) {
                void handleCheckOpenExercise(activeExercise);
                return;
              }
            }}
            style={styles.footerButtonPrimary}
          />
        ) : isActiveExerciseFullyCorrect ? (
          <Button
            language={language}
            title={isLastExercise ? copy.backToBank : copy.nextExercise}
            onPress={() => {
              if (isLastExercise) {
                onDone();
                return;
              }
              setActiveIndex((previous) => Math.min(previous + 1, normalizedExercises.length - 1));
            }}
            style={styles.footerButtonPrimary}
          />
        ) : (
          <View style={styles.footerSplitRow}>
            <Button
              language={language}
              title={copy.tryAgain}
              variant="outline"
              onPress={handleRetryExercise}
              style={[styles.footerButtonSplit, styles.footerButtonSecondary]}
            />
            <Button
              language={language}
              title={isLastExercise ? copy.backToBank : copy.nextExercise}
              onPress={() => {
                if (isLastExercise) {
                  onDone();
                  return;
                }
                setActiveIndex((previous) => Math.min(previous + 1, normalizedExercises.length - 1));
              }}
              style={[styles.footerButtonSplit, styles.footerButtonNext]}
            />
          </View>
        )}
      </View>
    </View>
  );
}

function mapEvaluationResult(result: EvaluateLessonAnswerResult): EvaluationState {
  return {
    loading: false,
    correct: typeof result.correct === 'boolean' ? result.correct : null,
    score: typeof result.score === 'number' ? result.score : null,
    feedbackEn: typeof result.feedback_en === 'string' ? result.feedback_en : '',
    feedbackTh: typeof result.feedback_th === 'string' ? result.feedback_th : '',
    error: '',
  };
}

function renderExerciseBody(params: {
  copy: PagerCopy;
  language: UiLanguage;
  contentLang: ContentLanguage;
  exercise: NormalizedExercise;
  checkedExercises: Record<string, boolean>;
  multipleChoiceSelections: Record<string, string[]>;
  openAnswers: Record<string, string>;
  blankAnswers: Record<string, string>;
  evaluations: Record<string, EvaluationState>;
  exerciseErrors: Record<string, string>;
  markedCorrect: Record<string, boolean | null>;
  onChoice: (exerciseId: string, itemKey: string, optionLabel: string, isMulti: boolean) => void;
  onOpenAnswerChange: (exerciseId: string, itemKey: string, value: string) => void;
  onBlankAnswerChange: (exerciseId: string, itemKey: string, blankId: string, value: string) => void;
  onSentenceCorrectToggle: (exerciseId: string, itemKey: string, isCorrect: boolean, sourceText: string) => void;
}) {
  const {
    copy,
    language,
    contentLang,
    exercise,
    checkedExercises,
    multipleChoiceSelections,
    openAnswers,
    blankAnswers,
    evaluations,
    exerciseErrors,
    markedCorrect,
    onChoice,
    onOpenAnswerChange,
    onBlankAnswerChange,
    onSentenceCorrectToggle,
  } = params;

  const isChecked = Boolean(checkedExercises[exercise.id]);
  const exerciseError = exerciseErrors[exercise.id] ?? '';
  const openInputStyle = contentLang === 'th' ? styles.openInputThai : styles.openInputEnglish;

  if (exercise.kind === 'multiple_choice') {
    return (
      <Stack gap="md">
        {exercise.items.map((item, itemIndex) => {
          const selectionKey = getItemStateKey(exercise.id, item.key);
          const selections = multipleChoiceSelections[selectionKey] ?? [];
          const selectedSet = new Set(selections);
          const answerSet = new Set(item.answerLetters);
          const isMulti = item.answerLetters.length > 1;

          return (
            <View key={selectionKey} style={styles.questionBlock}>
              <View style={styles.questionHeader}>
                <AppText language="en" variant="caption" style={styles.questionNumber}>
                  {item.numberLabel || `${itemIndex + 1}`}
                </AppText>
                <View style={styles.questionTextWrap}>
                  {item.text ? (
                    <AppText language="en" variant="body" style={styles.questionText}>
                      {renderTextWithBlankRuns(item.text, `${selectionKey}-question`)}
                    </AppText>
                  ) : null}
                  {contentLang === 'th' && item.textTh ? (
                    <AppText language="th" variant="body" style={styles.questionThaiText}>
                      {item.textTh}
                    </AppText>
                  ) : null}
                </View>
              </View>

              <Stack gap="sm">
                {item.options.map((option) => {
                  const isSelected = selectedSet.has(option.label);
                  const isCorrect = answerSet.has(option.label);
                  const isWrongSelection = isChecked && isSelected && !isCorrect;

                  return (
                    <Pressable
                      key={`${selectionKey}:${option.label}`}
                      accessibilityRole="button"
                      onPress={() => onChoice(exercise.id, item.key, option.label, isMulti)}
                      style={[
                        styles.optionButton,
                        isSelected ? styles.optionButtonSelected : null,
                        isChecked && isCorrect ? styles.optionButtonCorrect : null,
                        isWrongSelection ? styles.optionButtonWrong : null,
                      ]}>
                      <View
                        style={[
                          styles.optionLetter,
                          isSelected ? styles.optionLetterSelected : null,
                          isChecked && isCorrect ? styles.optionLetterCorrect : null,
                          isWrongSelection ? styles.optionLetterWrong : null,
                        ]}>
                        <Text style={styles.optionLetterText}>{option.label}</Text>
                      </View>

                      <View style={styles.optionTextWrap}>
                        {option.text ? (
                          <AppText language="en" variant="body" style={styles.optionText}>
                            {option.text}
                          </AppText>
                        ) : null}
                        {contentLang === 'th' && option.textTh ? (
                          <AppText language="th" variant="body" style={styles.optionThaiText}>
                            {option.textTh}
                          </AppText>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </Stack>

              {isChecked ? (
                <View style={styles.feedbackBox}>
                  <AppText language={language} variant="body" style={styles.feedbackHeadline}>
                    {`${copy.correctAnswerPrefix}: ${item.answerLetters.join(', ')}`}
                  </AppText>
                </View>
              ) : null}
            </View>
          );
        })}

        {exerciseError ? (
          <AppText language={language} variant="muted" style={styles.inlineError}>
            {exerciseError}
          </AppText>
        ) : null}

      </Stack>
    );
  }

  if (exercise.kind === 'open' || exercise.kind === 'sentence_transform') {
    return (
      <Stack gap="md">
        {exercise.items.map((item, itemIndex) => {
          const answerKey = getItemStateKey(exercise.id, item.key);
          const evaluation = evaluations[answerKey];
          const markState = markedCorrect[answerKey];
          const promptPair = getDisplayPromptPair(item.prompt || item.text, item.promptTh || item.textTh);
          const answerValue =
            exercise.kind === 'sentence_transform' && markState === true ? item.text : openAnswers[answerKey] ?? '';
          const showMarkButtons = exercise.kind === 'sentence_transform' && (item.correctTag === 'yes' || item.correctTag === 'no');
          const resolvedExampleMarkState =
            item.correctTag === 'yes' ? true : item.correctTag === 'no' ? false : null;
          const displayMarkState = item.isExample ? resolvedExampleMarkState : markState;

          return (
            <View key={answerKey} style={item.isExample ? styles.exampleCard : styles.questionBlock}>
              {item.isExample ? (
                <View style={styles.exampleHeader}>
                  <AppText language="en" variant="caption" style={styles.exampleLabel}>
                    {copy.exampleLabel.toUpperCase()}
                  </AppText>
                </View>
              ) : null}
              <View style={styles.questionHeader}>
                {!item.isExample ? (
                  <AppText language="en" variant="caption" style={styles.questionNumber}>
                    {item.numberLabel || `${itemIndex + 1}`}
                  </AppText>
                ) : null}
                <View style={styles.questionTextWrap}>
                  {promptPair.english ? (
                    <AppText language="en" variant="body" style={styles.questionText}>
                      {renderTextWithBlankRuns(promptPair.english, `${answerKey}-prompt`)}
                    </AppText>
                  ) : null}
                  {contentLang === 'th' && promptPair.thai ? (
                    <AppText language="th" variant="body" style={styles.questionThaiText}>
                      {promptPair.thai}
                    </AppText>
                  ) : null}
                  {showMarkButtons ? (
                    <View style={styles.sentenceToggleRow}>
                      <Pressable
                        accessibilityRole="button"
                        disabled={item.isExample}
                        onPress={() => onSentenceCorrectToggle(exercise.id, item.key, true, item.text)}
                        style={[styles.sentenceToggle, displayMarkState === true ? styles.sentenceToggleActive : null]}>
                        <AppText language="en" variant="caption" style={styles.sentenceToggleText}>
                          ✓
                        </AppText>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        disabled={item.isExample}
                        onPress={() => onSentenceCorrectToggle(exercise.id, item.key, false, item.text)}
                        style={[styles.sentenceToggle, displayMarkState === false ? styles.sentenceToggleActive : null]}>
                        <AppText language="en" variant="caption" style={styles.sentenceToggleText}>
                          X
                        </AppText>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              </View>

              {item.imageUrl ? (
                <View style={styles.imageShell}>
                  <Image
                    source={{ uri: item.imageUrl }}
                    contentFit="contain"
                    accessibilityLabel={contentLang === 'th' ? item.altTextTh || item.altText : item.altText || item.altTextTh}
                    style={styles.image}
                  />
                </View>
              ) : null}

              <TextInput
                multiline
                numberOfLines={4}
                editable={!item.isExample && !evaluation?.loading && markState !== true}
                placeholder={
                  exercise.kind === 'sentence_transform'
                    ? markState === true
                      ? copy.alreadyCorrect
                      : copy.rewriteSentence
                    : item.placeholder || (contentLang === 'th' ? item.placeholderTh : item.placeholder) || copy.openPlaceholder
                }
                placeholderTextColor="#9C9EA4"
                style={[
                  styles.openInput,
                  openInputStyle,
                  item.isExample ? styles.exampleInput : null,
                  markState === true || evaluation?.correct === true ? styles.openInputDisabled : null,
                ]}
                textAlignVertical="top"
                value={item.isExample ? item.answer || item.text : answerValue}
                onChangeText={(value) => onOpenAnswerChange(exercise.id, item.key, value)}
              />

              {item.isExample && item.answer && !showMarkButtons ? (
                <AppText language={language} variant="muted" style={styles.exampleAnswer}>
                  {`${copy.answerLabel}: ${item.answer}`}
                </AppText>
              ) : null}

              {evaluation ? (
                <View style={styles.feedbackBox}>
                  <AppText language={language} variant="body" style={styles.feedbackHeadline}>
                    {evaluation.loading ? copy.checking : evaluation.correct ? copy.correct : copy.needsWork}
                  </AppText>
                  {(contentLang === 'th' ? evaluation.feedbackTh || evaluation.feedbackEn : evaluation.feedbackEn || evaluation.feedbackTh) ? (
                    <AppText language={contentLang} variant="muted" style={styles.feedbackBody}>
                      {contentLang === 'th' ? evaluation.feedbackTh || evaluation.feedbackEn : evaluation.feedbackEn || evaluation.feedbackTh}
                    </AppText>
                  ) : null}
                  {evaluation.error ? (
                    <AppText language={language} variant="muted" style={styles.inlineError}>
                      {evaluation.error}
                    </AppText>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}

        {exerciseError ? (
          <AppText language={language} variant="muted" style={styles.inlineError}>
            {exerciseError}
          </AppText>
        ) : null}

      </Stack>
    );
  }

  if (exercise.kind === 'fill_blank') {
    return (
      <Stack gap="md">
        {exercise.items.map((item, itemIndex) => {
          const itemStateKey = getItemStateKey(exercise.id, item.key);
          const evaluation = evaluations[itemStateKey];
          const sourceTokens = segmentPracticeTextWithBlanks(cleanAudioTags(item.text));
          const rows: ({ type: 'text'; text: string } | { type: 'blank'; blankId: string; minLen: number })[][] = [[]];
          let blankCursor = 0;

          sourceTokens.forEach((token) => {
            if (token.type === 'line_break') {
              rows.push([]);
              return;
            }

            if (token.type === 'blank') {
              const blank = item.blanks[blankCursor] ?? { id: `blank-${blankCursor + 1}`, minLen: token.length };
              rows[rows.length - 1].push({ type: 'blank', blankId: blank.id, minLen: blank.minLen });
              blankCursor += 1;
              return;
            }

            rows[rows.length - 1].push(token);
          });

          return (
            <View key={itemStateKey} style={item.isExample ? styles.fillBlankExampleCard : styles.fillBlankQuestionCard}>
              {item.isExample ? (
                <View style={styles.fillBlankExampleHeader}>
                  <AppText language="en" variant="caption" style={styles.fillBlankExampleLabel}>
                    {copy.exampleLabel.toUpperCase()}
                  </AppText>
                </View>
              ) : null}

              <View style={item.isExample ? styles.fillBlankExampleBody : styles.fillBlankQuestionHeader}>
                {!item.isExample ? (
                  <View style={styles.fillBlankNumberSlot}>
                    <AppText language="en" variant="caption" style={styles.questionNumber}>
                      {item.numberLabel || `${itemIndex + 1}`}
                    </AppText>
                  </View>
                ) : null}

                <View style={[styles.questionTextWrap, styles.fillBlankContentWrap]}>
                  {item.imageUrl ? (
                    <View style={styles.imageShell}>
                      <Image
                        source={{ uri: item.imageUrl }}
                        contentFit="contain"
                        accessibilityLabel={contentLang === 'th' ? item.altTextTh || item.altText : item.altText || item.altTextTh}
                        style={styles.image}
                      />
                    </View>
                  ) : null}

                  <Stack gap="xs">
                    {rows.map((row, rowIndex) => (
                      <FillBlankMeasuredRows
                        key={`${itemStateKey}-row-${rowIndex}`}
                        rowTokens={row}
                        exerciseId={exercise.id}
                        itemKey={item.key}
                        isExample={item.isExample}
                        exampleAnswer={item.answer}
                        blankAnswers={blankAnswers}
                        editable={!evaluation?.loading && evaluation?.correct !== true}
                        onBlankAnswerChange={onBlankAnswerChange}
                      />
                    ))}

                    {contentLang === 'th' && item.textTh ? (
                      <AppText language="th" variant="body" style={styles.questionThaiText}>
                        {item.textTh}
                      </AppText>
                    ) : null}
                  </Stack>
                </View>
              </View>

              {!item.isExample && evaluation ? (
                <View style={styles.feedbackBox}>
                  <AppText language={language} variant="body" style={styles.feedbackHeadline}>
                    {evaluation.loading ? copy.checking : evaluation.correct ? copy.correct : copy.needsWork}
                  </AppText>
                  {(contentLang === 'th' ? evaluation.feedbackTh || evaluation.feedbackEn : evaluation.feedbackEn || evaluation.feedbackTh) ? (
                    <AppText language={contentLang} variant="muted" style={styles.feedbackBody}>
                      {contentLang === 'th' ? evaluation.feedbackTh || evaluation.feedbackEn : evaluation.feedbackEn || evaluation.feedbackTh}
                    </AppText>
                  ) : null}
                  {evaluation.error ? (
                    <AppText language={language} variant="muted" style={styles.inlineError}>
                      {evaluation.error}
                    </AppText>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}

        {exerciseError ? (
          <AppText language={language} variant="muted" style={styles.inlineError}>
            {exerciseError}
          </AppText>
        ) : null}

      </Stack>
    );
  }

  const fallbackItems = exercise.items.filter(itemHasVisibleContent);

  return (
    <Stack gap="md">
      <View style={styles.fallbackCard}>
        <Stack gap="sm">
          <AppText language={language} variant="body" style={styles.fallbackTitle}>
            {copy.unsupportedTitle}
          </AppText>
          <AppText language={language} variant="muted" style={styles.emptyBody}>
            {copy.unsupportedBody}
          </AppText>
        </Stack>
      </View>

      {fallbackItems.length ? (
        <Stack gap="md">
          {fallbackItems.map((item, itemIndex) => {
            const promptPair = getDisplayPromptPair(item.prompt || item.text, item.promptTh || item.textTh);

            return (
              <View key={`${exercise.id}:${item.key}:fallback`} style={styles.questionBlock}>
                <View style={styles.questionHeader}>
                  <AppText language="en" variant="caption" style={styles.questionNumber}>
                    {item.numberLabel || `${itemIndex + 1}`}
                  </AppText>
                  <View style={styles.questionTextWrap}>
                    {promptPair.english ? (
                      <AppText language="en" variant="body" style={styles.questionText}>
                        {renderTextWithBlankRuns(promptPair.english, `${exercise.id}:${item.key}:fallback`)}
                      </AppText>
                    ) : null}
                    {contentLang === 'th' && promptPair.thai ? (
                      <AppText language="th" variant="body" style={styles.questionThaiText}>
                        {promptPair.thai}
                      </AppText>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          })}
        </Stack>
      ) : null}
    </Stack>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    minHeight: 36,
    marginBottom: theme.spacing.xs,
  },
  topBarButton: {
    flex: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  topBarButtonText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semibold,
  },
  translatePill: {
    minWidth: 78,
    minHeight: 38,
  },
  headerBlock: {
    marginBottom: theme.spacing.sm,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    marginBottom: 2,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.warningSurface,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  categoryChipText: {
    color: theme.colors.text,
  },
  sectionTitle: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 28,
    lineHeight: 34,
  },
  sectionMeta: {
    color: theme.colors.mutedText,
  },
  pagerBody: {
    flex: 1,
  },
  contentScroll: {
    flex: 1,
  },
  contentScrollContent: {
    paddingBottom: theme.spacing.md,
  },
  exerciseTitle: {
    color: theme.colors.text,
    fontSize: 21,
    lineHeight: 25,
    fontWeight: theme.typography.weights.bold,
  },
  exercisePrompt: {
    color: theme.colors.mutedText,
  },
  exerciseParagraph: {
    color: theme.colors.mutedText,
  },
  questionBlock: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#D9D9D9',
  },
  fillBlankQuestionCard: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#D9D9D9',
  },
  fillBlankExampleCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.accentSurface,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  fillBlankExampleHeader: {
    marginBottom: 2,
  },
  fillBlankExampleLabel: {
    color: '#3CA0FE',
    fontWeight: theme.typography.weights.bold,
  },
  fillBlankQuestionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.spacing.xs,
  },
  fillBlankExampleBody: {
    gap: theme.spacing.xs,
  },
  fillBlankNumberSlot: {
    minWidth: 18,
  },
  fillBlankContentWrap: {
    gap: theme.spacing.xs,
  },
  exampleCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.accentSurface,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  exampleHeader: {
    marginBottom: 2,
  },
  exampleLabel: {
    color: '#3CA0FE',
    fontWeight: theme.typography.weights.bold,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.spacing.xs,
  },
  questionNumber: {
    minWidth: 18,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
  },
  questionTextWrap: {
    flex: 1,
    gap: 2,
  },
  questionText: {
    color: theme.colors.text,
  },
  inlineBlank: {
    color: 'transparent',
    textDecorationLine: 'underline',
    textDecorationColor: theme.colors.text,
  },
  questionThaiText: {
    color: theme.colors.mutedText,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  optionButtonSelected: {
    backgroundColor: theme.colors.accentSurface,
  },
  optionButtonCorrect: {
    backgroundColor: '#E9F8D2',
  },
  optionButtonWrong: {
    backgroundColor: '#FFE7E7',
  },
  optionLetter: {
    width: 28,
    height: 28,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  optionLetterSelected: {
    backgroundColor: theme.colors.primary,
  },
  optionLetterCorrect: {
    backgroundColor: theme.colors.success,
  },
  optionLetterWrong: {
    backgroundColor: '#F8C9C9',
  },
  optionLetterText: {
    fontFamily: theme.typography.fontFaces.en.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    lineHeight: 13,
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
    marginTop: 1,
  },
  optionTextWrap: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  optionText: {
    color: theme.colors.text,
  },
  optionThaiText: {
    color: theme.colors.mutedText,
  },
  feedbackBox: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.warningSurface,
    padding: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  feedbackHeadline: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semibold,
  },
  feedbackBody: {
    color: theme.colors.mutedText,
  },
  inlineError: {
    color: theme.colors.primary,
  },
  openInput: {
    minHeight: 84,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    color: theme.colors.text,
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.lineHeights.md,
  },
  openInputEnglish: {
    fontFamily: theme.typography.fontFaces.en.regular,
  },
  openInputThai: {
    fontFamily: theme.typography.fontFaces.th.regular,
  },
  openInputDisabled: {
    backgroundColor: '#F0F0F0',
  },
  exampleInput: {
    minHeight: 78,
  },
  sentenceToggleRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  sentenceToggle: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  sentenceToggleActive: {
    backgroundColor: '#91CAFF',
  },
  sentenceToggleText: {
    color: theme.colors.text,
    fontSize: 12,
  },
  imageShell: {
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 180,
  },
  fillBlankRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: 0,
  },
  fillBlankMeasureText: {
    position: 'absolute',
    opacity: 0,
    left: 0,
    right: 0,
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.lineHeights.md,
  },
  fillBlankTextEnglish: {
    fontFamily: theme.typography.fontFaces.en.regular,
  },
  fillBlankTextThai: {
    fontFamily: theme.typography.fontFaces.th.regular,
  },
  fillBlankText: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.lineHeights.md,
  },
  fillBlankInput: {
    minHeight: 32,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 0,
    color: theme.colors.text,
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.lineHeights.md,
    textAlign: 'center',
  },
  fillBlankInputEnglish: {
    fontFamily: theme.typography.fontFaces.en.regular,
  },
  fillBlankInputThai: {
    fontFamily: theme.typography.fontFaces.th.regular,
  },
  fillBlankInputShort: {
    width: 96,
  },
  fillBlankInputLong: {
    width: 132,
  },
  fillBlankExampleInput: {
    backgroundColor: theme.colors.surface,
  },
  exampleAnswer: {
    color: theme.colors.mutedText,
  },
  footer: {
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  footerSplitRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  footerButtonPrimary: {
    width: '100%',
    minHeight: 54,
    borderColor: theme.colors.border,
  },
  footerButtonSplit: {
    flex: 1,
    minHeight: 54,
    borderColor: theme.colors.border,
  },
  footerButtonSecondary: {
    backgroundColor: theme.colors.surface,
  },
  footerButtonNext: {
    backgroundColor: '#91CAFF',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  emptyTitle: {
    color: theme.colors.text,
    textAlign: 'center',
  },
  emptyBody: {
    color: theme.colors.mutedText,
    textAlign: 'center',
  },
  fallbackCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
  },
  fallbackTitle: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
  },
});
