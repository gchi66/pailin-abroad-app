import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Stack as RouterStack, useLocalSearchParams, useRouter } from 'expo-router';
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioMetadata } from 'expo-audio';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
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
import { fetchUserCompletedLessons, upsertLessonCompletion } from '@/src/api/user';
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
  ResolvedLessonExercise,
  ResolvedLessonPayload,
  ResolvedLessonPhrase,
  ResolvedLessonQuestion,
  ResolvedLessonSection,
  ResolvedLessonTranscriptLine,
} from '@/src/types/lesson';
import pailinBlueThumbsUpImage from '@/assets/images/pailin-blue-circle-thumbs-up.webp';

type UiLanguage = 'en' | 'th';
type LessonTab = {
  id: string;
  type: string;
  section: ResolvedLessonSection | null;
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
const RICH_PAGER_FAIL_OFFSET_Y: [number, number] = [-22, 22];
const RICH_PAGER_LEFT_SWIPE_DISTANCE = 18;
const RICH_PAGER_RIGHT_SWIPE_DISTANCE = 28;
const RICH_PAGER_LEFT_SWIPE_VELOCITY = 500;
const RICH_PAGER_RIGHT_SWIPE_VELOCITY = 700;
const RICH_PAGER_DRAG_LIMIT = 28;
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
const INLINE_MARKER_RE = /(\[X\]|\[✓\]|\[-\])/g;
const INLINE_MARKER_COLORS: Record<string, string> = {
  '[X]': '#FD6969',
  '[✓]': '#3CA0FE',
  '[-]': '#28A265',
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

const textJsonbToString = (inlines: LessonRichInline[]) => inlines.map((inline) => String(inline?.text ?? '')).join('');

const INLINE_AUDIO_TAG_RE = /\[audio:([^\]]+)\]/i;
const INLINE_IMAGE_TAG_RE = /\[img:([^\]]+)\]/i;

const stripInlineMediaTags = (value: string) =>
  value
    .replace(/\[audio:[^\]]+\]/gi, ' ')
    .replace(/\[img:[^\]]+\]/gi, ' ')
    .replace(/\s+/g, ' ')
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
  if (
    kind === 'multiple_choice' ||
    kind === 'open' ||
    kind === 'open_ended' ||
    kind === 'fill_blank' ||
    kind === 'sentence_transform'
  ) {
    return kind === 'open_ended' ? 'open' : kind;
  }
  return null;
};

