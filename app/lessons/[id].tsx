import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  Alert,
  InteractionManager,
  Keyboard,
  Linking,
  Modal,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextLayoutEventData,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import type { ImageStyle, StyleProp, ViewStyle } from 'react-native';
import { Stack as RouterStack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioMetadata } from 'expo-audio';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  evaluateLessonAnswer,
  fetchLessonAudioSnippetIndex,
  fetchLessonPhraseAudioSnippetIndex,
  fetchLessonAudioUrls,
  getLessonById,
  getLessonsIndex,
  fetchResolvedLesson,
  fetchSignedLessonAudioUrl,
  prefetchResolvedLesson,
} from '@/src/api/lessons';
import { prefetchPricing } from '@/src/api/pricing';
import {
  AppLessonProgressDetail,
  fetchAppLessonProgressDetail,
  writeAppLessonProgress,
} from '@/src/api/app-lesson-progress';
import {
  buildComprehensionAnswerStateUnitKey,
  buildExerciseAnswerStateUnitKey,
  clearLessonAnswerState,
  fetchLessonAnswerStates,
  saveLessonAnswerState,
} from '@/src/api/lesson-answer-state';
import { checkInDailyStreak, fetchUserCompletedLessons, upsertLessonCompletion } from '@/src/api/user';
import { LessonConversationIntroOverlay } from '@/src/components/lesson/LessonConversationIntroOverlay';
import { LessonAudioTray } from '@/src/components/lesson/LessonAudioTray';
import { LessonSnippetAudioButton } from '@/src/components/lesson/LessonSnippetAudioButton';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { Stack } from '@/src/components/ui/Stack';
import { env } from '@/src/config/env';
import {
  getLessonDetailCopy,
  getLessonSectionLabel,
  getLessonSectionTitle,
} from '@/src/copy/lesson-detail';
import { useAppSession } from '@/src/context/app-session-context';
import { useUiLanguage } from '@/src/context/ui-language-context';
import {
  buildAppCardUnitsForSection,
  buildAppComprehensionExerciseKey,
  buildAppExampleRevealKey,
  buildAppExerciseKey,
  buildAppPageKey,
  parseAppCardKey,
} from '@/src/lib/app-lesson-progress';
import { bumpLessonLibraryProgressRefreshToken, setLessonLibrarySelection } from '@/src/lib/lesson-library-selection';
import { ScriptLanguage, splitTextByScript } from '@/src/lib/script-aware-text';
import { theme } from '@/src/theme/theme';
import {
  LessonApplyContent,
  LessonAudioSnippet,
  LessonAudioSnippetIndex,
  LessonListItem,
  LessonPhraseAudioSnippetIndex,
  LessonRichInline,
  LessonRichNode,
  LessonQuestionOption,
  ResolvedLessonSectionItem,
  ResolvedLessonExercise,
  ResolvedLessonPayload,
  ResolvedLessonPhrase,
  ResolvedLessonQuestion,
  ResolvedLessonSection,
  ResolvedLessonTranscriptLine,
} from '@/src/types/lesson';
import pailinBlueThumbsUpImage from '@/assets/images/pailin-blue-circle-thumbs-up.webp';

type UiLanguage = 'en' | 'th';
const LESSON_STAGE_ORDER = ['Beginner', 'Intermediate', 'Advanced', 'Expert'] as const;
const TAB_BAR_LABELS: Record<UiLanguage, { home: string; pathway: string; lessons: string; resources: string; more: string }> = {
  en: {
    home: 'Home',
    pathway: 'Pathway',
    lessons: 'Lessons',
    resources: 'Resources',
    more: 'More',
  },
  th: {
    home: 'หน้าหลัก',
    pathway: 'เส้นทาง',
    lessons: 'บทเรียน',
    resources: 'คลังเสริม',
    more: 'เพิ่มเติม',
  },
};
const RICH_ROW_GAP = theme.spacing.sm;
const RICH_AUDIO_BUTTON_WIDTH = 28;
const RICH_BULLET_WIDTH = 8;
const RICH_NUMBER_BADGE_WIDTH = 24;
const RICH_INDENT_STEP = 12;
const RICH_LIST_ITEM_OFFSET = 26;
const RICH_LIST_ITEM_BASE_OFFSET = 6;
const RICH_AUDIO_MARKER_SPAN = RICH_AUDIO_BUTTON_WIDTH + RICH_ROW_GAP;
const RICH_BULLET_MARKER_SPAN = RICH_BULLET_WIDTH + RICH_ROW_GAP;
const RICH_NUMBER_MARKER_SPAN = RICH_NUMBER_BADGE_WIDTH + RICH_ROW_GAP;
const RICH_AUDIO_TEXT_EXTRA_INSET = 8;
const RICH_ACCENT_BAR_WIDTH = 4;
const RICH_ACCENT_TEXT_GAP = 10;
const PHRASE_AUDIO_MARKER_LANE_WIDTH = RICH_AUDIO_BUTTON_WIDTH + RICH_ACCENT_TEXT_GAP;
const RICH_AUDIO_COLUMN_EXTRA_OFFSET = 0;
const RICH_ACCENT_COLUMN_EXTRA_OFFSET = RICH_ACCENT_BAR_WIDTH + RICH_ACCENT_TEXT_GAP;
const RICH_AUDIO_MARKER_LEFT = -(RICH_AUDIO_BUTTON_WIDTH + RICH_ACCENT_TEXT_GAP - 4);
const RICH_ACCENT_MARKER_LEFT = -(RICH_ACCENT_BAR_WIDTH + RICH_ACCENT_TEXT_GAP);
const RICH_NUMBER_MARKER_LEFT = -(RICH_NUMBER_BADGE_WIDTH + RICH_ROW_GAP);

type LessonTab = {
  id: string;
  type: string;
  section: ResolvedLessonSection | null;
};

type StreakCelebrationState = {
  streak: number;
  title: string;
  body: string;
};

const getStreakCelebrationCopy = (language: UiLanguage, streak: number): StreakCelebrationState => {
  if (language === 'th') {
    return {
      streak,
      title: `${streak}-day streak — เยี่ยมมาก`,
      body: streak > 1 ? 'รักษาจังหวะนี้ต่อไปพรุ่งนี้นะ' : 'เริ่มสตรีคได้สวยมาก กลับมาอีกพรุ่งนี้นะ',
    };
  }

  return {
    streak,
    title: `${streak}-day streak — nice work.`,
    body: streak > 1 ? 'Keep it going tomorrow.' : 'Strong start. Come back tomorrow to build your streak.',
  };
};

type NormalizedLessonQuestionOption = {
  label: string;
  text: string;
  textTh: string;
  imageKey: string | null;
  altText: string;
  altTextTh: string;
};

type NormalizedLessonQuestion = {
  id: string;
  sortOrder: number;
  prompt: string;
  promptEn: string;
  promptTh: string;
  options: NormalizedLessonQuestionOption[];
  answerKey: string[];
  explanation: string;
};

type NormalizedTranscriptLine = {
  id: string;
  sortOrder: number;
  speaker: string;
  speakerTh: string;
  englishLine: string;
  thaiLine: string;
};

type NormalizedApplyContent = {
  promptText: string;
  responseText: string;
  promptNodes: LessonRichNode[];
  responseNodes: LessonRichNode[];
};

const RICH_PAGER_ACTIVE_OFFSET_X: [number, number] = [-6, 10];
const APP_TAB_BAR_HEIGHT = 74;
const RICH_PAGER_FAIL_OFFSET_Y: [number, number] = [-22, 22];
const RICH_PAGER_LEFT_SWIPE_DISTANCE = 18;
const RICH_PAGER_RIGHT_SWIPE_DISTANCE = 28;
const RICH_PAGER_LEFT_SWIPE_VELOCITY = 500;
const RICH_PAGER_RIGHT_SWIPE_VELOCITY = 700;
const RICH_PAGER_DRAG_LIMIT = 28;
const LESSON_INPUT_FOCUS_TOP_OFFSET = 120;
const LESSON_INPUT_KEYBOARD_GAP = 16;

const PRACTICE_INPUT_INITIAL_FOCUS_DELAY = 350;
const PRACTICE_INPUT_RECHECK_DELAY = 120;
const PRACTICE_INPUT_MAX_VISIBILITY_CHECKS = 4;
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
const SECTION_SWIPE_ACTIVE_OFFSET_X: [number, number] = [-10, 10];
const SECTION_SWIPE_FAIL_OFFSET_Y: [number, number] = [-18, 18];
const SECTION_SWIPE_LEFT_DISTANCE = 28;
const SECTION_SWIPE_RIGHT_DISTANCE = 28;
const SECTION_SWIPE_LEFT_VELOCITY = 650;
const SECTION_SWIPE_RIGHT_VELOCITY = 650;

const EMPTY_NORMALIZED_APPLY: NormalizedApplyContent = {
  promptText: '',
  responseText: '',
  promptNodes: [],
  responseNodes: [],
};

type RichSectionGroup = {
  key: string;
  heading: LessonRichNode | null;
  body: LessonRichNode[];
};

type NormalizedLessonPhrase = {
  id: string;
  phrase: string;
  phraseTh: string;
  variant: number;
  nodes: LessonRichNode[];
  markdown: string;
};

type NormalizedPracticeOption = {
  label: string;
  text: string;
  textTh: string;
  textJsonb: LessonRichInline[];
  textJsonbTh: LessonRichInline[];
  imageKey: string | null;
  altText: string;
  altTextTh: string;
};

type NormalizedPracticeItem = {
  key: string;
  rawNumber: string;
  numberLabel: string;
  text: string;
  textTh: string;
  textJsonb: LessonRichInline[];
  textJsonbTh: LessonRichInline[];
  prompt: string;
  promptTh: string;
  placeholder: string;
  placeholderTh: string;
  answer: string;
  answerLetters: string[];
  options: NormalizedPracticeOption[];
  imageKey: string | null;
  altText: string;
  altTextTh: string;
  audioKey: string | null;
  keywords: string;
  correctTag: string;
  stemBlocks: Record<string, unknown>[];
  blanks: { id: string; minLen: number }[];
  answersV2: string[][];
  inputCount: number;
  isExample: boolean;
};

type NormalizedPracticePromptBlock =
  | {
      type: 'text';
      text: string;
      textTh: string;
    }
  | {
      type: 'list';
      items: string[];
    }
  | {
      type: 'image';
      imageKey: string | null;
      altText: string;
      altTextTh: string;
    }
  | {
      type: 'audio';
      audioKey: string | null;
    };

type NormalizedPracticeExercise = {
  id: string;
  kind: 'multiple_choice' | 'open' | 'fill_blank' | 'sentence_transform' | null;
  title: string;
  titleEn: string;
  titleTh: string;
  prompt: string;
  promptEn: string;
  promptTh: string;
  paragraph: string;
  paragraphEn: string;
  paragraphTh: string;
  promptBlocks: NormalizedPracticePromptBlock[];
  items: NormalizedPracticeItem[];
  sortOrder: number;
};

type PracticeEvaluationState = {
  loading: boolean;
  correct: boolean | null;
  score: number | null;
  feedbackEn: string;
  feedbackTh: string;
  error: string;
};

type QuickPracticeRichNode = LessonRichNode & {
  kind: 'quick_practice_exercise';
  exercise: NormalizedPracticeExercise;
  key: string;
};

type PrepareItem = {
  node: LessonRichNode;
  originalIndex: number;
};

type PracticeAbPromptLayout = {
  aLine: string;
  bLine: string;
  thaiLine: string | null;
};

type PendingRichLink = {
  kind: 'lesson' | 'page' | 'external';
  title: string;
  subtitle: string;
  route: string | null;
  externalUrl: string | null;
  actionLabel: string;
  note: string | null;
  icon: keyof typeof MaterialIcons.glyphMap;
};

type PracticeImagePreview = {
  uri: string;
  altText: string;
} | null;

const formatLessonNumber = (lesson: Pick<LessonListItem, 'level' | 'lesson_order'> | null | undefined) => {
  if (typeof lesson?.level === 'number' && typeof lesson?.lesson_order === 'number') {
    return `${lesson.level}.${lesson.lesson_order}`;
  }

  if (typeof lesson?.lesson_order === 'number') {
    return lesson.lesson_order.toString();
  }

  return null;
};

type PracticeFillBlankMeasureToken =
  | { id: string; type: 'text'; text: string; measureText: string; style?: LessonRichInline | null }
  | { id: string; type: 'blank'; blankId: string; minLen: number; measureText: string };

type PracticeFillBlankMirrorLayout = {
  x: number;
  y: number;
  height: number;
};

type PracticeStyledRun = {
  text: string;
  style: LessonRichInline | null | undefined;
};

type PracticeStyledRunCursor = {
  runs: PracticeStyledRun[];
  index: number;
  offset: number;
  disabled: boolean;
};

const getPracticeInlineTextStyle = (
  inline: LessonRichInline | null | undefined,
  compact = false,
  includeUnderline = true
) => [
  styles.practiceInlineText,
  compact ? styles.practiceInlineTextCompact : null,
  {
    fontFamily: getInlineFontFamily('en', {
      bold: inline?.bold === true,
      italic: inline?.italic === true,
    }),
  },
  includeUnderline && inline?.underline ? styles.practiceInlineUnderline : null,
];

const PRACTICE_BRACKET_TOKEN_RE = /(\[[^\]]+\])/g;

const splitPracticeBracketTokens = (text: string) => text.split(PRACTICE_BRACKET_TOKEN_RE).filter(Boolean);

const isPracticeBracketToken = (text: string) => /^\[[^\]]+\]$/.test(text);

const buildPracticeStyledRunsFromInlines = (inlines: LessonRichInline[] | null | undefined, contentLang: UiLanguage) =>
  (inlines ?? [])
    .map((inline) => ({
      text: cleanAudioTags(resolveRichInlineText(inline, contentLang)),
      style: inline,
    }))
    .filter((run) => run.text);

const getInlineFontFamily = (
  language: UiLanguage,
  options?: { bold?: boolean | null; italic?: boolean | null; medium?: boolean | null }
) => {
  const bold = options?.bold === true;
  const italic = options?.italic === true;
  const medium = options?.medium === true;
  const faces = theme.typography.fontFaces[language];

  if (language === 'th') {
    if (bold && italic) {
      return faces.semiboldItalic;
    }
    if (medium && italic) {
      return faces.mediumItalic;
    }
    if (italic) {
      return faces.italic;
    }
    if (bold) {
      return faces.semibold;
    }
    if (medium) {
      return faces.medium;
    }
    return faces.regular;
  }

  if (bold && italic) {
    return faces.semiboldItalic;
  }
  if (medium && italic) {
    return faces.mediumItalic;
  }
  if (bold) {
    return faces.semibold;
  }
  if (medium) {
    return faces.medium;
  }
  if (italic) {
    return faces.italic;
  }
  return faces.regular;
};

const renderPracticeInlineTextToken = (
  token: { type: 'text'; text: string; style?: LessonRichInline | null },
  key: string,
  compact = false
) => {
  return <React.Fragment key={key}>{renderPracticeStyledText(token.text, token.style, key, compact)}</React.Fragment>;
};

const renderPracticeStyledText = (
  content: string,
  style: LessonRichInline | null | undefined,
  key: string,
  compact = false
) => {
  return splitTextByScript(content).map((segment, segmentIndex) => {
    const bracketParts = splitPracticeBracketTokens(segment.text);
    const decoratedChildren = bracketParts.map((part, partIndex) =>
      isPracticeBracketToken(part) ? (
        <Text key={`${key}-segment-${segmentIndex}-part-${partIndex}`} style={styles.practiceInlineBracketText}>
          {part}
        </Text>
      ) : (
        <React.Fragment key={`${key}-segment-${segmentIndex}-part-${partIndex}`}>{part}</React.Fragment>
      )
    );

    return style?.underline ? (
      <View key={`${key}-segment-${segmentIndex}`} style={styles.practiceInlineUnderlineWrap}>
        <Text style={getPracticeInlineTextStyle(style, compact, false)}>{decoratedChildren}</Text>
        <View style={styles.practiceInlineUnderlineLine} />
      </View>
    ) : (
      <Text key={`${key}-segment-${segmentIndex}`} style={getPracticeInlineTextStyle(style, compact)}>
        {decoratedChildren}
      </Text>
    );
  });
};

const renderPracticeTokenWithStyles = (
  text: string,
  cursor: PracticeStyledRunCursor | null,
  keyPrefix: string,
  compact = false
) => {
  if (!text) {
    return null;
  }

  const nodes: React.ReactNode[] = [];
  let remaining = text;
  let pieceIndex = 0;

  while (remaining) {
    if (!cursor || cursor.disabled || !cursor.runs.length) {
      nodes.push(
        <React.Fragment key={`${keyPrefix}-plain-${pieceIndex}`}>
          {renderPracticeStyledText(remaining, null, `${keyPrefix}-plain-${pieceIndex}`, compact)}
        </React.Fragment>
      );
      break;
    }

    const run = cursor.runs[cursor.index];
    if (!run) {
      cursor.disabled = true;
      continue;
    }

    const runText = run.text.slice(cursor.offset);
    if (!runText) {
      cursor.index += 1;
      cursor.offset = 0;
      continue;
    }

    if (!remaining.startsWith(runText[0] ?? '')) {
      cursor.disabled = true;
      nodes.push(
        <React.Fragment key={`${keyPrefix}-plain-${pieceIndex}`}>
          {renderPracticeStyledText(remaining, null, `${keyPrefix}-plain-${pieceIndex}`, compact)}
        </React.Fragment>
      );
      break;
    }

    const takeLength = Math.min(remaining.length, runText.length);
    const piece = remaining.slice(0, takeLength);
    if (piece !== runText.slice(0, takeLength)) {
      cursor.disabled = true;
      nodes.push(
        <React.Fragment key={`${keyPrefix}-plain-${pieceIndex}`}>
          {renderPracticeStyledText(remaining, null, `${keyPrefix}-plain-${pieceIndex}`, compact)}
        </React.Fragment>
      );
      break;
    }

    nodes.push(
      <React.Fragment key={`${keyPrefix}-styled-${pieceIndex}`}>
        {renderPracticeStyledText(piece, run.style, `${keyPrefix}-styled-${pieceIndex}`, compact)}
      </React.Fragment>
    );

    remaining = remaining.slice(takeLength);
    cursor.offset += takeLength;
    if (cursor.offset >= run.text.length) {
      cursor.index += 1;
      cursor.offset = 0;
    }
    pieceIndex += 1;
  }

  return nodes;
};

const splitPracticeMeasureTextTokens = (text: string) => {
  const matches = text.match(/(\[[^\]]+\]|\s+|[^\s\[]+)/g);
  return matches ?? [text];
};

const computePracticeBlankWidth = (containerWidth: number, minLen: number, compact: boolean) => {
  return estimateBlankWidth({
    minLen,
    fontSize: 14.5,
    horizontalPadding: compact ? 8 : 12,
    containerWidth,
    maxWidthRatio: compact ? 0.64 : 0.72,
    hardMaxWidth: compact ? 180 : 220,
  });
};

const getPracticeBlankKey = (exerciseId: string, itemKey: string, blankId: string) => `${exerciseId}:${itemKey}:${blankId}`;

function PracticeFillBlankMeasuredRows(props: {
  rowTokens: ({ type: 'text'; text: string; style?: LessonRichInline | null } | { type: 'blank'; blankId: string; minLen: number })[];
  answerKey: string;
  exerciseId: string;
  itemKey: string;
  isExample: boolean;
  exampleAnswersByBlank: Record<string, string>;
  editable: boolean;
  compact: boolean;
  practiceBlankAnswers: Record<string, string>;
  practiceInputRefsMap: React.MutableRefObject<Record<string, TextInput | null>>;
  styledRuns?: PracticeStyledRun[] | null;
  onBlankAnswerChange: (exerciseId: string, itemKey: string, blankId: string, value: string) => void;
  onInputBlur: (inputKey: string) => void;
  onInputFocus: (inputKey: string) => void;
  onDismissKeyboard: () => void;
}) {
  const {
    rowTokens,
    answerKey,
    exerciseId,
    itemKey,
    isExample,
    exampleAnswersByBlank,
    editable,
    compact,
    practiceBlankAnswers,
    practiceInputRefsMap,
    styledRuns,
    onBlankAnswerChange,
    onInputBlur,
    onInputFocus,
    onDismissKeyboard,
  } = props;
  const [lineTokens, setLineTokens] = useState<PracticeFillBlankMeasureToken[][]>([]);
  const [rawContainerWidth, setRawContainerWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [measurementState, setMeasurementState] = useState<'measuring' | 'stable'>('measuring');
  const [measureVersion, setMeasureVersion] = useState(0);
  const mirrorLayoutsRef = useRef<Record<string, PracticeFillBlankMirrorLayout>>({});
  const measureVersionRef = useRef(0);
  const measurementStateRef = useRef<'measuring' | 'stable'>('measuring');
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const measureTokens = useMemo<PracticeFillBlankMeasureToken[]>(() => {
    return rowTokens.reduce<PracticeFillBlankMeasureToken[]>((tokens, token, index) => {
      if (token.type === 'text') {
        tokens.push(
          ...splitPracticeMeasureTextTokens(token.text).map((part, partIndex) => ({
            id: `text-${index}-${partIndex}`,
            type: 'text' as const,
            text: part,
            measureText: part,
            style: token.style,
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
  }, [compact, rowTokens]);

  const measureTokenSignature = useMemo(
    () =>
      measureTokens
        .map((token) => (token.type === 'text' ? `t:${token.text}` : `b:${token.blankId}:${token.minLen}`))
        .join('|'),
    [measureTokens]
  );

  const blankWidths = useMemo(
    () =>
      measureTokens.reduce<Record<string, number>>((acc, token) => {
        if (token.type === 'blank' && containerWidth > 0) {
          acc[token.id] = computePracticeBlankWidth(containerWidth, token.minLen, compact);
        }
        return acc;
      }, {}),
    [compact, containerWidth, measureTokens]
  );

  useEffect(() => {
    measureVersionRef.current = measureVersion;
  }, [measureVersion]);

  useEffect(() => {
    measurementStateRef.current = measurementState;
  }, [measurementState]);

  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (!rawContainerWidth || !measureTokens.length) {
      return;
    }

    debounceTimeoutRef.current = setTimeout(() => {
      mirrorLayoutsRef.current = {};
      setLineTokens([]);
      setContainerWidth(rawContainerWidth);
      measurementStateRef.current = 'measuring';
      setMeasurementState('measuring');
      const nextVersion = measureVersionRef.current + 1;
      measureVersionRef.current = nextVersion;
      setMeasureVersion(nextVersion);
    }, 50);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [rawContainerWidth, measureTokenSignature]);

  const finalizeMeasuredLines = (layouts: Record<string, PracticeFillBlankMirrorLayout>) => {
    const groupedLines: PracticeFillBlankMeasureToken[][] = [];
    let currentLine: PracticeFillBlankMeasureToken[] = [];
    let currentY: number | null = null;

    measureTokens.forEach((token) => {
      const layout = layouts[token.id];
      if (!layout) {
        return;
      }

      const layoutCenterY = layout.y + layout.height / 2;
      if (currentY === null || Math.abs(layoutCenterY - currentY) <= 6) {
        currentLine.push(token);
        currentY = currentY ?? layoutCenterY;
        return;
      }

      groupedLines.push(currentLine);
      currentLine = [token];
      currentY = layoutCenterY;
    });

    if (currentLine.length) {
      groupedLines.push(currentLine);
    }

    const resolved = groupedLines.length
      ? groupedLines.map((line) =>
          line.filter((token, index) => {
            if (token.type !== 'text' || token.text.replace(/\s+/g, '').length > 0) {
              return true;
            }
            const isLeading = index === 0;
            const isTrailing = index === line.length - 1;
            return !isLeading && !isTrailing;
          })
        )
      : [measureTokens];

    setLineTokens(resolved);
    measurementStateRef.current = 'stable';
    setMeasurementState('stable');
  };

  const handleMirrorTokenLayout = (tokenId: string, version: number) => (event: { nativeEvent: { layout: { x: number; y: number } } }) => {
    if (version !== measureVersionRef.current || measurementStateRef.current !== 'measuring') {
      return;
    }

    const nextLayout = {
      x: Math.round(event.nativeEvent.layout.x),
      y: Math.round(event.nativeEvent.layout.y),
      height: Math.round(event.nativeEvent.layout.height),
    };
    const current = mirrorLayoutsRef.current[tokenId];
    if (current && current.x === nextLayout.x && current.y === nextLayout.y && current.height === nextLayout.height) {
      return;
    }

    const nextLayouts = {
      ...mirrorLayoutsRef.current,
      [tokenId]: nextLayout,
    };
    mirrorLayoutsRef.current = nextLayouts;

    if (Object.keys(nextLayouts).length === measureTokens.length) {
      finalizeMeasuredLines(nextLayouts);
    }
  };

  const visibleLines = lineTokens.length ? lineTokens : [measureTokens];
  const styledCursor =
    styledRuns && styledRuns.length
      ? { runs: styledRuns, index: 0, offset: 0, disabled: false }
      : null;

  return (
    <View
      style={styles.practiceFillBlankMeasuredShell}
      onLayout={(event) => {
        const width = Math.round(event.nativeEvent.layout.width);
        if (width && width !== rawContainerWidth) {
          setRawContainerWidth(width);
        }
      }}>
      {containerWidth > 0 && measurementState === 'measuring' ? (
        <View key={`mirror-${answerKey}-${measureVersion}`} pointerEvents="none" style={styles.practiceFillBlankMirrorShell}>
          <View style={styles.practiceFillBlankMirrorRow}>
            {measureTokens.map((token) =>
              token.type === 'text' ? (
                <Text
                  key={`${answerKey}:mirror:${measureVersion}:${token.id}`}
                  onLayout={handleMirrorTokenLayout(token.id, measureVersion)}
                  style={getPracticeInlineTextStyle(token.style, compact)}>
                  {token.text}
                </Text>
              ) : (
                <View
                  key={`${answerKey}:mirror:${measureVersion}:${token.id}`}
                  onLayout={handleMirrorTokenLayout(token.id, measureVersion)}
                  style={[
                    styles.practiceFillBlankMirrorBlank,
                    compact ? styles.practiceFillBlankMirrorBlankCompact : null,
                    {
                      width: blankWidths[token.id] ?? computePracticeBlankWidth(containerWidth, token.minLen, compact),
                    },
                  ]}
                />
              )
            )}
          </View>
        </View>
      ) : null}

      {measurementState === 'stable' ? (
        <Stack gap="xs">
          {visibleLines.map((line, lineIndex) => (
          <View key={`${answerKey}:line-${lineIndex}`} style={styles.practiceFillBlankMeasuredRow}>
            {line.map((token) =>
              token.type === 'text' ? (
                <React.Fragment key={`${answerKey}:${token.id}`}>
                  {styledCursor
                    ? renderPracticeTokenWithStyles(token.text, styledCursor, `${answerKey}:${token.id}`, compact)
                    : renderPracticeInlineTextToken(token, `${answerKey}:${token.id}`, compact)}
                </React.Fragment>
              ) : (
                <View
                  key={token.id}
                  style={[
                    styles.practiceFillBlankInputShell,
                    compact ? styles.practiceFillBlankInputShellCompact : null,
                    {
                      width: blankWidths[token.id] ?? computePracticeBlankWidth(containerWidth || rawContainerWidth, token.minLen, compact),
                    },
                  ]}>
                  <TextInput
                    ref={(ref) => {
                      practiceInputRefsMap.current[`${answerKey}:${token.id}`] = ref;
                    }}
                    value={
                      isExample
                        ? exampleAnswersByBlank[token.blankId] ?? ''
                        : practiceBlankAnswers[getPracticeBlankKey(exerciseId, itemKey, token.blankId)] ?? ''
                    }
                    onChangeText={(value) => onBlankAnswerChange(exerciseId, itemKey, token.blankId, value)}
                    onBlur={() => onInputBlur(`${answerKey}:${token.id}`)}
                    onFocus={() => onInputFocus(`${answerKey}:${token.id}`)}
                    onSubmitEditing={onDismissKeyboard}
                    editable={!isExample && editable}
                    blurOnSubmit
                    style={[
                      styles.practiceFillBlankInputField,
                      compact ? styles.practiceFillBlankInputFieldCompact : null,
                    ]}
                  />
                </View>
              )
            )}
          </View>
          ))}
        </Stack>
      ) : null}
    </View>
  );
}

const MASTER_ORDER = [
  'prepare',
  'comprehension',
  'transcript',
  'apply',
  'understand',
  'extra_tip',
  'common_mistake',
  'phrases_verbs',
  'culture_note',
  'practice',
] as const;

const CYAN_HIGHLIGHT = '#00ffff';
const APPLY_ACCENT_COLOR = '#7BE6C9';
const UNDERSTAND_HIGHLIGHTS = new Set(['#f4cccc', '#d9ead3', '#c9daf7', '#c9daf8']);
const INLINE_MARKER_RE = /(\[X\]|\[✓\]|\[√\]|\[-\]|\[x\]|\[check\])/g;
const SPEAKER_PREFIX_RE = /^\s*((?:[A-Za-z][A-Za-z ]{0,24}|[\u0E00-\u0E7F][\u0E00-\u0E7F ]{0,24}):\s*)/;
const INLINE_MARKER_COLORS: Record<string, string> = {
  '[X]': '#FD6969',
  '[x]': '#FD6969',
  '[✓]': '#3CA0FE',
  '[√]': '#3CA0FE',
  '[check]': '#3CA0FE',
  '[-]': '#28A265',
};
const INLINE_MARKER_DISPLAY: Record<string, string> = {
  '[X]': 'x',
  '[x]': 'x',
  '[✓]': '✓',
  '[√]': '✓',
  '[check]': '✓',
  '[-]': '-',
};
const EMPTY_SNIPPET_INDEX: LessonAudioSnippetIndex = {
  byKey: {},
  bySection: {},
};

const EMPTY_PHRASE_SNIPPET_INDEX: LessonPhraseAudioSnippetIndex = {
  byKey: {},
  byPhrase: {},
};
const QUICK_PRACTICE_FILTER_WINDOW = 8;

const getResolvedSectionType = (section: ResolvedLessonSection) => section.type ?? section.section_type ?? null;

const hasLessonPhrases = (phrases: ResolvedLessonPayload['phrases']) =>
  (phrases ?? []).some((item) => {
    if (!item || typeof item !== 'object') {
      return false;
    }
    const content = 'content' in item && typeof item.content === 'string' ? item.content.trim() : '';
    const contentMd = 'content_md' in item && typeof item.content_md === 'string' ? item.content_md.trim() : '';
    return Boolean(content || contentMd);
  });

const parsePracticeAbPromptLayout = (
  item: NormalizedPracticeItem,
  options?: { stripBlankPlaceholders?: boolean }
): PracticeAbPromptLayout | null => {
  const hasAbPromptMarkers = (value: string) => /^\s*A:/m.test(value) && /(?:^|\s)B:\s*/m.test(value);
  const extractAbThaiLine = (value: string) => {
    const lines = splitTextLines(value);
    if (!lines.length) {
      return '';
    }

    const thaiOnlyLines = lines.filter((line) => {
      if (!THAI_TEXT_RE.test(line)) {
        return false;
      }
      if (/^\s*[AB]:/i.test(line)) {
        return false;
      }
      if (line.includes('_')) {
        return false;
      }
      return true;
    });

    if (thaiOnlyLines.length) {
      return thaiOnlyLines.join('\n');
    }

    return splitThaiText(value).th.trim();
  };
  const englishCandidates = [
    item.prompt,
    item.text,
    textJsonbToString(item.textJsonb),
    textJsonbToString(item.textJsonbTh),
  ]
    .map((value) => String(value ?? '').replace(/\r\n/g, '\n').trim())
    .filter(Boolean);
  const englishSource =
    englishCandidates.find((value) => hasAbPromptMarkers(value)) ??
    englishCandidates[0] ??
    '';
  if (!englishSource || !hasAbPromptMarkers(englishSource)) {
    return null;
  }

  const compactSource = englishSource.replace(/\r\n/g, '\n');
  const sameLineMatch = compactSource.match(/^\s*(A:\s*.*?)(?=\s*B:\s*)(?:\s*)(B:\s*.*)$/s);

  let aLine = '';
  let bLineSource = '';

  if (sameLineMatch) {
    aLine = sameLineMatch[1].trim();
    bLineSource = sameLineMatch[2].trim();
  } else {
    const lines = compactSource
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    aLine = lines.find((line) => /^A:\s*/.test(line)) ?? lines[0] ?? '';
    bLineSource = lines.find((line) => /^B:\s*/.test(line)) ?? lines[lines.length - 1] ?? '';
  }

  const bMatch = bLineSource.match(/^B:\s*(.*)$/);
  if (!aLine || !bMatch) {
    return null;
  }

  const shouldStripBlankPlaceholders = options?.stripBlankPlaceholders === true;
  const bSuffix = shouldStripBlankPlaceholders
    ? bMatch[1].replace(/_{2,}/g, '').trim()
    : bMatch[1].trim();
  const thaiCandidates = [
    item.promptTh,
    item.textTh,
    textJsonbToString(item.textJsonbTh),
  ]
    .map((value) => String(value ?? '').replace(/\r\n/g, '\n').trim())
    .filter(Boolean);
  const thaiSource = thaiCandidates[0] ?? '';
  const thaiLine = extractAbThaiLine(thaiSource);

  return {
    aLine,
    bLine: bSuffix ? `B: ${bSuffix}` : 'B:',
    thaiLine: thaiLine || null,
  };
};

const buildLessonTabs = (lesson: ResolvedLessonPayload | null): LessonTab[] => {
  if (!lesson) {
    return [];
  }

  const sections = (lesson.sections ?? []).map((section, index) => ({
    ...section,
    id: getSectionId(section, index),
  }));

  const tabs: (LessonTab | null)[] = MASTER_ORDER.map((type) => {
    if (type === 'comprehension') {
      return (lesson.questions?.length ?? 0) > 0 ? { id: 'comprehension', type, section: null } : null;
    }
    if (type === 'transcript') {
      return (lesson.transcript?.length ?? 0) > 0 ? { id: 'transcript', type, section: null } : null;
    }
    if (type === 'practice') {
      return (lesson.practice_exercises?.length ?? 0) > 0 ? { id: 'practice', type, section: null } : null;
    }
    if (type === 'phrases_verbs') {
      return hasLessonPhrases(lesson.phrases) ? { id: 'phrases_verbs', type, section: null } : null;
    }

    const section = sections.find((item) => getResolvedSectionType(item) === type) ?? null;
    return section ? { id: section.id ?? type, type, section } : null;
  });

  return tabs.filter((item): item is LessonTab => item !== null);
};

const getSectionId = (section: ResolvedLessonSection, index: number) =>
  typeof section.id === 'string' && section.id.trim().length > 0 ? section.id : `section-${index + 1}`;

const getSectionNotes = (uiLanguage: UiLanguage, section: ResolvedLessonSection) => {
  const copy = getLessonDetailCopy(uiLanguage);
  const notes: string[] = [];
  const richNodes =
    (Array.isArray(section.content_jsonb) ? section.content_jsonb.length : 0) +
    (Array.isArray(section.content_jsonb_th) ? section.content_jsonb_th.length : 0);

  if (richNodes > 0) {
    notes.push(copy.richBlocksLoaded);
  }

  if (section.audio_url || section.conversation_audio_url) {
    notes.push(copy.audioLinkedData);
  }

  notes.push(copy.sectionTypeLabel(getLessonSectionLabel(uiLanguage, getResolvedSectionType(section))));

  return notes;
};

const hasSectionAudio = (section: ResolvedLessonSection) => Boolean(section.audio_url || section.conversation_audio_url);

const splitTextLines = (value: string | null | undefined) =>
  String(value ?? '')
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

const safeParseArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const safeParseAnswerKey = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    return value
      .split(/[,\s/]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeOptionLetter = (value: string) => value.trim().replace(/\.$/, '').toUpperCase();
const areChoiceSetsEqual = (selectedLabels: string[], answerLabels: string[]) => {
  const selectedSet = new Set(selectedLabels.map(normalizeOptionLetter));
  const answerSet = new Set(answerLabels.map(normalizeOptionLetter));

  return selectedSet.size === answerSet.size && Array.from(answerSet).every((label) => selectedSet.has(label));
};

const stripPracticeOptionPrefix = (label: string, value: string) => {
  if (!label || !value) {
    return value;
  }

  return value.replace(new RegExp(`^${label}\\.\\s*`, 'i'), '');
};

const stripPracticeOptionPrefixInlines = (label: string, inlines: LessonRichInline[]) => {
  if (!label || inlines.length === 0) {
    return inlines;
  }

  const [first, ...rest] = inlines;
  const firstText = typeof first?.text === 'string' ? first.text : '';
  const nextText = stripPracticeOptionPrefix(label, firstText);
  if (nextText === firstText) {
    return inlines;
  }
  if (!nextText) {
    return rest;
  }

  return [{ ...first, text: nextText }, ...rest];
};

const cleanPracticeOptionInlines = (label: string, value: unknown) =>
  stripPracticeOptionPrefixInlines(label, safeParseArray<LessonRichInline>(value))
    .map((inline) =>
      typeof inline?.text === 'string'
        ? {
            ...inline,
            text: stripInlineMediaTags(inline.text),
          }
        : inline
    )
    .filter((inline) => (typeof inline?.text === 'string' ? inline.text.trim().length > 0 : true));

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

const extractThaiParentheticalText = (value: string) => {
  const matches = Array.from(String(value ?? '').matchAll(/\(([^()]*)\)/g));

  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const candidate = matches[index]?.[1]?.trim() ?? '';
    if (candidate && THAI_TEXT_RE.test(candidate)) {
      return candidate;
    }
  }

  return '';
};

const splitMixedPracticeField = (value: string) => {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    return { en: '', th: '' };
  }

  const lineSplit = splitThaiText(normalized);
  if (lineSplit.en && lineSplit.th) {
    return lineSplit;
  }

  const firstThaiIndex = normalized.search(/[\u0E00-\u0E7F]/);
  if (firstThaiIndex <= 0) {
    return lineSplit;
  }

  return {
    en: normalized.slice(0, firstThaiIndex).trim(),
    th: normalized.slice(firstThaiIndex).trim(),
  };
};

const parsePracticeOption = (option: unknown): NormalizedPracticeOption => {
  if (typeof option === 'string') {
    const match = option.match(/^([A-Z])\.\s*(.*)$/s);
    const label = normalizeOptionLetter(match?.[1] ?? '');
    const body = match?.[2] ?? option;
    const imageKey = getInlineImageKey(body);
    const { en, th } = splitThaiText(stripInlineMediaTags(body));
    return {
      label,
      text: en,
      textTh: th,
      textJsonb: [],
      textJsonbTh: [],
      imageKey,
      altText: en || th,
      altTextTh: th || en,
    };
  }

  if (!option || typeof option !== 'object') {
    return {
      label: '',
      text: '',
      textTh: '',
      textJsonb: [],
      textJsonbTh: [],
      imageKey: null,
      altText: '',
      altTextTh: '',
    };
  }

  const raw = option as Record<string, unknown>;
  const label = normalizeOptionLetter(String(raw.label ?? raw.letter ?? ''));
  const body = stripInlineMediaTags(stripPracticeOptionPrefix(label, typeof raw.text === 'string' ? raw.text : ''));
  const thaiBody = stripInlineMediaTags(
    stripPracticeOptionPrefix(label, typeof raw.text_th === 'string' ? raw.text_th : typeof raw.textTh === 'string' ? raw.textTh : '')
  );
  const { en, th } = splitThaiText(body);
  const thaiSplit = splitThaiText(thaiBody);
  const text = en || thaiSplit.en;
  const textTh = th || thaiSplit.th;
  const textJsonb = cleanPracticeOptionInlines(label, raw.text_jsonb);
  const textJsonbTh = cleanPracticeOptionInlines(label, raw.text_jsonb_th);
  const imageKey =
    typeof raw.image_key === 'string' && raw.image_key.trim()
      ? raw.image_key.trim()
      : typeof raw.imageKey === 'string' && raw.imageKey.trim()
        ? raw.imageKey.trim()
        : getInlineImageKey(raw.text, raw.text_th, raw.textTh, raw.text_jsonb, raw.text_jsonb_th);
  const altText =
    typeof raw.alt_text === 'string' && raw.alt_text.trim()
      ? stripPracticeOptionPrefix(label, raw.alt_text.trim())
      : text || textTh || label;
  const altTextTh =
    typeof raw.alt_text_th === 'string' && raw.alt_text_th.trim()
      ? stripPracticeOptionPrefix(label, raw.alt_text_th.trim())
      : textTh || altText;

  return {
    label,
    text,
    textTh,
    textJsonb,
    textJsonbTh,
    imageKey,
    altText,
    altTextTh,
  };
};

const getPracticeFieldByLang = (
  value: Record<string, unknown>,
  field: string,
  language: UiLanguage
) => {
  const base = typeof value[field] === 'string' ? String(value[field]).trim() : '';
  const english = typeof value[`${field}_en`] === 'string' ? String(value[`${field}_en`]).trim() : '';
  const thai = typeof value[`${field}_th`] === 'string' ? String(value[`${field}_th`]).trim() : '';

  if (language === 'th') {
    return thai || base || english;
  }

  return english || base || thai;
};

const getPracticeExactLocalizedField = (
  value: Record<string, unknown>,
  field: string,
  language: UiLanguage
) => {
  const suffix = language === 'th' ? 'th' : 'en';
  const camelSuffix = language === 'th' ? 'Th' : 'En';
  const snake = typeof value[`${field}_${suffix}`] === 'string' ? String(value[`${field}_${suffix}`]).trim() : '';
  const camel = typeof value[`${field}${camelSuffix}`] === 'string' ? String(value[`${field}${camelSuffix}`]).trim() : '';
  return snake || camel;
};

const hasMeaningfulRichInlineFormatting = (inline: LessonRichInline) =>
  inline.bold === true ||
  inline.italic === true ||
  inline.underline === true ||
  (typeof inline.highlight === 'string' && inline.highlight.trim().length > 0) ||
  (typeof inline.link === 'string' && inline.link.trim().length > 0);

const safeParseObjectArray = (value: unknown): Record<string, unknown>[] => {
  const parsed = safeParseArray<Record<string, unknown>>(value);
  return parsed.filter((item) => item && typeof item === 'object');
};

const safeParseStringMatrix = (value: unknown): string[][] => {
  const parsed = safeParseArray<unknown>(value);
  return parsed.map((entry) =>
    Array.isArray(entry) ? entry.map((item) => String(item ?? '').trim()).filter(Boolean) : []
  );
};

const inlineTextToPlainString = (value: LessonRichInline['text']) => {
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object') {
    const localized = value as { en?: string | null; th?: string | null };
    return String(localized.en ?? localized.th ?? '');
  }
  return '';
};

const textJsonbToString = (inlines: LessonRichInline[]) => inlines.map((inline) => inlineTextToPlainString(inline?.text)).join('');

const INLINE_AUDIO_TAG_RE = /\[audio:([^\]]+)\]/i;
const INLINE_IMAGE_TAG_RE = /\[img:([^\]]+)\]/i;

const stripInlineMediaTags = (value: string) =>
  value
    .replace(/\[audio:[^\]]+\]/gi, ' ')
    .replace(/\[img:[^\]]+\]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const stripInlineMediaTagsPreserveLineBreaks = (value: string) =>
  String(value ?? '')
    .replace(/\[audio:[^\]]+\]/gi, ' ')
    .replace(/\[img:[^\]]+\]/gi, ' ')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[^\S\n]+/g, ' ').trim())
    .join('\n')
    .trim();

const getInlineImageKey = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string') {
      const match = value.match(INLINE_IMAGE_TAG_RE);
      const key = match?.[1]?.trim();
      if (key) {
        return key;
      }
      continue;
    }

    if (Array.isArray(value)) {
      const key = getInlineImageKey(
        ...value.map((inline) =>
          inline && typeof inline === 'object' && 'text' in inline
            ? (inline as { text?: unknown }).text
            : null
        )
      );
      if (key) {
        return key;
      }
    }
  }

  return null;
};

const getInlineAudioKey = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string') {
      const match = value.match(INLINE_AUDIO_TAG_RE);
      const key = match?.[1]?.trim();
      if (key) {
        return key;
      }
      continue;
    }

    if (Array.isArray(value)) {
      const key = getInlineAudioKey(
        ...value.map((inline) =>
          inline && typeof inline === 'object' && 'text' in inline
            ? (inline as { text?: unknown }).text
            : null
        )
      );
      if (key) {
        return key;
      }
    }
  }

  return null;
};

const getPracticeAnswerValue = (...sources: Record<string, unknown>[]) => {
  for (const source of sources) {
    const value =
      typeof source.answer === 'string' && source.answer.trim()
        ? source.answer
        : typeof source.sample_answer === 'string' && source.sample_answer.trim()
          ? source.sample_answer
          : typeof source.expected_answer === 'string' && source.expected_answer.trim()
            ? source.expected_answer
            : typeof source.keywords === 'string' && source.keywords.trim()
              ? source.keywords
              : '';
    if (value) {
      return value.trim();
    }
  }

  return '';
};

const normalizePracticeInputCount = (value: unknown) => {
  const parsed =
    typeof value === 'number' && Number.isFinite(value)
      ? value
      : Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const parsePracticePromptBlocks = (value: unknown): NormalizedPracticePromptBlock[] => {
  const blocks = safeParseObjectArray(value);

  return blocks
    .map((block) => {
      const type = String(block.type ?? '').trim().toLowerCase();

      if (type === 'text') {
        return {
          type: 'text' as const,
          text: typeof block.text === 'string' ? block.text.trim() : '',
          textTh: typeof block.text_th === 'string' ? block.text_th.trim() : '',
        };
      }

      if (type === 'list') {
        return {
          type: 'list' as const,
          items: safeParseArray<unknown>(block.items).map((item) => String(item ?? '').trim()).filter(Boolean),
        };
      }

      if (type === 'image') {
        return {
          type: 'image' as const,
          imageKey: typeof block.image_key === 'string' ? block.image_key : null,
          altText: typeof block.alt_text === 'string' ? block.alt_text.trim() : '',
          altTextTh: typeof block.alt_text_th === 'string' ? block.alt_text_th.trim() : '',
        };
      }

      if (type === 'audio') {
        return {
          type: 'audio' as const,
          audioKey: typeof block.audio_key === 'string' ? block.audio_key : null,
        };
      }

      return null;
    })
    .filter((block): block is NormalizedPracticePromptBlock => block !== null);
};

const normalizePracticeExerciseKind = (value: unknown) => {
  const kind = String(value ?? '').trim().toLowerCase();
  if (!kind) {
    return null;
  }

  if (kind === 'multiple_choice' || kind === 'multiple choice' || kind === 'mcq') {
    return 'multiple_choice';
  }
  if (kind === 'open' || kind === 'open_ended' || kind === 'open ended' || kind === 'short_answer' || kind === 'short answer') {
    return 'open';
  }
  if (
    kind === 'fill_blank' ||
    kind === 'fill in the blank' ||
    kind === 'fill in the blanks' ||
    kind === 'fill-in-the-blank' ||
    kind === 'fill-in-the-blanks' ||
    kind.includes('fill') && kind.includes('blank')
  ) {
    return 'fill_blank';
  }
  if (
    kind === 'sentence_transform' ||
    kind === 'sentence transformation' ||
    kind === 'sentence_transformations' ||
    kind === 'sentence transformation exercise' ||
    kind.includes('sentence') && kind.includes('transform')
  ) {
    return 'sentence_transform';
  }
  return null;
};

const normalizePracticeExercise = (exercise: ResolvedLessonExercise, contentLang: UiLanguage): NormalizedPracticeExercise => {
  const raw = exercise as Record<string, unknown>;
  const kind = normalizePracticeExerciseKind(raw.kind ?? raw.exercise_type ?? raw.type);
  const englishItemsSource = Array.isArray(raw.items_en) && raw.items_en.length
    ? raw.items_en
    : Array.isArray(raw.items)
      ? raw.items
      : [];
  const thaiItemsSource = Array.isArray(raw.items_th) ? raw.items_th : [];
  const itemsSource = englishItemsSource.length ? englishItemsSource : thaiItemsSource;

  const items = itemsSource.map((item, index) => {
    const current = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const englishFallback =
      englishItemsSource[index] && typeof englishItemsSource[index] === 'object'
        ? (englishItemsSource[index] as Record<string, unknown>)
        : {};
    const currentNumber = current.number != null ? String(current.number) : null;
    const thaiFallbackByNumber = currentNumber
      ? thaiItemsSource.find(
          (thaiItem) =>
            thaiItem &&
            typeof thaiItem === 'object' &&
            String((thaiItem as Record<string, unknown>).number ?? '') === currentNumber
        )
      : null;
    const thaiFallback =
      thaiFallbackByNumber && typeof thaiFallbackByNumber === 'object'
        ? (thaiFallbackByNumber as Record<string, unknown>)
        : thaiItemsSource[index] && typeof thaiItemsSource[index] === 'object'
          ? (thaiItemsSource[index] as Record<string, unknown>)
          : {};

    const text = stripInlineMediaTagsPreserveLineBreaks(
      getPracticeFieldByLang(current, 'text', 'en') || getPracticeFieldByLang(englishFallback, 'text', 'en')
    );
    const textTh = stripInlineMediaTagsPreserveLineBreaks(
      getPracticeFieldByLang(thaiFallback, 'text', 'th') || getPracticeExactLocalizedField(current, 'text', 'th')
    );
    const prompt = stripInlineMediaTagsPreserveLineBreaks(
      getPracticeFieldByLang(current, 'prompt', 'en') || getPracticeFieldByLang(current, 'question', 'en')
    );
    const promptTh = stripInlineMediaTagsPreserveLineBreaks(
      getPracticeFieldByLang(thaiFallback, 'prompt', 'th') ||
        getPracticeFieldByLang(thaiFallback, 'question', 'th') ||
        getPracticeExactLocalizedField(current, 'prompt', 'th') ||
        getPracticeExactLocalizedField(current, 'question', 'th')
    );
    const placeholder =
      getPracticeFieldByLang(current, 'placeholder', 'en') || getPracticeFieldByLang(englishFallback, 'placeholder', 'en');
    const placeholderTh =
      getPracticeFieldByLang(thaiFallback, 'placeholder', 'th') || getPracticeExactLocalizedField(current, 'placeholder', 'th');
    const answer = getPracticeAnswerValue(current, englishFallback, thaiFallback);
    const currentTextJsonb = safeParseArray<LessonRichInline>(current.text_jsonb);
    const currentTextJsonbTh = safeParseArray<LessonRichInline>(current.text_jsonb_th);
    const thaiFallbackTextJsonb = safeParseArray<LessonRichInline>(thaiFallback.text_jsonb);
    const thaiFallbackTextJsonbTh = safeParseArray<LessonRichInline>(thaiFallback.text_jsonb_th);
    const shouldUsePrimaryTextJsonb =
      kind === 'multiple_choice' || currentTextJsonb.some((inline) => hasMeaningfulRichInlineFormatting(inline));
    const resolvedTextJsonbTh = currentTextJsonbTh.some((inline) => THAI_TEXT_RE.test(inline.text ?? ''))
      ? currentTextJsonbTh
      : thaiFallbackTextJsonb.some((inline) => THAI_TEXT_RE.test(inline.text ?? ''))
        ? thaiFallbackTextJsonb
        : thaiFallbackTextJsonbTh.some((inline) => THAI_TEXT_RE.test(inline.text ?? ''))
          ? thaiFallbackTextJsonbTh
          : [];
    const keywords =
      typeof current.keywords === 'string' && current.keywords.trim()
        ? current.keywords.trim()
        : typeof englishFallback.keywords === 'string' && englishFallback.keywords.trim()
          ? englishFallback.keywords.trim()
          : typeof thaiFallback.keywords === 'string' && thaiFallback.keywords.trim()
            ? thaiFallback.keywords.trim()
            : '';
    const baseOptionsSource = Array.isArray(current.options)
      ? current.options
      : Array.isArray(raw.options)
        ? raw.options
        : [];
    const thaiOptionsSource = Array.isArray(thaiFallback.options)
      ? thaiFallback.options
      : Array.isArray(current.options_th)
        ? current.options_th
        : Array.isArray(thaiFallback.options_th)
          ? thaiFallback.options_th
          : [];
    const baseOptions = baseOptionsSource.map(parsePracticeOption);
    const fallbackThaiOptions = thaiOptionsSource.map(parsePracticeOption);
    const options = baseOptions.map((option, optionIndex) => {
      const thaiOption =
        fallbackThaiOptions.find((candidate) => candidate.label && candidate.label === option.label) ??
        fallbackThaiOptions[optionIndex];
      const optionTextTh = THAI_TEXT_RE.test(option.textTh) ? option.textTh : '';
      const optionTextJsonbTh = option.textJsonbTh.some((inline) => THAI_TEXT_RE.test(inline.text ?? '')) ? option.textJsonbTh : [];
      const thaiOptionText =
        thaiOption && THAI_TEXT_RE.test(thaiOption.text)
          ? thaiOption.text
          : thaiOption && THAI_TEXT_RE.test(thaiOption.textTh)
            ? thaiOption.textTh
            : '';
      const thaiOptionTextJsonb =
        thaiOption?.textJsonb.some((inline) => THAI_TEXT_RE.test(inline.text ?? ''))
          ? thaiOption.textJsonb
          : thaiOption?.textJsonbTh.some((inline) => THAI_TEXT_RE.test(inline.text ?? ''))
            ? thaiOption.textJsonbTh
            : [];
      const thaiAltText =
        thaiOption && THAI_TEXT_RE.test(thaiOption.altTextTh)
          ? thaiOption.altTextTh
          : thaiOption && THAI_TEXT_RE.test(thaiOption.altText)
            ? thaiOption.altText
            : '';

      return {
        ...option,
        label: option.label || thaiOption?.label || String.fromCharCode(65 + optionIndex),
        textTh: optionTextTh || thaiOptionText,
        textJsonbTh: optionTextJsonbTh.length ? optionTextJsonbTh : thaiOptionTextJsonb,
        altTextTh: THAI_TEXT_RE.test(option.altTextTh) ? option.altTextTh : thaiAltText,
      };
    });
    const numberValue = current.number ?? index + 1;
    const parsedBlanks = safeParseObjectArray(current.blanks).map((blank, blankIndex) => ({
      id: typeof blank.id === 'string' ? blank.id : `blank-${index + 1}-${blankIndex + 1}`,
      minLen:
        typeof blank.min_len === 'number'
          ? blank.min_len
          : Number.parseInt(String(blank.min_len ?? ''), 10) > 0
            ? Number.parseInt(String(blank.min_len ?? ''), 10)
            : 1,
    }));
    const fallbackBlankCount =
      kind === 'fill_blank' && parsedBlanks.length === 0
        ? (text.match(/_{2,}/g)?.length ??
          textJsonbToString(safeParseArray<LessonRichInline>(current.text_jsonb)).match(/_{2,}/g)?.length ??
          0)
        : 0;
    const blanks =
      parsedBlanks.length > 0
        ? parsedBlanks
        : Array.from({ length: fallbackBlankCount }, (_, blankIndex) => ({
            id: `blank-${index + 1}-${blankIndex + 1}`,
            minLen: 4,
          }));

    const inlineImageKey = getInlineImageKey(
      current.image_key,
      englishFallback.image_key,
      thaiFallback.image_key,
      current.text,
      current.text_th,
      current.prompt,
      current.prompt_th,
      current.question,
      current.question_th,
      current.text_jsonb,
      current.text_jsonb_th,
      thaiFallback.text,
      thaiFallback.text_th,
      thaiFallback.prompt,
      thaiFallback.prompt_th,
      thaiFallback.question,
      thaiFallback.question_th,
      thaiFallback.text_jsonb,
      thaiFallback.text_jsonb_th
    );
    const inlineAudioKey = getInlineAudioKey(
      current.audio_key,
      englishFallback.audio_key,
      thaiFallback.audio_key,
      current.text,
      current.text_th,
      current.prompt,
      current.prompt_th,
      current.question,
      current.question_th,
      current.text_jsonb,
      current.text_jsonb_th,
      thaiFallback.text,
      thaiFallback.text_th,
      thaiFallback.prompt,
      thaiFallback.prompt_th,
      thaiFallback.question,
      thaiFallback.question_th,
      thaiFallback.text_jsonb,
      thaiFallback.text_jsonb_th
    );

    const normalizedItem: NormalizedPracticeItem = {
      key: String(current.id ?? `${raw.id ?? 'exercise'}-${index + 1}`),
      rawNumber: String(numberValue),
      numberLabel: String(numberValue),
      text,
      textTh,
      textJsonb: shouldUsePrimaryTextJsonb ? currentTextJsonb : [],
      textJsonbTh: resolvedTextJsonbTh,
      prompt,
      promptTh,
      placeholder,
      placeholderTh,
      answer,
      answerLetters: safeParseAnswerKey(answer),
      options,
      imageKey:
        typeof current.image_key === 'string'
          ? current.image_key
          : typeof englishFallback.image_key === 'string'
            ? String(englishFallback.image_key)
            : typeof thaiFallback.image_key === 'string'
              ? String(thaiFallback.image_key)
              : inlineImageKey,
      altText:
        getPracticeFieldByLang(current, 'alt_text', 'en') ||
        getPracticeFieldByLang(englishFallback, 'alt_text', 'en') ||
        text ||
        prompt,
      altTextTh:
        getPracticeFieldByLang(current, 'alt_text', 'th') ||
        getPracticeFieldByLang(thaiFallback, 'alt_text', 'th') ||
        textTh ||
        promptTh,
      audioKey:
        typeof current.audio_key === 'string' && current.audio_key.trim()
          ? current.audio_key
          : typeof englishFallback.audio_key === 'string' && englishFallback.audio_key.trim()
            ? englishFallback.audio_key
            : typeof thaiFallback.audio_key === 'string' && thaiFallback.audio_key.trim()
              ? thaiFallback.audio_key
              : inlineAudioKey,
      keywords,
      correctTag: typeof current.correct === 'string' ? current.correct.trim().toLowerCase() : '',
      stemBlocks: safeParseObjectArray(current.stem && typeof current.stem === 'object' ? (current.stem as Record<string, unknown>).blocks : []),
      blanks,
      answersV2: safeParseStringMatrix(current.answers_v2),
      inputCount: normalizePracticeInputCount(current.inputs ?? englishFallback.inputs ?? thaiFallback.inputs),
      isExample:
        typeof current.is_example === 'boolean'
          ? current.is_example
          : ['example', 'ex', 'ตัวอย่าง'].includes(String(current.number ?? '').trim().toLowerCase()),
    };

    return normalizedItem;
  });

  const rawTitleBase = typeof raw.title === 'string' ? raw.title.trim() : '';
  const rawTitleEn = getPracticeExactLocalizedField(raw, 'title', 'en');
  const rawTitleTh = getPracticeExactLocalizedField(raw, 'title', 'th');
  const splitTitle = splitMixedPracticeField(rawTitleBase);
  const titleEn = rawTitleEn || splitTitle.en;
  const titleTh = rawTitleTh || splitTitle.th;
  const promptEn = getPracticeFieldByLang(raw, 'prompt', 'en') || String(raw.prompt_md ?? '').trim();
  const promptTh = getPracticeFieldByLang(raw, 'prompt', 'th');
  const paragraphEn = getPracticeFieldByLang(raw, 'paragraph', 'en');
  const paragraphTh = getPracticeFieldByLang(raw, 'paragraph', 'th');

  return {
    id: String(raw.id ?? `practice-${raw.sort_order ?? 0}`),
    kind,
    title: contentLang === 'th' ? titleTh || titleEn || promptTh || promptEn || '' : titleEn || titleTh || promptEn || promptTh || '',
    titleEn,
    titleTh,
    prompt: contentLang === 'th' ? promptTh || promptEn : promptEn || promptTh,
    promptEn,
    promptTh,
    paragraph: contentLang === 'th' ? paragraphTh || paragraphEn : paragraphEn || paragraphTh,
    paragraphEn,
    paragraphTh,
    promptBlocks: parsePracticePromptBlocks(raw.prompt_blocks),
    items,
    sortOrder: Number(raw.sort_order ?? 0),
  };
};

const isQuickPracticeExercise = (exercise: ResolvedLessonExercise) => {
  const raw = exercise as Record<string, unknown>;
  if (raw.isQuickPractice === true) {
    return true;
  }

  const titleCandidates = [
    typeof raw.title === 'string' ? raw.title : '',
    typeof raw.title_en === 'string' ? raw.title_en : '',
    typeof raw.title_th === 'string' ? raw.title_th : '',
  ].filter(Boolean);

  return titleCandidates.some(isQuickPracticeLabel);
};

const parseQuestionOption = (option: string | LessonQuestionOption) => {
  if (typeof option === 'string') {
    const match = option.match(/^([A-Z])\.\s*(.*)$/s);
    const label = match?.[1] ?? '';
    const body = match?.[2] ?? option;
    const { en, th } = splitThaiText(body);
    return {
      label,
      text: en,
      textTh: th,
      imageKey: null,
      altText: '',
      altTextTh: '',
    };
  }

  const { en, th } = splitThaiText(option.text ?? '');
  const thaiOverride = splitThaiText(option.text_th ?? option.textTh ?? '');

  return {
    label: (option.label ?? option.letter ?? '').trim(),
    text: en || thaiOverride.en,
    textTh: th || thaiOverride.th,
    imageKey: option.image_key ?? null,
    altText: option.alt_text ?? '',
    altTextTh: option.alt_text_th ?? option.altTextTh ?? '',
  };
};

const normalizeQuestion = (question: ResolvedLessonQuestion, contentLang: UiLanguage): NormalizedLessonQuestion => {
  const promptEn = (question.prompt ?? '').trim();
  const promptTh = (question.prompt_th ?? '').trim();
  const prompt =
    (contentLang === 'th' ? promptTh || promptEn : promptEn || promptTh).trim();

  const rawOptions =
    contentLang === 'th' && question.options_th ? safeParseArray<string | LessonQuestionOption>(question.options_th) : [];
  const englishOptions = safeParseArray<string | LessonQuestionOption>(question.options);
  const localizedOptions = rawOptions.length ? rawOptions : englishOptions;

  const options = localizedOptions.map(parseQuestionOption);
  const fallbackEnglishOptions = englishOptions.map(parseQuestionOption);
  const fallbackThaiOptions = safeParseArray<string | LessonQuestionOption>(question.options_th).map(parseQuestionOption);

  const mergedOptions = options.map((option, index) => {
    const englishOption = fallbackEnglishOptions[index];
    const thaiOption = fallbackThaiOptions[index];
    return {
      ...option,
      imageKey: option.imageKey || englishOption?.imageKey || thaiOption?.imageKey || null,
      altText: option.altText || englishOption?.altText || thaiOption?.altText || option.text || englishOption?.text || '',
      label: option.label || thaiOption?.label || String.fromCharCode(65 + index),
      textTh: option.textTh || thaiOption?.text || thaiOption?.textTh || '',
      altTextTh:
        option.altTextTh ||
        thaiOption?.altTextTh ||
        thaiOption?.altText ||
        englishOption?.altTextTh ||
        englishOption?.altText ||
        '',
    };
  });

  const answerKey = safeParseAnswerKey(question.answer_key);
  const fallbackAnswerKey =
    answerKey.length > 0 ? answerKey : question.correct_choice ? [String(question.correct_choice).trim()] : [];

  return {
    id: String(question.id ?? `question-${question.sort_order ?? Math.random()}`),
    sortOrder: Number(question.sort_order ?? 0),
    prompt,
    promptEn,
    promptTh,
    options: mergedOptions,
    answerKey: fallbackAnswerKey,
    explanation:
      (contentLang === 'th'
        ? String(question.explanation_th ?? question.explanation ?? '')
        : String(question.explanation ?? question.explanation_th ?? '')
      ).trim(),
  };
};

const normalizeTranscriptLine = (
  line: ResolvedLessonTranscriptLine,
  index: number
): NormalizedTranscriptLine => ({
  id: String(line.id ?? `transcript-${index + 1}`),
  sortOrder: Number(line.sort_order ?? index + 1),
  speaker: String(line.speaker ?? '').trim(),
  speakerTh: String(line.speaker_th ?? '').trim(),
  englishLine: String(line.line_text ?? '').trim(),
  thaiLine: String(line.line_text_th ?? '').trim(),
});

const isApplyContent = (value: unknown): value is LessonApplyContent =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const getApplyContentForLanguage = (
  section: ResolvedLessonSection | null,
  contentLang: UiLanguage
): LessonApplyContent | null => {
  if (!section) {
    return null;
  }

  const thaiContent = isApplyContent(section.content_jsonb_th) ? section.content_jsonb_th : null;
  const englishContent = isApplyContent(section.content_jsonb) ? section.content_jsonb : null;

  if (contentLang === 'th') {
    return thaiContent ?? englishContent;
  }

  return englishContent ?? thaiContent;
};

const normalizeApplyContent = (
  section: ResolvedLessonSection | null,
  contentLang: UiLanguage
): NormalizedApplyContent => {
  const contentJsonb = getApplyContentForLanguage(section, contentLang);

  return {
    promptText: String(contentJsonb?.prompt ?? section?.content ?? '').trim(),
    responseText: String(contentJsonb?.response ?? '').trim(),
    promptNodes: Array.isArray(contentJsonb?.prompt_nodes) ? contentJsonb.prompt_nodes : [],
    responseNodes: Array.isArray(contentJsonb?.response_nodes) ? contentJsonb.response_nodes : [],
  };
};

const getPhraseNodesForLanguage = (phrase: ResolvedLessonPhrase, contentLang: UiLanguage) => {
  const englishNodes = Array.isArray(phrase.content_jsonb) ? phrase.content_jsonb : [];
  const thaiNodes = Array.isArray(phrase.content_jsonb_th) ? phrase.content_jsonb_th : [];
  return contentLang === 'th' && thaiNodes.length ? thaiNodes : englishNodes.length ? englishNodes : thaiNodes;
};

const normalizeLessonPhrase = (
  phrase: ResolvedLessonPhrase,
  index: number,
  contentLang: UiLanguage
): NormalizedLessonPhrase | null => {
  const phraseLabel = String(phrase.phrase ?? '').trim();
  const phraseLabelTh = String(phrase.phrase_th ?? '').trim();
  const nodes = getPhraseNodesForLanguage(phrase, contentLang);
  const markdown = String(phrase.content_md ?? phrase.content ?? '').trim();
  const hasRenderableNodes = nodes.some((node) => hasVisibleRichNodeContent(node, contentLang));

  if (!phraseLabel && !phraseLabelTh && !hasRenderableNodes && !markdown) {
    return null;
  }

  return {
    id: String(phrase.id ?? `phrase-${index + 1}`),
    phrase: phraseLabel || phraseLabelTh || `Phrase ${index + 1}`,
    phraseTh: phraseLabelTh,
    variant: typeof phrase.variant === 'number' ? phrase.variant : 0,
    nodes,
    markdown,
  };
};

const resolveRichInlineText = (inline: LessonRichInline, contentLang: UiLanguage) => {
  if (typeof inline.text === 'string') {
    return inline.text;
  }

  if (inline.text && typeof inline.text === 'object') {
    const richText = inline.text as { en?: string | null; th?: string | null };
    const localized = contentLang === 'th' ? richText.th : richText.en;
    const fallback = contentLang === 'th' ? richText.en : richText.th;
    return String(localized ?? fallback ?? '');
  }

  return '';
};

const inlineFormattingKey = (inline: LessonRichInline) =>
  JSON.stringify({
    bold: inline.bold === true,
    italic: inline.italic === true,
    underline: inline.underline === true,
    link: typeof inline.link === 'string' ? inline.link.trim() : '',
    highlight: typeof inline.highlight === 'string' ? inline.highlight.trim().toLowerCase() : '',
  });

const mergeAdjacentRichInlines = (inlines: LessonRichInline[] | null | undefined, contentLang: UiLanguage) => {
  if (!Array.isArray(inlines) || !inlines.length) {
    return [];
  }

  const merged: LessonRichInline[] = [];

  inlines.forEach((inline) => {
    const textValue = cleanAudioTags(resolveRichInlineText(inline, contentLang));
    if (!textValue) {
      return;
    }

    const previous = merged[merged.length - 1];
    const canMerge =
      previous &&
      inlineFormattingKey(previous) === inlineFormattingKey(inline) &&
      !String(resolveRichInlineText(previous, contentLang) ?? '').includes('\n') &&
      !textValue.includes('\n');

    if (canMerge) {
      const previousText = String(previous.text ?? '');
      merged[merged.length - 1] = {
        ...previous,
        text: `${previousText}${textValue}`,
      };
      return;
    }

    merged.push({
      ...inline,
      text: textValue,
    });
  });

  return merged;
};

const renderTextWithBlankRuns = (text: string, keyPrefix: string, blankStyle: object) => {
  const segments = String(text).split(/(_{2,})/g);
  return segments.map((segment, index) => {
    if (!segment) {
      return null;
    }
    if (/^_{2,}$/.test(segment)) {
      const blankLength = Math.min(segment.length, 4);
      return (
        <Text key={`${keyPrefix}-blank-${index}`} style={blankStyle}>
          {'\u00A0'.repeat(Math.max(3, blankLength))}
        </Text>
      );
    }
    return splitPracticeBracketTokens(segment).map((part, partIndex) =>
      isPracticeBracketToken(part) ? (
        <Text key={`${keyPrefix}-text-${index}-part-${partIndex}`} style={styles.practiceInlineBracketText}>
          {part}
        </Text>
      ) : (
        <React.Fragment key={`${keyPrefix}-text-${index}-part-${partIndex}`}>{part}</React.Fragment>
      )
    );
  });
};

const getRichInlineSegmentStyle = (
  scriptLanguage: ScriptLanguage,
  inline: LessonRichInline,
  options?: {
    isSubheader?: boolean;
    forceSemibold?: boolean;
    muted?: boolean;
    isLink?: boolean;
    shouldShowHighlight?: boolean;
    highlightColor?: string;
    extraStyle?: object | null;
  }
) => [
  styles.richInlineText,
  {
    fontFamily: getInlineFontFamily(scriptLanguage, {
      bold: options?.forceSemibold === true || inline.bold === true,
      italic: inline.italic === true,
    }),
  },
  options?.isSubheader ? styles.richInlineSubheaderText : null,
  inline.underline ? styles.richInlineUnderline : null,
  options?.shouldShowHighlight ? styles.richInlineHighlight : null,
  options?.shouldShowHighlight && options.highlightColor === '#f4cccc' ? styles.richInlineHighlightPink : null,
  options?.shouldShowHighlight && options.highlightColor === '#d9ead3' ? styles.richInlineHighlightGreen : null,
  options?.shouldShowHighlight &&
  (options.highlightColor === '#c9daf7' || options.highlightColor === '#c9daf8')
    ? styles.richInlineHighlightBlue
    : null,
  options?.muted ? styles.richInlineThaiMuted : null,
  options?.isLink ? styles.richInlineLink : null,
  options?.extraStyle ?? null,
];

const renderRichTextScriptSegments = (
  text: string,
  keyPrefix: string,
  inline: LessonRichInline,
  options?: {
    isSubheader?: boolean;
    forceSemibold?: boolean;
    muted?: boolean;
    isLink?: boolean;
    shouldShowHighlight?: boolean;
    highlightColor?: string;
    extraStyle?: object | null;
  }
) =>
  splitTextByScript(text).map((segment, segmentIndex) => (
    <Text
      key={`${keyPrefix}-segment-${segmentIndex}`}
      style={getRichInlineSegmentStyle(segment.language, inline, options)}>
      {renderTextWithBlankRuns(segment.text, `${keyPrefix}-segment-${segmentIndex}`, styles.richInlineBlank)}
    </Text>
  ));

const applyNodeHasAccent = (node: LessonRichNode) =>
  Boolean(node.is_response) ||
  Boolean(
    Array.isArray(node.inlines) &&
      node.inlines.some(
        (inline) => typeof inline?.highlight === 'string' && inline.highlight.trim().toLowerCase() === CYAN_HIGHLIGHT
      )
  );

const getRichNodesForLanguage = (
  section: ResolvedLessonSection | null,
  contentLang: UiLanguage
): LessonRichNode[] => {
  if (!section) {
    return [];
  }

  const englishNodes = Array.isArray(section.content_jsonb) ? section.content_jsonb : [];
  const thaiNodes = Array.isArray(section.content_jsonb_th) ? section.content_jsonb_th : [];
  const baseNodes = contentLang === 'th' && thaiNodes.length ? thaiNodes : englishNodes.length ? englishNodes : thaiNodes;

  if (contentLang !== 'th') {
    return baseNodes;
  }

  return baseNodes.map((node) => {
    if (!node || node.kind !== 'heading') {
      return node;
    }

    const thaiHeadingText =
      (typeof node.text === 'object' && node.text ? node.text.th : null) ??
      (typeof node.text_th === 'string' ? node.text_th : null) ??
      (typeof node.header_th === 'string' ? node.header_th : null);

    if (!thaiHeadingText || !Array.isArray(node.inlines) || !node.inlines.length) {
      return node;
    }

    return {
      ...node,
      inlines: [
        {
          ...node.inlines[0],
          text: thaiHeadingText,
        },
      ],
    };
  });
};

const normalizeCommonMistakeHeadingText = (value: string | null | undefined) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const getCommonMistakeItemTitles = (item: ResolvedLessonSectionItem) =>
  [item.title, item.title_en, item.title_th, item.header, item.header_en, item.header_th]
    .map(normalizeCommonMistakeHeadingText)
    .filter(Boolean);

const COMMON_MISTAKE_SCM_HEADING_KEYS = new Set([
  normalizeCommonMistakeHeadingText('SUPER COMMON MISTAKE!'),
  normalizeCommonMistakeHeadingText('SUPER COMMON MISTAKE! 🚨'),
  normalizeCommonMistakeHeadingText('ข้อผิดพลาดที่พบบ่อยมาก!'),
  normalizeCommonMistakeHeadingText('ข้อผิดพลาดที่พบบ่อยมาก! 🚨'),
]);

const INLINE_LINK_ARTIFACT_RE = /\(\s*link\s*\)/gi;
const INVISIBLE_RICH_TEXT_RE = /[\u200B-\u200D\u2060\uFEFF]/g;
const NON_BREAKING_SPACE_RE = /[\u00A0\u202F]/g;

const normalizeRichText = (text: string) =>
  text
    // Remove invisible Unicode characters that can disrupt line wrapping on device.
    .replace(INVISIBLE_RICH_TEXT_RE, '')
    // Convert non-breaking spaces to normal spaces so text can wrap naturally.
    .replace(NON_BREAKING_SPACE_RE, ' ');

const cleanAudioTags = (text: string) =>
  normalizeRichText(text)
    .replace(/\[audio:[^\]]+\]/g, ' ')
    .replace(/\[img:[^\]]+\]/g, ' ')
    .replace(INLINE_LINK_ARTIFACT_RE, ' ')
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n');

const resolveNodeText = (node: LessonRichNode, contentLang: UiLanguage) => {
  if (typeof node.text === 'string') {
    return cleanAudioTags(node.text);
  }

  if (node.text && typeof node.text === 'object') {
    const localized = contentLang === 'th' ? node.text.th : node.text.en;
    const fallback = contentLang === 'th' ? node.text.en : node.text.th;
    return cleanAudioTags(String(localized ?? fallback ?? ''));
  }

  return cleanAudioTags(String(node.text_th ?? ''));
};

const getNodeHeadingText = (node: LessonRichNode, contentLang: UiLanguage) => {
  const inlineText = Array.isArray(node.inlines)
    ? node.inlines.map((inline) => cleanAudioTags(resolveRichInlineText(inline, contentLang))).join('')
    : '';
  const directText = resolveNodeText(node, contentLang);
  return (inlineText || directText).replace(/\s+/g, ' ').trim();
};

const THAI_TEXT_RE = /[\u0E00-\u0E7F]/;

const getApplyNodeText = (node: LessonRichNode, contentLang: UiLanguage) => {
  const inlineText = Array.isArray(node.inlines)
    ? node.inlines.map((inline) => resolveRichInlineText(inline, contentLang)).join(' ')
    : '';
  const directText = resolveNodeText(node, contentLang);

  return (inlineText || directText).replace(/\s+/g, ' ').trim();
};

const normalizeForcedSubheaderText = (value: string) =>
  value
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

const richNodeHasSpeakerPrefix = (node: LessonRichNode, contentLang: UiLanguage) => {
  const inlineText = Array.isArray(node.inlines)
    ? node.inlines.map((inline) => cleanAudioTags(resolveRichInlineText(inline, contentLang))).join('')
    : '';
  const directText = resolveNodeText(node, contentLang);
  const combinedText = inlineText || directText;

  return combinedText
    .split('\n')
    .some((line) => SPEAKER_PREFIX_RE.test(line.trimStart()));
};

const isSpeakerLineText = (text: string) => {
  if (!text) {
    return false;
  }
  const colonIdx = text.indexOf(':');
  const bracketIdx = text.indexOf('[');
  const hasBracketBeforeColon = bracketIdx >= 0 && (colonIdx < 0 || bracketIdx < colonIdx);
  if (hasBracketBeforeColon) {
    return false;
  }
  return SPEAKER_PREFIX_RE.test(text);
};

const isEnglishSpeakerLineText = (text: string) => {
  if (!isSpeakerLineText(text)) {
    return false;
  }
  return /^[A-Za-z]/.test(text.trimStart());
};

const speakerLineIsThai = (line: string) => {
  if (!isSpeakerLineText(line)) {
    return null;
  }
  const match = line.match(SPEAKER_PREFIX_RE);
  if (!match) {
    return null;
  }
  const speaker = match[0].replace(/:\s*$/, '');
  const content = line.slice(match[0].length);
  const speakerHasThai = THAI_TEXT_RE.test(speaker);
  const contentHasThai = THAI_TEXT_RE.test(content);
  if (!speakerHasThai && !contentHasThai) {
    return false;
  }
  return true;
};

const PHRASE_SPEAKER_TURN_RE = /(?:[A-Za-z][A-Za-z ]{0,24}|[\u0E00-\u0E7F][\u0E00-\u0E7F ]{0,24}):\s*/g;
const LINK_PROMPT_SENTENCE_RE = /^click here\b/i;
const LINK_PLACEHOLDER_RE = /\blink\s*xx\b/i;

const isPhraseLinkPlaceholderNode = (node: LessonRichNode, contentLang: UiLanguage) => {
  const inlineText = Array.isArray(node.inlines)
    ? node.inlines.map((inline) => cleanAudioTags(resolveRichInlineText(inline, contentLang))).join(' ')
    : '';
  const directText = resolveNodeText(node, contentLang);
  const combinedText = `${inlineText} ${directText}`.replace(/\s+/g, ' ').trim();

  return LINK_PLACEHOLDER_RE.test(combinedText) || LINK_PROMPT_SENTENCE_RE.test(combinedText);
};

const isBoldParagraphNode = (node: LessonRichNode) => {
  if (node.kind !== 'paragraph' || node.audio_key || node.audio_seq) {
    return false;
  }

  const textSpans = (node.inlines ?? []).filter(
    (inline) => typeof inline?.text === 'string' && cleanAudioTags(inline.text).trim().length > 0
  );

  return textSpans.length > 0 && textSpans.every((inline) => Boolean(inline.bold));
};

const hasVisibleRichNodeContent = (node: LessonRichNode, contentLang: UiLanguage) => {
  if (node.kind === 'quick_practice_exercise') {
    return true;
  }

  if (node.kind === 'spacer') {
    return false;
  }

  if (node.kind === 'image' || node.kind === 'table') {
    return true;
  }

  if (Array.isArray(node.inlines)) {
    return node.inlines.some((inline) => cleanAudioTags(resolveRichInlineText(inline, contentLang)).trim().length > 0);
  }

  return resolveNodeText(node, contentLang).trim().length > 0;
};

const normalizeQuickPracticeText = (value: unknown) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

const collectQuickPracticeTexts = (exercise: NormalizedPracticeExercise) => {
  const textSet = new Set<string>();
  const addText = (value: unknown) => {
    const normalized = normalizeQuickPracticeText(value);
    if (normalized) {
      textSet.add(normalized);
    }
  };

  exercise.items.forEach((item) => {
    addText(item.text);
    addText(item.textTh);
    addText(item.prompt);
    addText(item.promptTh);
  });

  return textSet;
};

const isQuickPracticeLabel = (value: unknown) => {
  const text = String(value ?? '').trim();
  if (!text) {
    return false;
  }

  const normalized = text.toLowerCase();
  return (
    normalized.includes('quick practice') ||
    text.includes('แบบฝึกหัดอย่างสั้น') ||
    text.includes('ฝึกหัดอย่างสั้น')
  );
};

const nodeIsQuickPracticeHeading = (node: LessonRichNode, contentLang: UiLanguage) => {
  if (node.kind !== 'heading') {
    return false;
  }

  const pieces = [
    getNodeHeadingText(node, contentLang),
    typeof node.header_en === 'string' ? node.header_en : '',
    typeof node.header_th === 'string' ? node.header_th : '',
    typeof node.text === 'string' ? node.text : '',
    typeof node.text === 'object' && node.text ? node.text.en : '',
    typeof node.text === 'object' && node.text ? node.text.th : '',
    typeof node.text_th === 'string' ? node.text_th : '',
  ].filter(Boolean);

  return pieces.some(isQuickPracticeLabel);
};

const injectQuickPracticeNodes = (
  nodes: LessonRichNode[],
  quickExercises: NormalizedPracticeExercise[],
  contentLang: UiLanguage
) => {
  if (!nodes.length || !quickExercises.length) {
    return nodes;
  }

  const processedNodes: LessonRichNode[] = [];
  let quickPracticeIndex = 0;
  let quickPracticeFilter: Set<string> | null = null;
  let quickPracticeFilterRemaining = 0;

  nodes.forEach((node, index) => {
    let skipFilterDecrement = false;

    if (nodeIsQuickPracticeHeading(node, contentLang) && quickPracticeIndex < quickExercises.length) {
      processedNodes.push(node);
      quickPracticeFilter = collectQuickPracticeTexts(quickExercises[quickPracticeIndex]);
      quickPracticeFilterRemaining = QUICK_PRACTICE_FILTER_WINDOW;
      skipFilterDecrement = true;
      processedNodes.push({
        kind: 'quick_practice_exercise',
        exercise: quickExercises[quickPracticeIndex],
        key: `quick-practice-${quickPracticeIndex}-${index}`,
      } as QuickPracticeRichNode);
      quickPracticeIndex += 1;
    } else {
      if (quickPracticeFilter && quickPracticeFilterRemaining > 0) {
        const paragraphText =
          node.kind === 'paragraph'
            ? normalizeQuickPracticeText((node.inlines ?? []).map((inline) => resolveRichInlineText(inline, contentLang)).join(''))
            : '';

        if (paragraphText && quickPracticeFilter.has(paragraphText)) {
          if (!skipFilterDecrement) {
            quickPracticeFilterRemaining -= 1;
            if (quickPracticeFilterRemaining <= 0) {
              quickPracticeFilter = null;
            }
          }
          return;
        }
      }

      const nodeTitle = typeof node.title === 'string' ? node.title.toLowerCase() : '';
      const isExerciseContent =
        node.type === 'exercise' ||
        nodeTitle.includes('quick practice') ||
        (node.kind === 'paragraph' &&
          (node.inlines ?? []).some((inline) => {
            const text = resolveRichInlineText(inline, contentLang);
            return ['TYPE:', 'STEM:', 'ANSWER:', 'QUESTION:'].some((keyword) => text.includes(keyword));
          }));

      if (!isExerciseContent) {
        processedNodes.push(node);
      }
    }

    if (quickPracticeFilter && !skipFilterDecrement) {
      quickPracticeFilterRemaining -= 1;
      if (quickPracticeFilterRemaining <= 0) {
        quickPracticeFilter = null;
      }
    }
  });

  return processedNodes;
};

const groupRichSectionNodes = (nodes: LessonRichNode[], contentLang: UiLanguage): RichSectionGroup[] => {
  const groups: RichSectionGroup[] = [];
  let current: RichSectionGroup | null = null;

  nodes.forEach((node, index) => {
    if (node.kind === 'heading') {
      if (current) {
        groups.push(current);
      }

      const headingText = getNodeHeadingText(node, contentLang) || `Section ${index + 1}`;
      current = {
        key: `${headingText}-${index}`,
        heading: node,
        body: [],
      };
      return;
    }

    if (!current) {
      current = {
        key: `no-heading-${index}`,
        heading: null,
        body: [node],
      };
      return;
    }

    current.body.push(node);
  });

  if (current) {
    groups.push(current);
  }

  return groups.filter((group) => group.heading !== null || group.body.some((node) => hasVisibleRichNodeContent(node, contentLang)));
};

const getSnippetForNode = (node: LessonRichNode, snippetIndex: LessonAudioSnippetIndex): LessonAudioSnippet | null => {
  const audioKey = node.audio_key?.trim();
  if (audioKey && snippetIndex.byKey[audioKey]) {
    return snippetIndex.byKey[audioKey];
  }

  const audioSection = typeof node.audio_section === 'string' ? node.audio_section.trim() : '';
  const audioSeq = typeof node.audio_seq === 'number' ? node.audio_seq : null;
  if (!audioSection || audioSeq === null) {
    return null;
  }

  return snippetIndex.bySection[audioSection]?.[audioSeq] ?? null;
};

const getPhraseSnippetForNode = (
  node: LessonRichNode,
  phraseSnippetIndex: LessonPhraseAudioSnippetIndex,
  phraseId?: string | null,
  variant?: number | null
): LessonAudioSnippet | null => {
  const audioKey = node.audio_key?.trim();
  if (audioKey && phraseSnippetIndex.byKey[audioKey]) {
    return phraseSnippetIndex.byKey[audioKey];
  }

  const normalizedPhraseId = phraseId?.trim();
  const audioSeq = typeof node.audio_seq === 'number' ? node.audio_seq : null;
  if (!normalizedPhraseId || audioSeq === null) {
    return null;
  }

  const normalizedVariant = typeof variant === 'number' ? variant : 0;
  return phraseSnippetIndex.byPhrase[normalizedPhraseId]?.[normalizedVariant]?.[audioSeq] ?? null;
};

const collectSnippetsForNodes = (
  nodes: LessonRichNode[],
  snippetIndex: LessonAudioSnippetIndex,
  phraseSnippetIndex?: LessonPhraseAudioSnippetIndex,
  phraseId?: string | null,
  phraseVariant?: number | null
): LessonAudioSnippet[] => {
  const seenAudioKeys = new Set<string>();
  const snippets: LessonAudioSnippet[] = [];

  nodes.forEach((node) => {
    const snippet =
      getSnippetForNode(node, snippetIndex) ??
      (phraseSnippetIndex ? getPhraseSnippetForNode(node, phraseSnippetIndex, phraseId, phraseVariant) : null);
    const audioKey = snippet?.audio_key?.trim();
    if (!snippet || !audioKey || seenAudioKeys.has(audioKey)) {
      return;
    }

    seenAudioKeys.add(audioKey);
    snippets.push(snippet);
  });

  return snippets;
};

const getTableVisibility = (node: LessonRichNode) => {
  if (typeof node.table_visibility === 'string') {
    return node.table_visibility.trim().toLowerCase() === 'mobile' ? 'mobile' : 'all';
  }

  if (typeof node.table_label === 'string' && /-M:?\s*$/i.test(node.table_label)) {
    return 'mobile';
  }

  return 'all';
};

const selectNodesForTableVisibility = (nodes: LessonRichNode[], isCompactLayout: boolean) => {
  const hasMobileTableVariant = nodes.some(
    (node) => node.kind === 'table' && getTableVisibility(node) === 'mobile'
  );
  const filtered: LessonRichNode[] = [];
  let index = 0;

  while (index < nodes.length) {
    const currentNode = nodes[index];
    if (currentNode.kind !== 'table') {
      filtered.push(currentNode);
      index += 1;
      continue;
    }

    const tableRun: LessonRichNode[] = [];
    while (index < nodes.length && nodes[index]?.kind === 'table') {
      tableRun.push(nodes[index]);
      index += 1;
    }

    const mobileTables = tableRun.filter((node) => getTableVisibility(node) === 'mobile');
    const defaultTables = tableRun.filter((node) => getTableVisibility(node) !== 'mobile');
    const visibleTables = isCompactLayout
      ? mobileTables.length
        ? mobileTables
        : hasMobileTableVariant
          ? []
          : defaultTables
      : defaultTables.length
        ? defaultTables
        : mobileTables;

    filtered.push(...visibleTables);
  }

  return filtered;
};

const parseAudioTaggedText = (text: string) => {
  const audioRegex = /\[audio:([^\]]+)\]/gi;
  const audioKeys: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = audioRegex.exec(text)) !== null) {
    const key = match[1]?.trim();
    if (key) {
      audioKeys.push(key);
    }
  }

  return {
    cleanText: text.replace(audioRegex, ''),
    audioKeys,
  };
};

const normalizeLessonImagePath = (rawValue: string | null) => {
  if (!rawValue) {
    return null;
  }

  let value = rawValue.trim();
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  value = value.replace(/^lesson-images\//i, '');
  value = value.replace(/^\/+/, '');
  value = value.split(/[?#]/)[0];

  if (value && !/\.[a-z0-9]+$/i.test(value)) {
    value = `${value}.webp`;
  }

  return value || null;
};

const buildLessonImagePublicUrl = (rawValue: string | null) => {
  const normalized = normalizeLessonImagePath(rawValue);
  if (!normalized) {
    return null;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  if (!env.supabaseUrl) {
    return null;
  }

  return `${env.supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/lesson-images/${normalized}`;
};

const resolveLessonImageUrl = (value: unknown, fallbackImageKey?: string | null): string | null => {
  if (typeof value === 'string') {
    const directUrl = value.trim();
    return /^https?:\/\//i.test(directUrl) ? directUrl : buildLessonImagePublicUrl(directUrl);
  }

  if (value && typeof value === 'object') {
    const imageRecord = value as Record<string, unknown>;
    const candidates = [
      imageRecord.image_url,
      imageRecord.imageUrl,
      imageRecord.url,
      imageRecord.public_url,
      imageRecord.publicUrl,
      imageRecord.path,
      imageRecord.storage_path,
      imageRecord.storagePath,
    ];

    for (const candidate of candidates) {
      const resolved = resolveLessonImageUrl(candidate);
      if (resolved) {
        return resolved;
      }
    }
  }

  return buildLessonImagePublicUrl(fallbackImageKey ?? null);
};

const resolveRichNodeImageSource = (
  node: LessonRichNode,
  lessonImages: Record<string, unknown> | null | undefined
) => {
  const imageKey =
    typeof node.image_key === 'string' && node.image_key.trim()
      ? node.image_key.trim()
      : typeof (node as { imageKey?: unknown }).imageKey === 'string' &&
          (node as { imageKey?: string }).imageKey?.trim()
        ? (node as { imageKey: string }).imageKey.trim()
        : null;

  return (
    resolveLessonImageUrl(
      node.image_url ?? (node as { imageUrl?: unknown }).imageUrl ?? (node as { image?: unknown }).image,
      imageKey
    ) ??
    resolveLessonImageUrl(imageKey && lessonImages && imageKey in lessonImages ? lessonImages[imageKey] : null, imageKey)
  );
};

const normalizeHeaderImagePath = (rawValue: string | null) => {
  if (!rawValue) return null;
  let value = rawValue.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  value = value.replace(/^lesson-images\//i, '');
  value = value.replace(/^\/+/, '');
  value = value.split(/[?#]/)[0];
  if (!/^headers\//i.test(value) && !value.includes('/')) {
    value = `headers/${value}`;
  }
  if (!/\.[a-z0-9]+$/i.test(value)) {
    value = `${value}.webp`;
  }
  return value;
};

const resolveHeaderImageUrl = (rawValue: string | null) => {
  const normalized = normalizeHeaderImagePath(rawValue);
  if (!normalized) return null;
  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }
  if (!env.supabaseUrl) {
    return null;
  }
  return `${env.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/lesson-images/${normalized}`;
};

const normalizeInternalHref = (href: string) => {
  let nextHref = href.trim();
  if (!nextHref) {
    return '';
  }

  if (nextHref.startsWith('https://pa.invalid/lesson/')) {
    return nextHref.replace('https://pa.invalid', '');
  }
  if (nextHref.startsWith('https://pa.invalid/topic-library/')) {
    return nextHref.replace('https://pa.invalid', '');
  }
  if (nextHref.startsWith('https://pa.invalid/')) {
    return nextHref.replace('https://pa.invalid', '');
  }

  return nextHref;
};

const formatLinkedLabel = (value: string) =>
  value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const secondsToMillis = (seconds: number) => Math.max(0, Math.round(seconds * 1000));
const millisToSeconds = (millis: number) => Math.max(0, millis / 1000);
const PITCH_CORRECTION_QUALITY = 'medium';
const elapsedMs = (start: number) => Math.max(0, Math.round(performance.now() - start));

export default function LessonDetailShellScreen() {
  const params = useLocalSearchParams<{ id?: string; locked?: string; libraryRoute?: string }>();
  const lessonId = typeof params.id === 'string' ? params.id : '';
  const lockedParam = typeof params.locked === 'string' ? params.locked : null;
  const libraryRouteParam =
    params.libraryRoute === 'library' || params.libraryRoute === 'free-library' ? params.libraryRoute : null;
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();
  const { hasAccount, hasMembership, user } = useAppSession();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isTabletLessonLayout = windowWidth >= 768;
  const insets = useSafeAreaInsets();
  const menuOverlayBottomInset = APP_TAB_BAR_HEIGHT + insets.bottom;
  const uiCopy = useMemo(() => getLessonDetailCopy(uiLanguage), [uiLanguage]);

  const [lesson, setLesson] = useState<ResolvedLessonPayload | null>(null);
  const [coverLesson, setCoverLesson] = useState<LessonListItem | null>(null);
  const [englishLessonFallback, setEnglishLessonFallback] = useState<ResolvedLessonPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [maxVisitedSectionIndex, setMaxVisitedSectionIndex] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasStartedLesson, setHasStartedLesson] = useState(false);
  const [contentLang, setContentLang] = useState<UiLanguage>('en');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [hasSubmittedComprehensionAnswers, setHasSubmittedComprehensionAnswers] = useState(false);
  const [lockedComprehensionQuestions, setLockedComprehensionQuestions] = useState<Record<string, boolean>>({});
  const [comprehensionError, setComprehensionError] = useState('');
  const [audioUrls, setAudioUrls] = useState<{ main: string | null; noBg: string | null; bg: string | null }>({
    main: null,
    noBg: null,
    bg: null,
  });
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioPositionMillis, setAudioPositionMillis] = useState(0);
  const [audioDurationMillis, setAudioDurationMillis] = useState(0);
  const [hasAudioFinished, setHasAudioFinished] = useState(false);
  const [audioRate, setAudioRate] = useState(1);
  const [hasShownConversationIntro, setHasShownConversationIntro] = useState(false);
  const [isConversationIntroVisible, setIsConversationIntroVisible] = useState(false);
  const [isConversationIntroAnimatingOut, setIsConversationIntroAnimatingOut] = useState(false);
  const [conversationIntroPendingSectionIndex, setConversationIntroPendingSectionIndex] = useState<number | null>(null);
  const [snippetIndex, setSnippetIndex] = useState<LessonAudioSnippetIndex>(EMPTY_SNIPPET_INDEX);
  const [phraseSnippetIndex, setPhraseSnippetIndex] = useState<LessonPhraseAudioSnippetIndex>(EMPTY_PHRASE_SNIPPET_INDEX);
  const [activeSnippetKey, setActiveSnippetKey] = useState<string | null>(null);
  const [playingSnippetKey, setPlayingSnippetKey] = useState<string | null>(null);
  const [isSnippetLoading, setIsSnippetLoading] = useState(false);
  const [applyText, setApplyText] = useState('');
  const [showApplyResponse, setShowApplyResponse] = useState(false);
  const [activeUnderstandGroupIndex, setActiveUnderstandGroupIndex] = useState(0);
  const [activePracticeCardIndex, setActivePracticeCardIndex] = useState(0);
  const [expandedPhraseIds, setExpandedPhraseIds] = useState<Record<string, boolean>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [practiceSelections, setPracticeSelections] = useState<Record<string, string[]>>({});
  const [checkedPracticeExercises, setCheckedPracticeExercises] = useState<Record<string, boolean>>({});
  const [checkingPracticeExercises, setCheckingPracticeExercises] = useState<Record<string, boolean>>({});
  const [lockedPracticeMultipleChoiceItems, setLockedPracticeMultipleChoiceItems] = useState<Record<string, boolean>>({});
  const [practiceOpenAnswers, setPracticeOpenAnswers] = useState<Record<string, string>>({});
  const [practiceBlankAnswers, setPracticeBlankAnswers] = useState<Record<string, string>>({});
  const [practiceEvaluations, setPracticeEvaluations] = useState<Record<string, PracticeEvaluationState>>({});
  const [practiceErrorByExercise, setPracticeErrorByExercise] = useState<Record<string, string>>({});
  const [practiceMarkedCorrect, setPracticeMarkedCorrect] = useState<Record<string, boolean | null>>({});
  const [practiceExampleAnswerLineCounts, setPracticeExampleAnswerLineCounts] = useState<Record<string, 1 | 2>>({});
  const [isLessonCompleted, setIsLessonCompleted] = useState(false);
  const [isSavingLessonCompletion, setIsSavingLessonCompletion] = useState(false);
  const [lessonCompletionError, setLessonCompletionError] = useState<string | null>(null);
  const [completionModalState, setCompletionModalState] = useState<
    'success' | 'skip_warning' | 'skip_success' | null
  >(null);
  const [streakCelebration, setStreakCelebration] = useState<StreakCelebrationState | null>(null);
  const [nextSectionHintMessage, setNextSectionHintMessage] = useState<string | null>(null);
  const [audioTrayAutoExpandSignal, setAudioTrayAutoExpandSignal] = useState<string | null>(null);
  const [freeLessonIds, setFreeLessonIds] = useState<Set<string>>(new Set());
  const [lessonKeyboardHeight, setLessonKeyboardHeight] = useState(0);
  const [contentScrollViewportHeight, setContentScrollViewportHeight] = useState(0);
  const [contentScrollMeasuredHeight, setContentScrollMeasuredHeight] = useState(0);
  const [appLessonProgressDetail, setAppLessonProgressDetail] = useState<AppLessonProgressDetail | null>(null);
  const [savedAnswerStateByUnit, setSavedAnswerStateByUnit] = useState<Record<string, Record<string, unknown>>>({});
  const [pendingRichLink, setPendingRichLink] = useState<PendingRichLink | null>(null);
  const [practiceImagePreview, setPracticeImagePreview] = useState<PracticeImagePreview>(null);
  const richLinkLessonCacheRef = useRef<Record<string, LessonListItem | null>>({});
  const voiceSoundRef = useRef<AudioPlayer | null>(null);
  const snippetSoundRef = useRef<AudioPlayer | null>(null);
  const snippetSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const preloadedSnippetPlayersRef = useRef<Record<string, AudioPlayer>>({});
  const inflightSnippetPreloadsRef = useRef<Partial<Record<string, Promise<void>>>>({});
  const isConversationLockScreenActiveRef = useRef(false);
  const conversationAudioMetadataRef = useRef<AudioMetadata>({});
  const nextSectionHintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRateRef = useRef(1);
  const applyInputRef = useRef<TextInput | null>(null);
  const practiceInputRefsMap = useRef<Record<string, TextInput | null>>({});
  const activePracticeInputKeyRef = useRef<string | null>(null);
  const streakCelebrationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const practiceInputVisibilityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentScrollOffsetRef = useRef(0);
  const contentScrollTargetOffsetRef = useRef(0);
  const applyInputOffsetYRef = useRef(0);
  const contentScrollRef = useRef<ScrollView | null>(null);
  const lessonRef = useRef<ResolvedLessonPayload | null>(null);
  const audioTrayExpandCounterRef = useRef(0);
  const pendingAppResumeRef = useRef<AppLessonProgressDetail['resume']>(null);
  const writtenAppProgressUnitKeysRef = useRef<Set<string>>(new Set());
  const pendingLessonPersistenceRef = useRef<Set<Promise<unknown>>>(new Set());
  const hasHydratedLessonAnswerStateRef = useRef(false);
  const hasInteractedWithLessonAnswerStateRef = useRef(false);
  const lessonLoadStartedAtRef = useRef(performance.now());
  const lessonReadyLoggedRef = useRef(false);
  const lessonContentEnteredLoggedRef = useRef(false);
  const progressHydrateStartedAtRef = useRef<number | null>(null);
  const answerStateHydrateStartedAtRef = useRef<number | null>(null);
  const conversationIntroTranslateY = useSharedValue(0);
  const conversationIntroScale = useSharedValue(1);
  const conversationIntroOpacity = useSharedValue(1);

  useEffect(() => {
    console.info('[lesson-load] lesson detail mounted', {
      lessonId,
      lockedParam,
    });
  }, [lessonId, lockedParam]);

  const dismissLessonKeyboard = useCallback(() => {
    applyInputRef.current?.blur();
    Keyboard.dismiss();
  }, []);

  const scrollLessonInputIntoView = useCallback((targetY?: number) => {
    requestAnimationFrame(() => {
      if (typeof targetY === 'number') {
        contentScrollRef.current?.scrollTo({
          y: Math.max(0, targetY - LESSON_INPUT_FOCUS_TOP_OFFSET),
          animated: false,
        });
        return;
      }
      contentScrollRef.current?.scrollToEnd({ animated: false });
    });
  }, []);

  const clearPracticeInputVisibilityTimeout = useCallback(() => {
    if (practiceInputVisibilityTimeoutRef.current) {
      clearTimeout(practiceInputVisibilityTimeoutRef.current);
      practiceInputVisibilityTimeoutRef.current = null;
    }
  }, []);

  const shouldContainLessonContent = isTabletLessonLayout && !isFullscreen;

  const ensurePracticeInputVisible = useCallback((inputKey: string, attempt = 0) => {
    if (activePracticeInputKeyRef.current !== inputKey) {
      return;
    }

    requestAnimationFrame(() => {
      const inputRef = practiceInputRefsMap.current[inputKey];
      if (!inputRef || lessonKeyboardHeight <= 0) {
        return;
      }

      inputRef.measureInWindow((_x, y, _width, height) => {
        if (activePracticeInputKeyRef.current !== inputKey) {
          return;
        }

        const inputBottom = y + height;
        const desiredInputBottom = windowHeight - lessonKeyboardHeight - LESSON_INPUT_KEYBOARD_GAP;
        const overlap = inputBottom - desiredInputBottom;

        if (overlap > 1) {
          const baseScrollY = Math.max(contentScrollOffsetRef.current, contentScrollTargetOffsetRef.current);
          const nextScrollY = Math.max(0, baseScrollY + overlap);
          contentScrollTargetOffsetRef.current = nextScrollY;
          contentScrollRef.current?.scrollTo({
            y: nextScrollY,
            animated: attempt === 0,
          });
        }

        if (attempt < PRACTICE_INPUT_MAX_VISIBILITY_CHECKS - 1 && activePracticeInputKeyRef.current === inputKey) {
          practiceInputVisibilityTimeoutRef.current = setTimeout(() => {
            ensurePracticeInputVisible(inputKey, attempt + 1);
          }, PRACTICE_INPUT_RECHECK_DELAY);
        }
      });
    });
  }, [lessonKeyboardHeight, windowHeight]);

  const schedulePracticeInputVisibilityCheck = useCallback((inputKey: string, delay: number) => {
    clearPracticeInputVisibilityTimeout();
    practiceInputVisibilityTimeoutRef.current = setTimeout(() => {
      ensurePracticeInputVisible(inputKey, 0);
    }, delay);
  }, [clearPracticeInputVisibilityTimeout, ensurePracticeInputVisible]);

  const handlePracticeInputFocus = useCallback((inputKey: string) => {
    activePracticeInputKeyRef.current = inputKey;
    schedulePracticeInputVisibilityCheck(
      inputKey,
      lessonKeyboardHeight > 0 ? PRACTICE_INPUT_RECHECK_DELAY : PRACTICE_INPUT_INITIAL_FOCUS_DELAY
    );
  }, [lessonKeyboardHeight, schedulePracticeInputVisibilityCheck]);

  const handlePracticeInputBlur = useCallback((inputKey: string) => {
    if (activePracticeInputKeyRef.current === inputKey) {
      activePracticeInputKeyRef.current = null;
      clearPracticeInputVisibilityTimeout();
    }
  }, [clearPracticeInputVisibilityTimeout]);

  useEffect(() => {
    const handleKeyboardFrameChange = (event: { endCoordinates?: { height?: number } }) => {
      setLessonKeyboardHeight(event.endCoordinates?.height ?? 0);
    };
    const handleKeyboardHide = () => {
      setLessonKeyboardHeight(0);
    };

    const frameChangeEvent = typeof Keyboard.addListener === 'function'
      ? Keyboard.addListener('keyboardWillChangeFrame', handleKeyboardFrameChange)
      : null;
    const showEvent = Keyboard.addListener('keyboardDidShow', handleKeyboardFrameChange);
    const hideEvent = Keyboard.addListener('keyboardDidHide', handleKeyboardHide);

    return () => {
      frameChangeEvent?.remove();
      showEvent.remove();
      hideEvent.remove();
    };
  }, []);

  useEffect(() => {
    if (lessonKeyboardHeight > 0 && activePracticeInputKeyRef.current) {
      schedulePracticeInputVisibilityCheck(activePracticeInputKeyRef.current, PRACTICE_INPUT_RECHECK_DELAY);
      return;
    }
    if (lessonKeyboardHeight <= 0) {
      clearPracticeInputVisibilityTimeout();
    }
  }, [clearPracticeInputVisibilityTimeout, lessonKeyboardHeight, schedulePracticeInputVisibilityCheck]);

  useEffect(() => () => {
    clearPracticeInputVisibilityTimeout();
  }, [clearPracticeInputVisibilityTimeout]);

  useEffect(() => {
    lessonRef.current = lesson;
  }, [lesson]);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!user || !lessonId) {
        setIsLessonCompleted(false);
        return;
      }

      try {
        const completedLessons = await fetchUserCompletedLessons();
        if (!isMounted) {
          return;
        }

        setIsLessonCompleted(
          completedLessons.some((entry) => entry.lesson_id === lessonId && entry.is_completed !== false)
        );
      } catch {
        if (isMounted) {
          setIsLessonCompleted(false);
        }
      }
    };

    void run();

    return () => {
      isMounted = false;
    };
  }, [lessonId, user]);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!user?.id || !lessonId) {
        if (isMounted) {
          setSavedAnswerStateByUnit({});
        }
        return;
      }

      try {
        answerStateHydrateStartedAtRef.current = performance.now();
        console.info('[lesson-load] answer state hydrate started', {
          lessonId,
        });
        const answerStates = await fetchLessonAnswerStates(lessonId);
        if (!isMounted) {
          return;
        }

        console.info('[lesson-load] answer state hydrate loaded', {
          lessonId,
          elapsedMs: answerStateHydrateStartedAtRef.current
            ? elapsedMs(answerStateHydrateStartedAtRef.current)
            : null,
          unitCount: Object.keys(answerStates).length,
        });
        console.info('[answer-state] hydrate fetched', {
          lessonId,
          unitKeys: Object.keys(answerStates),
        });
        setSavedAnswerStateByUnit(answerStates);
      } catch {
        if (isMounted) {
          console.info('[lesson-load] answer state hydrate failed', {
            lessonId,
            elapsedMs: answerStateHydrateStartedAtRef.current
              ? elapsedMs(answerStateHydrateStartedAtRef.current)
              : null,
          });
          setSavedAnswerStateByUnit({});
        }
      }
    };

    void run();

    return () => {
      isMounted = false;
    };
  }, [lessonId, user?.id]);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!user?.id || !lessonId) {
        if (isMounted) {
          setAppLessonProgressDetail(null);
          pendingAppResumeRef.current = null;
          writtenAppProgressUnitKeysRef.current = new Set();
        }
        return;
      }

      try {
        progressHydrateStartedAtRef.current = performance.now();
        console.info('[lesson-load] progress hydrate started', {
          lessonId,
        });
        const detail = await fetchAppLessonProgressDetail(lessonId);
        if (!isMounted) {
          return;
        }

        console.info('[lesson-load] progress hydrate loaded', {
          lessonId,
          elapsedMs: progressHydrateStartedAtRef.current
            ? elapsedMs(progressHydrateStartedAtRef.current)
            : null,
          hasResume: Boolean(detail.resume),
          completedUnitCount: Array.isArray(detail.completed_unit_keys) ? detail.completed_unit_keys.length : 0,
        });
        setAppLessonProgressDetail(detail);
        pendingAppResumeRef.current = detail.resume;
        writtenAppProgressUnitKeysRef.current = new Set(detail.completed_unit_keys ?? []);
      } catch {
        if (!isMounted) {
          return;
        }

        console.info('[lesson-load] progress hydrate failed', {
          lessonId,
          elapsedMs: progressHydrateStartedAtRef.current
            ? elapsedMs(progressHydrateStartedAtRef.current)
            : null,
        });
        setAppLessonProgressDetail(null);
        pendingAppResumeRef.current = null;
        writtenAppProgressUnitKeysRef.current = new Set();
      }
    };

    void run();

    return () => {
      isMounted = false;
    };
  }, [lessonId, user?.id]);

  useEffect(() => {
    audioRateRef.current = audioRate;
  }, [audioRate]);

  useEffect(() => {
    if (!hasStartedLesson) {
      setMaxVisitedSectionIndex(0);
      return;
    }

    setMaxVisitedSectionIndex((previous) => Math.max(previous, activeSectionIndex));
  }, [activeSectionIndex, hasStartedLesson]);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!lessonId) {
        setCoverLesson(null);
        return;
      }

      try {
        const row = await getLessonById(lessonId);
        if (!isMounted) {
          return;
        }
        setCoverLesson(row);
      } catch {
        if (isMounted) {
          setCoverLesson(null);
        }
      }
    };

    void run();

    return () => {
      isMounted = false;
    };
  }, [conversationIntroOpacity, conversationIntroScale, conversationIntroTranslateY, lessonId]);

  useEffect(() => {
    if (hasMembership) {
      setFreeLessonIds(new Set());
      return;
    }

    let isMounted = true;

    const run = async () => {
      try {
        const rows = await getLessonsIndex();
        if (!isMounted) {
          return;
        }

        const firstByLevel = new Map<string, string>();
        [...rows]
          .filter((item) => item.stage && typeof item.level === 'number')
          .sort((a, b) => {
            if (a.stage !== b.stage) {
              return String(a.stage ?? '').localeCompare(String(b.stage ?? ''));
            }
            const levelOrder = (a.level ?? 0) - (b.level ?? 0);
            if (levelOrder !== 0) {
              return levelOrder;
            }
            return (a.lesson_order ?? Number.MAX_SAFE_INTEGER) - (b.lesson_order ?? Number.MAX_SAFE_INTEGER);
          })
          .forEach((item) => {
            if (!item.id || !item.stage || typeof item.level !== 'number') {
              return;
            }

            const key = `${item.stage}-${item.level}`;
            if (!firstByLevel.has(key)) {
              firstByLevel.set(key, item.id);
            }
          });

        setFreeLessonIds(new Set(firstByLevel.values()));
      } catch {
        if (isMounted) {
          setFreeLessonIds(new Set());
        }
      }
    };

    void run();

    return () => {
      isMounted = false;
    };
  }, [hasMembership]);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!lessonId) {
        setErrorMessage(uiCopy.missingLessonId);
        setIsLoading(false);
        return;
      }

      setIsLoading(!lessonRef.current);
      setErrorMessage(null);
      lessonLoadStartedAtRef.current = performance.now();
      lessonReadyLoggedRef.current = false;
      lessonContentEnteredLoggedRef.current = false;
      console.info('[lesson-load] cover load started', {
        lessonId,
        contentLang,
        hasCachedLesson: Boolean(lessonRef.current),
      });

      try {
        const row = await fetchResolvedLesson(lessonId, contentLang);
        if (!isMounted) {
          return;
        }
        console.info('[lesson-load] cover lesson loaded', {
          lessonId,
          contentLang,
          elapsedMs: elapsedMs(lessonLoadStartedAtRef.current),
          sectionCount: Array.isArray(row.sections) ? row.sections.length : 0,
          questionCount: Array.isArray(row.questions) ? row.questions.length : 0,
          phraseCount: Array.isArray(row.phrases) ? row.phrases.length : 0,
          practiceExerciseCount: Array.isArray(row.practice_exercises) ? row.practice_exercises.length : 0,
        });
        setLesson(row);
        setCoverLesson(row);
        if (contentLang === 'en') {
          setEnglishLessonFallback(row);
        } else {
          void fetchResolvedLesson(lessonId, 'en')
            .then((englishRow) => {
              if (isMounted) {
                setEnglishLessonFallback(englishRow);
              }
            })
            .catch(() => {
              if (isMounted) {
                setEnglishLessonFallback(null);
              }
            });
        }
        const otherLang = contentLang === 'th' ? 'en' : 'th';
        prefetchResolvedLesson(lessonId, otherLang);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        const message = error instanceof Error ? error.message : uiCopy.fetchLessonFailed;
        console.info('[lesson-load] cover load failed', {
          lessonId,
          contentLang,
          elapsedMs: elapsedMs(lessonLoadStartedAtRef.current),
          message,
        });
        setErrorMessage(message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [contentLang, lessonId, uiCopy.fetchLessonFailed, uiCopy.missingLessonId]);

  useEffect(() => {
    setLesson(null);
    setCoverLesson(null);
    setEnglishLessonFallback(null);
    setIsLoading(true);
    setErrorMessage(null);
    setActiveSectionIndex(0);
    setMaxVisitedSectionIndex(0);
    setIsMenuOpen(false);
    setHasStartedLesson(false);
    setContentLang('en');
    setSelectedAnswers({});
    setHasSubmittedComprehensionAnswers(false);
    setComprehensionError('');
    setAudioUrls({ main: null, noBg: null, bg: null });
    setIsAudioLoading(false);
    setIsAudioPlaying(false);
    setAudioPositionMillis(0);
    setAudioDurationMillis(0);
    setHasAudioFinished(false);
    setAudioRate(1);
    setHasShownConversationIntro(false);
    setIsConversationIntroVisible(false);
    setIsConversationIntroAnimatingOut(false);
    setConversationIntroPendingSectionIndex(null);
    setSnippetIndex(EMPTY_SNIPPET_INDEX);
    setPhraseSnippetIndex(EMPTY_PHRASE_SNIPPET_INDEX);
    setActiveSnippetKey(null);
    setPlayingSnippetKey(null);
    setIsSnippetLoading(false);
    setApplyText('');
    setShowApplyResponse(false);
    setExpandedPhraseIds({});
    setIsFullscreen(false);
    setPracticeSelections({});
    setCheckedPracticeExercises({});
    setPracticeOpenAnswers({});
    setPracticeBlankAnswers({});
    setPracticeEvaluations({});
    setPracticeErrorByExercise({});
    setPracticeMarkedCorrect({});
    setCheckingPracticeExercises({});
    setPracticeExampleAnswerLineCounts({});
    setPracticeImagePreview(null);
    setAppLessonProgressDetail(null);
    setSavedAnswerStateByUnit({});
    pendingAppResumeRef.current = null;
    writtenAppProgressUnitKeysRef.current = new Set();
    hasHydratedLessonAnswerStateRef.current = false;
    hasInteractedWithLessonAnswerStateRef.current = false;
    progressHydrateStartedAtRef.current = null;
    answerStateHydrateStartedAtRef.current = null;
    conversationIntroTranslateY.value = 0;
    conversationIntroScale.value = 1;
    conversationIntroOpacity.value = 1;
  }, [conversationIntroOpacity, conversationIntroScale, conversationIntroTranslateY, lessonId]);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch(() => undefined);
  }, []);

  const lessonCover = lesson ?? coverLesson;
  const isLessonReady = Boolean(lesson);
  const pageLanguage = hasStartedLesson ? contentLang : uiLanguage;

  useEffect(() => {
    if (!lessonId || !isLessonReady || lessonReadyLoggedRef.current) {
      return;
    }

    lessonReadyLoggedRef.current = true;
    console.info('[lesson-load] start lesson ready', {
      lessonId,
      contentLang,
      elapsedMs: elapsedMs(lessonLoadStartedAtRef.current),
      sectionCount,
    });
  }, [contentLang, isLessonReady, lessonId, sectionCount]);

  const englishTitle = useMemo(() => {
    return lesson?.title_en?.trim() || lesson?.title?.trim() || coverLesson?.title?.trim() || lesson?.title_th?.trim() || coverLesson?.title_th?.trim() || null;
  }, [coverLesson, lesson]);

  const thaiTitle = useMemo(() => {
    if (!lessonCover) return null;
    return lessonCover.title_th?.trim() || null;
  }, [lessonCover]);

  const isCheckpointCoverLesson = useMemo(() => {
    if (!lessonCover) {
      return false;
    }

    return [lessonCover.title, lessonCover.title_th].some((value) =>
      String(value ?? '').toLowerCase().includes('checkpoint')
    );
  }, [lessonCover]);

  const resolvedFocus = useMemo(() => {
    if (pageLanguage === 'th') {
      return (
        lesson?.focus_th?.trim() ||
        coverLesson?.focus_th?.trim() ||
        lesson?.focus?.trim() ||
        coverLesson?.focus?.trim() ||
        lesson?.focus_en?.trim() ||
        null
      );
    }

    return (
      lesson?.focus_en?.trim() ||
      lesson?.focus?.trim() ||
      coverLesson?.focus?.trim() ||
      lesson?.focus_th?.trim() ||
      coverLesson?.focus_th?.trim() ||
      null
    );
  }, [coverLesson, lesson, pageLanguage]);

  const checkpointFocusText = useMemo(() => {
    if (!isCheckpointCoverLesson) {
      return null;
    }

    if (pageLanguage === 'th') {
      return 'บทสนทนาในจุดตรวจสอบนี้มีหลายแนวคิดที่คุณได้เรียนมาในเลเวลนี้แล้ว ลองดูว่าตอนนี้คุณเข้าใจสิ่งเหล่านั้นในบทสนทนาได้ไหม';
    }

    return "The checkpoint conversation has lots of the concepts you've learned in this level! See if you can understand them now in the conversation.";
  }, [isCheckpointCoverLesson, pageLanguage]);

  const coverFocusText = checkpointFocusText || resolvedFocus;

  const resolvedBackstory = useMemo(() => {
    if (pageLanguage === 'th') {
      return lesson?.backstory_th || coverLesson?.backstory_th || lesson?.backstory || coverLesson?.backstory || lesson?.backstory_en || null;
    }

    return lesson?.backstory_en || lesson?.backstory || coverLesson?.backstory || lesson?.backstory_th || coverLesson?.backstory_th || null;
  }, [coverLesson, lesson, pageLanguage]);

  const headerImageUrl = useMemo(
    () => lesson?.header_image_url ?? resolveHeaderImageUrl(lesson?.header_image_path ?? lesson?.header_img ?? coverLesson?.header_img ?? null),
    [coverLesson?.header_img, lesson?.header_image_path, lesson?.header_image_url, lesson?.header_img]
  );
  const lessonTabs = useMemo(() => buildLessonTabs(lesson), [lesson]);
  const activeTab = lessonTabs[activeSectionIndex] ?? null;
  const activeSection = activeTab?.section ?? null;
  const normalizedQuestions = useMemo(
    () =>
      hasStartedLesson
        ? (lesson?.questions ?? []).map((question, index) => ({
            ...normalizeQuestion(question, contentLang),
            id: String(question.id ?? `question-${index + 1}`),
            sortOrder: Number(question.sort_order ?? index + 1),
          }))
        : [],
    [contentLang, hasStartedLesson, lesson?.questions]
  );
  const comprehensionOptionImageFallbacks = useMemo(() => {
    const fallbackMap: Record<string, { imageKey: string | null; altText: string; altTextTh: string }> = {};
    const fallbackQuestions = englishLessonFallback?.questions ?? [];

    fallbackQuestions.forEach((question, index) => {
      const normalizedQuestion = normalizeQuestion(question, 'en');
      const questionId = String(question.id ?? `question-${index + 1}`);
      const questionSortOrder = Number(question.sort_order ?? index + 1);

      normalizedQuestion.options.forEach((option, optionIndex) => {
        const label = normalizeOptionLetter(option.label || String.fromCharCode(65 + optionIndex));
        const fallbackValue = {
          imageKey: option.imageKey,
          altText: option.altText,
          altTextTh: option.altTextTh,
        };

        fallbackMap[`${questionId}:${label}`] = fallbackValue;
        fallbackMap[`${questionSortOrder}:${label}`] = fallbackValue;
      });
    });

    return fallbackMap;
  }, [englishLessonFallback?.questions]);
  const normalizedTranscript = useMemo(
    () =>
      hasStartedLesson
        ? (lesson?.transcript ?? [])
            .map((line, index) => normalizeTranscriptLine(line, index))
            .sort((a, b) => a.sortOrder - b.sortOrder)
        : [],
    [hasStartedLesson, lesson?.transcript]
  );
  const normalizedApply = useMemo(
    () =>
      hasStartedLesson ? normalizeApplyContent(activeTab?.type === 'apply' ? activeSection : null, contentLang) : EMPTY_NORMALIZED_APPLY,
    [activeSection, activeTab?.type, contentLang, hasStartedLesson]
  );
  const normalizedLessonPhrases = useMemo(
    () =>
      hasStartedLesson
        ? (lesson?.phrases ?? [])
            .map((phrase, index) => normalizeLessonPhrase(phrase, index, contentLang))
            .filter((phrase): phrase is NormalizedLessonPhrase => phrase !== null)
        : [],
    [contentLang, hasStartedLesson, lesson?.phrases]
  );
  const phraseVariantVisibilityById = useMemo(() => {
    const counts = new Map<string, number>();
    normalizedLessonPhrases.forEach((phrase) => {
      const key = (phrase.phrase || phrase.phraseTh).trim().toLocaleLowerCase();
      if (!key) {
        return;
      }
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    const visibility = new Map<string, boolean>();
    normalizedLessonPhrases.forEach((phrase) => {
      const key = (phrase.phrase || phrase.phraseTh).trim().toLocaleLowerCase();
      visibility.set(phrase.id, phrase.variant > 0 && (counts.get(key) ?? 0) > 1);
    });
    return visibility;
  }, [normalizedLessonPhrases]);
  const normalizedPracticeExercises = useMemo(
    () =>
      hasStartedLesson
        ? (lesson?.practice_exercises ?? [])
            .filter((exercise) => !isQuickPracticeExercise(exercise))
            .map((exercise) => normalizePracticeExercise(exercise, contentLang))
            .filter(
              (exercise) =>
                exercise.kind === 'multiple_choice' ||
                exercise.kind === 'open' ||
                exercise.kind === 'fill_blank' ||
                exercise.kind === 'sentence_transform'
            )
            .sort((a, b) => a.sortOrder - b.sortOrder)
        : [],
    [contentLang, hasStartedLesson, lesson?.practice_exercises]
  );
  const normalizedQuickPracticeExercises = useMemo(
    () =>
      hasStartedLesson
        ? (lesson?.practice_exercises ?? [])
            .filter(isQuickPracticeExercise)
            .map((exercise) => normalizePracticeExercise(exercise, contentLang))
            .filter(
              (exercise) =>
                exercise.kind === 'multiple_choice' ||
                exercise.kind === 'open' ||
                exercise.kind === 'fill_blank' ||
                exercise.kind === 'sentence_transform'
            )
            .sort((a, b) => a.sortOrder - b.sortOrder)
        : [],
    [contentLang, hasStartedLesson, lesson?.practice_exercises]
  );
  const allAnswerStatePracticeExercises = useMemo(
    () => [...normalizedPracticeExercises, ...normalizedQuickPracticeExercises],
    [normalizedPracticeExercises, normalizedQuickPracticeExercises]
  );
  useEffect(() => {
    const validQuestionIds = new Set(normalizedQuestions.map((question) => question.id));

    setSelectedAnswers((previous) => {
      const nextEntries = Object.entries(previous).filter(([questionId]) => validQuestionIds.has(questionId));

      if (nextEntries.length === Object.keys(previous).length) {
        return previous;
      }

      return Object.fromEntries(nextEntries);
    });
  }, [normalizedQuestions]);

  const tabBarText = TAB_BAR_LABELS[uiLanguage];
  const practiceOpenInputStyle = contentLang === 'th' ? styles.practiceOpenInputThai : styles.practiceOpenInputEnglish;
  const applyInputStyle = contentLang === 'th' ? styles.applyInputThai : styles.applyInputEnglish;
  const pageCopy = useMemo(() => getLessonDetailCopy(pageLanguage), [pageLanguage]);
  const richLinkCopy = useMemo(
    () =>
      uiLanguage === 'th'
        ? {
            openLesson: 'เปิดบทเรียน',
            openPage: 'เปิดหน้า',
            openLink: 'เปิดลิงก์',
            lessonSubtitle: 'เปิดบทเรียนนี้ในแอป',
            topicSubtitle: 'คลังหัวข้อการเรียนรู้',
            exerciseSubtitle: 'คลังแบบฝึกหัด',
            resourcesSubtitle: 'สื่อการเรียน',
            progressSaved: 'ความคืบหน้าของบทเรียนจะถูกบันทึกไว้',
            externalSubtitle: 'ลิงก์ภายนอก',
          }
        : {
            openLesson: 'Open lesson',
            openPage: 'Open page',
            openLink: 'Open link',
            lessonSubtitle: 'Open this lesson in the app',
            topicSubtitle: 'Topic library',
            exerciseSubtitle: 'Exercise bank',
            resourcesSubtitle: 'Resources',
            progressSaved: 'Your lesson progress will be saved.',
            externalSubtitle: 'External link',
          },
    [uiLanguage]
  );
  const isLockedLesson = useMemo(() => {
    if (hasMembership) {
      return false;
    }

    if (lockedParam === '1') {
      return true;
    }

    if (!lessonCover?.id) {
      return false;
    }

    if (freeLessonIds.size > 0) {
      return !freeLessonIds.has(lessonCover.id);
    }

    return 'locked' in lessonCover ? lessonCover.locked === true : false;
  }, [freeLessonIds, hasMembership, lessonCover, lockedParam]);
  const activeSectionTitle = useMemo(
    () => (activeTab ? getLessonSectionTitle(pageLanguage, activeTab.type, activeSectionIndex) : null),
    [activeSectionIndex, activeTab, pageLanguage]
  );
  const activeSectionNotes = useMemo(
    () => (activeSection ? getSectionNotes(pageLanguage, activeSection) : []),
    [activeSection, pageLanguage]
  );
  const activeSectionEyebrow = useMemo(
    () => pageCopy.sectionEyebrow(activeSectionIndex),
    [activeSectionIndex, pageCopy]
  );
  const activeSectionTypeLabel = useMemo(
    () => (activeTab ? getLessonSectionLabel(pageLanguage, activeTab.type) : null),
    [activeTab, pageLanguage]
  );
  const isPrepareTab = activeTab?.type === 'prepare';
  const isComprehensionTab = activeTab?.type === 'comprehension';
  const isTranscriptTab = activeTab?.type === 'transcript';
  const isApplyTab = activeTab?.type === 'apply';
  const isUnderstandTab = activeTab?.type === 'understand';
  const isExtraTipTab = activeTab?.type === 'extra_tip';
  const isCommonMistakeTab = activeTab?.type === 'common_mistake';
  const isCultureNoteTab = activeTab?.type === 'culture_note';
  const isPracticeTab = activeTab?.type === 'practice';
  const isPhrasesTab = activeTab?.type === 'phrases_verbs';
  const activePageKey = useMemo(
    () => (activeTab?.type ? buildAppPageKey(activeTab.type) : null),
    [activeTab?.type]
  );
  const isCompactLayout = windowWidth < 768;
  const prepareSectionForPreload = useMemo(
    () => lessonTabs.find((tab) => tab.type === 'prepare')?.section ?? null,
    [lessonTabs]
  );
  const preparePreloadNodes = useMemo(
    () => getRichNodesForLanguage(prepareSectionForPreload, contentLang),
    [contentLang, prepareSectionForPreload]
  );
  const prepareNodes = useMemo(
    () => (hasStartedLesson ? getRichNodesForLanguage(isPrepareTab ? activeSection : null, contentLang) : []),
    [activeSection, contentLang, hasStartedLesson, isPrepareTab]
  );
  const prepareItems = useMemo(() => {
    if (!isPrepareTab) {
      return [];
    }

    return prepareNodes
      .map((node, originalIndex) => ({ node, originalIndex }))
      .filter(({ node }) => {
        const hasSnippet = Boolean(getSnippetForNode(node, snippetIndex));
        return hasVisibleRichNodeContent(node, contentLang) || hasSnippet;
      })
      .sort((left, right) => {
        const leftSeq = Number(left.node.audio_seq) || 0;
        const rightSeq = Number(right.node.audio_seq) || 0;
        if (leftSeq !== rightSeq) {
          return leftSeq - rightSeq;
        }
        return left.originalIndex - right.originalIndex;
      });
  }, [contentLang, isPrepareTab, prepareNodes, snippetIndex]);
  const understandNodes = useMemo(
    () =>
      hasStartedLesson
        ? injectQuickPracticeNodes(
            getRichNodesForLanguage(isUnderstandTab ? activeSection : null, contentLang),
            normalizedQuickPracticeExercises,
            contentLang
          )
        : [],
    [activeSection, contentLang, hasStartedLesson, isUnderstandTab, normalizedQuickPracticeExercises]
  );
  const extraTipNodes = useMemo(
    () =>
      hasStartedLesson
        ? injectQuickPracticeNodes(
            getRichNodesForLanguage(isExtraTipTab ? activeSection : null, contentLang),
            normalizedQuickPracticeExercises,
            contentLang
          )
        : [],
    [activeSection, contentLang, hasStartedLesson, isExtraTipTab, normalizedQuickPracticeExercises]
  );
  const commonMistakeNodes = useMemo(
    () => (hasStartedLesson ? getRichNodesForLanguage(isCommonMistakeTab ? activeSection : null, contentLang) : []),
    [activeSection, contentLang, hasStartedLesson, isCommonMistakeTab]
  );
  const cultureNoteNodes = useMemo(
    () => (hasStartedLesson ? getRichNodesForLanguage(isCultureNoteTab ? activeSection : null, contentLang) : []),
    [activeSection, contentLang, hasStartedLesson, isCultureNoteTab]
  );
  const understandGroups = useMemo(
    () => groupRichSectionNodes(selectNodesForTableVisibility(understandNodes, isCompactLayout), contentLang),
    [contentLang, isCompactLayout, understandNodes]
  );
  const commonMistakeGroups = useMemo(
    () => groupRichSectionNodes(selectNodesForTableVisibility(commonMistakeNodes, isCompactLayout), contentLang),
    [commonMistakeNodes, contentLang, isCompactLayout]
  );
  const extraTipGroups = useMemo(
    () => groupRichSectionNodes(selectNodesForTableVisibility(extraTipNodes, isCompactLayout), contentLang),
    [contentLang, extraTipNodes, isCompactLayout]
  );
  const cultureNoteGroups = useMemo(
    () => groupRichSectionNodes(selectNodesForTableVisibility(cultureNoteNodes, isCompactLayout), contentLang),
    [contentLang, cultureNoteNodes, isCompactLayout]
  );
  const activePagerGroups = useMemo(
    () =>
      isUnderstandTab
        ? understandGroups
        : isExtraTipTab
          ? extraTipGroups
          : isCommonMistakeTab
            ? commonMistakeGroups
            : isCultureNoteTab
              ? cultureNoteGroups
              : [],
    [commonMistakeGroups, cultureNoteGroups, extraTipGroups, isCommonMistakeTab, isCultureNoteTab, isExtraTipTab, isUnderstandTab, understandGroups]
  );
  const activeExpectedCardUnits = useMemo(
    () =>
      activePageKey
        ? (appLessonProgressDetail?.expected_units ?? []).filter(
            (unit) => unit.unit_type === 'card' && unit.parent_unit_key === activePageKey
          )
        : [],
    [activePageKey, appLessonProgressDetail?.expected_units]
  );
  const localCardUnitsForActiveSection = useMemo(
    () =>
      activeTab?.type && activeSection
        ? buildAppCardUnitsForSection(activeTab.type, activeSection)
        : [],
    [activeSection, activeTab?.type]
  );
  const activePracticeExercise = isPracticeTab ? normalizedPracticeExercises[activePracticeCardIndex] ?? null : null;
  const sectionCount = lessonTabs.length;
  const isLastSection = activeSectionIndex >= sectionCount - 1;
  const isRichPagerTab = isUnderstandTab || isExtraTipTab || isCommonMistakeTab || isCultureNoteTab;
  const hasPracticePagerCards = isPracticeTab && normalizedPracticeExercises.length > 0;
  const isInnerPagerTab = isRichPagerTab || hasPracticePagerCards;
  const activeInnerCardIndex = isPracticeTab
    ? activePracticeCardIndex
    : activeUnderstandGroupIndex;
  const activeInnerCardCount = isPracticeTab
    ? normalizedPracticeExercises.length
    : activePagerGroups.length;
  const hasMultiplePagerCards = isInnerPagerTab && activeInnerCardCount > 1;
  const isLastPagerCard = !isInnerPagerTab || activeInnerCardCount === 0 || activeInnerCardIndex >= activeInnerCardCount - 1;
  const activeQuickPracticeHasEditableInputs = useMemo(() => {
    const currentPagerGroup = isRichPagerTab ? activePagerGroups[activeUnderstandGroupIndex] ?? null : null;
    if (!currentPagerGroup) {
      return false;
    }

    return currentPagerGroup.body.some((node) => {
      if (node.kind !== 'quick_practice_exercise') {
        return false;
      }

      const exercise = (node as QuickPracticeRichNode).exercise;
      return (
        exercise.kind === 'open' ||
        exercise.kind === 'fill_blank' ||
        exercise.kind === 'sentence_transform'
      );
    });
  }, [activePagerGroups, activeUnderstandGroupIndex, isRichPagerTab]);
  const isKeyboardOpen = lessonKeyboardHeight > 0;
  const contentOverflows = contentScrollMeasuredHeight > contentScrollViewportHeight + 1;
  const shouldEnableBodyScroll = contentOverflows || isKeyboardOpen || activeQuickPracticeHasEditableInputs;
  const isApplyActionLocked = isApplyTab && !showApplyResponse;
  const isUnderstandActionLocked = isUnderstandTab && !isLastPagerCard;
  const isOtherPagerActionLocked = isInnerPagerTab && !isLastPagerCard && !isUnderstandTab;
  const isComprehensionSectionActionLocked = isComprehensionTab && !hasSubmittedComprehensionAnswers;
  const isPrimaryActionDisabled =
    isOtherPagerActionLocked || isUnderstandActionLocked || isApplyActionLocked || isComprehensionSectionActionLocked;
  const explainablePrimaryActionHint =
    isApplyActionLocked
      ? pageCopy.applyNextSectionHint
      : isUnderstandActionLocked
        ? pageCopy.understandNextSectionHint
        : null;
  const getCurrentCardUnitKey = useCallback(() => {
    if (!activeTab?.type || !activePageKey) {
      return null;
    }

    const activeIndex = activeUnderstandGroupIndex;
    const expectedCardUnit = activeExpectedCardUnits[activeIndex];
    if (expectedCardUnit?.unit_key) {
      return expectedCardUnit.unit_key;
    }

    const localCardUnit = localCardUnitsForActiveSection[activeIndex];
    return localCardUnit?.unit_key ?? null;
  }, [
    activeExpectedCardUnits,
    activePageKey,
    activeTab?.type,
    activeUnderstandGroupIndex,
    localCardUnitsForActiveSection,
  ]);
  const currentCardUnitKey = useMemo(
    () => (isRichPagerTab ? getCurrentCardUnitKey() : null),
    [getCurrentCardUnitKey, isRichPagerTab]
  );
  const getCurrentProgressParentKey = useCallback(
    () => (currentCardUnitKey ?? activePageKey ?? null),
    [activePageKey, currentCardUnitKey]
  );
  const writeProgressUnit = useCallback(
    async (unitType: 'page' | 'card' | 'exercise' | 'example_reveal', unitKey: string, sectionKey?: string | null) => {
      if (!user?.id || !lessonId || !unitKey || writtenAppProgressUnitKeysRef.current.has(unitKey)) {
        return;
      }

      writtenAppProgressUnitKeysRef.current.add(unitKey);

      try {
        await trackLessonPersistence(
          writeAppLessonProgress({
            lessonId,
            unitType,
            unitKey,
            sectionKey,
          })
        );
        console.info('[app-progress] write ok', {
          lessonId,
          unitType,
          unitKey,
          sectionKey: sectionKey ?? null,
        });
      } catch {
        console.warn('[app-progress] write failed', {
          lessonId,
          unitType,
          unitKey,
          sectionKey: sectionKey ?? null,
        });
        writtenAppProgressUnitKeysRef.current.delete(unitKey);
      }
    },
    [lessonId, trackLessonPersistence, user?.id]
  );
  const resolveResumeSectionIndex = useCallback(
    (resume: AppLessonProgressDetail['resume']) => {
      if (!resume?.unit_key) {
        return null;
      }

      if (resume.unit_type === 'page') {
        return lessonTabs.findIndex((tab) => buildAppPageKey(tab.type) === resume.unit_key);
      }

      const parsedCard = parseAppCardKey(resume.unit_key);
      if (!parsedCard?.sectionType) {
        return null;
      }

      return lessonTabs.findIndex((tab) => tab.type === parsedCard.sectionType);
    },
    [lessonTabs]
  );
  const applyPendingResumeSection = useCallback(() => {
    const resume = pendingAppResumeRef.current;
    if (!resume) {
      return false;
    }

    const resumeIndex = resolveResumeSectionIndex(resume);
    if (resumeIndex === null || resumeIndex < 0) {
      pendingAppResumeRef.current = null;
      return false;
    }

    if (activeSectionIndex !== resumeIndex) {
      setActiveSectionIndex(resumeIndex);
    }
    setMaxVisitedSectionIndex((previous) => Math.max(previous, resumeIndex));
    if (prepareSectionIndex >= 0 && resumeIndex > prepareSectionIndex) {
      setHasShownConversationIntro(true);
    }

    if (resume.unit_type === 'page') {
      pendingAppResumeRef.current = null;
    }

    return true;
  }, [activeSectionIndex, prepareSectionIndex, resolveResumeSectionIndex]);
  const openLessonAtResume = useCallback(() => {
    console.info('[lesson-load] lesson start pressed', {
      lessonId,
      elapsedMsSinceCoverLoadStart: elapsedMs(lessonLoadStartedAtRef.current),
      hasPendingResume: Boolean(pendingAppResumeRef.current),
    });
    if (!applyPendingResumeSection()) {
      setActiveSectionIndex(0);
      setMaxVisitedSectionIndex(0);
    }

    setHasStartedLesson(true);
    void checkInDailyStreak()
      .then((result) => {
        if (!result.should_celebrate || (result.daily_streak ?? 0) <= 0) {
          return;
        }

        setStreakCelebration(getStreakCelebrationCopy(uiLanguage, result.daily_streak));
      })
      .catch((error) => {
        console.warn('[lesson-streak] check-in failed', error instanceof Error ? error.message : 'Unknown error');
      });
  }, [applyPendingResumeSection, lessonId, uiLanguage]);

  useEffect(() => {
    if (!hasStartedLesson || lessonContentEnteredLoggedRef.current) {
      return;
    }

    lessonContentEnteredLoggedRef.current = true;
    console.info('[lesson-load] lesson content entered', {
      lessonId,
      elapsedMsSinceCoverLoadStart: elapsedMs(lessonLoadStartedAtRef.current),
      activeSectionIndex,
    });
  }, [activeSectionIndex, hasStartedLesson, lessonId]);

  useEffect(() => {
    if (!streakCelebration) {
      if (streakCelebrationTimeoutRef.current) {
        clearTimeout(streakCelebrationTimeoutRef.current);
        streakCelebrationTimeoutRef.current = null;
      }
      return;
    }

    streakCelebrationTimeoutRef.current = setTimeout(() => {
      setStreakCelebration(null);
      streakCelebrationTimeoutRef.current = null;
    }, 4000);

    return () => {
      if (streakCelebrationTimeoutRef.current) {
        clearTimeout(streakCelebrationTimeoutRef.current);
        streakCelebrationTimeoutRef.current = null;
      }
    };
  }, [streakCelebration]);
  const handleSetActiveInnerCardIndex = useCallback(
    (nextIndex: number) => {
      const clampedIndex = Math.max(0, Math.min(nextIndex, Math.max(0, activeInnerCardCount - 1)));

      if (isPracticeTab) {
        setActivePracticeCardIndex(clampedIndex);
        return;
      }

      setActiveUnderstandGroupIndex(clampedIndex);
    },
    [activeInnerCardCount, isPracticeTab]
  );
  const richPagerTranslateX = useSharedValue(0);
  const handleRichPagerSwipe = useCallback(
    (translationX: number, velocityX: number) => {
      if (!isInnerPagerTab || activeInnerCardCount <= 1) {
        return;
      }

      const movingLeft =
        translationX <= -RICH_PAGER_LEFT_SWIPE_DISTANCE || velocityX <= -RICH_PAGER_LEFT_SWIPE_VELOCITY;
      const movingRight =
        translationX >= RICH_PAGER_RIGHT_SWIPE_DISTANCE || velocityX >= RICH_PAGER_RIGHT_SWIPE_VELOCITY;

      if (movingLeft && activeInnerCardIndex < activeInnerCardCount - 1) {
        handleSetActiveInnerCardIndex(activeInnerCardIndex + 1);
        return;
      }

      if (movingRight && activeInnerCardIndex > 0) {
        handleSetActiveInnerCardIndex(activeInnerCardIndex - 1);
      }
    },
    [activeInnerCardCount, activeInnerCardIndex, handleSetActiveInnerCardIndex, isInnerPagerTab]
  );
  const richPagerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: richPagerTranslateX.value }],
  }));
  const richPagerGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(hasMultiplePagerCards)
        .activeOffsetX(RICH_PAGER_ACTIVE_OFFSET_X)
        .failOffsetY(RICH_PAGER_FAIL_OFFSET_Y)
        .shouldCancelWhenOutside(false)
        .onBegin(() => {
          'worklet';
          richPagerTranslateX.value = 0;
        })
        .onUpdate((event) => {
          'worklet';
          const clampedTranslation = Math.max(
            -RICH_PAGER_DRAG_LIMIT,
            Math.min(event.translationX, RICH_PAGER_DRAG_LIMIT)
          );
          richPagerTranslateX.value = clampedTranslation;
        })
        .onEnd((event) => {
          'worklet';
          runOnJS(handleRichPagerSwipe)(event.translationX, event.velocityX);
        })
        .onFinalize(() => {
          'worklet';
          richPagerTranslateX.value = withTiming(0, { duration: 140 });
        }),
    [
      handleRichPagerSwipe,
      hasMultiplePagerCards,
      richPagerTranslateX,
    ]
  );
  const prepareSectionIndex = useMemo(
    () => lessonTabs.findIndex((tab) => tab.type === 'prepare'),
    [lessonTabs]
  );
  const conversationIntroAnimatedStyle = useAnimatedStyle(() => ({
    opacity: conversationIntroOpacity.value,
    transform: [
      { translateY: conversationIntroTranslateY.value },
      { scale: conversationIntroScale.value },
    ],
  }));
  const finishConversationIntroTransition = useCallback(
    (targetIndex: number, shouldExpandTray: boolean) => {
      const clampedTargetIndex = Math.max(0, Math.min(targetIndex, Math.max(0, sectionCount - 1)));
      setIsConversationIntroVisible(false);
      setIsConversationIntroAnimatingOut(false);
      setConversationIntroPendingSectionIndex(null);
      conversationIntroTranslateY.value = 0;
      conversationIntroScale.value = 1;
      conversationIntroOpacity.value = 1;

      InteractionManager.runAfterInteractions(() => {
        setActiveSectionIndex(clampedTargetIndex);

        if (shouldExpandTray) {
          audioTrayExpandCounterRef.current += 1;
          setAudioTrayAutoExpandSignal(`conversation-intro-${audioTrayExpandCounterRef.current}`);
        }
      });
    },
    [conversationIntroOpacity, conversationIntroScale, conversationIntroTranslateY, sectionCount]
  );
  const openConversationIntro = useCallback((targetIndex: number) => {
    const clampedTargetIndex = Math.max(0, Math.min(targetIndex, Math.max(0, sectionCount - 1)));
    setHasShownConversationIntro(true);
    setConversationIntroPendingSectionIndex(clampedTargetIndex);
    setIsConversationIntroAnimatingOut(false);
    setIsConversationIntroVisible(true);
    conversationIntroTranslateY.value = 0;
    conversationIntroScale.value = 1;
    conversationIntroOpacity.value = 1;
  }, [conversationIntroOpacity, conversationIntroScale, conversationIntroTranslateY, sectionCount]);
  const shouldOpenConversationIntroForIndex = useCallback((targetIndex: number) => {
    if (hasShownConversationIntro || isConversationIntroVisible || isConversationIntroAnimatingOut) {
      return false;
    }

    if (prepareSectionIndex < 0) {
      return false;
    }

    return targetIndex > prepareSectionIndex;
  }, [hasShownConversationIntro, isConversationIntroAnimatingOut, isConversationIntroVisible, prepareSectionIndex]);
  const navigateToSectionWithConversationGate = useCallback((targetIndex: number) => {
    if (sectionCount <= 0) {
      return;
    }

    const clampedTargetIndex = Math.max(0, Math.min(targetIndex, sectionCount - 1));
    if (clampedTargetIndex === activeSectionIndex && !shouldOpenConversationIntroForIndex(clampedTargetIndex)) {
      return;
    }

    if (shouldOpenConversationIntroForIndex(clampedTargetIndex)) {
      openConversationIntro(clampedTargetIndex);
      return;
    }

    if (activeTab?.type === 'prepare' && clampedTargetIndex > activeSectionIndex) {
      audioTrayExpandCounterRef.current += 1;
      setAudioTrayAutoExpandSignal(`prepare-next-${audioTrayExpandCounterRef.current}`);
    }

    setActiveSectionIndex(clampedTargetIndex);
  }, [activeSectionIndex, activeTab?.type, openConversationIntro, sectionCount, shouldOpenConversationIntroForIndex]);
  const handleDismissConversationIntro = useCallback(() => {
    const targetIndex = conversationIntroPendingSectionIndex ?? activeSectionIndex;
    finishConversationIntroTransition(targetIndex, false);
  }, [activeSectionIndex, conversationIntroPendingSectionIndex, finishConversationIntroTransition]);
  const handlePlayConversationIntro = async () => {
    const targetIndex = conversationIntroPendingSectionIndex ?? activeSectionIndex;
    if (!audioUrls.main || isAudioLoading) {
      return;
    }

    try {
      await playConversationAudio();
    } catch {
      return;
    }

    setIsConversationIntroAnimatingOut(true);
    conversationIntroTranslateY.value = withTiming(windowHeight, { duration: 320 }, (finished) => {
      if (finished) {
        runOnJS(finishConversationIntroTransition)(targetIndex, true);
      }
    });
    conversationIntroScale.value = withTiming(0.94, { duration: 320 });
    conversationIntroOpacity.value = withTiming(0.98, { duration: 180 });
  };
  const canSwipeToPreviousSection = hasStartedLesson && activeSectionIndex > 0;
  const canSwipeToNextVisitedSection =
    hasStartedLesson && activeSectionIndex < Math.min(maxVisitedSectionIndex, Math.max(0, sectionCount - 1));
  const handleSectionSwipe = useCallback(
    (translationX: number, velocityX: number) => {
      if (isInnerPagerTab || sectionCount <= 1) {
        return;
      }

      const movingLeft =
        translationX <= -SECTION_SWIPE_LEFT_DISTANCE || velocityX <= -SECTION_SWIPE_LEFT_VELOCITY;
      const movingRight =
        translationX >= SECTION_SWIPE_RIGHT_DISTANCE || velocityX >= SECTION_SWIPE_RIGHT_VELOCITY;

      if (movingLeft && canSwipeToNextVisitedSection) {
        navigateToSectionWithConversationGate(Math.min(activeSectionIndex + 1, Math.min(maxVisitedSectionIndex, sectionCount - 1)));
        return;
      }

      if (movingRight && canSwipeToPreviousSection) {
        navigateToSectionWithConversationGate(Math.max(activeSectionIndex - 1, 0));
      }
    },
    [
      activeSectionIndex,
      canSwipeToNextVisitedSection,
      canSwipeToPreviousSection,
      isInnerPagerTab,
      maxVisitedSectionIndex,
      navigateToSectionWithConversationGate,
      sectionCount,
    ]
  );
  const sectionSwipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!isInnerPagerTab && sectionCount > 1 && (canSwipeToPreviousSection || canSwipeToNextVisitedSection))
        .activeOffsetX(SECTION_SWIPE_ACTIVE_OFFSET_X)
        .failOffsetY(SECTION_SWIPE_FAIL_OFFSET_Y)
        .shouldCancelWhenOutside(false)
        .onEnd((event) => {
          'worklet';
          runOnJS(handleSectionSwipe)(event.translationX, event.velocityX);
        }),
    [
      canSwipeToNextVisitedSection,
      canSwipeToPreviousSection,
      handleSectionSwipe,
      isInnerPagerTab,
      sectionCount,
    ]
  );
  const activeStudyGesture = sectionSwipeGesture;
  const quickPracticeNativeGesture = useMemo(
    () =>
      Gesture.Native()
        .shouldActivateOnStart(true)
        .disallowInterruption(true),
    []
  );
  const richLinkSheetTranslateY = useSharedValue(0);
  const allComprehensionQuestionsAnswered =
    normalizedQuestions.length > 0 &&
    normalizedQuestions.every((question) => (selectedAnswers[question.id] ?? []).length > 0);
  const hasPerfectComprehensionScore =
    normalizedQuestions.length > 0 &&
    normalizedQuestions.every((question) => Boolean(lockedComprehensionQuestions[question.id]));
  const coverLessonNumber =
    typeof lessonCover?.level === 'number' && typeof lessonCover?.lesson_order === 'number'
      ? `${lessonCover.level}.${lessonCover.lesson_order}`
      : lessonCover?.lesson_order?.toString() ?? '-';
  const checkpointLevelNumber =
    typeof lessonCover?.level === 'number'
      ? lessonCover.level
      : typeof lesson?.level === 'number'
        ? lesson.level
        : typeof coverLesson?.level === 'number'
          ? coverLesson.level
          : null;
  const activeLessonNumber =
    lesson?.lesson_external_id ??
    (typeof lesson?.level === 'number' && typeof lesson?.lesson_order === 'number'
      ? `${lesson.level}.${lesson.lesson_order}`
      : coverLessonNumber);
  const checkpointLessonLabel =
    pageLanguage === 'th'
      ? checkpointLevelNumber !== null
        ? `เช็คพอยต์เลเวล ${checkpointLevelNumber}`
        : 'เช็คพอยต์'
      : checkpointLevelNumber !== null
        ? `Level ${checkpointLevelNumber} Checkpoint`
        : 'Checkpoint';
  const studyLessonLabel = isCheckpointCoverLesson ? checkpointLessonLabel : `${uiCopy.lessonLabel} ${coverLessonNumber}`;
  const sectionMenuLabel = pageCopy.sectionMenuLabel;
  const startLessonLabel = isLessonReady ? uiCopy.startLesson : uiCopy.loadingLessonCta;
  const coverMinHeight = Math.max(windowHeight || 0, 720);
  const backToLibraryLabel = uiCopy.backToLibrary;
  const translateToThaiLabel = pageCopy.translateToThaiLabel;
  const translateToEnglishLabel = pageCopy.translateToEnglishLabel;
  const richContentBlockCount = activeSection
    ? Math.max(
        Array.isArray(activeSection.content_jsonb) ? activeSection.content_jsonb.length : 0,
        Array.isArray(activeSection.content_jsonb_th) ? activeSection.content_jsonb_th.length : 0
      )
    : 0;
  const contentToggleLabel = contentLang === 'th' ? translateToEnglishLabel : translateToThaiLabel;
  const contentToggleText = contentLang === 'th' ? 'EN' : 'ไทย';
  const isTranslatingContent = isLoading && Boolean(lesson);
  const audioTrayTitle = resolvedFocus || englishTitle || thaiTitle || activeSectionTitle || 'Lesson audio';
  const audioTraySubtitle =
    isPrepareTab || activeSectionTitle === 'Prepare' || activeSectionTitle === pageCopy.prepare
      ? null
      : activeSectionTitle || thaiTitle || englishTitle || null;
  const shouldShowConversationIntroOverlay =
    hasStartedLesson &&
    !isLoading &&
    !errorMessage &&
    Boolean(lesson) &&
    (isConversationIntroVisible || isConversationIntroAnimatingOut);
  const conversationIntroTargetSectionIndex = conversationIntroPendingSectionIndex ?? activeSectionIndex;
  const shouldShowAudioTray =
    hasStartedLesson &&
    !isLoading &&
    !errorMessage &&
    Boolean(lesson) &&
    !shouldShowConversationIntroOverlay;
  const audioTrayStatusLabel = isAudioLoading
    ? pageCopy.audioTrayLoading
    : isAudioPlaying
      ? pageCopy.audioTrayPlaying
      : pageCopy.audioTrayStatus;
  const audioTrayAutoCollapseSignal =
    (isInnerPagerTab || isPrepareTab) && activeTab?.id
      ? `${activeTab.id}:${activeSectionIndex}:${isPrepareTab ? 'prepare' : 'pager'}`
      : null;
  const conversationAudioMetadata = useMemo<AudioMetadata>(
    () => ({
      title: audioTrayTitle,
      artist: 'Pailin Abroad',
      albumTitle: audioTraySubtitle || 'Lesson audio',
      artworkUrl: headerImageUrl ?? undefined,
    }),
    [audioTraySubtitle, audioTrayTitle, headerImageUrl]
  );
  const allPracticeExercisesChecked = useMemo(
    () =>
      normalizedPracticeExercises.length === 0 ||
      normalizedPracticeExercises.every((exercise) => checkedPracticeExercises[exercise.id] === true),
    [checkedPracticeExercises, normalizedPracticeExercises]
  );
  const nextSectionButtonLabel =
    sectionCount === 0
      ? pageCopy.backToLessonCover
      : isLastSection
        ? pageCopy.finishLesson
        : pageLanguage === 'th'
            ? 'ส่วนถัดไป →'
            : 'Next section →';
  const isPrimaryActionVisuallyDisabled =
    (!activeTab && sectionCount === 0) ||
    isPrimaryActionDisabled ||
    isSavingLessonCompletion;
  const isPrimaryActionActuallyDisabled =
    (!activeTab && sectionCount === 0) ||
    (isPrimaryActionDisabled && !explainablePrimaryActionHint) ||
    isSavingLessonCompletion;

  useEffect(() => {
    conversationAudioMetadataRef.current = conversationAudioMetadata;

    if (!isConversationLockScreenActiveRef.current) {
      return;
    }

    const voiceSound = voiceSoundRef.current;
    if (!voiceSound?.isLoaded) {
      return;
    }

    voiceSound.updateLockScreenMetadata(conversationAudioMetadata);
  }, [conversationAudioMetadata]);

  const clearConversationLockScreenControls = () => {
    const voiceSound = voiceSoundRef.current;
    if (!voiceSound?.isLoaded || !isConversationLockScreenActiveRef.current) {
      isConversationLockScreenActiveRef.current = false;
      return;
    }

    voiceSound.clearLockScreenControls();
    isConversationLockScreenActiveRef.current = false;
  };

  const dismissNextSectionHint = useCallback(() => {
    if (nextSectionHintTimeoutRef.current) {
      clearTimeout(nextSectionHintTimeoutRef.current);
      nextSectionHintTimeoutRef.current = null;
    }
    setNextSectionHintMessage(null);
  }, []);

  const showNextSectionHint = useCallback((message: string) => {
    if (nextSectionHintTimeoutRef.current) {
      clearTimeout(nextSectionHintTimeoutRef.current);
    }
    setNextSectionHintMessage(message);
    nextSectionHintTimeoutRef.current = setTimeout(() => {
      nextSectionHintTimeoutRef.current = null;
      setNextSectionHintMessage(null);
    }, 2200);
  }, []);

  useEffect(() => {
    dismissNextSectionHint();
  }, [activeSectionIndex, dismissNextSectionHint]);

  useEffect(
    () => () => {
      if (nextSectionHintTimeoutRef.current) {
        clearTimeout(nextSectionHintTimeoutRef.current);
      }
    },
    []
  );

  const activateConversationLockScreenControls = () => {
    const voiceSound = voiceSoundRef.current;
    if (!voiceSound?.isLoaded) {
      return;
    }

    voiceSound.setActiveForLockScreen(true, conversationAudioMetadataRef.current, {
      showSeekForward: true,
      showSeekBackward: true,
    });
    isConversationLockScreenActiveRef.current = true;
  };

  const pauseConversationAudio = () => {
    const voiceSound = voiceSoundRef.current;
    if (!voiceSound?.isLoaded) {
      return;
    }

    voiceSound.pause();
  };

  const seekConversationAudioToMillis = async (nextPositionMillis: number) => {
    const voiceSound = voiceSoundRef.current;
    if (!voiceSound?.isLoaded) {
      return;
    }

    await voiceSound.seekTo(millisToSeconds(nextPositionMillis));
    setHasAudioFinished(false);
  };

  const playConversationAudio = async () => {
    const voiceSound = voiceSoundRef.current;
    if (!voiceSound?.isLoaded || isAudioLoading) {
      return;
    }

    unloadSnippetPlayer();

    const durationMillis = secondsToMillis(voiceSound.duration);
    const positionMillis = secondsToMillis(voiceSound.currentTime);
    const shouldRestart = hasAudioFinished || (durationMillis > 0 && positionMillis >= durationMillis - 250);
    const startPositionMillis = shouldRestart ? 0 : positionMillis;

    if (shouldRestart) {
      await seekConversationAudioToMillis(0);
    }

    activateConversationLockScreenControls();
    if (!shouldRestart && startPositionMillis > 0) {
      await voiceSound.seekTo(millisToSeconds(startPositionMillis));
    }
    voiceSound.play();
  };

  useFocusEffect(
    useCallback(() => {
      return () => {
        pauseConversationAudio();
        void seekConversationAudioToMillis(0).catch(() => undefined);
        clearConversationLockScreenControls();
      };
    }, [])
  );

  const snippetPreloadTargets = useMemo(() => {
    if (!Object.keys(snippetIndex.byKey).length && !Object.keys(snippetIndex.bySection).length) {
      if (!isPhrasesTab || !Object.keys(phraseSnippetIndex.byKey).length) {
        return [];
      }
    }

    if (!hasStartedLesson) {
      return collectSnippetsForNodes(preparePreloadNodes, snippetIndex);
    }

    if (isRichPagerTab) {
      const targetNodes: LessonRichNode[] = [];
      const groupIndexes = [activeUnderstandGroupIndex, activeUnderstandGroupIndex + 1];

      groupIndexes.forEach((groupIndex) => {
        const group = activePagerGroups[groupIndex];
        if (!group) {
          return;
        }
        targetNodes.push(...group.body);
      });

      return collectSnippetsForNodes(targetNodes, snippetIndex);
    }

    if (isCultureNoteTab) {
      return collectSnippetsForNodes(cultureNoteNodes, snippetIndex);
    }

    if (isPrepareTab) {
      return collectSnippetsForNodes(prepareNodes, snippetIndex);
    }

    if (isPhrasesTab) {
      const snippets: LessonAudioSnippet[] = [];
      const seenKeys = new Set<string>();
      normalizedLessonPhrases.forEach((phraseCard) => {
        if (!phraseCard) {
          return;
        }
        collectSnippetsForNodes(
          phraseCard.nodes,
          snippetIndex,
          phraseSnippetIndex,
          phraseCard.id,
          phraseCard.variant
        ).forEach((snippet) => {
          const audioKey = snippet.audio_key?.trim();
          if (!audioKey || seenKeys.has(audioKey)) {
            return;
          }
          seenKeys.add(audioKey);
          snippets.push(snippet);
        });
      });

      return snippets;
    }

    return [];
  }, [
    activePagerGroups,
    activeUnderstandGroupIndex,
    cultureNoteNodes,
    isCultureNoteTab,
    isPrepareTab,
    isPhrasesTab,
    isRichPagerTab,
    normalizedLessonPhrases,
    prepareNodes,
    preparePreloadNodes,
    phraseSnippetIndex,
    snippetIndex,
    hasStartedLesson,
  ]);

  useEffect(() => {
    setApplyText('');
    setShowApplyResponse(false);
  }, [activeTab?.id, contentLang, lessonId]);

  useEffect(() => {
    const validSelectionKeys = new Set<string>();
    const validBlankAnswerKeys = new Set<string>();
    const validExerciseIds = new Set<string>();

    allAnswerStatePracticeExercises.forEach((exercise) => {
      validExerciseIds.add(exercise.id);
      exercise.items.forEach((item) => {
        validSelectionKeys.add(`${exercise.id}:${item.key}`);
        item.blanks.forEach((blank) => {
          validBlankAnswerKeys.add(`${exercise.id}:${item.key}:${blank.id}`);
        });
      });
    });

    setPracticeSelections((previous) => {
      const nextEntries = Object.entries(previous).filter(([key]) => validSelectionKeys.has(key));
      return nextEntries.length === Object.keys(previous).length ? previous : Object.fromEntries(nextEntries);
    });
    setPracticeOpenAnswers((previous) => {
      const nextEntries = Object.entries(previous).filter(([key]) => validSelectionKeys.has(key));
      return nextEntries.length === Object.keys(previous).length ? previous : Object.fromEntries(nextEntries);
    });
    setPracticeBlankAnswers((previous) => {
      const nextEntries = Object.entries(previous).filter(([key]) => validBlankAnswerKeys.has(key));
      return nextEntries.length === Object.keys(previous).length ? previous : Object.fromEntries(nextEntries);
    });
    setPracticeEvaluations((previous) => {
      const nextEntries = Object.entries(previous).filter(([key]) => validSelectionKeys.has(key));
      return nextEntries.length === Object.keys(previous).length ? previous : Object.fromEntries(nextEntries);
    });
    setCheckedPracticeExercises((previous) => {
      const nextEntries = Object.entries(previous).filter(([key]) => validExerciseIds.has(key));
      return nextEntries.length === Object.keys(previous).length ? previous : Object.fromEntries(nextEntries);
    });
    setPracticeErrorByExercise((previous) => {
      const nextEntries = Object.entries(previous).filter(([key]) => validExerciseIds.has(key));
      return nextEntries.length === Object.keys(previous).length ? previous : Object.fromEntries(nextEntries);
    });
    setPracticeMarkedCorrect((previous) => {
      const nextEntries = Object.entries(previous).filter(([key]) => validSelectionKeys.has(key));
      return nextEntries.length === Object.keys(previous).length ? previous : Object.fromEntries(nextEntries);
    });
  }, [allAnswerStatePracticeExercises]);

  useEffect(() => {
    setActiveUnderstandGroupIndex(0);
    setActivePracticeCardIndex(0);
  }, [activeTab?.id]);

  useEffect(() => {
    setActiveUnderstandGroupIndex((previous) => {
      const maxIndex = Math.max(understandGroups.length - 1, 0);
      return Math.min(previous, maxIndex);
    });
  }, [understandGroups.length]);

  useEffect(() => {
    setActivePracticeCardIndex((previous) => {
      const maxIndex = Math.max(normalizedPracticeExercises.length - 1, 0);
      return Math.min(previous, maxIndex);
    });
  }, [normalizedPracticeExercises.length]);

  useEffect(() => {
    if (!hasStartedLesson) {
      return;
    }

    const resume = pendingAppResumeRef.current;
    if (!resume) {
      return;
    }

    void applyPendingResumeSection();
  }, [
    activeSectionIndex,
    appLessonProgressDetail?.resume?.unit_key,
    applyPendingResumeSection,
    hasStartedLesson,
    lessonTabs.length,
  ]);

  useEffect(() => {
    if (!hasStartedLesson) {
      return;
    }

    const resume = pendingAppResumeRef.current;
    if (!resume) {
      return;
    }

    if (resume.unit_type !== 'card') {
      pendingAppResumeRef.current = null;
      return;
    }

    const parsedCard = parseAppCardKey(resume.unit_key);
    if (!parsedCard?.sectionType || parsedCard.sectionType !== activeTab?.type) {
      return;
    }

    if (!isRichPagerTab) {
      pendingAppResumeRef.current = null;
      return;
    }

    const combinedCardUnits = activeExpectedCardUnits.length ? activeExpectedCardUnits : localCardUnitsForActiveSection;
    const cardIndex = combinedCardUnits.findIndex((unit) => unit.unit_key === resume.unit_key);
    if (cardIndex < 0) {
      pendingAppResumeRef.current = null;
      return;
    }

    setActiveUnderstandGroupIndex(cardIndex);
    pendingAppResumeRef.current = null;
  }, [
    activeExpectedCardUnits,
    activeTab?.type,
    hasStartedLesson,
    isRichPagerTab,
    localCardUnitsForActiveSection,
  ]);

  useEffect(() => {
    const validPhraseIds = new Set(normalizedLessonPhrases.map((phrase) => phrase.id));

    setExpandedPhraseIds((previous) => {
      const nextEntries = Object.entries(previous).filter(([phraseId, isExpanded]) => isExpanded && validPhraseIds.has(phraseId));

      if (nextEntries.length === Object.keys(previous).length) {
        return previous;
      }

      return Object.fromEntries(nextEntries);
    });
  }, [normalizedLessonPhrases]);

  useEffect(() => {
    if (!isInnerPagerTab) {
      return;
    }

    contentScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [activePracticeCardIndex, activeTab?.id, activeUnderstandGroupIndex, contentLang, isInnerPagerTab]);

  useEffect(() => {
    if (!hasStartedLesson || isLockedLesson || !activePageKey) {
      return;
    }

    void writeProgressUnit('page', activePageKey, null);
  }, [activePageKey, hasStartedLesson, isLockedLesson, writeProgressUnit]);

  useEffect(() => {
    if (!hasStartedLesson || isLockedLesson || !currentCardUnitKey || !activePageKey) {
      return;
    }

    void writeProgressUnit('card', currentCardUnitKey, activePageKey);
  }, [activePageKey, currentCardUnitKey, hasStartedLesson, isLockedLesson, writeProgressUnit]);

  useEffect(() => {
    richPagerTranslateX.value = 0;
  }, [activeInnerCardIndex, richPagerTranslateX]);

  const closeCompletionModal = useCallback(() => {
    setCompletionModalState(null);
  }, []);

  const trackLessonPersistence = useCallback(<T,>(promise: Promise<T>) => {
    const trackedPromise = promise.finally(() => {
      pendingLessonPersistenceRef.current.delete(trackedPromise);
    });
    pendingLessonPersistenceRef.current.add(trackedPromise);
    return trackedPromise;
  }, []);

  const flushPendingLessonPersistence = useCallback(async () => {
    const pendingPromises = Array.from(pendingLessonPersistenceRef.current);
    if (!pendingPromises.length) {
      return;
    }

    console.info('[lesson-persistence] waiting for pending writes', {
      count: pendingPromises.length,
      lessonId,
    });
    await Promise.allSettled(pendingPromises);
  }, [lessonId]);

  const navigateToLessonLibrary = useCallback(async () => {
    const stage = lessonCover?.stage;
    const level = typeof lessonCover?.level === 'number' ? lessonCover.level : null;
    const targetRoute = libraryRouteParam ?? (hasMembership ? 'library' : 'free-library');
    if (
      (stage === 'Beginner' || stage === 'Intermediate' || stage === 'Advanced' || stage === 'Expert') &&
      level !== null
    ) {
      setLessonLibrarySelection({
        stage,
        level,
        lessonId: lessonCover?.id ?? lessonId,
        route: targetRoute,
      });
    }
    bumpLessonLibraryProgressRefreshToken();
    router.push(targetRoute === 'free-library' ? '/(tabs)/lessons/free-library' : '/(tabs)/lessons/library');
    void flushPendingLessonPersistence();
  }, [flushPendingLessonPersistence, hasMembership, lessonCover?.id, lessonCover?.level, lessonCover?.stage, lessonId, libraryRouteParam, router]);

  const navigateToPrimaryTab = useCallback(async () => {
    await flushPendingLessonPersistence();
    router.push('/(tabs)');
  }, [flushPendingLessonPersistence, router]);

  const navigateToResourcesTab = useCallback(async () => {
    await flushPendingLessonPersistence();
    router.push('/(tabs)/resources');
  }, [flushPendingLessonPersistence, router]);

  const navigateToAccountTab = useCallback(async () => {
    await flushPendingLessonPersistence();
    router.push('/(tabs)/account');
  }, [flushPendingLessonPersistence, router]);

  const overlayTabItems = useMemo(
    () => [
      {
        key: 'primary',
        label: hasAccount ? tabBarText.pathway : tabBarText.home,
        icon: hasAccount ? ('flag.fill' as const) : ('house.fill' as const),
        isActive: false,
        onPress: navigateToPrimaryTab,
      },
      {
        key: 'lessons',
        label: tabBarText.lessons,
        icon: 'book.fill' as const,
        isActive: false,
        onPress: navigateToLessonLibrary,
      },
      {
        key: 'resources',
        label: tabBarText.resources,
        icon: 'square.grid.2x2.fill' as const,
        isActive: false,
        onPress: navigateToResourcesTab,
      },
      {
        key: 'account',
        label: tabBarText.more,
        icon: 'ellipsis.circle.fill' as const,
        isActive: false,
        onPress: navigateToAccountTab,
      },
    ],
    [hasAccount, navigateToAccountTab, navigateToLessonLibrary, navigateToPrimaryTab, navigateToResourcesTab, tabBarText]
  );

  const navigateToNextLesson = useCallback(async () => {
    await flushPendingLessonPersistence();
    bumpLessonLibraryProgressRefreshToken();

    if (!lessonCover?.id) {
      Alert.alert(pageCopy.finishLesson, pageCopy.completionNoNextLesson);
      return;
    }

    try {
      const lessons = await getLessonsIndex();
      const orderedLessons = [...lessons].sort((a, b) => {
        const stageIndexA = LESSON_STAGE_ORDER.indexOf((a.stage ?? '') as (typeof LESSON_STAGE_ORDER)[number]);
        const stageIndexB = LESSON_STAGE_ORDER.indexOf((b.stage ?? '') as (typeof LESSON_STAGE_ORDER)[number]);
        const normalizedStageIndexA = stageIndexA >= 0 ? stageIndexA : Number.MAX_SAFE_INTEGER;
        const normalizedStageIndexB = stageIndexB >= 0 ? stageIndexB : Number.MAX_SAFE_INTEGER;

        if (normalizedStageIndexA !== normalizedStageIndexB) {
          return normalizedStageIndexA - normalizedStageIndexB;
        }

        const levelDelta = (a.level ?? Number.MAX_SAFE_INTEGER) - (b.level ?? Number.MAX_SAFE_INTEGER);
        if (levelDelta !== 0) {
          return levelDelta;
        }

        const lessonOrderDelta =
          (a.lesson_order ?? Number.MAX_SAFE_INTEGER) - (b.lesson_order ?? Number.MAX_SAFE_INTEGER);
        if (lessonOrderDelta !== 0) {
          return lessonOrderDelta;
        }

        return String(a.id ?? '').localeCompare(String(b.id ?? ''));
      });

      const lessonIndex = orderedLessons.findIndex((item) => item.id === lessonCover.id);
      const nextLessonId = lessonIndex >= 0 ? orderedLessons[lessonIndex + 1]?.id ?? null : null;

      if (!nextLessonId) {
        Alert.alert(pageCopy.finishLesson, pageCopy.completionNoNextLesson);
        return;
      }

      prefetchResolvedLesson(nextLessonId, contentLang === 'th' ? 'th' : 'en');
      router.push({
        pathname: '/lessons/[id]',
        params: {
          id: nextLessonId,
          ...(libraryRouteParam ? { libraryRoute: libraryRouteParam } : {}),
        },
      });
    } catch {
      Alert.alert(pageCopy.finishLesson, pageCopy.completionNoNextLesson);
    }
  }, [
    contentLang,
    flushPendingLessonPersistence,
    libraryRouteParam,
    lessonCover?.id,
    pageCopy.completionNoNextLesson,
    pageCopy.finishLesson,
    router,
  ]);

  const markLessonAnswerStateInteracted = useCallback(() => {
    hasInteractedWithLessonAnswerStateRef.current = true;
  }, []);

  const saveAnswerStateForUnit = useCallback(
    async (unitKey: string, answerPayload: Record<string, unknown>) => {
      if (!lessonId || !user?.id || !unitKey) {
        return;
      }

      try {
        await trackLessonPersistence(
          saveLessonAnswerState({
            lessonId,
            unitKey,
            answerPayload,
          })
        );
        console.info('[answer-state] save ok', {
          lessonId,
          unitKey,
        });
        setSavedAnswerStateByUnit((prev) => ({
          ...prev,
          [unitKey]: answerPayload,
        }));
      } catch (error) {
        console.warn('[answer-state] save failed', {
          lessonId,
          unitKey,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return;
      }
    },
    [lessonId, trackLessonPersistence, user?.id]
  );

  const clearAnswerStateForUnit = useCallback(
    async (unitKey: string) => {
      if (!lessonId || !user?.id || !unitKey) {
        return;
      }

      try {
        await trackLessonPersistence(
          clearLessonAnswerState({
            lessonId,
            unitKey,
          })
        );
        console.info('[answer-state] clear ok', {
          lessonId,
          unitKey,
        });
        setSavedAnswerStateByUnit((prev) => {
          const next = { ...prev };
          delete next[unitKey];
          return next;
        });
      } catch (error) {
        console.warn('[answer-state] clear failed', {
          lessonId,
          unitKey,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return;
      }
    },
    [lessonId, trackLessonPersistence, user?.id]
  );

  const completeLesson = useCallback(async () => {
    if (isLessonCompleted) {
      setLessonCompletionError(null);
      setCompletionModalState('success');
      return;
    }

    if (!lessonCover?.id) {
      return;
    }

    setIsSavingLessonCompletion(true);
    setLessonCompletionError(null);

    try {
      await flushPendingLessonPersistence();
      await upsertLessonCompletion({ lessonId: lessonCover.id, completed: true });
      bumpLessonLibraryProgressRefreshToken();
      setIsLessonCompleted(true);
      setCompletionModalState('success');
    } catch (error) {
      setLessonCompletionError(error instanceof Error ? error.message : pageCopy.completionSavedError);
    } finally {
      setIsSavingLessonCompletion(false);
    }
  }, [flushPendingLessonPersistence, isLessonCompleted, lessonCover?.id, pageCopy.completionSavedError]);

  const handleFinishLessonPress = useCallback(async () => {
    await flushPendingLessonPersistence();

    if (isLessonCompleted) {
      setLessonCompletionError(null);
      setCompletionModalState('success');
      return;
    }

    if (allPracticeExercisesChecked) {
      await completeLesson();
      return;
    }

    setCompletionModalState('skip_warning');
  }, [
    allPracticeExercisesChecked,
    completeLesson,
    flushPendingLessonPersistence,
    isLessonCompleted,
  ]);

  const handleContentTogglePress = useCallback(() => {
    setContentLang((previous) => (previous === 'en' ? 'th' : 'en'));
  }, []);

  const handleToggleAnswer = (questionId: string, optionLabel: string, isMulti: boolean) => {
    if (allComprehensionQuestionsAnswered && lockedComprehensionQuestions[questionId]) {
      return;
    }

    markLessonAnswerStateInteracted();
    setSelectedAnswers((previous) => {
      const priorSelections = previous[questionId] ?? [];
      const nextSelections = isMulti
        ? priorSelections.includes(optionLabel)
          ? priorSelections.filter((item) => item !== optionLabel)
          : [...priorSelections, optionLabel]
        : [optionLabel];
      return {
        ...previous,
        [questionId]: nextSelections,
      };
    });
    setHasSubmittedComprehensionAnswers(false);
    setComprehensionError('');
  };

  const handleSubmitComprehensionAnswers = useCallback(async () => {
    setComprehensionError('');
    await saveAnswerStateForUnit(buildComprehensionAnswerStateUnitKey(), {
      selected: selectedAnswers,
    });
    if (allComprehensionQuestionsAnswered) {
      setLockedComprehensionQuestions((previous) => {
        const next = { ...previous };
        normalizedQuestions.forEach((question) => {
          const currentSelection = selectedAnswers[question.id] ?? [];
          if (currentSelection.length === 0) {
            return;
          }
          next[question.id] = areChoiceSetsEqual(currentSelection, question.answerKey);
        });
        return next;
      });
    }
    setHasSubmittedComprehensionAnswers(true);
    if (lessonId) {
      void writeProgressUnit('exercise', buildAppComprehensionExerciseKey(), buildAppPageKey('comprehension'));
    }
  }, [
    allComprehensionQuestionsAnswered,
    lessonId,
    normalizedQuestions,
    saveAnswerStateForUnit,
    selectedAnswers,
    writeProgressUnit,
  ]);

  const handleResetComprehensionReview = useCallback(() => {
    markLessonAnswerStateInteracted();
    if (hasPerfectComprehensionScore) {
      setSelectedAnswers({});
      setLockedComprehensionQuestions({});
      setHasSubmittedComprehensionAnswers(false);
      setComprehensionError('');
      void clearAnswerStateForUnit(buildComprehensionAnswerStateUnitKey());
      return;
    }

    const nextSelectedAnswers = Object.fromEntries(
      Object.entries(selectedAnswers).filter(([questionId]) => lockedComprehensionQuestions[questionId])
    );
    setSelectedAnswers(nextSelectedAnswers);
    setHasSubmittedComprehensionAnswers(false);
    setComprehensionError('');
    if (Object.keys(nextSelectedAnswers).length) {
      void saveAnswerStateForUnit(buildComprehensionAnswerStateUnitKey(), {
        selected: nextSelectedAnswers,
      });
      return;
    }
    void clearAnswerStateForUnit(buildComprehensionAnswerStateUnitKey());
  }, [
    clearAnswerStateForUnit,
    hasPerfectComprehensionScore,
    lockedComprehensionQuestions,
    markLessonAnswerStateInteracted,
    saveAnswerStateForUnit,
    selectedAnswers,
  ]);

  const handlePracticeChoice = (exerciseId: string, itemKey: string, optionLabel: string, isMulti: boolean) => {
    if (lockedPracticeMultipleChoiceItems[`${exerciseId}:${itemKey}`]) {
      return;
    }

    markLessonAnswerStateInteracted();
    const selectionKey = `${exerciseId}:${itemKey}`;
    const normalizedLabel = normalizeOptionLetter(optionLabel);

    setPracticeSelections((previous) => {
      const current = previous[selectionKey] ?? [];
      const next = isMulti
        ? current.includes(normalizedLabel)
          ? current.filter((entry) => entry !== normalizedLabel)
          : [...current, normalizedLabel]
        : [normalizedLabel];
      return {
        ...previous,
        [selectionKey]: next,
      };
    });
    setCheckedPracticeExercises((previous) => ({ ...previous, [exerciseId]: false }));
    setPracticeErrorByExercise((previous) => ({ ...previous, [exerciseId]: '' }));
  };

  const normalizePracticeAnswerText = (value: string) => value.replace(/\s+/g, ' ').trim();

  const getPracticeItemStateKey = (exerciseId: string, itemKey: string) => `${exerciseId}:${itemKey}`;
  const getPracticeOpenAnswerKey = (exerciseId: string, itemKey: string, inputIndex = 0) =>
    inputIndex === 0 ? getPracticeItemStateKey(exerciseId, itemKey) : `${getPracticeItemStateKey(exerciseId, itemKey)}:${inputIndex}`;
  const isPracticePromptOnlyImageItem = (
    exercise: NormalizedPracticeExercise,
    item: NormalizedPracticeItem
  ) => {
    if (exercise.kind !== 'open') {
      return false;
    }

    const isKnownLesson112ImageOnlyPrompt =
      lesson?.lesson_external_id === '1.12' &&
      item.imageKey === '1.12_practice2';

    const hasVisiblePromptText = Boolean(
      item.prompt ||
        item.promptTh ||
        item.text ||
        item.textTh ||
        item.textJsonb.length ||
        item.textJsonbTh.length ||
        item.audioKey
    );

    const isImageOnlyPromptFallback =
      lesson?.lesson_external_id === '1.12' &&
      Boolean(item.imageKey) &&
      !hasVisiblePromptText;

    return isKnownLesson112ImageOnlyPrompt || isImageOnlyPromptFallback;
  };

  const getPracticeOpenInputCount = (exercise: NormalizedPracticeExercise, item: NormalizedPracticeItem) => {
    const exerciseTitle = `${exercise.title} ${exercise.titleEn} ${exercise.titleTh}`.toLowerCase();
    const shouldForceSingleInput =
      exercise.kind === 'open' && lesson?.lesson_external_id === '1.13' && exerciseTitle.includes('open');

    return shouldForceSingleInput ? 1 : item.inputCount;
  };

  const getPracticeOpenAnswer = (exercise: NormalizedPracticeExercise, item: NormalizedPracticeItem) => {
    const inputCount = getPracticeOpenInputCount(exercise, item);
    const values = Array.from({ length: inputCount }, (_, index) =>
      practiceOpenAnswers[getPracticeOpenAnswerKey(exercise.id, item.key, index)] ?? ''
    );
    return inputCount > 1 ? values.join('\n') : values[0] ?? '';
  };

  const getSingleFillBlankAnswer = (exerciseId: string, item: NormalizedPracticeItem) => {
    if (!item.blanks.length) {
      return practiceOpenAnswers[getPracticeItemStateKey(exerciseId, item.key)] ?? '';
    }

    const values = item.blanks.map((blank) => normalizePracticeAnswerText(practiceBlankAnswers[getPracticeBlankKey(exerciseId, item.key, blank.id)] ?? ''));
    return item.blanks.length === 1 ? (values[0] ?? '') : values.join('; ');
  };

  const getSentenceTransformAnswer = (exerciseId: string, item: NormalizedPracticeItem) => {
    const itemKey = getPracticeItemStateKey(exerciseId, item.key);
    const markedCorrect = practiceMarkedCorrect[itemKey];
    if (markedCorrect === true) {
      return item.text || item.prompt || '';
    }
    return practiceOpenAnswers[itemKey] ?? '';
  };

  const isPracticeItemUnanswered = (exercise: NormalizedPracticeExercise, item: NormalizedPracticeItem) => {
    if (item.isExample || isPracticePromptOnlyImageItem(exercise, item)) {
      return false;
    }

    if (exercise.kind === 'fill_blank') {
      if (!item.blanks.length) {
        return !normalizePracticeAnswerText(practiceOpenAnswers[getPracticeItemStateKey(exercise.id, item.key)] ?? '');
      }

      return item.blanks.some(
        (blank) => !normalizePracticeAnswerText(practiceBlankAnswers[getPracticeBlankKey(exercise.id, item.key, blank.id)] ?? '')
      );
    }

    if (exercise.kind === 'sentence_transform') {
      if (item.correctTag === 'yes') {
        return false;
      }

      const itemStateKey = getPracticeItemStateKey(exercise.id, item.key);
      if (practiceMarkedCorrect[itemStateKey] === true) {
        return false;
      }

      return !normalizePracticeAnswerText(practiceOpenAnswers[itemStateKey] ?? '');
    }

    return Array.from({ length: getPracticeOpenInputCount(exercise, item) }, (_, index) =>
      practiceOpenAnswers[getPracticeOpenAnswerKey(exercise.id, item.key, index)] ?? ''
    ).some((value) => !normalizePracticeAnswerText(value));
  };

  const getSavedPracticeEvaluation = (exerciseId: string, itemKey: string) => {
    return practiceEvaluations[getPracticeItemStateKey(exerciseId, itemKey)] ?? null;
  };

  const buildMultipleChoiceAnswerStatePayload = (exercise: NormalizedPracticeExercise) => ({
    choices: exercise.items.map((item) => practiceSelections[`${exercise.id}:${item.key}`] ?? []),
  });

  useEffect(() => {
    if (hasHydratedLessonAnswerStateRef.current || hasInteractedWithLessonAnswerStateRef.current) {
      return;
    }

    if (!hasStartedLesson) {
      return;
    }

    if (!lesson) {
      return;
    }

    if (!Object.keys(savedAnswerStateByUnit).length) {
      return;
    }

    console.info('[answer-state] hydrate applying', {
      lessonId,
      unitKeys: Object.keys(savedAnswerStateByUnit),
    });

    const comprehensionState = savedAnswerStateByUnit[buildComprehensionAnswerStateUnitKey()];
    if (comprehensionState && typeof comprehensionState === 'object') {
      const nextSelected =
        comprehensionState.selected && typeof comprehensionState.selected === 'object'
          ? (comprehensionState.selected as Record<string, string[]>)
          : {};
      setSelectedAnswers(nextSelected);
      setHasSubmittedComprehensionAnswers(Object.keys(nextSelected).length > 0);
      const answeredEveryComprehensionQuestion =
        normalizedQuestions.length > 0 &&
        normalizedQuestions.every((question) => (nextSelected[question.id] ?? []).length > 0);
      if (answeredEveryComprehensionQuestion) {
        const nextLockedComprehensionQuestions: Record<string, boolean> = {};
        normalizedQuestions.forEach((question) => {
          nextLockedComprehensionQuestions[question.id] = areChoiceSetsEqual(
            nextSelected[question.id] ?? [],
            question.answerKey
          );
        });
        if (Object.keys(nextLockedComprehensionQuestions).length) {
          setLockedComprehensionQuestions(nextLockedComprehensionQuestions);
        }
      }
    }

    const nextPracticeSelections: Record<string, string[]> = {};
    const nextCheckedPracticeExercises: Record<string, boolean> = {};
    const nextLockedPracticeMultipleChoiceItems: Record<string, boolean> = {};
    const nextPracticeOpenAnswers: Record<string, string> = {};
    const nextPracticeBlankAnswers: Record<string, string> = {};
    const nextPracticeEvaluations: Record<string, PracticeEvaluationState> = {};
    const nextPracticeMarkedCorrect: Record<string, boolean | null> = {};

    allAnswerStatePracticeExercises.forEach((exercise) => {
      const savedState = savedAnswerStateByUnit[buildExerciseAnswerStateUnitKey(exercise.id)];
      if (!savedState || typeof savedState !== 'object') {
        return;
      }

      if (exercise.kind === 'multiple_choice') {
        const rawChoices = Array.isArray(savedState.choices) ? savedState.choices : [];
        exercise.items.forEach((item, itemIndex) => {
          const choice = rawChoices[itemIndex];
          const normalizedChoice = Array.isArray(choice)
            ? choice.map((entry) => normalizeOptionLetter(String(entry)))
            : [];
          const selectionKey = `${exercise.id}:${item.key}`;
          nextPracticeSelections[selectionKey] = normalizedChoice;
          nextLockedPracticeMultipleChoiceItems[selectionKey] = areChoiceSetsEqual(normalizedChoice, item.answerLetters);
        });
        nextCheckedPracticeExercises[exercise.id] = true;
        return;
      }

      const savedQuestions = Array.isArray(savedState.questions) ? savedState.questions : [];
      let hasCheckedState = false;

      exercise.items.forEach((item, itemIndex) => {
        const savedQuestion =
          savedQuestions[itemIndex] && typeof savedQuestions[itemIndex] === 'object'
            ? (savedQuestions[itemIndex] as Record<string, unknown>)
            : null;
        if (!savedQuestion) {
          return;
        }

        const itemStateKey = getPracticeItemStateKey(exercise.id, item.key);
        const correct = typeof savedQuestion.correct === 'boolean' ? savedQuestion.correct : null;
        const score = typeof savedQuestion.score === 'number' ? savedQuestion.score : null;
        if (correct !== null) {
          hasCheckedState = true;
        }

        nextPracticeEvaluations[itemStateKey] = {
          loading: false,
          correct,
          score,
          feedbackEn: '',
          feedbackTh: '',
          error: '',
        };

        if (exercise.kind === 'fill_blank') {
          const answersByBlank =
            savedQuestion.answersByBlank && typeof savedQuestion.answersByBlank === 'object'
              ? (savedQuestion.answersByBlank as Record<string, string>)
              : {};
          Object.entries(answersByBlank).forEach(([blankId, value]) => {
            nextPracticeBlankAnswers[getPracticeBlankKey(exercise.id, item.key, blankId)] = String(value ?? '');
          });
          if (!item.blanks.length && typeof savedQuestion.answer === 'string') {
            nextPracticeOpenAnswers[itemStateKey] = savedQuestion.answer;
          }
          return;
        }

        if (exercise.kind === 'sentence_transform') {
          nextPracticeOpenAnswers[itemStateKey] =
            typeof savedQuestion.answer === 'string' ? savedQuestion.answer : '';
          nextPracticeMarkedCorrect[itemStateKey] =
            typeof savedQuestion.markedAsCorrect === 'boolean' ? savedQuestion.markedAsCorrect : null;
          return;
        }

        const answerParts = Array.isArray(savedQuestion.answerParts)
          ? savedQuestion.answerParts
          : typeof savedQuestion.answer === 'string'
            ? [savedQuestion.answer]
            : [];
        answerParts.forEach((part, inputIndex) => {
          nextPracticeOpenAnswers[getPracticeOpenAnswerKey(exercise.id, item.key, inputIndex)] = String(part ?? '');
        });
      });

      if (hasCheckedState) {
        nextCheckedPracticeExercises[exercise.id] = true;
      }
    });

    if (Object.keys(nextPracticeSelections).length) {
      setPracticeSelections(nextPracticeSelections);
    }
    if (Object.keys(nextCheckedPracticeExercises).length) {
      setCheckedPracticeExercises(nextCheckedPracticeExercises);
    }
    if (Object.keys(nextLockedPracticeMultipleChoiceItems).length) {
      setLockedPracticeMultipleChoiceItems(nextLockedPracticeMultipleChoiceItems);
    }
    if (Object.keys(nextPracticeOpenAnswers).length) {
      setPracticeOpenAnswers(nextPracticeOpenAnswers);
    }
    if (Object.keys(nextPracticeBlankAnswers).length) {
      setPracticeBlankAnswers(nextPracticeBlankAnswers);
    }
    if (Object.keys(nextPracticeEvaluations).length) {
      setPracticeEvaluations(nextPracticeEvaluations);
    }
    if (Object.keys(nextPracticeMarkedCorrect).length) {
      setPracticeMarkedCorrect(nextPracticeMarkedCorrect);
    }

    hasHydratedLessonAnswerStateRef.current = true;
    console.info('[answer-state] hydrate applied', {
      lessonId,
      restoredPracticeExercises: Object.keys(nextCheckedPracticeExercises),
      restoredComprehension: Boolean(comprehensionState),
    });
  }, [
    getPracticeBlankKey,
    getPracticeItemStateKey,
    getPracticeOpenAnswerKey,
    allAnswerStatePracticeExercises,
    hasStartedLesson,
    lesson,
    lessonId,
    normalizedQuestions,
    savedAnswerStateByUnit,
  ]);

  const handlePracticeBlankAnswerChange = (exerciseId: string, itemKey: string, blankId: string, value: string) => {
    markLessonAnswerStateInteracted();
    const answerKey = getPracticeBlankKey(exerciseId, itemKey, blankId);

    setPracticeBlankAnswers((previous) => ({ ...previous, [answerKey]: value }));
    setCheckedPracticeExercises((previous) => ({ ...previous, [exerciseId]: false }));
    setPracticeEvaluations((previous) => {
      const itemStateKey = getPracticeItemStateKey(exerciseId, itemKey);
      if (!(itemStateKey in previous)) {
        return previous;
      }
      const next = { ...previous };
      delete next[itemStateKey];
      return next;
    });
    setPracticeErrorByExercise((previous) => ({ ...previous, [exerciseId]: '' }));
  };

  const handleCheckMultipleChoiceExercise = async (exercise: NormalizedPracticeExercise) => {
    const hasUnanswered = exercise.items.some((item) => (practiceSelections[`${exercise.id}:${item.key}`] ?? []).length === 0);

    if (hasUnanswered) {
      setPracticeErrorByExercise((previous) => ({ ...previous, [exercise.id]: pageCopy.practiceAnswerAll }));
      return;
    }

    setPracticeErrorByExercise((previous) => ({ ...previous, [exercise.id]: '' }));
    setCheckingPracticeExercises((previous) => ({ ...previous, [exercise.id]: true }));
    try {
      await saveAnswerStateForUnit(
        buildExerciseAnswerStateUnitKey(exercise.id),
        buildMultipleChoiceAnswerStatePayload(exercise)
      );
      setLockedPracticeMultipleChoiceItems((previous) => {
        const next = { ...previous };
        exercise.items.forEach((item) => {
          const selectionKey = `${exercise.id}:${item.key}`;
          next[selectionKey] = areChoiceSetsEqual(practiceSelections[selectionKey] ?? [], item.answerLetters);
        });
        return next;
      });
      const nextCheckedExercises = { ...checkedPracticeExercises, [exercise.id]: true };
      setCheckedPracticeExercises(nextCheckedExercises);
      void writeProgressUnit('exercise', buildAppExerciseKey(exercise.id), getCurrentProgressParentKey());
    } finally {
      setCheckingPracticeExercises((previous) => ({ ...previous, [exercise.id]: false }));
    }
  };

  const handleResetMultipleChoiceExercise = (exercise: NormalizedPracticeExercise) => {
    markLessonAnswerStateInteracted();
    const pendingItems = exercise.items.filter((item) => !item.isExample);
    const isPerfectScore =
      pendingItems.length > 0 &&
      pendingItems.every((item) => lockedPracticeMultipleChoiceItems[`${exercise.id}:${item.key}`] === true);

    const nextSelections = { ...practiceSelections };
    exercise.items.forEach((item) => {
      const selectionKey = `${exercise.id}:${item.key}`;
      if (!isPerfectScore && lockedPracticeMultipleChoiceItems[selectionKey]) {
        return;
      }
      delete nextSelections[selectionKey];
    });

    if (isPerfectScore) {
      setLockedPracticeMultipleChoiceItems((previous) => {
        const next = { ...previous };
        exercise.items.forEach((item) => {
          delete next[`${exercise.id}:${item.key}`];
        });
        return next;
      });
    }

    setPracticeSelections(nextSelections);
    setCheckedPracticeExercises((previous) => ({ ...previous, [exercise.id]: false }));
    setCheckingPracticeExercises((previous) => ({ ...previous, [exercise.id]: false }));
    setPracticeErrorByExercise((previous) => ({ ...previous, [exercise.id]: '' }));

    if (isPerfectScore) {
      void clearAnswerStateForUnit(buildExerciseAnswerStateUnitKey(exercise.id));
      return;
    }

    const retainedChoices = exercise.items.map((item) => nextSelections[`${exercise.id}:${item.key}`] ?? []);
    const hasRetainedChoices = retainedChoices.some((choice) => choice.length > 0);
    if (hasRetainedChoices) {
      void saveAnswerStateForUnit(buildExerciseAnswerStateUnitKey(exercise.id), {
        choices: retainedChoices,
      });
      return;
    }
    void clearAnswerStateForUnit(buildExerciseAnswerStateUnitKey(exercise.id));
  };

  const handlePracticeOpenAnswerChange = (exerciseId: string, itemKey: string, value: string, inputIndex = 0) => {
    markLessonAnswerStateInteracted();
    const answerKey = getPracticeOpenAnswerKey(exerciseId, itemKey, inputIndex);
    const itemStateKey = getPracticeItemStateKey(exerciseId, itemKey);

    setPracticeOpenAnswers((previous) => ({ ...previous, [answerKey]: value }));
    setCheckedPracticeExercises((previous) => ({ ...previous, [exerciseId]: false }));
    setCheckingPracticeExercises((previous) => ({ ...previous, [exerciseId]: false }));
    setPracticeEvaluations((previous) => {
      if (!(itemStateKey in previous)) {
        return previous;
      }
      const next = { ...previous };
      delete next[itemStateKey];
      return next;
    });
    setPracticeErrorByExercise((previous) => ({ ...previous, [exerciseId]: '' }));
  };

  const handlePracticeSentenceCorrectToggle = (
    exerciseId: string,
    itemKey: string,
    isCorrect: boolean,
    stemText: string
  ) => {
    markLessonAnswerStateInteracted();
    const answerKey = getPracticeItemStateKey(exerciseId, itemKey);
    setCheckedPracticeExercises((previous) => ({ ...previous, [exerciseId]: false }));
    setCheckingPracticeExercises((previous) => ({ ...previous, [exerciseId]: false }));
    setPracticeMarkedCorrect((previous) => ({ ...previous, [answerKey]: isCorrect }));
    setPracticeOpenAnswers((previous) => {
      const nextValue = isCorrect ? stemText : (previous[answerKey] ?? '');
      return {
        ...previous,
        [answerKey]: nextValue,
      };
    });
    setPracticeEvaluations((previous) => {
      if (!(answerKey in previous)) {
        return previous;
      }
      const next = { ...previous };
      delete next[answerKey];
      return next;
    });
    setPracticeErrorByExercise((previous) => ({ ...previous, [exerciseId]: '' }));
  };

  const handleCheckOpenExercise = async (exercise: NormalizedPracticeExercise) => {
    const pendingItems = exercise.items.filter((item) => !item.isExample && !isPracticePromptOnlyImageItem(exercise, item));
    const answeredItems = pendingItems.filter((item) => !isPracticeItemUnanswered(exercise, item));
    const exerciseType = exercise.kind === 'sentence_transform' ? 'sentence_transform' : exercise.kind === 'fill_blank' ? 'fill_blank' : 'open';
    setPracticeErrorByExercise((previous) => ({ ...previous, [exercise.id]: '' }));
    setCheckingPracticeExercises((previous) => ({ ...previous, [exercise.id]: true }));
    const draftAnswerPayload =
      exercise.kind === 'fill_blank'
        ? {
            questions: exercise.items.map((item) => ({
              answer: getSingleFillBlankAnswer(exercise.id, item),
              answersByBlank: item.blanks.reduce<Record<string, string>>((acc, blank) => {
                acc[blank.id] = practiceBlankAnswers[getPracticeBlankKey(exercise.id, item.key, blank.id)] ?? '';
                return acc;
              }, {}),
              correct: null,
              score: null,
            })),
          }
        : exercise.kind === 'sentence_transform'
          ? {
              questions: exercise.items.map((item) => {
                const itemStateKey = getPracticeItemStateKey(exercise.id, item.key);
                const markedAsCorrect = practiceMarkedCorrect[itemStateKey];
                return {
                  answer: getSentenceTransformAnswer(exercise.id, item),
                  markedAsCorrect: typeof markedAsCorrect === 'boolean' ? markedAsCorrect : null,
                  correct: null,
                  score: null,
                };
              }),
            }
          : {
              questions: exercise.items.map((item) => {
                const inputCount = getPracticeOpenInputCount(exercise, item);
                const answerParts = Array.from({ length: inputCount }, (_, index) =>
                  practiceOpenAnswers[getPracticeOpenAnswerKey(exercise.id, item.key, index)] ?? ''
                );
                return {
                  answer: getPracticeOpenAnswer(exercise, item),
                  answerParts,
                  correct: null,
                  score: null,
                };
              }),
            };
    await saveAnswerStateForUnit(buildExerciseAnswerStateUnitKey(exercise.id), draftAnswerPayload);

    const nextCheckedExercises = { ...checkedPracticeExercises, [exercise.id]: true };
    setCheckedPracticeExercises(nextCheckedExercises);
    await writeProgressUnit('exercise', buildAppExerciseKey(exercise.id), getCurrentProgressParentKey());
    setPracticeEvaluations((previous) => {
      const next = { ...previous };
      pendingItems.forEach((item) => {
        const itemStateKey = getPracticeItemStateKey(exercise.id, item.key);
        if (isPracticeItemUnanswered(exercise, item)) {
          delete next[itemStateKey];
          return;
        }
        next[itemStateKey] = {
          loading: true,
          correct: null,
          score: null,
          feedbackEn: '',
          feedbackTh: '',
          error: '',
        };
      });
      return next;
    });

    try {
      const nextEvaluationByItemKey: Record<string, PracticeEvaluationState> = {};

      await Promise.all(
        answeredItems.map(async (item, index) => {
          const answerKey = getPracticeItemStateKey(exercise.id, item.key);
          const itemStateKey = getPracticeItemStateKey(exercise.id, item.key);
          const markedAsCorrect = practiceMarkedCorrect[itemStateKey];
          const sentenceTransformExpectedAnswer =
            item.answer ||
            (exercise.kind === 'sentence_transform' && markedAsCorrect === true
              ? item.text || item.prompt || ''
              : '');
          try {
            const result = await evaluateLessonAnswer({
              exerciseType,
              userAnswer:
                exercise.kind === 'fill_blank'
                  ? getSingleFillBlankAnswer(exercise.id, item)
                  : exercise.kind === 'sentence_transform'
                    ? getSentenceTransformAnswer(exercise.id, item)
                    : getPracticeOpenAnswer(exercise, item),
              correctAnswer: exercise.kind === 'sentence_transform' ? sentenceTransformExpectedAnswer : item.answer || '',
              sourceType: 'practice',
              exerciseId: exercise.id,
              questionNumber: item.numberLabel || index + 1,
              questionPrompt:
                item.prompt ||
                item.text ||
                exercise.paragraph ||
                exercise.prompt ||
                exercise.title ||
                (exercise.kind === 'sentence_transform' ? 'Transform the sentence to the correct form.' : 'Fill in the missing text.'),
              extra:
                exercise.kind === 'open' && item.keywords
                  ? { question_keywords: item.keywords }
                  : undefined,
            });

            nextEvaluationByItemKey[answerKey] = {
              loading: false,
              correct: typeof result.correct === 'boolean' ? result.correct : null,
              score: typeof result.score === 'number' ? result.score : null,
              feedbackEn: String(result.feedback_en ?? result.feedback ?? '').trim(),
              feedbackTh: String(result.feedback_th ?? result.feedback ?? '').trim(),
              error: '',
            };
            setPracticeEvaluations((previous) => ({
              ...previous,
              [answerKey]: nextEvaluationByItemKey[answerKey],
            }));
          } catch (error) {
            const message = error instanceof Error ? error.message : pageCopy.practiceLoginRequired;
            nextEvaluationByItemKey[answerKey] = {
              loading: false,
              correct: false,
              score: null,
              feedbackEn: message,
              feedbackTh: '',
              error: message,
            };
            setPracticeEvaluations((previous) => ({
              ...previous,
              [answerKey]: nextEvaluationByItemKey[answerKey],
            }));
            setPracticeErrorByExercise((previous) => ({ ...previous, [exercise.id]: message }));
          }
        })
      );
      const answerPayload =
        exercise.kind === 'fill_blank'
          ? {
              questions: exercise.items.map((item) => {
                if (isPracticeItemUnanswered(exercise, item)) {
                  return {
                    answer: getSingleFillBlankAnswer(exercise.id, item),
                    answersByBlank: item.blanks.reduce<Record<string, string>>((acc, blank) => {
                      acc[blank.id] = practiceBlankAnswers[getPracticeBlankKey(exercise.id, item.key, blank.id)] ?? '';
                      return acc;
                    }, {}),
                    correct: null,
                    score: null,
                  };
                }
                const evaluation =
                  nextEvaluationByItemKey[getPracticeItemStateKey(exercise.id, item.key)] ??
                  getSavedPracticeEvaluation(exercise.id, item.key);
                return {
                  answer: getSingleFillBlankAnswer(exercise.id, item),
                  answersByBlank: item.blanks.reduce<Record<string, string>>((acc, blank) => {
                    acc[blank.id] = practiceBlankAnswers[getPracticeBlankKey(exercise.id, item.key, blank.id)] ?? '';
                    return acc;
                  }, {}),
                  correct: evaluation?.correct ?? null,
                  score: evaluation?.score ?? null,
                };
              }),
            }
          : exercise.kind === 'sentence_transform'
            ? {
                questions: exercise.items.map((item) => {
                  const itemStateKey = getPracticeItemStateKey(exercise.id, item.key);
                  const markedAsCorrect = practiceMarkedCorrect[itemStateKey];
                  if (isPracticeItemUnanswered(exercise, item)) {
                    return {
                      answer: getSentenceTransformAnswer(exercise.id, item),
                      markedAsCorrect: typeof markedAsCorrect === 'boolean' ? markedAsCorrect : null,
                      correct: null,
                      score: null,
                    };
                  }
                  const evaluation =
                    nextEvaluationByItemKey[itemStateKey] ??
                    getSavedPracticeEvaluation(exercise.id, item.key);
                  return {
                    answer: getSentenceTransformAnswer(exercise.id, item),
                    markedAsCorrect: typeof markedAsCorrect === 'boolean' ? markedAsCorrect : null,
                    correct: evaluation?.correct ?? null,
                    score: evaluation?.score ?? null,
                  };
                }),
              }
            : {
                questions: exercise.items.map((item) => {
                  const inputCount = getPracticeOpenInputCount(exercise, item);
                  const answerParts = Array.from({ length: inputCount }, (_, index) =>
                    practiceOpenAnswers[getPracticeOpenAnswerKey(exercise.id, item.key, index)] ?? ''
                  );
                  if (isPracticeItemUnanswered(exercise, item)) {
                    return {
                      answer: getPracticeOpenAnswer(exercise, item),
                      answerParts,
                      correct: null,
                      score: null,
                    };
                  }
                  const evaluation =
                    nextEvaluationByItemKey[getPracticeItemStateKey(exercise.id, item.key)] ??
                    getSavedPracticeEvaluation(exercise.id, item.key);
                  return {
                    answer: getPracticeOpenAnswer(exercise, item),
                    answerParts,
                    correct: evaluation?.correct ?? null,
                    score: evaluation?.score ?? null,
                  };
                }),
              };
      await saveAnswerStateForUnit(buildExerciseAnswerStateUnitKey(exercise.id), answerPayload);
    } catch {
      return;
    } finally {
      setCheckingPracticeExercises((previous) => ({ ...previous, [exercise.id]: false }));
    }
  };

  const handleResetOpenExercise = useCallback(
    (exercise: NormalizedPracticeExercise) => {
      markLessonAnswerStateInteracted();

      const pendingItems = exercise.items.filter((item) => !item.isExample && !isPracticePromptOnlyImageItem(exercise, item));
      const isPerfectScore =
        pendingItems.length > 0 &&
        pendingItems.every((item) => practiceEvaluations[getPracticeItemStateKey(exercise.id, item.key)]?.correct === true);

      const nextOpenAnswers = { ...practiceOpenAnswers };
      const nextBlankAnswers = { ...practiceBlankAnswers };
      const nextEvaluations = { ...practiceEvaluations };
      const nextMarkedCorrect = { ...practiceMarkedCorrect };

      pendingItems.forEach((item) => {
        const itemStateKey = getPracticeItemStateKey(exercise.id, item.key);
        const isCorrect = practiceEvaluations[itemStateKey]?.correct === true;

        if (isPerfectScore || !isCorrect) {
          if (exercise.kind === 'fill_blank') {
            if (item.blanks.length) {
              item.blanks.forEach((blank) => {
                delete nextBlankAnswers[getPracticeBlankKey(exercise.id, item.key, blank.id)];
              });
            } else {
              delete nextOpenAnswers[itemStateKey];
            }
          } else if (exercise.kind === 'sentence_transform') {
            delete nextOpenAnswers[itemStateKey];
            delete nextMarkedCorrect[itemStateKey];
          } else {
            const inputCount = getPracticeOpenInputCount(exercise, item);
            Array.from({ length: inputCount }, (_, index) => {
              delete nextOpenAnswers[getPracticeOpenAnswerKey(exercise.id, item.key, index)];
            });
          }

          delete nextEvaluations[itemStateKey];
        }
      });

      setPracticeOpenAnswers(nextOpenAnswers);
      setPracticeBlankAnswers(nextBlankAnswers);
      setPracticeEvaluations(nextEvaluations);
      setPracticeMarkedCorrect(nextMarkedCorrect);
      setCheckedPracticeExercises((previous) => ({ ...previous, [exercise.id]: false }));
      setCheckingPracticeExercises((previous) => ({ ...previous, [exercise.id]: false }));
      setPracticeErrorByExercise((previous) => ({ ...previous, [exercise.id]: '' }));

      if (isPerfectScore) {
        void clearAnswerStateForUnit(buildExerciseAnswerStateUnitKey(exercise.id));
        return;
      }

      const hasRetainedState =
        Object.keys(nextOpenAnswers).some((key) => key.startsWith(`${exercise.id}:`)) ||
        Object.keys(nextBlankAnswers).some((key) => key.startsWith(`${exercise.id}:`)) ||
        Object.keys(nextMarkedCorrect).some((key) => key.startsWith(`${exercise.id}:`));

      if (!hasRetainedState) {
        void clearAnswerStateForUnit(buildExerciseAnswerStateUnitKey(exercise.id));
        return;
      }

      const retainedPayload =
        exercise.kind === 'fill_blank'
          ? {
              questions: exercise.items.map((item) => ({
                answer: getSingleFillBlankAnswer(exercise.id, item),
                answersByBlank: item.blanks.reduce<Record<string, string>>((acc, blank) => {
                  const value = nextBlankAnswers[getPracticeBlankKey(exercise.id, item.key, blank.id)];
                  if (typeof value === 'string') {
                    acc[blank.id] = value;
                  }
                  return acc;
                }, {}),
                correct: nextEvaluations[getPracticeItemStateKey(exercise.id, item.key)]?.correct ?? null,
                score: nextEvaluations[getPracticeItemStateKey(exercise.id, item.key)]?.score ?? null,
              })),
            }
          : exercise.kind === 'sentence_transform'
            ? {
                questions: exercise.items.map((item) => {
                  const itemStateKey = getPracticeItemStateKey(exercise.id, item.key);
                  const markedAsCorrect = nextMarkedCorrect[itemStateKey];
                  return {
                    answer:
                      typeof markedAsCorrect === 'boolean' && markedAsCorrect === true
                        ? item.text || item.prompt || ''
                        : nextOpenAnswers[itemStateKey] ?? '',
                    markedAsCorrect: typeof markedAsCorrect === 'boolean' ? markedAsCorrect : null,
                    correct: nextEvaluations[itemStateKey]?.correct ?? null,
                    score: nextEvaluations[itemStateKey]?.score ?? null,
                  };
                }),
              }
            : {
                questions: exercise.items.map((item) => {
                  const inputCount = getPracticeOpenInputCount(exercise, item);
                  const answerParts = Array.from({ length: inputCount }, (_, index) =>
                    nextOpenAnswers[getPracticeOpenAnswerKey(exercise.id, item.key, index)] ?? ''
                  );
                  return {
                    answer: answerParts.join('\n').trim(),
                    answerParts,
                    correct: nextEvaluations[getPracticeItemStateKey(exercise.id, item.key)]?.correct ?? null,
                    score: nextEvaluations[getPracticeItemStateKey(exercise.id, item.key)]?.score ?? null,
                  };
                }),
              };

      void saveAnswerStateForUnit(buildExerciseAnswerStateUnitKey(exercise.id), retainedPayload);
    },
    [
      clearAnswerStateForUnit,
      getPracticeBlankKey,
      getPracticeItemStateKey,
      getPracticeOpenAnswerKey,
      getPracticeOpenInputCount,
      getSingleFillBlankAnswer,
      isPracticePromptOnlyImageItem,
      markLessonAnswerStateInteracted,
      practiceBlankAnswers,
      practiceEvaluations,
      practiceMarkedCorrect,
      practiceOpenAnswers,
      saveAnswerStateForUnit,
    ]
  );

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!hasStartedLesson || !lesson?.id || !lesson.conversation_audio_url) {
        setAudioUrls({ main: null, noBg: null, bg: null });
        return;
      }

      try {
        const urls = await fetchLessonAudioUrls(lesson);
        if (!isMounted) {
          return;
        }
        setAudioUrls(urls);
      } catch {
        if (!isMounted) {
          return;
        }
        setAudioUrls({ main: null, noBg: null, bg: null });
      }
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [hasStartedLesson, lesson]);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!lesson?.id || !lesson.lesson_external_id) {
        setSnippetIndex(EMPTY_SNIPPET_INDEX);
        return;
      }

      try {
        const nextSnippetIndex = await fetchLessonAudioSnippetIndex(lesson);
        if (!isMounted) {
          return;
        }
        setSnippetIndex(nextSnippetIndex);
      } catch {
        if (!isMounted) {
          return;
        }
        setSnippetIndex(EMPTY_SNIPPET_INDEX);
      }
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [lesson]);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!hasStartedLesson || !lesson?.id) {
        setPhraseSnippetIndex(EMPTY_PHRASE_SNIPPET_INDEX);
        return;
      }

      try {
        const nextPhraseSnippetIndex = await fetchLessonPhraseAudioSnippetIndex(lesson);
        if (!isMounted) {
          return;
        }
        setPhraseSnippetIndex(nextPhraseSnippetIndex);
      } catch {
        if (!isMounted) {
          return;
        }
        setPhraseSnippetIndex(EMPTY_PHRASE_SNIPPET_INDEX);
      }
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [hasStartedLesson, lesson]);

  useEffect(() => {
    return () => {
      clearConversationLockScreenControls();
      snippetSubscriptionRef.current?.remove();
      snippetSubscriptionRef.current = null;

      const activePlayer = snippetSoundRef.current;
      if (activePlayer) {
        try {
          activePlayer.remove();
        } catch {
          return;
        } finally {
          snippetSoundRef.current = null;
        }
      }

      Object.values(preloadedSnippetPlayersRef.current).forEach((player) => {
        if (player === activePlayer) {
          return;
        }
        try {
          player.remove();
        } catch {
          return;
        }
      });
      preloadedSnippetPlayersRef.current = {};
      inflightSnippetPreloadsRef.current = {};
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    const unloadCurrentPlayers = () => {
      clearConversationLockScreenControls();
      const players = [voiceSoundRef.current].filter(Boolean) as AudioPlayer[];
      voiceSoundRef.current = null;
      players.forEach((player) => {
        try {
          player.remove();
        } catch {
          return;
        }
      });
    };

    const loadPlayers = async () => {
      unloadCurrentPlayers();
      setIsAudioPlaying(false);
      setAudioPositionMillis(0);
      setAudioDurationMillis(0);
      setHasAudioFinished(false);

      const voiceUrl = audioUrls.main;

      if (!voiceUrl) {
        setIsAudioLoading(false);
        return;
      }

      setIsAudioLoading(true);

      try {
        let voiceSound: AudioPlayer | null = null;
        let voiceStatusSubscription: { remove: () => void } | null = null;
        const player = createAudioPlayer(voiceUrl, {
          updateInterval: 500,
        });
        player.setPlaybackRate(audioRateRef.current, PITCH_CORRECTION_QUALITY);

        const subscription = player.addListener('playbackStatusUpdate', (status) => {
          if (!isActive || !status.isLoaded) {
            return;
          }

          setIsAudioLoading(false);
          setIsAudioPlaying(status.playing);
          setAudioPositionMillis(secondsToMillis(status.currentTime));
          setAudioDurationMillis(secondsToMillis(status.duration));
          setHasAudioFinished(Boolean(status.didJustFinish));

          if (status.didJustFinish) {
            clearConversationLockScreenControls();
          }
        });

        voiceSound = player;
        voiceStatusSubscription = subscription;

        if (!voiceSound || !voiceStatusSubscription) {
          throw new Error('Unable to load lesson audio');
        }

        if (!isActive) {
          voiceStatusSubscription.remove();
          voiceSound.remove();
          return;
        }

        voiceSoundRef.current = voiceSound;
      } catch {
        if (isActive) {
          setIsAudioPlaying(false);
          setAudioPositionMillis(0);
          setAudioDurationMillis(0);
        }
      } finally {
        if (isActive) {
          setIsAudioLoading(false);
        }
      }
    };

    loadPlayers();

    return () => {
      isActive = false;
      unloadCurrentPlayers();
    };
  }, [audioUrls.main, lessonId]);

  useEffect(() => {
    const voiceSound = voiceSoundRef.current;
    if (voiceSound?.isLoaded) {
      voiceSound.setPlaybackRate(audioRate, PITCH_CORRECTION_QUALITY);
    }
  }, [audioRate]);

  const unloadSnippetPlayer = () => {
    const activePlayer = snippetSoundRef.current;
    const cachedActivePlayer = activePlayer
      ? Object.values(preloadedSnippetPlayersRef.current).find((player) => player === activePlayer) ?? null
      : null;

    snippetSubscriptionRef.current?.remove();
    snippetSubscriptionRef.current = null;

    if (activePlayer) {
      try {
        activePlayer.pause();
      } catch {
      } finally {
        snippetSoundRef.current = null;
      }
    }

    if (cachedActivePlayer) {
      void cachedActivePlayer.seekTo(0).catch(() => undefined);
    } else if (activePlayer) {
      try {
        activePlayer.remove();
      } catch {
      }
    }

    setActiveSnippetKey(null);
    setPlayingSnippetKey(null);
    setIsSnippetLoading(false);
  };

  useEffect(() => {
    unloadSnippetPlayer();
  }, [activeTab?.id, contentLang, lessonId]);

  useEffect(() => {
    Object.values(preloadedSnippetPlayersRef.current).forEach((player) => {
      try {
        player.remove();
      } catch {
        return;
      }
    });
    preloadedSnippetPlayersRef.current = {};
    inflightSnippetPreloadsRef.current = {};
  }, [lessonId]);

  useEffect(() => {
    if (!snippetPreloadTargets.length) {
      return;
    }

    let isActive = true;
    const preloadTimer = setTimeout(() => {
      snippetPreloadTargets.forEach((snippet) => {
        const audioKey = snippet.audio_key?.trim();
        if (!audioKey || preloadedSnippetPlayersRef.current[audioKey] || inflightSnippetPreloadsRef.current[audioKey]) {
          return;
        }

        inflightSnippetPreloadsRef.current[audioKey] = (async () => {
          const snippetUrl =
            snippet.signed_url?.trim() ||
            (snippet.storage_path ? await fetchSignedLessonAudioUrl(snippet.storage_path) : null);

          if (!snippetUrl || !isActive) {
            return;
          }

          try {
            const player = createAudioPlayer(snippetUrl, {
              updateInterval: 250,
            });

            if (!isActive) {
              player.remove();
              return;
            }

            preloadedSnippetPlayersRef.current[audioKey] = player;
          } catch {
            return;
          }
        })().finally(() => {
          delete inflightSnippetPreloadsRef.current[audioKey];
        });
      });
    }, isPrepareTab ? 0 : 150);

    return () => {
      isActive = false;
      clearTimeout(preloadTimer);
    };
  }, [isPrepareTab, snippetPreloadTargets]);

  const handleToggleSnippet = async (snippet: LessonAudioSnippet | null) => {
    const audioKey = snippet?.audio_key?.trim();
    if (!snippet || !audioKey) {
      return;
    }

    const existingPlayer = snippetSoundRef.current;
    if (existingPlayer && activeSnippetKey === audioKey && existingPlayer.isLoaded) {
      if (existingPlayer.playing) {
        existingPlayer.pause();
        setPlayingSnippetKey(null);
      } else {
        existingPlayer.play();
        setActiveSnippetKey(audioKey);
        setPlayingSnippetKey(audioKey);
      }
      return;
    }

    pauseConversationAudio();
    unloadSnippetPlayer();
    setActiveSnippetKey(audioKey);
    setIsSnippetLoading(true);

    try {
      let player = preloadedSnippetPlayersRef.current[audioKey] ?? null;
      if (!player && inflightSnippetPreloadsRef.current[audioKey]) {
        await inflightSnippetPreloadsRef.current[audioKey];
        player = preloadedSnippetPlayersRef.current[audioKey] ?? null;
      }

      if (!player) {
        const snippetUrl =
          snippet.signed_url?.trim() || (snippet.storage_path ? await fetchSignedLessonAudioUrl(snippet.storage_path) : null);
        if (!snippetUrl) {
          setIsSnippetLoading(false);
          return;
        }

        player = createAudioPlayer(snippetUrl, {
          updateInterval: 250,
        });
      }

      const subscription = player.addListener('playbackStatusUpdate', (status) => {
        if (!status.isLoaded) {
          return;
        }

        setIsSnippetLoading(false);
        if (status.didJustFinish) {
          setPlayingSnippetKey((current) => (current === audioKey ? null : current));
          setActiveSnippetKey((current) => (current === audioKey ? null : current));
          // Android can re-trigger playback when a snippet is seeked immediately on finish.
          if (Platform.OS !== 'android') {
            void player.seekTo(0).catch(() => undefined);
          }
        } else if (status.playing) {
          setActiveSnippetKey(audioKey);
          setPlayingSnippetKey(audioKey);
        } else {
          setActiveSnippetKey(audioKey);
          setPlayingSnippetKey((current) => (current === audioKey ? null : current));
        }
      });

      snippetSubscriptionRef.current?.remove();
      snippetSoundRef.current = player;
      snippetSubscriptionRef.current = subscription;
      setActiveSnippetKey(audioKey);
      setPlayingSnippetKey(audioKey);
      player.play();
    } catch {
      unloadSnippetPlayer();
    } finally {
      setIsSnippetLoading(false);
    }
  };

  const handleToggleAudio = async () => {
    const voiceSound = voiceSoundRef.current;
    if (!voiceSound || isAudioLoading || !voiceSound.isLoaded) {
      return;
    }

    try {
      if (voiceSound.playing) {
        pauseConversationAudio();
      } else {
        await playConversationAudio();
      }
    } catch {
      return;
    }
  };

  const handleSkipAudio = async (millisDelta: number) => {
    const voiceSound = voiceSoundRef.current;
    if (!voiceSound || !voiceSound.isLoaded) {
      return;
    }

    try {
      const nextPosition = Math.max(
        0,
        Math.min(secondsToMillis(voiceSound.duration), secondsToMillis(voiceSound.currentTime) + millisDelta)
      );
      await seekConversationAudioToMillis(nextPosition);
    } catch {
      return;
    }
  };

  const handleSeekAudio = async (ratio: number) => {
    const voiceSound = voiceSoundRef.current;
    if (!voiceSound || !voiceSound.isLoaded || !voiceSound.duration) {
      return;
    }

    try {
      const nextPosition = Math.round(secondsToMillis(voiceSound.duration) * ratio);
      await seekConversationAudioToMillis(nextPosition);
    } catch {
      return;
    }
  };

  const handleSetAudioRate = (nextRate: number) => {
    setAudioRate(nextRate);
  };

  const renderApplyInlines = (
    inlines: LessonRichInline[] | null | undefined,
    options?: { treatAsDialogue?: boolean }
  ) => {
    if (!Array.isArray(inlines) || !inlines.length) {
      return null;
    }

    return inlines.map((inline, index) => {
      const textValue = resolveRichInlineText(inline, contentLang);
      if (!textValue) {
        return null;
      }

      const baseApplyTextStyle = [
        styles.applyInlineText,
        {
          fontFamily: getInlineFontFamily(contentLang, {
            bold: inline.bold === true,
            italic: inline.italic === true,
          }),
        },
        inline.underline ? styles.applyInlineUnderline : null,
      ];

      const renderApplyLinePieces = (text: string, lineKey: string, isThaiLine: boolean) => {
        return splitTextByScript(text).map((segment, pieceIndex) => (
          <Text
            key={`${lineKey}-${pieceIndex}`}
            style={[
              baseApplyTextStyle,
              isThaiLine ? styles.richInlineThaiMuted : null,
            ]}>
            {segment.text}
          </Text>
        ));
      };

      const renderDialogueText = (text: string, keyPrefix: string) => {
        const lines = text.split('\n');

        return lines.flatMap((line, lineIndex) => {
          const lineKey = `${keyPrefix}-line-${lineIndex}`;
          const isThaiLine = contentLang === 'th' && THAI_TEXT_RE.test(line);
          const speakerPrefixMatch = line.match(SPEAKER_PREFIX_RE);
          const speakerPrefix = speakerPrefixMatch?.[1] ?? '';
          const bodyText = speakerPrefix ? line.slice(speakerPrefix.length) : line;
          const renderedLine: React.ReactNode[] = [];

          if (speakerPrefix) {
            const isEnglishSpeaker = /^[A-Za-z]/.test(speakerPrefix.trimStart());
            renderedLine.push(
              <Text
                key={`${lineKey}-speaker`}
                style={[
                  baseApplyTextStyle,
                  styles.richSpeakerPrefix,
                  isEnglishSpeaker ? null : styles.richSpeakerPrefixThai,
                ]}>
                {speakerPrefix}
              </Text>
            );
          }

          renderedLine.push(...renderApplyLinePieces(bodyText, `${lineKey}-body`, isThaiLine));

          if (lineIndex < lines.length - 1) {
            renderedLine.push(
              <Text
                key={`${lineKey}-break`}
                style={[baseApplyTextStyle, options?.treatAsDialogue ? styles.richAudioLineBreakGap : null]}>
                {'\n'}
              </Text>
            );
          }

          return renderedLine;
        });
      };

      if (options?.treatAsDialogue) {
        return (
          <Text key={`inline-${index}`} style={baseApplyTextStyle}>
            {renderDialogueText(textValue, `apply-inline-${index}`)}
          </Text>
        );
      }

      return (
        <Text
          key={`inline-${index}`}
          style={baseApplyTextStyle}>
          {textValue}
        </Text>
      );
    });
  };

  const renderApplyNodes = (nodes: LessonRichNode[]) => {
    if (!nodes.length) {
      return null;
    }

    const lastInstructionParagraphIndex = [...nodes]
      .map((node, index) => ({ node, index }))
      .filter(({ node }) => node.kind === 'paragraph' && !applyNodeHasAccent(node))
      .at(-1)?.index;

    const renderApplyParagraph = (
      node: LessonRichNode,
      index: number,
      compact = false,
      emphasized = false
    ) => {
      const nodeKey = `apply-node-${index}`;
      const textLanguage = contentLang === 'th' ? 'th' : 'en';

      return (
        <View
          key={nodeKey}
          style={[
            styles.applyParagraphRow,
            compact ? styles.applyParagraphRowCompact : null,
            emphasized ? styles.applyInstructionRow : null,
          ]}>
          <AppText
            language={textLanguage}
            variant="body"
            style={[styles.applyParagraphText, emphasized ? styles.applyInstructionText : null]}>
            {renderApplyInlines(node.inlines, { treatAsDialogue: compact })}
          </AppText>
        </View>
      );
    };

    const renderedNodes: React.ReactNode[] = [];
    let accentGroup: { node: LessonRichNode; index: number }[] = [];

    const flushAccentGroup = () => {
      if (!accentGroup.length) {
        return;
      }

      renderedNodes.push(
        <View key={`apply-accent-group-${accentGroup[0].index}`} style={styles.applyAccentBlock}>
          {accentGroup.map(({ node, index }) => renderApplyParagraph(node, index, true))}
        </View>
      );

      accentGroup = [];
    };

    nodes.forEach((node, index) => {
      const nodeKey = `apply-node-${index}`;
      const accent = applyNodeHasAccent(node);
      const textLanguage = contentLang === 'th' ? 'th' : 'en';

      if (node.kind === 'heading') {
        flushAccentGroup();

        const headingText =
          typeof node.text === 'string'
            ? node.text
            : contentLang === 'th'
              ? String(node.text?.th ?? node.text_th ?? node.text?.en ?? '')
              : String(node.text?.en ?? node.text?.th ?? '');

        if (!headingText.trim()) {
          return;
        }

        renderedNodes.push(
          <AppText key={nodeKey} language={textLanguage} variant="body" style={styles.applyHeading}>
            {headingText}
          </AppText>
        );
        return;
      }

      if (node.kind === 'image') {
        flushAccentGroup();

        const imageSource = resolveRichNodeImageSource(node, lesson?.images);

        if (!imageSource) {
          return;
        }

        renderedNodes.push(
          <View key={nodeKey} style={styles.richImageWrap}>
            <Image source={{ uri: imageSource }} contentFit="contain" style={styles.richImage} />
          </View>
        );
        return;
      }

      if (node.kind === 'paragraph') {
        if (accent) {
          if (accentGroup.length && !THAI_TEXT_RE.test(getApplyNodeText(node, contentLang))) {
            flushAccentGroup();
          }
          accentGroup.push({ node, index });
          return;
        }

        flushAccentGroup();
        renderedNodes.push(renderApplyParagraph(node, index, false, index === lastInstructionParagraphIndex));
      }

      flushAccentGroup();
    });

    flushAccentGroup();

    return renderedNodes;
  };

  const getRichIndentLevel = (node: LessonRichNode) => {
    const indentLevel =
      typeof node.indent_level === 'number'
        ? node.indent_level
        : typeof node.indent === 'number'
          ? node.indent
          : typeof node.indent_first_line_level === 'number'
            ? node.indent_first_line_level
            : 0;

    return Math.max(0, indentLevel);
  };

  const getRichTextStartOffset = (node: LessonRichNode) => {
    const indentLevel = getRichIndentLevel(node);
    const isIndented = indentLevel > 0 || node.is_indented === true;

    if (!isIndented) {
      return 0;
    }

    const baseIndent = indentLevel * RICH_INDENT_STEP;
    const offset = indentLevel > 0 ? RICH_LIST_ITEM_OFFSET : RICH_LIST_ITEM_BASE_OFFSET;
    return baseIndent + offset;
  };

  const getRichTextIndentStyle = (node: LessonRichNode) => {
    const textStartOffset = getRichTextStartOffset(node);
    if (!textStartOffset) {
      return null;
    }

    return { marginLeft: textStartOffset };
  };

  const addColumnOffset = (style: object | null, extraOffset: number) => {
    if (!extraOffset) {
      return style;
    }

    if (!style) {
      return { marginLeft: extraOffset };
    }

    return {
      ...style,
      marginLeft: typeof (style as { marginLeft?: unknown }).marginLeft === 'number'
        ? ((style as { marginLeft: number }).marginLeft + extraOffset)
        : extraOffset,
    };
  };

  const getRichRowIndentStyle = (node: LessonRichNode, markerSpan: number, extraInset = 0) => {
    const textStartOffset = getRichTextStartOffset(node);
    if (!textStartOffset) {
      return null;
    }

    return { paddingLeft: Math.max(0, textStartOffset - markerSpan + extraInset) };
  };

  const getPrepareIndentStyle = (node: LessonRichNode) => {
    const indentLevel = getRichIndentLevel(node);

    if (indentLevel >= 3) {
      return styles.richIndent3;
    }
    if (indentLevel === 2) {
      return styles.richIndent2;
    }
    if (indentLevel === 1) {
      return styles.richIndent1;
    }
    return null;
  };

  const resolveRichLinkDestination = useCallback(
    async (href: string): Promise<PendingRichLink | null> => {
      const nextHref = normalizeInternalHref(href);
      const lessonReturnTo = lessonId ? `/lessons/${lessonId}` : null;
      if (!nextHref) {
        return null;
      }

      if (nextHref.startsWith('/lesson/')) {
        const lessonId = nextHref.replace('/lesson/', '').replace(/^\/+/, '').split(/[/?#]/)[0];
        if (!lessonId) {
          return null;
        }

        const cachedLesson = richLinkLessonCacheRef.current[lessonId];
        let linkedLesson = typeof cachedLesson === 'undefined' ? null : cachedLesson;

        if (typeof cachedLesson === 'undefined') {
          try {
            linkedLesson = await getLessonById(lessonId);
          } catch {
            linkedLesson = null;
          }

          richLinkLessonCacheRef.current[lessonId] = linkedLesson;
        }

        const linkedLessonNumber = formatLessonNumber(linkedLesson);
        const linkedLessonTitle =
          uiLanguage === 'th'
            ? linkedLesson?.title_th || linkedLesson?.title || null
            : linkedLesson?.title || linkedLesson?.title_th || null;
        const linkedLessonLabel = linkedLessonNumber ? `${uiCopy.lessonLabel} ${linkedLessonNumber}` : null;

        return {
          kind: 'lesson',
          title: linkedLessonTitle || linkedLessonLabel || richLinkCopy.lessonSubtitle,
          subtitle: linkedLessonTitle
            ? linkedLessonLabel || richLinkCopy.lessonSubtitle
            : richLinkCopy.lessonSubtitle,
          route: `/lessons/${lessonId}`,
          externalUrl: null,
          actionLabel: richLinkCopy.openLesson,
          note: null,
          icon: 'menu-book',
        };
      }

      if (nextHref.startsWith('/topic-library/')) {
        const slug = nextHref.replace('/topic-library/', '').replace(/^\/+/, '').split(/[/?#]/)[0];
        if (!slug) {
          return null;
        }

        return {
          kind: 'page',
          title: formatLinkedLabel(slug),
          subtitle: richLinkCopy.topicSubtitle,
          route: lessonReturnTo
            ? `/(tabs)/resources/topic-library/${slug}?returnTo=${encodeURIComponent(lessonReturnTo)}`
            : `/(tabs)/resources/topic-library/${slug}`,
          externalUrl: null,
          actionLabel: richLinkCopy.openPage,
          note: richLinkCopy.progressSaved,
          icon: 'article',
        };
      }

      if (nextHref === '/topic-library' || nextHref === '/resources/topic-library') {
        return {
          kind: 'page',
          title: uiLanguage === 'th' ? 'คลังหัวข้อการเรียนรู้' : 'Topic Library',
          subtitle: richLinkCopy.topicSubtitle,
          route: lessonReturnTo
            ? `/(tabs)/resources/topic-library?returnTo=${encodeURIComponent(lessonReturnTo)}`
            : '/(tabs)/resources/topic-library',
          externalUrl: null,
          actionLabel: richLinkCopy.openPage,
          note: richLinkCopy.progressSaved,
          icon: 'article',
        };
      }

      if (nextHref === '/exercise-bank' || nextHref === '/resources/exercise-bank') {
        return {
          kind: 'page',
          title: uiLanguage === 'th' ? 'คลังแบบฝึกหัด' : 'Exercise Bank',
          subtitle: richLinkCopy.exerciseSubtitle,
          route: lessonReturnTo
            ? `/(tabs)/resources/exercise-bank?returnTo=${encodeURIComponent(lessonReturnTo)}`
            : '/(tabs)/resources/exercise-bank',
          externalUrl: null,
          actionLabel: richLinkCopy.openPage,
          note: richLinkCopy.progressSaved,
          icon: 'edit-note',
        };
      }

      if (
        nextHref === '/common-mistakes' ||
        nextHref === '/phrases-verbs' ||
        nextHref === '/culture-notes' ||
        nextHref === '/resources'
      ) {
        const pageLabel =
          nextHref === '/common-mistakes'
            ? uiLanguage === 'th'
              ? 'ข้อผิดพลาดที่พบบ่อย'
              : 'Common Mistakes'
            : nextHref === '/phrases-verbs'
              ? uiLanguage === 'th'
                ? 'วลี & Phrasal Verbs'
                : 'Phrases & Phrasal Verbs'
              : nextHref === '/culture-notes'
                ? uiLanguage === 'th'
                  ? 'เกร็ดความรู้ทางวัฒนธรรม'
                  : 'Culture Notes'
                : uiLanguage === 'th'
                  ? 'สื่อการเรียน'
                  : 'Resources';

        return {
          kind: 'page',
          title: pageLabel,
          subtitle: richLinkCopy.resourcesSubtitle,
          route: lessonReturnTo
            ? `/(tabs)/resources?returnTo=${encodeURIComponent(lessonReturnTo)}`
            : '/(tabs)/resources',
          externalUrl: null,
          actionLabel: richLinkCopy.openPage,
          note: richLinkCopy.progressSaved,
          icon: 'folder-open',
        };
      }

      if (nextHref.startsWith('/')) {
        return {
          kind: 'page',
          title: formatLinkedLabel(nextHref.replace(/^\/+/, '')),
          subtitle: richLinkCopy.resourcesSubtitle,
          route: lessonReturnTo
            ? `/(tabs)/resources?returnTo=${encodeURIComponent(lessonReturnTo)}`
            : '/(tabs)/resources',
          externalUrl: null,
          actionLabel: richLinkCopy.openPage,
          note: richLinkCopy.progressSaved,
          icon: 'folder-open',
        };
      }

      return {
        kind: 'external',
        title: nextHref.replace(/^https?:\/\//i, '').replace(/\/$/, ''),
        subtitle: richLinkCopy.externalSubtitle,
        route: null,
        externalUrl: nextHref,
        actionLabel: richLinkCopy.openLink,
        note: null,
        icon: 'open-in-new',
      };
    },
    [lessonId, richLinkCopy, uiCopy.lessonLabel, uiLanguage]
  );

  const handleOpenRichLink = useCallback(
    async (href: string) => {
      const resolvedDestination = await resolveRichLinkDestination(href);
      if (!resolvedDestination) {
        return;
      }

      richLinkSheetTranslateY.value = 0;
      setPendingRichLink(resolvedDestination);
    },
    [resolveRichLinkDestination, richLinkSheetTranslateY]
  );

  const closeRichLinkSheet = useCallback(() => {
    richLinkSheetTranslateY.value = 0;
    setPendingRichLink(null);
  }, [richLinkSheetTranslateY]);

  const handleConfirmRichLink = useCallback(() => {
    if (!pendingRichLink) {
      return;
    }

    if (pendingRichLink.route) {
      richLinkSheetTranslateY.value = 0;
      router.push(pendingRichLink.route as never);
      setPendingRichLink(null);
      return;
    }

    if (pendingRichLink.externalUrl) {
      richLinkSheetTranslateY.value = 0;
      void Linking.openURL(pendingRichLink.externalUrl).catch(() => undefined);
      setPendingRichLink(null);
    }
  }, [pendingRichLink, richLinkSheetTranslateY, router]);

  const richLinkSheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: richLinkSheetTranslateY.value }],
  }));

  const richLinkSheetGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([8, 9999])
        .failOffsetX([-20, 20])
        .shouldCancelWhenOutside(false)
        .onUpdate((event) => {
          'worklet';
          richLinkSheetTranslateY.value = Math.max(0, event.translationY);
        })
        .onEnd((event) => {
          'worklet';

          if (event.translationY > 90 || event.velocityY > 900) {
            runOnJS(closeRichLinkSheet)();
            return;
          }

          richLinkSheetTranslateY.value = withTiming(0, { duration: 160 });
        }),
    [closeRichLinkSheet, richLinkSheetTranslateY]
  );

  const renderRichAudioBulletLines = (
    inlines: LessonRichInline[] | null | undefined,
    keyPrefix: string,
    options?: {
      enableHighlights?: boolean;
      phraseId?: string;
      phraseVariant?: number | null;
      isPhraseCard?: boolean;
      phraseShowDivider?: boolean;
      phraseIsLeadAudio?: boolean;
    }
  ) => {
    if (!Array.isArray(inlines) || !inlines.length) {
      return null;
    }

    const normalizedSpans: (LessonRichInline | { text: '\n'; isBreak: true })[] = [];
    inlines.forEach((inline) => {
      const textValue = cleanAudioTags(resolveRichInlineText(inline, contentLang));
      if (!textValue) {
        return;
      }

      const parts = textValue.split('\n');
      parts.forEach((part, partIndex) => {
        const normalizedPart = options?.isPhraseCard && partIndex > 0 ? part.replace(/^\s+/, '') : part;
        if (normalizedPart) {
          normalizedSpans.push({ ...inline, text: normalizedPart });
        }
        if (partIndex < parts.length - 1) {
          normalizedSpans.push({ text: '\n', isBreak: true });
        }
      });
    });

    let lines: LessonRichInline[][] = [];
    let currentLine: LessonRichInline[] = [];

    normalizedSpans.forEach((span) => {
      if ('isBreak' in span && span.isBreak) {
        lines.push(currentLine);
        currentLine = [];
        return;
      }
      currentLine.push(span as LessonRichInline);
    });
    if (currentLine.length) {
      lines.push(currentLine);
    }

    const splitLineSpansAtOffsets = (lineSpans: LessonRichInline[], splitOffsets: number[]) => {
      if (!splitOffsets.length) {
        return [lineSpans];
      }

      const sortedOffsets = [...splitOffsets].sort((a, b) => a - b);
      const partitions: LessonRichInline[][] = [];
      let currentPartition: LessonRichInline[] = [];
      let activeBoundaryIndex = 0;
      let lineCursor = 0;
      let trimLeadingWhitespaceForNextPartition = false;

      lineSpans.forEach((span) => {
        const rawText = String(span.text ?? '');
        if (!rawText) {
          return;
        }

        let localCursor = 0;
        while (localCursor < rawText.length) {
          const nextBoundary = sortedOffsets[activeBoundaryIndex];
          const spanAbsoluteStart = lineCursor + localCursor;

          if (typeof nextBoundary === 'number' && spanAbsoluteStart >= nextBoundary) {
            if (currentPartition.length) {
              partitions.push(currentPartition);
              currentPartition = [];
            }
            activeBoundaryIndex += 1;
            continue;
          }

          const sliceEnd =
            typeof nextBoundary === 'number'
              ? Math.min(rawText.length, localCursor + (nextBoundary - spanAbsoluteStart))
              : rawText.length;

          const sliceText = rawText.slice(localCursor, sliceEnd);
          const normalizedSliceText = trimLeadingWhitespaceForNextPartition ? sliceText.replace(/^\s+/, '') : sliceText;
          trimLeadingWhitespaceForNextPartition = false;
          if (normalizedSliceText) {
            currentPartition.push({ ...span, text: normalizedSliceText });
          }
          localCursor = sliceEnd;

          if (typeof nextBoundary === 'number' && lineCursor + localCursor >= nextBoundary) {
            if (currentPartition.length) {
              partitions.push(currentPartition);
              currentPartition = [];
            }
            activeBoundaryIndex += 1;
            trimLeadingWhitespaceForNextPartition = true;
          }
        }

        lineCursor += rawText.length;
      });

      if (currentPartition.length) {
        partitions.push(currentPartition);
      }

      return partitions.length ? partitions : [lineSpans];
    };

    const getPhraseSpeakerTurnSplitOffsets = (lineText: string) => {
      if (!options?.isPhraseCard || !isSpeakerLineText(lineText)) {
        return [];
      }

      const matches = [...lineText.matchAll(PHRASE_SPEAKER_TURN_RE)];
      const firstMatchIndex = matches[0]?.index ?? -1;
      if (!matches.length || firstMatchIndex < 0 || lineText.slice(0, firstMatchIndex).trim().length > 0) {
        return [];
      }

      return matches
        .map((match) => match.index ?? -1)
        .filter((index) => index > 0 && /\s/.test(lineText[index - 1] ?? ''));
    };

    if (options?.isPhraseCard) {
      lines = lines.flatMap((lineSpans) => {
        const lineText = lineSpans.map((span) => String(span.text ?? '')).join('');
        const splitOffsets = getPhraseSpeakerTurnSplitOffsets(lineText);
        return splitLineSpansAtOffsets(lineSpans, splitOffsets);
      });
    }

    if (options?.isPhraseCard) {
      lines = lines.map((lineSpans, lineIndex) => {
        if (lineIndex === 0) {
          return lineSpans;
        }

        let trimmedLeadingWhitespace = false;

        return lineSpans
          .map((span) => {
            if (trimmedLeadingWhitespace) {
              return span;
            }

            const rawText = String(span.text ?? '');
            const trimmedText = rawText.replace(/^\s+/, '');

            if (trimmedText.length === rawText.length) {
              trimmedLeadingWhitespace = true;
              return span;
            }

            if (!trimmedText) {
              return null;
            }

            trimmedLeadingWhitespace = true;
            return { ...span, text: trimmedText };
          })
          .filter((span): span is LessonRichInline => Boolean(span));
      });
    }

    const lineMetadata = lines.map((lineSpans) => {
      const lineText = lineSpans.map((span) => String(span.text ?? '')).join('');
      const speakerPrefixMatch = lineText.match(SPEAKER_PREFIX_RE);
      const speakerPrefix = speakerPrefixMatch?.[1] ?? '';
      const isSpeakerLine = isSpeakerLineText(lineText);
      const thaiSpeakerState = speakerLineIsThai(lineText);
      const isThaiLineForPhraseCard =
        thaiSpeakerState === true || (!isSpeakerLine && THAI_TEXT_RE.test(lineText));
      const firstThaiCharIndex = lineText.search(THAI_TEXT_RE);

      return {
        lineText,
        speakerPrefix,
        speakerPrefixLength: speakerPrefix.length,
        isSpeakerLine,
        isEnglishSpeakerLine: isEnglishSpeakerLineText(lineText),
        isThaiLineForPhraseCard,
        firstThaiCharIndex,
      };
    });

    const shouldShowHighlightFor = (inline: LessonRichInline) => {
      const highlightColor = typeof inline.highlight === 'string' ? inline.highlight.trim().toLowerCase() : '';
      return options?.enableHighlights === true && UNDERSTAND_HIGHLIGHTS.has(highlightColor);
    };

    const renderLineContent = (lineSpans: LessonRichInline[], lineIndex: number) => {
      const lineMeta = lineMetadata[lineIndex];
      const lineText = lineMeta?.lineText ?? lineSpans.map((span) => String(span.text ?? '')).join('');
      const isThaiLine = options?.isPhraseCard
        ? Boolean(lineMeta?.isThaiLineForPhraseCard)
        : contentLang === 'th' && THAI_TEXT_RE.test(lineText);
      const firstThaiCharIndex = typeof lineMeta?.firstThaiCharIndex === 'number' ? lineMeta.firstThaiCharIndex : -1;
      const speakerPrefixLength = lineMeta?.speakerPrefixLength ?? 0;
      let lineOffset = 0;
      const renderedSpans: React.ReactNode[] = [];

      const getNearestVisibleChar = (startIndex: number, direction: -1 | 1) => {
        let cursor = startIndex;
        while (cursor >= 0 && cursor < lineText.length) {
          const char = lineText[cursor];
          if (char && !/\s/.test(char)) {
            return char;
          }
          cursor += direction;
        }
        return '';
      };

      lineSpans.forEach((inline, spanIndex) => {
        const rawText = String(inline.text ?? '');
        if (!rawText) {
          return;
        }

        const spanOffset = lineOffset;
        lineOffset += rawText.length;
        const highlightColor =
          typeof inline.highlight === 'string' ? inline.highlight.trim().toLowerCase() : '';
        const shouldShowHighlight = shouldShowHighlightFor(inline);
        const isLink = typeof inline.link === 'string' && inline.link.trim().length > 0;

        const markerAwareParts = rawText.split(INLINE_MARKER_RE).filter((part) => part !== '');
        let consumedChars = 0;

        markerAwareParts.forEach((part, partIndex) => {
          const markerColor = INLINE_MARKER_COLORS[part];
          if (markerColor) {
            renderedSpans.push(
              <Text
                key={`${keyPrefix}-line-${lineIndex}-${spanIndex}-marker-${partIndex}-${renderedSpans.length}`}
                onPress={isLink
                  ? () => handleOpenRichLink(inline.link as string)
                  : undefined}
                style={[
                  ...getRichInlineSegmentStyle('en', inline, {
                    shouldShowHighlight,
                    highlightColor,
                    isLink,
                  }),
                  styles.richInlineMarker,
                  markerColor === '#FD6969' ? styles.richInlineMarkerRed : null,
                  markerColor === '#3CA0FE' ? styles.richInlineMarkerBlue : null,
                  markerColor === '#28A265' ? styles.richInlineMarkerGreen : null,
                ]}>
                {INLINE_MARKER_DISPLAY[part] ?? part}
              </Text>
            );
            consumedChars += part.length;
            return;
          }

          const pieces = part
            .split(/([\u0E00-\u0E7F]+|\d+(?:[.,]\d+)?|[.,!?;:'"(){}\[\]<>\\/\-–—…]+)/)
            .filter((piece) => piece !== '');

          pieces.forEach((piece, pieceIndex) => {
            const pieceStart = consumedChars;
            const pieceEnd = pieceStart + piece.length;
            consumedChars = pieceEnd;

            const globalPieceStart = spanOffset + pieceStart;
            const globalPieceEnd = spanOffset + pieceEnd;
            const shouldMutePiece =
              options?.isPhraseCard && isThaiLine && firstThaiCharIndex >= 0
                ? globalPieceEnd > firstThaiCharIndex
                : isThaiLine;
            const pieceWithinSpeakerPrefix = speakerPrefixLength > 0 && globalPieceStart < speakerPrefixLength;
            const pieceCrossesSpeakerBoundary = speakerPrefixLength > 0 && globalPieceEnd > speakerPrefixLength;

            const pushPiece = (text: string, extraStyle?: object | null) => {
              renderedSpans.push(
                <React.Fragment
                  key={`${keyPrefix}-line-${lineIndex}-${spanIndex}-${partIndex}-${pieceIndex}-${renderedSpans.length}`}>
                  {renderRichTextScriptSegments(text, `${keyPrefix}-line-${lineIndex}-${spanIndex}-${partIndex}-${pieceIndex}-${renderedSpans.length}`, inline, {
                    muted: shouldMutePiece,
                    isLink,
                    shouldShowHighlight,
                    highlightColor,
                    extraStyle,
                  })}
                </React.Fragment>
              );
            };

            if (pieceWithinSpeakerPrefix) {
              if (pieceCrossesSpeakerBoundary) {
                const prefixLengthInsidePiece = speakerPrefixLength - globalPieceStart;
                const prefixPart = piece.slice(0, prefixLengthInsidePiece);
                const restPart = piece.slice(prefixLengthInsidePiece);
                pushPiece(prefixPart, shouldMutePiece ? styles.richSpeakerPrefixThai : styles.richSpeakerPrefix);
                if (restPart) {
                  pushPiece(restPart);
                }
              } else {
                pushPiece(piece, shouldMutePiece ? styles.richSpeakerPrefixThai : styles.richSpeakerPrefix);
              }
            } else {
              pushPiece(piece);
            }
          });
        });
      });

      return renderedSpans;
    };

    return (
      <View style={styles.richAudioLineStack}>
        {lines.map((lineSpans, lineIndex) => (
          <AppText
            key={`${keyPrefix}-row-${lineIndex}`}
            language={contentLang}
            variant="body"
            style={[
              styles.understandAudioText,
              contentLang === 'th' ? styles.richThaiTextCompact : null,
              options?.compactBody ? styles.richBodyTextCompact : null,
              options?.isPhraseCard ? styles.phraseAudioText : null,
              styles.richAudioTextCompact,
              options?.isPhraseCard ? styles.phraseAudioTextCompact : null,
              options?.isPhraseCard && lineMetadata[lineIndex]?.isEnglishSpeakerLine ? styles.phraseDialogueEnglishTurn : null,
              options?.isPhraseCard && lineMetadata[lineIndex]?.isThaiLineForPhraseCard ? styles.phraseDialogueThaiTurn : null,
              options?.isPhraseCard && options.phraseIsLeadAudio ? styles.phraseLeadAudioText : null,
            ]}>
            {renderLineContent(lineSpans, lineIndex)}
          </AppText>
        ))}
      </View>
    );
  };

  const renderRichInlines = (
    inlines: LessonRichInline[] | null | undefined,
    keyPrefix: string,
    options?: {
      enableHighlights?: boolean;
      muteThaiInAudioRow?: boolean;
      lineIsThaiOverride?: boolean;
      isSubheader?: boolean;
      forceSemibold?: boolean;
    }
  ) => {
    const mergedInlines = mergeAdjacentRichInlines(inlines, contentLang);
    if (!mergedInlines.length) {
      return null;
    }

    return mergedInlines.map((inline, index) => {
      const textValue = String(inline.text ?? '');
      if (!textValue) {
        return null;
      }

      const highlightColor =
        typeof inline.highlight === 'string' ? inline.highlight.trim().toLowerCase() : '';
      const shouldShowHighlight = options?.enableHighlights === true && UNDERSTAND_HIGHLIGHTS.has(highlightColor);
      const renderThaiSegments = (part: string, partKey: string) => {
        if (options?.muteThaiInAudioRow !== true && options?.lineIsThaiOverride !== true) {
          return renderRichTextScriptSegments(part, `${partKey}-plain`, inline, {
            isSubheader: options?.isSubheader,
            forceSemibold: options?.forceSemibold,
            shouldShowHighlight,
            highlightColor,
            isLink: typeof inline.link === 'string' && inline.link.trim().length > 0,
          });
        }

        const lines = part.split('\n');

        return lines.flatMap((line, lineIndex) => {
          const lineKey = `${partKey}-line-${lineIndex}`;
          const isThaiLine =
            options?.lineIsThaiOverride === true || (contentLang === 'th' && THAI_TEXT_RE.test(line));
          const speakerPrefixMatch = line.match(SPEAKER_PREFIX_RE);
          const speakerPrefix = speakerPrefixMatch?.[1] ?? '';
          const bodyText = speakerPrefix ? line.slice(speakerPrefix.length) : line;

          const renderLinePieces = (text: string, bodyKey: string) => {
            const markerParts = text.split(INLINE_MARKER_RE).filter(Boolean);
            if (markerParts.length > 1) {
              return markerParts.flatMap((part, partIndex) => {
                const markerColor = INLINE_MARKER_COLORS[part];
                if (markerColor) {
                  return (
                    <Text
                      key={`${bodyKey}-marker-${partIndex}`}
                      style={[
                        ...getRichInlineSegmentStyle('en', inline, {
                          isSubheader: options?.isSubheader,
                          forceSemibold: options?.forceSemibold,
                          shouldShowHighlight,
                          highlightColor,
                          isLink: typeof inline.link === 'string' && inline.link.trim().length > 0,
                        }),
                        styles.richInlineMarker,
                        markerColor === '#FD6969' ? styles.richInlineMarkerRed : null,
                        markerColor === '#3CA0FE' ? styles.richInlineMarkerBlue : null,
                        markerColor === '#28A265' ? styles.richInlineMarkerGreen : null,
                      ]}>
                      {INLINE_MARKER_DISPLAY[part] ?? part}
                    </Text>
                  );
                }

                const pieces = part
                  .split(/([\u0E00-\u0E7F]+|\d+(?:[.,]\d+)?|[.,!?;:'"(){}\[\]<>\\/\-–—…]+)/)
                  .filter(Boolean);

                return pieces.map((piece, pieceIndex) => {
                  const shouldMutePiece = isThaiLine;

                  return (
                    <React.Fragment key={`${bodyKey}-${partIndex}-${pieceIndex}`}>
                      {renderRichTextScriptSegments(piece, `${bodyKey}-${partIndex}-${pieceIndex}`, inline, {
                        isSubheader: options?.isSubheader,
                        forceSemibold: options?.forceSemibold,
                        muted: shouldMutePiece,
                        shouldShowHighlight,
                        highlightColor,
                        isLink: typeof inline.link === 'string' && inline.link.trim().length > 0,
                      })}
                    </React.Fragment>
                  );
                });
              });
            }

            const pieces = text
            .split(/([\u0E00-\u0E7F]+|\d+(?:[.,]\d+)?|[.,!?;:'"(){}\[\]<>\\/\-–—…]+)/)
            .filter(Boolean);

            return pieces.map((piece, pieceIndex) => {
              const shouldMutePiece = isThaiLine;

              return (
                <React.Fragment key={`${bodyKey}-${pieceIndex}`}>
                  {renderRichTextScriptSegments(piece, `${bodyKey}-${pieceIndex}`, inline, {
                    isSubheader: options?.isSubheader,
                    forceSemibold: options?.forceSemibold,
                    muted: shouldMutePiece,
                    shouldShowHighlight,
                    highlightColor,
                    isLink: typeof inline.link === 'string' && inline.link.trim().length > 0,
                  })}
                </React.Fragment>
              );
            });
          };

          const renderedLine: React.ReactNode[] = [];

          if (speakerPrefix) {
            const isEnglishSpeaker = /^[A-Za-z]/.test(speakerPrefix.trimStart());
            renderedLine.push(
              <Text
                key={`${lineKey}-speaker`}
                style={[
                  ...getRichInlineSegmentStyle(isEnglishSpeaker ? 'en' : 'th', inline, {
                    isSubheader: options?.isSubheader,
                    forceSemibold: options?.forceSemibold,
                    shouldShowHighlight,
                    highlightColor,
                    isLink: typeof inline.link === 'string' && inline.link.trim().length > 0,
                  }),
                  styles.richSpeakerPrefix,
                  isEnglishSpeaker ? null : styles.richSpeakerPrefixThai,
                ]}>
                {speakerPrefix}
              </Text>
            );
          }

          renderedLine.push(...renderLinePieces(bodyText, `${lineKey}-body`));

          if (lineIndex < lines.length - 1) {
            renderedLine.push(
              <Text
                key={`${lineKey}-break`}
                style={[
                  ...getRichInlineSegmentStyle('en', inline, {
                    isSubheader: options?.isSubheader,
                    forceSemibold: options?.forceSemibold,
                    shouldShowHighlight,
                    highlightColor,
                    isLink: typeof inline.link === 'string' && inline.link.trim().length > 0,
                  }),
                  options?.muteThaiInAudioRow === true ? styles.richAudioLineBreakGap : null,
                ]}>
                {'\n'}
              </Text>
            );
          }

          return renderedLine;
        });
      };
      const textParts = textValue.split(INLINE_MARKER_RE).filter(Boolean);
      const renderedText =
        textParts.length > 1 ? (
          <Text key={`${keyPrefix}-${index}`} style={styles.richInlineText}>
            {textParts.map((part, partIndex) => {
              const markerColor = INLINE_MARKER_COLORS[part];

              if (!markerColor) {
                return renderThaiSegments(part, `${keyPrefix}-${index}-${partIndex}`);
              }

              return (
                <Text
                  key={`${keyPrefix}-${index}-${partIndex}`}
                  style={[
                    ...getRichInlineSegmentStyle('en', inline, {
                      isSubheader: options?.isSubheader,
                      forceSemibold: options?.forceSemibold,
                      shouldShowHighlight,
                      highlightColor,
                      isLink: typeof inline.link === 'string' && inline.link.trim().length > 0,
                    }),
                    styles.richInlineMarker,
                    markerColor === '#FD6969' ? styles.richInlineMarkerRed : null,
                    markerColor === '#3CA0FE' ? styles.richInlineMarkerBlue : null,
                    markerColor === '#28A265' ? styles.richInlineMarkerGreen : null,
                  ]}>
                  {INLINE_MARKER_DISPLAY[part] ?? part}
                </Text>
              );
            })}
          </Text>
        ) : (
          <Text key={`${keyPrefix}-${index}`} style={styles.richInlineText}>
            {renderThaiSegments(textValue, `${keyPrefix}-${index}`)}
          </Text>
        );

      if (typeof inline.link === 'string' && inline.link.trim()) {
        return (
          <Text
            key={`${keyPrefix}-${index}`}
            onPress={() => handleOpenRichLink(inline.link as string)}
            style={styles.richInlineLink}>
            {renderedText}
          </Text>
        );
      }

      return renderedText;
    });
  };

  const renderRichAudioRow = (
    node: LessonRichNode,
    nodeKey: string,
    textIndentStyle: object | null,
    hasAccent: boolean,
    options?: {
      enableHighlights?: boolean;
      phraseId?: string;
      phraseVariant?: number | null;
      isPhraseCard?: boolean;
      phraseShowDivider?: boolean;
      phraseIsLeadAudio?: boolean;
    }
  ) => {
    const audioTextColumnStyle = addColumnOffset(textIndentStyle, RICH_AUDIO_COLUMN_EXTRA_OFFSET);
    const accentTextColumnStyle = addColumnOffset(textIndentStyle, RICH_ACCENT_COLUMN_EXTRA_OFFSET);
    const snippet =
      getSnippetForNode(node, snippetIndex) ??
      getPhraseSnippetForNode(node, phraseSnippetIndex, options?.phraseId, options?.phraseVariant);
    const audioKey = snippet?.audio_key?.trim() || node.audio_key?.trim() || null;
    const isPlaying = Boolean(audioKey) && playingSnippetKey === audioKey;
    const isLoading = Boolean(audioKey) && activeSnippetKey === audioKey && isSnippetLoading;
    const hasSpeakerPrefix = richNodeHasSpeakerPrefix(node, contentLang);
    const shouldUseCompactAudioSpacing = !hasSpeakerPrefix;
    const audioButton = (
      <LessonSnippetAudioButton
        accessibilityLabel={
          pageLanguage === 'th'
            ? (isPlaying ? 'หยุดเสียงตัวอย่าง' : 'เล่นเสียงตัวอย่าง')
            : isPlaying
              ? 'Pause example audio'
              : 'Play example audio'
        }
        disabled={!snippet}
        isLoading={isLoading}
        isPlaying={isPlaying}
        onPress={() => {
          void handleToggleSnippet(snippet);
        }}
        style={
          options?.isPhraseCard
            ? [
                options.phraseIsLeadAudio
                  ? styles.phraseLeadAudioButtonOffset
                  : styles.phraseAudioButtonOffset,
              ]
            : [
                styles.richAudioMarkerButton,
                options?.isPhraseCard
                  ? options.phraseIsLeadAudio
                    ? styles.phraseLeadAudioButtonOffset
                    : styles.phraseAudioButtonOffset
                  : null,
              ]
        }
      />
    );

    if (options?.isPhraseCard) {
      return (
        <View
          key={nodeKey}
          style={[
            styles.phraseAudioBlock,
            shouldUseCompactAudioSpacing ? styles.phraseAudioBlockCompact : null,
            !options.phraseIsLeadAudio ? styles.phraseAudioBlockAfterFirst : null,
          ]}>
          {options.phraseShowDivider ? <View style={styles.phraseDivider} /> : null}
          <View style={[styles.phraseAudioContainedRow, shouldUseCompactAudioSpacing ? styles.phraseAudioContainedRowCompact : null]}>
            <View style={styles.phraseAudioMarkerLane}>
              {hasAccent ? <View style={styles.phraseAccentMarkerInline} /> : null}
              {audioButton}
            </View>
            <View style={styles.phraseAudioContentLane}>
              {renderRichAudioBulletLines(node.inlines, nodeKey, options)}
            </View>
          </View>
        </View>
      );
    }

    return (
      <View
        key={nodeKey}
        style={[
          styles.phraseAudioBlock,
          shouldUseCompactAudioSpacing ? styles.phraseAudioBlockCompact : null,
          options?.isPhraseCard && !options.phraseIsLeadAudio ? styles.phraseAudioBlockAfterFirst : null,
        ]}>
        {options?.isPhraseCard && options.phraseShowDivider ? <View style={styles.phraseDivider} /> : null}
        <View
          style={[
            styles.richTextColumnLane,
            options?.isPhraseCard ? styles.phraseAudioRow : null,
            options?.isPhraseCard && shouldUseCompactAudioSpacing ? styles.phraseAudioRowCompact : null,
            hasAccent ? accentTextColumnStyle : audioTextColumnStyle,
          ]}>
          {hasAccent ? <View style={styles.richAccentMarker} /> : null}
          {audioButton}
          <View style={styles.richAudioTextWrap}>
            {renderRichAudioBulletLines(node.inlines, nodeKey, options)}
          </View>
        </View>
      </View>
    );
  };

  const renderPhraseDialogueParagraph = (
    node: LessonRichNode,
    nodeKey: string,
    textIndentStyle: object | null,
    hasAccent: boolean,
    options?: {
      enableHighlights?: boolean;
      phraseId?: string;
      phraseVariant?: number | null;
      isPhraseCard?: boolean;
      phraseIsLeadAudio?: boolean;
    }
  ) => {
    const dialogueText = getApplyNodeText(node, contentLang);
    const firstDialogueLine = dialogueText.split('\n')[0]?.trim() ?? '';
    const startsEnglishDialogueTurn = isEnglishSpeakerLineText(firstDialogueLine);
    const isThaiDialogueTurn = speakerLineIsThai(firstDialogueLine) === true;

    return (
      <View
        key={nodeKey}
        style={[
          styles.richTextColumnLane,
          startsEnglishDialogueTurn ? styles.phraseDialogueEnglishTurn : null,
          isThaiDialogueTurn ? styles.phraseDialogueThaiTurn : null,
          hasAccent ? addColumnOffset(textIndentStyle, RICH_ACCENT_COLUMN_EXTRA_OFFSET) : textIndentStyle,
        ]}>
        {hasAccent ? <View style={styles.richAccentMarker} /> : null}
        {renderRichAudioBulletLines(node.inlines, nodeKey, {
          enableHighlights: options?.enableHighlights,
          phraseId: options?.phraseId,
          phraseVariant: options?.phraseVariant,
          isPhraseCard: true,
          phraseIsLeadAudio: options?.phraseIsLeadAudio,
        })}
      </View>
    );
  };

  const getSnippetForAudioKey = (audioKey: string) => {
    const normalizedKey = audioKey.trim();
    if (!normalizedKey) {
      return null;
    }

    const keyCandidates = [normalizedKey];
    if (normalizedKey.includes('_')) {
      const [prefix, suffix] = normalizedKey.split(/_(?=[^_]+$)/);
      if (prefix && /^\d+$/.test(suffix ?? '')) {
        keyCandidates.push(`${prefix}_${Number(suffix)}`);
        keyCandidates.push(`${prefix}_${String(Number(suffix)).padStart(2, '0')}`);
      }
    }

    for (const key of keyCandidates) {
      const snippet = snippetIndex.byKey[key] ?? phraseSnippetIndex.byKey[key] ?? null;
      if (snippet) {
        return snippet;
      }
    }

    return null;
  };

  const renderPracticeItemAudioButton = (audioKeyValue: string | null | undefined, keyPrefix: string) => {
    const audioKey = audioKeyValue?.trim();
    if (!audioKey) {
      return null;
    }

    const snippet = getSnippetForAudioKey(audioKey);
    const resolvedAudioKey = snippet?.audio_key?.trim() || audioKey;
    const isPlaying = playingSnippetKey === resolvedAudioKey;
    const isLoading = activeSnippetKey === resolvedAudioKey && isSnippetLoading;

    return (
      <View key={`${keyPrefix}-audio`} style={styles.practiceItemAudioRow}>
        <LessonSnippetAudioButton
          accessibilityLabel={
            pageLanguage === 'th'
              ? isPlaying
                ? 'หยุดเสียงแบบฝึกหัด'
                : 'เล่นเสียงแบบฝึกหัด'
              : isPlaying
                ? 'Pause practice audio'
                : 'Play practice audio'
          }
          disabled={!snippet}
          isLoading={isLoading}
          isPlaying={isPlaying}
          onPress={() => {
            void handleToggleSnippet(snippet);
          }}
        />
        <AppText language={pageLanguage} variant="caption" style={styles.practiceItemAudioLabel}>
          {pageLanguage === 'th' ? 'ฟังเสียง' : 'Listen'}
        </AppText>
      </View>
    );
  };

  const renderRichTableCellText = (
    cell: unknown,
    cellKey: string,
    options?: {
      phraseId?: string;
      phraseVariant?: number | null;
      isHeaderRow?: boolean;
    }
  ) => {
    const normalizedCell = (() => {
      if (cell && typeof cell === 'object') {
        const record = cell as Record<string, unknown>;
        return {
          text: String(record.text ?? ''),
          inlines: Array.isArray(record.inlines) ? (record.inlines as LessonRichInline[]) : null,
        };
      }

      return {
        text: String(cell ?? ''),
        inlines: null,
      };
    })();

    const sourceInlines =
      Array.isArray(normalizedCell.inlines) && normalizedCell.inlines.length > 0
        ? normalizedCell.inlines
        : [{ text: normalizedCell.text, bold: false, italic: false, underline: false, link: null }];

    const lines: { inlines: LessonRichInline[]; audioKeys: string[] }[] = [];
    let currentLine: { inlines: LessonRichInline[]; audioKeys: string[] } = { inlines: [], audioKeys: [] };

    const pushCurrentLine = () => {
      lines.push(currentLine);
      currentLine = { inlines: [], audioKeys: [] };
    };

    sourceInlines.forEach((inline) => {
      const rawText = typeof inline?.text === 'string' ? inline.text : '';
      const parts = rawText.split('\n');

      parts.forEach((part, partIndex) => {
        const { cleanText, audioKeys } = parseAudioTaggedText(part);
        if (audioKeys.length > 0) {
          currentLine.audioKeys.push(...audioKeys);
        }
        if (cleanText) {
          currentLine.inlines.push({
            ...inline,
            text: cleanText,
          });
        }
        if (partIndex < parts.length - 1) {
          pushCurrentLine();
        }
      });
    });

    if (currentLine.inlines.length > 0 || currentLine.audioKeys.length > 0 || lines.length === 0) {
      lines.push(currentLine);
    }

    return lines.map((line, lineIndex) => {
      const snippet = line.audioKeys.length ? getSnippetForAudioKey(line.audioKeys[0]) : null;
      const audioKey = snippet?.audio_key?.trim() || line.audioKeys[0]?.trim() || null;
      const isPlaying = Boolean(audioKey) && playingSnippetKey === audioKey;
      const isLoading = Boolean(audioKey) && activeSnippetKey === audioKey && isSnippetLoading;
      const hasText = line.inlines.some((inline) => String(inline.text ?? '').length > 0);
      const textValue = hasText ? null : line.audioKeys.length ? '' : normalizedCell.text.trim();
      const lineText = line.inlines.map((inline) => String(inline.text ?? '')).join('');
      const previousLineHasAudio = lineIndex > 0 && (lines[lineIndex - 1]?.audioKeys.length ?? 0) > 0;
      const lineIsThaiOnly = THAI_TEXT_RE.test(lineText) && !/[A-Za-z]/.test(lineText);
      const lineIsThaiOverride = lineIsThaiOnly && line.audioKeys.length === 0 && previousLineHasAudio;

      if (line.audioKeys.length) {
        return (
          <View key={`${cellKey}-line-${lineIndex}`} style={styles.richTableAudioLine}>
            <LessonSnippetAudioButton
              accessibilityLabel={
                pageLanguage === 'th'
                  ? (isPlaying ? 'หยุดเสียงตัวอย่าง' : 'เล่นเสียงตัวอย่าง')
                  : isPlaying
                    ? 'Pause example audio'
                    : 'Play example audio'
              }
              disabled={!snippet}
              isLoading={isLoading}
              isPlaying={isPlaying}
              onPress={() => {
                void handleToggleSnippet(snippet);
              }}
            />
            <AppText
              language={contentLang}
              variant="body"
              style={[styles.richTableAudioText, contentLang === 'th' ? styles.richThaiTableTextCompact : null]}>
              {hasText
                ? renderRichInlines(line.inlines, `${cellKey}-audio-line-${lineIndex}`, {
                    forceSemibold: options?.isHeaderRow,
                  })
                : textValue || ' '}
            </AppText>
          </View>
        );
      }

      if (!hasText) {
        return null;
      }

      return (
        <AppText
          key={`${cellKey}-line-${lineIndex}`}
          language={contentLang}
          variant="body"
          style={[
            styles.richTableCellText,
            contentLang === 'th' ? styles.richThaiTableTextCompact : null,
            options?.isHeaderRow ? styles.richTableHeaderText : null,
          ]}>
          {renderRichInlines(line.inlines, `${cellKey}-line-${lineIndex}`, {
            forceSemibold: options?.isHeaderRow,
            lineIsThaiOverride,
          })}
        </AppText>
      );
    });
  };

  const renderRichTable = (
    node: LessonRichNode,
    nodeKey: string,
    options?: {
      enableHighlights?: boolean;
      phraseId?: string;
      phraseVariant?: number | null;
    }
  ) => {
    const rows = Array.isArray(node.cells) ? node.cells : [];
    if (!rows.length) {
      return null;
    }

    const getRawCellText = (cell: unknown) => {
      if (typeof cell === 'string') {
        return cell;
      }

      if (cell && typeof cell === 'object' && 'text' in cell) {
        return String(cell.text ?? '');
      }

      return '';
    };

    const isMeaningfulTableCell = (cell: unknown) => {
      if (cell == null) {
        return false;
      }

      const textValue = getRawCellText(cell).trim();
      if (textValue) {
        return true;
      }

      return Boolean(
        cell &&
        typeof cell === 'object' &&
        'colspan' in cell &&
        typeof cell.colspan === 'number' &&
        cell.colspan > 1
      );
    };

    const columnCount = rows.reduce((max, row) => {
      const columns = (Array.isArray(row) ? row : []).reduce((sum, cell) => {
        if (cell && typeof cell === 'object' && 'colspan' in cell && typeof cell.colspan === 'number' && cell.colspan > 1) {
          return sum + cell.colspan;
        }
        return sum + 1;
      }, 0);
      return Math.max(max, columns);
    }, 0);
    const normalizedRows = rows.map((row) => {
      const sourceRow = Array.isArray(row) ? row : [];
      let normalizedRow = [...sourceRow];

      while (normalizedRow.length > 1 && !isMeaningfulTableCell(normalizedRow[normalizedRow.length - 1])) {
        normalizedRow.pop();
      }

      return normalizedRow;
    });
    const preferredColumnCount = (() => {
      const headerRow = normalizedRows[0] ?? [];
      const headerColumns = headerRow.reduce((sum, cell) => {
        if (cell && typeof cell === 'object' && 'colspan' in cell && typeof cell.colspan === 'number' && cell.colspan > 1) {
          return sum + cell.colspan;
        }
        return sum + 1;
      }, 0);

      return Math.max(1, headerColumns || columnCount || 1);
    })();
    const shouldConstrainToViewport = !isTabletLessonLayout;
    const minTableWidth = Math.max(340, preferredColumnCount * 116);
    const columnPixelWidth = minTableWidth / preferredColumnCount;
    const tableContent = (
      <View
        style={[
          styles.richTableWrap,
          shouldConstrainToViewport ? styles.richTableWrapConstrained : null,
          shouldConstrainToViewport ? { width: '100%' } : { minWidth: minTableWidth },
        ]}>
        {normalizedRows.map((row, rowIndex) => {
          const isHeaderRow = rowIndex === 0;
          let normalizedRow = [...row];

          if (normalizedRow.length === 1 && preferredColumnCount > 1) {
            const onlyCell = normalizedRow[0];
            const nextColspan =
              onlyCell && typeof onlyCell === 'object'
                ? ('colspan' in onlyCell && typeof onlyCell.colspan === 'number' && onlyCell.colspan > 1
                    ? Math.max(onlyCell.colspan, preferredColumnCount)
                    : preferredColumnCount)
                : preferredColumnCount;

            normalizedRow = [
              onlyCell && typeof onlyCell === 'object'
                ? { ...onlyCell, colspan: nextColspan }
                : { text: getRawCellText(onlyCell), colspan: nextColspan },
            ];
          }

          return (
            <View
              key={`${nodeKey}-row-${rowIndex}`}
              style={[
                styles.richTableRow,
                isHeaderRow ? styles.richTableHeaderRow : null,
                !isHeaderRow && rowIndex % 2 === 0 ? styles.richTableAltRow : null,
              ]}>
              {(() => {
                let consumedColumns = 0;
                const shouldForceUniformColumns =
                  normalizedRow.length > 1 &&
                  normalizedRow.length === preferredColumnCount &&
                  normalizedRow.every(
                    (cell) =>
                      !(
                        cell &&
                        typeof cell === 'object' &&
                        'colspan' in cell &&
                        typeof cell.colspan === 'number' &&
                        cell.colspan > 1
                      )
                  );

                return normalizedRow.map((cell, cellIndex) => {
                  const cellBackground =
                    cell && typeof cell === 'object' && 'background' in cell && typeof cell.background === 'string'
                      ? cell.background.trim().toLowerCase()
                      : '';
                  const colSpan =
                    cell && typeof cell === 'object' && 'colspan' in cell && typeof cell.colspan === 'number' && cell.colspan > 1
                      ? cell.colspan
                      : 1;
                  const remainingCells = normalizedRow.length - cellIndex - 1;
                  const remainingColumns = Math.max(1, preferredColumnCount - consumedColumns);
                  const maxAllowedColSpan = Math.max(1, remainingColumns - remainingCells);
                  const effectiveColSpan =
                    shouldForceUniformColumns
                      ? 1
                      : cellIndex === normalizedRow.length - 1
                        ? remainingColumns
                        : Math.min(colSpan, maxAllowedColSpan);

                  consumedColumns += effectiveColSpan;

                  return (
                    <View
                      key={`${nodeKey}-cell-${rowIndex}-${cellIndex}`}
                      style={[
                        styles.richTableCell,
                        shouldConstrainToViewport
                          ? { width: `${(100 * effectiveColSpan) / Math.max(preferredColumnCount, 1)}%` }
                          : { width: columnPixelWidth * effectiveColSpan },
                        cellIndex === normalizedRow.length - 1 ? styles.richTableCellLast : null,
                        isHeaderRow ? styles.richTableHeaderCell : null,
                        options?.enableHighlights && cellBackground === '#f4cccc' ? styles.richTableCellPink : null,
                        options?.enableHighlights && cellBackground === '#d9ead3' ? styles.richTableCellGreen : null,
                        options?.enableHighlights && (cellBackground === '#c9daf7' || cellBackground === '#c9daf8')
                          ? styles.richTableCellBlue
                          : null,
                      ]}>
                      {renderRichTableCellText(cell, `${nodeKey}-cell-${rowIndex}-${cellIndex}`, {
                        ...options,
                        isHeaderRow,
                      })}
                    </View>
                  );
                });
              })()}
            </View>
          );
        })}
      </View>
    );

    if (shouldConstrainToViewport) {
      return (
        <View key={nodeKey} style={styles.richTableInlineContainer}>
          {tableContent}
        </View>
      );
    }

    return (
      <ScrollView
        key={nodeKey}
        horizontal
        bounces={false}
        contentContainerStyle={styles.richTableScrollerContent}
        showsHorizontalScrollIndicator={false}
        style={styles.richTableScroller}>
        {tableContent}
      </ScrollView>
    );
  };

  const renderRichNode = (
    node: LessonRichNode,
    index: number,
    options?: {
      keyPrefix?: string;
      allowHeadings?: boolean;
      enableHighlights?: boolean;
      numberedLabel?: string;
      phraseId?: string;
      phraseVariant?: number | null;
      isPhraseCard?: boolean;
      phraseShowDivider?: boolean;
      phraseIsLeadAudio?: boolean;
      forceSubheader?: boolean;
      compactBody?: boolean;
    }
  ) => {
    const nodeKey = `${options?.keyPrefix ?? 'rich-node'}-${index}`;
    const textIndentStyle = getRichTextIndentStyle(node);
    const bulletRowIndentStyle = getRichRowIndentStyle(node, RICH_BULLET_MARKER_SPAN);
    const hasAccent = applyNodeHasAccent(node);
    const hasAudio = Boolean(node.audio_key || node.audio_seq);
    const normalizedNodeHeadingText = normalizeForcedSubheaderText(getNodeHeadingText(node, 'en'));
    const isLesson153 = activeLessonNumber === '15.3' || coverLessonNumber === '15.3';
    const forceSubheaderByLessonOverride =
      node.kind === 'paragraph' &&
      isLesson153 &&
      (normalizedNodeHeadingText === 'UND -Y' || normalizedNodeHeadingText === '-Y');

    if (options?.isPhraseCard && isPhraseLinkPlaceholderNode(node, contentLang)) {
      return null;
    }

    if (node.kind === 'spacer') {
      return <View key={nodeKey} style={styles.richSpacer} />;
    }

    if (node.kind === 'heading') {
      if (!options?.allowHeadings) {
        return null;
      }

      return (
        <AppText
          key={nodeKey}
          language={contentLang}
          variant="body"
          style={[
            styles.richParagraph,
            contentLang === 'th' ? styles.richThaiTextCompact : null,
            styles.richSubheader,
            options?.isPhraseCard ? styles.phraseHeading : null,
          ]}>
          {renderRichInlines(node.inlines, nodeKey, {
            ...options,
            isSubheader: true,
            forceSemibold: true,
          })}
        </AppText>
      );
    }

    if (node.kind === 'image') {
      const imageSource = resolveRichNodeImageSource(node, lesson?.images);
      if (!imageSource) {
        return null;
      }
      return (
        <View key={nodeKey} style={styles.richImageWrap}>
          <Image source={{ uri: imageSource }} contentFit="contain" style={styles.richImage} />
        </View>
      );
    }

    if (node.kind === 'table') {
      return renderRichTable(node, nodeKey, options);
    }

    if (node.kind === 'quick_practice_exercise') {
      const exercise = (node as QuickPracticeRichNode).exercise;
      return <View key={nodeKey}>{renderQuickPracticeExercise(exercise)}</View>;
    }

    if (node.kind === 'numbered_item') {
      if (hasAudio) {
        return renderRichAudioRow(node, nodeKey, textIndentStyle, hasAccent, options);
      }

      return (
        <View
          key={nodeKey}
          style={[
            styles.richTextColumnLane,
            textIndentStyle,
            options?.isPhraseCard ? styles.phraseListRow : null,
          ]}>
          {hasAccent ? <View style={styles.richAccentMarker} /> : null}
          <View style={styles.richNumberBadgeMarker}>
            <AppText language="en" variant="caption" style={styles.richNumberBadgeText}>
              {options?.numberedLabel ?? `${index + 1}.`}
            </AppText>
          </View>
          <AppText
            language={contentLang}
            variant="body"
            style={[
              styles.richParagraph,
              contentLang === 'th' ? styles.richThaiTextCompact : null,
              options?.compactBody ? styles.richBodyTextCompact : null,
              options?.isPhraseCard ? styles.phraseBodyText : null,
            ]}>
            {renderRichInlines(node.inlines, nodeKey, options)}
          </AppText>
        </View>
      );
    }

    if (node.kind === 'list_item' || node.kind === 'misc_item') {
      if (hasAudio) {
        return renderRichAudioRow(node, nodeKey, textIndentStyle, hasAccent, options);
      }

      return (
        <View
          key={nodeKey}
          style={[
            styles.richListRow,
            options?.isPhraseCard ? styles.phraseListRow : null,
            bulletRowIndentStyle,
          ]}>
          {hasAccent ? <View style={styles.richAccentMarker} /> : null}
          <View style={styles.richBullet} />
          <AppText
            language={contentLang}
            variant="body"
            style={[
              styles.richListText,
              contentLang === 'th' ? styles.richThaiTextCompact : null,
              options?.compactBody ? styles.richBodyTextCompact : null,
              options?.isPhraseCard ? styles.phraseBodyText : null,
            ]}>
            {renderRichInlines(node.inlines, nodeKey, options)}
          </AppText>
        </View>
      );
    }

    if (node.kind === 'paragraph') {
      if (hasAudio) {
        return renderRichAudioRow(node, nodeKey, textIndentStyle, hasAccent, options);
      }

      if (options?.isPhraseCard && richNodeHasSpeakerPrefix(node, contentLang)) {
        return renderPhraseDialogueParagraph(node, nodeKey, textIndentStyle, hasAccent, options);
      }

      const isSubheader =
        options?.forceSubheader === true || forceSubheaderByLessonOverride || isBoldParagraphNode(node);
      const paragraphText = (
        <AppText
          key={`${nodeKey}-text`}
          language={contentLang}
          variant="body"
          style={[
            styles.richParagraph,
            contentLang === 'th' ? styles.richThaiTextCompact : null,
            options?.compactBody ? styles.richBodyTextCompact : null,
            options?.isPhraseCard ? styles.phraseBodyText : null,
            isSubheader ? styles.richSubheader : null,
            isSubheader && options?.isPhraseCard ? styles.phraseSubheader : null,
          ]}>
          {renderRichInlines(node.inlines, nodeKey, {
            ...options,
            isSubheader,
            forceSemibold: options?.forceSubheader === true || forceSubheaderByLessonOverride,
          })}
        </AppText>
      );

      if (hasAccent) {
        return (
          <View key={nodeKey} style={[styles.richTextColumnLane, addColumnOffset(textIndentStyle, RICH_ACCENT_COLUMN_EXTRA_OFFSET)]}>
            <View style={styles.richAccentMarker} />
            {paragraphText}
          </View>
        );
      }

      return React.cloneElement(paragraphText, {
        key: nodeKey,
        style: [
          styles.richParagraph,
          contentLang === 'th' ? styles.richThaiTextCompact : null,
          options?.compactBody ? styles.richBodyTextCompact : null,
          textIndentStyle,
          options?.isPhraseCard ? styles.phraseBodyText : null,
          isSubheader ? styles.richSubheader : null,
          isSubheader && options?.isPhraseCard ? styles.phraseSubheader : null,
        ],
      });
    }

    return null;
  };

  const renderPrepareItemText = (node: PrepareItem['node'], nodeKey: string) => {
    const inlineText = Array.isArray(node.inlines)
      ? node.inlines.map((inline) => cleanAudioTags(resolveRichInlineText(inline, contentLang))).join('')
      : '';
    const visibleText = (inlineText || resolveNodeText(node, contentLang)).trim();
    const leadMatch = visibleText.match(/^([^:\n]+:\s*)(.*)$/);
    const leadText = leadMatch?.[1] ?? null;
    const remainderText = leadMatch?.[2] ?? null;
    const shouldBoldLead = Boolean(leadText && /[A-Za-z]/.test(leadText));

    if (shouldBoldLead) {
      return (
        <Text style={styles.prepareItemText}>
          <Text style={styles.prepareItemLeadText}>{leadText}</Text>
          {splitTextByScript(remainderText ?? '').map((segment, segmentIndex) => (
            <Text
              key={`${nodeKey}-remainder-${segmentIndex}`}
              style={segment.language === 'th' ? styles.prepareItemTextThai : styles.prepareItemTextEnglish}>
              {segment.text}
            </Text>
          ))}
        </Text>
      );
    }

    return visibleText;
  };

  const renderPrepareItem = (item: PrepareItem, isLast: boolean) => {
    const { node, originalIndex } = item;
    const nodeKey = `prepare-item-${originalIndex}`;
    const indentStyle = getPrepareIndentStyle(node);
    const snippet = getSnippetForNode(node, snippetIndex);
    const audioKey = snippet?.audio_key?.trim() || node.audio_key?.trim() || null;
    const isPlaying = Boolean(audioKey) && playingSnippetKey === audioKey;
    const isLoading = Boolean(audioKey) && activeSnippetKey === audioKey && isSnippetLoading;

    return (
      <View
        key={nodeKey}
        style={[
          styles.prepareItemRow,
          indentStyle,
        ]}>
        <View style={styles.prepareAudioSlot}>
          {snippet ? (
            <LessonSnippetAudioButton
              accessibilityLabel={
                pageLanguage === 'th'
                  ? (isPlaying ? 'หยุดเสียงตัวอย่าง' : 'เล่นเสียงตัวอย่าง')
                  : isPlaying
                    ? 'Pause example audio'
                    : 'Play example audio'
              }
              disabled={!snippet}
              isLoading={isLoading}
              isPlaying={isPlaying}
              onPress={() => {
                void handleToggleSnippet(snippet);
              }}
            />
          ) : (
            <View style={styles.prepareAudioPlaceholder}>
              <AppText language="en" variant="caption" style={styles.prepareAudioPlaceholderText}>
                ▶
              </AppText>
            </View>
          )}
        </View>

        <View style={[styles.prepareTextWrap, !isLast ? styles.prepareTextWrapWithDivider : null]}>
          {(() => {
            const renderedText = renderPrepareItemText(node, nodeKey);
            if (React.isValidElement(renderedText) && renderedText.type === Text) {
              return renderedText;
            }

            return (
              <AppText language={contentLang} variant="body" style={styles.prepareItemText}>
                {renderedText}
              </AppText>
            );
          })()}
        </View>
      </View>
    );
  };

  const renderUnderstandNode = (node: LessonRichNode, index: number) =>
    renderRichNode(node, index, { keyPrefix: 'understand-node', enableHighlights: true, compactBody: true });

  const isAudioRichNode = (node: LessonRichNode | undefined) => Boolean(node && (node.audio_key || node.audio_seq));

  const renderUnderstandGroupBody = (nodes: LessonRichNode[], keyPrefix: string) => {
    const zebraGroups: LessonRichNode[][] = [];
    let currentGroup: LessonRichNode[] = [];

    nodes.forEach((node) => {
      if (isBoldParagraphNode(node) && currentGroup.length) {
        zebraGroups.push(currentGroup);
        currentGroup = [];
      }
      currentGroup.push(node);
    });

    if (currentGroup.length) {
      zebraGroups.push(currentGroup);
    }

    let numberedIndex = 0;

    return zebraGroups.map((group, index) => (
      <View
        key={`${keyPrefix}-group-${index}`}
        style={[styles.richGroupBand, index % 2 === 0 ? styles.richGroupBandEven : styles.richGroupBandOdd]}>
        {group.map((node, nodeIndex) => {
          if (node.kind === 'numbered_item') {
            numberedIndex += 1;
            return renderRichNode(node, nodeIndex, {
              keyPrefix: 'understand-node',
              enableHighlights: true,
              numberedLabel: `${numberedIndex}.`,
              compactBody: true,
            });
          }

          return renderRichNode(node, nodeIndex, {
            keyPrefix: 'understand-node',
            enableHighlights: true,
            compactBody: true,
          });
        })}
      </View>
    ));
  };

  const renderCommonMistakeGroupBody = (nodes: LessonRichNode[], keyPrefix: string) => {
    const zebraGroups: LessonRichNode[][] = [];
    let currentGroup: LessonRichNode[] = [];

    nodes.forEach((node) => {
      if (isBoldParagraphNode(node) && currentGroup.length) {
        zebraGroups.push(currentGroup);
        currentGroup = [];
      }
      currentGroup.push(node);
    });

    if (currentGroup.length) {
      zebraGroups.push(currentGroup);
    }

    let numberedIndex = 0;

    return zebraGroups.map((group, index) => (
      <View
        key={`${keyPrefix}-group-${index}`}
        style={[styles.richGroupBand, index % 2 === 0 ? styles.richGroupBandEven : styles.richGroupBandOdd]}>
        {group.map((node, nodeIndex) => {
          const normalizedVisibleText = normalizeCommonMistakeHeadingText(getNodeHeadingText(node, contentLang));
          if (COMMON_MISTAKE_SCM_HEADING_KEYS.has(normalizedVisibleText)) {
            return null;
          }

          if (node.kind === 'numbered_item') {
            numberedIndex += 1;
            return renderRichNode(node, nodeIndex, {
              keyPrefix: 'common-mistake-node',
              enableHighlights: false,
              numberedLabel: `${numberedIndex}.`,
            });
          }

          return renderRichNode(node, nodeIndex, {
            keyPrefix: 'common-mistake-node',
            enableHighlights: false,
          });
        })}
      </View>
    ));
  };

  const renderExtraTipGroupBody = (nodes: LessonRichNode[], keyPrefix: string) => {
    const zebraGroups: LessonRichNode[][] = [];
    let currentGroup: LessonRichNode[] = [];

    nodes.forEach((node) => {
      if (isBoldParagraphNode(node) && currentGroup.length) {
        zebraGroups.push(currentGroup);
        currentGroup = [];
      }
      currentGroup.push(node);
    });

    if (currentGroup.length) {
      zebraGroups.push(currentGroup);
    }

    let numberedIndex = 0;

    return zebraGroups.map((group, index) => (
      <View
        key={`${keyPrefix}-group-${index}`}
        style={[styles.richGroupBand, index % 2 === 0 ? styles.richGroupBandEven : styles.richGroupBandOdd]}>
        {group.map((node, nodeIndex) => {
          if (node.kind === 'numbered_item') {
            numberedIndex += 1;
            return renderRichNode(node, nodeIndex, {
              keyPrefix: 'extra-tip-node',
              enableHighlights: true,
              numberedLabel: `${numberedIndex}.`,
            });
          }

          return renderRichNode(node, nodeIndex, {
            keyPrefix: 'extra-tip-node',
            enableHighlights: true,
          });
        })}
      </View>
    ));
  };

  const renderCultureNoteBody = (nodes: LessonRichNode[]) => {
    let renderedLeadHeading = false;
    const numberedCountsByIndent = new Map<number, number>();

    const getCultureNoteLeadText = (node: LessonRichNode) => {
      if (node.kind === 'heading') {
        return getNodeHeadingText(node, contentLang).trim();
      }

      return Array.isArray(node.inlines)
        ? node.inlines.map((inline) => cleanAudioTags(resolveRichInlineText(inline, contentLang))).join(' ').trim()
        : resolveNodeText(node, contentLang).trim();
    };

    const isCultureNoteLeadHeading = (node: LessonRichNode) => {
      if (renderedLeadHeading || node.audio_key || node.audio_seq) {
        return false;
      }

      if (node.kind !== 'heading' && node.kind !== 'paragraph') {
        return false;
      }

      const text = getCultureNoteLeadText(node);

      if (!text) {
        return false;
      }

      const lettersOnly = text.replace(/[^A-Za-z]/g, '');
      if (!lettersOnly) {
        return false;
      }

      return lettersOnly === lettersOnly.toUpperCase();
    };

    const resetNumberedCounters = () => {
      numberedCountsByIndent.clear();
    };

    const getNumberedLabel = (node: LessonRichNode) => {
      const indentLevel = getRichIndentLevel(node);
      const nextIndex = numberedCountsByIndent.get(indentLevel) ?? 1;
      numberedCountsByIndent.set(indentLevel, nextIndex + 1);
      return `${nextIndex}.`;
    };

    return (
      <Stack gap="sm">
        {nodes.map((node, index) => {
          if (isCultureNoteLeadHeading(node)) {
            renderedLeadHeading = true;
            resetNumberedCounters();
            return (
              <AppText key={`culture-note-lead-${index}`} language={contentLang} variant="body" style={styles.cultureNoteLeadHeading}>
                {getCultureNoteLeadText(node)}
              </AppText>
            );
          }

          if (node.kind === 'heading' || isBoldParagraphNode(node)) {
            resetNumberedCounters();
          }

          return renderRichNode(node, index, {
            keyPrefix: 'culture-note-node',
            allowHeadings: true,
            enableHighlights: false,
            numberedLabel: node.kind === 'numbered_item' ? getNumberedLabel(node) : undefined,
          });
        })}
      </Stack>
    );
  };

  const renderPhraseBody = (phrase: NormalizedLessonPhrase) => {
    const shouldShowVariantLabel = phraseVariantVisibilityById.get(phrase.id) ?? false;
    let audioSeen = 0;
    let skippedDuplicateHeading = false;

    const phraseRows = phrase.nodes.map((node, index) => {
      if (!skippedDuplicateHeading && node.kind === 'heading') {
        const headingText = getNodeHeadingText(node, contentLang).trim().toLowerCase();
        const phraseTitle = phrase.phrase.trim().toLowerCase();
        if (headingText && phraseTitle && headingText === phraseTitle) {
          skippedDuplicateHeading = true;
          return null;
        }
      }

      const hasAudio = Boolean(node.audio_key || node.audio_seq);
      if (hasAudio) {
        audioSeen += 1;
      }

      return renderRichNode(node, index, {
        keyPrefix: `phrase-${phrase.id}`,
        allowHeadings: true,
        enableHighlights: false,
        phraseId: phrase.id,
        phraseVariant: phrase.variant,
        isPhraseCard: true,
        phraseShowDivider: hasAudio && audioSeen === 2,
        phraseIsLeadAudio: hasAudio && audioSeen === 1,
      });
    }).filter(Boolean);

    return (
      <Stack gap="sm">
        {shouldShowVariantLabel ? (
          <View style={styles.phraseMetaRow}>
            <AppText language={pageLanguage} variant="caption" style={styles.phraseVariantText}>
              {pageCopy.phrasesVariantLabel(phrase.variant)}
            </AppText>
          </View>
        ) : null}

        {phrase.nodes.length ? (
          <View style={styles.phraseContentWrap}>{phraseRows}</View>
        ) : phrase.markdown ? (
          <View style={styles.phraseContentWrap}>
            <Stack gap="xs">
              <AppText language={pageLanguage} variant="caption" style={styles.phraseNotesLabel}>
                {pageCopy.phrasesPlainFallbackLabel}
              </AppText>
              {splitTextLines(phrase.markdown).map((line, index) => (
                <AppText key={`${phrase.id}-markdown-${index}`} language={contentLang} variant="body" style={styles.phraseBodyText}>
                  {line}
                </AppText>
              ))}
            </Stack>
          </View>
        ) : null}
      </Stack>
    );
  };

  const renderPhrasesSection = () => (
    <View style={styles.phraseSectionShell}>
      <View>
        {normalizedLessonPhrases.map((phrase, index) => {
          const isExpanded = expandedPhraseIds[phrase.id] ?? false;
          const phraseLabel = phrase.phrase.trim() || phrase.phraseTh.trim() || `Phrase ${index + 1}`;
          const shouldShowVariantLabel = phraseVariantVisibilityById.get(phrase.id) ?? false;

          return (
            <View
              key={phrase.id}
              style={[
                styles.phraseAccordionItem,
                index === 0 ? styles.phraseAccordionItemFirst : null,
                index === normalizedLessonPhrases.length - 1 ? styles.phraseAccordionItemLast : null,
              ]}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: isExpanded }}
                onPress={() =>
                  setExpandedPhraseIds((previous) => ({
                    ...previous,
                    [phrase.id]: !isExpanded,
                  }))
                }
                style={styles.phraseAccordionHeader}>
                <View style={styles.phraseAccordionHeaderTextWrap}>
                  <AppText language="en" variant="body" style={styles.phraseAccordionTitle}>
                    {phraseLabel}
                  </AppText>
                  {shouldShowVariantLabel ? (
                    <AppText language={pageLanguage} variant="caption" style={styles.phraseAccordionMeta}>
                      {pageCopy.phrasesVariantLabel(phrase.variant)}
                    </AppText>
                  ) : null}
                </View>
                <Text style={[styles.phraseAccordionChevron, isExpanded ? styles.phraseAccordionChevronExpanded : null]}>▾</Text>
              </Pressable>

              {isExpanded ? <View style={styles.phraseAccordionBody}>{renderPhraseBody(phrase)}</View> : null}
            </View>
          );
        })}
      </View>
    </View>
  );

const segmentPracticeTextWithBlanks = (text: string) => {
    const tokens: (
      | { type: 'text'; text: string; style?: LessonRichInline | null }
      | { type: 'blank'; length: number }
      | { type: 'line_break' }
    )[] = [];
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

const mergeAdjacentPracticeRowTokens = (
  row: ({ type: 'text'; text: string; style?: LessonRichInline | null } | { type: 'blank'; length: number; blankId: string; minLen: number })[]
) => {
  const merged: typeof row = [];
  const isWhitespaceOnly = (value: string) => value.length > 0 && value.trim().length === 0;

  row.forEach((token, index) => {
    const previous = merged[merged.length - 1];
    const next = row[index + 1];
    const previousStyle = (previous?.type === 'text' ? previous.style : null) ?? null;
    const tokenStyle = (token.type === 'text' ? token.style : null) ?? null;

    if (
      token.type === 'text' &&
      isWhitespaceOnly(token.text) &&
      previous?.type === 'text' &&
      previousStyle?.underline === true &&
      next?.type === 'text' &&
      (next.style ?? null)?.underline === true &&
      inlineFormattingKey(previousStyle as LessonRichInline) ===
        inlineFormattingKey(((next.style ?? null) as LessonRichInline) ?? {})
    ) {
      previous.text += token.text;
      return;
    }

    if (
      token.type === 'text' &&
      previous?.type === 'text' &&
      inlineFormattingKey((previousStyle ?? {}) as LessonRichInline) ===
        inlineFormattingKey((tokenStyle ?? {}) as LessonRichInline)
    ) {
      previous.text += token.text;
      return;
    }

    merged.push(token);
  });

  return merged;
};

  const segmentPracticeInlinesWithBlanks = (inlines: LessonRichInline[]) => {
    const tokens: (
      | { type: 'text'; text: string; style?: LessonRichInline | null }
      | { type: 'blank'; length: number }
      | { type: 'line_break' }
    )[] = [];

    inlines.forEach((inline) => {
      const text = cleanAudioTags(resolveRichInlineText(inline, contentLang));
      if (!text) {
        return;
      }

      let index = 0;
      let buffer = '';

      const flushBuffer = () => {
        const tokenText = buffer;
        if (tokenText) {
          tokens.push({ type: 'text', text: tokenText, style: inline });
        }
        buffer = '';
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
    });

    return tokens;
  };

  const openPracticeImagePreview = useCallback((uri: string, altText: string) => {
    setPracticeImagePreview({ uri, altText });
  }, []);

  const closePracticeImagePreview = useCallback(() => {
    setPracticeImagePreview(null);
  }, []);

  const renderPracticeImage = useCallback(
    (
      imageUrl: string,
      altText: string,
      options?: {
        shellStyle?: StyleProp<ViewStyle>;
        imageStyle?: StyleProp<ImageStyle>;
      }
    ) => (
      <Pressable
        accessibilityHint={pageLanguage === 'th' ? 'แตะเพื่อดูภาพขนาดใหญ่' : 'Tap to enlarge image'}
        accessibilityLabel={altText}
        accessibilityRole="button"
        onPress={() => openPracticeImagePreview(imageUrl, altText)}
        style={({ pressed }) => [
          styles.practicePromptImagePressable,
          options?.shellStyle ?? null,
          pressed ? styles.practicePromptImagePressed : null,
        ]}>
        <Image
          source={{ uri: imageUrl }}
          accessibilityLabel={altText}
          contentFit="contain"
          style={[styles.practicePromptImage, options?.imageStyle ?? null]}
        />
      </Pressable>
    ),
    [openPracticeImagePreview, pageLanguage]
  );

  const renderPracticePromptBlocks = (exercise: NormalizedPracticeExercise) => {
    if (!exercise.promptBlocks.length) {
      return null;
    }

    return (
      <Stack gap="sm">
        {exercise.promptBlocks.map((block, index) => {
          if (block.type === 'text') {
            return (
              <View key={`practice-prompt-text-${index}`} style={styles.practicePromptBlock}>
                {block.text ? (
                  <AppText language="en" variant="body" style={styles.practicePromptBlockText}>
                    {block.text}
                  </AppText>
                ) : null}
                {contentLang === 'th' && block.textTh ? (
                  <AppText language="th" variant="muted" style={styles.practicePromptBlockThaiText}>
                    {block.textTh}
                  </AppText>
                ) : null}
              </View>
            );
          }

          if (block.type === 'list') {
            return (
              <Stack key={`practice-prompt-list-${index}`} gap="xs">
                {block.items.map((item, itemIndex) => (
                  <View key={`practice-prompt-list-${index}-${itemIndex}`} style={styles.practicePromptListRow}>
                    <View style={styles.practicePromptListBullet} />
                    <AppText language={contentLang} variant="body" style={styles.practicePromptListText}>
                      {item}
                    </AppText>
                  </View>
                ))}
              </Stack>
            );
          }

          if (block.type === 'image') {
            const imageUrl = resolveLessonImageUrl(
              block.imageKey ? lesson?.images?.[block.imageKey] : null,
              block.imageKey
            );
            if (!imageUrl) {
              return null;
            }

            return (
              <View key={`practice-prompt-image-${index}`} style={styles.practicePromptFeatureWrap}>
                {renderPracticeImage(
                  imageUrl,
                  contentLang === 'th'
                    ? block.altTextTh || block.altText || 'Practice prompt image'
                    : block.altText || block.altTextTh || 'Practice prompt image',
                  {
                    shellStyle: styles.practicePromptFeatureImageShell,
                    imageStyle: styles.practicePromptFeatureImage,
                  }
                )}
              </View>
            );
          }

          if (block.type === 'audio') {
            const audioKey = block.audioKey?.trim();
            const snippet = audioKey ? snippetIndex.byKey[audioKey] ?? phraseSnippetIndex.byKey[audioKey] ?? null : null;
            const isPlaying = Boolean(audioKey) && playingSnippetKey === audioKey;

            return (
              <View key={`practice-prompt-audio-${index}`} style={styles.practicePromptAudioRow}>
                <LessonSnippetAudioButton
                  accessibilityLabel={pageLanguage === 'th' ? 'เล่นเสียงโจทย์' : 'Play prompt audio'}
                  disabled={!snippet}
                  isLoading={Boolean(audioKey) && activeSnippetKey === audioKey && isSnippetLoading}
                  isPlaying={isPlaying}
                  onPress={() => {
                    void handleToggleSnippet(snippet);
                  }}
                />
                <AppText language={pageLanguage} variant="caption" style={styles.practicePromptAudioLabel}>
                  {pageLanguage === 'th' ? 'ฟังโจทย์' : 'Listen to prompt'}
                </AppText>
              </View>
            );
          }

          return null;
        })}
      </Stack>
    );
  };

  const renderPracticeExerciseBody = (exercise: NormalizedPracticeExercise, displayMode: 'default' | 'inline' = 'default') => {
    const isMultipleChoiceExercise = exercise.kind === 'multiple_choice';
    const isOpenExercise = exercise.kind === 'open';
    const isFillBlankExercise = exercise.kind === 'fill_blank';
    const isSentenceTransformExercise = exercise.kind === 'sentence_transform';
    const isInlineQuickPractice = displayMode === 'inline';
    const isChecked = Boolean(checkedPracticeExercises[exercise.id]);
    const exerciseError = practiceErrorByExercise[exercise.id] ?? '';
    const openStates = exercise.items.map((item) => practiceEvaluations[getPracticeItemStateKey(exercise.id, item.key)]);
    const isCheckingExercise =
      Boolean(checkingPracticeExercises[exercise.id]) ||
      ((isOpenExercise || isFillBlankExercise || isSentenceTransformExercise) && openStates.some((state) => state?.loading));
    const hasPromptBlocks = exercise.promptBlocks.length > 0;
    const useCompactPracticeMediaLayout = windowWidth < 430;
    const pendingPracticeItems = exercise.items.filter((item) => !item.isExample && !isPracticePromptOnlyImageItem(exercise, item));
    const hasPerfectPracticeScore =
      pendingPracticeItems.length > 0 &&
      (isMultipleChoiceExercise
        ? pendingPracticeItems.every((item) => lockedPracticeMultipleChoiceItems[`${exercise.id}:${item.key}`] === true)
        : pendingPracticeItems.every(
            (item) => practiceEvaluations[getPracticeItemStateKey(exercise.id, item.key)]?.correct === true
          ));
    const checkAnswersLabel = pageCopy.checkAnswers;
    const tryAgainLabel = pageCopy.tryAgain;
    const greatWorkLabel = pageCopy.greatJob;

    const renderCheckButton = (
      options: {
        disabled?: boolean;
        label: string;
        onPress: () => void;
      } = {
        disabled: isCheckingExercise,
        label: isCheckingExercise ? pageCopy.practiceChecking : pageCopy.checkAnswers,
        onPress: () => {
          void handleCheckOpenExercise(exercise);
        },
      }
    ) => (
      <View style={[styles.practiceActionsRow, styles.comprehensionActionsRow]}>
        <Pressable
          accessibilityRole="button"
          disabled={options.disabled}
          onPress={options.onPress}
          style={({ pressed }) => [
            styles.ctaButton,
            styles.comprehensionCheckButton,
            options.disabled ? styles.ctaButtonDisabled : null,
            pressed && !options.disabled ? styles.ctaButtonPressed : null,
          ]}>
          <AppText language="en" variant="caption" style={styles.comprehensionCheckButtonText}>
            {options.label}
          </AppText>
        </Pressable>
      </View>
    );

    return (
      <Stack gap="md">
        {!hasPromptBlocks && exercise.prompt && exercise.title !== exercise.prompt ? (
          <AppText
            language={contentLang === 'th' ? 'th' : 'en'}
            variant="muted"
            style={[styles.practiceExercisePrompt, isInlineQuickPractice ? styles.practiceExercisePromptCompact : null]}>
            {exercise.prompt}
          </AppText>
        ) : null}

        {renderPracticePromptBlocks(exercise)}

        {isMultipleChoiceExercise ? (
          <Stack gap="md">
            {exercise.items.map((item, itemIndex) => {
              const selectionKey = `${exercise.id}:${item.key}`;
              const selectedLabels = practiceSelections[selectionKey] ?? [];
              const selectedSet = new Set(selectedLabels.map(normalizeOptionLetter));
              const answerSet = new Set(item.answerLetters.map(normalizeOptionLetter));
              const isMulti = item.answerLetters.length > 1;
              const isLockedCorrect = Boolean(lockedPracticeMultipleChoiceItems[selectionKey]);
              const isItemCorrect =
                selectedSet.size === answerSet.size &&
                Array.from(answerSet).every((label) => selectedSet.has(label));
              const abPromptLayout = parsePracticeAbPromptLayout(item);
              const itemImageUrl = resolveLessonImageUrl(item.imageKey ? lesson?.images?.[item.imageKey] : null, item.imageKey);
              const itemAltText =
                contentLang === 'th' ? item.altTextTh || item.altText || 'Practice prompt image' : item.altText || item.altTextTh || 'Practice prompt image';

              return (
                <View key={selectionKey} style={[styles.practiceQuestionCard, styles.comprehensionQuestionCard]}>
                  <View style={[styles.practiceMultipleChoiceQuestionHeader, styles.practiceMultipleChoiceQuestionHeaderDeindented]}>
                    <AppText language="en" variant="caption" style={styles.practiceQuestionNumber}>
                      {item.numberLabel || `${itemIndex + 1}`}
                    </AppText>
                    <View style={[styles.practiceQuestionTextWrap, styles.practiceMultipleChoiceQuestionTextWrap]}>
                      {itemImageUrl ? (
                        <View style={styles.practiceMultipleChoicePromptImageShell}>
                          <Image
                            source={{ uri: itemImageUrl }}
                            accessibilityLabel={itemAltText}
                            contentFit="contain"
                            style={styles.practiceMultipleChoicePromptImage}
                          />
                        </View>
                      ) : null}
                      {renderPracticeItemAudioButton(item.audioKey, selectionKey)}
                      {abPromptLayout ? (
                        <View style={styles.practiceAbPromptStack}>
                          <AppText
                            language="en"
                            variant="body"
                            style={[
                              styles.practiceQuestionText,
                              styles.practiceMultipleChoiceQuestionText,
                              isInlineQuickPractice ? styles.practiceQuestionTextCompact : null,
                            ]}>
                            {renderTextWithBlankRuns(abPromptLayout.aLine, `${selectionKey}-ab-a`, styles.practiceInlineBlank)}
                          </AppText>
                          <AppText
                            language="en"
                            variant="body"
                            style={[
                              styles.practiceQuestionText,
                              styles.practiceMultipleChoiceQuestionText,
                              isInlineQuickPractice ? styles.practiceQuestionTextCompact : null,
                            ]}>
                            {renderTextWithBlankRuns(abPromptLayout.bLine, `${selectionKey}-ab-b`, styles.practiceInlineBlank)}
                          </AppText>
                          {contentLang === 'th' && abPromptLayout.thaiLine ? (
                            <AppText
                              language="th"
                              variant="muted"
                              style={[
                                styles.practiceQuestionThaiText,
                                styles.practiceMultipleChoiceQuestionThaiText,
                                isInlineQuickPractice ? styles.practiceQuestionThaiTextCompact : null,
                              ]}>
                              {abPromptLayout.thaiLine}
                            </AppText>
                          ) : null}
                        </View>
                      ) : (
                        <>
                          {item.text || item.textJsonb.length ? (
                            <AppText
                              language="en"
                              variant="body"
                              style={[
                                styles.practiceQuestionText,
                                styles.practiceMultipleChoiceQuestionText,
                                isInlineQuickPractice ? styles.practiceQuestionTextCompact : null,
                              ]}>
                              {item.textJsonb.length
                                ? renderRichInlines(item.textJsonb, `${selectionKey}-question`)
                                : renderTextWithBlankRuns(item.text, `${selectionKey}-question`, styles.practiceInlineBlank)}
                            </AppText>
                          ) : null}
                          {contentLang === 'th' && (item.textTh || item.textJsonbTh.length) ? (
                            <AppText
                              language="th"
                              variant="muted"
                              style={[
                                styles.practiceQuestionThaiText,
                                styles.practiceMultipleChoiceQuestionThaiText,
                                isInlineQuickPractice ? styles.practiceQuestionThaiTextCompact : null,
                              ]}>
                              {item.textJsonbTh.length
                                ? renderRichInlines(item.textJsonbTh, `${selectionKey}-question-th`, { lineIsThaiOverride: true })
                                : item.textTh}
                            </AppText>
                          ) : null}
                        </>
                      )}
                    </View>
                  </View>

                  <Stack gap="sm" style={styles.comprehensionOptionsList}>
                    {item.options.map((option) => {
                      const normalizedOptionLabel = normalizeOptionLetter(option.label);
                      const isSelected = selectedSet.has(normalizedOptionLabel);
                      const isCorrectOption = answerSet.has(normalizedOptionLabel);
                      const isWrongSelection = isChecked && isSelected && !isCorrectOption;
                      const showSelectedOptionOutcome =
                        isSelected && (isLockedCorrect || (isChecked && (isItemCorrect || isWrongSelection || (!isMulti && !isCorrectOption))));
                      const isCorrectSelectionOutcome = showSelectedOptionOutcome && (isLockedCorrect || isItemCorrect);
                      const isWrongSelectionOutcome = showSelectedOptionOutcome && !isCorrectSelectionOutcome;
                      const optionImageUrl = resolveLessonImageUrl(
                        option.imageKey ? lesson?.images?.[option.imageKey] : null,
                        option.imageKey
                      );
                      const optionAltText =
                        contentLang === 'th'
                          ? option.altTextTh || option.altText || option.textTh || option.text || `Option ${option.label}`
                          : option.altText || option.altTextTh || option.text || option.textTh || `Option ${option.label}`;

                      return (
                        <Pressable
                          key={`${selectionKey}:${option.label}`}
                          accessibilityRole="button"
                          accessibilityLabel={`${option.label} ${optionAltText}`}
                          accessibilityState={{ selected: isSelected, disabled: isLockedCorrect }}
                          disabled={isLockedCorrect}
                          onPress={() => handlePracticeChoice(exercise.id, item.key, option.label, isMulti)}
                          style={[
                            styles.practiceOptionButton,
                            isWrongSelectionOutcome
                              ? styles.comprehensionOptionButtonSelectedWrong
                              : isCorrectSelectionOutcome
                                ? styles.comprehensionOptionButtonSelectedCorrect
                                : isSelected
                                  ? styles.practiceOptionButtonSelected
                                  : null,
                          ]}>
                          <View
                            style={[
                              styles.practiceOptionLetter,
                              isWrongSelectionOutcome
                                ? styles.comprehensionOptionLetterWrong
                                : isCorrectSelectionOutcome
                                  ? styles.comprehensionOptionLetterCorrect
                                  : isSelected
                                    ? styles.practiceOptionLetterSelected
                                    : null,
                            ]}>
                            <Text
                              style={[
                                styles.practiceOptionLetterText,
                                isSelected ? styles.practiceOptionLetterTextInverse : null,
                              ]}>
                              {isWrongSelectionOutcome ? 'X' : isCorrectSelectionOutcome ? '✓' : option.label}
                            </Text>
                          </View>
                          <View style={styles.practiceOptionTextWrap}>
                            {optionImageUrl ? (
                              <View style={styles.practiceOptionImageShell}>
                                <Image
                                  source={{ uri: optionImageUrl }}
                                  accessibilityLabel={optionAltText}
                                  contentFit="contain"
                                  style={styles.practiceOptionImage}
                                />
                              </View>
                            ) : null}
                            {option.text || option.textJsonb.length ? (
                              <AppText
                                language="en"
                                variant="body"
                                style={[
                                  styles.practiceOptionText,
                                  styles.practiceMultipleChoiceOptionText,
                                  isInlineQuickPractice ? styles.practiceOptionTextCompact : null,
                                ]}>
                                {option.textJsonb.length ? renderRichInlines(option.textJsonb, `${selectionKey}-${option.label}`) : option.text}
                              </AppText>
                            ) : null}
                            {contentLang === 'th' && (option.textTh || option.textJsonbTh.length) ? (
                              <AppText
                                language="th"
                                variant="body"
                                style={[
                                  styles.practiceOptionThaiText,
                                  styles.practiceMultipleChoiceOptionThaiText,
                                  isInlineQuickPractice ? styles.practiceOptionThaiTextCompact : null,
                                ]}>
                                {option.textJsonbTh.length
                                  ? renderRichInlines(option.textJsonbTh, `${selectionKey}-${option.label}-th`)
                                  : option.textTh}
                              </AppText>
                            ) : null}
                          </View>
                          {showSelectedOptionOutcome ? (
                            <AppText
                              language="en"
                              variant="caption"
                              style={[
                                styles.practiceOptionOutcomeMark,
                                isCorrectSelectionOutcome
                                  ? styles.comprehensionOutcomeMarkCorrect
                                  : styles.practiceOptionOutcomeMarkWrong,
                              ]}>
                              {isCorrectSelectionOutcome ? '✓' : '✗'}
                            </AppText>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </Stack>
                  {itemIndex < exercise.items.length - 1 ? <View style={styles.comprehensionQuestionDivider} /> : null}
                </View>
              );
            })}

            {exerciseError ? (
              <AppText language={pageLanguage} variant="muted" style={styles.practiceInlineError}>
                {exerciseError}
              </AppText>
            ) : null}

            {renderCheckButton({
              disabled: isCheckingExercise,
              label: isChecked
                ? isCheckingExercise
                  ? pageCopy.practiceChecking
                  : hasPerfectPracticeScore
                    ? greatWorkLabel
                    : tryAgainLabel
                : isCheckingExercise
                  ? pageCopy.practiceChecking
                  : checkAnswersLabel,
              onPress: () => {
                if (isChecked) {
                  handleResetMultipleChoiceExercise(exercise);
                  return;
                }
                void handleCheckMultipleChoiceExercise(exercise);
              },
            })}
          </Stack>
        ) : null}

        {(isOpenExercise || isSentenceTransformExercise) ? (
          <Stack gap="md">
            {exercise.items.map((item, itemIndex) => {
              const answerKey = getPracticeItemStateKey(exercise.id, item.key);
              const evaluation = practiceEvaluations[answerKey];
              const showUnansweredPracticeHint =
                !item.isExample && checkedPracticeExercises[exercise.id] === true && isPracticeItemUnanswered(exercise, item);
              const unansweredPracticeHintText =
                pageLanguage === 'th' ? 'ตอบคำถามก่อนเพื่อรับคำแนะนำ!' : 'Answer the question to get feedback!';
              const itemImageUrl = resolveLessonImageUrl(item.imageKey ? lesson?.images?.[item.imageKey] : null, item.imageKey);
              const itemAltText =
                contentLang === 'th' ? item.altTextTh || item.altText || 'Practice prompt image' : item.altText || item.altTextTh || 'Practice prompt image';
              const markState = practiceMarkedCorrect[answerKey];
              const answerValue = item.isExample
                ? item.answer || item.text
                : isSentenceTransformExercise && markState === true
                  ? item.text
                  : isOpenExercise
                    ? getPracticeOpenAnswer(exercise, item)
                    : practiceOpenAnswers[answerKey] ?? '';
              const showMarkButtons = isSentenceTransformExercise && (item.correctTag === 'yes' || item.correctTag === 'no');
              const resolvedPromptMarkState = item.correctTag === 'yes'
                ? true
                : item.correctTag === 'no'
                  ? false
                  : null;
              const resolvedExampleAnswerMarkState = item.isExample && isSentenceTransformExercise
                ? answerValue.trim().length > 0
                  ? true
                  : null
                : resolvedPromptMarkState;
              const displayMarkState = item.isExample ? resolvedPromptMarkState : markState;
              const evaluationCorrect =
                evaluation && typeof evaluation.correct === 'boolean'
                  ? evaluation.correct
                  : null;
              const isExerciseChecked = checkedPracticeExercises[exercise.id] === true;
              const shouldUseSentenceExampleShell = item.isExample && isSentenceTransformExercise;
              const shouldStackPracticeMedia = false;
              const inputCount = isOpenExercise ? getPracticeOpenInputCount(exercise, item) : 1;
              const openAnswerKeys = Array.from({ length: inputCount }, (_, inputIndex) =>
                getPracticeOpenAnswerKey(exercise.id, item.key, inputIndex)
              );
              const abPromptLayout = isOpenExercise && inputCount === 1
                ? parsePracticeAbPromptLayout(item, { stripBlankPlaceholders: true })
                : null;
              const isPromptOnlyImage = isPracticePromptOnlyImageItem(exercise, item);
              const shouldUseLargePromptImage = item.imageKey === '2.9_practice' || isPromptOnlyImage;

              if (isPromptOnlyImage) {
                return itemImageUrl ? (
                  <View key={answerKey} style={styles.practicePromptOnlyImageCard}>
                    {renderPracticeImage(itemImageUrl, itemAltText, {
                      shellStyle: [styles.practicePromptImageShell, styles.practicePromptImageShellLarge],
                      imageStyle: styles.practicePromptImageLarge,
                    })}
                  </View>
                ) : null;
              }

              return item.isExample ? (
                <View key={answerKey} style={styles.practiceExampleCard}>
                  <View style={styles.practiceExampleHeader}>
                    <AppText language="en" variant="caption" style={styles.practiceExampleLabel}>
                      EXAMPLE
                    </AppText>
                  </View>

                  <View style={[styles.practiceExampleBody, useCompactPracticeMediaLayout ? styles.practiceExampleBodyStacked : null]}>
                    {itemImageUrl ? (
                      renderPracticeImage(itemImageUrl, itemAltText, {
                        shellStyle: [styles.practiceExampleImageShell, useCompactPracticeMediaLayout ? styles.practiceExampleImageShellStacked : null],
                      })
                    ) : null}

                    <View style={[styles.practiceExampleContent, useCompactPracticeMediaLayout ? styles.practiceExampleContentStacked : null]}>
                      {renderPracticeItemAudioButton(item.audioKey, answerKey)}
                      {abPromptLayout ? (
                        <View style={styles.practiceAbPromptStack}>
                          <AppText
                            language="en"
                            variant="body"
                            style={[
                              styles.practiceQuestionText,
                              styles.practiceExamplePromptText,
                              showMarkButtons ? styles.practiceSentenceExamplePromptText : null,
                              shouldUseSentenceExampleShell ? styles.practiceSentenceTransformQuestionText : null,
                              isInlineQuickPractice ? styles.practiceQuestionTextCompact : null,
                            ]}>
                            {abPromptLayout.aLine}
                          </AppText>
                          {contentLang === 'th' && abPromptLayout.thaiLine ? (
                            <AppText
                              language="th"
                              variant="muted"
                              style={[styles.practiceQuestionThaiText, isInlineQuickPractice ? styles.practiceQuestionThaiTextCompact : null]}>
                              {abPromptLayout.thaiLine}
                            </AppText>
                          ) : null}
                          {showMarkButtons ? (
                            <View style={styles.practiceSentenceToggleRow}>
                              <Pressable
                                accessibilityRole="button"
                                disabled
                                style={[styles.practiceSentenceToggle, displayMarkState === true ? styles.practiceSentenceToggleActive : null]}>
                                <AppText language="en" variant="caption" style={styles.practiceSentenceToggleText}>
                                  ✓
                                </AppText>
                              </Pressable>
                              <Pressable
                                accessibilityRole="button"
                                disabled
                                style={[styles.practiceSentenceToggle, displayMarkState === false ? styles.practiceSentenceToggleActive : null]}>
                                <AppText language="en" variant="caption" style={styles.practiceSentenceToggleText}>
                                  X
                                </AppText>
                              </Pressable>
                            </View>
                          ) : null}
                          <View style={styles.practiceAbAnswerRow}>
                            <AppText
                              language="en"
                              variant="body"
                              style={[
                                styles.practiceQuestionText,
                                styles.practiceExamplePromptText,
                                showMarkButtons ? styles.practiceSentenceExamplePromptText : null,
                                shouldUseSentenceExampleShell ? styles.practiceSentenceTransformQuestionText : null,
                                isInlineQuickPractice ? styles.practiceQuestionTextCompact : null,
                              ]}>
                              {abPromptLayout.bLine}
                            </AppText>
                            <View style={styles.practiceExampleSentenceAnswerRow}>
                              <View
                                style={[
                                  styles.practiceExampleSentenceAnswerShell,
                                  (practiceExampleAnswerLineCounts[answerKey] ?? 1) === 2
                                    ? styles.practiceExampleSentenceAnswerShellTwoLine
                                    : styles.practiceExampleSentenceAnswerShellOneLine,
                                ]}>
                                <AppText
                                  language={contentLang === 'th' ? 'th' : 'en'}
                                  variant="body"
                                  onTextLayout={(event) => handlePracticeExampleAnswerTextLayout(answerKey, event)}
                                  style={[
                                    styles.practiceExampleAnswerText,
                                    styles.practiceSentenceTransformQuestionText,
                                    contentLang === 'th'
                                      ? styles.practiceOpenInputThai
                                      : styles.practiceOpenInputEnglish,
                                  ]}>
                                  {answerValue}
                                </AppText>
                                {resolvedExampleAnswerMarkState === true ? (
                                  <View style={styles.practiceExampleSentenceCorrectBadge}>
                                    <Text style={styles.practiceExampleSentenceCorrectBadgeText}>✓</Text>
                                  </View>
                                ) : null}
                              </View>
                            </View>
                          </View>
                        </View>
                      ) : (
                        <>
                          {item.prompt || item.text || item.textJsonb.length ? (
                            <AppText
                              language="en"
                              variant="body"
                              style={[
                                styles.practiceQuestionText,
                                styles.practiceExamplePromptText,
                                showMarkButtons ? styles.practiceSentenceExamplePromptText : null,
                                shouldUseSentenceExampleShell ? styles.practiceSentenceTransformQuestionText : null,
                                isInlineQuickPractice ? styles.practiceQuestionTextCompact : null,
                              ]}>
                              {item.textJsonb.length ? renderRichInlines(item.textJsonb, `${answerKey}-example`) : item.prompt || item.text}
                            </AppText>
                          ) : null}
                          {contentLang === 'th' && (item.promptTh || item.textTh || item.textJsonbTh.length) ? (
                            <AppText
                              language="th"
                              variant="muted"
                              style={[styles.practiceQuestionThaiText, isInlineQuickPractice ? styles.practiceQuestionThaiTextCompact : null]}>
                              {item.textJsonbTh.length
                                ? renderRichInlines(item.textJsonbTh, `${answerKey}-example-th`, { lineIsThaiOverride: true })
                                : item.promptTh || item.textTh}
                            </AppText>
                          ) : null}
                          {showMarkButtons ? (
                            <View style={styles.practiceSentenceToggleRow}>
                              <Pressable
                                accessibilityRole="button"
                                disabled
                                style={[styles.practiceSentenceToggle, displayMarkState === true ? styles.practiceSentenceToggleActive : null]}>
                                <AppText language="en" variant="caption" style={styles.practiceSentenceToggleText}>
                                  ✓
                                </AppText>
                              </Pressable>
                              <Pressable
                                accessibilityRole="button"
                                disabled
                                style={[styles.practiceSentenceToggle, displayMarkState === false ? styles.practiceSentenceToggleActive : null]}>
                                <AppText language="en" variant="caption" style={styles.practiceSentenceToggleText}>
                                  X
                                </AppText>
                              </Pressable>
                            </View>
                          ) : null}

                          {shouldUseSentenceExampleShell ? (
                            <View style={styles.practiceExampleSentenceAnswerRow}>
                              <View
                                style={[
                                  styles.practiceExampleSentenceAnswerShell,
                                  (practiceExampleAnswerLineCounts[answerKey] ?? 1) === 2
                                    ? styles.practiceExampleSentenceAnswerShellTwoLine
                                    : styles.practiceExampleSentenceAnswerShellOneLine,
                                ]}>
                                <AppText
                                  language={contentLang === 'th' ? 'th' : 'en'}
                                  variant="body"
                                  onTextLayout={(event) => handlePracticeExampleAnswerTextLayout(answerKey, event)}
                                  style={[
                                    styles.practiceExampleAnswerText,
                                    styles.practiceSentenceTransformQuestionText,
                                    contentLang === 'th'
                                      ? styles.practiceOpenInputThai
                                      : styles.practiceOpenInputEnglish,
                                  ]}>
                                  {answerValue}
                                </AppText>
                                {resolvedExampleAnswerMarkState !== null ? (
                                  <View
                                    style={[
                                      styles.practiceExampleSentenceCorrectBadge,
                                      resolvedExampleAnswerMarkState === false ? styles.practiceExampleSentenceIncorrectBadge : null,
                                    ]}>
                                    <Text style={styles.practiceExampleSentenceCorrectBadgeText}>
                                      {resolvedExampleAnswerMarkState ? '✓' : 'X'}
                                    </Text>
                                  </View>
                                ) : null}
                              </View>
                            </View>
                          ) : (
                            <TextInput
                              multiline
                              numberOfLines={3}
                              style={[styles.practiceOpenInput, practiceOpenInputStyle, styles.practiceExampleInput]}
                              value={answerValue}
                              editable={false}
                              textAlignVertical="top"
                            />
                          )}
                        </>
                      )}
                    </View>
                  </View>
                </View>
              ) : (
                <View key={answerKey} style={styles.practiceQuestionCard}>
                  <View style={styles.practiceQuestionHeader}>
                    <AppText language="en" variant="caption" style={styles.practiceQuestionNumber}>
                      {item.numberLabel || `${itemIndex + 1}`}
                    </AppText>

                    <View style={styles.practiceQuestionTextWrap}>
                      {renderPracticeItemAudioButton(item.audioKey, answerKey)}
                      {abPromptLayout ? (
                        <View style={styles.practiceAbPromptStack}>
                          <AppText
                            language="en"
                            variant="body"
                            style={[styles.practiceQuestionText, isInlineQuickPractice ? styles.practiceQuestionTextCompact : null]}>
                            {abPromptLayout.aLine}
                          </AppText>
                          {contentLang === 'th' && abPromptLayout.thaiLine ? (
                            <AppText
                              language="th"
                              variant="muted"
                              style={[styles.practiceQuestionThaiText, isInlineQuickPractice ? styles.practiceQuestionThaiTextCompact : null]}>
                              {abPromptLayout.thaiLine}
                            </AppText>
                          ) : null}
                        </View>
                      ) : item.prompt || item.text || item.textJsonb.length || (isSentenceTransformExercise && item.textJsonb.length) ? (
                        <AppText
                          language="en"
                          variant="body"
                          style={[
                            styles.practiceQuestionText,
                            isSentenceTransformExercise ? styles.practiceSentenceTransformQuestionText : null,
                            isInlineQuickPractice ? styles.practiceQuestionTextCompact : null,
                          ]}>
                          {item.textJsonb.length ? renderRichInlines(item.textJsonb, `${answerKey}-stem`) : item.prompt || item.text}
                        </AppText>
                      ) : null}
                      {showMarkButtons ? (
                        <View style={styles.practiceSentenceToggleRow}>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => handlePracticeSentenceCorrectToggle(exercise.id, item.key, true, item.text)}
                            style={[styles.practiceSentenceToggle, displayMarkState === true ? styles.practiceSentenceToggleActive : null]}>
                            <AppText language="en" variant="caption" style={styles.practiceSentenceToggleText}>
                              ✓
                            </AppText>
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => handlePracticeSentenceCorrectToggle(exercise.id, item.key, false, item.text)}
                            style={[styles.practiceSentenceToggle, displayMarkState === false ? styles.practiceSentenceToggleActive : null]}>
                            <AppText language="en" variant="caption" style={styles.practiceSentenceToggleText}>
                              X
                            </AppText>
                          </Pressable>
                        </View>
                      ) : null}
                      {contentLang === 'th' && !abPromptLayout && (item.promptTh || item.textTh || (isSentenceTransformExercise && item.textJsonbTh.length)) ? (
                        <AppText
                          language="th"
                          variant="muted"
                          style={[styles.practiceQuestionThaiText, isInlineQuickPractice ? styles.practiceQuestionThaiTextCompact : null]}>
                          {(isSentenceTransformExercise && item.textJsonbTh.length)
                            ? renderRichInlines(item.textJsonbTh, `${answerKey}-stem-th`, { lineIsThaiOverride: true })
                            : item.promptTh || item.textTh}
                        </AppText>
                      ) : null}
                    </View>
                  </View>

                  <View style={shouldStackPracticeMedia ? styles.practiceOpenColumn : styles.practiceOpenRow}>
                    {itemImageUrl ? (
                      renderPracticeImage(itemImageUrl, itemAltText, {
                        shellStyle: [
                          styles.practicePromptImageShell,
                          shouldStackPracticeMedia ? styles.practicePromptImageShellStacked : null,
                          shouldUseLargePromptImage ? styles.practicePromptImageShellLarge : null,
                        ],
                        imageStyle: shouldUseLargePromptImage ? styles.practicePromptImageLarge : null,
                      })
                    ) : null}

                    <View style={[styles.practiceOpenInputWrap, shouldStackPracticeMedia ? styles.practiceOpenInputWrapStacked : null]}>
                      {abPromptLayout ? (
                        <View style={styles.practiceAbAnswerRow}>
                          <AppText
                            language="en"
                            variant="body"
                            style={[styles.practiceQuestionText, isInlineQuickPractice ? styles.practiceQuestionTextCompact : null]}>
                            {abPromptLayout.bLine}
                          </AppText>
                          <View
                            style={[
                              styles.practiceOpenInlineInputShell,
                              evaluationCorrect !== null && isExerciseChecked ? styles.practiceOpenInputShellChecked : null,
                            ]}>
                            <TextInput
                              key={`${answerKey}-input-inline`}
                              ref={(ref) => {
                                practiceInputRefsMap.current[`${answerKey}-input-inline`] = ref;
                              }}
                              numberOfLines={1}
                              placeholder={item.placeholder || pageCopy.practiceOpenPlaceholder}
                              placeholderTextColor="#9C9EA4"
                              style={[
                                styles.practiceOpenInlineInputField,
                                practiceOpenInputStyle,
                                evaluationCorrect !== null && isExerciseChecked ? styles.practiceOpenInputFieldWithBadge : null,
                              ]}
                              value={practiceOpenAnswers[openAnswerKeys[0]] ?? ''}
                              onChangeText={(nextValue) => handlePracticeOpenAnswerChange(exercise.id, item.key, nextValue, 0)}
                              onBlur={() => handlePracticeInputBlur(`${answerKey}-input-inline`)}
                              onFocus={() => handlePracticeInputFocus(`${answerKey}-input-inline`)}
                              onSubmitEditing={dismissLessonKeyboard}
                              editable={!evaluation?.loading}
                              blurOnSubmit
                            />
                            {evaluationCorrect !== null && isExerciseChecked ? (
                              <View
                                style={[
                                  styles.practiceOpenInputStatusBadge,
                                  evaluationCorrect
                                    ? styles.practiceOpenInputStatusBadgeCorrect
                                    : styles.practiceOpenInputStatusBadgeIncorrect,
                                ]}>
                                <Text style={styles.practiceOpenInputStatusBadgeText}>
                                  {evaluationCorrect ? '✓' : 'X'}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      ) : openAnswerKeys.map((openAnswerKey, inputIndex) => {
                        const value = isOpenExercise
                          ? practiceOpenAnswers[openAnswerKey] ?? ''
                          : answerValue;
                        const placeholder =
                          isSentenceTransformExercise
                            ? markState === true
                              ? contentLang === 'th'
                                ? 'ประโยคนี้ถูกต้องแล้ว'
                                : 'Already correct'
                              : contentLang === 'th'
                                ? 'เขียนประโยคใหม่'
                                : 'Rewrite this sentence'
                            : item.placeholder || pageCopy.practiceOpenPlaceholder;
                        const statusMark =
                          evaluationCorrect !== null && isExerciseChecked
                            ? evaluationCorrect
                            : null;

                        return (
                          <View
                            key={`${answerKey}-input-shell-${inputIndex}`}
                            style={[
                              styles.practiceOpenInputShell,
                              isSentenceTransformExercise ? styles.practiceSentenceTransformInputShell : null,
                              inputIndex > 0 ? styles.practiceOpenInputStacked : null,
                              markState === true ? styles.practiceOpenInputDisabled : null,
                              evaluationCorrect !== null && isExerciseChecked ? styles.practiceOpenInputShellChecked : null,
                            ]}>
                            <TextInput
                              key={`${answerKey}-input-${inputIndex}`}
                              ref={(ref) => {
                                practiceInputRefsMap.current[`${answerKey}-input-${inputIndex}`] = ref;
                              }}
                              multiline={isOpenExercise}
                              numberOfLines={isOpenExercise ? 3 : 1}
                              placeholder={placeholder}
                              placeholderTextColor="#9C9EA4"
                              style={[
                                styles.practiceOpenInputField,
                                practiceOpenInputStyle,
                                isSentenceTransformExercise ? styles.practiceSentenceTransformInputField : null,
                                evaluationCorrect !== null && isExerciseChecked ? styles.practiceOpenInputFieldWithBadge : null,
                              ]}
                              value={value}
                              onChangeText={(nextValue) => handlePracticeOpenAnswerChange(exercise.id, item.key, nextValue, inputIndex)}
                              onBlur={() => handlePracticeInputBlur(`${answerKey}-input-${inputIndex}`)}
                              onFocus={() => handlePracticeInputFocus(`${answerKey}-input-${inputIndex}`)}
                              onSubmitEditing={dismissLessonKeyboard}
                              editable={!evaluation?.loading && markState !== true}
                              blurOnSubmit
                              textAlignVertical={isOpenExercise ? 'top' : 'center'}
                            />
                            {statusMark !== null ? (
                              <View
                                style={[
                                  styles.practiceOpenInputStatusBadge,
                                  statusMark
                                    ? styles.practiceOpenInputStatusBadgeCorrect
                                    : styles.practiceOpenInputStatusBadgeIncorrect,
                                ]}>
                                <Text style={styles.practiceOpenInputStatusBadgeText}>
                                  {statusMark ? '✓' : 'X'}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  {showUnansweredPracticeHint ? (
                    <AppText language={pageLanguage} variant="muted" style={styles.practiceItemInlineError}>
                      {unansweredPracticeHintText}
                    </AppText>
                  ) : null}

                  {evaluationCorrect !== null ? (
                    <View style={styles.practiceFeedbackBox}>
                      <View style={styles.practiceFeedbackRow}>
                        <AppText
                          language={pageLanguage}
                          variant="body"
                          style={[styles.practiceFeedbackHeadline, isInlineQuickPractice ? styles.practiceFeedbackHeadlineCompact : null]}>
                          {evaluationCorrect ? pageCopy.practiceCorrect : pageCopy.practiceNeedsWork}
                        </AppText>
                      </View>

                      {(contentLang === 'th' ? evaluation.feedbackTh || evaluation.feedbackEn : evaluation.feedbackEn || evaluation.feedbackTh) ? (
                        <AppText
                          language={contentLang === 'th' ? 'th' : 'en'}
                          variant="muted"
                          style={[styles.practiceFeedbackBody, isInlineQuickPractice ? styles.practiceFeedbackBodyCompact : null]}>
                          {contentLang === 'th' ? evaluation.feedbackTh || evaluation.feedbackEn : evaluation.feedbackEn || evaluation.feedbackTh}
                        </AppText>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}

            {exerciseError ? (
              <AppText language={pageLanguage} variant="muted" style={styles.practiceInlineError}>
                {exerciseError}
              </AppText>
            ) : null}

            {renderCheckButton({
              disabled: isCheckingExercise,
              label: isCheckingExercise
                ? pageCopy.practiceChecking
                : isChecked
                  ? hasPerfectPracticeScore
                    ? greatWorkLabel
                    : tryAgainLabel
                  : checkAnswersLabel,
              onPress: () => {
                if (isChecked) {
                  handleResetOpenExercise(exercise);
                  return;
                }
                void handleCheckOpenExercise(exercise);
              },
            })}
          </Stack>
        ) : null}

        {isFillBlankExercise ? (
          <Stack gap="md">
            {!isInlineQuickPractice && exercise.paragraph ? (
              <AppText
                language={contentLang}
                variant="muted"
                style={[styles.practiceExercisePrompt, isInlineQuickPractice ? styles.practiceExercisePromptCompact : null]}>
                {exercise.paragraph}
              </AppText>
            ) : null}

            {exercise.items.map((item, itemIndex) => {
              const answerKey = getPracticeItemStateKey(exercise.id, item.key);
              const evaluation = practiceEvaluations[answerKey];
              const evaluationCorrect =
                evaluation && typeof evaluation.correct === 'boolean'
                  ? evaluation.correct
                  : null;
              const isExerciseChecked = checkedPracticeExercises[exercise.id] === true;
              const showUnansweredPracticeHint =
                !item.isExample && isExerciseChecked && isPracticeItemUnanswered(exercise, item);
              const unansweredPracticeHintText =
                pageLanguage === 'th' ? 'ตอบคำถามก่อนเพื่อรับคำแนะนำ!' : 'Answer the question to get feedback!';
              const itemImageUrl = resolveLessonImageUrl(item.imageKey ? lesson?.images?.[item.imageKey] : null, item.imageKey);
              const itemAltText =
                contentLang === 'th' ? item.altTextTh || item.altText || 'Practice prompt image' : item.altText || item.altTextTh || 'Practice prompt image';
              const abPromptLayout = item.blanks.length === 1
                ? parsePracticeAbPromptLayout(item, { stripBlankPlaceholders: true })
                : null;
              const abBlank = abPromptLayout ? item.blanks[0] ?? null : null;
              const abBlankValue =
                abPromptLayout && abBlank
                  ? item.isExample
                    ? item.answer
                    : practiceBlankAnswers[getPracticeBlankKey(exercise.id, item.key, abBlank.id)] ?? ''
                  : '';
              const englishDisplayText = item.text || item.prompt;
              const thaiDisplayText = item.textTh || item.promptTh;
              const thaiOnlyText = splitThaiText(thaiDisplayText).th || thaiDisplayText;
              const thaiDisplayLines = splitTextLines(thaiDisplayText);
              const thaiLeadLineSource =
                thaiDisplayLines.find((line) => THAI_TEXT_RE.test(line) && !line.includes('_')) ?? '';
              const thaiLeadLine =
                extractThaiParentheticalText(thaiLeadLineSource) ||
                splitThaiText(thaiLeadLineSource).th ||
                thaiLeadLineSource;
              const thaiBlankLines = thaiDisplayLines.filter((line) => line.includes('_'));
              const thaiBlankText = thaiBlankLines.join('\n');
              const thaiCompanionText = thaiOnlyText.trim();
              const thaiCompanionHasVisibleThai = THAI_TEXT_RE.test(thaiCompanionText);
              const englishSourceTokens = item.textJsonb.length
                ? segmentPracticeInlinesWithBlanks(item.textJsonb)
                : segmentPracticeTextWithBlanks(englishDisplayText);
              const styledRuns = item.textJsonb.length
                ? buildPracticeStyledRunsFromInlines(item.textJsonb, contentLang)
                : null;
              const shouldShowThaiCompanion =
                contentLang === 'th' &&
                !abPromptLayout &&
                thaiCompanionHasVisibleThai &&
                normalizePracticeAnswerText(thaiOnlyText) !== normalizePracticeAnswerText(englishDisplayText);
              const buildFillBlankRows = (
                sourceTokens: (
                  | { type: 'text'; text: string; style?: LessonRichInline | null }
                  | { type: 'blank'; length: number }
                  | { type: 'line_break' }
                )[]
              ) => {
                const nextRows: ({ type: 'text'; text: string; style?: LessonRichInline | null } | { type: 'blank'; length: number; blankId: string; minLen: number })[][] = [[]];
                let nextBlankCursor = 0;

                sourceTokens.forEach((token) => {
                  if (token.type === 'line_break') {
                    nextRows.push([]);
                    return;
                  }
                  if (token.type === 'blank') {
                    const blank = item.blanks[nextBlankCursor] ?? null;
                    nextRows[nextRows.length - 1].push({
                      type: 'blank',
                      length: token.length,
                      blankId: blank?.id ?? `blank-${nextBlankCursor + 1}`,
                      minLen: blank?.minLen ?? token.length,
                    });
                    nextBlankCursor += 1;
                    return;
                  }
                  nextRows[nextRows.length - 1].push(token);
                });

                for (let rowIndex = nextRows.length - 1; rowIndex >= 0; rowIndex -= 1) {
                  nextRows[rowIndex] = mergeAdjacentPracticeRowTokens(
                    nextRows[rowIndex].filter((token) => token.type === 'blank' || token.text.length > 0)
                  );

                  if (nextRows[rowIndex].length === 0 && nextRows.length > 1) {
                    nextRows.splice(rowIndex, 1);
                  }
                }

                return { rows: nextRows, blankCursor: nextBlankCursor };
              };

              const englishRowResult = buildFillBlankRows(englishSourceTokens);
              const thaiBlankRowResult = thaiBlankText
                ? buildFillBlankRows(segmentPracticeTextWithBlanks(thaiBlankText))
                : null;
              const englishRows = englishRowResult.rows;
              const englishLeadRow = englishRows[0] ?? [];
              const englishLeadHasBlank = englishLeadRow.some((token) => token.type === 'blank');
              const englishFollowupHasBlank = englishRows
                .slice(1)
                .some((row) => row.some((token) => token.type === 'blank'));
              const englishLeadText = englishLeadRow
                .filter((token): token is { type: 'text'; text: string; style?: LessonRichInline | null } => token.type === 'text')
                .map((token) => token.text)
                .join(' ');
              const shouldUseThaiBlankRows =
                contentLang === 'th' &&
                !abPromptLayout &&
                englishRows.length > 1 &&
                !englishLeadHasBlank &&
                englishFollowupHasBlank &&
                (thaiBlankRowResult?.rows.some((row) => row.some((token) => token.type === 'blank')) ?? false);

              let rows = shouldUseThaiBlankRows
                ? [englishLeadRow, ...(thaiBlankRowResult?.rows ?? [])]
                : englishRows;
              let blankCursor = shouldUseThaiBlankRows
                ? thaiBlankRowResult?.blankCursor ?? englishRowResult.blankCursor
                : englishRowResult.blankCursor;

              if (
                shouldUseThaiBlankRows &&
                thaiLeadLine &&
                THAI_TEXT_RE.test(thaiLeadLine) &&
                !THAI_TEXT_RE.test(englishLeadText)
              ) {
                const wrappedThaiLeadLine = /^\(.*\)$/.test(thaiLeadLine.trim())
                  ? thaiLeadLine.trim()
                  : `(${thaiLeadLine.trim()})`;
                rows = rows.map((row, rowIndex) => {
                  if (rowIndex !== 0 || row.length === 0) {
                    return row;
                  }

                  const nextRow = [...row];
                  for (let tokenIndex = nextRow.length - 1; tokenIndex >= 0; tokenIndex -= 1) {
                    const token = nextRow[tokenIndex];
                    if (token?.type === 'text') {
                      nextRow[tokenIndex] = {
                        ...token,
                        text: `${token.text} ${wrappedThaiLeadLine}`,
                      };
                      break;
                    }
                  }
                  return nextRow;
                });
              }

              const remainingBlanks = item.blanks.slice(blankCursor);
              remainingBlanks.forEach((blank) => {
                const fallbackBlank = {
                  type: 'blank' as const,
                  length: blank.minLen,
                  blankId: blank.id,
                  minLen: blank.minLen,
                };

                if (rows.length === 1 && rows[0].length === 0) {
                  rows[0].push(fallbackBlank);
                } else {
                  rows.push([fallbackBlank]);
                }

                blankCursor += 1;
              });

              const exampleAnswersByBlank = item.blanks.reduce<Record<string, string>>((acc, blank, blankIndex) => {
                const structuredAnswer = item.answersV2[blankIndex]?.[0];
                acc[blank.id] =
                  typeof structuredAnswer === 'string' && structuredAnswer.trim().length > 0
                    ? structuredAnswer.trim()
                    : item.answer;
                return acc;
              }, {});
              const shouldBaselineAlignFillBlankHeader = !itemImageUrl;
              const exampleStyledCursor =
                styledRuns && styledRuns.length
                  ? { runs: styledRuns, index: 0, offset: 0, disabled: false }
                  : null;

              return (
                <View key={answerKey} style={item.isExample ? styles.practiceExampleCard : styles.practiceQuestionCard}>
                  {item.isExample ? (
                    <View style={styles.practiceExampleHeader}>
                      <AppText language="en" variant="caption" style={styles.practiceExampleLabel}>
                        EXAMPLE
                      </AppText>
                    </View>
                  ) : null}

                  <View
                    style={[
                      item.isExample ? styles.practiceFillBlankExampleBody : styles.practiceFillBlankQuestionHeader,
                      !item.isExample && shouldBaselineAlignFillBlankHeader ? styles.practiceFillBlankQuestionHeaderBaseline : null,
                    ]}>
                    {!item.isExample ? (
                      <View
                        style={
                          itemImageUrl || abPromptLayout
                            ? styles.practiceFillBlankNumberSlot
                            : styles.practiceFillBlankNumberSlotNoImage
                        }>
                        <AppText language="en" variant="caption" style={styles.practiceQuestionNumber}>
                          {item.numberLabel || `${itemIndex + 1}`}
                        </AppText>
                      </View>
                    ) : null}

                    <View style={[styles.practiceQuestionTextWrap, styles.practiceFillBlankContentWrap, item.isExample ? styles.practiceFillBlankExampleContentWrap : null]}>
                      {itemImageUrl ? (
                        renderPracticeImage(itemImageUrl, itemAltText, {
                          shellStyle: styles.practicePromptImageShell,
                        })
                      ) : null}

                      <Stack gap="xs">
                        {renderPracticeItemAudioButton(item.audioKey, answerKey)}
                        {abPromptLayout && abBlank ? (
                          <View style={styles.practiceAbPromptStack}>
                            <AppText
                              language="en"
                              variant="body"
                              style={[styles.practiceQuestionText, isInlineQuickPractice ? styles.practiceQuestionTextCompact : null]}>
                              {renderTextWithBlankRuns(abPromptLayout.aLine, `${answerKey}-ab-a-line`, styles.practiceInlineBlank)}
                            </AppText>
                            {contentLang === 'th' && abPromptLayout.thaiLine ? (
                              <AppText
                                language="th"
                                variant="muted"
                                style={[styles.practiceQuestionThaiText, isInlineQuickPractice ? styles.practiceQuestionThaiTextCompact : null]}>
                                {abPromptLayout.thaiLine}
                              </AppText>
                            ) : null}
                            <View style={styles.practiceAbAnswerRow}>
                              <AppText
                                language="en"
                                variant="body"
                                style={[styles.practiceQuestionText, isInlineQuickPractice ? styles.practiceQuestionTextCompact : null]}>
                                {renderTextWithBlankRuns(abPromptLayout.bLine, `${answerKey}-ab-b-line`, styles.practiceInlineBlank)}
                              </AppText>
                              <View
                                style={[
                                  styles.practiceFillBlankInputShell,
                                  isInlineQuickPractice ? styles.practiceFillBlankInputShellCompact : null,
                                  item.isExample ? styles.practiceExampleInput : null,
                                  {
                                    width: computePracticeBlankWidth(0, abBlank.minLen, isInlineQuickPractice),
                                    maxWidth: '100%',
                                    minWidth: 0,
                                  },
                                ]}>
                                <TextInput
                                  key={`${answerKey}-ab-blank`}
                                  ref={(ref) => {
                                    practiceInputRefsMap.current[`${answerKey}-ab-blank`] = ref;
                                  }}
                                  numberOfLines={1}
                                  placeholder=""
                                  placeholderTextColor="#9C9EA4"
                                  value={abBlankValue}
                                  onChangeText={(value) => handlePracticeBlankAnswerChange(exercise.id, item.key, abBlank.id, value)}
                                  onBlur={() => handlePracticeInputBlur(`${answerKey}-ab-blank`)}
                                  onFocus={() => handlePracticeInputFocus(`${answerKey}-ab-blank`)}
                                  onSubmitEditing={dismissLessonKeyboard}
                                  editable={!item.isExample && !evaluation?.loading}
                                  blurOnSubmit
                                  style={[
                                    styles.practiceFillBlankInputField,
                                    isInlineQuickPractice ? styles.practiceFillBlankInputFieldCompact : null,
                                  ]}
                                />
                              </View>
                            </View>
                          </View>
                        ) : (
                          rows.map((row, rowIndex) => (
                            item.isExample ? (
                              <View key={`${answerKey}-row-${rowIndex}`} style={styles.practiceFillBlankRow}>
                                {row.map((token, tokenIndex) =>
                                  token.type === 'text' ? (
                                    <React.Fragment key={`${answerKey}-text-${rowIndex}-${tokenIndex}`}>
                                      {exampleStyledCursor
                                        ? renderPracticeTokenWithStyles(
                                            token.text,
                                            exampleStyledCursor,
                                            `${answerKey}-text-${rowIndex}-${tokenIndex}`,
                                            isInlineQuickPractice
                                          )
                                        : renderPracticeInlineTextToken(
                                            token,
                                            `${answerKey}-text-${rowIndex}-${tokenIndex}`,
                                            isInlineQuickPractice
                                          )}
                                    </React.Fragment>
                                  ) : (
                                    <View
                                      key={`${answerKey}-blank-${rowIndex}-${tokenIndex}`}
                                      style={[
                                        styles.practiceFillBlankInputShell,
                                        isInlineQuickPractice ? styles.practiceFillBlankInputShellCompact : null,
                                        {
                                          width: computePracticeBlankWidth(0, token.minLen, isInlineQuickPractice),
                                          maxWidth: '100%',
                                        },
                                      ]}>
                                      <TextInput
                                        value={exampleAnswersByBlank[token.blankId] ?? ''}
                                        editable={false}
                                        style={[
                                          styles.practiceFillBlankInputField,
                                          isInlineQuickPractice ? styles.practiceFillBlankInputFieldCompact : null,
                                        ]}
                                      />
                                    </View>
                                  )
                                )}
                              </View>
                            ) : (
                              <PracticeFillBlankMeasuredRows
                                key={`${answerKey}-row-${rowIndex}`}
                                rowTokens={row}
                                answerKey={`${answerKey}-row-${rowIndex}`}
                                exerciseId={exercise.id}
                                itemKey={item.key}
                                isExample={item.isExample}
                                exampleAnswersByBlank={exampleAnswersByBlank}
                                editable={!evaluation?.loading}
                                compact={isInlineQuickPractice}
                                practiceBlankAnswers={practiceBlankAnswers}
                                practiceInputRefsMap={practiceInputRefsMap}
                                styledRuns={shouldUseThaiBlankRows ? (rowIndex === 0 ? styledRuns : null) : styledRuns}
                                onBlankAnswerChange={handlePracticeBlankAnswerChange}
                                onInputBlur={handlePracticeInputBlur}
                                onInputFocus={handlePracticeInputFocus}
                                onDismissKeyboard={dismissLessonKeyboard}
                              />
                            )
                          ))
                        )}
                        {shouldShowThaiCompanion && !shouldUseThaiBlankRows ? (
                          <AppText
                            language="th"
                            variant="muted"
                            style={[styles.practiceQuestionThaiText, isInlineQuickPractice ? styles.practiceQuestionThaiTextCompact : null]}>
                            {thaiCompanionText
                              ? thaiCompanionText
                              : thaiOnlyText}
                          </AppText>
                        ) : null}

                      </Stack>
                    </View>
                  </View>

                  {showUnansweredPracticeHint ? (
                    <AppText language={pageLanguage} variant="muted" style={styles.practiceItemInlineError}>
                      {unansweredPracticeHintText}
                    </AppText>
                  ) : null}

                  {!item.isExample && evaluationCorrect !== null && isExerciseChecked ? (
                    <View style={styles.practiceFeedbackBox}>
                      <View style={styles.practiceFeedbackRow}>
                        <AppText
                          language={pageLanguage}
                          variant="body"
                          style={[styles.practiceFeedbackHeadline, isInlineQuickPractice ? styles.practiceFeedbackHeadlineCompact : null]}>
                          {evaluationCorrect ? pageCopy.practiceCorrect : pageCopy.practiceNeedsWork}
                        </AppText>
                      </View>

                      {(contentLang === 'th' ? evaluation.feedbackTh || evaluation.feedbackEn : evaluation.feedbackEn || evaluation.feedbackTh) ? (
                        <AppText
                          language={contentLang}
                          variant="muted"
                          style={[styles.practiceFeedbackBody, isInlineQuickPractice ? styles.practiceFeedbackBodyCompact : null]}>
                          {contentLang === 'th' ? evaluation.feedbackTh || evaluation.feedbackEn : evaluation.feedbackEn || evaluation.feedbackTh}
                        </AppText>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}

            {exerciseError ? (
              <AppText language={pageLanguage} variant="muted" style={styles.practiceInlineError}>
                {exerciseError}
              </AppText>
            ) : null}

            {renderCheckButton({
              disabled: isCheckingExercise,
              label: isCheckingExercise
                ? pageCopy.practiceChecking
                : isChecked
                  ? hasPerfectPracticeScore
                    ? greatWorkLabel
                    : tryAgainLabel
                  : checkAnswersLabel,
              onPress: () => {
                if (isChecked) {
                  handleResetOpenExercise(exercise);
                  return;
                }
                void handleCheckOpenExercise(exercise);
              },
            })}
          </Stack>
        ) : null}
      </Stack>
    );
  };

  const renderQuickPracticeExercise = (exercise: NormalizedPracticeExercise) => (
    <GestureDetector gesture={quickPracticeNativeGesture}>
      <View style={styles.quickPracticeInlineWrap}>{renderPracticeExerciseBody(exercise, 'inline')}</View>
    </GestureDetector>
  );

  const handlePracticeExampleAnswerTextLayout = useCallback(
    (answerKey: string, event: NativeSyntheticEvent<TextLayoutEventData>) => {
      const measuredLineCount: 1 | 2 = event.nativeEvent.lines.length > 1 ? 2 : 1;
      setPracticeExampleAnswerLineCounts((previous) =>
        previous[answerKey] === measuredLineCount ? previous : { ...previous, [answerKey]: measuredLineCount }
      );
    },
    []
  );

  const activePagerGroup = isRichPagerTab ? activePagerGroups[activeUnderstandGroupIndex] ?? null : null;
  const activePagerHeading = activePagerGroup?.heading
    ? getNodeHeadingText(activePagerGroup.heading, contentLang)
    : '';
  const activeCommonMistakeScm = useMemo(() => {
    if (!isCommonMistakeTab || !activeSection || !activePagerGroup) {
      return false;
    }

    const items = Array.isArray(activeSection.items) ? activeSection.items : [];
    if (!items.length) {
      return false;
    }

    const normalizedHeading = normalizeCommonMistakeHeadingText(activePagerHeading);
    const matchedItem =
      items.find((item) => normalizedHeading && getCommonMistakeItemTitles(item).includes(normalizedHeading)) ??
      items[activeUnderstandGroupIndex] ??
      null;

    return matchedItem?.scm === true;
  }, [activePagerGroup, activePagerHeading, activeSection, activeUnderstandGroupIndex, isCommonMistakeTab]);
  const commonMistakeScmLabel = pageLanguage === 'th' ? 'ข้อผิดพลาดที่พบบ่อยมาก! 🚨' : 'SUPER COMMON MISTAKE! 🚨';
  const activePracticeHeading = activePracticeExercise?.title || activePracticeExercise?.prompt || '';
  const pagerDotKeys = isPracticeTab
    ? normalizedPracticeExercises.map((exercise) => exercise.id)
    : activePagerGroups.map((group) => group.key);
  const shouldCompactPagerDots = pagerDotKeys.length > 10;
  const shouldStackPagerDots = pagerDotKeys.length > 18;
  const shouldShowBottomPagerDock =
    hasMultiplePagerCards &&
    !isFullscreen &&
    (isPracticeTab || isUnderstandTab || isExtraTipTab || isCommonMistakeTab || isCultureNoteTab) &&
    Boolean(isPracticeTab ? activePracticeExercise : activePagerGroup);

  const renderRichPagerControls = () => (
    <View
      style={[
        styles.richPagerControls,
        styles.richPagerControlsBottom,
        shouldStackPagerDots ? styles.richPagerControlsStacked : null,
      ]}>
      <View style={styles.richPagerArrowRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={pageLanguage === 'th' ? 'การ์ดก่อนหน้า' : 'Previous card'}
          accessibilityState={{ disabled: activeInnerCardIndex === 0 }}
          disabled={activeInnerCardIndex === 0}
          onPress={() => handleSetActiveInnerCardIndex(activeInnerCardIndex - 1)}
          style={[
            styles.richPagerArrowButton,
            activeInnerCardIndex === 0 ? styles.richPagerArrowButtonDisabled : null,
          ]}>
          <MaterialIcons name="arrow-back-ios-new" size={18} color={theme.colors.text} />
        </Pressable>

        {!shouldStackPagerDots ? (
          <View style={[styles.richPagerDots, shouldCompactPagerDots ? styles.richPagerDotsCompact : null]}>
            {pagerDotKeys.map((dotKey, index) => (
              <View
                key={dotKey}
                style={[
                  styles.richPagerDot,
                  shouldCompactPagerDots ? styles.richPagerDotCompact : null,
                  index === activeInnerCardIndex ? styles.richPagerDotActive : null,
                  shouldCompactPagerDots && index === activeInnerCardIndex ? styles.richPagerDotActiveCompact : null,
                ]}
              />
            ))}
          </View>
        ) : (
          <View style={styles.richPagerArrowSpacer} />
        )}

        {isLastPagerCard ? (
          <View style={styles.richPagerArrowSpacer} />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={pageLanguage === 'th' ? 'การ์ดถัดไป' : 'Next card'}
            onPress={() => handleSetActiveInnerCardIndex(activeInnerCardIndex + 1)}
            style={styles.richPagerArrowButton}>
            <MaterialIcons name="arrow-forward-ios" size={18} color={theme.colors.text} />
          </Pressable>
        )}
      </View>

      {shouldStackPagerDots ? (
        <View style={[styles.richPagerDots, styles.richPagerDotsStacked, shouldCompactPagerDots ? styles.richPagerDotsCompact : null]}>
          {pagerDotKeys.map((dotKey, index) => (
            <View
              key={dotKey}
              style={[
                styles.richPagerDot,
                shouldCompactPagerDots ? styles.richPagerDotCompact : null,
                index === activeInnerCardIndex ? styles.richPagerDotActive : null,
                shouldCompactPagerDots && index === activeInnerCardIndex ? styles.richPagerDotActiveCompact : null,
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.screen}>
      <RouterStack.Screen options={{ headerShown: false }} />

      <Modal
        animationType="fade"
        onRequestClose={closeCompletionModal}
        transparent
        visible={completionModalState !== null}>
        <View style={styles.completionModalBackdrop}>
          <View style={styles.completionModalCard}>
            <Pressable
              accessibilityLabel={pageCopy.completionClose}
              accessibilityRole="button"
              onPress={closeCompletionModal}
              style={styles.completionModalCloseButton}>
              <MaterialIcons name="close" size={16} color={theme.colors.text} />
            </Pressable>

            {completionModalState === 'success' ? (
              <>
                <View style={styles.completionModalCheckWrap}>
                  <Image source={pailinBlueThumbsUpImage} style={styles.completionModalSuccessImage} contentFit="contain" />
                </View>

                <Stack gap="xs">
                  <AppText language={pageLanguage} variant="title" style={styles.completionModalTitle}>
                    {pageCopy.completionSuccessTitle}
                  </AppText>
                  <AppText language={pageLanguage} variant="body" style={styles.completionModalBody}>
                    {pageCopy.completionSuccessBody(coverLessonNumber)}
                  </AppText>
                </Stack>

                <View style={styles.completionModalActionsRow}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      closeCompletionModal();
                      void navigateToLessonLibrary();
                    }}
                    style={({ pressed }) => [
                      styles.completionModalButton,
                      styles.completionModalSecondaryButton,
                      pressed ? styles.completionModalButtonPressed : null,
                    ]}>
                    <AppText language={pageLanguage} variant="caption" style={styles.completionModalSecondaryButtonText}>
                      {pageCopy.completionOpenLibrary}
                    </AppText>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      closeCompletionModal();
                      void navigateToNextLesson();
                    }}
                    style={({ pressed }) => [
                      styles.completionModalButton,
                      styles.completionModalPrimaryButton,
                      pressed ? styles.completionModalButtonPressed : null,
                    ]}>
                    <AppText language={pageLanguage} variant="caption" style={styles.completionModalPrimaryButtonText}>
                      {pageCopy.completionNextLesson}
                    </AppText>
                  </Pressable>
                </View>
              </>
            ) : completionModalState === 'skip_warning' ? (
              <>
                <View style={styles.completionModalCheckWrap}>
                  <Image source={pailinBlueThumbsUpImage} style={styles.completionModalSuccessImage} contentFit="contain" />
                </View>

                <Stack gap="sm" style={styles.completionModalWarningContent}>
                  <Stack gap="xs" style={styles.completionModalWarningTitleBlock}>
                    <AppText language={pageLanguage} variant="title" style={styles.completionModalTitle}>
                      {pageLanguage === 'th' ? 'ใกล้เสร็จแล้ว!' : 'Almost there!'}
                    </AppText>
                    <AppText language={pageLanguage} variant="body" style={styles.completionModalBody}>
                      {pageLanguage === 'th'
                        ? 'คุณยังทำแบบฝึกหัดไม่เสร็จ หากออกตอนนี้ บทเรียนนี้จะแสดงว่าเรียนยังไม่จบ ทำแบบฝึกหัดให้เสร็จเพื่อทำเครื่องหมายว่าเรียนจบสมบูรณ์!'
                        : 'You have unfinished exercises. Leaving now means this lesson will show as incomplete. Finish the exercises to mark it as fully complete!'}
                    </AppText>
                  </Stack>

                  <View style={styles.completionModalActionsRow}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={closeCompletionModal}
                      style={({ pressed }) => [
                        styles.completionModalButton,
                        styles.completionModalPrimaryButton,
                        pressed ? styles.completionModalButtonPressed : null,
                      ]}>
                      <AppText language={pageLanguage} variant="caption" style={styles.completionModalPrimaryButtonText}>
                        {pageLanguage === 'th' ? 'ทำแบบฝึกหัดต่อ' : 'Finish exercises'}
                      </AppText>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setCompletionModalState('skip_success');
                      }}
                      style={({ pressed }) => [
                        styles.completionModalButton,
                        styles.completionModalSecondaryButton,
                        pressed ? styles.completionModalButtonPressed : null,
                      ]}>
                      <AppText language={pageLanguage} variant="caption" style={styles.completionModalSecondaryButtonText}>
                        {pageLanguage === 'th' ? 'ออกตอนนี้' : 'Exit anyway'}
                      </AppText>
                    </Pressable>
                  </View>
                </Stack>
              </>
            ) : completionModalState === 'skip_success' ? (
              <>
                <View style={styles.completionModalCheckWrap}>
                  <Image source={pailinBlueThumbsUpImage} style={styles.completionModalSuccessImage} contentFit="contain" />
                </View>

                <Stack gap="xs">
                  <AppText language={pageLanguage} variant="title" style={styles.completionModalTitle}>
                    {pageCopy.completionSkipSuccessTitle}
                  </AppText>
                  <AppText language={pageLanguage} variant="body" style={styles.completionModalBody}>
                    {pageCopy.completionSkipSuccessBody}
                  </AppText>
                </Stack>

                <View style={styles.completionModalActionsRow}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      closeCompletionModal();
                      void navigateToLessonLibrary();
                    }}
                    style={({ pressed }) => [
                      styles.completionModalButton,
                      styles.completionModalSecondaryButton,
                      pressed ? styles.completionModalButtonPressed : null,
                    ]}>
                    <AppText language={pageLanguage} variant="caption" style={styles.completionModalSecondaryButtonText}>
                      {pageCopy.completionOpenLibrary}
                    </AppText>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      closeCompletionModal();
                      void navigateToNextLesson();
                    }}
                    style={({ pressed }) => [
                      styles.completionModalButton,
                      styles.completionModalPrimaryButton,
                      pressed ? styles.completionModalButtonPressed : null,
                    ]}>
                    <AppText language={pageLanguage} variant="caption" style={styles.completionModalPrimaryButtonText}>
                      {pageCopy.completionNextLesson}
                    </AppText>
                  </Pressable>
                </View>
              </>
            ) : (
              <Stack gap="md" style={styles.completionModalIncompleteContent}>
                <Stack gap="xs">
                  <AppText language={pageLanguage} variant="title" style={styles.completionModalTitle}>
                    {pageCopy.completionIncompleteTitle}
                  </AppText>
                  <AppText language={pageLanguage} variant="body" style={styles.completionModalBody}>
                    {pageCopy.completionIncompleteBody}
                  </AppText>
                </Stack>

                <Pressable
                  accessibilityRole="button"
                  onPress={closeCompletionModal}
                  style={({ pressed }) => [
                    styles.completionModalButton,
                    styles.completionModalPrimaryButton,
                    pressed ? styles.completionModalButtonPressed : null,
                  ]}>
                  <AppText language={pageLanguage} variant="caption" style={styles.completionModalPrimaryButtonText}>
                    {pageCopy.completionKeepGoing}
                  </AppText>
                </Pressable>
              </Stack>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={closePracticeImagePreview}
        transparent
        visible={practiceImagePreview !== null}>
        <Pressable style={styles.practiceImagePreviewBackdrop} onPress={closePracticeImagePreview}>
          <Pressable
            accessibilityLabel={pageLanguage === 'th' ? 'ปิดภาพขยาย' : 'Close enlarged image'}
            accessibilityRole="button"
            onPress={closePracticeImagePreview}
            style={styles.practiceImagePreviewCloseButton}>
            <MaterialIcons name="close" size={18} color={theme.colors.surface} />
          </Pressable>
          {practiceImagePreview ? (
            <Image
              source={{ uri: practiceImagePreview.uri }}
              accessibilityLabel={practiceImagePreview.altText}
              contentFit="contain"
              style={styles.practiceImagePreviewImage}
            />
          ) : null}
        </Pressable>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={closeRichLinkSheet}
        transparent
        visible={Boolean(pendingRichLink)}>
        <View style={styles.richLinkModalRoot}>
          <Pressable accessibilityRole="button" onPress={closeRichLinkSheet} style={styles.richLinkBackdrop} />

          <View style={[styles.richLinkSheetWrap, { paddingBottom: Math.max(insets.bottom, theme.spacing.md) }]}>
            <GestureDetector gesture={richLinkSheetGesture}>
              <Animated.View style={richLinkSheetAnimatedStyle}>
                <View style={styles.richLinkSheet}>
                  <View style={styles.richLinkHandle} />

                  <View style={styles.richLinkSheetHeader}>
                    <AppText language={uiLanguage} variant="caption" style={styles.richLinkSheetEyebrow}>
                      {pendingRichLink?.actionLabel ?? ''}
                    </AppText>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={pageCopy.completionClose}
                      onPress={closeRichLinkSheet}
                      style={styles.richLinkCloseButton}>
                      <MaterialIcons name="close" size={18} color={theme.colors.text} />
                    </Pressable>
                  </View>

                  {pendingRichLink ? (
                    <>
                      <Pressable
                        accessibilityRole="button"
                        onPress={handleConfirmRichLink}
                        style={({ pressed }) => [
                          styles.richLinkCard,
                          pressed ? styles.richLinkActionPressed : null,
                        ]}>
                        <View style={styles.richLinkCardIcon}>
                          <MaterialIcons name={pendingRichLink.icon} size={20} color={theme.colors.accent} />
                        </View>

                        <View style={styles.richLinkCardCopy}>
                          <AppText language={uiLanguage} variant="body" style={styles.richLinkCardTitle}>
                            {pendingRichLink.title}
                          </AppText>
                          <AppText language={uiLanguage} variant="caption" style={styles.richLinkCardSubtitle}>
                            {pendingRichLink.subtitle}
                          </AppText>
                        </View>

                        <MaterialIcons name="arrow-forward" size={18} color={theme.colors.text} />
                      </Pressable>

                      {pendingRichLink.note ? (
                        <View style={styles.richLinkNote}>
                          <MaterialIcons name="info-outline" size={14} color={theme.colors.accent} />
                          <AppText language={uiLanguage} variant="caption" style={styles.richLinkNoteText}>
                            {pendingRichLink.note}
                          </AppText>
                        </View>
                      ) : null}
                    </>
                  ) : null}
                </View>
              </Animated.View>
            </GestureDetector>
          </View>
        </View>
      </Modal>

      {isLoading && !lessonCover ? (
        <PageLoadingState language={uiLanguage} />
      ) : null}

      {!lessonCover && !isLoading && errorMessage ? (
        <PageLoadingState
          language={uiLanguage}
          errorTitle={uiCopy.loadingErrorTitle}
          errorBody={errorMessage || uiCopy.loadingErrorBody}
        />
      ) : null}

      {lessonCover ? (
        <View style={styles.lessonContainer}>
          {!hasStartedLesson ? (
            <View style={[styles.fullScreenCover, { minHeight: coverMinHeight }]}>
              <View style={styles.coverImage}>
                {headerImageUrl ? (
                  <Image
                    source={{ uri: headerImageUrl }}
                    contentFit="contain"
                    contentPosition="center"
                    style={styles.coverRemoteImage}
                  />
                ) : null}

                <View style={styles.coverFallbackArt}>
                  {!headerImageUrl ? (
                    <>
                      <View style={styles.coverFallbackFill} />
                      <View style={styles.coverArtCircleLarge} />
                      <View style={styles.coverArtCircleSmall} />
                      <View style={styles.coverArtCircleMedium} />
                    </>
                  ) : null}
                </View>

                <View style={styles.coverOverlay} />

                <View style={styles.coverContent}>
                  <View style={[styles.coverContentShell, isTabletLessonLayout ? styles.coverContentShellTablet : null]}>
                    <View style={styles.coverTopMetaRow}>
                      <View style={styles.coverTopBar}>
                        <View style={styles.coverTopLeft}>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={backToLibraryLabel}
                            onPress={() => {
                              void navigateToLessonLibrary();
                            }}
                            style={styles.backButton}>
                            <MaterialIcons name="arrow-back" size={24} color={theme.colors.surface} />
                          </Pressable>
                        </View>

                        {isLessonReady ? (
                          <View pointerEvents="none" style={styles.coverTopCenter}>
                            <AppText language={uiLanguage} variant="caption" style={styles.stagePill}>
                              {sectionCount} {uiCopy.lessonSections}
                            </AppText>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.coverBottomPanel}>
                      <Stack gap="sm">
                        <AppText language={uiLanguage} variant="caption" style={styles.coverLessonLabel}>
                          {studyLessonLabel}
                        </AppText>

                        <AppText language="en" variant="title" style={styles.coverTitle}>
                          {englishTitle ?? 'Untitled lesson'}
                        </AppText>

                        {thaiTitle && !isCheckpointCoverLesson ? (
                          <AppText language="th" variant="body" style={styles.coverThaiTitle}>
                            {thaiTitle}
                          </AppText>
                        ) : null}
                      </Stack>

                      {coverFocusText ? (
                        <View style={styles.coverFocusBlock}>
                          <AppText language={uiLanguage} variant="caption" style={styles.coverFocusEyebrow}>
                            {uiCopy.lessonFocus}
                          </AppText>
                          <AppText language={uiLanguage} variant="body" style={styles.coverFocusText}>
                            {coverFocusText}
                          </AppText>
                        </View>
                      ) : null}

                      {isLockedLesson ? (
                        <View style={styles.coverLockedWrap}>
                          <Card padding="md" radius="md" style={styles.coverLockedNotice}>
                            <Stack gap="xs">
                              <AppText language={uiLanguage} variant="body" style={styles.coverLockedTitle}>
                                {uiCopy.lockedLessonTitle}
                              </AppText>
                              <AppText language={uiLanguage} variant="muted" style={styles.coverLockedBody}>
                                {uiCopy.lockedLessonBody}
                              </AppText>
                            </Stack>
                          </Card>

                          <Button
                            language={uiLanguage}
                            title={uiCopy.unlockLesson}
                            onPress={() => {
                              prefetchPricing();
                              router.push('/(tabs)/account/membership');
                            }}
                            style={styles.coverStartButton}
                          />
                        </View>
                      ) : (
                        <Stack gap="xs">
                          <Button
                            language={uiLanguage}
                            title={startLessonLabel}
                            disabled={!isLessonReady}
                            onPress={openLessonAtResume}
                            style={styles.coverStartButton}
                          />
                          {errorMessage && !isLessonReady ? (
                            <AppText language={uiLanguage} variant="muted" style={styles.coverInlineError}>
                              {errorMessage}
                            </AppText>
                          ) : null}
                        </Stack>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.stepperScreen}>
              {streakCelebration ? (
                <View style={styles.streakCelebrationWrap} pointerEvents="box-none">
                  <View style={styles.streakCelebrationCard}>
                    <View style={styles.streakCelebrationIconWrap}>
                      <MaterialIcons name="local-fire-department" size={20} color={theme.colors.text} />
                    </View>
                    <View style={styles.streakCelebrationCopy}>
                      <AppText language={uiLanguage} variant="body" style={styles.streakCelebrationTitle}>
                        {streakCelebration.title}
                      </AppText>
                      <AppText language={uiLanguage} variant="caption" style={styles.streakCelebrationBody}>
                        {streakCelebration.body}
                      </AppText>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={uiLanguage === 'th' ? 'ปิดการแจ้งเตือนสตรีค' : 'Dismiss streak message'}
                      onPress={() => setStreakCelebration(null)}
                      style={styles.streakCelebrationCloseButton}>
                      <MaterialIcons name="close" size={18} color={theme.colors.mutedText} />
                    </Pressable>
                  </View>
                </View>
              ) : null}
              <Modal
                visible={shouldShowConversationIntroOverlay}
                transparent={false}
                animationType="none"
                presentationStyle="overFullScreen"
                statusBarTranslucent
                onRequestClose={handleDismissConversationIntro}>
                <Animated.View style={[styles.conversationIntroModalRoot, conversationIntroAnimatedStyle]}>
                  <LessonConversationIntroOverlay
                    language={pageLanguage}
                    lessonLabel={studyLessonLabel}
                    eyebrow={pageCopy.conversationIntroEyebrow}
                    title={audioTrayTitle}
                    body={resolvedBackstory || pageCopy.conversationIntroBody}
                    hint={pageCopy.conversationIntroHint}
                    targetSectionIndex={conversationIntroTargetSectionIndex}
                    sectionCount={sectionCount}
                    audioUrl={audioUrls.main}
                    isPlaying={isAudioPlaying}
                    isLoading={isAudioLoading}
                    currentMillis={audioPositionMillis}
                    durationMillis={audioDurationMillis}
                    rate={audioRate}
                    onDismiss={handleDismissConversationIntro}
                    onPlay={handlePlayConversationIntro}
                    onSkip={handleSkipAudio}
                    onSeek={handleSeekAudio}
                    onSetRate={handleSetAudioRate}
                  />
                </Animated.View>
              </Modal>

              {!isFullscreen ? (
                <>
                  <View style={[styles.studyTopChrome, { paddingTop: insets.top + 8 }]}>
                    <View style={styles.studyNavBar}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setIsMenuOpen(true)}
                        style={styles.studyMenuButton}>
                        <AppText language="en" variant="body" style={styles.studyMenuButtonText}>
                          ☰
                        </AppText>
                      </Pressable>

                      <View style={styles.studyTitleBlock}>
                        <AppText language={pageLanguage} variant="caption" style={styles.studyCounterText}>
                          {studyLessonLabel}
                        </AppText>

                        {sectionCount > 0 ? (
                          <View style={styles.sectionDotsRow}>
                            {Array.from({ length: sectionCount }, (_, index) => (
                              <View
                                key={`section-dot-${index}`}
                                style={[
                                  styles.sectionDot,
                                  index < activeSectionIndex ? styles.sectionDotVisited : null,
                                  index === activeSectionIndex ? styles.sectionDotActive : null,
                                ]}
                              />
                            ))}
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.studyNavActions}>
                        {isTranslatingContent ? (
                          <AppText language={pageLanguage} variant="caption" style={styles.studyNavStatusText}>
                            {pageCopy.translatingContent}
                          </AppText>
                        ) : null}

                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={contentToggleLabel}
                          disabled={isTranslatingContent}
                          onPress={handleContentTogglePress}
                          style={[styles.translatePill, isTranslatingContent ? styles.translatePillDisabled : null]}>
                          <View style={styles.translatePillLabel}>
                            <AppText language="en" variant="caption" style={styles.translatePillText}>
                              {contentToggleText}
                            </AppText>
                          </View>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </>
              ) : null}

              <GestureDetector gesture={activeStudyGesture}>
                <View style={styles.studyBody}>
                  <ScrollView
                    ref={contentScrollRef}
                    bounces={shouldEnableBodyScroll}
                    contentContainerStyle={[
                      styles.contentScrollContent,
                      shouldContainLessonContent ? styles.contentScrollContentTablet : null,
                      isFullscreen ? { paddingTop: insets.top + 12 } : null,
                      isKeyboardOpen ? { paddingBottom: lessonKeyboardHeight + 24 } : null,
                    ]}
                    keyboardDismissMode="interactive"
                    keyboardShouldPersistTaps="handled"
                    onContentSizeChange={(_, height) => {
                      setContentScrollMeasuredHeight(height);
                    }}
                    onLayout={(event) => {
                      setContentScrollViewportHeight(event.nativeEvent.layout.height);
                    }}
                    onScroll={(event) => {
                      const nextOffsetY = event.nativeEvent.contentOffset.y;
                      contentScrollOffsetRef.current = nextOffsetY;
                      contentScrollTargetOffsetRef.current = nextOffsetY;
                    }}
                    scrollEnabled={shouldEnableBodyScroll}
                    scrollEventThrottle={16}
                    showsVerticalScrollIndicator={false}
                    style={styles.contentScroll}>
                    <View style={[styles.lessonContentShell, shouldContainLessonContent ? styles.lessonContentShellTablet : null]}>
                  <View style={styles.sectionHeaderRow}>
                    <AppText
                      language={pageLanguage}
                      variant="title"
                      style={[
                        styles.studySectionTitle,
                        pageLanguage === 'th' ? styles.studySectionTitleThai : styles.studySectionTitleEnglish,
                      ]}>
                      {activeSectionTitle ?? pageCopy.noSectionAvailable}
                    </AppText>

                    <View style={styles.sectionHeaderActions}>
                      {isFullscreen ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={contentToggleLabel}
                          disabled={isTranslatingContent}
                          onPress={handleContentTogglePress}
                          style={[styles.translatePill, isTranslatingContent ? styles.translatePillDisabled : null]}>
                          <View style={styles.translatePillLabel}>
                            <AppText language="en" variant="caption" style={styles.translatePillText}>
                              {contentToggleText}
                            </AppText>
                          </View>
                        </Pressable>
                      ) : null}

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                        onPress={() => setIsFullscreen((previous) => !previous)}
                        style={styles.fullscreenButton}>
                        <MaterialIcons
                          name={isFullscreen ? 'fullscreen-exit' : 'fullscreen'}
                          size={24}
                          color={theme.colors.text}
                        />
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.sectionDivider} />

                  <View
                    style={[
                      styles.sectionBodyBlock,
                      shouldContainLessonContent ? styles.sectionBodyBlockTablet : null,
                      hasMultiplePagerCards ? styles.sectionBodyBlockPager : null,
                    ]}>
                  {isPrepareTab ? (
                    <Card padding="md" radius="lg" style={styles.prepareCard}>
                      <Stack gap="md">
                        <View style={styles.prepareCardHeader}>
                          <AppText language={pageLanguage} variant="caption" style={styles.prepareCardEyebrow}>
                            {pageCopy.prepareCardTitle}
                          </AppText>
                          <AppText language={pageLanguage} variant="muted" style={styles.prepareCardSubtitle}>
                            {pageCopy.prepareCardSubtitle}
                          </AppText>
                        </View>

                        {prepareItems.length ? (
                          <View style={styles.prepareList}>
                            {prepareItems.map((item, index) =>
                              renderPrepareItem(item, index === prepareItems.length - 1)
                            )}
                          </View>
                        ) : (
                          <AppText language={pageLanguage} variant="muted" style={styles.prepareEmptyText}>
                            {pageCopy.prepareEmpty}
                          </AppText>
                        )}
                      </Stack>
                    </Card>
                  ) : isComprehensionTab ? (
                    normalizedQuestions.length ? (
                      <Stack gap="md">
                        {normalizedQuestions.map((question, questionIndex) => {
                          const selectionKey = question.id;
                          const selectedLabels = selectedAnswers[selectionKey] ?? [];
                          const selectedSet = new Set(selectedLabels.map(normalizeOptionLetter));
                          const answerSet = new Set(question.answerKey.map(normalizeOptionLetter));
                          const isMulti = question.answerKey.length > 1;
                          const isLockedCorrect =
                            allComprehensionQuestionsAnswered && Boolean(lockedComprehensionQuestions[selectionKey]);
                          const isQuestionCorrect =
                            selectedSet.size === answerSet.size &&
                            Array.from(answerSet).every((label) => selectedSet.has(label));

                          return (
                            <View
                              key={selectionKey}
                              style={[
                                styles.practiceQuestionCard,
                                styles.comprehensionQuestionCard,
                                questionIndex === 0 ? styles.comprehensionFirstQuestionCard : null,
                              ]}>
                              <View style={styles.comprehensionQuestionHeader}>
                                <AppText language="en" variant="caption" style={styles.comprehensionQuestionNumber}>
                                  {`${question.sortOrder || questionIndex + 1}`}
                                </AppText>

                                <View style={styles.comprehensionQuestionTextWrap}>
                                  {contentLang === 'th' ? (
                                    <>
                                      {splitTextLines(question.promptEn).map((line, lineIndex) => (
                                        <AppText
                                          key={`comprehension-en-${selectionKey}-${lineIndex}`}
                                          language="en"
                                          variant="body"
                                          style={styles.comprehensionQuestionText}>
                                          {line}
                                        </AppText>
                                      ))}
                                      {splitTextLines(question.promptTh).map((line, lineIndex) => (
                                        <AppText
                                          key={`comprehension-th-${selectionKey}-${lineIndex}`}
                                          language="th"
                                          variant="body"
                                          style={styles.comprehensionQuestionThaiText}>
                                          {line}
                                        </AppText>
                                      ))}
                                    </>
                                  ) : (
                                    splitTextLines(question.prompt).map((line, lineIndex) => (
                                      <AppText
                                        key={`comprehension-prompt-${selectionKey}-${lineIndex}`}
                                        language="en"
                                        variant="body"
                                        style={styles.comprehensionQuestionText}>
                                        {line}
                                      </AppText>
                                    ))
                                  )}
                                </View>
                              </View>

                              <Stack gap="sm" style={[styles.comprehensionOptionsList, { marginTop: 4 }]}>
                                {question.options.map((option, optionIndex) => {
                                  const normalizedOptionLabel = normalizeOptionLetter(option.label);
                                  const isSelected = selectedSet.has(normalizedOptionLabel);
                                  const isCorrectOption = answerSet.has(normalizedOptionLabel);
                                  const isWrongSelection = hasSubmittedComprehensionAnswers && isSelected && !isCorrectOption;
                                  const showSelectedOptionOutcome =
                                    isSelected && (isLockedCorrect || (hasSubmittedComprehensionAnswers && (isCorrectOption || isWrongSelection)));
                                  const isCorrectSelectionOutcome = showSelectedOptionOutcome && (isLockedCorrect || isCorrectOption);
                                  const isWrongSelectionOutcome = showSelectedOptionOutcome && !isCorrectSelectionOutcome;
                                  const optionFallback =
                                    comprehensionOptionImageFallbacks[`${question.id}:${normalizedOptionLabel}`] ??
                                    comprehensionOptionImageFallbacks[`${question.sortOrder}:${normalizedOptionLabel}`];
                                  const optionImageKey = option.imageKey || optionFallback?.imageKey || null;
                                  const optionImageUrl = resolveLessonImageUrl(
                                    optionImageKey ? lesson?.images?.[optionImageKey] : null,
                                    optionImageKey
                                  );
                                  const optionAltText =
                                    contentLang === 'th'
                                      ? option.altTextTh ||
                                        option.altText ||
                                        optionFallback?.altTextTh ||
                                        optionFallback?.altText ||
                                        option.textTh ||
                                        option.text ||
                                        `Option ${option.label}`
                                      : option.altText ||
                                        option.altTextTh ||
                                        optionFallback?.altText ||
                                        optionFallback?.altTextTh ||
                                        option.text ||
                                        option.textTh ||
                                        `Option ${option.label}`;

                                  return (
                                    <Pressable
                                      key={`${selectionKey}-${option.label}-${optionIndex}`}
                                      accessibilityRole="button"
                                      accessibilityLabel={`${option.label} ${optionAltText}`}
                                      accessibilityState={{ selected: isSelected, disabled: isLockedCorrect }}
                                      disabled={isLockedCorrect}
                                      onPress={() => handleToggleAnswer(selectionKey, option.label, isMulti)}
                                      style={[
                                        styles.comprehensionOptionButton,
                                        isWrongSelectionOutcome
                                          ? styles.comprehensionOptionButtonSelectedWrong
                                          : isCorrectSelectionOutcome
                                            ? styles.comprehensionOptionButtonSelectedCorrect
                                            : isSelected
                                              ? styles.comprehensionOptionButtonSelected
                                              : null,
                                      ]}>
                                      <View
                                        style={[
                                          styles.comprehensionOptionLetter,
                                          isWrongSelectionOutcome
                                            ? styles.comprehensionOptionLetterWrong
                                            : isCorrectSelectionOutcome
                                              ? styles.comprehensionOptionLetterCorrect
                                              : isSelected
                                                ? styles.comprehensionOptionLetterSelected
                                                : null,
                                        ]}>
                                        <Text
                                          style={[
                                            styles.comprehensionOptionLetterText,
                                            showSelectedOptionOutcome ? styles.practiceOptionLetterTextInverse : null,
                                          ]}>
                                          {isWrongSelectionOutcome ? 'X' : isCorrectSelectionOutcome ? '✓' : option.label}
                                        </Text>
                                      </View>

                                      <View style={styles.comprehensionOptionTextWrap}>
                                        {optionImageUrl ? (
                                          <View style={styles.practiceOptionImageShell}>
                                            <Image
                                              source={{ uri: optionImageUrl }}
                                              accessibilityLabel={optionAltText}
                                              contentFit="contain"
                                              style={styles.practiceOptionImage}
                                            />
                                          </View>
                                        ) : null}

                                        {option.text ? (
                                          <AppText language="en" variant="body" style={styles.comprehensionOptionText}>
                                            {option.text}
                                          </AppText>
                                        ) : null}

                                        {contentLang === 'th' && option.textTh ? (
                                          <AppText language="th" variant="body" style={styles.comprehensionOptionThaiText}>
                                            {option.textTh}
                                          </AppText>
                                        ) : null}
                                      </View>
                                    </Pressable>
                                  );
                                })}
                              </Stack>
                              {questionIndex < normalizedQuestions.length - 1 || questionIndex === normalizedQuestions.length - 1 ? (
                                <View style={styles.comprehensionQuestionDivider} />
                              ) : null}
                            </View>
                          );
                        })}

                        {comprehensionError ? (
                          <AppText language={pageLanguage} variant="muted" style={styles.practiceInlineError}>
                            {comprehensionError}
                          </AppText>
                        ) : null}

                        <View style={[styles.practiceActionsRow, styles.comprehensionActionsRow]}>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => {
                              if (hasSubmittedComprehensionAnswers && allComprehensionQuestionsAnswered) {
                                handleResetComprehensionReview();
                                return;
                              }
                              void handleSubmitComprehensionAnswers();
                            }}
                            style={({ pressed }) => [
                              styles.ctaButton,
                              styles.comprehensionCheckButton,
                              pressed ? styles.ctaButtonPressed : null,
                            ]}>
                            <AppText language="en" variant="caption" style={styles.comprehensionCheckButtonText}>
                              {hasSubmittedComprehensionAnswers && allComprehensionQuestionsAnswered
                                ? hasPerfectComprehensionScore
                                  ? 'GREAT WORK!'
                                  : 'TRY AGAIN'
                                : 'CHECK ANSWERS'}
                            </AppText>
                          </Pressable>
                        </View>
                      </Stack>
                    ) : null
                  ) : isTranscriptTab ? (
                    <Stack gap="sm">
                      {normalizedTranscript.map((line) => (
                        <View key={line.id} style={styles.transcriptItem}>
                          <View style={styles.transcriptLineGroup}>
                            {line.englishLine ? (
                              <View style={styles.transcriptLine}>
                                {line.speaker ? (
                                  <AppText language="en" variant="body" style={styles.transcriptSpeaker}>
                                    {`${line.speaker}: `}
                                  </AppText>
                                ) : null}
                                <AppText language="en" variant="body" style={styles.transcriptText}>
                                  {line.englishLine}
                                </AppText>
                              </View>
                            ) : null}

                            {contentLang === 'th' && line.thaiLine ? (
                              <View style={styles.transcriptLine}>
                                {line.speakerTh ? (
                                  <AppText language="th" variant="body" style={styles.transcriptSpeakerThai}>
                                    {`${line.speakerTh}: `}
                                  </AppText>
                                ) : null}
                                <AppText language="th" variant="body" style={styles.transcriptTextThai}>
                                  {line.thaiLine}
                                </AppText>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      ))}
                    </Stack>
                  ) : isApplyTab ? (
                    <Stack gap="md">
                      {normalizedApply.promptNodes.length ? (
                        <View style={styles.applyPromptWrap}>{renderApplyNodes(normalizedApply.promptNodes)}</View>
                      ) : normalizedApply.promptText ? (
                        <AppText
                          language={contentLang === 'th' ? 'th' : 'en'}
                          variant="body"
                          style={styles.applyPromptText}>
                          {normalizedApply.promptText}
                        </AppText>
                      ) : null}

                      <View
                        onLayout={(event) => {
                          applyInputOffsetYRef.current = event.nativeEvent.layout.y;
                        }}>
                        <TextInput
                          ref={applyInputRef}
                          multiline
                          numberOfLines={3}
                          caretHidden={false}
                          contextMenuHidden={false}
                        placeholder={pageCopy.applyPlaceholder}
                        placeholderTextColor="#9C9EA4"
                        style={[styles.applyInput, applyInputStyle]}
                        value={applyText}
                        onChangeText={setApplyText}
                        onFocus={() => scrollLessonInputIntoView(applyInputOffsetYRef.current)}
                        onSubmitEditing={dismissLessonKeyboard}
                        editable
                        blurOnSubmit
                        scrollEnabled={false}
                        textAlignVertical="top"
                      />
                      </View>

                      {!showApplyResponse ? (
                        <View style={styles.applyActionsRow}>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => {
                              setShowApplyResponse(true);
                              void writeProgressUnit(
                                'example_reveal',
                                buildAppExampleRevealKey('apply'),
                                buildAppPageKey('apply')
                              );
                            }}
                            style={({ pressed }) => [
                              styles.ctaButton,
                              styles.comprehensionCheckButton,
                              pressed ? styles.ctaButtonPressed : null,
                            ]}>
                            <AppText language="en" variant="caption" style={styles.comprehensionCheckButtonText}>
                              {pageCopy.applySubmit}
                            </AppText>
                          </Pressable>
                        </View>
                      ) : null}

                      {showApplyResponse && (normalizedApply.responseNodes.length || normalizedApply.responseText) ? (
                        <Stack gap="sm">
                          {normalizedApply.responseNodes.length ? (
                            <View style={styles.applyResponseWrap}>{renderApplyNodes(normalizedApply.responseNodes)}</View>
                          ) : (
                            <View style={styles.applyAccentBlock}>
                              <AppText
                                language={contentLang === 'th' ? 'th' : 'en'}
                                variant="body"
                                style={styles.applyParagraphText}>
                                {normalizedApply.responseText}
                              </AppText>
                            </View>
                          )}

                          <AppText language={pageLanguage} variant="muted" style={styles.applyResponseNote}>
                            {pageCopy.applyResponseNote}
                          </AppText>
                        </Stack>
                      ) : null}
                    </Stack>
                  ) : isPhrasesTab ? (
                    normalizedLessonPhrases.length ? (
                      renderPhrasesSection()
                    ) : (
                      <AppText language={pageLanguage} variant="body" style={styles.sectionBody}>
                        {pageCopy.phrasesEmpty}
                      </AppText>
                    )
                  ) : isPracticeTab || isUnderstandTab || isExtraTipTab || isCommonMistakeTab || isCultureNoteTab ? (
                    (isPracticeTab ? activePracticeExercise : activePagerGroup) ? (
                      <GestureDetector gesture={richPagerGesture}>
                            <View style={styles.richPagerShell}>
                          <Animated.View
                            style={[
                              styles.richPagerCard,
                              windowHeight < 780 ? styles.richPagerCardCompact : null,
                              richPagerAnimatedStyle,
                            ]}>
                              {isPracticeTab ? (
                                <View style={styles.practicePagerHeaderRow}>
                                  {activePracticeHeading ? (
                                    <AppText
                                      language={contentLang}
                                      variant="body"
                                      style={[
                                        styles.richPagerHeadingLabel,
                                        styles.practicePagerHeadingLabel,
                                        contentLang === 'th'
                                          ? styles.practicePagerHeadingLabelThai
                                          : styles.practicePagerHeadingLabelEnglish,
                                      ]}>
                                      {activePracticeHeading}
                                    </AppText>
                                  ) : null}

                                  <AppText language="en" variant="caption" style={styles.practicePagerCounterText}>
                                    {`${Math.min(activeInnerCardIndex + 1, activeInnerCardCount)} of ${activeInnerCardCount}`}
                                  </AppText>
                                </View>
                              ) : (
                                <View
                                  style={[
                                    styles.richPagerMetaRow,
                                    styles.richPagerMetaRowRichSection,
                                  ]}>
                                  {activePagerHeading ? (
                                    <View style={styles.richPagerHeadingWrap}>
                                      <AppText language={contentLang} variant="body" style={styles.richPagerHeadingLabel}>
                                        {activePagerHeading}
                                      </AppText>
                                      {isCommonMistakeTab && activeCommonMistakeScm ? (
                                        <AppText language={pageLanguage} variant="caption" style={styles.commonMistakeScmLabel}>
                                          {commonMistakeScmLabel}
                                        </AppText>
                                      ) : null}
                                    </View>
                                  ) : null}

                                  <View style={styles.richPagerCounterPill}>
                                    <AppText language="en" variant="caption" style={styles.richPagerCounterText}>
                                      {`${Math.min(activeInnerCardIndex + 1, activeInnerCardCount)} of ${activeInnerCardCount}`}
                                    </AppText>
                                  </View>
                                </View>
                              )}

                            <View style={styles.richPagerBody}>
                              <View style={styles.richPagerScrollContent}>
                              {isPracticeTab && activePracticeExercise
                                  ? renderPracticeExerciseBody(activePracticeExercise)
                                  : activePagerGroup && isUnderstandTab
                                      ? renderUnderstandGroupBody(activePagerGroup.body, activePagerGroup.key)
                                      : activePagerGroup && isExtraTipTab
                                        ? renderExtraTipGroupBody(activePagerGroup.body, activePagerGroup.key)
                                      : activePagerGroup && isCultureNoteTab
                                        ? (
                                          <View style={styles.cultureNoteShell}>{renderCultureNoteBody(activePagerGroup.body)}</View>
                                        )
                                      : activePagerGroup
                                        ? renderCommonMistakeGroupBody(activePagerGroup.body, activePagerGroup.key)
                                        : null}
                              </View>
                            </View>
                          </Animated.View>
                        </View>
                      </GestureDetector>
                    ) : (
                      isPracticeTab ? (
                        <AppText language={pageLanguage} variant="body" style={styles.sectionBody}>
                          {pageCopy.practiceEmpty}
                        </AppText>
                      ) : isPhrasesTab ? (
                        <AppText language={pageLanguage} variant="body" style={styles.sectionBody}>
                          {pageCopy.phrasesEmpty}
                        </AppText>
                      ) : (
                        <View style={styles.placeholderBox}>
                          <Stack gap="xs">
                            <AppText language={pageLanguage} variant="caption" style={styles.placeholderEyebrow}>
                              {pageCopy.rendererNext}
                            </AppText>
                            <AppText language={pageLanguage} variant="body" style={styles.placeholderTitle}>
                              {pageCopy.rendererReady(
                                getLessonSectionLabel(
                                  pageLanguage,
                                  isUnderstandTab
                                    ? 'understand'
                                    : isExtraTipTab
                                      ? 'extra_tip'
                                      : isCultureNoteTab
                                        ? 'culture_note'
                                        : 'common_mistake'
                                )
                              )}
                            </AppText>
                            <AppText language={pageLanguage} variant="muted" style={styles.placeholderBody}>
                              {pageCopy.richNodesLoaded(richContentBlockCount)}
                            </AppText>
                          </Stack>
                        </View>
                      )
                    )
                  ) : (
                    <Stack gap="md">
                      <View style={styles.sectionMetaRow}>
                        <View style={styles.sectionEyebrow}>
                          <AppText language={pageLanguage} variant="caption" style={styles.sectionEyebrowText}>
                            {activeSection ? activeSectionEyebrow : sectionMenuLabel}
                          </AppText>
                        </View>

                        <View
                          style={[
                            styles.audioFlag,
                            activeSection && hasSectionAudio(activeSection) ? styles.audioFlagActive : styles.audioFlagMuted,
                          ]}>
                          <AppText language={pageLanguage} variant="caption" style={styles.audioFlagText}>
                            {activeTab
                              ? activeSection && hasSectionAudio(activeSection)
                                ? pageCopy.audioReady
                                : pageCopy.noAudioYet
                              : pageCopy.noSectionYet}
                          </AppText>
                        </View>
                      </View>

                      <AppText language={pageLanguage} variant="body" style={styles.sectionBody}>
                        {activeSection ? pageCopy.sectionLoadedPlaceholder : pageCopy.tabExistsPlaceholder}
                      </AppText>

                      <Stack gap="sm">
                        {activeSectionNotes.map((note) => (
                          <View key={note} style={styles.noteRow}>
                            <View style={styles.noteBullet} />
                            <AppText language={pageLanguage} variant="body" style={styles.noteText}>
                              {note}
                            </AppText>
                          </View>
                        ))}
                      </Stack>

                      <View style={styles.placeholderBox}>
                        <Stack gap="xs">
                          <AppText language={pageLanguage} variant="caption" style={styles.placeholderEyebrow}>
                            {pageCopy.rendererNext}
                          </AppText>
                          <AppText language={pageLanguage} variant="body" style={styles.placeholderTitle}>
                            {activeSectionTypeLabel
                              ? pageCopy.rendererReady(activeSectionTypeLabel)
                              : pageCopy.rendererLanding}
                          </AppText>
                          <AppText language={pageLanguage} variant="muted" style={styles.placeholderBody}>
                            {activeSection
                              ? pageCopy.richNodesLoaded(richContentBlockCount)
                              : activeTab
                                ? pageCopy.tabRendererMissing(activeSectionTitle ?? activeSectionTypeLabel ?? '')
                                : pageCopy.richContentLanding}
                          </AppText>
                        </Stack>
                      </View>
                    </Stack>
                  )}
                  </View>
                    </View>
                  </ScrollView>

                  {shouldShowBottomPagerDock ? (
                    <View style={styles.bottomPagerDock}>
                      {renderRichPagerControls()}
                    </View>
                  ) : null}

                  <View style={styles.stickyFooter}>
                    <View
                      style={[
                        styles.stickyFooterShell,
                        { paddingBottom: Math.max(insets.bottom, 10) },
                      ]}>
                    {shouldShowAudioTray ? (
                      <LessonAudioTray
                        language={pageLanguage}
                        title={audioTrayTitle}
                        subtitle={audioTraySubtitle}
                        statusLabel={audioTrayStatusLabel}
                        autoCollapseSignal={audioTrayAutoCollapseSignal}
                        autoExpandSignal={audioTrayAutoExpandSignal}
                        audioUrl={audioUrls.main}
                        isPlaying={isAudioPlaying}
                        isLoading={isAudioLoading}
                        currentMillis={audioPositionMillis}
                        durationMillis={audioDurationMillis}
                        rate={audioRate}
                        onTogglePlay={handleToggleAudio}
                        onSkip={handleSkipAudio}
                        onSeek={handleSeekAudio}
                        onSetRate={handleSetAudioRate}
                      />
                    ) : null}

                    {nextSectionHintMessage ? (
                      <View
                        pointerEvents="none"
                        style={[
                          styles.nextSectionHintOverlay,
                          { bottom: Math.max(insets.bottom, 10) + 52 },
                        ]}>
                        <View style={styles.nextSectionHintToast}>
                          <View style={styles.nextSectionHintIconWrap}>
                            <AppText language="en" variant="caption" style={styles.nextSectionHintIconText}>
                              !
                            </AppText>
                          </View>
                          <AppText language={pageLanguage} variant="caption" style={styles.nextSectionHintText}>
                            {nextSectionHintMessage}
                          </AppText>
                        </View>
                        <View style={styles.nextSectionHintCaret} />
                      </View>
                    ) : null}

                    <View style={styles.ctaRow}>
                      {lessonCompletionError ? (
                        <AppText language={pageLanguage} variant="muted" style={styles.lessonCompletionErrorText}>
                          {lessonCompletionError}
                        </AppText>
                      ) : null}

                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ disabled: isPrimaryActionVisuallyDisabled }}
                        disabled={isPrimaryActionActuallyDisabled}
                        onPress={() => {
                          if (explainablePrimaryActionHint) {
                            showNextSectionHint(explainablePrimaryActionHint);
                            return;
                          }

                          if (sectionCount === 0) {
                            setHasStartedLesson(false);
                            return;
                          }

                          if (isLastSection) {
                            void handleFinishLessonPress();
                            return;
                          } else {
                            navigateToSectionWithConversationGate(Math.min(activeSectionIndex + 1, sectionCount - 1));
                          }
                        }}
                        style={({ pressed }) => [
                          styles.ctaButton,
                          styles.ctaNextButton,
                          styles.ctaNextButtonFull,
                          isPrimaryActionVisuallyDisabled ? styles.ctaButtonDisabled : null,
                          pressed && !isPrimaryActionVisuallyDisabled
                            ? styles.ctaButtonPressed
                            : null,
                        ]}>
                        <AppText language={pageLanguage} variant="caption" style={styles.ctaNextButtonText}>
                          {isSavingLessonCompletion ? pageCopy.practiceChecking : nextSectionButtonLabel}
                        </AppText>
                      </Pressable>
                    </View>
                    </View>
                  </View>
                </View>
              </GestureDetector>
            </View>
          )}
        </View>
      ) : null}

      <Modal
        visible={!isLoading && !errorMessage && !!lesson && hasStartedLesson && isMenuOpen}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => setIsMenuOpen(false)}>
        <View style={[styles.menuOverlayModalRoot, { paddingBottom: menuOverlayBottomInset }]}>
          <Pressable style={styles.menuBackdrop} onPress={() => setIsMenuOpen(false)} />
          <Card padding="md" radius="lg" style={styles.menuSheet}>
            <Stack gap="sm">
              <View style={styles.menuHeader}>
                <Pressable
                  accessibilityLabel={backToLibraryLabel}
                  accessibilityRole="button"
                  onPress={() => {
                    setIsMenuOpen(false);
                    requestAnimationFrame(() => {
                      void navigateToLessonLibrary();
                    });
                  }}
                  style={styles.menuHeaderButton}>
                  <IconSymbol name="book.fill" size={20} color={theme.colors.text} />
                </Pressable>

                <AppText language={pageLanguage} variant="body" style={styles.menuTitle}>
                  {sectionMenuLabel}
                </AppText>

                <Pressable accessibilityRole="button" onPress={() => setIsMenuOpen(false)} style={styles.menuHeaderButton}>
                  <MaterialIcons name="close" size={20} color={theme.colors.text} />
                </Pressable>
              </View>

              {lessonTabs.map((tab, index) => {
                const isActive = index === activeSectionIndex;
                return (
                  <Pressable
                    key={tab.id}
                    accessibilityRole="button"
                    onPress={() => {
                      navigateToSectionWithConversationGate(index);
                      setIsMenuOpen(false);
                    }}
                    style={[styles.menuItem, isActive ? styles.menuItemActive : null]}>
                    <View style={styles.menuItemIndex}>
                      <AppText language={pageLanguage} variant="caption" style={styles.menuItemIndexText}>
                        {index + 1}
                      </AppText>
                    </View>
                    <View style={styles.menuItemContent}>
                      <AppText language={pageLanguage} variant="body" style={styles.menuItemTitle}>
                        {getLessonSectionTitle(pageLanguage, tab.type, index)}
                      </AppText>
                      {tab.section && hasSectionAudio(tab.section) ? (
                        <AppText language={pageLanguage} variant="muted" style={styles.menuItemMeta}>
                          {pageCopy.audioReady}
                        </AppText>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </Stack>
          </Card>

          <View
            style={[
              styles.menuBottomNav,
              {
                height: APP_TAB_BAR_HEIGHT + insets.bottom,
                paddingBottom: Math.max(insets.bottom, theme.spacing.sm),
              },
            ]}>
            {overlayTabItems.map((item) => {
              const tintColor = item.isActive ? theme.colors.accent : theme.colors.mutedText;
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  onPress={() => {
                    setIsMenuOpen(false);
                    void item.onPress();
                  }}
                  style={styles.menuBottomNavItem}>
                  <IconSymbol color={tintColor} name={item.icon} size={24} />
                  <AppText
                    language={uiLanguage}
                    variant="caption"
                    style={[
                      styles.menuBottomNavLabel,
                      item.isActive ? styles.menuBottomNavLabelActive : null,
                      uiLanguage === 'th' ? styles.menuBottomNavLabelThai : styles.menuBottomNavLabelEnglish,
                    ]}>
                    {item.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const brutalShadow = {
  shadowColor: theme.colors.shadow,
  shadowOpacity: 1,
  shadowRadius: 0,
  shadowOffset: { width: 3, height: 3 },
  elevation: 3,
} as const;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  lessonContainer: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorWrap: {
    flex: 1,
    padding: theme.spacing.md,
    justifyContent: 'center',
  },
  errorText: {
    color: theme.colors.primary,
  },
  fullScreenCover: {
    flex: 1,
    backgroundColor: theme.colors.text,
  },
  coverImage: {
    flex: 1,
    backgroundColor: '#D8DDE5',
  },
  coverRemoteImage: {
    position: 'absolute',
    top: 34,
    left: 18,
    right: 18,
    bottom: 320,
    transform: [{ translateY: -12 }],
  },
  coverFallbackArt: {
    ...StyleSheet.absoluteFillObject,
  },
  coverFallbackFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#DCEEFF',
  },
  coverArtCircleLarge: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: theme.colors.accentMuted,
    right: -76,
    top: -14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  coverArtCircleSmall: {
    position: 'absolute',
    width: 164,
    height: 164,
    borderRadius: 82,
    backgroundColor: '#BFDFFF',
    left: -30,
    bottom: 120,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  coverArtCircleMedium: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#FFFFFF',
    right: 26,
    bottom: 220,
    borderWidth: 1,
    borderColor: theme.colors.border,
    opacity: 0.5,
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 21, 31, 0.34)',
  },
  coverContent: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xl + theme.spacing.xs,
    paddingBottom: theme.spacing.xl,
  },
  coverContentShell: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'space-between',
  },
  coverContentShellTablet: {
    maxWidth: 760,
  },
  coverTopMetaRow: {
    alignItems: 'flex-start',
    marginTop: theme.spacing.md,
  },
  coverTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    minHeight: 44,
    position: 'relative',
  },
  coverTopLeft: {
    width: 44,
    alignItems: 'flex-start',
    zIndex: 1,
  },
  coverTopCenter: {
    position: 'absolute',
    left: 56,
    right: 56,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stagePill: {
    color: theme.colors.surface,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: theme.radii.xl,
    overflow: 'hidden',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: theme.colors.surface,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surface,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  coverBottomPanel: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  coverLessonLabel: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.semibold,
  },
  coverTitle: {
    color: theme.colors.text,
    lineHeight: 32,
  },
  coverThaiTitle: {
    color: '#54565C',
    fontSize: theme.typography.sizes.lg,
    lineHeight: theme.typography.lineHeights.md,
  },
  coverFocusBlock: {
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  },
  coverFocusEyebrow: {
    color: theme.colors.primary,
    textTransform: 'uppercase',
    fontWeight: theme.typography.weights.semibold,
    marginBottom: theme.spacing.xs,
  },
  coverFocusText: {
    fontWeight: theme.typography.weights.medium,
  },
  coverLockedWrap: {
    gap: theme.spacing.sm,
  },
  coverLockedNotice: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderColor: theme.colors.border,
  },
  coverLockedTitle: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
  },
  coverLockedBody: {
    color: theme.colors.mutedText,
  },
  coverStartButton: {
    minHeight: 56,
  },
  coverInlineError: {
    color: theme.colors.mutedText,
    textAlign: 'center',
  },
  stepperScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  streakCelebrationWrap: {
    position: 'absolute',
    top: 56,
    left: 12,
    right: 12,
    zIndex: 30,
  },
  streakCelebrationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  streakCelebrationIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.warningSurface,
  },
  streakCelebrationCopy: {
    flex: 1,
    gap: 2,
  },
  streakCelebrationTitle: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
  },
  streakCelebrationBody: {
    color: theme.colors.mutedText,
  },
  streakCelebrationCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conversationIntroOverlayWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
  },
  conversationIntroModalRoot: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  studyTopChrome: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1.5,
    borderBottomColor: theme.colors.border,
  },
  studyBody: {
    flex: 1,
  },
  contentScroll: {
    flex: 1,
  },
  contentScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 60,
    gap: 14,
  },
  contentScrollContentTablet: {
    alignItems: 'center',
  },
  lessonContentShell: {
    width: '100%',
  },
  lessonContentShellTablet: {
    maxWidth: 760,
  },
  sectionBodyBlock: {
    marginTop: 8,
  },
  sectionBodyBlockTablet: {
    marginTop: 18,
  },
  sectionBodyBlockPager: {
    flex: 1,
    marginTop: 14,
  },
  studyNavBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  studyMenuButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#DCEEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studyMenuButtonText: {
    color: '#2E8FF1',
    fontSize: 16,
    lineHeight: 16,
    fontWeight: theme.typography.weights.semibold,
  },
  studyCounterText: {
    textAlign: 'center',
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: theme.typography.weights.semibold,
  },
  studyTitleBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 2,
    paddingBottom: 4,
  },
  studyNavActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    gap: 8,
  },
  studyNavStatusText: {
    color: theme.colors.mutedText,
    fontSize: 10,
    lineHeight: 12,
  },
  translatePill: {
    minWidth: 52,
    minHeight: 34,
    borderRadius: 999,
    backgroundColor: '#DCEEFF',
    paddingHorizontal: 12,
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  translatePillDisabled: {
    opacity: 0.7,
  },
  translatePillLabel: {
    minWidth: 24,
    minHeight: 16,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: 1 }],
  },
  translatePillText: {
    color: '#2E8FF1',
    fontSize: 13,
    lineHeight: 13,
    fontWeight: theme.typography.weights.semibold,
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  sectionDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  sectionDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#C9DBEE',
  },
  sectionDotVisited: {
    backgroundColor: '#FF4B4B',
  },
  sectionDotActive: {
    width: 18,
    backgroundColor: '#FF4B4B',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 7,
  },
  sectionHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  studySectionTitle: {
    flex: 1,
    flexShrink: 1,
    color: theme.colors.text,
    fontSize: 24,
    lineHeight: 30,
    paddingTop: 2,
  },
  studySectionTitleEnglish: {
    fontFamily: theme.typography.fontFaces.en.bold,
  },
  studySectionTitleThai: {
    fontFamily: theme.typography.fontFaces.th.bold,
  },
  fullscreenButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionDivider: {
    height: 1.5,
    backgroundColor: '#C7DCF0',
    marginTop: 2,
    marginBottom: 4,
  },
  sectionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  richPagerShell: {
    gap: theme.spacing.md,
  },
  richPagerCard: {
    minHeight: 420,
    gap: theme.spacing.md,
  },
  richPagerCardCompact: {
    minHeight: 380,
  },
  richPagerCardAutoHeight: {
    gap: theme.spacing.md,
  },
  richPagerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  richPagerMetaRowRichSection: {
    marginTop: 0,
  },
  richPagerCounterPill: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  richPagerCounterText: {
    color: '#787B82',
    fontWeight: theme.typography.weights.medium,
  },
  practicePagerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  richPagerHeadingWrap: {
    flex: 1,
    flexShrink: 1,
    gap: 6,
  },
  richPagerHeadingLabel: {
    color: theme.colors.text,
    fontSize: 21,
    lineHeight: 25,
    fontWeight: theme.typography.weights.semibold,
  },
  practicePagerHeadingLabel: {
    flex: 1,
    flexShrink: 1,
    fontSize: 20,
    lineHeight: 24,
    includeFontPadding: false,
  },
  practicePagerHeadingLabelEnglish: {
    fontFamily: theme.typography.fontFaces.en.semibold,
  },
  practicePagerHeadingLabelThai: {
    fontFamily: theme.typography.fontFaces.th.semibold,
  },
  practicePagerCounterText: {
    color: '#787B82',
    fontFamily: theme.typography.fontFaces.en.medium,
    fontSize: theme.typography.sizes.sm,
    lineHeight: 16,
    fontWeight: theme.typography.weights.medium,
    includeFontPadding: false,
    textAlignVertical: 'top',
  },
  commonMistakeScmLabel: {
    color: '#FF4545',
    fontWeight: theme.typography.weights.semibold,
  },
  richPagerBody: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  richPagerScrollContent: {
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  richPagerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  richPagerControlsStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: theme.spacing.sm,
  },
  richPagerControlsBottom: {
    position: 'relative',
    zIndex: 2,
    paddingHorizontal: theme.spacing.sm,
    paddingTop: 2,
    paddingBottom: 0,
  },
  bottomPagerDock: {
    backgroundColor: 'transparent',
    paddingTop: 0,
    marginBottom: -4,
    position: 'relative',
    zIndex: 2,
  },
  richPagerArrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  richPagerArrowButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  richPagerArrowButtonDisabled: {
    opacity: 0.28,
  },
  richPagerArrowSpacer: {
    width: 44,
    height: 44,
  },
  richPagerDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
  },
  richPagerDotsCompact: {
    gap: 6,
  },
  richPagerDotsStacked: {
    flex: 0,
    flexWrap: 'wrap',
    rowGap: 8,
    paddingHorizontal: theme.spacing.sm,
  },
  richPagerDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#D0D8E0',
  },
  richPagerDotCompact: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  richPagerDotActive: {
    width: 22,
    backgroundColor: theme.colors.primary,
  },
  richPagerDotActiveCompact: {
    width: 18,
  },
  phraseSectionShell: {
    marginTop: -10,
    gap: theme.spacing.sm,
  },
  phraseAccordionItem: {
    borderTopWidth: 1,
    borderTopColor: '#D9E4EE',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 6,
  },
  phraseAccordionItemFirst: {
    borderTopWidth: 0,
  },
  phraseAccordionItemLast: {
    borderBottomWidth: 1,
    borderBottomColor: '#D9E4EE',
  },
  phraseAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  phraseAccordionHeaderTextWrap: {
    flex: 1,
    gap: 2,
  },
  phraseAccordionTitle: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: theme.typography.weights.semibold,
  },
  phraseAccordionMeta: {
    color: theme.colors.mutedText,
  },
  phraseAccordionChevron: {
    color: theme.colors.mutedText,
    fontSize: 36,
    lineHeight: 36,
  },
  phraseAccordionChevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  phraseAccordionBody: {
    paddingTop: theme.spacing.md,
  },
  phraseMetaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  phraseVariantText: {
    color: theme.colors.mutedText,
  },
  phraseContentWrap: {
    gap: 0,
  },
  phraseNotesLabel: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.semibold,
    textTransform: 'uppercase',
  },
  phraseHeading: {
    fontWeight: theme.typography.weights.bold,
  },
  phraseSubheader: {
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  phraseBodyText: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  phraseListRow: {
    marginBottom: theme.spacing.xs,
  },
  phraseAudioBlock: {
    gap: theme.spacing.md,
  },
  phraseAudioBlockCompact: {
    gap: theme.spacing.sm,
  },
  phraseAudioBlockAfterFirst: {
    marginTop: theme.spacing.md,
  },
  phraseAudioContainedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: theme.spacing.sm,
  },
  phraseAudioContainedRowCompact: {
    marginTop: theme.spacing.xs,
  },
  phraseAudioMarkerLane: {
    position: 'relative',
    width: PHRASE_AUDIO_MARKER_LANE_WIDTH,
    minHeight: RICH_AUDIO_BUTTON_WIDTH,
    alignItems: 'flex-start',
    flexShrink: 0,
  },
  phraseAccentMarkerInline: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: RICH_ACCENT_BAR_WIDTH,
    backgroundColor: APPLY_ACCENT_COLOR,
  },
  phraseAudioContentLane: {
    flex: 1,
    minWidth: 0,
  },
  phraseAudioRow: {
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  phraseAudioButtonOffset: {
    marginTop: 1,
  },
  phraseLeadAudioButtonOffset: {
    marginTop: -3,
  },
  phraseAudioRowCompact: {
    marginTop: theme.spacing.xs,
  },
  phraseAudioText: {
    paddingTop: 0,
    fontSize: 15,
    lineHeight: 21,
  },
  phraseAudioTextCompact: {
    lineHeight: 15,
  },
  phraseLeadAudioText: {
    fontWeight: theme.typography.weights.semibold,
  },
  phraseDivider: {
    height: 1,
    backgroundColor: '#D6D6D6',
    marginHorizontal: 8,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  phraseDialogueEnglishTurn: {
    marginTop: 4,
  },
  phraseDialogueThaiTurn: {
    marginTop: -3,
  },
  cultureNoteShell: {
    paddingVertical: theme.spacing.xs,
  },
  cultureNoteLeadHeading: {
    color: theme.colors.text,
    fontSize: 21,
    lineHeight: 25,
    fontWeight: theme.typography.weights.semibold,
    marginBottom: theme.spacing.sm,
  },
  richGroupBand: {
    marginHorizontal: -14,
    borderRadius: 0,
    paddingHorizontal: 24,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  richGroupBandEven: {
    backgroundColor: '#FCFDFE',
  },
  richGroupBandOdd: {
    backgroundColor: '#F5F9FD',
  },
  richParagraph: {
    fontSize: 15,
    lineHeight: 25,
  },
  richBodyTextCompact: {
    fontSize: 14,
    lineHeight: 23,
  },
  richSubheader: {
    color: theme.colors.text,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: theme.typography.weights.semibold,
    marginBottom: theme.spacing.sm,
  },
  richInlineText: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 25,
  },
  richInlineTextEnglish: {
    fontFamily: theme.typography.fontFaces.en.regular,
  },
  richInlineTextThai: {
    fontFamily: theme.typography.fontFaces.th.regular,
  },
  richInlineSubheaderText: {
    fontSize: 19,
    lineHeight: 27,
  },
  richInlineBoldEnglish: {
    fontFamily: theme.typography.fontFaces.en.semibold,
  },
  richInlineBoldThai: {
    fontFamily: theme.typography.fontFaces.th.semibold,
  },
  richInlineUnderline: {
    textDecorationLine: 'underline',
  },
  richInlineBlank: {
    color: 'transparent',
    textDecorationLine: 'underline',
    textDecorationColor: theme.colors.text,
  },
  richSpeakerPrefix: {
    fontFamily: theme.typography.fontFaces.en.semibold,
  },
  richInlineThaiMuted: {
    color: '#8C8D93',
  },
  richSpeakerPrefixThai: {
    color: '#8C8D93',
    fontFamily: theme.typography.fontFaces.th.semibold,
  },
  richInlineHighlight: {
    borderRadius: theme.radii.sm,
    overflow: 'hidden',
    paddingHorizontal: 2,
  },
  richInlineHighlightPink: {
    backgroundColor: '#F4CCCC',
  },
  richInlineHighlightGreen: {
    backgroundColor: '#D9EAD3',
  },
  richInlineHighlightBlue: {
    backgroundColor: '#C9DAF8',
  },
  richInlineLink: {
    textDecorationLine: 'underline',
    color: '#676769',
  },
  richInlineMarker: {
    fontWeight: theme.typography.weights.semibold,
  },
  richInlineMarkerRed: {
    color: '#FD6969',
  },
  richInlineMarkerBlue: {
    color: '#3CA0FE',
  },
  richInlineMarkerGreen: {
    color: '#28A265',
  },
  richListRow: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  richTextColumnLane: {
    position: 'relative',
    minWidth: 0,
  },
  understandAudioRow: {
    minWidth: 0,
  },
  richAudioMarkerButton: {
    position: 'absolute',
    left: RICH_AUDIO_MARKER_LEFT,
    top: 0,
  },
  richAccentMarker: {
    position: 'absolute',
    left: RICH_ACCENT_MARKER_LEFT,
    top: 0,
    bottom: 0,
    width: RICH_ACCENT_BAR_WIDTH,
    backgroundColor: APPLY_ACCENT_COLOR,
  },
  richAudioTextWrap: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  understandAudioText: {
    fontSize: 15,
    lineHeight: 18,
    paddingTop: 0,
    flexShrink: 1,
    minWidth: 0,
  },
  richAudioLineStack: {
    gap: 0,
    paddingTop: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  richThaiTextCompact: {
    lineHeight: 22,
  },
  richAudioTextCompact: {
    lineHeight: 18,
  },
  richAudioTranslationRow: {
    marginTop: 5,
  },
  phraseAudioTranslationRow: {
    marginTop: -3,
  },
  richBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginTop: 9,
    flexShrink: 0,
  },
  richListText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 25,
  },
  richNumberBadge: {
    minWidth: 24,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    backgroundColor: '#F0F0F0',
    marginTop: 2,
  },
  richNumberBadgeMarker: {
    position: 'absolute',
    left: RICH_NUMBER_MARKER_LEFT,
    top: 2,
    minWidth: 24,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    backgroundColor: '#F0F0F0',
  },
  richNumberBadgeText: {
    color: '#666A73',
    fontWeight: theme.typography.weights.semibold,
  },
  richSpacer: {
    height: theme.spacing.sm,
  },
  richImageWrap: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  richImage: {
    width: '100%',
    maxWidth: 600,
    height: 250,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.background,
  },
  richTableScroller: {
    marginVertical: theme.spacing.sm,
    marginHorizontal: -14,
  },
  richTableInlineContainer: {
    marginVertical: theme.spacing.sm,
    width: '100%',
  },
  richTableScrollerContent: {
    paddingHorizontal: theme.spacing.xs,
    flexGrow: 1,
    justifyContent: 'center',
  },
  richTableWrap: {
    borderWidth: 1,
    borderColor: '#CDD7E5',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    alignSelf: 'center',
  },
  richTableWrapConstrained: {
    alignSelf: 'stretch',
  },
  richTableRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'stretch',
  },
  richTableHeaderRow: {
    backgroundColor: '#F3F6FA',
  },
  richTableAltRow: {
    backgroundColor: '#FAFCFE',
  },
  richTableCell: {
    minWidth: 0,
    flexShrink: 0,
    flexGrow: 0,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#CDD7E5',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    gap: 4,
  },
  richTableCellLast: {
    borderRightWidth: 0,
  },
  richTableHeaderCell: {
    backgroundColor: '#F3F6FA',
  },
  richTableCellText: {
    fontSize: theme.typography.sizes.sm,
    lineHeight: theme.typography.lineHeights.sm,
    color: theme.colors.text,
  },
  richThaiTableTextCompact: {
    lineHeight: 16,
  },
  richTableHeaderText: {
    fontWeight: theme.typography.weights.semibold,
  },
  richTableAudioLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  richTableAudioText: {
    flex: 1,
    fontSize: theme.typography.sizes.sm,
    lineHeight: theme.typography.lineHeights.sm,
    color: theme.colors.text,
  },
  richTableCellPink: {
    backgroundColor: '#F4CCCC',
  },
  richTableCellGreen: {
    backgroundColor: '#D9EAD3',
  },
  richTableCellBlue: {
    backgroundColor: '#C9DAF8',
  },
  richIndent1: {
    paddingLeft: theme.spacing.md,
  },
  richIndent2: {
    paddingLeft: theme.spacing.xl,
  },
  richIndent3: {
    paddingLeft: theme.spacing.xl + theme.spacing.lg,
  },
  prepareCard: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    ...brutalShadow,
  },
  prepareCardHeader: {
    gap: theme.spacing.sm,
  },
  prepareCardEyebrow: {
    color: '#9A9A9A',
    fontSize: 12,
    lineHeight: 14,
    fontWeight: theme.typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  prepareCardSubtitle: {
    color: theme.colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  prepareList: {
    gap: theme.spacing.sm,
    marginLeft: -12,
  },
  prepareItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    paddingVertical: 2,
  },
  prepareAudioSlot: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexShrink: 0,
  },
  prepareAudioPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: '#EEF4FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prepareAudioPlaceholderText: {
    color: theme.colors.mutedText,
    fontSize: 10,
    lineHeight: 10,
  },
  prepareTextWrap: {
    flex: 1,
    paddingTop: 0,
    marginTop: -1,
  },
  prepareTextWrapWithDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#E1E1E1',
    paddingBottom: theme.spacing.sm,
  },
  prepareItemText: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 26,
    letterSpacing: 0.15,
  },
  prepareItemTextEnglish: {
    fontFamily: theme.typography.fontFaces.en.regular,
  },
  prepareItemTextThai: {
    fontFamily: theme.typography.fontFaces.th.regular,
  },
  prepareItemLeadText: {
    fontFamily: theme.typography.fontFaces.en.semibold,
  },
  prepareEmptyText: {
    color: theme.colors.mutedText,
  },
  comprehensionFlow: {
    gap: theme.spacing.lg,
  },
  comprehensionProgressHeader: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    ...brutalShadow,
  },
  comprehensionProgressLabel: {
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: theme.typography.weights.semibold,
  },
  questionBlock: {
    gap: 10,
    paddingHorizontal: theme.spacing.xs,
  },
  questionPromptRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  questionNumberText: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: theme.typography.weights.bold,
  },
  questionPromptContent: {
    flex: 1,
    gap: 2,
  },
  questionPromptText: {
    color: theme.colors.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: theme.typography.weights.semibold,
  },
  questionPromptThaiText: {
    color: theme.colors.mutedText,
    fontSize: 16,
    lineHeight: 22,
  },
  comprehensionOptionsList: {
    marginLeft: 4,
  },
  quizOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: 2,
    paddingVertical: theme.spacing.xs,
  },
  quizOptionButtonSelected: {},
  quizOptionButtonCorrect: {},
  quizOptionButtonWrong: {},
  quizOptionLetter: {
    position: 'relative',
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  quizOptionLetterSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.border,
  },
  quizOptionLetterCorrect: {
    backgroundColor: theme.colors.text,
  },
  quizOptionLetterWrong: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  quizOptionLetterText: {
    color: theme.colors.text,
    fontSize: 11,
    lineHeight: 11,
    fontWeight: theme.typography.weights.semibold,
  },
  quizOptionLetterTextInverse: {
    color: theme.colors.surface,
  },
  quizOptionCheckmarkBadge: {
    position: 'absolute',
    right: -7,
    top: -7,
    width: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: theme.colors.success,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quizOptionLetterTextCorrect: {
    color: theme.colors.success,
  },
  quizOptionTextWrap: {
    flex: 1,
    gap: 2,
  },
  quizOptionText: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18,
  },
  quizOptionTextThai: {
    color: theme.colors.mutedText,
    fontSize: 14,
    lineHeight: 18,
  },
  optionImage: {
    width: 72,
    height: 72,
    borderRadius: theme.radii.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  feedbackBlock: {
    gap: 4,
    paddingTop: 2,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feedbackDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    flexShrink: 0,
  },
  feedbackDotSuccess: {
    backgroundColor: theme.colors.success,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  feedbackHeadline: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: theme.typography.weights.semibold,
  },
  feedbackHeadlineSecondary: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: theme.typography.weights.medium,
  },
  feedbackBody: {
    color: theme.colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  transcriptItem: {
    paddingVertical: theme.spacing.xs,
  },
  transcriptLineGroup: {
    gap: 2,
  },
  transcriptLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  transcriptSpeaker: {
    fontWeight: theme.typography.weights.semibold,
    fontSize: theme.typography.sizes.sm,
    lineHeight: theme.typography.lineHeights.sm,
  },
  transcriptSpeakerThai: {
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.mutedText,
    fontSize: theme.typography.sizes.sm,
    lineHeight: theme.typography.lineHeights.sm,
  },
  transcriptText: {
    flexShrink: 1,
    fontSize: theme.typography.sizes.sm,
    lineHeight: theme.typography.lineHeights.sm,
  },
  transcriptTextThai: {
    flexShrink: 1,
    color: theme.colors.mutedText,
    fontSize: theme.typography.sizes.sm,
    lineHeight: theme.typography.lineHeights.sm,
  },
  applyPromptWrap: {
    gap: theme.spacing.sm,
  },
  applyHeading: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: theme.typography.weights.medium,
    marginBottom: theme.spacing.xs,
  },
  applyPromptText: {
    fontSize: 15,
    lineHeight: 24,
  },
  applyParagraphRow: {
    marginBottom: theme.spacing.sm,
  },
  applyParagraphRowCompact: {
    marginBottom: theme.spacing.xs,
  },
  applyInstructionRow: {
    marginTop: theme.spacing.sm,
  },
  applyParagraphText: {
    fontSize: 15,
    lineHeight: 24,
  },
  applyInstructionText: {
    fontWeight: theme.typography.weights.semibold,
  },
  applyInlineText: {
    fontSize: 15,
    lineHeight: 24,
    color: theme.colors.text,
  },
  applyInlineTextEnglish: {
    fontFamily: theme.typography.fontFaces.en.regular,
  },
  applyInlineTextThai: {
    fontFamily: theme.typography.fontFaces.th.regular,
  },
  applyInlineBoldEnglish: {
    fontFamily: theme.typography.fontFaces.en.semibold,
  },
  applyInlineBoldThai: {
    fontFamily: theme.typography.fontFaces.th.semibold,
  },
  applyInlineUnderline: {
    textDecorationLine: 'underline',
  },
  applyAccentBlock: {
    marginLeft: -6,
    borderLeftWidth: 4,
    borderLeftColor: APPLY_ACCENT_COLOR,
    paddingLeft: 10,
  },
  applyNoteText: {
    color: theme.colors.mutedText,
    fontStyle: 'italic',
  },
  applyInput: {
    minHeight: 110,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  applyInputEnglish: {
    fontFamily: theme.typography.fontFaces.en.regular,
  },
  applyInputThai: {
    fontFamily: theme.typography.fontFaces.th.regular,
  },
  applyInputDisabled: {
    opacity: 0.7,
  },
  applyActionsRow: {
    marginTop: theme.spacing.xs,
  },
  comprehensionInlineButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.xl,
    backgroundColor: '#91CAFF',
    ...brutalShadow,
  },
  comprehensionInlineButtonText: {
    color: theme.colors.text,
  },
  comprehensionSuccessText: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: theme.typography.weights.semibold,
    textAlign: 'center',
  },
  applyResponseWrap: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.md,
  },
  applyResponseNote: {
    color: '#767676',
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  practiceExerciseCard: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    ...brutalShadow,
  },
  practiceExerciseHeader: {
    gap: theme.spacing.sm,
  },
  practiceExerciseBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xl,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    backgroundColor: theme.colors.warningSurface,
  },
  practiceExerciseBadgeText: {
    fontWeight: theme.typography.weights.semibold,
  },
  practiceExerciseTitle: {
    fontWeight: theme.typography.weights.semibold,
  },
  practiceExercisePrompt: {
    color: theme.colors.mutedText,
    fontSize: 14,
    lineHeight: 20,
  },
  practiceExercisePromptCompact: {
    fontSize: 14,
    lineHeight: 20,
  },
  quickPracticeInlineWrap: {
    width: '100%',
    paddingVertical: theme.spacing.xs,
  },
  practicePromptBlock: {
    gap: theme.spacing.xs,
  },
  practicePromptBlockText: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  practicePromptBlockThaiText: {
    color: theme.colors.mutedText,
    fontSize: 14,
    lineHeight: 20,
  },
  practicePromptListRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  practicePromptListBullet: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
    marginTop: 8,
    flexShrink: 0,
  },
  practicePromptListText: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  practicePromptFeatureWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  practicePromptFeatureImageShell: {
    width: '100%',
    maxWidth: 320,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  practicePromptFeatureImage: {
    width: '100%',
    height: 220,
  },
  practicePromptAudioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  practicePromptAudioLabel: {
    color: theme.colors.mutedText,
  },
  practiceItemAudioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: 2,
  },
  practiceItemAudioLabel: {
    color: theme.colors.mutedText,
    fontWeight: theme.typography.weights.medium,
  },
  practiceQuestionCard: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  comprehensionQuestionCard: {
    paddingLeft: 10,
  },
  comprehensionFirstQuestionCard: {
    marginTop: 10,
  },
  comprehensionQuestionDivider: {
    height: 1,
    backgroundColor: '#E1E1E1',
    marginLeft: theme.spacing.xs,
    marginRight: theme.spacing.sm,
    marginTop: 12,
    marginBottom: 2,
  },
  practiceExampleCard: {
    borderRadius: 22,
    backgroundColor: '#E6F2FF',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  practiceExampleHeader: {
    alignItems: 'flex-start',
  },
  practiceExampleLabel: {
    color: '#3CA0FE',
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 0.6,
  },
  practiceExampleBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    flexWrap: 'wrap',
  },
  practiceExampleBodyStacked: {
    flexDirection: 'column',
    gap: theme.spacing.sm,
  },
  practiceExampleImageShell: {
    flexBasis: 220,
    flexGrow: 1,
    minWidth: 180,
    borderRadius: 18,
    backgroundColor: '#F8FBFF',
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#DDE7FA',
  },
  practiceExampleImageShellStacked: {
    width: '100%',
    flexBasis: 'auto',
    flexGrow: 0,
    minWidth: 0,
  },
  practiceExampleContent: {
    flexBasis: 240,
    flexGrow: 1,
    gap: theme.spacing.sm,
  },
  practiceExampleContentStacked: {
    width: '100%',
    flexBasis: 'auto',
    flexGrow: 0,
    minWidth: 0,
  },
  practiceQuestionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  practiceMultipleChoiceQuestionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  practiceMultipleChoiceQuestionHeaderDeindented: {
    marginLeft: -4,
  },
  comprehensionQuestionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 0,
    marginLeft: -8,
    marginBottom: theme.spacing.xs,
  },
  practiceMultipleChoiceQuestionTextWrap: {
    gap: theme.spacing.sm,
  },
  comprehensionQuestionTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  practiceFillBlankQuestionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
  },
  practiceFillBlankQuestionHeaderBaseline: {
    alignItems: 'baseline',
  },
  practiceFillBlankExampleBody: {
    width: '100%',
  },
  practiceFillBlankNumberSlot: {
    minWidth: 10,
    alignItems: 'flex-start',
  },
  practiceFillBlankNumberSlotNoImage: {
    minWidth: 10,
    minHeight: 30,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  practiceFillBlankContentWrap: {
    gap: theme.spacing.md,
    paddingLeft: 4,
    paddingRight: theme.spacing.sm,
  },
  practiceFillBlankExampleContentWrap: {
    width: '100%',
    flex: 0,
  },
  practiceOpenQuestionRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
  },
  practiceOpenQuestionNumberSlot: {
    minWidth: 14,
    paddingTop: 4,
    alignItems: 'flex-start',
  },
  practiceOpenQuestionMain: {
    flex: 1,
    minWidth: 0,
    alignItems: 'stretch',
    gap: theme.spacing.sm,
  },
  practiceOpenQuestionTextWrap: {
    width: '100%',
    gap: 2,
  },
  practiceQuestionChevron: {
    width: 24,
    textAlign: 'center',
    fontWeight: theme.typography.weights.semibold,
  },
  practiceQuestionNumber: {
    minWidth: 10,
    color: theme.colors.text,
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.lineHeights.md,
    fontWeight: theme.typography.weights.bold,
  },
  comprehensionQuestionNumber: {
    minWidth: 16,
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 16,
    fontFamily: theme.typography.fontFaces.en.extraBold,
  },
  practiceFillBlankExampleNumber: {
    minWidth: 72,
  },
  practiceQuestionTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  practiceMultipleChoicePromptImageShell: {
    width: 184,
    minHeight: 148,
    borderWidth: 1,
    borderColor: '#E6EAF2',
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    ...brutalShadow,
  },
  practiceMultipleChoicePromptImage: {
    width: '100%',
    height: 130,
  },
  practiceQuestionText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.regular,
    flexShrink: 1,
    fontSize: 14.5,
    lineHeight: 21,
  },
  practiceMultipleChoiceQuestionText: {
    fontSize: 14,
    lineHeight: 18,
  },
  practiceSentenceTransformQuestionText: {
    fontSize: 14.5,
    lineHeight: 21,
  },
  practiceExamplePromptText: {
    color: 'rgba(30, 30, 30, 0.78)',
  },
  practiceSentenceExamplePromptText: {
    fontFamily: theme.typography.fontFaces.en.regular,
    fontWeight: theme.typography.weights.regular,
  },
  comprehensionQuestionText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.medium,
    fontSize: 13.5,
    lineHeight: 18,
    flexShrink: 1,
  },
  practiceQuestionTextCompact: {
    fontSize: theme.typography.sizes.sm,
    lineHeight: theme.typography.lineHeights.sm,
  },
  practiceQuestionThaiText: {
    color: theme.colors.mutedText,
  },
  practiceMultipleChoiceQuestionThaiText: {
    fontSize: 14,
    lineHeight: 18,
  },
  comprehensionQuestionThaiText: {
    color: theme.colors.mutedText,
    fontSize: 13.5,
    lineHeight: 18,
    flexShrink: 1,
  },
  practiceQuestionThaiTextCompact: {
    fontSize: theme.typography.sizes.sm,
    lineHeight: theme.typography.lineHeights.sm,
  },
  practiceInlineAudioRow: {
    marginBottom: theme.spacing.xs,
  },
  practiceSentenceToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  practiceSentenceToggle: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  practiceSentenceToggleActive: {
    backgroundColor: '#91CAFF',
    borderColor: theme.colors.border,
  },
  practiceSentenceToggleText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
    fontSize: 12,
    lineHeight: 14,
  },
  practiceFillBlankRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 0,
    rowGap: 1,
  },
  practiceFillBlankMeasuredRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    columnGap: 0,
  },
  practiceFillBlankMeasuredShell: {
    width: '100%',
    alignSelf: 'stretch',
  },
  practiceFillBlankMirrorShell: {
    opacity: 0,
    width: '100%',
  },
  practiceFillBlankMirrorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 0,
    rowGap: 1,
  },
  practiceFillBlankMirrorBlank: {
    height: 30,
    minHeight: 30,
  },
  practiceFillBlankMirrorBlankCompact: {
    height: 26,
    minHeight: 26,
  },
  practiceFillBlankMeasureText: {
    position: 'absolute',
    opacity: 0,
    left: 0,
    right: 0,
    fontSize: theme.typography.sizes.md,
    lineHeight: 24,
  },
  practiceInlineText: {
    color: theme.colors.text,
    fontSize: 14.5,
    lineHeight: 21,
  },
  practiceInlineTextCompact: {
    fontSize: 14.5,
    lineHeight: 21,
  },
  practiceInlineBracketText: {
    color: '#9C9EA4',
  },
  practiceInlineBold: {
    fontWeight: theme.typography.weights.semibold,
  },
  practiceInlineItalic: {
    fontStyle: 'italic',
  },
  practiceInlineUnderlineWrap: {
    position: 'relative',
    justifyContent: 'flex-end',
    paddingBottom: 0,
  },
  practiceInlineUnderlineLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 1,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.text,
  },
  practiceInlineUnderline: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.text,
    paddingBottom: 0,
  },
  practiceInlineBlank: {
    color: 'transparent',
    textDecorationLine: 'underline',
    textDecorationColor: theme.colors.text,
  },
  practiceFillBlankInputShell: {
    height: 30,
    minHeight: 30,
    borderWidth: 1.1,
    borderColor: '#000000',
    borderRadius: 12,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
  },
  practiceFillBlankInputShellCompact: {
    height: 26,
    minHeight: 26,
    borderRadius: 10,
    paddingHorizontal: theme.spacing.xs,
  },
  practiceFillBlankInputField: {
    width: '100%',
    minWidth: 0,
    flex: 1,
    height: '100%',
    fontSize: 14.5,
    color: theme.colors.text,
    padding: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  practiceFillBlankInputFieldCompact: {
    fontSize: 14.5,
  },
  practiceFillBlankInputShort: {
    minWidth: 80,
  },
  practiceFillBlankInputLong: {
    minWidth: 120,
  },
  practiceFillBlankInputShortCompact: {
    minWidth: 96,
  },
  practiceFillBlankInputLongCompact: {
    minWidth: 112,
  },
  practiceExampleAnswer: {
    color: theme.colors.mutedText,
  },
  practiceOpenRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    flexWrap: 'wrap',
  },
  practiceOpenColumn: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: theme.spacing.sm,
  },
  practiceAbPromptStack: {
    gap: theme.spacing.xs,
  },
  practiceAbAnswerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  practicePromptImageShell: {
    width: 148,
    minHeight: 148,
    borderWidth: 1,
    borderColor: '#E6EAF2',
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    ...brutalShadow,
  },
  practicePromptImageShellStacked: {
    width: '100%',
    alignSelf: 'stretch',
    height: 136,
    minHeight: 136,
  },
  practicePromptOnlyImageCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  practicePromptImageShellLarge: {
    width: 184,
    minHeight: 184,
  },
  practicePromptImagePressable: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  practicePromptImagePressed: {
    opacity: 0.9,
  },
  practicePromptImage: {
    width: '100%',
    height: 120,
  },
  practicePromptImageLarge: {
    height: 158,
  },
  practiceImagePreviewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(18, 22, 28, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xl,
  },
  practiceImagePreviewCloseButton: {
    position: 'absolute',
    top: 56,
    right: theme.spacing.md,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  practiceImagePreviewImage: {
    width: '100%',
    maxWidth: 720,
    height: '100%',
    maxHeight: '82%',
  },
  practiceOpenInputWrap: {
    flex: 1,
    minWidth: 210,
  },
  practiceOpenInputWrapStacked: {
    width: '100%',
    alignSelf: 'stretch',
    flex: 0,
    minWidth: 0,
  },
  practiceOpenInputStacked: {
    marginTop: theme.spacing.sm,
  },
  practiceOpenInlineInput: {
    minWidth: 140,
    height: 40,
    borderWidth: 1.1,
    borderColor: '#000000',
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    paddingTop: 0,
    paddingBottom: 0,
    fontSize: theme.typography.sizes.md,
    lineHeight: 20,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    flexGrow: 1,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  practiceOpenInlineInputShell: {
    minWidth: 140,
    height: 40,
    borderWidth: 1.1,
    borderColor: '#000000',
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: theme.colors.surface,
    flexGrow: 1,
    justifyContent: 'center',
    position: 'relative',
  },
  practiceOpenInlineInputField: {
    flex: 1,
    height: '100%',
    minWidth: 0,
    padding: 0,
    borderWidth: 0,
    fontSize: 14.5,
    lineHeight: 21,
    color: theme.colors.text,
    backgroundColor: 'transparent',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  practiceOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: 2,
    paddingVertical: theme.spacing.xs,
  },
  comprehensionOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: 2,
    paddingVertical: theme.spacing.xs,
  },
  comprehensionOptionButtonSelected: {
    borderRadius: theme.radii.md,
    backgroundColor: '#EFF6FF',
  },
  comprehensionOptionButtonSelectedCorrect: {
    borderRadius: theme.radii.md,
    backgroundColor: '#3CA0FE40',
  },
  comprehensionOptionButtonSelectedWrong: {
    borderRadius: theme.radii.md,
    backgroundColor: '#FD69694D',
  },
  practiceOptionButtonSelected: {
    borderRadius: theme.radii.md,
    backgroundColor: '#EFF6FF',
  },
  practiceOptionButtonCorrect: {},
  practiceOptionButtonWrong: {},
  practiceOptionLetter: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  comprehensionOptionLetter: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  comprehensionOptionLetterSelected: {
    backgroundColor: '#3CA0FE',
    borderColor: theme.colors.border,
  },
  comprehensionOptionLetterCorrect: {
    backgroundColor: '#3CA0FE',
    borderColor: theme.colors.border,
  },
  comprehensionOptionLetterWrong: {
    backgroundColor: '#F65555',
    borderColor: theme.colors.border,
  },
  practiceOptionLetterSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.border,
  },
  practiceOptionLetterCorrect: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.border,
  },
  practiceOptionLetterWrong: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.border,
  },
  practiceOptionLetterText: {
    fontFamily: theme.typography.fontFaces.en.medium,
    color: theme.colors.text,
    fontSize: 11,
    lineHeight: 12,
    fontWeight: theme.typography.weights.semibold,
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
    transform: [{ translateY: 1 }],
  },
  comprehensionOptionLetterText: {
    fontFamily: theme.typography.fontFaces.en.medium,
    color: theme.colors.text,
    fontSize: 11,
    lineHeight: 12,
    fontWeight: theme.typography.weights.semibold,
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
    transform: [{ translateY: 1 }],
  },
  practiceOptionLetterTextInverse: {
    color: theme.colors.surface,
  },
  practiceOptionLetterTextCorrect: {
    color: theme.colors.text,
  },
  practiceOptionTextWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 2,
  },
  comprehensionOptionTextWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 2,
  },
  practiceOptionOutcomeMark: {
    minWidth: 18,
    textAlign: 'center',
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '700',
    alignSelf: 'center',
    flexShrink: 0,
  },
  comprehensionOutcomeMarkCorrect: {
    color: '#3CA0FE',
  },
  practiceOptionOutcomeMarkWrong: {
    color: '#DC2626',
  },
  comprehensionOutcomeMarkWrong: {
    color: '#F65555',
  },
  practiceOptionImageShell: {
    width: '100%',
    maxWidth: 240,
    minHeight: 116,
    borderWidth: 1,
    borderColor: '#E6EAF2',
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xs,
  },
  practiceOptionImage: {
    width: '100%',
    height: 108,
  },
  practiceOptionText: {
    color: theme.colors.text,
    fontSize: 14.5,
    lineHeight: 21,
    flexShrink: 1,
  },
  practiceMultipleChoiceOptionText: {
    fontSize: 14,
    lineHeight: 18,
  },
  comprehensionOptionText: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18,
    flexShrink: 1,
  },
  practiceOptionTextCompact: {
    fontSize: 14.5,
    lineHeight: 21,
  },
  practiceOptionThaiText: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.sizes.sm,
    lineHeight: theme.typography.lineHeights.sm,
    flexShrink: 1,
  },
  practiceMultipleChoiceOptionThaiText: {
    fontSize: 14,
    lineHeight: 18,
  },
  comprehensionOptionThaiText: {
    color: theme.colors.mutedText,
    fontSize: 14,
    lineHeight: 18,
    flexShrink: 1,
  },
  practiceOptionThaiTextCompact: {
    fontSize: 13,
    lineHeight: 17,
  },
  practiceActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
    marginTop: 6,
  },
  comprehensionActionsRow: {
    marginBottom: 0,
  },
  practiceActionButton: {
    minHeight: 40,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  practiceCheckButton: {
    backgroundColor: '#91CAFF',
    ...brutalShadow,
  },
  practiceActionButtonText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semibold,
  },
  comprehensionCheckButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: theme.typography.weights.semibold,
  },
  comprehensionCheckButton: {
    flex: 1,
    backgroundColor: '#91CAFF',
    ...brutalShadow,
  },
  practiceFeedbackBox: {
    marginLeft: 14,
    gap: theme.spacing.xs,
  },
  practiceFeedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  practiceFeedbackHeadline: {
    flex: 1,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semibold,
  },
  practiceFeedbackHeadlineCompact: {
    fontSize: theme.typography.sizes.sm,
    lineHeight: theme.typography.lineHeights.sm,
  },
  practiceFeedbackBody: {
    color: '#4C6584',
    fontWeight: theme.typography.weights.medium,
    fontSize: 11,
    lineHeight: 16,
  },
  practiceFeedbackBodyCompact: {
    fontSize: 13,
    lineHeight: 17,
  },
  practiceFeedbackDotWarning: {
    backgroundColor: theme.colors.primary,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  practiceOpenInput: {
    width: '100%',
    minHeight: 100,
    borderWidth: 1.5,
    borderColor: 'rgba(30, 30, 30, 0.24)',
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.lineHeights.md,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  practiceOpenInputShell: {
    width: '100%',
    minHeight: 100,
    borderWidth: 1.1,
    borderColor: '#000000',
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    backgroundColor: theme.colors.surface,
    position: 'relative',
  },
  practiceOpenInputField: {
    width: '100%',
    flex: 1,
    minHeight: 0,
    padding: 0,
    borderWidth: 0,
    fontSize: 14.5,
    lineHeight: 21,
    color: theme.colors.text,
    backgroundColor: 'transparent',
  },
  practiceOpenInputEnglish: {
    fontFamily: theme.typography.fontFaces.en.regular,
  },
  practiceOpenInputThai: {
    fontFamily: theme.typography.fontFaces.th.regular,
  },
  practiceOpenInputShellChecked: {
    paddingRight: 44,
  },
  practiceOpenInputFieldWithBadge: {
    paddingRight: 8,
  },
  practiceSentenceTransformInput: {
    minHeight: 42,
    borderWidth: 1.1,
    borderColor: '#000000',
    paddingVertical: 2,
    fontSize: 14.5,
    lineHeight: 21,
  },
  practiceSentenceTransformInputShell: {
    minHeight: 42,
    borderWidth: 1.1,
    borderColor: '#000000',
    paddingVertical: 2,
  },
  practiceSentenceTransformInputField: {
    minHeight: 36,
    fontSize: 14.5,
    lineHeight: 21,
  },
  practiceExampleInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.1,
    borderColor: '#000000',
    color: '#62656D',
  },
  practiceExampleSentenceAnswerRow: {
    width: '100%',
  },
  practiceExampleSentenceAnswerShell: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.1,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderColor: '#000000',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  practiceExampleSentenceAnswerShellOneLine: {
    minHeight: 38,
  },
  practiceExampleSentenceAnswerShellTwoLine: {
    minHeight: 58,
    justifyContent: 'flex-start',
  },
  practiceExampleSentenceAnswerShellForcedOneLine: {
    height: 42,
    minHeight: 42,
    maxHeight: 42,
  },
  practiceExampleAnswerText: {
    flex: 1,
    minWidth: 0,
    color: '#62656D',
    fontSize: theme.typography.sizes.md,
    lineHeight: 20,
  },
  practiceExampleSentenceCorrectBadge: {
    marginLeft: theme.spacing.sm,
    width: 14,
    height: 14,
    borderRadius: 4,
    backgroundColor: '#3CA0FE',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  practiceExampleSentenceIncorrectBadge: {
    backgroundColor: '#FD6969',
  },
  practiceExampleSentenceCorrectBadgeText: {
    color: theme.colors.surface,
    fontSize: 8,
    lineHeight: 8,
    fontWeight: theme.typography.weights.bold,
    includeFontPadding: false,
  },
  practiceOpenInputStatusBadge: {
    position: 'absolute',
    right: theme.spacing.md,
    top: '50%',
    width: 12,
    height: 12,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -6 }],
  },
  practiceOpenInputStatusBadgeCorrect: {
    backgroundColor: '#3CA0FE',
  },
  practiceOpenInputStatusBadgeIncorrect: {
    backgroundColor: '#FD6969',
  },
  practiceOpenInputStatusBadgeText: {
    color: theme.colors.surface,
    fontSize: 10,
    lineHeight: 10,
    fontWeight: theme.typography.weights.bold,
    includeFontPadding: false,
  },
  practiceOpenInputDisabled: {
    opacity: 0.7,
  },
  practiceInlineError: {
    color: theme.colors.primary,
  },
  practiceItemInlineError: {
    color: theme.colors.primary,
    fontSize: 13,
    lineHeight: 17,
    marginTop: 6,
  },
  sectionEyebrow: {
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.warningSurface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  sectionEyebrowText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.medium,
  },
  audioFlag: {
    borderRadius: theme.radii.xl,
    borderWidth: 1.5,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  audioFlagActive: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.border,
  },
  audioFlagMuted: {
    backgroundColor: theme.colors.accentMuted,
    borderColor: theme.colors.border,
  },
  audioFlagText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.medium,
  },
  sectionTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: theme.typography.weights.bold,
  },
  sectionBody: {
    color: theme.colors.text,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  noteBullet: {
    width: 10,
    height: 10,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 8,
  },
  noteText: {
    flex: 1,
  },
  placeholderBox: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  },
  placeholderEyebrow: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.semibold,
    textTransform: 'uppercase',
  },
  placeholderTitle: {
    fontWeight: theme.typography.weights.semibold,
  },
  placeholderBody: {
    color: theme.colors.mutedText,
  },
  stickyFooter: {
    position: 'relative',
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  stickyFooterShell: {
    marginTop: 0,
    paddingTop: 0,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  completionModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(18, 22, 28, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  completionModalCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    alignItems: 'center',
    gap: theme.spacing.md,
    ...brutalShadow,
  },
  completionModalCloseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  completionModalCheckWrap: {
    width: 105,
    height: 105,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -theme.spacing.xs,
  },
  completionModalSuccessImage: {
    width: 105,
    height: 105,
  },
  completionModalTitle: {
    textAlign: 'center',
    fontWeight: theme.typography.weights.semibold,
  },
  completionModalBody: {
    textAlign: 'center',
    color: theme.colors.text,
  },
  completionModalIncompleteContent: {
    width: '100%',
    paddingTop: theme.spacing.lg,
  },
  completionModalWarningContent: {
    width: '100%',
    paddingTop: theme.spacing.sm,
  },
  completionModalWarningTitleBlock: {
    marginTop: -theme.spacing.sm,
  },
  completionModalActionsRow: {
    width: '100%',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  completionModalButton: {
    minHeight: 44,
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    ...brutalShadow,
  },
  completionModalPrimaryButton: {
    backgroundColor: '#91CAFF',
  },
  completionModalSecondaryButton: {
    backgroundColor: theme.colors.surface,
  },
  completionModalPrimaryButtonText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semibold,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 14,
  },
  completionModalSecondaryButtonText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semibold,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 14,
  },
  completionModalButtonPressed: {
    opacity: 0.9,
  },
  richLinkModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  richLinkBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18, 22, 28, 0.28)',
  },
  richLinkSheetWrap: {
    paddingHorizontal: theme.spacing.md,
  },
  richLinkSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.md,
    ...brutalShadow,
  },
  richLinkHandle: {
    alignSelf: 'center',
    width: 34,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D7D7D7',
    marginBottom: 2,
  },
  richLinkSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  richLinkSheetEyebrow: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  richLinkCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  richLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm + 2,
    ...brutalShadow,
  },
  richLinkCardIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.accentSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  richLinkCardCopy: {
    flex: 1,
    gap: 2,
  },
  richLinkCardTitle: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semibold,
  },
  richLinkCardSubtitle: {
    color: theme.colors.mutedText,
  },
  richLinkNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    borderRadius: 12,
    backgroundColor: theme.colors.accentMuted,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  richLinkNoteText: {
    color: '#326A9C',
    flex: 1,
  },
  richLinkActionPressed: {
    opacity: 0.9,
  },
  ctaRow: {
    flexDirection: 'column',
    gap: 6,
    paddingHorizontal: 10,
    paddingTop: 3,
    paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  nextSectionHintOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  nextSectionHintToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    maxWidth: 344,
    paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: '#212121',
    ...brutalShadow,
  },
  nextSectionHintCaret: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderTopWidth: 11,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#212121',
  },
  nextSectionHintIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4B183',
    flexShrink: 0,
  },
  nextSectionHintIconText: {
    color: theme.colors.surface,
    fontSize: 12,
    lineHeight: 12,
    fontWeight: theme.typography.weights.bold,
    includeFontPadding: false,
  },
  nextSectionHintText: {
    flex: 1,
    color: theme.colors.surface,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: theme.typography.weights.semibold,
    textAlign: 'center',
  },
  lessonCompletionErrorText: {
    textAlign: 'center',
    color: theme.colors.error,
  },
  ctaButton: {
    minHeight: 38,
    flex: 1,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ctaCheckButton: {
    backgroundColor: theme.colors.surface,
    ...brutalShadow,
  },
  ctaCheckButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: theme.typography.weights.semibold,
  },
  ctaNextButton: {
    backgroundColor: theme.colors.accent,
    ...brutalShadow,
  },
  ctaNextButtonFull: {
    flex: 1,
  },
  ctaNextButtonText: {
    color: theme.colors.surface,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: theme.typography.weights.semibold,
  },
  ctaButtonPressed: {
    opacity: 0.9,
  },
  ctaButtonDisabled: {
    opacity: 0.55,
  },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingTop: theme.spacing.lg,
  },
  menuOverlayModalRoot: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: theme.spacing.lg,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30, 30, 30, 0.18)',
  },
  menuSheet: {
    marginHorizontal: theme.spacing.md,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
    backgroundColor: theme.colors.surface,
  },
  menuBottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingTop: theme.spacing.sm,
  },
  menuBottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 2,
  },
  menuBottomNavLabel: {
    fontSize: 11,
    color: theme.colors.mutedText,
    fontWeight: theme.typography.weights.semibold,
  },
  menuBottomNavLabelActive: {
    color: theme.colors.accent,
  },
  menuBottomNavLabelEnglish: {
    fontFamily: theme.typography.fontFaces.en.semibold,
  },
  menuBottomNavLabelThai: {
    fontFamily: theme.typography.fontFaces.th.semibold,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  menuTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: theme.typography.sizes.lg,
    lineHeight: theme.typography.lineHeights.lg,
    fontWeight: theme.typography.weights.semibold,
  },
  menuHeaderButton: {
    width: 36,
    height: 36,
    borderRadius: theme.radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm + 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    padding: theme.spacing.sm,
    paddingLeft: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  menuItemActive: {
    backgroundColor: theme.colors.accentMuted,
  },
  menuItemIndex: {
    minWidth: 22,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  menuItemIndexText: {
    fontSize: theme.typography.sizes.lg,
    lineHeight: theme.typography.lineHeights.lg,
    fontWeight: theme.typography.weights.bold,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontWeight: theme.typography.weights.semibold,
  },
  menuItemMeta: {
    color: theme.colors.mutedText,
  },
});
