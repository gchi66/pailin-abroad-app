import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Stack as RouterStack, useLocalSearchParams, useRouter } from 'expo-router';
import { AudioPlayer, AudioStatus, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  evaluateLessonAnswer,
  fetchLessonAudioSnippetIndex,
  fetchLessonPhraseAudioSnippetIndex,
  fetchLessonAudioUrls,
  fetchResolvedLesson,
  fetchSignedLessonAudioUrl,
  prefetchResolvedLesson,
} from '@/src/api/lessons';
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
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';
import {
  LessonApplyContent,
  LessonAudioSnippet,
  LessonAudioSnippetIndex,
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
};

type NormalizedPracticeItem = {
  key: string;
  numberLabel: string;
  text: string;
  textTh: string;
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
  isExample: boolean;
};

type NormalizedPracticeExercise = {
  id: string;
  kind: 'multiple_choice' | 'open' | null;
  title: string;
  titleEn: string;
  titleTh: string;
  prompt: string;
  promptEn: string;
  promptTh: string;
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

const MASTER_ORDER = [
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
    const { en, th } = splitThaiText(body);
    return { label, text: en, textTh: th };
  }

  if (!option || typeof option !== 'object') {
    return { label: '', text: '', textTh: '' };
  }

  const raw = option as Record<string, unknown>;
  const body = typeof raw.text === 'string' ? raw.text : '';
  const thaiBody = typeof raw.text_th === 'string' ? raw.text_th : typeof raw.textTh === 'string' ? raw.textTh : '';
  const { en, th } = splitThaiText(body);
  const thaiSplit = splitThaiText(thaiBody);

  return {
    label: normalizeOptionLetter(String(raw.label ?? raw.letter ?? '')),
    text: en || thaiSplit.en,
    textTh: th || thaiSplit.th,
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

const normalizePracticeExerciseKind = (value: unknown) => {
  const kind = String(value ?? '').trim().toLowerCase();
  if (kind === 'multiple_choice' || kind === 'open' || kind === 'open_ended') {
    return kind === 'open_ended' ? 'open' : kind;
  }
  return null;
};

const normalizePracticeExercise = (exercise: ResolvedLessonExercise, contentLang: UiLanguage): NormalizedPracticeExercise => {
  const raw = exercise as Record<string, unknown>;
  const kind = normalizePracticeExerciseKind(raw.kind ?? raw.exercise_type);
  const itemsSource =
    contentLang === 'th' && Array.isArray(raw.items_th) && raw.items_th.length
      ? raw.items_th
      : Array.isArray(raw.items)
        ? raw.items
        : [];
  const englishItemsSource = Array.isArray(raw.items_en) ? raw.items_en : Array.isArray(raw.items) ? raw.items : [];
  const thaiItemsSource = Array.isArray(raw.items_th) ? raw.items_th : [];

  const items = itemsSource.map((item, index) => {
    const current = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const englishFallback =
      englishItemsSource[index] && typeof englishItemsSource[index] === 'object'
        ? (englishItemsSource[index] as Record<string, unknown>)
        : {};
    const thaiFallback =
      thaiItemsSource[index] && typeof thaiItemsSource[index] === 'object'
        ? (thaiItemsSource[index] as Record<string, unknown>)
        : {};

    const text = getPracticeFieldByLang(current, 'text', 'en') || getPracticeFieldByLang(englishFallback, 'text', 'en');
    const textTh = getPracticeFieldByLang(current, 'text', 'th') || getPracticeFieldByLang(thaiFallback, 'text', 'th');
    const prompt = getPracticeFieldByLang(current, 'prompt', 'en') || getPracticeFieldByLang(current, 'question', 'en');
    const promptTh = getPracticeFieldByLang(current, 'prompt', 'th') || getPracticeFieldByLang(current, 'question', 'th');
    const placeholder =
      getPracticeFieldByLang(current, 'placeholder', 'en') || getPracticeFieldByLang(englishFallback, 'placeholder', 'en');
    const placeholderTh =
      getPracticeFieldByLang(current, 'placeholder', 'th') || getPracticeFieldByLang(thaiFallback, 'placeholder', 'th');
    const answer = typeof current.answer === 'string' ? current.answer.trim() : '';
    const options = Array.isArray(current.options)
      ? current.options.map(parsePracticeOption)
      : Array.isArray(raw.options)
        ? raw.options.map(parsePracticeOption)
        : [];
    const numberValue = current.number ?? index + 1;

    return {
      key: String(current.id ?? `${raw.id ?? 'exercise'}-${index + 1}`),
      numberLabel: String(numberValue),
      text,
      textTh,
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
              : null,
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
      isExample:
        typeof current.is_example === 'boolean'
          ? current.is_example
          : String(current.number ?? '').trim().toLowerCase() === 'example',
    };
  });

  const promptEn = getPracticeFieldByLang(raw, 'prompt', 'en') || String(raw.prompt_md ?? '').trim();
  const promptTh = getPracticeFieldByLang(raw, 'prompt', 'th');

  return {
    id: String(raw.id ?? `practice-${raw.sort_order ?? 0}`),
    kind,
    title: getPracticeFieldByLang(raw, 'title', contentLang) || promptEn || promptTh || '',
    titleEn: getPracticeFieldByLang(raw, 'title', 'en'),
    titleTh: getPracticeFieldByLang(raw, 'title', 'th'),
    prompt: contentLang === 'th' ? promptTh || promptEn : promptEn || promptTh,
    promptEn,
    promptTh,
    items,
    sortOrder: Number(raw.sort_order ?? 0),
  };
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

const resolveLessonImageUrl = (value: unknown, fallbackImageKey?: string | null) => {
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
  const params = useLocalSearchParams<{ id?: string }>();
  const lessonId = typeof params.id === 'string' ? params.id : '';
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const uiCopy = useMemo(() => getLessonDetailCopy(uiLanguage), [uiLanguage]);

  const [lesson, setLesson] = useState<ResolvedLessonPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
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
  const [practiceEvaluations, setPracticeEvaluations] = useState<Record<string, PracticeEvaluationState>>({});
  const [practiceErrorByExercise, setPracticeErrorByExercise] = useState<Record<string, string>>({});
  const [collapsedPracticeItems, setCollapsedPracticeItems] = useState<Record<string, boolean>>({});
  const voiceSoundRef = useRef<AudioPlayer | null>(null);
  const bgSoundRef = useRef<AudioPlayer | null>(null);
  const snippetSoundRef = useRef<AudioPlayer | null>(null);
  const snippetSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const preloadedSnippetPlayersRef = useRef<Record<string, AudioPlayer>>({});
  const inflightSnippetPreloadsRef = useRef<Partial<Record<string, Promise<void>>>>({});
  const applyInputRef = useRef<TextInput | null>(null);
  const richPagerScrollRef = useRef<ScrollView | null>(null);
  const contentScrollRef = useRef<ScrollView | null>(null);
  const lastBgSyncRef = useRef(0);
  const lessonRef = useRef<ResolvedLessonPayload | null>(null);

  useEffect(() => {
    lessonRef.current = lesson;
  }, [lesson]);

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
    setActiveSectionIndex(0);
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
    setIsSnippetLoading(false);
    setApplyText('');
    setShowApplyResponse(false);
    setActivePhraseCardIndex(0);
    setIsFullscreen(false);
    setPracticeSelections({});
    setCheckedPracticeExercises({});
    setPracticeOpenAnswers({});
    setPracticeEvaluations({});
    setPracticeErrorByExercise({});
    setCollapsedPracticeItems({});
  }, [lessonId]);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'duckOthers',
    }).catch(() => undefined);
  }, []);

  const englishTitle = useMemo(() => {
    if (!lesson) return null;
    return lesson.title_en?.trim() || lesson.title?.trim() || lesson.title_th?.trim() || null;
  }, [lesson]);

  const thaiTitle = useMemo(() => {
    if (!lesson) return null;
    return lesson.title_th?.trim() || null;
  }, [lesson]);

  const resolvedFocus = useMemo(() => {
    if (!lesson) return null;
    return lesson.focus?.trim() || lesson.focus_th?.trim() || null;
  }, [lesson]);

  const resolvedBackstory = useMemo(() => {
    if (!lesson) return null;
    return (
      (uiLanguage === 'th'
        ? lesson.backstory_th || lesson.backstory || lesson.backstory_en
        : lesson.backstory_en || lesson.backstory || lesson.backstory_th) ?? null
    );
  }, [lesson, uiLanguage]);

  const headerImageUrl = useMemo(
    () => lesson?.header_image_url ?? resolveHeaderImageUrl(lesson?.header_image_path ?? lesson?.header_img ?? null),
    [lesson?.header_image_path, lesson?.header_image_url, lesson?.header_img]
  );
  const lessonTabs = useMemo(() => buildLessonTabs(lesson), [lesson]);
  const activeTab = lessonTabs[activeSectionIndex] ?? null;
  const activeSection = activeTab?.section ?? null;
  const normalizedQuestions = useMemo(
    () => (lesson?.questions ?? []).map((question, index) => ({
      ...normalizeQuestion(question, contentLang),
      id: String(question.id ?? `question-${index + 1}`),
      sortOrder: Number(question.sort_order ?? index + 1),
    })),
    [contentLang, lesson?.questions]
  );
  const normalizedTranscript = useMemo(
    () =>
      (lesson?.transcript ?? [])
        .map((line, index) => normalizeTranscriptLine(line, index))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [lesson?.transcript]
  );
  const normalizedApply = useMemo(
    () => normalizeApplyContent(activeTab?.type === 'apply' ? activeSection : null, contentLang),
    [activeSection, activeTab?.type, contentLang]
  );
  const normalizedLessonPhrases = useMemo(
    () =>
      (lesson?.phrases ?? [])
        .map((phrase, index) => normalizeLessonPhrase(phrase, index, contentLang))
        .filter((phrase): phrase is NormalizedLessonPhrase => phrase !== null),
    [contentLang, lesson?.phrases]
  );
  const normalizedPracticeExercises = useMemo(
    () =>
      (lesson?.practice_exercises ?? [])
        .map((exercise) => normalizePracticeExercise(exercise, contentLang))
        .filter((exercise) => exercise.kind === 'multiple_choice' || exercise.kind === 'open')
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [contentLang, lesson?.practice_exercises]
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
  const isComprehensionTab = activeTab?.type === 'comprehension';
  const isTranscriptTab = activeTab?.type === 'transcript';
  const isApplyTab = activeTab?.type === 'apply';
  const isUnderstandTab = activeTab?.type === 'understand';
  const isCommonMistakeTab = activeTab?.type === 'common_mistake';
  const isCultureNoteTab = activeTab?.type === 'culture_note';
  const isPracticeTab = activeTab?.type === 'practice';
  const isPhrasesTab = activeTab?.type === 'phrases_verbs';
  const isCompactLayout = windowWidth < 768;
  const understandNodes = useMemo(
    () => getRichNodesForLanguage(isUnderstandTab ? activeSection : null, contentLang),
    [activeSection, contentLang, isUnderstandTab]
  );
  const commonMistakeNodes = useMemo(
    () => getRichNodesForLanguage(isCommonMistakeTab ? activeSection : null, contentLang),
    [activeSection, contentLang, isCommonMistakeTab]
  );
  const cultureNoteNodes = useMemo(
    () => getRichNodesForLanguage(isCultureNoteTab ? activeSection : null, contentLang),
    [activeSection, contentLang, isCultureNoteTab]
  );
  const understandGroups = useMemo(
    () => groupRichSectionNodes(selectNodesForTableVisibility(understandNodes, isCompactLayout), contentLang),
    [contentLang, isCompactLayout, understandNodes]
  );
  const commonMistakeGroups = useMemo(
    () => groupRichSectionNodes(selectNodesForTableVisibility(commonMistakeNodes, isCompactLayout), contentLang),
    [commonMistakeNodes, contentLang, isCompactLayout]
  );
  const visibleCultureNoteNodes = useMemo(
    () => selectNodesForTableVisibility(cultureNoteNodes, isCompactLayout),
    [cultureNoteNodes, isCompactLayout]
  );
  const activePagerGroups = useMemo(
    () => (isUnderstandTab ? understandGroups : isCommonMistakeTab ? commonMistakeGroups : []),
    [commonMistakeGroups, isCommonMistakeTab, isUnderstandTab, understandGroups]
  );
  const activePracticeExercise = isPracticeTab ? normalizedPracticeExercises[activePracticeCardIndex] ?? null : null;
  const activePhraseCard = isPhrasesTab ? normalizedLessonPhrases[activePhraseCardIndex] ?? null : null;
  const sectionCount = lessonTabs.length;
  const progressRatio = sectionCount > 0 ? (activeSectionIndex + 1) / sectionCount : 0;
  const progressWidthStyle = useMemo(() => ({ width: `${progressRatio * 100}%` as const }), [progressRatio]);
  const isLastSection = activeSectionIndex >= sectionCount - 1;
  const isRichPagerTab = isUnderstandTab || isCommonMistakeTab;
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
  const richPagerPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          if (!isInnerPagerTab || activeInnerCardCount <= 1) {
            return false;
          }

          const horizontalDistance = Math.abs(gestureState.dx);
          const verticalDistance = Math.abs(gestureState.dy);
          return horizontalDistance > 10 && horizontalDistance > verticalDistance * 1.1;
        },
        onPanResponderRelease: (_, gestureState) => {
          if (!isInnerPagerTab || activeInnerCardCount <= 1) {
            return;
          }

          const horizontalDistance = gestureState.dx;
          const verticalDistance = Math.abs(gestureState.dy);
          if (Math.abs(horizontalDistance) < 24 || Math.abs(horizontalDistance) <= verticalDistance) {
            return;
          }

          if (horizontalDistance < 0 && activeInnerCardIndex < activeInnerCardCount - 1) {
            handleSetActiveInnerCardIndex(activeInnerCardIndex + 1);
            return;
          }

          if (horizontalDistance > 0 && activeInnerCardIndex > 0) {
            handleSetActiveInnerCardIndex(activeInnerCardIndex - 1);
          }
        },
      }),
    [activeInnerCardCount, activeInnerCardIndex, handleSetActiveInnerCardIndex, isInnerPagerTab]
  );
  const comprehensionButtonLabel = hasCheckedAnswers
    ? allAnswersCorrect
      ? pageCopy.greatJob
      : pageCopy.tryAgain
    : pageCopy.checkAnswers;
  const sectionCounterLabel =
    sectionCount === 0
      ? pageCopy.noSectionsYet
      : pageCopy.sectionCounter(activeSectionIndex, sectionCount);
  const sectionMenuLabel = pageCopy.sectionMenuLabel;
  const startLessonLabel = uiCopy.startLesson;
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
  const audioTrayAutoCollapseSignal = isInnerPagerTab && activeTab?.id ? `${activeTab.id}:${activeSectionIndex}` : null;
  const fullscreenToggleIcon = isFullscreen ? '⤡' : '⤢';
  const nextSectionButtonLabel =
    sectionCount === 0
      ? pageCopy.backToLessonCover
      : isLastSection
        ? pageCopy.backToLessonCover
          : pageLanguage === 'th'
            ? 'ส่วนถัดไป →'
            : 'Next section →';
  const snippetPreloadTargets = useMemo(() => {
    if (!Object.keys(snippetIndex.byKey).length && !Object.keys(snippetIndex.bySection).length) {
      if (!isPhrasesTab || !Object.keys(phraseSnippetIndex.byKey).length) {
        return [];
      }
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
    isPhrasesTab,
    isRichPagerTab,
    normalizedLessonPhrases,
    phraseSnippetIndex,
    snippetIndex,
  ]);

  useEffect(() => {
    setApplyText('');
    setShowApplyResponse(false);
  }, [activeTab?.id, contentLang, lessonId]);

  useEffect(() => {
    const validSelectionKeys = new Set<string>();
    const validExerciseIds = new Set<string>();

    normalizedPracticeExercises.forEach((exercise) => {
      validExerciseIds.add(exercise.id);
      exercise.items.forEach((item) => {
        validSelectionKeys.add(`${exercise.id}:${item.key}`);
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

  const handleCheckMultipleChoiceExercise = (exercise: NormalizedPracticeExercise) => {
    const hasUnanswered = exercise.items.some((item) => (practiceSelections[`${exercise.id}:${item.key}`] ?? []).length === 0);

    if (hasUnanswered) {
      setPracticeErrorByExercise((previous) => ({ ...previous, [exercise.id]: pageCopy.practiceAnswerAll }));
      return;
    }

    setPracticeErrorByExercise((previous) => ({ ...previous, [exercise.id]: '' }));
    setCheckedPracticeExercises((previous) => ({ ...previous, [exercise.id]: true }));
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

  const handlePracticeOpenAnswerChange = (exerciseId: string, itemKey: string, value: string) => {
    const answerKey = `${exerciseId}:${itemKey}`;

    setPracticeOpenAnswers((previous) => ({ ...previous, [answerKey]: value }));
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
    const pendingItems = exercise.items.filter((item) => !item.isExample);
    const hasUnanswered = pendingItems.some((item) => !(practiceOpenAnswers[`${exercise.id}:${item.key}`] ?? '').trim());

    if (hasUnanswered) {
      setPracticeErrorByExercise((previous) => ({ ...previous, [exercise.id]: pageCopy.practiceAnswerAll }));
      return;
    }

    setPracticeErrorByExercise((previous) => ({ ...previous, [exercise.id]: '' }));
    setPracticeEvaluations((previous) => {
      const next = { ...previous };
      pendingItems.forEach((item) => {
        next[`${exercise.id}:${item.key}`] = {
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
          const answerKey = `${exercise.id}:${item.key}`;
          try {
            const result = await evaluateLessonAnswer({
              exerciseType: 'open',
              userAnswer: practiceOpenAnswers[answerKey] ?? '',
              correctAnswer: item.answer || '',
              sourceType: 'practice',
              exerciseId: exercise.id,
              questionNumber: item.numberLabel || index + 1,
              questionPrompt: item.prompt || item.text || exercise.prompt || exercise.title,
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
    } catch {
      return;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!lesson?.id || !lesson.conversation_audio_url) {
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
  }, [lesson]);

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
      if (!lesson?.id) {
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
  }, [lesson]);

  useEffect(() => {
    return () => {
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
      const players = [voiceSoundRef.current, bgSoundRef.current].filter(Boolean) as AudioPlayer[];
      voiceSoundRef.current = null;
      bgSoundRef.current = null;
      players.forEach((player) => {
        try {
          player.remove();
        } catch {
          return;
        }
      });
    };

    const syncBackgroundPlayer = (status: AudioStatus) => {
      const bgPlayer = bgSoundRef.current;
      if (!status.playing || !bgPlayer?.isLoaded) {
        return;
      }

      const now = Date.now();
      if (now - lastBgSyncRef.current < 500) {
        return;
      }

      lastBgSyncRef.current = now;
      const drift = Math.abs(secondsToMillis(bgPlayer.currentTime) - secondsToMillis(status.currentTime));
      if (drift > 250) {
        void bgPlayer.seekTo(status.currentTime).catch(() => undefined);
      }
    };

    const loadPlayers = async () => {
      unloadCurrentPlayers();
      setIsAudioPlaying(false);
      setAudioPositionMillis(0);
      setAudioDurationMillis(0);
      setHasAudioFinished(false);
      lastBgSyncRef.current = 0;

      const voiceUrl = audioUrls.noBg || audioUrls.main;
      const bgUrl = audioUrls.noBg && audioUrls.bg ? audioUrls.bg : null;

      if (!voiceUrl) {
        setIsAudioLoading(false);
        return;
      }

      setIsAudioLoading(true);

      try {
        const voiceCandidates = Array.from(new Set([audioUrls.noBg, audioUrls.main].filter(Boolean))) as string[];
        let voiceSound: AudioPlayer | null = null;
        let usingSplitVoice = false;
        let voiceStatusSubscription: { remove: () => void } | null = null;

        for (const candidate of voiceCandidates) {
          try {
            const player = createAudioPlayer(candidate, {
              updateInterval: 500,
            });
            player.setPlaybackRate(audioRate, PITCH_CORRECTION_QUALITY);

            const subscription = player.addListener('playbackStatusUpdate', (status) => {
              if (!isActive || !status.isLoaded) {
                return;
              }

              setIsAudioLoading(false);
              setIsAudioPlaying(status.playing);
              setAudioPositionMillis(secondsToMillis(status.currentTime));
              setAudioDurationMillis(secondsToMillis(status.duration));
              setHasAudioFinished(Boolean(status.didJustFinish));
              syncBackgroundPlayer(status);
            });

            voiceSound = player;
            voiceStatusSubscription = subscription;
            usingSplitVoice = candidate === audioUrls.noBg;
            break;
          } catch {
            continue;
          }
        }

        if (!voiceSound || !voiceStatusSubscription) {
          throw new Error('Unable to load lesson audio');
        }

        let bgSound: AudioPlayer | null = null;
        if (usingSplitVoice && bgUrl) {
          try {
            bgSound = createAudioPlayer(bgUrl, {
              updateInterval: 500,
            });
            bgSound.setPlaybackRate(1);
          } catch {
            bgSound = null;
          }
        }

        if (!isActive) {
          voiceStatusSubscription.remove();
          voiceSound.remove();
          bgSound?.remove();
          return;
        }

        voiceSoundRef.current = voiceSound;
        bgSoundRef.current = bgSound;
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
  }, [audioRate, audioUrls, lessonId]);

  useEffect(() => {
    const voiceSound = voiceSoundRef.current;
    if (voiceSound?.isLoaded) {
      voiceSound.setPlaybackRate(audioRate, PITCH_CORRECTION_QUALITY);
    }
    if (bgSoundRef.current?.isLoaded) {
      bgSoundRef.current.setPlaybackRate(1);
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
    }, 150);

    return () => {
      isActive = false;
      clearTimeout(preloadTimer);
    };
  }, [snippetPreloadTargets]);

  const handleToggleSnippet = async (snippet: LessonAudioSnippet | null) => {
    const audioKey = snippet?.audio_key?.trim();
    if (!snippet || !audioKey) {
      return;
    }

    const existingPlayer = snippetSoundRef.current;
    if (existingPlayer && activeSnippetKey === audioKey && existingPlayer.isLoaded) {
      if (existingPlayer.playing) {
        existingPlayer.pause();
        setActiveSnippetKey(null);
      } else {
        existingPlayer.play();
        setActiveSnippetKey(audioKey);
      }
      return;
    }

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
        if (status.didJustFinish || !status.playing) {
          setActiveSnippetKey((current) => (current === audioKey ? null : current));
        } else {
          setActiveSnippetKey(audioKey);
        }
      });

      snippetSoundRef.current = player;
      snippetSubscriptionRef.current = subscription;
      setActiveSnippetKey(audioKey);
      player.play();
    } catch {
      unloadSnippetPlayer();
    } finally {
      setIsSnippetLoading(false);
    }
  };

  const handleToggleAudio = async () => {
    const voiceSound = voiceSoundRef.current;
    const bgSound = bgSoundRef.current;
    if (!voiceSound || isAudioLoading || !voiceSound.isLoaded) {
      return;
    }

    try {
      if (voiceSound.playing) {
        voiceSound.pause();
        bgSound?.pause();
      } else {
        const durationMillis = secondsToMillis(voiceSound.duration);
        const positionMillis = secondsToMillis(voiceSound.currentTime);
        const shouldRestart =
          hasAudioFinished || (durationMillis > 0 && positionMillis >= durationMillis - 250);
        const startPositionMillis =
          shouldRestart
            ? 0
            : positionMillis;

        if (shouldRestart) {
          await Promise.all([
            voiceSound.seekTo(0),
            bgSound?.seekTo(0).catch(() => undefined),
          ]);
          setHasAudioFinished(false);
        }
        if (bgSound?.isLoaded) {
          await bgSound.seekTo(millisToSeconds(startPositionMillis)).catch(() => undefined);
          bgSound.play();
        }
        voiceSound.play();
      }
    } catch {
      return;
    }
  };

  const handleSkipAudio = async (millisDelta: number) => {
    const voiceSound = voiceSoundRef.current;
    const bgSound = bgSoundRef.current;
    if (!voiceSound || !voiceSound.isLoaded) {
      return;
    }

    try {
      const nextPosition = Math.max(
        0,
        Math.min(secondsToMillis(voiceSound.duration), secondsToMillis(voiceSound.currentTime) + millisDelta)
      );
      await Promise.all([
        voiceSound.seekTo(millisToSeconds(nextPosition)),
        bgSound?.seekTo(millisToSeconds(nextPosition)).catch(() => undefined),
      ]);
      setHasAudioFinished(false);
    } catch {
      return;
    }
  };

  const handleSeekAudio = async (ratio: number) => {
    const voiceSound = voiceSoundRef.current;
    const bgSound = bgSoundRef.current;
    if (!voiceSound || !voiceSound.isLoaded || !voiceSound.duration) {
      return;
    }

    try {
      const nextPosition = Math.round(secondsToMillis(voiceSound.duration) * ratio);
      await Promise.all([
        voiceSound.seekTo(millisToSeconds(nextPosition)),
        bgSound?.seekTo(millisToSeconds(nextPosition)).catch(() => undefined),
      ]);
      setHasAudioFinished(false);
    } catch {
      return;
    }
  };

  const handleSetAudioRate = (nextRate: number) => {
    setAudioRate(nextRate);
  };

  const togglePracticeItemCollapsed = (key: string) => {
    setCollapsedPracticeItems((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
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
    const isPlaying = Boolean(audioKey) && activeSnippetKey === audioKey;
    const isLoading = isPlaying && isSnippetLoading;

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

    return (
      snippetIndex.byKey[normalizedKey] ??
      phraseSnippetIndex.byKey[normalizedKey] ??
      null
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
      const isPlaying = Boolean(audioKey) && activeSnippetKey === audioKey;
      const isLoading = isPlaying && isSnippetLoading;
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

  const renderPracticeExerciseBody = (exercise: NormalizedPracticeExercise) => {
    const isMultipleChoiceExercise = exercise.kind === 'multiple_choice';
    const isOpenExercise = exercise.kind === 'open';
    const isChecked = Boolean(checkedPracticeExercises[exercise.id]);
    const exerciseError = practiceErrorByExercise[exercise.id] ?? '';
    const openStates = exercise.items.map((item) => practiceEvaluations[`${exercise.id}:${item.key}`]);
    const isCheckingExercise = isOpenExercise && openStates.some((state) => state?.loading);

    return (
      <Stack gap="md">
        {exercise.prompt && exercise.title !== exercise.prompt ? (
          <AppText
            language={contentLang === 'th' ? 'th' : 'en'}
            variant="muted"
            style={styles.practiceExercisePrompt}>
            {exercise.prompt}
          </AppText>
        ) : null}

        {isMultipleChoiceExercise ? (
          <Stack gap="md">
            {exercise.items.map((item, itemIndex) => {
              const selectionKey = `${exercise.id}:${item.key}`;
              const selectedLabels = practiceSelections[selectionKey] ?? [];
              const selectedSet = new Set(selectedLabels);
              const answerSet = new Set(item.answerLetters);
              const isMulti = item.answerLetters.length > 1;

              return (
                <View key={selectionKey} style={styles.practiceQuestionCard}>
                  <View style={styles.practiceQuestionHeader}>
                    <AppText language="en" variant="caption" style={styles.practiceQuestionNumber}>
                      {item.numberLabel || `${itemIndex + 1}`}
                    </AppText>

                    <View style={styles.practiceQuestionTextWrap}>
                      {item.text ? (
                        <AppText language="en" variant="body" style={styles.practiceQuestionText}>
                          {item.text}
                        </AppText>
                      ) : null}
                      {contentLang === 'th' && item.textTh ? (
                        <AppText language="th" variant="body" style={styles.practiceQuestionThaiText}>
                          {item.textTh}
                        </AppText>
                      ) : null}
                    </View>
                  </View>

                  <Stack gap="sm">
                    {item.options.map((option) => {
                      const isSelected = selectedSet.has(option.label);
                      const isCorrectOption = answerSet.has(option.label);
                      const isWrongSelection = isChecked && isSelected && !isCorrectOption;

                      return (
                        <Pressable
                          key={`${selectionKey}:${option.label}`}
                          accessibilityRole="button"
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
                            {option.text ? (
                              <AppText language="en" variant="body" style={styles.practiceOptionText}>
                                {option.text}
                              </AppText>
                            ) : null}
                            {contentLang === 'th' && option.textTh ? (
                              <AppText language="th" variant="body" style={styles.practiceOptionThaiText}>
                                {option.textTh}
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
                        <AppText language={pageLanguage} variant="body" style={styles.practiceFeedbackHeadline}>
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
        ) : isOpenExercise ? (
          <Stack gap="md">
            {exercise.items.map((item, itemIndex) => {
              const answerKey = `${exercise.id}:${item.key}`;
              const evaluation = practiceEvaluations[answerKey];
              const answerValue = practiceOpenAnswers[answerKey] ?? (item.isExample ? item.answer : '');
              const itemImageUrl = resolveLessonImageUrl(
                item.imageKey ? lesson?.images?.[item.imageKey] : null,
                item.imageKey
              );
              const itemAltText =
                contentLang === 'th' ? item.altTextTh || item.altText || 'Practice prompt image' : item.altText || item.altTextTh || 'Practice prompt image';

              return (
                item.isExample ? (
                  <View key={answerKey} style={styles.practiceExampleCard}>
                    <View style={styles.practiceExampleHeader}>
                      <AppText language="en" variant="caption" style={styles.practiceExampleLabel}>
                        EXAMPLE
                      </AppText>
                    </View>

                    <View style={styles.practiceExampleBody}>
                      {itemImageUrl ? (
                        <View style={styles.practiceExampleImageShell}>
                          <Image
                            source={{ uri: itemImageUrl }}
                            accessibilityLabel={itemAltText}
                            contentFit="contain"
                            style={styles.practicePromptImage}
                          />
                        </View>
                      ) : null}

                      <View style={styles.practiceExampleContent}>
                        {item.prompt || item.text ? (
                          <AppText language="en" variant="body" style={styles.practiceQuestionText}>
                            {item.prompt || item.text}
                          </AppText>
                        ) : null}
                        {contentLang === 'th' && (item.promptTh || item.textTh) ? (
                          <AppText language="th" variant="body" style={styles.practiceQuestionThaiText}>
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
                        {item.prompt || item.text ? (
                          <AppText language="en" variant="body" style={styles.practiceQuestionText}>
                            {item.prompt || item.text}
                          </AppText>
                        ) : null}
                        {contentLang === 'th' && (item.promptTh || item.textTh) ? (
                          <AppText language="th" variant="body" style={styles.practiceQuestionThaiText}>
                            {item.promptTh || item.textTh}
                          </AppText>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.practiceOpenRow}>
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

                      <View style={styles.practiceOpenInputWrap}>
                        <TextInput
                          multiline
                          numberOfLines={3}
                          placeholder={item.placeholder || pageCopy.practiceOpenPlaceholder}
                          placeholderTextColor="#9C9EA4"
                          style={[
                            styles.practiceOpenInput,
                            item.isExample ? styles.practiceOpenInputDisabled : null,
                          ]}
                          value={answerValue}
                          onChangeText={(value) => handlePracticeOpenAnswerChange(exercise.id, item.key, value)}
                          editable={!item.isExample && !evaluation?.loading}
                          textAlignVertical="top"
                        />
                      </View>
                    </View>

                    {evaluation ? (
                      <View style={styles.practiceFeedbackBox}>
                        <View style={styles.practiceFeedbackRow}>
                          <View
                            style={[
                              styles.feedbackDot,
                              evaluation.correct ? styles.feedbackDotSuccess : styles.practiceFeedbackDotWarning,
                            ]}
                          />
                          <AppText language={pageLanguage} variant="body" style={styles.practiceFeedbackHeadline}>
                            {evaluation.correct ? pageCopy.practiceCorrect : pageCopy.practiceNeedsWork}
                          </AppText>
                        </View>

                        {(contentLang === 'th' ? evaluation.feedbackTh || evaluation.feedbackEn : evaluation.feedbackEn || evaluation.feedbackTh) ? (
                          <AppText
                            language={contentLang === 'th' ? 'th' : 'en'}
                            variant="muted"
                            style={styles.practiceFeedbackBody}>
                            {contentLang === 'th'
                              ? evaluation.feedbackTh || evaluation.feedbackEn
                              : evaluation.feedbackEn || evaluation.feedbackTh}
                          </AppText>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                )
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
          </Stack>
        ) : null}
      </Stack>
    );
  };

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

      {isLoading && !lesson ? (
        <PageLoadingState language={uiLanguage} />
      ) : null}

      {!lesson && !isLoading && errorMessage ? (
        <PageLoadingState
          language={uiLanguage}
          errorTitle={uiCopy.loadingErrorTitle}
          errorBody={errorMessage || uiCopy.loadingErrorBody}
        />
      ) : null}

      {lesson ? (
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
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={backToLibraryLabel}
                        onPress={() => router.push('/lessons')}
                        style={styles.backButton}>
                        <AppText language={uiLanguage} variant="body" style={styles.backButtonText}>
                          ←
                        </AppText>
                      </Pressable>

                      <View style={styles.heroMetaGroup}>
                        <AppText language={uiLanguage} variant="caption" style={styles.metaText}>
                          {uiCopy.lessonLabel} {lesson.lesson_order ?? '-'}
                        </AppText>
                        <AppText language={uiLanguage} variant="caption" style={styles.stagePill}>
                          {sectionCount} {uiCopy.lessonSections}
                        </AppText>
                      </View>
                    </View>
                  </View>

                  <View style={styles.coverBottomPanel}>
                    <Stack gap="sm">
                      {lesson.stage ? (
                        <AppText language={uiLanguage} variant="caption" style={styles.coverStageLabel}>
                          {lesson.stage}
                        </AppText>
                      ) : null}

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

                    <Button
                      language={uiLanguage}
                      title={startLessonLabel}
                      onPress={() => setHasStartedLesson(true)}
                      style={styles.coverStartButton}
                    />
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <View style={[styles.stepperScreen, { paddingTop: insets.top + 8 }]}>
              {!isFullscreen ? (
                <>
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
                      {sectionCounterLabel}
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
                </>
              ) : null}

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

                  {isComprehensionTab ? (
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
                                  option.imageKey ? lesson.images?.[option.imageKey] : null,
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
                  ) : isPracticeTab || isUnderstandTab || isCommonMistakeTab || isPhrasesTab ? (
                    (isPracticeTab ? activePracticeExercise : isPhrasesTab ? activePhraseCard : activePagerGroup) ? (
                      <View style={styles.richPagerShell}>
                        <View
                          {...(hasMultiplePagerCards ? richPagerPanResponder.panHandlers : {})}
                          style={[styles.richPagerCard, windowHeight < 780 ? styles.richPagerCardCompact : null]}>
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
                                  : activePagerGroup
                                    ? renderCommonMistakeGroupBody(activePagerGroup.body, activePagerGroup.key)
                                    : null}
                            </ScrollView>
                          </View>
                        </View>

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
                                getLessonSectionLabel(pageLanguage, isUnderstandTab ? 'understand' : 'common_mistake')
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
                      audioUrl={audioUrls.noBg || audioUrls.main}
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
                    <Pressable
                      accessibilityRole="button"
                      disabled={(!activeTab && sectionCount === 0) || isPrimaryActionDisabled}
                      onPress={() => {
                        if (sectionCount === 0 || isLastSection) {
                          setHasStartedLesson(false);
                        } else {
                          setActiveSectionIndex((prev) => Math.min(prev + 1, sectionCount - 1));
                        }
                      }}
                      style={({ pressed }) => [
                        styles.ctaButton,
                        styles.ctaNextButton,
                        styles.ctaNextButtonFull,
                        ((!activeTab && sectionCount === 0) || isPrimaryActionDisabled) ? styles.ctaButtonDisabled : null,
                        pressed && !((!activeTab && sectionCount === 0) || isPrimaryActionDisabled)
                          ? styles.ctaButtonPressed
                          : null,
                      ]}>
                      <AppText language={pageLanguage} variant="caption" style={styles.ctaNextButtonText}>
                        {nextSectionButtonLabel}
                      </AppText>
                    </Pressable>
                  </View>
                </View>
              </View>
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
                <AppText language={pageLanguage} variant="body" style={styles.menuTitle}>
                  {sectionMenuLabel}
                </AppText>
                <Pressable accessibilityRole="button" onPress={() => setIsMenuOpen(false)} style={styles.menuCloseButton}>
                  <AppText language={pageLanguage} variant="body" style={styles.menuCloseButtonText}>
                    ×
                  </AppText>
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
    top: 14,
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
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  coverTopMetaRow: {
    alignItems: 'flex-start',
  },
  coverTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  heroMetaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  metaText: {
    color: theme.colors.surface,
    fontWeight: theme.typography.weights.semibold,
    textTransform: 'uppercase',
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
  backButtonText: {
    color: theme.colors.surface,
    fontSize: 24,
    lineHeight: 24,
    fontWeight: theme.typography.weights.semibold,
  },
  coverBottomPanel: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  coverStageLabel: {
    color: theme.colors.primary,
    textTransform: 'uppercase',
    fontWeight: theme.typography.weights.semibold,
  },
  coverTitle: {
    color: theme.colors.text,
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
  coverStartButton: {
    minHeight: 56,
  },
  stepperScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studyMenuButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 14,
    fontWeight: theme.typography.weights.semibold,
  },
  studyCounterText: {
    flex: 1,
    textAlign: 'center',
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 14,
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
    minWidth: 36,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  translatePillDisabled: {
    opacity: 0.7,
  },
  translatePillText: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 14,
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
    lineHeight: theme.typography.lineHeights.lg,
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
  practiceExampleContent: {
    flexBasis: 240,
    flexGrow: 1,
    gap: theme.spacing.sm,
  },
  practiceQuestionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.spacing.xs,
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
  practiceQuestionTextWrap: {
    flex: 1,
    gap: 2,
  },
  practiceQuestionText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.medium,
  },
  practiceQuestionThaiText: {
    color: theme.colors.mutedText,
  },
  practiceOpenRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    flexWrap: 'wrap',
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
  practicePromptImage: {
    width: '100%',
    height: 148,
  },
  practiceOpenInputWrap: {
    flex: 1,
    minWidth: 210,
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
  practiceOptionText: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.sm,
    lineHeight: theme.typography.lineHeights.sm,
  },
  practiceOptionThaiText: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.sizes.sm,
    lineHeight: theme.typography.lineHeights.sm,
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
  practiceFeedbackBody: {
    color: theme.colors.mutedText,
  },
  practiceFeedbackDotWarning: {
    backgroundColor: theme.colors.warningSurface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  practiceOpenInput: {
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
  ctaRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingTop: 5,
    paddingBottom: 8,
    backgroundColor: theme.colors.background,
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
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  menuTitle: {
    fontWeight: theme.typography.weights.semibold,
  },
  menuCloseButton: {
    width: 36,
    height: 36,
    borderRadius: theme.radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  menuCloseButtonText: {
    fontSize: theme.typography.sizes.lg,
    lineHeight: theme.typography.lineHeights.md,
    fontWeight: theme.typography.weights.semibold,
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
