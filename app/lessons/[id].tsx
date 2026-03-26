import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Stack as RouterStack, useLocalSearchParams, useRouter } from 'expo-router';
import { AudioPlayer, AudioStatus, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchLessonAudioUrls, fetchResolvedLesson, prefetchResolvedLesson } from '@/src/api/lessons';
import { LessonAudioTray } from '@/src/components/lesson/LessonAudioTray';
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
  LessonRichInline,
  LessonRichNode,
  LessonQuestionOption,
  ResolvedLessonPayload,
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

const resolveLessonImageUrl = (value: unknown) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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
  const { height: windowHeight } = useWindowDimensions();
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
  const [applyText, setApplyText] = useState('');
  const [showApplyResponse, setShowApplyResponse] = useState(false);
  const [activeUnderstandGroupIndex, setActiveUnderstandGroupIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const voiceSoundRef = useRef<AudioPlayer | null>(null);
  const bgSoundRef = useRef<AudioPlayer | null>(null);
  const applyInputRef = useRef<TextInput | null>(null);
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
    setApplyText('');
    setShowApplyResponse(false);
    setIsFullscreen(false);
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
  const allAnswersCorrect =
    normalizedQuestions.length > 0 &&
    normalizedQuestions.every((question) => {
      const currentSelections = selectedAnswers[question.id] ?? [];
      if (!currentSelections.length || currentSelections.length !== question.answerKey.length) {
        return false;
      }

      const answerSet = new Set(question.answerKey);
      return currentSelections.every((choice) => answerSet.has(choice));
    });
  const isComprehensionTab = activeTab?.type === 'comprehension';
  const isTranscriptTab = activeTab?.type === 'transcript';
  const isApplyTab = activeTab?.type === 'apply';
  const isUnderstandTab = activeTab?.type === 'understand';
  const understandNodes = useMemo(
    () => getRichNodesForLanguage(isUnderstandTab ? activeSection : null, contentLang),
    [activeSection, contentLang, isUnderstandTab]
  );
  const understandGroups = useMemo(
    () => groupRichSectionNodes(understandNodes, contentLang),
    [contentLang, understandNodes]
  );
  const sectionCount = lessonTabs.length;
  const progressRatio = sectionCount > 0 ? (activeSectionIndex + 1) / sectionCount : 0;
  const progressWidthStyle = useMemo(() => ({ width: `${progressRatio * 100}%` as const }), [progressRatio]);
  const isLastSection = activeSectionIndex >= sectionCount - 1;
  const hasMultipleUnderstandCards = isUnderstandTab && understandGroups.length > 1;
  const isLastUnderstandCard =
    !isUnderstandTab || understandGroups.length === 0 || activeUnderstandGroupIndex >= understandGroups.length - 1;
  const isPrimaryActionDisabled = isUnderstandTab && !isLastUnderstandCard;
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
  const fullscreenToggleIcon = isFullscreen ? '⤡' : '⤢';
  const nextSectionButtonLabel =
    sectionCount === 0
      ? pageCopy.backToLessonCover
      : isLastSection
        ? pageCopy.backToLessonCover
        : pageLanguage === 'th'
          ? 'ส่วนถัดไป →'
          : 'Next section →';

  useEffect(() => {
    setApplyText('');
    setShowApplyResponse(false);
  }, [activeTab?.id, contentLang, lessonId]);

  useEffect(() => {
    setActiveUnderstandGroupIndex(0);
  }, [activeTab?.id, contentLang, isUnderstandTab, understandGroups]);

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

  const renderRichInlines = (inlines: LessonRichInline[] | null | undefined, keyPrefix: string) => {
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
      const shouldShowHighlight = UNDERSTAND_HIGHLIGHTS.has(highlightColor);
      const textNode = (
        <Text
          key={`${keyPrefix}-${index}`}
          style={[
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
          ]}>
          {textValue}
        </Text>
      );

      if (typeof inline.link === 'string' && inline.link.trim()) {
        return (
          <Text
            key={`${keyPrefix}-${index}`}
            onPress={() => handleOpenRichLink(inline.link as string)}
            style={styles.richInlineLink}>
            {textNode}
          </Text>
        );
      }

      return textNode;
    });
  };

  const renderUnderstandNode = (node: LessonRichNode, index: number) => {
    const nodeKey = `understand-node-${index}`;
    const indentStyle = getRichIndentStyle(node);
    const hasAccent = applyNodeHasAccent(node);

    if (node.kind === 'spacer') {
      return <View key={nodeKey} style={styles.richSpacer} />;
    }

    if (node.kind === 'image') {
      const imageSource =
        resolveLessonImageUrl(node.image_url) ??
        resolveLessonImageUrl(
          typeof node.image_key === 'string' && lesson?.images && node.image_key in lesson.images
            ? lesson.images[node.image_key]
            : null
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
      const rows = Array.isArray(node.cells) ? node.cells : [];
      if (!rows.length) {
        return null;
      }

      return (
        <View key={nodeKey} style={styles.richTableWrap}>
          {rows.map((row, rowIndex) => (
            <View key={`${nodeKey}-row-${rowIndex}`} style={styles.richTableRow}>
              {(Array.isArray(row) ? row : []).map((cell, cellIndex) => {
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

                return (
                  <View
                    key={`${nodeKey}-cell-${rowIndex}-${cellIndex}`}
                    style={[
                      styles.richTableCell,
                      cellBackground === '#f4cccc' ? styles.richTableCellPink : null,
                      cellBackground === '#d9ead3' ? styles.richTableCellGreen : null,
                      cellBackground === '#c9daf7' || cellBackground === '#c9daf8'
                        ? styles.richTableCellBlue
                        : null,
                    ]}>
                    <AppText language={contentLang} variant="body" style={styles.richTableCellText}>
                      {cleanAudioTags(cellText)}
                    </AppText>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      );
    }

    if (node.kind === 'numbered_item') {
      return (
        <View key={nodeKey} style={[styles.richListRow, indentStyle]}>
          <View style={styles.richNumberBadge}>
            <AppText language="en" variant="caption" style={styles.richNumberBadgeText}>
              {String(node.number ?? index + 1)}
            </AppText>
          </View>
          <AppText language={contentLang} variant="body" style={[styles.richListText, hasAccent ? styles.applyAccentBlock : null]}>
            {renderRichInlines(node.inlines, nodeKey)}
          </AppText>
        </View>
      );
    }

    if (node.kind === 'list_item' || node.kind === 'misc_item') {
      return (
        <View key={nodeKey} style={[styles.richListRow, indentStyle]}>
          <View style={styles.richBullet} />
          <AppText language={contentLang} variant="body" style={[styles.richListText, hasAccent ? styles.applyAccentBlock : null]}>
            {renderRichInlines(node.inlines, nodeKey)}
          </AppText>
        </View>
      );
    }

    if (node.kind === 'paragraph') {
      const isSubheader = isBoldParagraphNode(node);
      return (
        <AppText
          key={nodeKey}
          language={contentLang}
          variant="body"
          style={[
            styles.richParagraph,
            indentStyle,
            isSubheader ? styles.richSubheader : null,
            hasAccent ? styles.applyAccentBlock : null,
          ]}>
          {renderRichInlines(node.inlines, nodeKey)}
        </AppText>
      );
    }

    return null;
  };

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

    return zebraGroups.map((group, index) => (
      <View
        key={`${keyPrefix}-group-${index}`}
        style={[styles.richGroupBand, index % 2 === 0 ? styles.richGroupBandEven : styles.richGroupBandOdd]}>
        {group.map((node, nodeIndex) => renderUnderstandNode(node, nodeIndex))}
      </View>
    ));
  };

  const activeUnderstandGroup = isUnderstandTab ? understandGroups[activeUnderstandGroupIndex] ?? null : null;
  const activeUnderstandHeading = activeUnderstandGroup?.heading
    ? getNodeHeadingText(activeUnderstandGroup.heading, contentLang)
    : '';

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
                                  option.imageKey ? lesson.images?.[option.imageKey] : null
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
                  ) : isUnderstandTab ? (
                    activeUnderstandGroup ? (
                      <View style={styles.richPagerShell}>
                        <View style={[styles.richPagerCard, windowHeight < 780 ? styles.richPagerCardCompact : null]}>
                          <View style={styles.richPagerMetaRow}>
                            {activeUnderstandHeading ? (
                              <AppText language={contentLang} variant="body" style={styles.richPagerHeadingLabel}>
                                {activeUnderstandHeading}
                              </AppText>
                            ) : null}

                            <View style={styles.richPagerCounterPill}>
                              <AppText language="en" variant="caption" style={styles.richPagerCounterText}>
                                {`${Math.min(activeUnderstandGroupIndex + 1, understandGroups.length)} of ${understandGroups.length}`}
                              </AppText>
                            </View>
                          </View>

                          <View style={styles.richPagerBody}>
                            <ScrollView
                              nestedScrollEnabled
                              showsVerticalScrollIndicator={false}
                              style={styles.richPagerScrollView}
                              contentContainerStyle={styles.richPagerScrollContent}>
                              {renderUnderstandGroupBody(activeUnderstandGroup.body, activeUnderstandGroup.key)}
                            </ScrollView>
                          </View>
                        </View>

                        {hasMultipleUnderstandCards ? (
                          <View style={styles.richPagerControls}>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={pageLanguage === 'th' ? 'การ์ดก่อนหน้า' : 'Previous card'}
                              accessibilityState={{ disabled: activeUnderstandGroupIndex === 0 }}
                              disabled={activeUnderstandGroupIndex === 0}
                              onPress={() => setActiveUnderstandGroupIndex((previous) => Math.max(0, previous - 1))}
                              style={[
                                styles.richPagerArrowButton,
                                activeUnderstandGroupIndex === 0 ? styles.richPagerArrowButtonDisabled : null,
                              ]}>
                              <AppText language="en" variant="body" style={styles.richPagerArrowText}>
                                ←
                              </AppText>
                            </Pressable>

                            <View style={styles.richPagerDots}>
                              {understandGroups.map((group, index) => (
                                <View
                                  key={group.key}
                                  style={[
                                    styles.richPagerDot,
                                    index === activeUnderstandGroupIndex ? styles.richPagerDotActive : null,
                                  ]}
                                />
                              ))}
                            </View>

                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={pageLanguage === 'th' ? 'การ์ดถัดไป' : 'Next card'}
                              accessibilityState={{ disabled: activeUnderstandGroupIndex >= understandGroups.length - 1 }}
                              disabled={activeUnderstandGroupIndex >= understandGroups.length - 1}
                              onPress={() =>
                                setActiveUnderstandGroupIndex((previous) =>
                                  Math.min(previous + 1, understandGroups.length - 1)
                                )
                              }
                              style={[
                                styles.richPagerArrowButton,
                                activeUnderstandGroupIndex >= understandGroups.length - 1
                                  ? styles.richPagerArrowButtonDisabled
                                  : null,
                              ]}>
                              <AppText language="en" variant="body" style={styles.richPagerArrowText}>
                                →
                              </AppText>
                            </Pressable>
                          </View>
                        ) : null}

                        {!isLastUnderstandCard ? (
                          <AppText language={pageLanguage} variant="muted" style={styles.richPagerHelperText}>
                            {pageLanguage === 'th'
                              ? 'ดูการ์ดทั้งหมดใน section นี้ให้ครบก่อน แล้วค่อยไป section ถัดไป'
                              : 'Browse all cards in this section before moving to the next lesson section.'}
                          </AppText>
                        ) : null}
                      </View>
                    ) : (
                      <View style={styles.placeholderBox}>
                        <Stack gap="xs">
                          <AppText language={pageLanguage} variant="caption" style={styles.placeholderEyebrow}>
                            {pageCopy.rendererNext}
                          </AppText>
                          <AppText language={pageLanguage} variant="body" style={styles.placeholderTitle}>
                            {pageCopy.rendererReady(getLessonSectionLabel(pageLanguage, 'understand'))}
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
                    {isComprehensionTab && !hasCheckedAnswers ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setHasCheckedAnswers(true)}
                        style={({ pressed }) => [
                          styles.ctaButton,
                          styles.ctaCheckButton,
                          pressed ? styles.ctaButtonPressed : null,
                        ]}>
                        <AppText language={pageLanguage} variant="caption" style={styles.ctaCheckButtonText}>
                          {pageLanguage === 'th' ? 'ตรวจคำตอบ' : 'Check answer'}
                        </AppText>
                      </Pressable>
                    ) : null}

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
                        !isComprehensionTab || hasCheckedAnswers ? styles.ctaNextButtonFull : null,
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
    backgroundColor: theme.colors.primary,
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
    fontSize: theme.typography.sizes.xl,
    lineHeight: theme.typography.lineHeights.xl,
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
  richListRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
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
    paddingVertical: theme.spacing.sm,
  },
  richImage: {
    width: '100%',
    maxWidth: 550,
    height: 220,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.background,
  },
  richTableWrap: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    overflow: 'hidden',
  },
  richTableRow: {
    flexDirection: 'row',
  },
  richTableCell: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  richTableCellText: {
    fontSize: theme.typography.sizes.sm,
    lineHeight: theme.typography.lineHeights.sm,
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
  applyResponseWrap: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.md,
  },
  applyResponseNote: {
    color: theme.colors.mutedText,
    fontStyle: 'italic',
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