const normalizePracticeExercise = (exercise: ResolvedLessonExercise, contentLang: UiLanguage): NormalizedPracticeExercise => {
  const raw = exercise as Record<string, unknown>;
  const kind = normalizePracticeExerciseKind(raw.kind ?? raw.exercise_type);
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

    const text = stripInlineMediaTags(getPracticeFieldByLang(current, 'text', 'en') || getPracticeFieldByLang(englishFallback, 'text', 'en'));
    const textTh = stripInlineMediaTags(getPracticeFieldByLang(thaiFallback, 'text', 'th') || getPracticeFieldByLang(current, 'text', 'th'));
    const prompt = stripInlineMediaTags(getPracticeFieldByLang(current, 'prompt', 'en') || getPracticeFieldByLang(current, 'question', 'en'));
    const promptTh = stripInlineMediaTags(getPracticeFieldByLang(thaiFallback, 'prompt', 'th') || getPracticeFieldByLang(thaiFallback, 'question', 'th') || getPracticeFieldByLang(current, 'prompt', 'th') || getPracticeFieldByLang(current, 'question', 'th'));
    const placeholder =
      getPracticeFieldByLang(current, 'placeholder', 'en') || getPracticeFieldByLang(englishFallback, 'placeholder', 'en');
    const placeholderTh =
      getPracticeFieldByLang(current, 'placeholder', 'th') || getPracticeFieldByLang(thaiFallback, 'placeholder', 'th');
    const answer = getPracticeAnswerValue(current, englishFallback, thaiFallback);
    const options = Array.isArray(current.options)
      ? current.options.map(parsePracticeOption)
      : Array.isArray(raw.options)
        ? raw.options.map(parsePracticeOption)
        : [];
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
      textJsonb: safeParseArray<LessonRichInline>(current.text_jsonb),
      textJsonbTh:
        safeParseArray<LessonRichInline>(current.text_jsonb_th).length > 0
          ? safeParseArray<LessonRichInline>(current.text_jsonb_th)
          : safeParseArray<LessonRichInline>(thaiFallback.text_jsonb),
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

  const promptEn = getPracticeFieldByLang(raw, 'prompt', 'en') || String(raw.prompt_md ?? '').trim();
  const promptTh = getPracticeFieldByLang(raw, 'prompt', 'th');
  const paragraphEn = getPracticeFieldByLang(raw, 'paragraph', 'en');
  const paragraphTh = getPracticeFieldByLang(raw, 'paragraph', 'th');

  return {
    id: String(raw.id ?? `practice-${raw.sort_order ?? 0}`),
    kind,
    title: getPracticeFieldByLang(raw, 'title', contentLang) || promptEn || promptTh || '',
    titleEn: getPracticeFieldByLang(raw, 'title', 'en'),
    titleTh: getPracticeFieldByLang(raw, 'title', 'th'),
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

  const titleTh = typeof raw.title_th === 'string' ? raw.title_th : '';
  return titleTh.includes('แบบฝึกหัด');
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
  const fallbackThaiOptions = safeParseArray<string | LessonQuestionOption>(question.options_th).map(parseQuestionOption);

  const mergedOptions = options.map((option, index) => {
    const thaiOption = fallbackThaiOptions[index];
    return {
      ...option,
      label: option.label || thaiOption?.label || String.fromCharCode(65 + index),
      textTh: option.textTh || thaiOption?.text || thaiOption?.textTh || '',
      altTextTh: option.altTextTh || thaiOption?.altText || thaiOption?.altTextTh || '',
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

const cleanAudioTags = (text: string) =>
  text
    .replace(/\[audio:[^\]]+\]/g, ' ')
    .replace(/\[img:[^\]]+\]/g, ' ')
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

const PHRASE_LINK_PLACEHOLDER_RE = /\blink\s*xx\b/i;

const isPhraseLinkPlaceholderNode = (node: LessonRichNode, contentLang: UiLanguage) => {
  const inlineText = Array.isArray(node.inlines)
    ? node.inlines.map((inline) => cleanAudioTags(resolveRichInlineText(inline, contentLang))).join(' ')
    : '';
  const directText = resolveNodeText(node, contentLang);
  const combinedText = `${inlineText} ${directText}`.replace(/\s+/g, ' ').trim();

  return PHRASE_LINK_PLACEHOLDER_RE.test(combinedText);
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

  return pieces.some((piece) => {
    const value = String(piece);
    const lower = value.toLowerCase();
    return lower.includes('quick practice') || value.includes('แบบฝึกหัด') || value.includes('ฝึกหัด');
  });
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
    cleanText: text.replace(audioRegex, '').trim(),
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

const secondsToMillis = (seconds: number) => Math.max(0, Math.round(seconds * 1000));
const millisToSeconds = (millis: number) => Math.max(0, millis / 1000);
const PITCH_CORRECTION_QUALITY = 'medium';

export default function LessonDetailShellScreen() {
  const params = useLocalSearchParams<{ id?: string; locked?: string }>();
  const lessonId = typeof params.id === 'string' ? params.id : '';
  const lockedParam = typeof params.locked === 'string' ? params.locked : null;
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();
  const { hasMembership, user } = useAppSession();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const uiCopy = useMemo(() => getLessonDetailCopy(uiLanguage), [uiLanguage]);

  const [lesson, setLesson] = useState<ResolvedLessonPayload | null>(null);
  const [coverLesson, setCoverLesson] = useState<LessonListItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [maxVisitedSectionIndex, setMaxVisitedSectionIndex] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasStartedLesson, setHasStartedLesson] = useState(false);
  const [isBackstoryExpanded, setIsBackstoryExpanded] = useState(false);
  const [contentLang, setContentLang] = useState<UiLanguage>('en');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [hasCheckedAnswers, setHasCheckedAnswers] = useState(false);
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
  const [snippetIndex, setSnippetIndex] = useState<LessonAudioSnippetIndex>(EMPTY_SNIPPET_INDEX);
  const [phraseSnippetIndex, setPhraseSnippetIndex] = useState<LessonPhraseAudioSnippetIndex>(EMPTY_PHRASE_SNIPPET_INDEX);
  const [activeSnippetKey, setActiveSnippetKey] = useState<string | null>(null);
  const [playingSnippetKey, setPlayingSnippetKey] = useState<string | null>(null);
  const [isSnippetLoading, setIsSnippetLoading] = useState(false);
  const [applyText, setApplyText] = useState('');
  const [showApplyResponse, setShowApplyResponse] = useState(false);
  const [activeUnderstandGroupIndex, setActiveUnderstandGroupIndex] = useState(0);
  const [activePracticeCardIndex, setActivePracticeCardIndex] = useState(0);
  const [activePhraseCardIndex, setActivePhraseCardIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [practiceSelections, setPracticeSelections] = useState<Record<string, string[]>>({});
  const [checkedPracticeExercises, setCheckedPracticeExercises] = useState<Record<string, boolean>>({});
  const [practiceOpenAnswers, setPracticeOpenAnswers] = useState<Record<string, string>>({});
  const [practiceBlankAnswers, setPracticeBlankAnswers] = useState<Record<string, string>>({});
  const [practiceEvaluations, setPracticeEvaluations] = useState<Record<string, PracticeEvaluationState>>({});
  const [practiceErrorByExercise, setPracticeErrorByExercise] = useState<Record<string, string>>({});
  const [practiceMarkedCorrect, setPracticeMarkedCorrect] = useState<Record<string, boolean | null>>({});
  const [isLessonCompleted, setIsLessonCompleted] = useState(false);
  const [isSavingLessonCompletion, setIsSavingLessonCompletion] = useState(false);
  const [lessonCompletionError, setLessonCompletionError] = useState<string | null>(null);
  const [completionModalState, setCompletionModalState] = useState<'success' | 'incomplete' | null>(null);
  const [audioTrayAutoExpandSignal, setAudioTrayAutoExpandSignal] = useState<string | null>(null);
  const [freeLessonIds, setFreeLessonIds] = useState<Set<string>>(new Set());
  const voiceSoundRef = useRef<AudioPlayer | null>(null);
  const snippetSoundRef = useRef<AudioPlayer | null>(null);
  const snippetSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const preloadedSnippetPlayersRef = useRef<Record<string, AudioPlayer>>({});
  const inflightSnippetPreloadsRef = useRef<Partial<Record<string, Promise<void>>>>({});
  const isConversationLockScreenActiveRef = useRef(false);
  const conversationAudioMetadataRef = useRef<AudioMetadata>({});
  const audioRateRef = useRef(1);
  const applyInputRef = useRef<TextInput | null>(null);
  const richPagerScrollRef = useRef<ScrollView | null>(null);
  const contentScrollRef = useRef<ScrollView | null>(null);
  const lessonRef = useRef<ResolvedLessonPayload | null>(null);
  const audioTrayExpandCounterRef = useRef(0);

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
  }, [lessonId]);

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

      try {
        const row = await fetchResolvedLesson(lessonId, contentLang);
        if (!isMounted) {
          return;
        }
        setLesson(row);
        setCoverLesson(row);
        const otherLang = contentLang === 'th' ? 'en' : 'th';
        prefetchResolvedLesson(lessonId, otherLang);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        const message = error instanceof Error ? error.message : uiCopy.fetchLessonFailed;
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
    setIsLoading(true);
    setErrorMessage(null);
    setActiveSectionIndex(0);
    setMaxVisitedSectionIndex(0);
    setIsMenuOpen(false);
    setHasStartedLesson(false);
    setIsBackstoryExpanded(false);
    setContentLang('en');
    setSelectedAnswers({});
    setHasCheckedAnswers(false);
    setAudioUrls({ main: null, noBg: null, bg: null });
    setIsAudioLoading(false);
    setIsAudioPlaying(false);
    setAudioPositionMillis(0);
    setAudioDurationMillis(0);
    setHasAudioFinished(false);
    setAudioRate(1);
    setSnippetIndex(EMPTY_SNIPPET_INDEX);
    setPhraseSnippetIndex(EMPTY_PHRASE_SNIPPET_INDEX);
    setActiveSnippetKey(null);
    setPlayingSnippetKey(null);
    setIsSnippetLoading(false);
    setApplyText('');
    setShowApplyResponse(false);
    setActivePhraseCardIndex(0);
    setIsFullscreen(false);
    setPracticeSelections({});
    setCheckedPracticeExercises({});
    setPracticeOpenAnswers({});
    setPracticeBlankAnswers({});
    setPracticeEvaluations({});
    setPracticeErrorByExercise({});
    setPracticeMarkedCorrect({});
  }, [lessonId]);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch(() => undefined);
  }, []);

  const lessonCover = lesson ?? coverLesson;
  const isLessonReady = Boolean(lesson);

  const englishTitle = useMemo(() => {
    return lesson?.title_en?.trim() || lesson?.title?.trim() || coverLesson?.title?.trim() || lesson?.title_th?.trim() || coverLesson?.title_th?.trim() || null;
  }, [coverLesson, lesson]);

  const thaiTitle = useMemo(() => {
    if (!lessonCover) return null;
    return lessonCover.title_th?.trim() || null;
  }, [lessonCover]);

  const resolvedFocus = useMemo(() => {
    return lesson?.focus_en?.trim() || lesson?.focus?.trim() || coverLesson?.focus?.trim() || lesson?.focus_th?.trim() || coverLesson?.focus_th?.trim() || null;
  }, [coverLesson, lesson]);

  const resolvedBackstory = useMemo(() => {
    if (uiLanguage === 'th') {
      return lesson?.backstory_th || coverLesson?.backstory_th || lesson?.backstory || coverLesson?.backstory || lesson?.backstory_en || null;
    }

    return lesson?.backstory_en || lesson?.backstory || coverLesson?.backstory || lesson?.backstory_th || coverLesson?.backstory_th || null;
  }, [coverLesson, lesson, uiLanguage]);

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
  const normalizedPracticeExercises = useMemo(
    () =>
      hasStartedLesson
        ? (lesson?.practice_exercises ?? [])
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
  const allAnswersCorrect = useMemo(
    () =>
      normalizedQuestions.length > 0 &&
      normalizedQuestions.every((question) => {
        const currentSelections = selectedAnswers[question.id] ?? [];
        if (currentSelections.length !== question.answerKey.length) {
          return false;
        }

        const currentSet = new Set(currentSelections.map(normalizeOptionLetter));
        const answerSet = new Set(question.answerKey.map(normalizeOptionLetter));
        if (currentSet.size !== answerSet.size) {
          return false;
        }

        return Array.from(currentSet).every((value) => answerSet.has(value));
      }),
    [normalizedQuestions, selectedAnswers]
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
  const pageLanguage = hasStartedLesson ? contentLang : uiLanguage;
  const pageCopy = useMemo(() => getLessonDetailCopy(pageLanguage), [pageLanguage]);
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
  const useTwoColumnPrepareLayout = windowWidth >= 360;
  const isComprehensionTab = activeTab?.type === 'comprehension';
  const isTranscriptTab = activeTab?.type === 'transcript';
  const isApplyTab = activeTab?.type === 'apply';
  const isUnderstandTab = activeTab?.type === 'understand';
  const isExtraTipTab = activeTab?.type === 'extra_tip';
  const isCommonMistakeTab = activeTab?.type === 'common_mistake';
  const isCultureNoteTab = activeTab?.type === 'culture_note';
  const isPracticeTab = activeTab?.type === 'practice';
  const isPhrasesTab = activeTab?.type === 'phrases_verbs';
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
  const visibleCultureNoteNodes = useMemo(
    () => selectNodesForTableVisibility(cultureNoteNodes, isCompactLayout),
    [cultureNoteNodes, isCompactLayout]
  );
  const activePagerGroups = useMemo(
    () => (isUnderstandTab ? understandGroups : isExtraTipTab ? extraTipGroups : isCommonMistakeTab ? commonMistakeGroups : []),
    [commonMistakeGroups, extraTipGroups, isCommonMistakeTab, isExtraTipTab, isUnderstandTab, understandGroups]
  );
  const activePracticeExercise = isPracticeTab ? normalizedPracticeExercises[activePracticeCardIndex] ?? null : null;
  const activePhraseCard = isPhrasesTab ? normalizedLessonPhrases[activePhraseCardIndex] ?? null : null;
  const sectionCount = lessonTabs.length;
  const progressRatio = sectionCount > 0 ? (activeSectionIndex + 1) / sectionCount : 0;
  const progressWidthStyle = useMemo(() => ({ width: `${progressRatio * 100}%` as const }), [progressRatio]);
  const isLastSection = activeSectionIndex >= sectionCount - 1;
  const isRichPagerTab = isUnderstandTab || isExtraTipTab || isCommonMistakeTab;
  const isInnerPagerTab =
    isRichPagerTab ||
    (isPracticeTab && normalizedPracticeExercises.length > 0) ||
    (isPhrasesTab && normalizedLessonPhrases.length > 0);
  const activeInnerCardIndex = isPracticeTab
    ? activePracticeCardIndex
    : isPhrasesTab
      ? activePhraseCardIndex
      : activeUnderstandGroupIndex;
  const activeInnerCardCount = isPracticeTab
    ? normalizedPracticeExercises.length
    : isPhrasesTab
      ? normalizedLessonPhrases.length
      : activePagerGroups.length;
  const hasMultiplePagerCards = isInnerPagerTab && activeInnerCardCount > 1;
  const isLastPagerCard = !isInnerPagerTab || activeInnerCardCount === 0 || activeInnerCardIndex >= activeInnerCardCount - 1;
  const isPrimaryActionDisabled = isInnerPagerTab && !isLastPagerCard;
  const handleSetActiveInnerCardIndex = useCallback(
    (nextIndex: number) => {
      const clampedIndex = Math.max(0, Math.min(nextIndex, Math.max(0, activeInnerCardCount - 1)));

      if (isPracticeTab) {
        setActivePracticeCardIndex(clampedIndex);
        return;
      }

      if (isPhrasesTab) {
        setActivePhraseCardIndex(clampedIndex);
        return;
      }

      setActiveUnderstandGroupIndex(clampedIndex);
    },
    [activeInnerCardCount, isPhrasesTab, isPracticeTab]
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
        setActiveSectionIndex((previous) => Math.min(previous + 1, Math.min(maxVisitedSectionIndex, sectionCount - 1)));
        return;
      }

      if (movingRight && canSwipeToPreviousSection) {
        setActiveSectionIndex((previous) => Math.max(previous - 1, 0));
      }
    },
    [
      canSwipeToNextVisitedSection,
      canSwipeToPreviousSection,
      isInnerPagerTab,
      maxVisitedSectionIndex,
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
  const comprehensionButtonLabel = hasCheckedAnswers
    ? allAnswersCorrect
      ? pageCopy.greatJob
      : pageCopy.tryAgain
    : pageCopy.checkAnswers;
  const coverLessonNumber =
    typeof lessonCover?.level === 'number' && typeof lessonCover?.lesson_order === 'number'
      ? `${lessonCover.level}.${lessonCover.lesson_order}`
      : lessonCover?.lesson_order?.toString() ?? '-';
  const studyCounterLabel =
    sectionCount === 0
      ? `${uiCopy.lessonLabel} ${coverLessonNumber}`
      : pageLanguage === 'th'
        ? `${uiCopy.lessonLabel} ${coverLessonNumber} • ส่วน ${activeSectionIndex + 1}/${sectionCount}`
        : `${uiCopy.lessonLabel} ${coverLessonNumber} • Section ${activeSectionIndex + 1}/${sectionCount}`;
  const sectionMenuLabel = pageCopy.sectionMenuLabel;
  const startLessonLabel = isLessonReady ? uiCopy.startLesson : uiCopy.loadingLessonCta;
  const coverMinHeight = Math.max(windowHeight || 0, 720);
  const backToLibraryLabel = uiCopy.backToLibrary;
  const translateToThaiLabel = pageCopy.translateToThaiLabel;
  const translateToEnglishLabel = pageCopy.translateToEnglishLabel;
  const backstoryToggleLabel = isBackstoryExpanded
    ? uiCopy.hideBackstory
    : uiCopy.showBackstory;
  const richContentBlockCount = activeSection
    ? Math.max(
        Array.isArray(activeSection.content_jsonb) ? activeSection.content_jsonb.length : 0,
        Array.isArray(activeSection.content_jsonb_th) ? activeSection.content_jsonb_th.length : 0
      )
    : 0;
  const contentToggleLabel = contentLang === 'th' ? translateToEnglishLabel : translateToThaiLabel;
  const contentToggleText = contentLang === 'th' ? 'EN' : 'TH';
  const isTranslatingContent = isLoading && Boolean(lesson);
  const audioTrayTitle = resolvedFocus || englishTitle || thaiTitle || activeSectionTitle || 'Lesson audio';
  const audioTraySubtitle = activeSectionTitle || thaiTitle || englishTitle || null;
  const shouldShowAudioTray = hasStartedLesson && !isLoading && !errorMessage && Boolean(lesson) && !isFullscreen;
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
  const fullscreenToggleIcon = isFullscreen ? '⤡' : '⤢';
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
        ? isLessonCompleted
          ? pageCopy.backToLibrary
          : pageCopy.finishLesson
        : pageLanguage === 'th'
            ? 'ส่วนถัดไป →'
            : 'Next section →';
  const isFinishLessonButtonDisabled =
    isLastSection && !isLessonCompleted && !allPracticeExercisesChecked;

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
      const cardIndexes = [activePhraseCardIndex, activePhraseCardIndex + 1];

      cardIndexes.forEach((cardIndex) => {
        const phraseCard = normalizedLessonPhrases[cardIndex];
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
    activePhraseCardIndex,
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

    normalizedPracticeExercises.forEach((exercise) => {
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
  }, [normalizedPracticeExercises]);

  useEffect(() => {
    setActiveUnderstandGroupIndex(0);
    setActivePracticeCardIndex(0);
    setActivePhraseCardIndex(0);
  }, [
    activeTab?.id,
    commonMistakeGroups,
    contentLang,
    isRichPagerTab,
    normalizedLessonPhrases.length,
    normalizedPracticeExercises.length,
    understandGroups,
  ]);

  useEffect(() => {
    if (!isInnerPagerTab) {
      return;
    }

    richPagerScrollRef.current?.scrollTo({ y: 0, animated: false });
    contentScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [activePhraseCardIndex, activePracticeCardIndex, activeTab?.id, activeUnderstandGroupIndex, contentLang, isInnerPagerTab]);

  useEffect(() => {
    richPagerTranslateX.value = 0;
  }, [activeInnerCardIndex, richPagerTranslateX]);

  const closeCompletionModal = useCallback(() => {
    setCompletionModalState(null);
  }, []);

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
      await upsertLessonCompletion({ lessonId: lessonCover.id, completed: true });
      setIsLessonCompleted(true);
      setCompletionModalState('success');
    } catch (error) {
      setLessonCompletionError(error instanceof Error ? error.message : pageCopy.completionSavedError);
    } finally {
      setIsSavingLessonCompletion(false);
    }
  }, [isLessonCompleted, lessonCover?.id, pageCopy.completionSavedError]);

  const maybeCompleteLesson = useCallback(
    async (nextCheckedExercises: Record<string, boolean>) => {
      if (!isLastSection || isLessonCompleted || normalizedPracticeExercises.length === 0) {
        return;
      }

      const hasFinishedAllPractices = normalizedPracticeExercises.every(
        (exercise) => nextCheckedExercises[exercise.id] === true
      );

      if (!hasFinishedAllPractices) {
        return;
      }

      await completeLesson();
    },
    [completeLesson, isLastSection, isLessonCompleted, normalizedPracticeExercises]
  );

  const handleToggleAnswer = (questionId: string, optionLabel: string, isMulti: boolean) => {
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
    setHasCheckedAnswers(false);
  };

  const handlePracticeChoice = (exerciseId: string, itemKey: string, optionLabel: string, isMulti: boolean) => {
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
  const getPracticeBlankKey = (exerciseId: string, itemKey: string, blankId: string) => `${exerciseId}:${itemKey}:${blankId}`;

  const isPracticePromptOnlyImageItem = (
    exercise: NormalizedPracticeExercise,
    item: NormalizedPracticeItem
  ) =>
    exercise.kind === 'open' &&
    lesson?.lesson_external_id === '1.12' &&
    exercise.id === '24491' &&
    item.imageKey === '1.12_practice2';

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

  const handlePracticeBlankAnswerChange = (exerciseId: string, itemKey: string, blankId: string, value: string) => {
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

  const handleCheckMultipleChoiceExercise = (exercise: NormalizedPracticeExercise) => {
    const hasUnanswered = exercise.items.some((item) => (practiceSelections[`${exercise.id}:${item.key}`] ?? []).length === 0);

    if (hasUnanswered) {
      setPracticeErrorByExercise((previous) => ({ ...previous, [exercise.id]: pageCopy.practiceAnswerAll }));
      return;
    }

    setPracticeErrorByExercise((previous) => ({ ...previous, [exercise.id]: '' }));
    const nextCheckedExercises = { ...checkedPracticeExercises, [exercise.id]: true };
    setCheckedPracticeExercises(nextCheckedExercises);
    void maybeCompleteLesson(nextCheckedExercises);
  };

  const handleResetMultipleChoiceExercise = (exercise: NormalizedPracticeExercise) => {
    const nextSelections = { ...practiceSelections };
    exercise.items.forEach((item) => {
      delete nextSelections[`${exercise.id}:${item.key}`];
    });
    setPracticeSelections(nextSelections);
    setCheckedPracticeExercises((previous) => ({ ...previous, [exercise.id]: false }));
    setPracticeErrorByExercise((previous) => ({ ...previous, [exercise.id]: '' }));
  };

  const handlePracticeOpenAnswerChange = (exerciseId: string, itemKey: string, value: string, inputIndex = 0) => {
    const answerKey = getPracticeOpenAnswerKey(exerciseId, itemKey, inputIndex);
    const itemStateKey = getPracticeItemStateKey(exerciseId, itemKey);

    setPracticeOpenAnswers((previous) => ({ ...previous, [answerKey]: value }));
    setCheckedPracticeExercises((previous) => ({ ...previous, [exerciseId]: false }));
    setPracticeMarkedCorrect((previous) => {
      if (!(itemStateKey in previous)) {
        return previous;
      }
      return { ...previous, [itemStateKey]: null };
    });
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
    const answerKey = getPracticeItemStateKey(exerciseId, itemKey);
    setCheckedPracticeExercises((previous) => ({ ...previous, [exerciseId]: false }));
    setPracticeMarkedCorrect((previous) => ({ ...previous, [answerKey]: isCorrect }));
    setPracticeOpenAnswers((previous) => ({
      ...previous,
      [answerKey]: isCorrect ? stemText : '',
    }));
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
    const exerciseType = exercise.kind === 'sentence_transform' ? 'sentence_transform' : exercise.kind === 'fill_blank' ? 'fill_blank' : 'open';
    const hasUnanswered = pendingItems.some((item) => {
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

        const itemKey = getPracticeItemStateKey(exercise.id, item.key);
        if (practiceMarkedCorrect[itemKey] === true) {
          return false;
        }

        return !normalizePracticeAnswerText(practiceOpenAnswers[itemKey] ?? '');
      }

      return Array.from({ length: getPracticeOpenInputCount(exercise, item) }, (_, index) =>
        practiceOpenAnswers[getPracticeOpenAnswerKey(exercise.id, item.key, index)] ?? ''
      ).some((value) => !normalizePracticeAnswerText(value));
    });

    if (hasUnanswered) {
      setPracticeErrorByExercise((previous) => ({ ...previous, [exercise.id]: pageCopy.practiceAnswerAll }));
      return;
    }

    setPracticeErrorByExercise((previous) => ({ ...previous, [exercise.id]: '' }));
    const nextCheckedExercises = { ...checkedPracticeExercises, [exercise.id]: true };
    setCheckedPracticeExercises(nextCheckedExercises);
    setPracticeEvaluations((previous) => {
      const next = { ...previous };
      pendingItems.forEach((item) => {
        next[getPracticeItemStateKey(exercise.id, item.key)] = {
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
      await Promise.all(
        pendingItems.map(async (item, index) => {
          const answerKey = getPracticeItemStateKey(exercise.id, item.key);
          try {
            const result = await evaluateLessonAnswer({
              exerciseType,
              userAnswer:
                exercise.kind === 'fill_blank'
                  ? getSingleFillBlankAnswer(exercise.id, item)
                  : exercise.kind === 'sentence_transform'
                    ? getSentenceTransformAnswer(exercise.id, item)
                    : getPracticeOpenAnswer(exercise, item),
              correctAnswer: item.answer || '',
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
            });

            setPracticeEvaluations((previous) => ({
              ...previous,
              [answerKey]: {
                loading: false,
                correct: typeof result.correct === 'boolean' ? result.correct : null,
                score: typeof result.score === 'number' ? result.score : null,
                feedbackEn: String(result.feedback_en ?? '').trim(),
                feedbackTh: String(result.feedback_th ?? '').trim(),
                error: '',
              },
            }));
          } catch (error) {
            const message = error instanceof Error ? error.message : pageCopy.practiceLoginRequired;
            setPracticeEvaluations((previous) => ({
              ...previous,
              [answerKey]: {
                loading: false,
                correct: false,
                score: null,
                feedbackEn: message,
                feedbackTh: '',
                error: message,
              },
            }));
            setPracticeErrorByExercise((previous) => ({ ...previous, [exercise.id]: message }));
          }
        })
      );
      await maybeCompleteLesson(nextCheckedExercises);
    } catch {
      return;
    }
  };

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
          void player.seekTo(0).catch(() => undefined);
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

  const renderApplyInlines = (inlines: LessonRichInline[] | null | undefined) => {
    if (!Array.isArray(inlines) || !inlines.length) {
      return null;
    }

    return inlines.map((inline, index) => {
      const textValue = resolveRichInlineText(inline, contentLang);
      if (!textValue) {
        return null;
      }

      return (
        <Text
          key={`inline-${index}`}
          style={[
            styles.applyInlineText,
            inline.bold ? styles.applyInlineBold : null,
            inline.italic ? styles.applyInlineItalic : null,
            inline.underline ? styles.applyInlineUnderline : null,
          ]}>
          {textValue}
        </Text>
      );
    });
  };

  const renderApplyNodes = (nodes: LessonRichNode[]) => {
    if (!nodes.length) {
      return null;
    }

    return nodes.map((node, index) => {
      const nodeKey = `apply-node-${index}`;
      const accent = applyNodeHasAccent(node);
      const textLanguage = contentLang === 'th' ? 'th' : 'en';

      if (node.kind === 'heading') {
        const headingText =
          typeof node.text === 'string'
            ? node.text
            : contentLang === 'th'
              ? String(node.text?.th ?? node.text_th ?? node.text?.en ?? '')
              : String(node.text?.en ?? node.text?.th ?? '');

        if (!headingText.trim()) {
          return null;
        }

        return (
          <AppText key={nodeKey} language={textLanguage} variant="body" style={styles.applyHeading}>
            {headingText}
          </AppText>
        );
      }

      if (node.kind === 'paragraph') {
        return (
          <View key={nodeKey} style={[styles.applyParagraphRow, accent ? styles.applyAccentBlock : null]}>
            <AppText language={textLanguage} variant="body" style={styles.applyParagraphText}>
              {renderApplyInlines(node.inlines)}
            </AppText>
          </View>
        );
      }

      return null;
    });
  };

  const getRichIndentStyle = (node: LessonRichNode) => {
    const indentLevel =
      typeof node.indent_level === 'number'
        ? node.indent_level
        : typeof node.indent === 'number'
          ? node.indent
          : typeof node.indent_first_line_level === 'number'
            ? node.indent_first_line_level
            : 0;

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

  const handleOpenRichLink = (href: string) => {
    let nextHref = href.trim();
    if (!nextHref) {
      return;
    }
    if (nextHref.startsWith('https://pa.invalid/lesson/')) {
      nextHref = nextHref.replace('https://pa.invalid', '');
    }
    if (nextHref.startsWith('https://pa.invalid/topic-library/')) {
      nextHref = nextHref.replace('https://pa.invalid', '');
    }
    if (nextHref.startsWith('/')) {
      return;
    }
    void Linking.openURL(nextHref).catch(() => undefined);
  };

  const renderRichInlines = (
    inlines: LessonRichInline[] | null | undefined,
    keyPrefix: string,
    options?: { enableHighlights?: boolean }
  ) => {
    if (!Array.isArray(inlines) || !inlines.length) {
      return null;
    }

    return inlines.map((inline, index) => {
      const textValue = cleanAudioTags(resolveRichInlineText(inline, contentLang));
      if (!textValue) {
        return null;
      }

      const highlightColor =
        typeof inline.highlight === 'string' ? inline.highlight.trim().toLowerCase() : '';
      const shouldShowHighlight = options?.enableHighlights === true && UNDERSTAND_HIGHLIGHTS.has(highlightColor);
      const baseTextStyle = [
        styles.richInlineText,
        inline.bold ? styles.richInlineBold : null,
        inline.italic ? styles.richInlineItalic : null,
        inline.underline ? styles.richInlineUnderline : null,
        shouldShowHighlight ? styles.richInlineHighlight : null,
        shouldShowHighlight && highlightColor === '#f4cccc' ? styles.richInlineHighlightPink : null,
        shouldShowHighlight && highlightColor === '#d9ead3' ? styles.richInlineHighlightGreen : null,
        shouldShowHighlight &&
        (highlightColor === '#c9daf7' || highlightColor === '#c9daf8')
          ? styles.richInlineHighlightBlue
          : null,
      ];
      const textParts = textValue.split(INLINE_MARKER_RE).filter(Boolean);
      const renderedText =
        textParts.length > 1 ? (
          <Text key={`${keyPrefix}-${index}`} style={baseTextStyle}>
            {textParts.map((part, partIndex) => {
              const markerColor = INLINE_MARKER_COLORS[part];
              return (
                <Text
                  key={`${keyPrefix}-${index}-${partIndex}`}
                  style={[
                    baseTextStyle,
                    markerColor ? styles.richInlineMarker : null,
                    markerColor === '#FD6969' ? styles.richInlineMarkerRed : null,
                    markerColor === '#3CA0FE' ? styles.richInlineMarkerBlue : null,
                    markerColor === '#28A265' ? styles.richInlineMarkerGreen : null,
                  ]}>
                  {part}
                </Text>
              );
            })}
          </Text>
        ) : (
          <Text key={`${keyPrefix}-${index}`} style={baseTextStyle}>
            {textValue}
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
    indentStyle: object | null,
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
    const snippet =
      getSnippetForNode(node, snippetIndex) ??
      getPhraseSnippetForNode(node, phraseSnippetIndex, options?.phraseId, options?.phraseVariant);
    const audioKey = snippet?.audio_key?.trim() || node.audio_key?.trim() || null;
    const isPlaying = Boolean(audioKey) && playingSnippetKey === audioKey;
    const isLoading = Boolean(audioKey) && activeSnippetKey === audioKey && isSnippetLoading;

    return (
      <View key={nodeKey} style={styles.phraseAudioBlock}>
        {options?.isPhraseCard && options.phraseShowDivider ? <View style={styles.phraseDivider} /> : null}
        <View
          style={[
            styles.understandAudioRow,
            options?.isPhraseCard ? styles.phraseAudioRow : null,
            indentStyle,
            hasAccent ? styles.applyAccentBlock : null,
          ]}>
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
            style={[
              styles.understandAudioText,
              options?.isPhraseCard ? styles.phraseAudioText : null,
              options?.isPhraseCard && options.phraseIsLeadAudio ? styles.phraseLeadAudioText : null,
            ]}>
            {renderRichInlines(node.inlines, nodeKey, options)}
          </AppText>
        </View>
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
    cellText: string,
    cellKey: string,
    options?: {
      phraseId?: string;
      phraseVariant?: number | null;
      isHeaderRow?: boolean;
    }
  ) => {
    const lines = cellText.split('\n');

    return lines.map((line, lineIndex) => {
      const { cleanText, audioKeys } = parseAudioTaggedText(line);
      const snippet = audioKeys.length ? getSnippetForAudioKey(audioKeys[0]) : null;
      const audioKey = snippet?.audio_key?.trim() || audioKeys[0]?.trim() || null;
      const isPlaying = Boolean(audioKey) && playingSnippetKey === audioKey;
      const isLoading = Boolean(audioKey) && activeSnippetKey === audioKey && isSnippetLoading;
      const textValue = cleanText || (audioKeys.length ? '' : line.trim());

      if (audioKeys.length) {
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
            <AppText language={contentLang} variant="body" style={styles.richTableAudioText}>
              {textValue || ' '}
            </AppText>
          </View>
        );
      }

      if (!textValue) {
        return null;
      }

      return (
        <AppText
          key={`${cellKey}-line-${lineIndex}`}
          language={contentLang}
          variant="body"
          style={[styles.richTableCellText, options?.isHeaderRow ? styles.richTableHeaderText : null]}>
          {textValue}
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
    const minTableWidth = Math.max(340, preferredColumnCount * 116);
    const columnPixelWidth = minTableWidth / preferredColumnCount;

    return (
      <ScrollView
        key={nodeKey}
        horizontal
        bounces={false}
        contentContainerStyle={styles.richTableScrollerContent}
        showsHorizontalScrollIndicator={false}
        style={styles.richTableScroller}>
        <View style={[styles.richTableWrap, { minWidth: minTableWidth }]}>
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
                  const cellText =
                    typeof cell === 'string'
                      ? cell
                      : cell && typeof cell === 'object' && 'text' in cell
                        ? String(cell.text ?? '')
                        : '';
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
                        { width: columnPixelWidth * effectiveColSpan },
                        cellIndex === normalizedRow.length - 1 ? styles.richTableCellLast : null,
                        isHeaderRow ? styles.richTableHeaderCell : null,
                        options?.enableHighlights && cellBackground === '#f4cccc' ? styles.richTableCellPink : null,
                        options?.enableHighlights && cellBackground === '#d9ead3' ? styles.richTableCellGreen : null,
                        options?.enableHighlights && (cellBackground === '#c9daf7' || cellBackground === '#c9daf8')
                          ? styles.richTableCellBlue
                          : null,
                      ]}>
                      {renderRichTableCellText(cellText, `${nodeKey}-cell-${rowIndex}-${cellIndex}`, {
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
      phraseTextIndented?: boolean;
    }
  ) => {
    const nodeKey = `${options?.keyPrefix ?? 'rich-node'}-${index}`;
    const indentStyle = getRichIndentStyle(node);
    const phraseContinuationStyle = options?.isPhraseCard && options.phraseTextIndented ? styles.phraseContinuationIndent : null;
    const hasAccent = applyNodeHasAccent(node);
    const hasAudio = Boolean(node.audio_key || node.audio_seq);

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
          style={[styles.richParagraph, styles.richSubheader, options?.isPhraseCard ? styles.phraseHeading : null]}>
          {renderRichInlines(node.inlines, nodeKey, options)}
        </AppText>
      );
    }

    if (node.kind === 'image') {
      const imageSource =
        resolveLessonImageUrl(node.image_url, typeof node.image_key === 'string' ? node.image_key : null) ??
        resolveLessonImageUrl(
          typeof node.image_key === 'string' && lesson?.images && node.image_key in lesson.images
            ? lesson.images[node.image_key]
            : null,
          typeof node.image_key === 'string' ? node.image_key : null
        );
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
        return renderRichAudioRow(node, nodeKey, indentStyle, hasAccent, options);
      }

      return (
        <View
          key={nodeKey}
          style={[
            styles.richListRow,
            options?.isPhraseCard ? styles.phraseListRow : null,
            indentStyle,
            phraseContinuationStyle,
          ]}>
          <View style={styles.richNumberBadge}>
            <AppText language="en" variant="caption" style={styles.richNumberBadgeText}>
              {options?.numberedLabel ?? `${index + 1}.`}
            </AppText>
          </View>
          <AppText
            language={contentLang}
            variant="body"
            style={[
              styles.richListText,
              options?.isPhraseCard ? styles.phraseBodyText : null,
              hasAccent ? styles.applyAccentBlock : null,
            ]}>
            {renderRichInlines(node.inlines, nodeKey, options)}
          </AppText>
        </View>
      );
    }

    if (node.kind === 'list_item' || node.kind === 'misc_item') {
      if (hasAudio) {
        return renderRichAudioRow(node, nodeKey, indentStyle, hasAccent, options);
      }

      return (
        <View
          key={nodeKey}
          style={[
            styles.richListRow,
            options?.isPhraseCard ? styles.phraseListRow : null,
            indentStyle,
            phraseContinuationStyle,
          ]}>
          <View style={styles.richBullet} />
          <AppText
            language={contentLang}
            variant="body"
            style={[
              styles.richListText,
              options?.isPhraseCard ? styles.phraseBodyText : null,
              hasAccent ? styles.applyAccentBlock : null,
            ]}>
            {renderRichInlines(node.inlines, nodeKey, options)}
          </AppText>
        </View>
      );
    }

    if (node.kind === 'paragraph') {
      if (hasAudio) {
        return renderRichAudioRow(node, nodeKey, indentStyle, hasAccent, options);
      }

      const isSubheader = isBoldParagraphNode(node);
      return (
        <AppText
          key={nodeKey}
          language={contentLang}
          variant="body"
          style={[
            styles.richParagraph,
            indentStyle,
            phraseContinuationStyle,
            options?.isPhraseCard ? styles.phraseBodyText : null,
            isSubheader ? styles.richSubheader : null,
            isSubheader && options?.isPhraseCard ? styles.phraseSubheader : null,
            hasAccent ? styles.applyAccentBlock : null,
          ]}>
          {renderRichInlines(node.inlines, nodeKey, options)}
        </AppText>
      );
    }

    return null;
  };

  const renderPrepareItem = (item: PrepareItem) => {
    const { node, originalIndex } = item;
    const nodeKey = `prepare-item-${originalIndex}`;
    const indentStyle = getRichIndentStyle(node);
    const snippet = getSnippetForNode(node, snippetIndex);
    const audioKey = snippet?.audio_key?.trim() || node.audio_key?.trim() || null;
    const isPlaying = Boolean(audioKey) && playingSnippetKey === audioKey;
    const isLoading = Boolean(audioKey) && activeSnippetKey === audioKey && isSnippetLoading;

    return (
      <View
        key={nodeKey}
        style={[
          styles.prepareItemRow,
          useTwoColumnPrepareLayout ? styles.prepareItemRowTwoColumn : null,
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

        <View style={styles.prepareTextWrap}>
          <AppText language={contentLang} variant="body" style={styles.prepareItemText}>
            {Array.isArray(node.inlines) && node.inlines.length
              ? renderRichInlines(node.inlines, `${nodeKey}-inline`)
              : resolveNodeText(node, contentLang)}
          </AppText>
        </View>
      </View>
    );
  };

  const renderUnderstandNode = (node: LessonRichNode, index: number) =>
    renderRichNode(node, index, { keyPrefix: 'understand-node', enableHighlights: true });

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
            });
          }

          return renderUnderstandNode(node, nodeIndex);
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
          if (node.kind === 'numbered_item') {
            numberedIndex += 1;
            return renderRichNode(node, nodeIndex, {
              keyPrefix: 'common-mistake-node',
              enableHighlights: false,
              numberedLabel: `${numberedIndex}.`,
            });
          }

          return renderRichNode(node, nodeIndex, { keyPrefix: 'common-mistake-node', enableHighlights: false });
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

          return renderRichNode(node, nodeIndex, { keyPrefix: 'extra-tip-node', enableHighlights: true });
        })}
      </View>
    ));
  };

  const renderCultureNoteBody = (nodes: LessonRichNode[]) => (
    <Stack gap="sm">
      {nodes.map((node, index) =>
        renderRichNode(node, index, {
          keyPrefix: 'culture-note-node',
          allowHeadings: true,
          enableHighlights: false,
        })
      )}
    </Stack>
  );

  const renderPhraseBody = (phrase: NormalizedLessonPhrase) => {
    let audioSeen = 0;
    let indentFollowingLine = false;
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
      const shouldIndent = indentFollowingLine && !hasAudio && node.kind !== 'spacer' && node.kind !== 'heading';

      if (hasAudio) {
        audioSeen += 1;
        indentFollowingLine = true;
      } else if (node.kind === 'spacer' || node.kind === 'heading' || node.kind === 'image' || node.kind === 'table') {
        indentFollowingLine = false;
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
        phraseTextIndented: shouldIndent,
      });
    }).filter(Boolean);

    return (
      <Stack gap="sm">
        {phrase.variant > 0 ? (
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

  const getPracticeInlineTextStyle = (inline: LessonRichInline | null | undefined, compact = false) => [
    styles.practiceInlineText,
    compact ? styles.practiceInlineTextCompact : null,
    inline?.bold ? styles.practiceInlineBold : null,
    inline?.italic ? styles.practiceInlineItalic : null,
    inline?.underline ? styles.practiceInlineUnderline : null,
  ];

  const renderPracticeInlineTextToken = (
    token: { type: 'text'; text: string; style?: LessonRichInline | null },
    key: string,
    compact = false
  ) => {
    return (
      <Text key={key} style={getPracticeInlineTextStyle(token.style, compact)}>
        {token.text}
      </Text>
    );
  };

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

  const segmentPracticeInlinesWithBlanks = (inlines: LessonRichInline[]) => {
    const tokens: (
      | { type: 'text'; text: string; style?: LessonRichInline | null }
      | { type: 'blank'; length: number }
      | { type: 'line_break' }
    )[] = [];

    inlines.forEach((inline) => {
      const text = cleanAudioTags(resolveRichInlineText(inline, contentLang));
      if (!text.trim()) {
        return;
      }

      let index = 0;
      let buffer = '';

      const flushBuffer = () => {
        const tokenText = inline?.underline ? buffer.trimEnd() : buffer;
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
                  <AppText language="th" variant="body" style={styles.practicePromptBlockThaiText}>
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
              <View key={`practice-prompt-image-${index}`} style={styles.practicePromptBlockImageShell}>
                <Image
                  source={{ uri: imageUrl }}
                  accessibilityLabel={
                    contentLang === 'th'
                      ? block.altTextTh || block.altText || 'Practice prompt image'
                      : block.altText || block.altTextTh || 'Practice prompt image'
                  }
                  contentFit="contain"
                  style={styles.practicePromptImage}
                />
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
      (isOpenExercise || isFillBlankExercise || isSentenceTransformExercise) && openStates.some((state) => state?.loading);
    const hasPromptBlocks = exercise.promptBlocks.length > 0;
    const useCompactPracticeMediaLayout = windowWidth < 430;

    const renderCheckButton = () => (
      <View style={styles.practiceActionsRow}>
        <Pressable
          accessibilityRole="button"
          disabled={isCheckingExercise}
          onPress={() => {
            void handleCheckOpenExercise(exercise);
          }}
          style={({ pressed }) => [
            styles.practiceActionButton,
            styles.practiceCheckButton,
            isCheckingExercise ? styles.ctaButtonDisabled : null,
            pressed && !isCheckingExercise ? styles.ctaButtonPressed : null,
          ]}>
          <AppText language={pageLanguage} variant="caption" style={styles.practiceActionButtonText}>
            {isCheckingExercise ? pageCopy.practiceChecking : pageCopy.checkAnswers}
          </AppText>
        </Pressable>
      </View>
    );

    return (
      <Stack gap="md">
        {!isInlineQuickPractice && !hasPromptBlocks && exercise.prompt && exercise.title !== exercise.prompt ? (
          <AppText
            language={contentLang === 'th' ? 'th' : 'en'}
            variant="muted"
            style={[styles.practiceExercisePrompt, isInlineQuickPractice ? styles.practiceExercisePromptCompact : null]}>
            {exercise.prompt}
          </AppText>
        ) : null}

        {!isInlineQuickPractice ? renderPracticePromptBlocks(exercise) : null}

        {isMultipleChoiceExercise ? (
          <Stack gap="md">
            {exercise.items.map((item, itemIndex) => {
              const selectionKey = `${exercise.id}:${item.key}`;
              const selectedLabels = practiceSelections[selectionKey] ?? [];
              const selectedSet = new Set(selectedLabels);
              const answerSet = new Set(item.answerLetters);
              const isMulti = item.answerLetters.length > 1;
              const itemImageUrl = resolveLessonImageUrl(item.imageKey ? lesson?.images?.[item.imageKey] : null, item.imageKey);
              const itemAltText =
                contentLang === 'th' ? item.altTextTh || item.altText || 'Practice prompt image' : item.altText || item.altTextTh || 'Practice prompt image';

              return (
                <View key={selectionKey} style={styles.practiceQuestionCard}>
                  <View style={styles.practiceMultipleChoiceQuestionHeader}>
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
                      {item.text || item.textJsonb.length ? (
                        <AppText
                          language="en"
                          variant="body"
                          style={[styles.practiceQuestionText, isInlineQuickPractice ? styles.practiceQuestionTextCompact : null]}>
                          {item.textJsonb.length ? renderRichInlines(item.textJsonb, `${selectionKey}-question`) : item.text}
                        </AppText>
                      ) : null}
                      {contentLang === 'th' && (item.textTh || item.textJsonbTh.length) ? (
                        <AppText
                          language="th"
                          variant="body"
                          style={[styles.practiceQuestionThaiText, isInlineQuickPractice ? styles.practiceQuestionThaiTextCompact : null]}>
                          {item.textJsonbTh.length ? renderRichInlines(item.textJsonbTh, `${selectionKey}-question-th`) : item.textTh}
                        </AppText>
                      ) : null}
                    </View>
                  </View>

                  <Stack gap="sm">
                    {item.options.map((option) => {
                      const isSelected = selectedSet.has(option.label);
                      const isCorrectOption = answerSet.has(option.label);
                      const isWrongSelection = isChecked && isSelected && !isCorrectOption;
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
                          onPress={() => handlePracticeChoice(exercise.id, item.key, option.label, isMulti)}
                          style={[
                            styles.practiceOptionButton,
                            isSelected ? styles.practiceOptionButtonSelected : null,
                            isChecked && isCorrectOption ? styles.practiceOptionButtonCorrect : null,
                            isWrongSelection ? styles.practiceOptionButtonWrong : null,
                          ]}>
                          <View
                            style={[
                              styles.practiceOptionLetter,
                              isSelected ? styles.practiceOptionLetterSelected : null,
                              isChecked && isCorrectOption ? styles.practiceOptionLetterCorrect : null,
                              isWrongSelection ? styles.practiceOptionLetterWrong : null,
                            ]}>
                            <AppText
                              language="en"
                              variant="caption"
                              style={[
                                styles.practiceOptionLetterText,
                                isSelected ? styles.practiceOptionLetterTextInverse : null,
                                isChecked && isCorrectOption ? styles.practiceOptionLetterTextCorrect : null,
                              ]}>
                              {option.label}
                            </AppText>
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
                                style={[styles.practiceOptionText, isInlineQuickPractice ? styles.practiceOptionTextCompact : null]}>
                                {option.textJsonb.length ? renderRichInlines(option.textJsonb, `${selectionKey}-${option.label}`) : option.text}
                              </AppText>
                            ) : null}
                            {contentLang === 'th' && (option.textTh || option.textJsonbTh.length) ? (
                              <AppText
                                language="th"
                                variant="body"
                                style={[styles.practiceOptionThaiText, isInlineQuickPractice ? styles.practiceOptionThaiTextCompact : null]}>
                                {option.textJsonbTh.length
                                  ? renderRichInlines(option.textJsonbTh, `${selectionKey}-${option.label}-th`)
                                  : option.textTh}
                              </AppText>
                            ) : null}
                          </View>
                        </Pressable>
                      );
                    })}
                  </Stack>

                  {isChecked ? (
                    <View style={styles.practiceFeedbackBox}>
                      <View style={styles.practiceFeedbackRow}>
                        <View style={[styles.feedbackDot, styles.feedbackDotSuccess]} />
                        <AppText
                          language={pageLanguage}
                          variant="body"
                          style={[styles.practiceFeedbackHeadline, isInlineQuickPractice ? styles.practiceFeedbackHeadlineCompact : null]}>
                          {pageLanguage === 'th'
                            ? `คำตอบที่ถูก: ${item.answerLetters.join(', ')}`
                            : `Correct answer: ${item.answerLetters.join(', ')}`}
                        </AppText>
                      </View>
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

            <View style={styles.practiceActionsRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => handleCheckMultipleChoiceExercise(exercise)}
                style={({ pressed }) => [
                  styles.practiceActionButton,
                  styles.practiceCheckButton,
                  pressed ? styles.ctaButtonPressed : null,
                ]}>
                <AppText language={pageLanguage} variant="caption" style={styles.practiceActionButtonText}>
                  {pageCopy.checkAnswers}
                </AppText>
              </Pressable>

              {isChecked ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => handleResetMultipleChoiceExercise(exercise)}
                  style={({ pressed }) => [
                    styles.practiceActionButton,
                    styles.practiceResetButton,
                    pressed ? styles.ctaButtonPressed : null,
                  ]}>
                  <AppText language={pageLanguage} variant="caption" style={styles.practiceResetButtonText}>
                    {pageCopy.practiceReset}
                  </AppText>
                </Pressable>
              ) : null}
            </View>
          </Stack>
        ) : null}

        {(isOpenExercise || isSentenceTransformExercise) ? (
          <Stack gap="md">
            {exercise.items.map((item, itemIndex) => {
              const answerKey = getPracticeItemStateKey(exercise.id, item.key);
              const evaluation = practiceEvaluations[answerKey];
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
              const shouldStackPracticeMedia = false;
              const inputCount = isOpenExercise ? getPracticeOpenInputCount(exercise, item) : 1;
              const openAnswerKeys = Array.from({ length: inputCount }, (_, inputIndex) =>
                getPracticeOpenAnswerKey(exercise.id, item.key, inputIndex)
              );
              const isPromptOnlyImage = isPracticePromptOnlyImageItem(exercise, item);
              const shouldUseLargePromptImage = item.imageKey === '2.9_practice' || isPromptOnlyImage;

              if (isPromptOnlyImage) {
                return itemImageUrl ? (
                  <View key={answerKey} style={styles.practicePromptOnlyImageCard}>
                    <View style={[styles.practicePromptImageShell, styles.practicePromptImageShellLarge]}>
                      <Image
                        source={{ uri: itemImageUrl }}
                        accessibilityLabel={itemAltText}
                        contentFit="contain"
                        style={[styles.practicePromptImage, styles.practicePromptImageLarge]}
                      />
                    </View>
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
                      <View style={[styles.practiceExampleImageShell, useCompactPracticeMediaLayout ? styles.practiceExampleImageShellStacked : null]}>
                        <Image
                          source={{ uri: itemImageUrl }}
                          accessibilityLabel={itemAltText}
                          contentFit="contain"
                          style={styles.practicePromptImage}
                        />
                      </View>
                    ) : null}

                    <View style={[styles.practiceExampleContent, useCompactPracticeMediaLayout ? styles.practiceExampleContentStacked : null]}>
                      {renderPracticeItemAudioButton(item.audioKey, answerKey)}
                      {item.prompt || item.text ? (
                        <AppText
                          language="en"
                          variant="body"
                          style={[styles.practiceQuestionText, isInlineQuickPractice ? styles.practiceQuestionTextCompact : null]}>
                          {item.prompt || item.text}
                        </AppText>
                      ) : null}
                      {contentLang === 'th' && (item.promptTh || item.textTh) ? (
                        <AppText
                          language="th"
                          variant="body"
                          style={[styles.practiceQuestionThaiText, isInlineQuickPractice ? styles.practiceQuestionThaiTextCompact : null]}>
                          {item.promptTh || item.textTh}
                        </AppText>
                      ) : null}

                      <TextInput
                        multiline
                        numberOfLines={3}
                        style={[styles.practiceOpenInput, styles.practiceExampleInput]}
                        value={answerValue}
                        editable={false}
                        textAlignVertical="top"
                      />
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
                      {item.prompt || item.text || (isSentenceTransformExercise && item.textJsonb.length) ? (
                        <AppText
                          language="en"
                          variant="body"
                          style={[styles.practiceQuestionText, isInlineQuickPractice ? styles.practiceQuestionTextCompact : null]}>
                          {(isSentenceTransformExercise && item.textJsonb.length) ? renderRichInlines(item.textJsonb, `${answerKey}-stem`) : item.prompt || item.text}
                        </AppText>
                      ) : null}
                      {showMarkButtons ? (
                        <View style={styles.practiceSentenceToggleRow}>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => handlePracticeSentenceCorrectToggle(exercise.id, item.key, true, item.text)}
                            style={[styles.practiceSentenceToggle, markState === true ? styles.practiceSentenceToggleActive : null]}>
                            <AppText language="en" variant="caption" style={styles.practiceSentenceToggleText}>
                              ✓
                            </AppText>
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => handlePracticeSentenceCorrectToggle(exercise.id, item.key, false, item.text)}
                            style={[styles.practiceSentenceToggle, markState === false ? styles.practiceSentenceToggleActive : null]}>
                            <AppText language="en" variant="caption" style={styles.practiceSentenceToggleText}>
                              X
                            </AppText>
                          </Pressable>
                        </View>
                      ) : null}
                      {contentLang === 'th' && (item.promptTh || item.textTh || (isSentenceTransformExercise && item.textJsonbTh.length)) ? (
                        <AppText
                          language="th"
                          variant="body"
                          style={[styles.practiceQuestionThaiText, isInlineQuickPractice ? styles.practiceQuestionThaiTextCompact : null]}>
                          {(isSentenceTransformExercise && item.textJsonbTh.length) ? renderRichInlines(item.textJsonbTh, `${answerKey}-stem-th`) : item.promptTh || item.textTh}
                        </AppText>
                      ) : null}
                    </View>
                  </View>

                  <View style={shouldStackPracticeMedia ? styles.practiceOpenColumn : styles.practiceOpenRow}>
                    {itemImageUrl ? (
                      <View
                        style={[
                          styles.practicePromptImageShell,
                          shouldStackPracticeMedia ? styles.practicePromptImageShellStacked : null,
                          shouldUseLargePromptImage ? styles.practicePromptImageShellLarge : null,
                        ]}>
                        <Image
                          source={{ uri: itemImageUrl }}
                          accessibilityLabel={itemAltText}
                          contentFit="contain"
                          style={[styles.practicePromptImage, shouldUseLargePromptImage ? styles.practicePromptImageLarge : null]}
                        />
                      </View>
                    ) : null}

                    <View style={[styles.practiceOpenInputWrap, shouldStackPracticeMedia ? styles.practiceOpenInputWrapStacked : null]}>
                      {openAnswerKeys.map((openAnswerKey, inputIndex) => {
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

                        return (
                          <TextInput
                            key={`${answerKey}-input-${inputIndex}`}
                            multiline
                            numberOfLines={3}
                            placeholder={placeholder}
                            placeholderTextColor="#9C9EA4"
                            style={[
                              styles.practiceOpenInput,
                              inputIndex > 0 ? styles.practiceOpenInputStacked : null,
                              markState === true ? styles.practiceOpenInputDisabled : null,
                            ]}
                            value={value}
                            onChangeText={(nextValue) => handlePracticeOpenAnswerChange(exercise.id, item.key, nextValue, inputIndex)}
                            editable={!evaluation?.loading && markState !== true}
                            textAlignVertical="top"
                          />
                        );
                      })}
                    </View>
                  </View>

                  {evaluation && evaluation.correct !== null ? (
                    <View style={styles.practiceFeedbackBox}>
                      <View style={styles.practiceFeedbackRow}>
                        <View
                          style={[
                            styles.feedbackDot,
                            evaluation.correct ? styles.feedbackDotSuccess : styles.practiceFeedbackDotWarning,
                          ]}
                        />
                        <AppText
                          language={pageLanguage}
                          variant="body"
                          style={[styles.practiceFeedbackHeadline, isInlineQuickPractice ? styles.practiceFeedbackHeadlineCompact : null]}>
                          {evaluation.correct ? pageCopy.practiceCorrect : pageCopy.practiceNeedsWork}
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

            {renderCheckButton()}
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
              const itemImageUrl = resolveLessonImageUrl(item.imageKey ? lesson?.images?.[item.imageKey] : null, item.imageKey);
              const itemAltText =
                contentLang === 'th' ? item.altTextTh || item.altText || 'Practice prompt image' : item.altText || item.altTextTh || 'Practice prompt image';
              const sourceTokens = item.textJsonb.length
                ? segmentPracticeInlinesWithBlanks(item.textJsonb)
                : segmentPracticeTextWithBlanks(item.text);
              const rows: ({ type: 'text'; text: string; style?: LessonRichInline | null } | { type: 'blank'; length: number; blankId: string; minLen: number })[][] = [[]];
              let blankCursor = 0;

              sourceTokens.forEach((token) => {
                if (token.type === 'line_break') {
                  rows.push([]);
                  return;
                }
                if (token.type === 'blank') {
                  const blank = item.blanks[blankCursor] ?? null;
                  rows[rows.length - 1].push({
                    type: 'blank',
                    length: token.length,
                    blankId: blank?.id ?? `blank-${blankCursor + 1}`,
                    minLen: blank?.minLen ?? token.length,
                  });
                  blankCursor += 1;
                  return;
                }
                rows[rows.length - 1].push(token);
              });

              for (let rowIndex = rows.length - 1; rowIndex >= 0; rowIndex -= 1) {
                rows[rowIndex] = rows[rowIndex].filter(
                  (token) => token.type === 'blank' || token.text.trim().length > 0
                );

                if (rows[rowIndex].length === 0 && rows.length > 1) {
                  rows.splice(rowIndex, 1);
                }
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

              return (
                <View key={answerKey} style={item.isExample ? styles.practiceExampleCard : styles.practiceQuestionCard}>
                  <View style={styles.practiceFillBlankQuestionHeader}>
                    <View style={itemImageUrl ? styles.practiceFillBlankNumberSlot : styles.practiceFillBlankNumberSlotNoImage}>
                      <AppText
                        language="en"
                        variant="caption"
                        style={[styles.practiceQuestionNumber, item.isExample ? styles.practiceFillBlankExampleNumber : null]}>
                        {item.isExample ? 'EXAMPLE' : item.numberLabel || `${itemIndex + 1}`}
                      </AppText>
                    </View>

                    <View style={[styles.practiceQuestionTextWrap, styles.practiceFillBlankContentWrap]}>
                      {itemImageUrl ? (
                        <View style={styles.practicePromptImageShell}>
                          <Image
                            source={{ uri: itemImageUrl }}
                            accessibilityLabel={itemAltText}
                            contentFit="contain"
                            style={styles.practicePromptImage}
                          />
                        </View>
                      ) : null}

                      <Stack gap="xs">
                        {renderPracticeItemAudioButton(item.audioKey, answerKey)}
                        {rows.map((row, rowIndex) => (
                          <View key={`${answerKey}-row-${rowIndex}`} style={styles.practiceFillBlankRow}>
                            {row.map((token, tokenIndex) =>
                              token.type === 'text' ? (
                                renderPracticeInlineTextToken(
                                  token,
                                  `${answerKey}-text-${rowIndex}-${tokenIndex}`,
                                  isInlineQuickPractice
                                )
                              ) : (
                                <TextInput
                                  key={`${answerKey}-blank-${rowIndex}-${tokenIndex}`}
                                  value={
                                    item.isExample
                                      ? item.answer
                                      : practiceBlankAnswers[getPracticeBlankKey(exercise.id, item.key, token.blankId)] ?? ''
                                  }
                                  onChangeText={(value) => handlePracticeBlankAnswerChange(exercise.id, item.key, token.blankId, value)}
                                  editable={!item.isExample && !evaluation?.loading}
                                  style={[
                                    styles.practiceFillBlankInput,
                                    token.minLen <= 4 ? styles.practiceFillBlankInputShort : styles.practiceFillBlankInputLong,
                                  ]}
                                />
                              )
                            )}
                          </View>
                        ))}

                        {contentLang === 'th' && item.textTh ? (
                          <AppText
                            language="th"
                            variant="body"
                            style={[styles.practiceQuestionThaiText, isInlineQuickPractice ? styles.practiceQuestionThaiTextCompact : null]}>
                            {item.textTh}
                          </AppText>
                        ) : null}

                        {item.isExample && item.answer ? (
                          <AppText language={pageLanguage} variant="muted" style={styles.practiceExampleAnswer}>
                            {pageLanguage === 'th' ? `คำตอบ: ${item.answer}` : `Answer: ${item.answer}`}
                          </AppText>
                        ) : null}
                      </Stack>
                    </View>
                  </View>

                  {!item.isExample && evaluation && evaluation.correct !== null ? (
                    <View style={styles.practiceFeedbackBox}>
                      <View style={styles.practiceFeedbackRow}>
                        <View
                          style={[
                            styles.feedbackDot,
                            evaluation.correct ? styles.feedbackDotSuccess : styles.practiceFeedbackDotWarning,
                          ]}
                        />
                        <AppText
                          language={pageLanguage}
                          variant="body"
                          style={[styles.practiceFeedbackHeadline, isInlineQuickPractice ? styles.practiceFeedbackHeadlineCompact : null]}>
                          {evaluation.correct ? pageCopy.practiceCorrect : pageCopy.practiceNeedsWork}
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

            {renderCheckButton()}
          </Stack>
        ) : null}
      </Stack>
    );
  };

  const renderQuickPracticeExercise = (exercise: NormalizedPracticeExercise) => (
    <View style={styles.quickPracticeInlineWrap}>{renderPracticeExerciseBody(exercise, 'inline')}</View>
  );

  const activePagerGroup = isRichPagerTab ? activePagerGroups[activeUnderstandGroupIndex] ?? null : null;
  const activePagerHeading = activePagerGroup?.heading
    ? getNodeHeadingText(activePagerGroup.heading, contentLang)
    : '';
  const activePracticeHeading = activePracticeExercise?.title || activePracticeExercise?.prompt || '';
  const activePhraseHeading = activePhraseCard?.phrase || '';
  const pagerDotKeys = isPracticeTab
    ? normalizedPracticeExercises.map((exercise) => exercise.id)
    : isPhrasesTab
      ? normalizedLessonPhrases.map((phrase) => phrase.id)
      : activePagerGroups.map((group) => group.key);

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
              <AppText language="en" variant="caption" style={styles.completionModalCloseText}>
                ×
              </AppText>
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
                    onPress={closeCompletionModal}
                    style={({ pressed }) => [
                      styles.completionModalButton,
                      styles.completionModalSecondaryButton,
                      pressed ? styles.completionModalButtonPressed : null,
                    ]}>
                    <AppText language={pageLanguage} variant="caption" style={styles.completionModalSecondaryButtonText}>
                      {pageCopy.completionReview}
                    </AppText>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      closeCompletionModal();
                      router.push('/(tabs)/lessons');
                    }}
                    style={({ pressed }) => [
                      styles.completionModalButton,
                      styles.completionModalPrimaryButton,
                      pressed ? styles.completionModalButtonPressed : null,
                    ]}>
                    <AppText language={pageLanguage} variant="caption" style={styles.completionModalPrimaryButtonText}>
                      {pageCopy.completionOpenLibrary}
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
                  <View style={styles.coverTopMetaRow}>
                    <View style={styles.coverTopBar}>
                      <View style={styles.coverTopLeft}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={backToLibraryLabel}
                          onPress={() => router.push('/(tabs)/lessons')}
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
                        {uiCopy.lessonLabel} {coverLessonNumber}
                      </AppText>

                      <AppText language="en" variant="title" style={styles.coverTitle}>
                        {englishTitle ?? 'Untitled lesson'}
                      </AppText>

                      {thaiTitle ? (
                        <AppText language="th" variant="body" style={styles.coverThaiTitle}>
                          {thaiTitle}
                        </AppText>
                      ) : null}

                      {resolvedBackstory ? (
                        <View style={styles.coverBackstoryBlock}>
                          <AppText
                            language={uiLanguage}
                            variant="muted"
                            style={styles.coverBackstory}
                            numberOfLines={isBackstoryExpanded ? undefined : 2}>
                            {resolvedBackstory}
                          </AppText>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => setIsBackstoryExpanded((prev) => !prev)}
                            style={styles.backstoryToggle}>
                            <AppText language={uiLanguage} variant="caption" style={styles.backstoryToggleText}>
                              {`${backstoryToggleLabel} ${isBackstoryExpanded ? '▴' : '▾'}`}
                            </AppText>
                          </Pressable>
                        </View>
                      ) : null}
                    </Stack>

                    {resolvedFocus ? (
                      <View style={styles.coverFocusBlock}>
                        <AppText language={uiLanguage} variant="caption" style={styles.coverFocusEyebrow}>
                          {uiCopy.lessonFocus}
                        </AppText>
                        <AppText language={uiLanguage} variant="body" style={styles.coverFocusText}>
                          {resolvedFocus}
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
                          onPress={() => setHasStartedLesson(true)}
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
          ) : (
            <View style={styles.stepperScreen}>
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

                      <AppText language={pageLanguage} variant="caption" style={styles.studyCounterText}>
                        {studyCounterLabel}
                      </AppText>

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
                          onPress={() => setContentLang((previous) => (previous === 'en' ? 'th' : 'en'))}
                          style={[styles.translatePill, isTranslatingContent ? styles.translatePillDisabled : null]}>
                          <AppText language="en" variant="caption" style={styles.translatePillText}>
                            {contentToggleText}
                          </AppText>
                        </Pressable>
                      </View>
                    </View>

                    <View style={styles.progressBarTrack}>
                      <View style={[styles.progressBarFill, progressWidthStyle]} />
                    </View>
                  </View>
                </>
              ) : null}

              <GestureDetector gesture={sectionSwipeGesture}>
                <View style={styles.studyBody}>
                  <ScrollView
                    ref={contentScrollRef}
                    contentContainerStyle={styles.contentScrollContent}
                    keyboardDismissMode="none"
                    keyboardShouldPersistTaps="always"
                    showsVerticalScrollIndicator={false}
                    style={styles.contentScroll}>
                  <View style={styles.sectionHeaderRow}>
                    <AppText language={pageLanguage} variant="title" style={styles.studySectionTitle}>
                      {activeSectionTitle ?? pageCopy.noSectionAvailable}
                    </AppText>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                      onPress={() => setIsFullscreen((previous) => !previous)}
                      style={styles.fullscreenButton}>
                      <AppText language="en" variant="body" style={styles.fullscreenButtonText}>
                        {fullscreenToggleIcon}
                      </AppText>
                    </Pressable>
                  </View>

                  <View style={styles.sectionDivider} />

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
                          <View style={[styles.prepareList, useTwoColumnPrepareLayout ? styles.prepareListTwoColumn : null]}>
                            {prepareItems.map((item) => renderPrepareItem(item))}
                          </View>
                        ) : (
                          <AppText language={pageLanguage} variant="muted" style={styles.prepareEmptyText}>
                            {pageCopy.prepareEmpty}
                          </AppText>
                        )}
                      </Stack>
                    </Card>
                  ) : isComprehensionTab ? (
                    <Stack gap="lg">
                      {normalizedQuestions.map((question, index) => {
                        const questionNumber = question.sortOrder || index + 1;
                        const isMulti = question.answerKey.length > 1;
                        const currentSelections = selectedAnswers[question.id] ?? [];
                        const answerSet = new Set(question.answerKey);
                        const correctOption = question.options.find((option) => answerSet.has(option.label)) ?? null;

                        return (
                          <View key={question.id} style={styles.questionBlock}>
                            <View style={styles.questionPromptRow}>
                              <AppText language="en" variant="body" style={styles.questionNumberText}>
                                {`${questionNumber}`}
                              </AppText>

                              <View style={styles.questionPromptContent}>
                                {contentLang === 'th' ? (
                                  <>
                                    {splitTextLines(question.promptEn).map((line, lineIndex) => (
                                      <AppText
                                        key={`en-${question.id}-${lineIndex}`}
                                        language="en"
                                        variant="body"
                                        style={styles.questionPromptText}>
                                        {line}
                                      </AppText>
                                    ))}
                                    {splitTextLines(question.promptTh).map((line, lineIndex) => (
                                      <AppText
                                        key={`th-${question.id}-${lineIndex}`}
                                        language="th"
                                        variant="body"
                                        style={styles.questionPromptThaiText}>
                                        {line}
                                      </AppText>
                                    ))}
                                  </>
                                ) : (
                                  splitTextLines(question.prompt).map((line, lineIndex) => (
                                    <AppText
                                      key={`prompt-${question.id}-${lineIndex}`}
                                      language="en"
                                      variant="body"
                                      style={styles.questionPromptText}>
                                      {line}
                                    </AppText>
                                  ))
                                )}
                              </View>
                            </View>

                            <Stack gap="sm">
                              {question.options.map((option, optionIndex) => {
                                const optionKey = `${question.id}-${option.label}-${optionIndex}`;
                                const isSelected = currentSelections.includes(option.label);
                                const isCorrectOption = answerSet.has(option.label);
                                const optionImageUrl = resolveLessonImageUrl(
                                  option.imageKey ? lesson?.images?.[option.imageKey] : null,
                                  option.imageKey
                                );

                                return (
                                  <Pressable
                                    key={optionKey}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${option.label} ${option.text || option.textTh}`}
                                    accessibilityState={{ selected: isSelected }}
                                    onPress={() => handleToggleAnswer(question.id, option.label, isMulti)}
                                    style={[
                                      styles.quizOptionButton,
                                      isSelected ? styles.quizOptionButtonSelected : null,
                                      hasCheckedAnswers && isCorrectOption ? styles.quizOptionButtonCorrect : null,
                                      hasCheckedAnswers && isSelected && !isCorrectOption
                                        ? styles.quizOptionButtonWrong
                                        : null,
                                    ]}>
                                    <View
                                      style={[
                                        styles.quizOptionLetter,
                                        isSelected ? styles.quizOptionLetterSelected : null,
                                        hasCheckedAnswers && isCorrectOption ? styles.quizOptionLetterCorrect : null,
                                        hasCheckedAnswers && isSelected && !isCorrectOption
                                          ? styles.quizOptionLetterWrong
                                          : null,
                                      ]}>
                                      <AppText
                                        language="en"
                                        variant="caption"
                                        style={[
                                          styles.quizOptionLetterText,
                                          isSelected ? styles.quizOptionLetterTextInverse : null,
                                          hasCheckedAnswers && isCorrectOption ? styles.quizOptionLetterTextCorrect : null,
                                        ]}>
                                        {option.label}
                                      </AppText>
                                    </View>

                                    {optionImageUrl ? (
                                      <Image source={{ uri: optionImageUrl }} contentFit="cover" style={styles.optionImage} />
                                    ) : null}

                                    <View style={styles.quizOptionTextWrap}>
                                      {option.text ? (
                                        <AppText language="en" variant="body" style={styles.quizOptionText}>
                                          {option.text}
                                        </AppText>
                                      ) : null}

                                      {contentLang === 'th' && option.textTh ? (
                                        <AppText language="th" variant="body" style={styles.quizOptionTextThai}>
                                          {option.textTh}
                                        </AppText>
                                      ) : null}
                                    </View>
                                  </Pressable>
                                );
                              })}
                            </Stack>

                            {hasCheckedAnswers ? (
                              <View style={styles.feedbackBlock}>
                                {correctOption ? (
                                  <View style={styles.feedbackRow}>
                                    <View style={[styles.feedbackDot, styles.feedbackDotSuccess]} />
                                    <AppText language={contentLang === 'th' ? 'th' : 'en'} variant="body" style={styles.feedbackHeadline}>
                                      {pageLanguage === 'th'
                                        ? `คำตอบที่ถูก: ${correctOption.textTh || correctOption.text}`
                                        : `Correct answer: ${correctOption.text || correctOption.textTh}`}
                                    </AppText>
                                  </View>
                                ) : null}

                                {question.explanation ? (
                                  <AppText language={contentLang === 'th' ? 'th' : 'en'} variant="muted" style={styles.feedbackBody}>
                                    {question.explanation}
                                  </AppText>
                                ) : null}
                              </View>
                            ) : null}
                          </View>
                        );
                      })}

                      <Button
                        language={pageLanguage}
                        title={comprehensionButtonLabel}
                        onPress={() => setHasCheckedAnswers(true)}
                        style={styles.comprehensionInlineButton}
                        textStyle={styles.comprehensionInlineButtonText}
                      />
                    </Stack>
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

                      <AppText language={pageLanguage} variant="body" style={styles.applyNoteText}>
                        {pageCopy.applyNote}
                      </AppText>

                      <TextInput
                        ref={applyInputRef}
                        multiline
                        numberOfLines={3}
                        caretHidden={false}
                        contextMenuHidden={false}
                        placeholder={pageCopy.applyPlaceholder}
                        placeholderTextColor="#9C9EA4"
                        style={[styles.applyInput, showApplyResponse ? styles.applyInputDisabled : null]}
                        value={applyText}
                        onChangeText={setApplyText}
                        editable={!showApplyResponse}
                        scrollEnabled={false}
                        textAlignVertical="top"
                      />

                      {!showApplyResponse ? (
                        <Button
                          language={pageLanguage}
                          title={pageCopy.applySubmit}
                          onPress={() => setShowApplyResponse(true)}
                          style={styles.applySubmitButton}
                          textStyle={styles.applySubmitButtonText}
                        />
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
                  ) : isPracticeTab || isUnderstandTab || isExtraTipTab || isCommonMistakeTab || isPhrasesTab ? (
                    (isPracticeTab ? activePracticeExercise : isPhrasesTab ? activePhraseCard : activePagerGroup) ? (
                      <View style={styles.richPagerShell}>
                        <GestureDetector gesture={richPagerGesture}>
                          <Animated.View
                            style={[
                              styles.richPagerCard,
                              windowHeight < 780 ? styles.richPagerCardCompact : null,
                              richPagerAnimatedStyle,
                            ]}>
                            <View style={styles.richPagerMetaRow}>
                              {(isPracticeTab ? activePracticeHeading : isPhrasesTab ? activePhraseHeading : activePagerHeading) ? (
                                <AppText language={contentLang} variant="body" style={styles.richPagerHeadingLabel}>
                                  {isPracticeTab ? activePracticeHeading : isPhrasesTab ? activePhraseHeading : activePagerHeading}
                                </AppText>
                              ) : null}

                              <View style={styles.richPagerCounterPill}>
                                <AppText language="en" variant="caption" style={styles.richPagerCounterText}>
                                  {`${Math.min(activeInnerCardIndex + 1, activeInnerCardCount)} of ${activeInnerCardCount}`}
                                </AppText>
                              </View>
                            </View>

                            <View style={styles.richPagerBody}>
                              <ScrollView
                                ref={richPagerScrollRef}
                                nestedScrollEnabled
                                showsVerticalScrollIndicator={false}
                                style={styles.richPagerScrollView}
                                contentContainerStyle={styles.richPagerScrollContent}>
                                {isPracticeTab && activePracticeExercise
                                  ? renderPracticeExerciseBody(activePracticeExercise)
                                  : isPhrasesTab && activePhraseCard
                                    ? renderPhraseBody(activePhraseCard)
                                    : activePagerGroup && isUnderstandTab
                                      ? renderUnderstandGroupBody(activePagerGroup.body, activePagerGroup.key)
                                      : activePagerGroup && isExtraTipTab
                                        ? renderExtraTipGroupBody(activePagerGroup.body, activePagerGroup.key)
                                      : activePagerGroup
                                        ? renderCommonMistakeGroupBody(activePagerGroup.body, activePagerGroup.key)
                                        : null}
                              </ScrollView>
                            </View>
                          </Animated.View>
                        </GestureDetector>

                        {hasMultiplePagerCards ? (
                          <View style={styles.richPagerControls}>
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
                              <AppText language="en" variant="body" style={styles.richPagerArrowText}>
                                ←
                              </AppText>
                            </Pressable>

                            <View style={styles.richPagerDots}>
                              {pagerDotKeys.map((dotKey, index) => (
                                <View
                                  key={dotKey}
                                  style={[
                                    styles.richPagerDot,
                                    index === activeInnerCardIndex ? styles.richPagerDotActive : null,
                                  ]}
                                />
                              ))}
                            </View>

                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={pageLanguage === 'th' ? 'การ์ดถัดไป' : 'Next card'}
                              accessibilityState={{ disabled: activeInnerCardIndex >= activeInnerCardCount - 1 }}
                              disabled={activeInnerCardIndex >= activeInnerCardCount - 1}
                              onPress={() => handleSetActiveInnerCardIndex(activeInnerCardIndex + 1)}
                              style={[
                                styles.richPagerArrowButton,
                                activeInnerCardIndex >= activeInnerCardCount - 1
                                  ? styles.richPagerArrowButtonDisabled
                                  : null,
                              ]}>
                                <AppText language="en" variant="body" style={styles.richPagerArrowText}>
                                  →
                              </AppText>
                            </Pressable>
                          </View>
                        ) : null}

                        {!isLastPagerCard ? (
                          <AppText language={pageLanguage} variant="muted" style={styles.richPagerHelperText}>
                            {isPhrasesTab
                              ? pageCopy.phrasesBrowseAll
                              : pageLanguage === 'th'
                                ? 'ปัดซ้ายหรือขวาเพื่อเปลี่ยนการ์ด'
                                : 'Swipe left or right to change cards.'}
                          </AppText>
                        ) : null}
                      </View>
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
                                  isUnderstandTab ? 'understand' : isExtraTipTab ? 'extra_tip' : 'common_mistake'
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
                  ) : isCultureNoteTab ? (
                    cultureNoteNodes.length ? (
                      <View style={styles.cultureNoteShell}>{renderCultureNoteBody(visibleCultureNoteNodes)}</View>
                    ) : (
                      <View style={styles.placeholderBox}>
                        <Stack gap="xs">
                          <AppText language={pageLanguage} variant="caption" style={styles.placeholderEyebrow}>
                            {pageCopy.rendererNext}
                          </AppText>
                          <AppText language={pageLanguage} variant="body" style={styles.placeholderTitle}>
                            {pageCopy.rendererReady(getLessonSectionLabel(pageLanguage, 'culture_note'))}
                          </AppText>
                          <AppText language={pageLanguage} variant="muted" style={styles.placeholderBody}>
                            {pageCopy.richNodesLoaded(richContentBlockCount)}
                          </AppText>
                        </Stack>
                      </View>
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
                  </ScrollView>

                  <View style={[styles.stickyFooter, { paddingBottom: Math.max(insets.bottom, 10) }]}>
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

                    <View style={styles.ctaRow}>
                      {lessonCompletionError ? (
                        <AppText language={pageLanguage} variant="muted" style={styles.lessonCompletionErrorText}>
                          {lessonCompletionError}
                        </AppText>
                      ) : null}

                      <Pressable
                        accessibilityRole="button"
                        disabled={
                          (!activeTab && sectionCount === 0) ||
                          isPrimaryActionDisabled ||
                          isSavingLessonCompletion ||
                          isFinishLessonButtonDisabled
                        }
                        onPress={() => {
                          if (sectionCount === 0) {
                            setHasStartedLesson(false);
                            return;
                          }

                          if (isLastSection) {
                            if (isLessonCompleted) {
                              router.push('/(tabs)/lessons');
                              return;
                            }

                            void completeLesson();
                            return;
                          } else {
                            if (activeTab?.type === 'prepare') {
                              audioTrayExpandCounterRef.current += 1;
                              setAudioTrayAutoExpandSignal(`prepare-next-${audioTrayExpandCounterRef.current}`);
                            }
                            setActiveSectionIndex((prev) => Math.min(prev + 1, sectionCount - 1));
                          }
                        }}
                        style={({ pressed }) => [
                          styles.ctaButton,
                          styles.ctaNextButton,
                          styles.ctaNextButtonFull,
                          (
                            (!activeTab && sectionCount === 0) ||
                            isPrimaryActionDisabled ||
                            isSavingLessonCompletion ||
                            isFinishLessonButtonDisabled
                          )
                            ? styles.ctaButtonDisabled
                            : null,
                          pressed &&
                          !(
                            (!activeTab && sectionCount === 0) ||
                            isPrimaryActionDisabled ||
                            isSavingLessonCompletion ||
                            isFinishLessonButtonDisabled
                          )
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
              </GestureDetector>
            </View>
          )}
        </View>
      ) : null}

      {!isLoading && !errorMessage && lesson && hasStartedLesson && isMenuOpen ? (
        <View style={styles.menuOverlay}>
          <Pressable style={styles.menuBackdrop} onPress={() => setIsMenuOpen(false)} />
          <Card padding="md" radius="lg" style={styles.menuSheet}>
            <Stack gap="sm">
              <View style={styles.menuHeader}>
                <Pressable
                  accessibilityLabel={backToLibraryLabel}
                  accessibilityRole="button"
                  onPress={() => {
                    setIsMenuOpen(false);
                    router.push('/(tabs)/lessons');
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
                      setActiveSectionIndex(index);
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
                      <AppText language={pageLanguage} variant="muted" style={styles.menuItemMeta}>
                        {tab.section && hasSectionAudio(tab.section)
                          ? pageCopy.audioReady
                          : getLessonSectionLabel(pageLanguage, tab.type)}
                      </AppText>
                    </View>
                  </Pressable>
                );
              })}
            </Stack>
          </Card>
        </View>
      ) : null}
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
    top: -24,
    left: 18,
    right: 18,
    bottom: 360,
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
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xl + theme.spacing.xs,
    paddingBottom: theme.spacing.xl,
  },
  coverTopMetaRow: {
    alignItems: 'flex-start',
    marginTop: theme.spacing.sm,
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
  coverBackstoryBlock: {
    gap: theme.spacing.xs,
  },
  coverBackstory: {
    color: theme.colors.mutedText,
  },
  backstoryToggle: {
    alignSelf: 'flex-end',
    paddingTop: 2,
  },
  backstoryToggleText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.medium,
    textDecorationLine: 'underline',
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
  studyTopChrome: {
    backgroundColor: theme.colors.surface,
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
    paddingTop: 22,
    paddingBottom: 28,
    gap: 14,
  },
  studyNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1.5,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  studyMenuButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studyMenuButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 16,
    fontWeight: theme.typography.weights.semibold,
  },
  studyCounterText: {
    flex: 1,
    textAlign: 'center',
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: theme.typography.weights.semibold,
  },
  studyNavActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  studyNavStatusText: {
    color: theme.colors.mutedText,
    fontSize: 10,
    lineHeight: 12,
  },
  translatePill: {
    minWidth: 44,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  translatePillDisabled: {
    opacity: 0.7,
  },
  translatePillText: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 15,
    fontWeight: theme.typography.weights.semibold,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: theme.colors.accentMuted,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.text,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  studySectionTitle: {
    flex: 1,
    flexShrink: 1,
    color: theme.colors.text,
    fontSize: 29,
    lineHeight: 32,
    fontWeight: theme.typography.weights.bold,
  },
  fullscreenButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenButtonText: {
    color: theme.colors.text,
    fontSize: 20,
    lineHeight: 20,
    fontWeight: theme.typography.weights.semibold,
  },
  sectionDivider: {
    height: 1.5,
    backgroundColor: theme.colors.accentMuted,
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
  richPagerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  richPagerCounterPill: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#F6FBFF',
    borderRadius: theme.radii.xl,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  richPagerCounterText: {
    fontWeight: theme.typography.weights.semibold,
  },
  richPagerHeadingLabel: {
    flex: 1,
    flexShrink: 1,
    color: theme.colors.text,
    fontSize: theme.typography.sizes.lg,
    lineHeight: theme.typography.lineHeights.lg,
    fontWeight: theme.typography.weights.semibold,
  },
  richPagerBody: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  richPagerScrollView: {
    flex: 1,
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
  richPagerArrowButton: {
    width: 48,
    height: 48,
    borderRadius: theme.radii.xl,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...brutalShadow,
  },
  richPagerArrowButtonDisabled: {
    opacity: 0.4,
  },
  richPagerArrowText: {
    fontSize: 24,
    lineHeight: 24,
    fontWeight: theme.typography.weights.semibold,
  },
  richPagerDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
  },
  richPagerDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#D0D8E0',
  },
  richPagerDotActive: {
    width: 22,
    backgroundColor: theme.colors.primary,
  },
  richPagerHelperText: {
    color: theme.colors.mutedText,
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
    gap: theme.spacing.xs,
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
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.lineHeights.md,
  },
  phraseListRow: {
    marginBottom: theme.spacing.xs,
  },
  phraseAudioBlock: {
    gap: theme.spacing.sm,
  },
  phraseAudioRow: {
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  phraseAudioText: {
    paddingTop: 0,
    lineHeight: theme.typography.lineHeights.md,
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
  phraseContinuationIndent: {
    paddingLeft: 50,
  },
  cultureNoteShell: {
    paddingVertical: theme.spacing.xs,
  },
  richGroupBand: {
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.sm,
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
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.lineHeights.lg,
  },
  richSubheader: {
    fontWeight: theme.typography.weights.semibold,
    marginBottom: theme.spacing.xs,
  },
  richInlineText: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.lineHeights.lg,
  },
  richInlineBold: {
    fontWeight: theme.typography.weights.semibold,
  },
  richInlineItalic: {
    fontStyle: 'italic',
  },
  richInlineUnderline: {
    textDecorationLine: 'underline',
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  understandAudioRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  understandAudioText: {
    flex: 1,
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.lineHeights.lg,
    paddingTop: 1,
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
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.lineHeights.lg,
  },
  richNumberBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 2,
  },
  richNumberBadgeText: {
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
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.md,
    ...brutalShadow,
  },
  prepareCardHeader: {
    gap: theme.spacing.xs,
  },
  prepareCardEyebrow: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  prepareCardSubtitle: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.sizes.sm,
    lineHeight: theme.typography.lineHeights.sm,
  },
  prepareList: {
    gap: theme.spacing.sm,
  },
  prepareListTwoColumn: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: theme.spacing.sm,
  },
  prepareItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    paddingVertical: 2,
  },
  prepareItemRowTwoColumn: {
    width: '48%',
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
    paddingTop: 1,
  },
  prepareItemText: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.lineHeights.lg,
  },
  prepareEmptyText: {
    color: theme.colors.mutedText,
  },
  questionBlock: {
    gap: 10,
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
    fontSize: 14,
    lineHeight: 18,
    fontWeight: theme.typography.weights.semibold,
  },
  questionPromptThaiText: {
    color: theme.colors.mutedText,
    fontSize: 14,
    lineHeight: 18,
  },
  quizOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 10,
    ...brutalShadow,
  },
  quizOptionButtonSelected: {
    backgroundColor: theme.colors.accentMuted,
    borderColor: theme.colors.accent,
    shadowColor: theme.colors.accent,
  },
  quizOptionButtonCorrect: {
    backgroundColor: theme.colors.success,
  },
  quizOptionButtonWrong: {
    backgroundColor: '#FFE5E5',
    borderColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
  },
  quizOptionLetter: {
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
    borderColor: theme.colors.accent,
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
    fontWeight: theme.typography.weights.medium,
    marginBottom: theme.spacing.xs,
  },
  applyPromptText: {
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.lineHeights.lg,
  },
  applyParagraphRow: {
    marginBottom: theme.spacing.sm,
  },
  applyParagraphText: {
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.lineHeights.lg,
  },
  applyInlineText: {
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.lineHeights.lg,
    color: theme.colors.text,
  },
  applyInlineBold: {
    fontWeight: theme.typography.weights.semibold,
  },
  applyInlineItalic: {
    fontStyle: 'italic',
  },
  applyInlineUnderline: {
    textDecorationLine: 'underline',
  },
  applyAccentBlock: {
    borderLeftWidth: 4,
    borderLeftColor: APPLY_ACCENT_COLOR,
    paddingLeft: theme.spacing.md,
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
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.lineHeights.md,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  applyInputDisabled: {
    opacity: 0.7,
  },
  applySubmitButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.xl,
    backgroundColor: '#91CAFF',
    ...brutalShadow,
  },
  applySubmitButtonText: {
    color: theme.colors.text,
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
  applyResponseWrap: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.md,
  },
  applyResponseNote: {
    color: theme.colors.mutedText,
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
  },
  practiceExercisePromptCompact: {
    fontSize: theme.typography.sizes.sm,
    lineHeight: theme.typography.lineHeights.sm,
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
  },
  practicePromptBlockThaiText: {
    color: theme.colors.mutedText,
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
  },
  practicePromptBlockImageShell: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E6EAF2',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
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
  practiceExampleCard: {
    borderWidth: 1.5,
    borderColor: '#D7DFF3',
    borderRadius: 22,
    backgroundColor: '#EFF4FF',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  practiceExampleHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  practiceExampleLabel: {
    color: '#2A69FF',
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
    gap: theme.spacing.xs,
  },
  practiceMultipleChoiceQuestionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
  },
  practiceMultipleChoiceQuestionTextWrap: {
    gap: theme.spacing.sm,
  },
  practiceFillBlankQuestionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
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
    fontWeight: theme.typography.weights.bold,
  },
  practiceFillBlankExampleNumber: {
    minWidth: 72,
  },
  practiceQuestionTextWrap: {
    flex: 1,
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
    fontWeight: theme.typography.weights.medium,
  },
  practiceQuestionTextCompact: {
    fontSize: theme.typography.sizes.sm,
    lineHeight: theme.typography.lineHeights.sm,
  },
  practiceQuestionThaiText: {
    color: theme.colors.mutedText,
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
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  practiceSentenceToggleActive: {
    backgroundColor: theme.colors.accentMuted,
    borderColor: theme.colors.accent,
  },
  practiceSentenceToggleText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
  },
  practiceFillBlankRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 0,
    rowGap: 1,
  },
  practiceInlineText: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.md,
    lineHeight: 24,
  },
  practiceInlineTextCompact: {
    fontSize: theme.typography.sizes.sm,
    lineHeight: theme.typography.lineHeights.sm,
  },
  practiceInlineBold: {
    fontWeight: theme.typography.weights.semibold,
  },
  practiceInlineItalic: {
    fontStyle: 'italic',
  },
  practiceInlineUnderline: {
    textDecorationLine: 'underline',
  },
  practiceFillBlankInput: {
    height: 30,
    minHeight: 30,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 0,
    paddingTop: 0,
    paddingBottom: 0,
    fontSize: theme.typography.sizes.md,
    lineHeight: 20,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    textAlignVertical: 'center',
  },
  practiceFillBlankInputShort: {
    minWidth: 150,
  },
  practiceFillBlankInputLong: {
    minWidth: 140,
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
  practicePromptImageShell: {
    width: 148,
    minHeight: 148,
    borderWidth: 1,
    borderColor: '#E6EAF2',
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
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
  practicePromptImage: {
    width: '100%',
    height: 120,
  },
  practicePromptImageLarge: {
    height: 158,
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
  practiceOptionButton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  practiceOptionButtonSelected: {
    backgroundColor: theme.colors.accentMuted,
    borderColor: theme.colors.accent,
  },
  practiceOptionButtonCorrect: {
    backgroundColor: theme.colors.success,
  },
  practiceOptionButtonWrong: {
    backgroundColor: '#FFE5E5',
    borderColor: theme.colors.primary,
  },
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
  practiceOptionLetterSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  practiceOptionLetterCorrect: {
    backgroundColor: theme.colors.text,
  },
  practiceOptionLetterWrong: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  practiceOptionLetterText: {
    color: theme.colors.text,
    fontSize: 11,
    lineHeight: 11,
    fontWeight: theme.typography.weights.semibold,
  },
  practiceOptionLetterTextInverse: {
    color: theme.colors.surface,
  },
  practiceOptionLetterTextCorrect: {
    color: theme.colors.success,
  },
  practiceOptionTextWrap: {
    flex: 1,
    gap: 2,
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
    fontSize: theme.typography.sizes.sm,
    lineHeight: theme.typography.lineHeights.sm,
  },
  practiceOptionTextCompact: {
    fontSize: 13,
    lineHeight: 17,
  },
  practiceOptionThaiText: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.sizes.sm,
    lineHeight: theme.typography.lineHeights.sm,
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
  practiceResetButton: {
    backgroundColor: theme.colors.surface,
  },
  practiceActionButtonText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semibold,
  },
  practiceResetButtonText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semibold,
  },
  practiceFeedbackBox: {
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
    color: theme.colors.mutedText,
  },
  practiceFeedbackBodyCompact: {
    fontSize: 13,
    lineHeight: 17,
  },
  practiceFeedbackDotWarning: {
    backgroundColor: theme.colors.warningSurface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  practiceOpenInput: {
    width: '100%',
    minHeight: 100,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.lineHeights.md,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  practiceExampleInput: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    color: '#62656D',
  },
  practiceOpenInputDisabled: {
    opacity: 0.7,
  },
  practiceInlineError: {
    color: theme.colors.primary,
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
    fontWeight: theme.typography.weights.semibold,
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
    borderTopWidth: 1.5,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  completionModalCloseText: {
    color: theme.colors.text,
    fontSize: 18,
    lineHeight: 18,
    fontWeight: theme.typography.weights.semibold,
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
  completionModalActionsRow: {
    width: '100%',
    flexDirection: 'row',
    gap: theme.spacing.sm,
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
  },
  completionModalSecondaryButtonText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semibold,
    textAlign: 'center',
  },
  completionModalButtonPressed: {
    opacity: 0.9,
  },
  ctaRow: {
    flexDirection: 'column',
    gap: 6,
    paddingHorizontal: 10,
    paddingTop: 3,
    paddingBottom: 16,
    backgroundColor: theme.colors.background,
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
    justifyContent: 'flex-start',
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30, 30, 30, 0.18)',
  },
  menuSheet: {
    marginTop: theme.spacing.xl,
    marginHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  menuTitle: {
    flex: 1,
    textAlign: 'center',
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
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  menuItemActive: {
    backgroundColor: theme.colors.accentSurface,
  },
  menuItemIndex: {
    width: 32,
    height: 32,
    borderRadius: theme.radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  menuItemIndexText: {
    fontWeight: theme.typography.weights.semibold,
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
