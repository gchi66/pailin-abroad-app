import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Stack as RouterStack, useLocalSearchParams, useRouter } from 'expo-router';
import { AudioPlayer, AudioStatus, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Image } from 'expo-image';

import { fetchLessonAudioUrls, fetchResolvedLesson } from '@/src/api/lessons';
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
  LessonQuestionOption,
  ResolvedLessonPayload,
  ResolvedLessonQuestion,
  ResolvedLessonSection,
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
const AUDIO_DEBUG = __DEV__;
const PITCH_CORRECTION_QUALITY = 'medium';

const logAudioDebug = (message: string, details?: Record<string, unknown>) => {
  if (!AUDIO_DEBUG) {
    return;
  }

  if (details) {
    console.log(`[LessonAudio] ${message}`, details);
    return;
  }

  console.log(`[LessonAudio] ${message}`);
};

const logAudioError = (message: string, details?: Record<string, unknown>) => {
  if (!AUDIO_DEBUG) {
    return;
  }

  if (details) {
    console.warn(`[LessonAudio] ${message}`, details);
    return;
  }

  console.warn(`[LessonAudio] ${message}`);
};

export default function LessonDetailShellScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const lessonId = typeof params.id === 'string' ? params.id : '';
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();
  const { height: windowHeight } = useWindowDimensions();
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
  const voiceSoundRef = useRef<AudioPlayer | null>(null);
  const bgSoundRef = useRef<AudioPlayer | null>(null);
  const lastBgSyncRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!lessonId) {
        setErrorMessage(uiCopy.missingLessonId);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const row = await fetchResolvedLesson(lessonId, contentLang);
        if (!isMounted) {
          return;
        }
        setLesson(row);
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
  const sectionCount = lessonTabs.length;
  const progressRatio = sectionCount > 0 ? (activeSectionIndex + 1) / sectionCount : 0;
  const progressWidthStyle = useMemo(() => ({ width: `${progressRatio * 100}%` as const }), [progressRatio]);
  const isLastSection = activeSectionIndex >= sectionCount - 1;
  const primaryActionLabel =
    sectionCount === 0
      ? pageCopy.backToLessonCover
      : isLastSection
        ? pageCopy.backToLessonCover
        : pageCopy.nextSection;
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
  const comprehensionButtonLabel = hasCheckedAnswers
    ? allAnswersCorrect
      ? pageCopy.greatJob
      : pageCopy.tryAgain
    : pageCopy.checkAnswers;
  const isComprehensionTab = activeTab?.type === 'comprehension';
  const contentToggleLabel = contentLang === 'th' ? translateToEnglishLabel : translateToThaiLabel;
  const contentToggleText = contentLang === 'th' ? pageCopy.showEnglish : pageCopy.showThai;
  const audioTrayTitle = resolvedFocus || englishTitle || thaiTitle || activeSectionTitle || 'Lesson audio';
  const audioTraySubtitle = activeSectionTitle || thaiTitle || englishTitle || null;
  const shouldShowAudioTray = hasStartedLesson && !isLoading && !errorMessage && Boolean(lesson);
  const audioTrayStatusLabel = isAudioLoading
    ? pageCopy.audioTrayLoading
    : isAudioPlaying
      ? pageCopy.audioTrayPlaying
      : pageCopy.audioTrayStatus;

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
        logAudioDebug('Resolved lesson audio URLs', {
          lessonId: lesson.id,
          conversationAudioPath: lesson.conversation_audio_url,
          urls,
        });
        setAudioUrls(urls);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        logAudioError('Failed to resolve lesson audio URLs', {
          lessonId: lesson.id,
          conversationAudioPath: lesson.conversation_audio_url,
          error: error instanceof Error ? error.message : String(error),
        });
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
        logAudioError('No voice URL available for lesson audio', {
          lessonId,
          audioUrls,
        });
        setIsAudioLoading(false);
        return;
      }

      setIsAudioLoading(true);

      try {
        const voiceCandidates = Array.from(new Set([audioUrls.noBg, audioUrls.main].filter(Boolean))) as string[];
        logAudioDebug('Attempting to load lesson audio candidates', {
          lessonId,
          voiceCandidates,
          bgUrl,
          audioRate,
        });
        let voiceSound: AudioPlayer | null = null;
        let usingSplitVoice = false;
        let voiceStatusSubscription: { remove: () => void } | null = null;

        for (const candidate of voiceCandidates) {
          try {
            logAudioDebug('Creating voice player', {
              lessonId,
              candidate,
            });
            const player = createAudioPlayer(candidate, {
              updateInterval: 500,
            });
            player.setPlaybackRate(audioRate, PITCH_CORRECTION_QUALITY);

            const subscription = player.addListener('playbackStatusUpdate', (status) => {
              if (!isActive || !status.isLoaded) {
                if (AUDIO_DEBUG && !status.isLoaded) {
                  logAudioDebug('Voice status update before load', {
                    lessonId,
                    candidate,
                    playbackState: status.playbackState,
                    timeControlStatus: status.timeControlStatus,
                    reasonForWaitingToPlay: status.reasonForWaitingToPlay,
                    isBuffering: status.isBuffering,
                  });
                }
                return;
              }

              setIsAudioLoading(false);
              setIsAudioPlaying(status.playing);
              setAudioPositionMillis(secondsToMillis(status.currentTime));
              setAudioDurationMillis(secondsToMillis(status.duration));
              setHasAudioFinished(Boolean(status.didJustFinish));
              if (AUDIO_DEBUG && (status.didJustFinish || status.isBuffering || status.currentTime === 0)) {
                logAudioDebug('Voice status update', {
                  lessonId,
                  candidate,
                  currentTime: status.currentTime,
                  duration: status.duration,
                  playing: status.playing,
                  playbackState: status.playbackState,
                  timeControlStatus: status.timeControlStatus,
                  reasonForWaitingToPlay: status.reasonForWaitingToPlay,
                  isBuffering: status.isBuffering,
                  didJustFinish: status.didJustFinish,
                });
              }
              syncBackgroundPlayer(status);
            });

            voiceSound = player;
            voiceStatusSubscription = subscription;
            usingSplitVoice = candidate === audioUrls.noBg;
            logAudioDebug('Voice player created', {
              lessonId,
              candidate,
              usingSplitVoice,
            });
            break;
          } catch (error) {
            logAudioError('Failed to create voice player', {
              lessonId,
              candidate,
              error: error instanceof Error ? error.message : String(error),
            });
            continue;
          }
        }

        if (!voiceSound || !voiceStatusSubscription) {
          throw new Error('Unable to load lesson audio');
        }

        let bgSound: AudioPlayer | null = null;
        if (usingSplitVoice && bgUrl) {
          try {
            logAudioDebug('Creating background player', {
              lessonId,
              bgUrl,
            });
            bgSound = createAudioPlayer(bgUrl, {
              updateInterval: 500,
            });
            bgSound.setPlaybackRate(1);
            logAudioDebug('Background player created', {
              lessonId,
              bgUrl,
            });
          } catch (error) {
            logAudioError('Failed to create background player', {
              lessonId,
              bgUrl,
              error: error instanceof Error ? error.message : String(error),
            });
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
      } catch (error) {
        if (isActive) {
          logAudioError('Lesson audio load failed', {
            lessonId,
            audioUrls,
            error: error instanceof Error ? error.message : String(error),
          });
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
      logAudioError('Play toggle ignored', {
        lessonId,
        hasVoiceSound: Boolean(voiceSound),
        isAudioLoading,
        voiceLoaded: voiceSound?.isLoaded ?? false,
      });
      return;
    }

    try {
      logAudioDebug('Toggling lesson audio', {
        lessonId,
        isPlaying: voiceSound.playing,
        currentTime: voiceSound.currentTime,
        duration: voiceSound.duration,
        hasAudioFinished,
        hasBgSound: Boolean(bgSound),
      });
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
        logAudioDebug('Issued play command to lesson audio', {
          lessonId,
          startPositionMillis,
          voiceLoaded: voiceSound.isLoaded,
          bgLoaded: bgSound?.isLoaded ?? false,
        });
      }
    } catch (error) {
      logAudioError('Play toggle failed', {
        lessonId,
        error: error instanceof Error ? error.message : String(error),
      });
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

  return (
    <View style={styles.screen}>
      <RouterStack.Screen options={{ headerShown: false }} />

      {isLoading ? (
        <PageLoadingState language={uiLanguage} />
      ) : null}

      {!isLoading && errorMessage ? (
        <PageLoadingState
          language={uiLanguage}
          errorTitle={uiCopy.loadingErrorTitle}
          errorBody={errorMessage || uiCopy.loadingErrorBody}
        />
      ) : null}

      {!isLoading && !errorMessage && lesson ? (
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
            <View style={styles.stepperScreen}>
              <ScrollView
                contentContainerStyle={styles.stepperScrollContent}
                showsVerticalScrollIndicator={false}
                style={styles.stepperScrollView}>
                <View style={styles.stepperInner}>
                <View style={styles.stepperTopBar}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setIsMenuOpen(true)}
                    style={styles.stepperMenuButton}>
                    <AppText language={pageLanguage} variant="body" style={styles.menuButtonText}>
                      ≡
                    </AppText>
                  </Pressable>

                  <View style={styles.stepperProgressBlock}>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, progressWidthStyle]} />
                    </View>
                    <View style={styles.progressRow}>
                      <AppText language={pageLanguage} variant="caption" style={styles.progressLabel}>
                        {sectionCounterLabel}
                      </AppText>
                      <AppText language={pageLanguage} variant="caption" style={styles.progressLabel}>
                        {activeSectionTypeLabel ?? sectionMenuLabel}
                      </AppText>
                    </View>
                  </View>
                </View>

                <Card padding="lg" radius="lg" style={styles.sectionCard}>
                  {isComprehensionTab ? (
                    <Stack gap="lg">
                      <View style={styles.comprehensionHeader}>
                        <AppText language={pageLanguage} variant="title" style={styles.comprehensionHeaderTitle}>
                          {activeSectionTitle ?? getLessonSectionLabel(pageLanguage, 'comprehension')}
                        </AppText>

                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={contentToggleLabel}
                          onPress={() => setContentLang((previous) => (previous === 'en' ? 'th' : 'en'))}
                          style={styles.contentToggleButton}>
                          <AppText language={pageLanguage} variant="caption" style={styles.contentToggleButtonText}>
                            {contentToggleText}
                          </AppText>
                        </Pressable>
                      </View>

                      <Stack gap="lg">
                        {normalizedQuestions.map((question, index) => {
                          const questionNumber = question.sortOrder || index + 1;
                          const isMulti = question.answerKey.length > 1;
                          const currentSelections = selectedAnswers[question.id] ?? [];
                          const answerSet = new Set(question.answerKey);

                          return (
                            <View key={question.id} style={styles.questionBlock}>
                              <View style={styles.questionPromptWrap}>
                                <AppText language="en" variant="body" style={styles.questionPromptText}>
                                  {`${questionNumber} `}
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
                                  const shouldShowResult = hasCheckedAnswers && isSelected;
                                  const isCorrectOption = answerSet.has(option.label);
                                  const optionImageUrl = resolveLessonImageUrl(
                                    option.imageKey ? lesson.images?.[option.imageKey] : null
                                  );

                                  return (
                                    <View key={optionKey} style={styles.optionRow}>
                                      <Pressable
                                        accessibilityRole="button"
                                        accessibilityLabel={`${option.label} ${option.text || option.textTh}`}
                                        accessibilityState={{ selected: isSelected }}
                                        onPress={() => handleToggleAnswer(question.id, option.label, isMulti)}
                                        style={[
                                          styles.optionLetterButton,
                                          isSelected ? styles.optionLetterButtonSelected : null,
                                        ]}>
                                        <AppText language="en" variant="body" style={styles.optionLetterText}>
                                          {option.label}
                                        </AppText>
                                      </Pressable>

                                      <View style={styles.optionBody}>
                                        {optionImageUrl ? (
                                          <Image
                                            source={{ uri: optionImageUrl }}
                                            contentFit="cover"
                                            style={styles.optionImage}
                                          />
                                        ) : null}

                                        <View style={styles.optionTextWrap}>
                                          {option.text ? (
                                            <AppText language="en" variant="body" style={styles.optionText}>
                                              {option.text}
                                            </AppText>
                                          ) : null}
                                          {contentLang === 'th' && option.textTh ? (
                                            <AppText language="th" variant="body" style={styles.optionTextThai}>
                                              {option.textTh}
                                            </AppText>
                                          ) : null}
                                        </View>

                                        {shouldShowResult ? (
                                          <View
                                            style={[
                                              styles.optionResultBadge,
                                              isCorrectOption ? styles.optionResultBadgeCorrect : styles.optionResultBadgeIncorrect,
                                            ]}>
                                            <Text style={styles.optionResultBadgeText}>{isCorrectOption ? '✓' : '✗'}</Text>
                                          </View>
                                        ) : null}
                                      </View>
                                    </View>
                                  );
                                })}
                              </Stack>

                              {hasCheckedAnswers && !allAnswersCorrect && question.explanation ? (
                                <AppText language={contentLang} variant="muted" style={styles.questionExplanation}>
                                  {question.explanation}
                                </AppText>
                              ) : null}
                            </View>
                          );
                        })}
                      </Stack>

                      <View style={styles.comprehensionFooter}>
                        <Button
                          language={pageLanguage}
                          title={comprehensionButtonLabel}
                          onPress={() => setHasCheckedAnswers(true)}
                          style={styles.comprehensionCheckButton}
                          textStyle={styles.comprehensionCheckButtonText}
                        />
                      </View>
                    </Stack>
                  ) : (
                    <Stack gap="md">
                      <View style={styles.sectionCardHeader}>
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

                      <Stack gap="sm">
                        <AppText language={pageLanguage} variant="title" style={styles.sectionTitle}>
                          {activeSectionTitle ?? pageCopy.noSectionAvailable}
                        </AppText>
                        <AppText language={pageLanguage} variant="body" style={styles.sectionBody}>
                          {activeSection
                            ? pageCopy.sectionLoadedPlaceholder
                            : pageCopy.tabExistsPlaceholder}
                        </AppText>
                      </Stack>

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
                </Card>

                <View style={styles.footerButtonWrap}>
                  <Button
                    language={pageLanguage}
                    title={primaryActionLabel}
                    onPress={() => {
                      if (sectionCount === 0 || isLastSection) {
                        setHasStartedLesson(false);
                      } else {
                        setActiveSectionIndex((prev) => Math.min(prev + 1, sectionCount - 1));
                      }
                    }}
                    disabled={!activeTab && sectionCount === 0}
                    style={styles.footerButton}
                  />
                </View>
                </View>
              </ScrollView>

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
  stepperScrollView: {
    flex: 1,
  },
  stepperScrollContent: {
    flexGrow: 1,
    paddingBottom: 188,
  },
  stepperInner: {
    padding: theme.spacing.md,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  stepperTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  stepperMenuButton: {
    width: 48,
    height: 48,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButtonText: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: theme.typography.weights.semibold,
  },
  stepperProgressBlock: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  progressLabel: {
    color: theme.colors.mutedText,
  },
  progressTrack: {
    height: 12,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.accentMuted,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  progressFill: {
    height: '100%',
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.primary,
  },
  sectionCard: {
    minHeight: 520,
    justifyContent: 'space-between',
  },
  comprehensionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#D9D9D9',
  },
  comprehensionHeaderTitle: {
    flex: 1,
    flexShrink: 1,
    fontSize: 24,
    lineHeight: 28,
  },
  contentToggleButton: {
    minHeight: 28,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentToggleButtonText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.medium,
    fontSize: theme.typography.sizes.xs,
    lineHeight: 14,
  },
  questionBlock: {
    gap: theme.spacing.md,
  },
  questionPromptWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
  },
  questionPromptContent: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  questionPromptText: {
    fontWeight: theme.typography.weights.semibold,
  },
  questionPromptThaiText: {
    color: theme.colors.mutedText,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  optionLetterButton: {
    width: 38,
    height: 38,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  optionLetterButtonSelected: {
    backgroundColor: theme.colors.accentMuted,
  },
  optionLetterText: {
    fontWeight: theme.typography.weights.semibold,
  },
  optionBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingTop: 5,
  },
  optionImage: {
    width: 72,
    height: 72,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  optionTextWrap: {
    flex: 1,
    gap: 2,
  },
  optionText: {
    flex: 1,
  },
  optionTextThai: {
    color: theme.colors.mutedText,
  },
  optionResultBadge: {
    width: 28,
    height: 28,
    borderRadius: theme.radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  optionResultBadgeCorrect: {
    backgroundColor: theme.colors.success,
  },
  optionResultBadgeIncorrect: {
    backgroundColor: '#FFD8D8',
  },
  optionResultBadgeText: {
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.lineHeights.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  questionExplanation: {
    color: theme.colors.mutedText,
    paddingLeft: 42,
  },
  comprehensionFooter: {
    paddingTop: theme.spacing.sm,
  },
  comprehensionCheckButton: {
    alignSelf: 'flex-start',
    minWidth: 236,
    paddingHorizontal: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
  },
  comprehensionCheckButtonText: {
    color: theme.colors.text,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  sectionEyebrow: {
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.warningSurface,
    borderWidth: 1,
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
    borderWidth: 1,
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
  footerButtonWrap: {
    paddingTop: theme.spacing.xs,
  },
  footerButton: {
    minHeight: 56,
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
