import { useAppSession } from '@/src/context/app-session-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Asset } from 'expo-asset';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { Image } from 'expo-image';
import {
  AudioQuality,
  IOSOutputFormat,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  setIsAudioActiveAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { Redirect, Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  createOrResumeSpeakingSession,
  evaluateSpeakingRecording,
  fetchAvailableSpeakingCoachLessons,
  fetchSpeakingCoachLesson,
  skipSpeakingCoachQuestion,
} from '@/src/api/speaking-coach';
import { upsertLessonCompletion } from '@/src/api/user';
import { bumpLessonLibraryProgressRefreshToken } from '@/src/lib/lesson-library-selection';
import {
  getLessonContentLanguage,
  hydrateLessonContentLanguage,
  setLessonContentLanguage,
  type LessonContentLanguage,
} from '@/src/lib/lesson-content-language';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { Stack as UiStack } from '@/src/components/ui/Stack';
import { LessonRichSectionIntro } from '@/src/components/lesson/LessonRichSectionIntro';
import { PracticeAnswerFooter, practiceColors, practiceNeoShadowStyle } from '@/src/components/practice/PracticeExerciseUI';
import { posthog } from '@/src/config/posthog';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';
import conversationPracticeImage from '@/assets/images/speaking-coach/conversation-practice.png';
import correctFeedbackSound from '@/assets/audio/correct-sound-effect.mp3';
import incorrectFeedbackSound from '@/assets/audio/wrong-sound-effect.mp3';
import audioRedoImage from '@/assets/images/speaking-coach/audio-redo.png';
import celebrateWhiteImage from '@/assets/images/speaking-coach/celebrate-white.png';
import lightBulbImage from '@/assets/images/speaking-coach/light-bulb.png';
import microphoneWhiteImage from '@/assets/images/speaking-coach/mic-white.png';
import pailinCantHearImage from '@/assets/images/speaking-coach/pailin-cant-hear.webp';
import pailinDoTheTaskImage from '@/assets/images/speaking-coach/pailin-do-the-task.webp';
import pailinGoodJobImage from '@/assets/images/speaking-coach/pailin-good-job.webp';
import pailinSetCompleteImage from '@/assets/images/speaking-coach/pailin-set-complete.webp';
import pailinTimeToSpeakImage from '@/assets/images/speaking-coach/pailin-time-to-speak.webp';
import pailinTryAgainImage from '@/assets/images/speaking-coach/pailin-try-again.webp';
import pauseBlueImage from '@/assets/images/speaking-coach/pause-blue.png';
import pauseGreenImage from '@/assets/images/speaking-coach/pause-green.png';
import pauseRedImage from '@/assets/images/speaking-coach/pause-red.png';
import playBlueImage from '@/assets/images/speaking-coach/play-blue.png';
import playGreenImage from '@/assets/images/speaking-coach/play-green.png';
import playRedImage from '@/assets/images/speaking-coach/play-red.png';
import pronunciationPracticeImage from '@/assets/images/speaking-coach/pronunciation-practice.png';
import speakerBlueImage from '@/assets/images/speaking-coach/speaker-blue.png';
import speakerGreyImage from '@/assets/images/speaking-coach/speaker-grey.png';
import starsGreenImage from '@/assets/images/speaking-coach/stars-green.png';
import starsRedImage from '@/assets/images/speaking-coach/stars-red.png';
import starsYellowImage from '@/assets/images/speaking-coach/stars-yellow.png';
import stopRecordRedImage from '@/assets/images/speaking-coach/stop-record-red.png';
import thaiToEnglishImage from '@/assets/images/speaking-coach/thai-to-english.png';
import {
  SpeakingCoachLesson,
  SpeakingCoachLessonSummary,
  SpeakingCoachPracticeSet,
  SpeakingCoachQuestion,
  SpeakingCoachSession,
  SpeakingEvaluation,
  SpeakingEvaluationStatus,
  SpeakingPracticeType,
  PronunciationAssessmentToken,
} from '@/src/types/speaking-coach';

type ScreenPhase = 'prompt' | 'recording' | 'review' | 'evaluating' | 'feedback' | 'correct';

type ActiveQuestion = {
  practiceSet: SpeakingCoachPracticeSet;
  question: SpeakingCoachQuestion;
};

type RecorderDiagnostic = {
  canRecord: boolean;
  isRecording: boolean;
  durationMillis: number;
  mediaServicesDidReset: boolean;
  hasUrl: boolean;
};

type CaptureTrace = {
  submissionId: string;
  recordingOrdinal: number;
  requestedAt: number;
  appStateAtStart: string;
  permissionMs?: number;
  audioSessionMs?: number;
  prepareMs?: number;
  statusBefore?: RecorderDiagnostic;
  statusAfterAudioSession?: RecorderDiagnostic;
  statusAfterPrepare?: RecorderDiagnostic;
  statusAfterRecord?: RecorderDiagnostic;
};

function SpeakingCoachLoader({
  title,
  subtitle,
  showCopy = true,
}: {
  title: string;
  subtitle: string;
  showCopy?: boolean;
}) {
  const orbitRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(orbitRotation, {
        toValue: 1,
        duration: 2800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    animation.start();

    return () => animation.stop();
  }, [orbitRotation]);

  const rotate = orbitRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.evaluationLoader} accessibilityRole="progressbar" accessibilityLabel={title}>
      {showCopy ? (
        <View style={styles.evaluationCopy}>
          <AppText variant="title" style={styles.evaluationTitle}>{title}</AppText>
          <AppText variant="muted" style={styles.evaluationSubtitle}>
            {subtitle}
          </AppText>
        </View>
      ) : null}

      <View style={styles.evaluationGraphic}>
        <Image source={pailinGoodJobImage} contentFit="contain" style={styles.evaluationPailin} />
        <Animated.View style={[styles.evaluationOrbit, { transform: [{ rotate }] }]}>
          <View style={[styles.orbitDot, styles.orbitDotTop]} />
          <View style={[styles.orbitDot, styles.orbitDotLeft]} />
          <View style={[styles.orbitSparkle, styles.orbitSparkleRight]}>
            <Text style={styles.orbitSparkleText}>✦</Text>
          </View>
          <View style={[styles.orbitSparkle, styles.orbitSparkleBottom]}>
            <Text style={styles.orbitSparkleText}>✦</Text>
          </View>
        </Animated.View>
      </View>

      {showCopy ? (
        <View style={styles.evaluationReminder}>
          <Text style={styles.evaluationReminderSparkle}>✦</Text>
          <AppText variant="body" style={styles.evaluationReminderText}>
            This will just take a few seconds!
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const IOS_AZURE_RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  extension: '.wav',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 256000,
  ios: {
    ...RecordingPresets.HIGH_QUALITY.ios,
    extension: '.wav',
    sampleRate: 16000,
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: AudioQuality.HIGH,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
};

const SPEAKING_RECORDING_OPTIONS =
  Platform.OS === 'ios' ? IOS_AZURE_RECORDING_OPTIONS : RecordingPresets.HIGH_QUALITY;
const SPEAKING_RECORDING_FILE =
  Platform.OS === 'ios'
    ? { name: 'speaking-recording.wav', mimeType: 'audio/wav' }
    : { name: 'speaking-recording.m4a', mimeType: 'audio/mp4' };

const TYPE_COPY: Record<
  SpeakingPracticeType,
  { eyebrow: string; title: string; subtitle: string; recordLabel: string }
> = {
  pronunciation: {
    eyebrow: 'PRONUNCIATION PRACTICE',
    title: 'Listen, then repeat!',
    subtitle: '',
    recordLabel: 'Tap to repeat',
  },
  open: {
    eyebrow: 'CONVERSATION PRACTICE',
    title: 'Let’s chat!',
    subtitle: 'Answer the question below.',
    recordLabel: 'Tap to answer',
  },
  translation: {
    eyebrow: 'THAI TO ENGLISH',
    title: 'Say it in English!',
    subtitle: 'Translate the sentence below.',
    recordLabel: 'Tap to speak',
  },
};

const THAI_TYPE_COPY: typeof TYPE_COPY = {
  pronunciation: {
    eyebrow: 'ฝึกการออกเสียง',
    title: 'ฟังแล้วพูดตาม',
    subtitle: '',
    recordLabel: 'แตะเพื่อพูดตาม',
  },
  open: {
    eyebrow: 'ฝึกบทสนทนา',
    title: 'มาคุยกัน!',
    subtitle: 'ตอบคำถามด้านล่าง',
    recordLabel: 'แตะเพื่อตอบ',
  },
  translation: {
    eyebrow: 'แปลไทยเป็นอังกฤษ',
    title: 'พูดเป็นภาษาอังกฤษ!',
    subtitle: 'แปลประโยคด้านล่าง',
    recordLabel: 'แตะเพื่อพูด',
  },
};

const WELCOME_PRACTICE_COPY = {
  pronunciation: {
    title: 'PRONUNCIATION PRACTICE',
    description: 'Listen to the sentences and repeat. Focus on getting your pronunciation right!',
    image: pronunciationPracticeImage,
  },
  open: {
    title: 'CONVERSATION PRACTICE',
    description: 'Answer the questions using what you’ve learned! Use the lesson focus in your answers.',
    image: conversationPracticeImage,
  },
  translation: {
    title: 'THAI TO ENGLISH',
    description: 'Translate the sentences from Thai to English, then speak them out loud!',
    image: thaiToEnglishImage,
  },
} as const;

const SET_COMPLETION_COPY: Record<
  SpeakingPracticeType,
  { action: string; singular: string; plural: string }
> = {
  pronunciation: { action: 'pronouncing', singular: 'sentence', plural: 'sentences' },
  open: { action: 'answering', singular: 'question', plural: 'questions' },
  translation: { action: 'translating', singular: 'sentence', plural: 'sentences' },
};

const OUTCOME_LABELS: Record<SpeakingEvaluationStatus, string> = {
  pass: 'Correct',
  retry: 'Needs retry',
  continue_with_correction: 'Final correction',
  unclear_audio: 'Unclear audio',
};

const SCORE_NUMBER_OUTLINE_OFFSETS = [
  { x: -1.25, y: 0 },
  { x: 1.25, y: 0 },
  { x: 0, y: -1.25 },
  { x: 0, y: 1.25 },
  { x: -1, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: 1, y: 1 },
] as const;

function SetCompletionScoreNumber({ value, fill }: { value: number; fill: string }) {
  const text = String(value);
  return (
    <View style={styles.setProgressNumberWrap}>
      <AppText
        language="en"
        style={[styles.setProgressNumber, styles.setProgressNumberOutline, { transform: [{ translateX: 3 }, { translateY: 4 }] }]}
      >
        {text}
      </AppText>
      {SCORE_NUMBER_OUTLINE_OFFSETS.map(({ x, y }) => (
        <AppText
          key={`${x}:${y}`}
          language="en"
          style={[styles.setProgressNumber, styles.setProgressNumberOutline, { transform: [{ translateX: x }, { translateY: y }] }]}
        >
          {text}
        </AppText>
      ))}
      <AppText language="en" style={[styles.setProgressNumber, { color: fill }]}>{text}</AppText>
    </View>
  );
}

const THAI_OUTCOME_LABELS: Record<SpeakingEvaluationStatus, string> = {
  pass: 'ถูกต้อง',
  retry: 'ต้องลองใหม่',
  continue_with_correction: 'คำแนะนำสุดท้าย',
  unclear_audio: 'เสียงไม่ชัด',
};

const formatDuration = (durationMillis: number) => {
  const totalSeconds = Math.max(0, Math.round(durationMillis / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const lessonLevel = (lessonExternalId: string) => lessonExternalId.split('.', 1)[0] || lessonExternalId;

const lessonOptionLabel = (lessonExternalId: string) => {
  const [, suffix = lessonExternalId] = lessonExternalId.split('.', 2);
  return suffix.toLowerCase() === 'chp' ? 'Checkpoint' : lessonExternalId;
};

const isReleasedAudioObjectError = (error: unknown) =>
  error instanceof Error && error.message.includes('NativeSharedObjectNotFoundException');

const switchAudioSession = async (allowsRecording: boolean, playsInSilentMode = true) => {
  // Simulator and iOS hardware can retain the previous input/output route when
  // changing categories on an active session. Deactivate before changing modes.
  await setIsAudioActiveAsync(false);
  await setAudioModeAsync({ allowsRecording, playsInSilentMode });
  await setIsAudioActiveAsync(true);
};

function PlaybackButton({
  label,
  onPress,
  playing,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  playing: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.playbackButton, disabled ? styles.playbackButtonDisabled : null]}
    >
      <View style={styles.playbackIcon}>
        <MaterialIcons name={playing ? 'pause' : 'play-arrow'} size={22} color={theme.colors.surface} />
      </View>
      <AppText variant="caption" style={styles.playbackLabel}>
        {label}
      </AppText>
    </Pressable>
  );
}

function PulsingRecordingControl({ onPress }: { onPress: () => void }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1_000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );
    animation.start();

    return () => {
      animation.stop();
      pulse.setValue(0);
    };
  }, [pulse]);

  return (
    <View style={styles.recordingPulseContainer}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.recordingPulseRing,
          {
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.42, 0] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.35] }) }],
          },
        ]}
      />
      <Pressable accessibilityRole="button" accessibilityLabel="Stop recording" onPress={onPress}>
        <Image source={stopRecordRedImage} contentFit="contain" style={styles.pronunciationRecordControl} />
      </Pressable>
    </View>
  );
}

function RecordingButtonEmphasis({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.recordingButtonEmphasis}>
      <View pointerEvents="none" style={[styles.recordingEmphasisRay, styles.recordingEmphasisLeftTop]} />
      <View pointerEvents="none" style={[styles.recordingEmphasisRay, styles.recordingEmphasisLeftMiddle]} />
      <View pointerEvents="none" style={[styles.recordingEmphasisRay, styles.recordingEmphasisLeftBottom]} />
      <View pointerEvents="none" style={[styles.recordingEmphasisRay, styles.recordingEmphasisRightTop]} />
      <View pointerEvents="none" style={[styles.recordingEmphasisRay, styles.recordingEmphasisRightMiddle]} />
      <View pointerEvents="none" style={[styles.recordingEmphasisRay, styles.recordingEmphasisRightBottom]} />
      {children}
    </View>
  );
}

function PracticeProgress({ practiceSet, question }: ActiveQuestion) {
  return (
    <View style={styles.progressRow} accessibilityLabel={`Question ${question.position} of ${practiceSet.question_count}`}>
      {Array.from({ length: practiceSet.question_count }, (_, index) => (
        <React.Fragment key={index}>
          {index > 0 ? <View style={styles.progressConnector} /> : null}
          <View
            style={[styles.progressDot, index + 1 === question.position ? styles.progressDotActive : null]}
          />
        </React.Fragment>
      ))}
    </View>
  );
}

function CompletedSetProgress({ questionCount }: { questionCount: number }) {
  return (
    <View style={styles.progressRow} accessibilityLabel={`All ${questionCount} questions completed`}>
      {Array.from({ length: questionCount }, (_, index) => (
        <React.Fragment key={index}>
          {index > 0 ? <View style={[styles.progressConnector, styles.progressConnectorComplete]} /> : null}
          <View style={[styles.progressDot, styles.progressDotActive]} />
        </React.Fragment>
      ))}
    </View>
  );
}

function WelcomePracticeCard({
  step,
  practiceType,
}: {
  step: number;
  practiceType: SpeakingPracticeType;
}) {
  const copy = WELCOME_PRACTICE_COPY[practiceType];

  return (
    <View style={styles.welcomePracticeRow}>
      <View style={styles.welcomeStepBadge}>
        <AppText variant="body" style={styles.welcomeStepNumber}>{step}</AppText>
      </View>
      <View style={styles.welcomePracticeCard}>
        <View style={styles.welcomePracticeCopy}>
          <AppText variant="caption" style={styles.welcomePracticeTitle}>{copy.title}</AppText>
          <AppText variant="caption" style={styles.welcomePracticeDescription}>{copy.description}</AppText>
        </View>
        <Image source={copy.image} contentFit="contain" style={styles.welcomePracticeIcon} />
      </View>
    </View>
  );
}

function PronunciationPlaybackButton({
  label,
  playing,
  tone = 'blue',
  disabled = false,
  onPress,
}: {
  label: string;
  playing: boolean;
  tone?: 'blue' | 'red';
  disabled?: boolean;
  onPress: () => void;
}) {
  const icon = tone === 'red'
    ? (playing ? pauseRedImage : playRedImage)
    : (playing ? pauseBlueImage : playBlueImage);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Play ${label}`}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.pronunciationPlaybackButton,
        disabled ? styles.playbackButtonDisabled : null,
      ]}
    >
      <Image source={icon} contentFit="contain" style={styles.pronunciationPlaybackIcon} />
      <AppText variant="caption" style={styles.pronunciationPlaybackLabel}>{label}</AppText>
    </Pressable>
  );
}

function PailinCoachBubble({
  tone,
  instruction,
  language = 'en',
  plain = false,
  overlapCard = false,
}: {
  tone: 'instruction' | 'success' | 'error' | 'unclear';
  instruction: string;
  language?: LessonContentLanguage;
  plain?: boolean;
  overlapCard?: boolean;
}) {
  const image = tone === 'success'
    ? pailinGoodJobImage
    : tone === 'unclear'
      ? pailinCantHearImage
      : tone === 'error'
        ? pailinTryAgainImage
        : pailinDoTheTaskImage;
  const message = tone === 'success'
    ? (language === 'th' ? 'ถูกต้อง!' : 'Correct!')
    : tone === 'unclear'
      ? (language === 'th' ? 'อืม... พูดว่าอะไรนะ?' : 'Hmm...what was that?')
      : tone === 'error'
        ? (language === 'th' ? 'ยังไม่ถูกนะ!' : 'Not quite!')
        : instruction;

  return (
    <View style={[styles.pronunciationCoachRow, overlapCard ? styles.pronunciationCoachRowOverlap : null]}>
      <Image
        source={image}
        contentFit="contain"
        style={[
          styles.pronunciationCoachImage,
          overlapCard && tone === 'success' ? styles.pronunciationCoachImageOverlapSuccess : null,
          overlapCard && tone === 'error' ? styles.pronunciationCoachImageOverlapError : null,
          overlapCard && tone === 'unclear' ? styles.pronunciationCoachImageOverlapUnclear : null,
        ]}
      />
      <View
        style={[
          styles.pronunciationCoachBubble,
          plain ? styles.pronunciationCoachMessagePlain : null,
          overlapCard ? styles.pronunciationCoachMessageOverlap : null,
          tone === 'success'
            ? (plain ? styles.pronunciationCoachMessagePlainSuccess : styles.pronunciationCoachBubbleSuccess)
            : tone === 'unclear'
              ? (plain ? styles.pronunciationCoachMessagePlainUnclear : styles.pronunciationCoachBubbleUnclear)
              : tone === 'error'
                ? (plain ? styles.pronunciationCoachMessagePlainError : styles.pronunciationCoachBubbleError)
                : (plain ? styles.pronunciationCoachMessagePlainInstruction : styles.pronunciationCoachBubbleInstruction),
          overlapCard && tone === 'instruction' ? styles.pronunciationCoachMessageOverlapInstruction : null,
        ]}
      >
        <AppText
          language={language}
          variant="caption"
          style={[
            styles.pronunciationCoachMessage,
            plain ? styles.pronunciationCoachMessagePlainText : null,
            plain && tone === 'success' ? styles.pronunciationCoachMessageSuccess : null,
            plain && tone === 'unclear' ? styles.pronunciationCoachMessageUnclear : null,
            plain && tone === 'error' ? styles.pronunciationCoachMessageError : null,
          ]}
        >
          {message}
        </AppText>
        {tone === 'success' ? (
          <MaterialIcons name="check-circle" size={18} color="#9DD94A" />
        ) : tone === 'error' ? (
          <MaterialIcons name="cancel" size={18} color="#FF6268" />
        ) : null}
      </View>
    </View>
  );
}

function TargetSentenceAssessment({ tokens }: { tokens: PronunciationAssessmentToken[] }) {
  return (
    <AppText
      variant="body"
      accessibilityLabel={tokens.map((token) => token.text).join('')}
      style={styles.assessmentSentence}
    >
      {tokens.map((token, index) => (
        <Text
          key={`${index}-${token.text}`}
          style={token.status === 'clear' ? undefined : styles.assessmentProblemWord}
        >
          {token.text}
        </Text>
      ))}
    </AppText>
  );
}

export default function SpeakingCoachEntryScreen() {
  const { hasMembership, isLoading } = useAppSession();
  if (isLoading) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.fullState}>
          <SpeakingCoachLoader
            title="Loading speaking coach…"
            subtitle="Hang tight – Pailin is getting your practice ready!"
            showCopy={false}
          />
        </View>
      </View>
    );
  }
  if (!hasMembership) return <Redirect href="/(tabs)/account/membership" />;
  return <SpeakingCoachTestScreen />;
}

function SpeakingCoachTestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { uiLanguage } = useUiLanguage();
  const params = useLocalSearchParams<{
    lesson?: string;
    entry?: string;
    lessonId?: string;
    libraryRoute?: string;
    requiredPracticeComplete?: string;
    sectionPosition?: string;
    sectionTotal?: string;
    language?: string;
  }>();
  const routeLessonLanguage: LessonContentLanguage | null =
    params.language === 'en' || params.language === 'th' ? params.language : null;
  const [lessonContentLanguage, setLocalLessonContentLanguage] = useState<LessonContentLanguage>(
    routeLessonLanguage ?? getLessonContentLanguage
  );
  const [hasHydratedLessonLanguage, setHasHydratedLessonLanguage] = useState(Boolean(routeLessonLanguage));
  const resourceMode = params.entry === 'resources';
  const lessonMode = params.entry === 'lesson';
  const guidedMode = resourceMode || lessonMode;
  const screenLanguage = lessonMode ? lessonContentLanguage : uiLanguage;
  const th = screenLanguage === 'th';
  const tr = (english: string, thai: string) => th ? thai : english;
  const sectionPosition = Math.max(1, Number.parseInt(params.sectionPosition ?? '', 10) || 1);
  const sectionTotal = Math.max(sectionPosition, Number.parseInt(params.sectionTotal ?? '', 10) || sectionPosition);
  const initialLessonId = typeof params.lesson === 'string' && params.lesson.trim() ? params.lesson : '1.1';
  const [lessonId, setLessonId] = useState(initialLessonId);
  const [selectedLevel, setSelectedLevel] = useState(lessonLevel(initialLessonId));
  const [lessonOptions, setLessonOptions] = useState<SpeakingCoachLessonSummary[]>([]);
  const [lessonOptionsLoading, setLessonOptionsLoading] = useState(true);
  const [lessonOptionsError, setLessonOptionsError] = useState<string | null>(null);
  const [lesson, setLesson] = useState<SpeakingCoachLesson | null>(null);
  const [session, setSession] = useState<SpeakingCoachSession | null>(null);
  const [showWelcome, setShowWelcome] = useState(!lessonMode);
  const [showLessonIntro, setShowLessonIntro] = useState(lessonMode);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [phase, setPhase] = useState<ScreenPhase>('prompt');
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordedDurationMillis, setRecordedDurationMillis] = useState(0);
  const [recordedFile, setRecordedFile] = useState(SPEAKING_RECORDING_FILE);
  const [evaluation, setEvaluation] = useState<SpeakingEvaluation | null>(null);
  const [instructionalAttemptNumber, setInstructionalAttemptNumber] = useState<1 | 2>(1);
  const [previousAttemptId, setPreviousAttemptId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [clientSubmissionId, setClientSubmissionId] = useState<string | null>(null);
  const [skipPending, setSkipPending] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [completedPracticeSetId, setCompletedPracticeSetId] = useState<number | null>(null);
  const [locallyCorrectQuestionIds, setLocallyCorrectQuestionIds] = useState<number[]>([]);
  const [advancePending, setAdvancePending] = useState(false);
  const fullLessonPromiseRef = useRef<Promise<SpeakingCoachLesson> | null>(null);
  const questionPresentedAtRef = useRef(Date.now());
  const promptPlayedForQuestionRef = useRef(false);
  const recordingOrdinalRef = useRef(0);
  const captureTraceRef = useRef<CaptureTrace | null>(null);
  const screenFocusedRef = useRef(false);

  useEffect(() => {
    let active = true;
    if (routeLessonLanguage) {
      setLessonContentLanguage(routeLessonLanguage);
      setLocalLessonContentLanguage(routeLessonLanguage);
      setHasHydratedLessonLanguage(true);
      return () => { active = false; };
    }

    void hydrateLessonContentLanguage().then((language) => {
      if (!active) return;
      setLocalLessonContentLanguage(language);
      setHasHydratedLessonLanguage(true);
    });
    return () => { active = false; };
  }, [routeLessonLanguage]);

  const recorder = useAudioRecorder(SPEAKING_RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 200);

  const levelOptions = useMemo(
    () => Array.from(new Set(lessonOptions.map((option) => lessonLevel(option.lesson_external_id)))),
    [lessonOptions]
  );
  const lessonsForSelectedLevel = useMemo(
    () => lessonOptions.filter((option) => lessonLevel(option.lesson_external_id) === selectedLevel),
    [lessonOptions, selectedLevel]
  );
  const lessonSelectionDisabled = loading || phase === 'recording' || phase === 'evaluating';

  const questions = useMemo<ActiveQuestion[]>(
    () =>
      lesson?.practice_sets.flatMap((practiceSet) =>
        practiceSet.questions.map((question) => ({ practiceSet, question }))
      ) ?? [],
    [lesson]
  );
  const activeQuestion = questions[questionIndex] ?? null;
  const welcomePracticeTypes = useMemo<[SpeakingPracticeType, SpeakingPracticeType]>(() => {
    const orderedPracticeSets = [...(lesson?.practice_sets ?? [])].sort(
      (left, right) => left.position - right.position
    );
    const pronunciationSet = orderedPracticeSets.find(
      (practiceSet) => practiceSet.practice_type === 'pronunciation'
    );
    const conversationSet = orderedPracticeSets.find(
      (practiceSet) => practiceSet.practice_type === 'open'
    );
    const translationSet = orderedPracticeSets.find(
      (practiceSet) => practiceSet.practice_type === 'translation'
    );
    const followUpSet = conversationSet ?? translationSet;

    return [pronunciationSet?.practice_type ?? 'pronunciation', followUpSet?.practice_type ?? 'open'];
  }, [lesson]);
  const promptAudioUrl = activeQuestion?.question.prompt_audio_url ?? null;
  // This screen owns AVAudioSession transitions explicitly. Without this flag,
  // pausing either player schedules Expo's delayed session deactivation, which
  // can fire after the recorder has started and produce a zero-frame WAV.
  const promptPlayer = useAudioPlayer(promptAudioUrl, {
    updateInterval: 200,
    keepAudioSessionActive: true,
  });
  const promptPlayerStatus = useAudioPlayerStatus(promptPlayer);
  // Let Expo create the AVPlayer with the completed local file as its initial
  // source. A player created with no item and mutated via replace() can report
  // loaded while failing to start local-file playback on iOS.
  const recordingPlayer = useAudioPlayer(recordedUri, {
    updateInterval: 200,
    keepAudioSessionActive: true,
  });
  const recordingPlayerStatus = useAudioPlayerStatus(recordingPlayer);
  const correctFeedbackPlayer = useAudioPlayer(correctFeedbackSound, {
    downloadFirst: true,
    keepAudioSessionActive: true,
  });
  const incorrectFeedbackPlayer = useAudioPlayer(incorrectFeedbackSound, {
    downloadFirst: true,
    keepAudioSessionActive: true,
  });
  const recorderRef = useRef(recorder);

  recorderRef.current = recorder;

  const recorderDiagnostic = (): RecorderDiagnostic => {
    const status = recorder.getStatus();
    return {
      canRecord: status.canRecord,
      isRecording: status.isRecording,
      durationMillis: status.durationMillis,
      mediaServicesDidReset: status.mediaServicesDidReset,
      hasUrl: Boolean(status.url),
    };
  };

  const captureDiagnostic = (
    stage: 'started' | 'stopped' | 'start_error' | 'stop_error',
    trace: CaptureTrace,
    properties: Record<string, unknown> = {}
  ) => {
    posthog.capture('speaking_capture_diagnostic', {
      stage,
      client_submission_id: trace.submissionId,
      lesson_external_id: lessonId,
      session_id: session?.id ?? null,
      question_id: activeQuestion?.question.id ?? null,
      question_position: questionIndex + 1,
      practice_type: activeQuestion?.practiceSet.practice_type ?? null,
      instructional_attempt_number: instructionalAttemptNumber,
      recording_ordinal: trace.recordingOrdinal,
      is_record_again: trace.recordingOrdinal > 1,
      prompt_played_since_question_shown: promptPlayedForQuestionRef.current,
      time_since_question_shown_ms: Date.now() - questionPresentedAtRef.current,
      app_state_at_start: trace.appStateAtStart,
      app_state_at_event: AppState.currentState,
      platform: Platform.OS,
      platform_version: String(Platform.Version),
      device_model: Constants.platform?.ios?.model ?? null,
      app_version: Constants.expoConfig?.version ?? null,
      build_number:
        Constants.platform?.ios?.buildNumber ??
        Constants.expoConfig?.ios?.buildNumber ??
        null,
      permission_ms: trace.permissionMs ?? null,
      audio_session_ms: trace.audioSessionMs ?? null,
      prepare_ms: trace.prepareMs ?? null,
      ...properties,
    });
  };

  useEffect(() => {
    questionPresentedAtRef.current = Date.now();
    promptPlayedForQuestionRef.current = false;
    recordingOrdinalRef.current = 0;
    captureTraceRef.current = null;
  }, [activeQuestion?.question.id]);

  useFocusEffect(
    useCallback(() => {
      screenFocusedRef.current = true;
      return () => {
        screenFocusedRef.current = false;
        const activeRecorder = recorderRef.current;
        void (async () => {
          try {
            if (activeRecorder.getStatus().isRecording) {
              await activeRecorder.stop();
            }
          } catch (error) {
            // Expo may release hook-owned native objects before an unmount
            // cleanup runs. A released recorder is already unable to capture.
            if (!isReleasedAudioObjectError(error)) {
              console.warn('[speaking-capture-cleanup] Could not stop recorder', error);
            }
          }
          try {
            await setIsAudioActiveAsync(false);
            await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
          } catch (error) {
            console.warn('[speaking-capture-cleanup] Could not release audio session', error);
          }
        })();
      };
    }, [])
  );

  useEffect(() => {
    if (guidedMode) {
      setLessonOptionsLoading(false);
      return;
    }
    let cancelled = false;
    setLessonOptionsLoading(true);
    setLessonOptionsError(null);
    void fetchAvailableSpeakingCoachLessons()
      .then((options) => {
        if (cancelled) return;
        setLessonOptions(options);
        const selected = options.find((option) => option.lesson_external_id === initialLessonId);
        if (selected) {
          setSelectedLevel(lessonLevel(selected.lesson_external_id));
        } else if (options[0]) {
          setSelectedLevel(lessonLevel(options[0].lesson_external_id));
          setLessonId(options[0].lesson_external_id);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLessonOptionsError(error instanceof Error ? error.message : 'Could not load speaking lessons.');
        }
      })
      .finally(() => {
        if (!cancelled) setLessonOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [guidedMode, initialLessonId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setLesson(null);
    setSession(null);
    setShowWelcome(!lessonMode);
    setShowLessonIntro(lessonMode);
    setQuestionIndex(0);
    setPhase('prompt');
    setRecordedUri(null);

    setEvaluation(null);
    setInstructionalAttemptNumber(1);
    setPreviousAttemptId(null);
    setSubmitError(null);
    setClientSubmissionId(null);
    setCompletedPracticeSetId(null);
    setLocallyCorrectQuestionIds([]);
    fullLessonPromiseRef.current = null;

    void Promise.all([
      fetchSpeakingCoachLesson(lessonId, {
        firstSetOnly: lessonMode,
        includeTestAnswers: !guidedMode,
      }),
      createOrResumeSpeakingSession(lessonId),
    ])
      .then(async ([firstLesson, nextSession]) => {
        if (!cancelled) {
          const fullLessonPromise = lessonMode
            ? fetchSpeakingCoachLesson(lessonId, { includeTestAnswers: false })
            : null;
          fullLessonPromiseRef.current = fullLessonPromise;
          let nextLesson = firstLesson;
          const firstQuestionIds = new Set(firstLesson.practice_sets.flatMap((set) => set.questions.map((question) => question.id)));
          if (fullLessonPromise && nextSession.current_question_id !== null && !firstQuestionIds.has(nextSession.current_question_id)) {
            nextLesson = await fullLessonPromise;
            if (cancelled) return;
          }
          const nextQuestions = nextLesson.practice_sets.flatMap((practiceSet) =>
            practiceSet.questions.map((question) => ({ practiceSet, question }))
          );
          const resumedIndex = nextQuestions.findIndex(
            ({ question }) => question.id === nextSession.current_question_id
          );
          setLesson(nextLesson);
          setSession(nextSession);
          setQuestionIndex(resumedIndex >= 0 ? resumedIndex : 0);
          setInstructionalAttemptNumber(nextSession.instructional_attempt_number);
          setPreviousAttemptId(nextSession.previous_attempt_id);
          if (fullLessonPromise && nextLesson === firstLesson) {
            void fullLessonPromise.then((fullLesson) => {
              if (!cancelled) setLesson(fullLesson);
            }).catch(() => {
              // The next-set action retries if the background request failed.
            });
          }
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Unable to load the speaking lesson.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [guidedMode, lessonId, lessonMode]);

  const resetQuestion = () => {
    promptPlayer.pause();
    recordingPlayer.pause();
    correctFeedbackPlayer.pause();
    incorrectFeedbackPlayer.pause();
    setPhase('prompt');
    setRecordedUri(null);
    setRecordedDurationMillis(0);
    setRecordedFile(SPEAKING_RECORDING_FILE);
    setShowExample(false);
    setEvaluation(null);
    setInstructionalAttemptNumber(1);
    setPreviousAttemptId(null);
    setSubmitError(null);
    setClientSubmissionId(null);
  };

  const goToQuestion = (nextIndex: number) => {
    resetQuestion();
    setCompletedPracticeSetId(null);
    setQuestionIndex(Math.max(0, Math.min(nextIndex, questions.length - 1)));
  };

  const goNext = () => {
    if (!activeQuestion || !session) return;
    const nextIndex = session.current_question_id === null
      ? -1
      : questions.findIndex(({ question }) => question.id === session.current_question_id);
    const nextQuestion = nextIndex >= 0 ? questions[nextIndex] : null;
    if (!nextQuestion || nextQuestion.practiceSet.id !== activeQuestion.practiceSet.id) {
      promptPlayer.pause();
      recordingPlayer.pause();
      setCompletedPracticeSetId(activeQuestion.practiceSet.id);
      return;
    }
    goToQuestion(nextIndex);
  };

  const finishLessonFromSpeaking = async () => {
    if (advancePending) return;
    setAdvancePending(true);
    try {
      const suppliedLessonId = typeof params.lessonId === 'string' ? params.lessonId.trim() : '';
      const lessonRecordId = suppliedLessonId;
      if (!lessonRecordId) {
        throw new Error('The lesson record could not be found.');
      }

      if (params.requiredPracticeComplete !== '1') {
        bumpLessonLibraryProgressRefreshToken();
        router.replace({
          pathname: '/lessons/[id]',
          params: {
            id: lessonRecordId,
            overview: '1',
            speakingCompleted: '1',
            ...(typeof params.libraryRoute === 'string' ? { libraryRoute: params.libraryRoute } : {}),
          },
        });
        return;
      }

      await upsertLessonCompletion({ lessonId: lessonRecordId, completed: true });
      bumpLessonLibraryProgressRefreshToken();
      router.replace({
        pathname: '/lesson-complete-preview',
        params: {
          lesson: lessonId,
          lessonId: lessonRecordId,
          ...(typeof params.libraryRoute === 'string' ? { libraryRoute: params.libraryRoute } : {}),
        },
      });
    } catch (error) {
      Alert.alert(
        'Could not finish lesson',
        error instanceof Error ? error.message : 'Please try again.'
      );
      setAdvancePending(false);
    }
  };

  const continueAfterSet = async () => {
    if (!session || completedPracticeSetId === null || advancePending) return;
    const nextIndex = session.current_question_id === null
      ? -1
      : questions.findIndex(({ question }) => question.id === session.current_question_id);
    if (nextIndex >= 0) {
      goToQuestion(nextIndex);
      return;
    }
    if (session.current_question_id !== null && lessonMode) {
      setAdvancePending(true);
      setLoading(true);
      try {
        let fullLesson: SpeakingCoachLesson;
        try {
          fullLesson = await (fullLessonPromiseRef.current ?? fetchSpeakingCoachLesson(lessonId, { includeTestAnswers: false }));
        } catch {
          fullLessonPromiseRef.current = null;
          fullLesson = await fetchSpeakingCoachLesson(lessonId, { includeTestAnswers: false });
        }
        const fullQuestions = fullLesson.practice_sets.flatMap((practiceSet) =>
          practiceSet.questions.map((question) => ({ practiceSet, question }))
        );
        const fullIndex = fullQuestions.findIndex(({ question }) => question.id === session.current_question_id);
        if (fullIndex < 0) throw new Error('The next speaking set could not be found.');
        setLesson(fullLesson);
        resetQuestion();
        setCompletedPracticeSetId(null);
        setQuestionIndex(fullIndex);
      } catch (error) {
        fullLessonPromiseRef.current = null;
        Alert.alert('Could not load the next set', error instanceof Error ? error.message : 'Please try again.');
      } finally {
        setLoading(false);
        setAdvancePending(false);
      }
      return;
    }
    if (lessonMode) {
      await finishLessonFromSpeaking();
      return;
    }
    router.back();
  };

  const skipCurrentQuestion = async () => {
    if (!session || !activeQuestion || skipPending) return;
    setSkipPending(true);
    try {
      if (phase === 'recording') {
        await recorder.stop();
        await switchAudioSession(false);
      }
      const nextSession = await skipSpeakingCoachQuestion(session.id, activeQuestion.question.id);
      setSession(nextSession);
      resetQuestion();
      const nextIndex = questions.findIndex(
        ({ question }) => question.id === nextSession.current_question_id
      );
      const nextQuestion = nextIndex >= 0 ? questions[nextIndex] : null;
      if (!nextQuestion || nextQuestion.practiceSet.id !== activeQuestion.practiceSet.id) {
        setCompletedPracticeSetId(activeQuestion.practiceSet.id);
        return;
      }
      setQuestionIndex(nextIndex >= 0 ? nextIndex : Math.min(questionIndex + 1, questions.length - 1));
    } catch (error) {
      Alert.alert(
        'Could not skip question',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setSkipPending(false);
    }
  };

  const retestInFreshSession = async () => {
    try {
      setLoading(true);
      const nextSession = await createOrResumeSpeakingSession(lessonId, { forceNew: true });
      resetQuestion();
      setCompletedPracticeSetId(null);
      setLocallyCorrectQuestionIds([]);
      setSession(nextSession);
      const freshQuestionIndex = questions.findIndex(
        ({ question }) => question.id === nextSession.current_question_id
      );
      setQuestionIndex(freshQuestionIndex >= 0 ? freshQuestionIndex : 0);
    } catch (error) {
      Alert.alert(
        'Could not restart test session',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const startFromWelcome = async () => {
    try {
      setLoading(true);
      const nextSession = await createOrResumeSpeakingSession(lessonId, { forceNew: true });
      resetQuestion();
      setCompletedPracticeSetId(null);
      setLocallyCorrectQuestionIds([]);
      setSession(nextSession);
      const firstQuestionIndex = questions.findIndex(
        ({ question: candidateQuestion }) => candidateQuestion.id === nextSession.current_question_id
      );
      setQuestionIndex(firstQuestionIndex >= 0 ? firstQuestionIndex : 0);
      setShowWelcome(false);
    } catch (error) {
      Alert.alert(
        'Could not start speaking practice',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const togglePromptAudio = async () => {
    recordingPlayer.pause();
    if (promptPlayerStatus.playing) {
      promptPlayer.pause();
      return;
    }
    await switchAudioSession(false);
    const isAtEnd =
      promptPlayerStatus.didJustFinish ||
      (promptPlayerStatus.duration > 0 &&
        promptPlayerStatus.currentTime >= promptPlayerStatus.duration - 0.05);
    if (isAtEnd) await promptPlayer.seekTo(0);
    promptPlayedForQuestionRef.current = true;
    promptPlayer.play();
  };

  const toggleRecordingAudio = async () => {
    promptPlayer.pause();
    if (recordingPlayerStatus.playing) {
      recordingPlayer.pause();
      return;
    }
    if (!recordedUri) return;
    await switchAudioSession(false);
    const isAtEnd =
      recordingPlayerStatus.didJustFinish ||
      (recordingPlayerStatus.duration > 0 &&
        recordingPlayerStatus.currentTime >= recordingPlayerStatus.duration - 0.05);
    if (isAtEnd) await recordingPlayer.seekTo(0);
    recordingPlayer.play();
  };

  const playEvaluationSound = async (status: SpeakingEvaluationStatus) => {
    if (status === 'unclear_audio') return;
    const player = status === 'pass' ? correctFeedbackPlayer : incorrectFeedbackPlayer;
    try {
      const loadStartedAt = Date.now();
      while (!player.isLoaded && Date.now() - loadStartedAt < 1500) {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      if (!player.isLoaded) {
        console.warn('[Speaking Coach] Feedback sound did not finish loading', { status });
        return;
      }
      player.volume = 1;
      await player.seekTo(0);
      player.play();
    } catch (error) {
      console.warn('[Speaking Coach] Could not play feedback sound', error);
    }
  };

  const startRecording = async () => {
    const requestedAt = Date.now();
    const trace: CaptureTrace = {
      submissionId: Crypto.randomUUID(),
      recordingOrdinal: recordingOrdinalRef.current + 1,
      requestedAt,
      appStateAtStart: AppState.currentState,
    };
    recordingOrdinalRef.current = trace.recordingOrdinal;
    captureTraceRef.current = trace;
    try {
      trace.statusBefore = recorderDiagnostic();
      const permissionStarted = Date.now();
      const permission = await requestRecordingPermissionsAsync();
      trace.permissionMs = Date.now() - permissionStarted;
      if (!permission.granted) {
        captureDiagnostic('start_error', trace, { error_code: 'permission_denied' });
        Alert.alert('Microphone permission needed', 'Allow microphone access to test voice recording.');
        return;
      }
      if (!screenFocusedRef.current) return;
      promptPlayer.pause();
      recordingPlayer.pause();
      setRecordedUri(null);
      setRecordedDurationMillis(0);
      setRecordedFile(SPEAKING_RECORDING_FILE);
      setClientSubmissionId(trace.submissionId);
      setSubmitError(null);
      const audioSessionStarted = Date.now();
      await switchAudioSession(true);
      trace.audioSessionMs = Date.now() - audioSessionStarted;
      trace.statusAfterAudioSession = recorderDiagnostic();
      if (!screenFocusedRef.current) {
        await setIsAudioActiveAsync(false);
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
        return;
      }
      // Passing the options forces iOS to create a fresh AVAudioRecorder and
      // output URL. Reusing the stopped WAV recorder fails after its file has
      // been opened for review playback.
      const prepareStarted = Date.now();
      await recorder.prepareToRecordAsync(SPEAKING_RECORDING_OPTIONS);
      trace.prepareMs = Date.now() - prepareStarted;
      trace.statusAfterPrepare = recorderDiagnostic();
      if (!screenFocusedRef.current) {
        await setIsAudioActiveAsync(false);
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
        return;
      }
      recorder.record();
      trace.statusAfterRecord = recorderDiagnostic();
      if (!screenFocusedRef.current) {
        await recorder.stop();
        await setIsAudioActiveAsync(false);
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
        return;
      }
      captureDiagnostic('started', trace, {
        total_start_ms: Date.now() - requestedAt,
        status_before: trace.statusBefore,
        status_after_audio_session: trace.statusAfterAudioSession,
        status_after_prepare: trace.statusAfterPrepare,
        status_after_record: trace.statusAfterRecord,
      });
      setPhase('recording');
    } catch (error) {
      captureDiagnostic('start_error', trace, {
        total_start_ms: Date.now() - requestedAt,
        error_message: error instanceof Error ? error.message.slice(0, 300) : 'unknown',
        status_at_error: recorderDiagnostic(),
      });
      Alert.alert('Could not record', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const stopRecording = async () => {
    const trace = captureTraceRef.current ?? {
      submissionId: clientSubmissionId ?? Crypto.randomUUID(),
      recordingOrdinal: recordingOrdinalRef.current,
      requestedAt: Date.now(),
      appStateAtStart: AppState.currentState,
    };
    const stopRequestedAt = Date.now();
    try {
      const duration = recorderState.durationMillis;
      const statusBeforeStop = recorderDiagnostic();
      await recorder.stop();
      const stopMs = Date.now() - stopRequestedAt;
      const statusAfterStop = recorderDiagnostic();
      const playbackSessionStarted = Date.now();
      await switchAudioSession(false);
      const playbackAudioSessionMs = Date.now() - playbackSessionStarted;
      const uri = recorder.uri ?? recorder.getStatus().url;
      captureDiagnostic('stopped', trace, {
        recorded_duration_state_ms: duration,
        stop_ms: stopMs,
        playback_audio_session_ms: playbackAudioSessionMs,
        uri_present: Boolean(uri),
        status_before_stop: statusBeforeStop,
        status_after_stop: statusAfterStop,
      });
      if (!uri) throw new Error('The recording did not produce an audio file.');
      setRecordedUri(uri);
      setRecordedDurationMillis(duration);
      setClientSubmissionId(trace.submissionId);
      setPhase('review');
    } catch (error) {
      captureDiagnostic('stop_error', trace, {
        stop_elapsed_ms: Date.now() - stopRequestedAt,
        error_message: error instanceof Error ? error.message.slice(0, 300) : 'unknown',
        status_at_error: recorderDiagnostic(),
      });
      Alert.alert('Could not finish recording', error instanceof Error ? error.message : 'Please try again.');
      setPhase('prompt');
    }
  };

  const loadSampleRecording = async () => {
    const sampleUrl = activeQuestion?.question.prompt_audio_url;
    if (!sampleUrl) return;
    try {
      promptPlayer.pause();
      const sample = Asset.fromURI(sampleUrl);
      await sample.downloadAsync();
      if (!sample.localUri) throw new Error('The sample audio could not be downloaded.');
      await switchAudioSession(false);
      setRecordedUri(sample.localUri);
      setRecordedFile({ name: 'speaking-simulator-sample.mp3', mimeType: 'audio/mpeg' });
      setRecordedDurationMillis(Math.round((promptPlayerStatus.duration || 0) * 1000));
      setClientSubmissionId(Crypto.randomUUID());
      setSubmitError(null);
      setPhase('review');
    } catch (error) {
      Alert.alert(
        'Could not load sample audio',
        error instanceof Error ? error.message : 'Please try again.'
      );
    }
  };

  const submitRecording = async () => {
    if (!recordedUri || !session || !activeQuestion) return;
    setPhase('evaluating');
    setSubmitError(null);
    const evaluationStarted = Date.now();
    const submissionId = clientSubmissionId ?? Crypto.randomUUID();
    if (!clientSubmissionId) setClientSubmissionId(submissionId);
    try {
      // Configure the session before the network request so the transition has
      // settled by the time feedback playback starts. Feedback effects should
      // follow the device's silent switch rather than playing while muted.
      await switchAudioSession(false, false);
      const response = await evaluateSpeakingRecording({
        uri: recordedUri,
        fileName: recordedFile.name,
        mimeType: recordedFile.mimeType,
        sessionId: session.id,
        questionId: activeQuestion.question.id,
        clientSubmissionId: submissionId,
        instructionalAttemptNumber,
        previousAttemptId,
      });
      if (__DEV__ && response.attempt.debug) {
        const evaluatorTimings = response.attempt.debug.provider_response.timings_ms;
        const clientTotalMs = Date.now() - evaluationStarted;
        console.log('[Speaking Coach] Evaluation timing summary', {
          client_total_ms: clientTotalMs,
          provider_latency_ms: response.attempt.debug.latency_ms,
          backend_stages_ms: response.attempt.debug.request_timings_ms,
          evaluator_stages_ms: evaluatorTimings,
        });
        console.log(`[SPEAKING_COACH_CAPTURE]${JSON.stringify({
          captured_at: new Date().toISOString(),
          lesson_external_id: lessonId,
          practice_type: activeQuestion.practiceSet.practice_type,
          question_id: activeQuestion.question.id,
          question_position: activeQuestion.question.lesson_position,
          client_total_ms: clientTotalMs,
          attempt: response.attempt,
          session: response.session,
        })}`);
      }
      const nextEvaluation = response.attempt.evaluation;
      setSession(response.session);
      setEvaluation(nextEvaluation);
      if (nextEvaluation.status === 'pass') {
        setLocallyCorrectQuestionIds((questionIds) =>
          questionIds.includes(activeQuestion.question.id)
            ? questionIds
            : [...questionIds, activeQuestion.question.id]
        );
      }
      if (nextEvaluation.status === 'retry') {
        setInstructionalAttemptNumber(2);
        setPreviousAttemptId(response.attempt.id);
      }
      setPhase(nextEvaluation.status === 'pass' ? 'correct' : 'feedback');
      void playEvaluationSound(nextEvaluation.status);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to evaluate this recording.';
      setSubmitError(message);
      setPhase('review');
      Alert.alert('Evaluation unavailable', message);
    }
  };

  if (showLessonIntro && !hasHydratedLessonLanguage) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.fullState}>
          <SpeakingCoachLoader title="" subtitle="" showCopy={false} />
        </View>
      </View>
    );
  }

  if (showLessonIntro) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <LessonRichSectionIntro
          sectionType="speaking_practice"
          language={lessonContentLanguage}
          topInset={insets.top}
          bottomInset={insets.bottom}
          position={sectionPosition}
          total={sectionTotal}
          onContinue={() => setShowLessonIntro(false)}
          onClose={() => router.back()}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.fullState}>
          <SpeakingCoachLoader
            title={tr('Loading speaking coach…', 'กำลังโหลดการฝึกพูด…')}
            subtitle={tr('Hang tight – Pailin is getting your practice ready!', 'รอสักครู่ ไพลินกำลังเตรียมแบบฝึกให้คุณ!')}
            showCopy={false}
          />
        </View>
      </View>
    );
  }

  if (loadError || !activeQuestion || !session) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + theme.spacing.lg }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <PageLoadingState
          language={screenLanguage}
          showImage={false}
          errorTitle={tr('Speaking coach unavailable', 'ไม่สามารถเปิดการฝึกพูดได้')}
          errorBody={loadError || tr('This lesson has no speaking questions.', 'บทเรียนนี้ยังไม่มีคำถามฝึกพูด')}
        />
        <View style={styles.errorActions}>
          <Button language={screenLanguage} title={lessonMode ? tr('Back to lesson', 'กลับไปบทเรียน') : resourceMode ? tr('Back to Speaking Practice', 'กลับไปฝึกพูด') : tr('Back to profile', 'กลับไปโปรไฟล์')} variant="outline" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  const renderLessonControls = () => (
    <>
      <View style={styles.topBar}>
        <View style={styles.screenTitleBlock}>
          <AppText variant="caption" style={styles.screenEyebrow}>SPEAKING COACH TEST</AppText>
          <AppText variant="body" style={styles.selectedLessonTitle}>Lesson {lessonOptionLabel(lessonId)}</AppText>
        </View>
        <View style={styles.topBarActions}>
          {!showWelcome ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start a new speaking coach test session"
              disabled={phase === 'recording' || phase === 'evaluating'}
              onPress={() => void retestInFreshSession()}
              style={({ pressed }) => [
                styles.newSessionButton,
                pressed && phase !== 'recording' && phase !== 'evaluating' ? styles.newSessionButtonPressed : null,
                phase === 'recording' || phase === 'evaluating' ? styles.newSessionButtonDisabled : null,
              ]}
            >
              <MaterialIcons name="refresh" size={17} color={theme.colors.accent} />
              <AppText variant="caption" style={styles.newSessionLabel}>New session</AppText>
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="button" accessibilityLabel="Close speaking coach" onPress={() => router.back()} style={styles.closeButton}>
            <MaterialIcons name="close" size={28} color={theme.colors.text} />
          </Pressable>
        </View>
      </View>

      <View style={styles.lessonSelector}>
        {lessonOptionsLoading ? (
          <View style={styles.selectorLoadingRow}>
            <ActivityIndicator size="small" color={theme.colors.accent} />
            <AppText variant="caption">Loading available lessons…</AppText>
          </View>
        ) : lessonOptionsError ? (
          <AppText variant="caption" style={styles.selectorError}>{lessonOptionsError}</AppText>
        ) : (
          <>
            <View style={styles.selectorRow}>
              <AppText variant="caption" style={styles.selectorLabel}>LEVEL</AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorChips}>
                {levelOptions.map((level) => (
                  <Pressable
                    key={level}
                    disabled={lessonSelectionDisabled}
                    onPress={() => setSelectedLevel(level)}
                    style={[
                      styles.lessonChip,
                      level === selectedLevel ? styles.lessonChipActive : null,
                      lessonSelectionDisabled ? styles.lessonChipDisabled : null,
                    ]}
                  >
                    <AppText variant="caption">Level {level}</AppText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <View style={styles.selectorRow}>
              <AppText variant="caption" style={styles.selectorLabel}>LESSON</AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorChips}>
                {lessonsForSelectedLevel.map((option) => (
                  <Pressable
                    key={option.id}
                    disabled={lessonSelectionDisabled}
                    onPress={() => setLessonId(option.lesson_external_id)}
                    style={[
                      styles.lessonChip,
                      option.lesson_external_id === lessonId ? styles.lessonChipActive : null,
                      lessonSelectionDisabled ? styles.lessonChipDisabled : null,
                    ]}
                  >
                    <AppText variant="caption">{lessonOptionLabel(option.lesson_external_id)}</AppText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </>
        )}
      </View>
    </>
  );

  const renderGuidedHeader = () => (
    <View style={styles.resourceHeader}>
      <View style={styles.resourceHeaderSide} />
      <View style={styles.resourceHeaderProgress}>
        {!showWelcome ? (
          completedPracticeSetId !== null
            ? <CompletedSetProgress questionCount={lesson?.practice_sets.find(({ id }) => id === completedPracticeSetId)?.question_count ?? practiceSet.question_count} />
            : <PracticeProgress {...activeQuestion} />
        ) : null}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={lessonMode ? tr('Back to lesson', 'กลับไปบทเรียน') : tr('Back to Speaking Practice', 'กลับไปฝึกพูด')} onPress={() => router.back()} style={styles.closeButton}>
        <MaterialIcons name="close" size={25} color={theme.colors.text} />
      </Pressable>
    </View>
  );

  if (showWelcome) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        {resourceMode ? renderGuidedHeader() : renderLessonControls()}
        <ScrollView
          style={styles.welcomeScroll}
          contentContainerStyle={[
            styles.welcomeScrollContent,
            { paddingBottom: Math.max(theme.spacing.lg, insets.bottom + theme.spacing.md) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.welcomeHero}>
            <Image
              source={pailinTimeToSpeakImage}
              contentFit="contain"
              style={styles.welcomeHeroImage}
              accessibilityLabel="Pailin inviting you to speak"
            />
            <AppText variant="title" style={styles.welcomeTitle}>Time to speak</AppText>
            <AppText variant="body" style={styles.welcomeSubtitle}>
              Put what you learned into practice{`\n`}by speaking out loud.
            </AppText>
          </View>

          <View style={styles.welcomePracticeTimeline}>
            <WelcomePracticeCard step={1} practiceType={welcomePracticeTypes[0]} />
            <WelcomePracticeCard step={2} practiceType={welcomePracticeTypes[1]} />
          </View>

          <View style={styles.welcomeActions}>
            <View style={styles.welcomeReminder}>
              <Image source={lightBulbImage} contentFit="contain" style={styles.welcomeReminderIcon} />
              <AppText variant="caption" style={styles.welcomeReminderText}>
                Make sure you’re in a quiet place and speak clearly!
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start speaking"
              onPress={() => void startFromWelcome()}
              style={({ pressed }) => [styles.welcomeStartButton, pressed ? styles.welcomeStartButtonPressed : null]}
            >
              <Image source={microphoneWhiteImage} contentFit="contain" style={styles.welcomeStartIcon} />
              <AppText variant="caption" style={styles.welcomeStartLabel}>START SPEAKING!</AppText>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  const { practiceSet, question } = activeQuestion;
  const typeCopy = (th ? THAI_TYPE_COPY : TYPE_COPY)[practiceSet.practice_type];
  const hasPromptAudio = Boolean(question.prompt_audio_url) && practiceSet.practice_type !== 'translation';
  const pailinPlaybackLabel = practiceSet.practice_type === 'pronunciation' ? tr('Pailin’s version', 'เสียงของไพลิน') : tr('Replay question', 'ฟังคำถามซ้ำ');
  const learnerPlaybackLabel = practiceSet.practice_type === 'translation' ? tr('Your translation', 'คำแปลของคุณ') : practiceSet.practice_type === 'open' ? tr('Your answer', 'คำตอบของคุณ') : tr('Your recording', 'เสียงบันทึกของคุณ');
  const isCompletedQuestion = session.completed_question_ids.includes(question.id);
  const unclearAudioCount = session.consecutive_unclear_audio_count;
  const unclearAudioLimitReached = evaluation?.status === 'unclear_audio'
    && unclearAudioCount >= session.unclear_audio_retry_limit;
  const unclearAudioNeedsGuidance = evaluation?.status === 'unclear_audio'
    && unclearAudioCount >= 3;
  const unclearAudioFeedback = unclearAudioLimitReached
    ? tr('We’re unable to check another recording for this question. You can skip it or exit practice.', 'เราไม่สามารถตรวจเสียงบันทึกอื่นสำหรับคำถามนี้ได้ คุณสามารถข้ามหรือออกจากการฝึกได้')
    : unclearAudioNeedsGuidance
      ? tr('We’re still unable to hear your audio. Try moving somewhere quieter and make sure your microphone isn’t covered.', 'เรายังได้ยินเสียงไม่ชัด ลองไปที่เงียบกว่านี้และตรวจว่าไมโครโฟนไม่ได้ถูกบัง')
      : tr('I couldn’t confidently understand that. Please record it one more time.', 'ยังฟังไม่ชัดเจน กรุณาบันทึกเสียงอีกครั้ง');
  const renderPromptCard = () => (
    <Card style={styles.promptCard} padding="lg">
      {practiceSet.practice_type === 'translation' ? (
        <>
          <AppText language="th" variant="title" style={styles.translationPrompt}>
            {question.prompt_th}
          </AppText>
          <View style={styles.translationDirection}>
            <AppText variant="caption">Thai</AppText>
            <MaterialIcons name="arrow-forward" size={20} color={theme.colors.accent} />
            <AppText variant="caption">English</AppText>
          </View>
        </>
      ) : (
        <UiStack gap="sm">
          <View style={styles.promptEnglishRow}>
            {hasPromptAudio ? (
              <Pressable accessibilityRole="button" onPress={togglePromptAudio} style={styles.inlinePlayButton}>
                <MaterialIcons name={promptPlayerStatus.playing ? 'pause' : 'play-arrow'} size={24} color={theme.colors.surface} />
              </Pressable>
            ) : null}
            <AppText variant="title" style={styles.promptEnglish}>
              {question.prompt_en}
            </AppText>
          </View>
          {question.prompt_th ? (
            <AppText language="th" variant="muted" style={styles.promptThai}>
              {question.prompt_th}
            </AppText>
          ) : null}
          {practiceSet.tip_en || practiceSet.tip_th ? (
            <View style={styles.tipBox}>
              <MaterialIcons name="lightbulb-outline" size={17} color={theme.colors.mutedText} />
              <View style={styles.tipTextBlock}>
                {practiceSet.tip_en ? <AppText variant="caption">{practiceSet.tip_en}</AppText> : null}
                {practiceSet.tip_th ? <AppText language="th" variant="muted">{practiceSet.tip_th}</AppText> : null}
              </View>
            </View>
          ) : null}
          {question.examples.length > 0 ? (
            <View style={styles.exampleBlock}>
              <Pressable accessibilityRole="button" onPress={() => setShowExample((value) => !value)} style={styles.exampleToggle}>
                <MaterialIcons name="visibility" size={17} color={theme.colors.mutedText} />
                <AppText language={screenLanguage} variant="caption">{showExample ? tr('Hide example answer', 'ซ่อนตัวอย่างคำตอบ') : tr('Show example answer', 'ดูตัวอย่างคำตอบ')}</AppText>
              </Pressable>
              {showExample ? (
                <View style={styles.exampleAnswer}>
                  <AppText variant="body">{question.examples[0]?.en}</AppText>
                  {question.examples[0]?.th ? <AppText language="th" variant="muted">{question.examples[0].th}</AppText> : null}
                </View>
              ) : null}
            </View>
          ) : null}
        </UiStack>
      )}
    </Card>
  );

  const renderRecordingArea = () => {
    if (isCompletedQuestion && phase === 'prompt') {
      return (
        <UiStack gap="md" style={styles.completedQuestion}>
          <View style={styles.completedQuestionLabel}>
            <MaterialIcons name="check-circle" size={28} color={theme.colors.success} />
            <AppText language={screenLanguage} variant="body">{tr('Completed in this session', 'ทำเสร็จแล้วในรอบนี้')}</AppText>
          </View>
          <Button
            title={tr('Retest in a fresh session', 'ทดสอบใหม่ในรอบใหม่')}
            variant="outline"
            onPress={() => void retestInFreshSession()}
          />
          <AppText variant="muted" style={styles.centerText}>
            This resets test-session progress but preserves earlier attempt history.
          </AppText>
        </UiStack>
      );
    }

    if (phase === 'recording') {
      return (
        <UiStack gap="md" style={styles.centeredBlock}>
          <AppText variant="caption" style={styles.recordingStatus}>Recording… {formatDuration(recorderState.durationMillis)}</AppText>
          <Pressable accessibilityRole="button" onPress={() => void stopRecording()} style={[styles.recordButton, styles.stopButton]}>
            <MaterialIcons name="stop" size={42} color={theme.colors.surface} />
          </Pressable>
          <AppText language={screenLanguage} variant="muted">{tr('Tap to stop', 'แตะเพื่อหยุด')}</AppText>
        </UiStack>
      );
    }

    if (phase === 'review') {
      return (
        <UiStack gap="md" style={styles.reviewBlock}>
          <AppText language={screenLanguage} variant="title" style={styles.stateTitle}>{tr('Review your recording', 'ตรวจสอบเสียงบันทึก')}</AppText>
          <AppText language={screenLanguage} variant="muted" style={styles.centerText}>{formatDuration(recordedDurationMillis)} {tr('recorded', 'ที่บันทึก')}</AppText>
          <PlaybackButton
            label={learnerPlaybackLabel}
            disabled={!recordedUri}
            onPress={() => void toggleRecordingAudio()}
            playing={recordingPlayerStatus.playing}
          />
          {submitError ? <AppText variant="muted" style={styles.submitError}>{submitError}</AppText> : null}
          <Button language={screenLanguage} title={tr('Record again', 'บันทึกใหม่')} variant="outline" onPress={() => void startRecording()} />
        </UiStack>
      );
    }

    return (
      <UiStack gap="sm" style={styles.centeredBlock}>
        <AppText variant="muted">{typeCopy.recordLabel}</AppText>
        <Pressable accessibilityRole="button" onPress={() => void startRecording()} style={styles.recordButton}>
          <MaterialIcons name="mic" size={48} color={theme.colors.surface} />
        </Pressable>
        {__DEV__ && hasPromptAudio ? (
          <Pressable accessibilityRole="button" onPress={() => void loadSampleRecording()}>
            <AppText variant="muted" style={styles.sampleText}>Use sample audio (Simulator)</AppText>
          </Pressable>
        ) : null}
      </UiStack>
    );
  };

  const renderEvaluating = () => (
    <View style={styles.fullState}>
      <SpeakingCoachLoader
        title={tr('Checking your answer…', 'กำลังตรวจคำตอบ…')}
        subtitle={tr('Hang tight – Pailin is reviewing your audio!', 'รอสักครู่ ไพลินกำลังตรวจเสียงของคุณ!')}
      />
    </View>
  );

  const renderSubmissionFooter = () => {
    const isVisible = phase === 'prompt' || phase === 'recording' || phase === 'review';
    if (!isVisible) return null;

    return (
      <PracticeAnswerFooter
        disabled={phase !== 'review' || !recordedUri}
        language={screenLanguage}
        labels={{
          check: tr('SUBMIT ANSWER', 'ส่งคำตอบ'),
          checking: tr('SUBMITTING…', 'กำลังส่ง…'),
          continue: tr('CONTINUE', 'ไปต่อ'),
          correct: tr('Correct!', 'ถูกต้อง!'),
          incorrect: tr('Try again', 'ลองอีกครั้ง'),
          clear: tr('TRY AGAIN', 'ลองอีกครั้ง'),
          skip: skipPending ? tr('SKIPPING…', 'กำลังข้าม…') : tr('SKIP', 'ข้าม'),
        }}
        onPrimary={() => void submitRecording()}
        onSkip={() => void skipCurrentQuestion()}
        status="idle"
        style={[styles.speakingAnswerFooter, { paddingBottom: Math.max(10, insets.bottom + 6) }]}
      />
    );
  };

  const renderCorrect = () => (
    <View style={styles.fullState}>
      <View style={styles.successIcon}>
        <MaterialIcons name="check" size={54} color={theme.colors.text} />
      </View>
      <AppText language={screenLanguage} variant="title" style={styles.stateTitle}>{tr('You got it!', 'ทำได้แล้ว!')}</AppText>
      <AppText language={screenLanguage} variant="body" style={styles.centerText}>{th ? evaluation?.feedback_th || evaluation?.feedback_en : evaluation?.feedback_en || 'Nice work—your answer passed the checker.'}</AppText>
      {!th && evaluation?.feedback_th ? <AppText language="th" variant="muted" style={styles.centerText}>{evaluation.feedback_th}</AppText> : null}
      <View style={styles.playbackList}>
        <PlaybackButton
          label={learnerPlaybackLabel}
          disabled={!recordedUri}
          onPress={() => void toggleRecordingAudio()}
          playing={recordingPlayerStatus.playing}
        />
        {hasPromptAudio ? <PlaybackButton label={pailinPlaybackLabel} onPress={togglePromptAudio} playing={promptPlayerStatus.playing} /> : null}
      </View>
      <Button language={screenLanguage} title={tr('Next question', 'คำถามถัดไป')} onPress={goNext} style={styles.wideButton} />
    </View>
  );

  const renderFeedback = () => {
    if (!evaluation) return null;
    const isRetry = evaluation.status === 'retry';
    const isUnclear = evaluation.status === 'unclear_audio';
    return (
      <UiStack gap="lg" style={styles.feedbackState}>
        <View style={styles.feedbackHeading}>
          <AppText language={screenLanguage} variant="caption" style={styles.feedbackStatus}>{(th ? THAI_OUTCOME_LABELS : OUTCOME_LABELS)[evaluation.status]}</AppText>
          <AppText variant="title" style={styles.stateTitle}>
            {unclearAudioLimitReached
              ? tr('Recording unavailable', 'ไม่สามารถใช้เสียงบันทึกได้')
              : isUnclear
                ? tr('Let’s record that again', 'มาบันทึกใหม่กัน')
                : isRetry
                  ? tr('Almost—try once more', 'เกือบแล้ว ลองอีกครั้ง')
                  : tr('Here’s the correction', 'นี่คือคำแนะนำ')}
          </AppText>
          <AppText variant="body" style={styles.centerText}>
            {isUnclear ? unclearAudioFeedback : th ? evaluation.feedback_th || evaluation.feedback_en : evaluation.feedback_en}
          </AppText>
          {!th && (!isUnclear || !unclearAudioNeedsGuidance) ? (
            <AppText language="th" variant="muted" style={styles.centerText}>{evaluation.feedback_th}</AppText>
          ) : null}
        </View>

        <Card padding="md" style={styles.feedbackCard}>
          <UiStack gap="sm">
            <AppText variant="caption" style={styles.detailLabel}>AI CHECKER DETAILS</AppText>
            {practiceSet.practice_type === 'pronunciation' && (evaluation.pronunciation.assessment_tokens?.length ?? 0) > 0 ? (
              <>
                <AppText variant="muted">Target sentence assessment</AppText>
                <TargetSentenceAssessment tokens={evaluation.pronunciation.assessment_tokens ?? []} />
                <View style={styles.divider} />
              </>
            ) : practiceSet.practice_type === 'pronunciation' && evaluation.transcript ? (
              <>
                <AppText variant="muted">Transcript</AppText>
                <AppText variant="body">{evaluation.transcript}</AppText>
                <View style={styles.divider} />
              </>
            ) : null}
            {evaluation.displayed_issues.length > 0 ? (
              <View style={styles.issueList}>
                {evaluation.displayed_issues.map((issue, index) => (
                  <View key={`${issue.category}-${index}`} style={styles.issueRow}>
                    <AppText variant="body" style={styles.issueBullet}>•</AppText>
                    <View style={styles.issueText}>
                      <AppText variant="body">{issue.description_en}</AppText>
                      <AppText language="th" variant="muted">{issue.description_th}</AppText>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
            {evaluation.corrected_answer ? (
              <>
                <AppText variant="muted">
                  {practiceSet.practice_type === 'open' ? 'A clearer version' : 'Corrected answer'}
                </AppText>
                <AppText variant="body">{evaluation.corrected_answer}</AppText>
              </>
            ) : null}
          </UiStack>
        </Card>

        <View style={styles.playbackList}>
          <PlaybackButton
            label={learnerPlaybackLabel}
            disabled={!recordedUri}
            onPress={() => void toggleRecordingAudio()}
            playing={recordingPlayerStatus.playing}
          />
          {hasPromptAudio ? <PlaybackButton label={pailinPlaybackLabel} onPress={togglePromptAudio} playing={promptPlayerStatus.playing} /> : null}
        </View>

        {unclearAudioLimitReached ? (
          <UiStack gap="sm">
            <Pressable accessibilityRole="button" disabled={skipPending} onPress={() => void skipCurrentQuestion()} style={styles.inlineSkipButton}>
              <AppText variant="caption" style={styles.pronunciationSkipLabel}>{skipPending ? 'SKIPPING…' : 'SKIP'}</AppText>
            </Pressable>
            <Button language={screenLanguage} title={tr('Exit practice', 'ออกจากการฝึก')} variant="outline" onPress={() => router.back()} />
          </UiStack>
        ) : isRetry || isUnclear ? (
          <UiStack gap="sm">
            <Button
              language={screenLanguage}
              title={isUnclear && !unclearAudioNeedsGuidance ? tr('Record again', 'บันทึกใหม่') : tr('Try again', 'ลองอีกครั้ง')}
              onPress={() => void startRecording()}
            />
            {isUnclear && unclearAudioNeedsGuidance ? (
              <Pressable accessibilityRole="button" disabled={skipPending} onPress={() => void skipCurrentQuestion()} style={styles.inlineSkipButton}>
                <AppText variant="caption" style={styles.pronunciationSkipLabel}>{skipPending ? 'SKIPPING…' : 'SKIP'}</AppText>
              </Pressable>
            ) : null}
          </UiStack>
        ) : (
          <Button language={screenLanguage} title={tr('Next question', 'คำถามถัดไป')} onPress={goNext} />
        )}
      </UiStack>
    );
  };

  const renderPronunciationExperience = () => {
    const retryReady = phase === 'feedback' && (
      evaluation?.status === 'retry'
      || (evaluation?.status === 'unclear_audio' && !unclearAudioLimitReached)
    );
    const retryInProgress = instructionalAttemptNumber === 2
      && previousAttemptId !== null
      && evaluation?.status === 'retry'
      && (phase === 'recording' || phase === 'review');
    const correctResult = phase === 'correct';
    const isUnclear = evaluation?.status === 'unclear_audio';
    const finalResult = phase === 'feedback' && !retryReady && !unclearAudioLimitReached;
    const showEvaluation = Boolean(evaluation) && (correctResult || finalResult || retryReady || retryInProgress || unclearAudioLimitReached);
    const showLearnerPlayback = showEvaluation && Boolean(recordedUri);
    const coachTone = correctResult
      ? 'success'
      : isUnclear
        ? 'unclear'
        : showEvaluation
          ? 'error'
          : 'instruction';
    const feedbackBulletDescriptions = evaluation
      ? evaluation.status === 'unclear_audio'
        ? [unclearAudioFeedback].filter((description): description is string => Boolean(description))
        : evaluation.displayed_issues.length > 0
          ? evaluation.displayed_issues.map((issue) => th ? issue.description_th || issue.description_en : issue.description_en)
          : [th ? evaluation.feedback_th || evaluation.feedback_en : evaluation.feedback_en]
      : [];
    const showResultFooter = Boolean(evaluation) && (phase === 'correct' || phase === 'feedback');
    const renderAttemptPanel = () => {
      if (phase === 'recording') {
        return (
          <View style={[
            styles.pronunciationActionCard,
            styles.pronunciationNeoActionCard,
            styles.pronunciationRecordingActionCard,
          ]}>
            <AppText language={screenLanguage} variant="caption" style={styles.pronunciationActionTitle}>{tr('Recording…', 'กำลังบันทึก…')}</AppText>
            <AppText language={screenLanguage} variant="caption" style={styles.pronunciationActionHint}>{tr('Tap to stop', 'แตะเพื่อหยุด')}</AppText>
            <PulsingRecordingControl onPress={() => void stopRecording()} />
            <View style={styles.pronunciationTimerRow}>
              <View style={styles.pronunciationTimerDot} />
              <AppText variant="caption" style={styles.pronunciationTimerText}>
                {formatDuration(recorderState.durationMillis)}
              </AppText>
            </View>
          </View>
        );
      }

      if (phase === 'review') {
        return (
          <View style={[styles.pronunciationActionCard, styles.pronunciationNeoActionCard]}>
            <AppText language={screenLanguage} variant="caption" style={styles.pronunciationActionTitle}>{tr('Review your recording', 'ตรวจสอบเสียงบันทึก')}</AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Play your recording"
              disabled={!recordedUri}
              onPress={() => void toggleRecordingAudio()}
              style={[
                styles.pronunciationReviewPlayback,
                styles.pronunciationReviewPlaybackDeepBlue,
                !recordedUri ? styles.playbackButtonDisabled : null,
              ]}
            >
              <View style={styles.pronunciationReviewPlayButton}>
                <MaterialIcons
                  name={recordingPlayerStatus.playing ? 'pause' : 'play-arrow'}
                  size={17}
                  color={theme.colors.surface}
                />
              </View>
              <AppText language={screenLanguage} variant="caption" style={styles.pronunciationReviewLabel}>{tr('Your recording', 'เสียงบันทึกของคุณ')}</AppText>
              <AppText variant="caption" style={styles.pronunciationReviewDuration}>
                {formatDuration(recordedDurationMillis)}
              </AppText>
            </Pressable>
            {submitError ? <AppText variant="caption" style={styles.pronunciationSubmitError}>{submitError}</AppText> : null}
            <Pressable accessibilityRole="button" onPress={() => void startRecording()} style={styles.pronunciationRedoButton}>
              <Image source={audioRedoImage} contentFit="contain" style={styles.pronunciationRedoIcon} />
              <AppText language={screenLanguage} variant="caption" style={styles.pronunciationRedoLabel}>{tr('Record again', 'บันทึกใหม่')}</AppText>
            </Pressable>
          </View>
        );
      }

      if (phase === 'prompt') {
        const isRetryAttempt = instructionalAttemptNumber === 2;
        return (
          <View style={[styles.pronunciationActionCard, styles.pronunciationNeoActionCard, styles.speakingPromptActionCard]}>
            <AppText language={screenLanguage} variant="caption" style={[styles.pronunciationActionTitle, styles.microphoneActionTitle]}>
              {isRetryAttempt ? tr('Try again!', 'ลองอีกครั้ง!') : tr('Your turn!', 'ตาคุณแล้ว!')}
            </AppText>
            <AppText language={screenLanguage} variant="caption" style={styles.pronunciationActionHint}>{tr('Tap to speak', 'แตะเพื่อพูด')}</AppText>
            <RecordingButtonEmphasis>
              <Pressable accessibilityRole="button" accessibilityLabel="Start recording" onPress={() => void startRecording()} style={[styles.pronunciationMicButton, styles.pronunciationMicButtonEmphasized]}>
                <Image source={microphoneWhiteImage} contentFit="contain" style={styles.pronunciationMicIcon} />
              </Pressable>
            </RecordingButtonEmphasis>
            <AppText language={screenLanguage} variant="caption" style={styles.pronunciationAttemptLabel}>
              {tr(`Try ${instructionalAttemptNumber} of 2`, `ครั้งที่ ${instructionalAttemptNumber} จาก 2`)}
            </AppText>
          </View>
        );
      }

      return null;
    };

    return (
      <View style={styles.speakingExperience}>
      <ScrollView
        style={styles.pronunciationScroll}
        contentContainerStyle={[
          styles.pronunciationScrollContent,
          showResultFooter
            ? styles.pronunciationScrollContentWithFooter
            : { paddingBottom: Math.max(theme.spacing.lg, insets.bottom + theme.spacing.md) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AppText language={screenLanguage} variant="caption" style={styles.pronunciationEyebrow}>{tr('PRONUNCIATION PRACTICE', 'ฝึกการออกเสียง')}</AppText>

        <PailinCoachBubble tone={coachTone} instruction={tr('Listen, then repeat!', 'ฟังแล้วพูดตาม!')} language={screenLanguage} plain overlapCard />

        <View style={styles.pronunciationSentenceCard}>
          <AppText variant="title" style={styles.pronunciationSentenceEnglish}>{question.prompt_en}</AppText>
          {question.prompt_th ? (
            <AppText language="th" variant="caption" style={styles.pronunciationSentenceThai}>{question.prompt_th}</AppText>
          ) : null}
          <View style={[
            styles.pronunciationPlaybackRow,
            !question.prompt_th ? styles.pronunciationPlaybackRowWithoutTranslation : null,
            showEvaluation ? styles.pronunciationPlaybackRowResult : null,
          ]}>
            <PronunciationPlaybackButton
              label="Pailin"
              playing={promptPlayerStatus.playing}
              onPress={togglePromptAudio}
            />
            {showLearnerPlayback ? (
              <PronunciationPlaybackButton
                label="You"
                playing={recordingPlayerStatus.playing}
                tone={correctResult ? 'blue' : 'red'}
                disabled={!recordedUri}
                onPress={() => void toggleRecordingAudio()}
              />
            ) : null}
          </View>
        </View>

        {renderAttemptPanel()}

        {showResultFooter ? (
          <View
            style={[
              styles.conversationResultFooter,
              correctResult
                ? styles.conversationResultFooterSuccess
                : isUnclear
                  ? styles.conversationResultFooterUnclear
                  : styles.conversationResultFooterError,
              { paddingBottom: Math.max(10, insets.bottom + 6) },
            ]}
          >
            <View style={styles.conversationFeedbackDetail}>
              <Image
                source={correctResult ? starsGreenImage : isUnclear ? starsYellowImage : starsRedImage}
                contentFit="contain"
                style={styles.conversationFeedbackStars}
              />
              <View style={styles.conversationFeedbackCopy}>
                {feedbackBulletDescriptions.map((description, index) => (
                  <AppText key={`${index}-${description}`} variant="caption" style={styles.conversationFeedbackText}>
                    {description}
                  </AppText>
                ))}
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (unclearAudioLimitReached) {
                  router.back();
                } else if (retryReady) {
                  void startRecording();
                } else {
                  goNext();
                }
              }}
              style={({ pressed }) => [
                styles.conversationResultButton,
                correctResult
                  ? styles.conversationResultButtonSuccess
                  : isUnclear
                    ? styles.conversationResultButtonUnclear
                    : styles.conversationResultButtonError,
                pressed ? styles.conversationResultButtonPressed : null,
              ]}
            >
              <AppText variant="caption" style={styles.conversationResultButtonLabel}>
                {unclearAudioLimitReached
                  ? tr('EXIT PRACTICE', 'ออกจากการฝึก')
                  : isUnclear
                    ? tr('RECORD AGAIN', 'บันทึกใหม่')
                    : retryReady
                      ? tr('TRY AGAIN', 'ลองอีกครั้ง')
                      : tr('CONTINUE', 'ไปต่อ')}
              </AppText>
            </Pressable>
            {!correctResult && !finalResult && !unclearAudioLimitReached ? (
              <Pressable
                accessibilityRole="button"
                disabled={skipPending}
                onPress={() => void skipCurrentQuestion()}
                style={styles.conversationResultSkipButton}
              >
                <AppText variant="caption" style={styles.conversationResultSkipLabel}>
                  {skipPending ? tr('SKIPPING…', 'กำลังข้าม…') : tr('SKIP', 'ข้าม')}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
      {renderSubmissionFooter()}
      </View>
    );
  };

  const renderConversationExperience = () => {
    const retryReady = phase === 'feedback' && (
      evaluation?.status === 'retry'
      || (evaluation?.status === 'unclear_audio' && !unclearAudioLimitReached)
    );
    const retryInProgress = instructionalAttemptNumber === 2
      && previousAttemptId !== null
      && evaluation?.status === 'retry'
      && (phase === 'recording' || phase === 'review');
    const correctResult = phase === 'correct';
    const isUnclear = evaluation?.status === 'unclear_audio';
    const finalResult = phase === 'feedback' && !retryReady && !unclearAudioLimitReached;
    const showEvaluation = Boolean(evaluation) && (
      correctResult || finalResult || retryReady || retryInProgress || unclearAudioLimitReached
    );
    const coachTone = correctResult
      ? 'success'
      : isUnclear
        ? 'unclear'
        : showEvaluation
          ? 'error'
          : 'instruction';
    const feedbackDescriptions = evaluation
      ? isUnclear
        ? [unclearAudioFeedback].filter((description): description is string => Boolean(description))
        : evaluation.displayed_issues.length > 0
          ? evaluation.displayed_issues.map((issue) => th ? issue.description_th || issue.description_en : issue.description_en)
          : [th ? evaluation.feedback_th || evaluation.feedback_en : evaluation.feedback_en]
      : [];
    const learnerTranscript = evaluation?.transcript?.trim() || null;
    const showResultFooter = Boolean(evaluation) && (phase === 'correct' || phase === 'feedback');
    const example = question.examples[0];

    const renderExample = () => {
      if (!example?.en) return null;
      if (!showExample) {
        return (
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowExample(true)}
            style={styles.conversationExampleButton}
          >
            <MaterialIcons name="visibility" size={14} color="#777777" />
            <AppText variant="caption" style={styles.conversationExampleButtonLabel}>
              {tr('SHOW EXAMPLE ANSWER', 'ดูตัวอย่างคำตอบ')}
            </AppText>
          </Pressable>
        );
      }
      return (
        <View style={styles.conversationExampleAnswer}>
          <AppText variant="caption" style={styles.conversationExampleEnglish}>{example.en}</AppText>
          {example.th ? (
            <AppText language="th" variant="caption" style={styles.conversationExampleThai}>
              {example.th}
            </AppText>
          ) : null}
          <Pressable accessibilityRole="button" onPress={() => setShowExample(false)}>
            <AppText language={screenLanguage} variant="caption" style={styles.conversationExampleHide}>{tr('HIDE', 'ซ่อน')}</AppText>
          </Pressable>
        </View>
      );
    };

    const renderAttemptPanel = () => {
      if (isCompletedQuestion && phase === 'prompt') {
        return (
          <View style={[styles.pronunciationActionCard, styles.conversationActionCard]}>
            <View style={styles.completedQuestionLabel}>
              <MaterialIcons name="check-circle" size={25} color={theme.colors.success} />
              <AppText language={screenLanguage} variant="caption" style={styles.conversationActionTitle}>{tr('Completed in this session', 'ทำเสร็จแล้วในรอบนี้')}</AppText>
            </View>
            <Button
              language={screenLanguage}
              title={tr('Retest in a fresh session', 'ทดสอบใหม่ในรอบใหม่')}
              variant="outline"
              onPress={() => void retestInFreshSession()}
              style={styles.conversationRetestButton}
            />
          </View>
        );
      }

      if (phase === 'recording') {
        return (
          <View style={[styles.pronunciationActionCard, styles.conversationActionCard, styles.pronunciationRecordingActionCard]}>
            <AppText language={screenLanguage} variant="caption" style={styles.conversationActionTitle}>{tr('Recording…', 'กำลังบันทึก…')}</AppText>
            <AppText language={screenLanguage} variant="caption" style={styles.pronunciationActionHint}>{tr('Tap to stop', 'แตะเพื่อหยุด')}</AppText>
            <PulsingRecordingControl onPress={() => void stopRecording()} />
            <View style={styles.pronunciationTimerRow}>
              <View style={styles.pronunciationTimerDot} />
              <AppText variant="caption" style={styles.pronunciationTimerText}>
                {formatDuration(recorderState.durationMillis)}
              </AppText>
            </View>
          </View>
        );
      }

      if (phase === 'review') {
        return (
          <View style={[styles.pronunciationActionCard, styles.conversationActionCard]}>
            <AppText language={screenLanguage} variant="caption" style={styles.conversationActionTitle}>{tr('Review your recording', 'ตรวจสอบเสียงบันทึก')}</AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Play your answer"
              disabled={!recordedUri}
              onPress={() => void toggleRecordingAudio()}
              style={[
                styles.pronunciationReviewPlayback,
                !recordedUri ? styles.playbackButtonDisabled : null,
              ]}
            >
              <Image
                source={recordingPlayerStatus.playing ? pauseBlueImage : playBlueImage}
                contentFit="contain"
                style={styles.pronunciationReviewPlayIcon}
              />
              <AppText language={screenLanguage} variant="caption" style={styles.pronunciationReviewLabel}>{tr('Your answer', 'คำตอบของคุณ')}</AppText>
              <AppText variant="caption" style={styles.pronunciationReviewDuration}>
                {formatDuration(recordedDurationMillis)}
              </AppText>
            </Pressable>
            {submitError ? (
              <AppText variant="caption" style={styles.pronunciationSubmitError}>{submitError}</AppText>
            ) : null}
            <Pressable accessibilityRole="button" onPress={() => void startRecording()} style={styles.pronunciationRedoButton}>
              <Image source={audioRedoImage} contentFit="contain" style={styles.pronunciationRedoIcon} />
              <AppText language={screenLanguage} variant="caption" style={styles.pronunciationRedoLabel}>{tr('Record again', 'บันทึกใหม่')}</AppText>
            </Pressable>
          </View>
        );
      }

      if (phase === 'prompt') {
        const isRetryAttempt = instructionalAttemptNumber === 2;
        return (
          <View style={[styles.pronunciationActionCard, styles.conversationActionCard, styles.speakingPromptActionCard]}>
            <AppText language={screenLanguage} variant="caption" style={[styles.conversationActionTitle, styles.microphoneActionTitle]}>
              {isRetryAttempt ? tr('Try again!', 'ลองอีกครั้ง!') : tr('Respond to the question', 'ตอบคำถาม')}
            </AppText>
            <AppText language={screenLanguage} variant="caption" style={styles.pronunciationActionHint}>{tr('Tap to speak', 'แตะเพื่อพูด')}</AppText>
            <RecordingButtonEmphasis>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Start recording"
                onPress={() => void startRecording()}
                style={[styles.pronunciationMicButton, styles.pronunciationMicButtonEmphasized]}
              >
                <Image source={microphoneWhiteImage} contentFit="contain" style={styles.pronunciationMicIcon} />
              </Pressable>
            </RecordingButtonEmphasis>
            <AppText language={screenLanguage} variant="caption" style={styles.pronunciationAttemptLabel}>
              {tr(`Try ${instructionalAttemptNumber} of 2`, `ครั้งที่ ${instructionalAttemptNumber} จาก 2`)}
            </AppText>
            {renderExample()}
          </View>
        );
      }

      return null;
    };

    return (
      <View style={styles.speakingExperience}>
      <ScrollView
        style={styles.pronunciationScroll}
        contentContainerStyle={[
          styles.pronunciationScrollContent,
          showResultFooter
            ? styles.conversationScrollContentWithFooter
            : { paddingBottom: Math.max(theme.spacing.lg, insets.bottom + theme.spacing.md) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AppText language={screenLanguage} variant="caption" style={styles.pronunciationEyebrow}>{tr('CONVERSATION PRACTICE', 'ฝึกบทสนทนา')}</AppText>

        <PailinCoachBubble tone={coachTone} instruction={tr('Let’s chat!', 'มาคุยกัน!')} language={screenLanguage} plain overlapCard />

        <View style={styles.conversationPromptCard}>
          <View style={styles.conversationPromptEnglishRow}>
            {hasPromptAudio ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Play Pailin's question"
                onPress={togglePromptAudio}
                style={styles.conversationPromptAudioButton}
              >
                <Image
                  source={promptPlayerStatus.playing ? pauseBlueImage : speakerBlueImage}
                  contentFit="contain"
                  style={styles.conversationPromptAudioIcon}
                />
              </Pressable>
            ) : null}
            <AppText variant="title" style={styles.conversationPromptEnglish}>{question.prompt_en}</AppText>
            {hasPromptAudio ? <View style={styles.conversationPromptAudioSpacer} /> : null}
          </View>
          {question.prompt_th ? (
            <AppText language="th" variant="caption" style={styles.conversationPromptThai}>
              {question.prompt_th}
            </AppText>
          ) : null}
          {practiceSet.tip_en || practiceSet.tip_th ? (
            <View style={styles.conversationTipBox}>
              <MaterialIcons name="lightbulb-outline" size={20} color="#C4A807" />
              <AppText language={screenLanguage} variant="caption" style={styles.conversationTipText}>
                {th ? practiceSet.tip_th || practiceSet.tip_en : practiceSet.tip_en || practiceSet.tip_th}
              </AppText>
            </View>
          ) : null}
        </View>

        {showEvaluation && evaluation ? (
          <View style={[
            styles.conversationLearnerAnswerCard,
            correctResult
              ? styles.conversationLearnerAnswerSuccess
              : isUnclear
                ? styles.pronunciationFeedbackUnclear
                : styles.conversationLearnerAnswerError,
          ]}>
            <View style={styles.conversationLearnerAnswerRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Play your answer"
                disabled={!recordedUri}
                onPress={() => void toggleRecordingAudio()}
                style={!recordedUri ? styles.playbackButtonDisabled : null}
              >
                <Image
                  source={recordingPlayerStatus.playing
                    ? (correctResult ? pauseGreenImage : isUnclear ? pauseBlueImage : pauseRedImage)
                    : (correctResult ? playGreenImage : isUnclear ? playBlueImage : playRedImage)}
                  contentFit="contain"
                  style={styles.conversationLearnerPlayIcon}
                />
              </Pressable>
              <View style={styles.conversationLearnerAnswerCopy}>
                <AppText language={screenLanguage} variant="caption" style={styles.conversationLearnerAnswerTitle}>{tr('Your answer:', 'คำตอบของคุณ:')}</AppText>
                <AppText
                  variant="caption"
                  style={[
                    styles.conversationLearnerTranscript,
                    !learnerTranscript ? styles.conversationLearnerTranscriptUnavailable : null,
                  ]}
                >
                  {learnerTranscript
                    || (isUnclear
                      ? 'We couldn’t confidently transcribe this recording.'
                      : 'Transcript unavailable.')}
                </AppText>
              </View>
            </View>
          </View>
        ) : null}

        {renderAttemptPanel()}

        {showResultFooter ? (
          <View
            style={[
              styles.conversationResultFooter,
              correctResult
                ? styles.conversationResultFooterSuccess
                : isUnclear
                  ? styles.conversationResultFooterUnclear
                  : styles.conversationResultFooterError,
              { paddingBottom: Math.max(10, insets.bottom + 6) },
            ]}
          >
            <View style={styles.conversationFeedbackDetail}>
              <Image
                source={correctResult ? starsGreenImage : isUnclear ? starsYellowImage : starsRedImage}
                contentFit="contain"
                style={styles.conversationFeedbackStars}
              />
              <View style={styles.conversationFeedbackCopy}>
                {feedbackDescriptions.map((description, index) => (
                  <AppText key={`${index}-${description}`} variant="caption" style={styles.conversationFeedbackText}>
                    {description}
                  </AppText>
                ))}
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (unclearAudioLimitReached) {
                  router.back();
                } else if (retryReady) {
                  void startRecording();
                } else {
                  goNext();
                }
              }}
              style={({ pressed }) => [
                styles.conversationResultButton,
                correctResult
                  ? styles.conversationResultButtonSuccess
                  : isUnclear
                    ? styles.conversationResultButtonUnclear
                    : styles.conversationResultButtonError,
                pressed ? styles.conversationResultButtonPressed : null,
              ]}
            >
              <AppText variant="caption" style={styles.conversationResultButtonLabel}>
                {unclearAudioLimitReached
                  ? tr('EXIT PRACTICE', 'ออกจากการฝึก')
                  : retryReady
                    ? tr('TRY AGAIN', 'ลองอีกครั้ง')
                    : tr('CONTINUE', 'ไปต่อ')}
              </AppText>
            </Pressable>
            {!correctResult && !finalResult && !unclearAudioLimitReached ? (
              <Pressable
                accessibilityRole="button"
                disabled={skipPending}
                onPress={() => void skipCurrentQuestion()}
                style={styles.conversationResultSkipButton}
              >
                <AppText variant="caption" style={styles.conversationResultSkipLabel}>
                  {skipPending ? tr('SKIPPING…', 'กำลังข้าม…') : tr('SKIP', 'ข้าม')}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
      {renderSubmissionFooter()}
      </View>
    );
  };

  const renderTranslationExperience = () => {
    const retryReady = phase === 'feedback' && (
      evaluation?.status === 'retry'
      || (evaluation?.status === 'unclear_audio' && !unclearAudioLimitReached)
    );
    const retryInProgress = instructionalAttemptNumber === 2
      && previousAttemptId !== null
      && evaluation?.status === 'retry'
      && (phase === 'recording' || phase === 'review');
    const correctResult = phase === 'correct';
    const isUnclear = evaluation?.status === 'unclear_audio';
    const finalResult = phase === 'feedback' && !retryReady && !unclearAudioLimitReached;
    const showEvaluation = Boolean(evaluation) && (correctResult || finalResult || retryReady || retryInProgress || unclearAudioLimitReached);
    const coachTone = correctResult
      ? 'success'
      : isUnclear
        ? 'unclear'
        : showEvaluation
          ? 'error'
          : 'instruction';
    const feedbackBulletDescriptions = evaluation
      ? evaluation.status === 'unclear_audio'
        ? [unclearAudioFeedback].filter((description): description is string => Boolean(description))
        : evaluation.displayed_issues.length > 0
          ? evaluation.displayed_issues.map((issue) => th ? issue.description_th || issue.description_en : issue.description_en)
          : [th ? evaluation.feedback_th || evaluation.feedback_en : evaluation.feedback_en]
      : [];
    const learnerTranscript = evaluation?.transcript?.trim() || null;
    const hasReferenceAudio = Boolean(question.prompt_audio_url);
    const showResultFooter = Boolean(evaluation) && (phase === 'correct' || phase === 'feedback');
    const example = question.examples[0];

    const renderHearPailin = () => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Hear Pailin say the answer"
        disabled={!hasReferenceAudio}
        hitSlop={8}
        onPress={() => void togglePromptAudio()}
        style={({ pressed }) => [
          styles.translationHearPailinButton,
          !hasReferenceAudio ? styles.translationHearPailinButtonDisabled : null,
          pressed && hasReferenceAudio ? styles.translationHearPailinButtonPressed : null,
        ]}
      >
        <Image
          source={hasReferenceAudio ? speakerBlueImage : speakerGreyImage}
          contentFit="contain"
          style={styles.translationHearPailinIcon}
        />
        <AppText variant="caption" style={styles.translationHearPailinLabel}>HEAR PAILIN</AppText>
      </Pressable>
    );

    const renderExample = () => {
      if (!example?.en) return null;
      if (!showExample) {
        return (
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowExample(true)}
            style={styles.conversationExampleButton}
          >
            <MaterialIcons name="visibility" size={14} color="#777777" />
            <AppText variant="caption" style={styles.conversationExampleButtonLabel}>
              {tr('SHOW EXAMPLE ANSWER', 'ดูตัวอย่างคำตอบ')}
            </AppText>
          </Pressable>
        );
      }
      return (
        <View style={styles.conversationExampleAnswer}>
          <AppText variant="caption" style={styles.conversationExampleEnglish}>{example.en}</AppText>
          {example.th ? (
            <AppText language="th" variant="caption" style={styles.conversationExampleThai}>
              {example.th}
            </AppText>
          ) : null}
          <Pressable accessibilityRole="button" onPress={() => setShowExample(false)}>
            <AppText language={screenLanguage} variant="caption" style={styles.conversationExampleHide}>{tr('HIDE', 'ซ่อน')}</AppText>
          </Pressable>
        </View>
      );
    };

    const renderAttemptPanel = () => {
      if (phase === 'recording') {
        return (
          <View style={[styles.pronunciationActionCard, styles.conversationActionCard, styles.pronunciationRecordingActionCard]}>
            <AppText language={screenLanguage} variant="caption" style={styles.pronunciationActionTitle}>{tr('Recording…', 'กำลังบันทึก…')}</AppText>
            <AppText language={screenLanguage} variant="caption" style={styles.pronunciationActionHint}>{tr('Tap to stop', 'แตะเพื่อหยุด')}</AppText>
            <PulsingRecordingControl onPress={() => void stopRecording()} />
            <View style={styles.pronunciationTimerRow}>
              <View style={styles.pronunciationTimerDot} />
              <AppText variant="caption" style={styles.pronunciationTimerText}>
                {formatDuration(recorderState.durationMillis)}
              </AppText>
            </View>
          </View>
        );
      }

      if (phase === 'review') {
        return (
          <View style={[styles.pronunciationActionCard, styles.conversationActionCard]}>
            <AppText language={screenLanguage} variant="caption" style={styles.pronunciationActionTitle}>{tr('Review your recording', 'ตรวจสอบเสียงบันทึก')}</AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Play your recording"
              disabled={!recordedUri}
              onPress={() => void toggleRecordingAudio()}
              style={[
                styles.pronunciationReviewPlayback,
                !recordedUri ? styles.playbackButtonDisabled : null,
              ]}
            >
              <Image
                source={recordingPlayerStatus.playing ? pauseBlueImage : playBlueImage}
                contentFit="contain"
                style={styles.pronunciationReviewPlayIcon}
              />
              <AppText language={screenLanguage} variant="caption" style={styles.pronunciationReviewLabel}>{tr('Your recording', 'เสียงบันทึกของคุณ')}</AppText>
              <AppText variant="caption" style={styles.pronunciationReviewDuration}>
                {formatDuration(recordedDurationMillis)}
              </AppText>
            </Pressable>
            {submitError ? <AppText variant="caption" style={styles.pronunciationSubmitError}>{submitError}</AppText> : null}
            <Pressable accessibilityRole="button" onPress={() => void startRecording()} style={styles.pronunciationRedoButton}>
              <Image source={audioRedoImage} contentFit="contain" style={styles.pronunciationRedoIcon} />
              <AppText language={screenLanguage} variant="caption" style={styles.pronunciationRedoLabel}>{tr('Record again', 'บันทึกใหม่')}</AppText>
            </Pressable>
          </View>
        );
      }

      if (phase === 'prompt') {
        const isRetryAttempt = instructionalAttemptNumber === 2;
        return (
          <View style={[
            styles.pronunciationActionCard,
            styles.conversationActionCard,
            styles.speakingPromptActionCard,
            isRetryAttempt ? styles.translationRetryActionCard : null,
          ]}>
            <AppText language={screenLanguage} variant="caption" style={[styles.pronunciationActionTitle, styles.microphoneActionTitle]}>
              {isRetryAttempt ? tr('Try again!', 'ลองอีกครั้ง!') : tr('Translate the sentence', 'แปลประโยค')}
            </AppText>
            <View style={[
              styles.translationRecordingCore,
              isRetryAttempt ? styles.translationRecordingCoreWithHearPailin : null,
            ]} pointerEvents="box-none">
              <AppText language={screenLanguage} variant="caption" style={styles.pronunciationActionHint}>{tr('Tap to speak', 'แตะเพื่อพูด')}</AppText>
              <RecordingButtonEmphasis>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Start recording"
                  onPress={() => void startRecording()}
                  style={[
                    styles.pronunciationMicButton,
                    styles.pronunciationMicButtonEmphasized,
                    isRetryAttempt ? styles.translationRetryMicButton : null,
                  ]}
                >
                  <Image source={microphoneWhiteImage} contentFit="contain" style={styles.pronunciationMicIcon} />
                </Pressable>
              </RecordingButtonEmphasis>
              <AppText
                language={screenLanguage}
                variant="caption"
                style={[
                  styles.pronunciationAttemptLabel,
                  isRetryAttempt ? styles.translationRetryAttemptLabel : null,
                ]}
              >
                {tr(`Try ${instructionalAttemptNumber} of 2`, `ครั้งที่ ${instructionalAttemptNumber} จาก 2`)}
              </AppText>
            </View>
            {isRetryAttempt ? renderHearPailin() : renderExample()}
          </View>
        );
      }

      return null;
    };

    return (
      <View style={styles.speakingExperience}>
      <ScrollView
        style={styles.pronunciationScroll}
        contentContainerStyle={[
          styles.pronunciationScrollContent,
          showResultFooter
            ? styles.conversationScrollContentWithFooter
            : { paddingBottom: Math.max(theme.spacing.lg, insets.bottom + theme.spacing.md) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AppText language={screenLanguage} variant="caption" style={styles.pronunciationEyebrow}>{tr('THAI TO ENGLISH', 'แปลไทยเป็นอังกฤษ')}</AppText>

        <PailinCoachBubble tone={coachTone} instruction={tr('Say it in English!', 'พูดเป็นภาษาอังกฤษ!')} language={screenLanguage} plain overlapCard />

        <View style={styles.translationPromptCard}>
          <AppText language="th" variant="title" style={styles.translationPromptThai}>{question.prompt_th}</AppText>
          {question.test_answer_en ? (
            <AppText variant="caption" style={styles.translationTestAnswer}>{question.test_answer_en}</AppText>
          ) : null}
          <View style={styles.translationDirectionPill}>
            <AppText variant="caption" style={styles.translationDirectionLabel}>Thai</AppText>
            <MaterialIcons name="arrow-forward" size={20} color="#C4A807" />
            <AppText variant="caption" style={styles.translationDirectionLabel}>English</AppText>
          </View>
        </View>

        {showEvaluation && evaluation ? (
          <View style={[
            styles.conversationLearnerAnswerCard,
            correctResult
              ? styles.conversationLearnerAnswerSuccess
              : isUnclear
                ? styles.pronunciationFeedbackUnclear
                : styles.conversationLearnerAnswerError,
          ]}>
            <View style={styles.conversationLearnerAnswerRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Play your answer"
                disabled={!recordedUri}
                onPress={() => void toggleRecordingAudio()}
                style={!recordedUri ? styles.playbackButtonDisabled : null}
              >
                <Image
                  source={recordingPlayerStatus.playing
                    ? (correctResult ? pauseGreenImage : isUnclear ? pauseBlueImage : pauseRedImage)
                    : (correctResult ? playGreenImage : isUnclear ? playBlueImage : playRedImage)}
                  contentFit="contain"
                  style={styles.conversationLearnerPlayIcon}
                />
              </Pressable>
              <View style={styles.conversationLearnerAnswerCopy}>
                <AppText language={screenLanguage} variant="caption" style={styles.conversationLearnerAnswerTitle}>{tr('Your answer:', 'คำตอบของคุณ:')}</AppText>
                <AppText
                  variant="caption"
                  style={[
                    styles.conversationLearnerTranscript,
                    !learnerTranscript ? styles.conversationLearnerTranscriptUnavailable : null,
                  ]}
                >
                  {learnerTranscript
                    || (isUnclear
                      ? 'We couldn’t confidently transcribe this recording.'
                      : 'Transcript unavailable.')}
                </AppText>
              </View>
            </View>
          </View>
        ) : null}

        {renderAttemptPanel()}

        {showResultFooter ? (
          <View
            style={[
              styles.conversationResultFooter,
              correctResult
                ? styles.conversationResultFooterSuccess
                : isUnclear
                  ? styles.conversationResultFooterUnclear
                  : styles.conversationResultFooterError,
              { paddingBottom: Math.max(10, insets.bottom + 6) },
            ]}
          >
            <View style={styles.conversationFeedbackDetail}>
              <Image
                source={correctResult ? starsGreenImage : isUnclear ? starsYellowImage : starsRedImage}
                contentFit="contain"
                style={styles.conversationFeedbackStars}
              />
              <View style={styles.conversationFeedbackCopy}>
                {feedbackBulletDescriptions.map((description, index) => (
                  <AppText key={`${index}-${description}`} variant="caption" style={styles.conversationFeedbackText}>
                    {description}
                  </AppText>
                ))}
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (unclearAudioLimitReached) {
                  router.back();
                } else if (retryReady) {
                  if (isUnclear) {
                    void startRecording();
                  } else {
                    setPhase('prompt');
                  }
                } else {
                  goNext();
                }
              }}
              style={({ pressed }) => [
                styles.conversationResultButton,
                correctResult
                  ? styles.conversationResultButtonSuccess
                  : isUnclear
                    ? styles.conversationResultButtonUnclear
                    : styles.conversationResultButtonError,
                pressed ? styles.conversationResultButtonPressed : null,
              ]}
            >
              <AppText variant="caption" style={styles.conversationResultButtonLabel}>
                {unclearAudioLimitReached
                  ? tr('EXIT PRACTICE', 'ออกจากการฝึก')
                  : isUnclear
                    ? tr('RECORD AGAIN', 'บันทึกใหม่')
                    : retryReady
                      ? tr('TRY AGAIN', 'ลองอีกครั้ง')
                      : tr('CONTINUE', 'ไปต่อ')}
              </AppText>
            </Pressable>
            {!correctResult && !finalResult && !unclearAudioLimitReached ? (
              <Pressable
                accessibilityRole="button"
                disabled={skipPending}
                onPress={() => void skipCurrentQuestion()}
                style={styles.conversationResultSkipButton}
              >
                <AppText variant="caption" style={styles.conversationResultSkipLabel}>
                  {skipPending ? tr('SKIPPING…', 'กำลังข้าม…') : tr('SKIP', 'ข้าม')}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
      {renderSubmissionFooter()}
      </View>
    );
  };

  const renderSetCompletion = () => {
    const completedSet = lesson?.practice_sets.find(({ id }) => id === completedPracticeSetId);
    if (!completedSet) return null;

    const questionIds = new Set(completedSet.questions.map(({ id }) => id));
    const correctIds = new Set([
      ...(session.correct_question_ids ?? []),
      ...locallyCorrectQuestionIds,
    ]);
    const correctCount = [...questionIds].filter((questionId) => correctIds.has(questionId)).length;
    const needsReviewCount = Math.max(0, completedSet.question_count - correctCount);
    const nextQuestionIndex = session.current_question_id === null
      ? -1
      : questions.findIndex(({ question }) => question.id === session.current_question_id);
    const hasNextSet = session.current_question_id !== null
      && !questionIds.has(session.current_question_id)
      && (nextQuestionIndex < 0 || questions[nextQuestionIndex].practiceSet.id !== completedSet.id);
    const copy = SET_COMPLETION_COPY[completedSet.practice_type];
    const itemLabel = completedSet.question_count === 1 ? copy.singular : copy.plural;
    const thaiPracticeSummary = completedSet.practice_type === 'pronunciation'
      ? `คุณฝึกออกเสียงแล้ว\n${completedSet.question_count} ประโยค`
      : completedSet.practice_type === 'open'
        ? `คุณฝึกตอบแล้ว\n${completedSet.question_count} คำถาม`
        : `คุณฝึกแปลแล้ว\n${completedSet.question_count} ประโยค`;

    return (
      <ScrollView
        style={styles.setCompletionScroll}
        contentContainerStyle={[
          styles.setCompletionContent,
          { paddingBottom: Math.max(24, insets.bottom + 18) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="caption" style={styles.pronunciationEyebrow}>
          {(th ? THAI_TYPE_COPY : TYPE_COPY)[completedSet.practice_type].eyebrow}
        </AppText>

        <View style={styles.setCompletionHero}>
          <Image source={pailinSetCompleteImage} contentFit="contain" style={styles.setCompletionImage} />
          <View style={[styles.setProgressCard, needsReviewCount === 0 ? styles.setProgressCardPerfect : null]}>
            <AppText language={screenLanguage} variant="title" style={styles.setCompletionTitle}>{tr('You finished this set!', 'คุณฝึกชุดนี้เสร็จแล้ว!')}</AppText>
            <AppText language={screenLanguage} variant="body" style={styles.setCompletionSubtitle}>
              {th ? thaiPracticeSummary : `You practiced ${copy.action}\n${completedSet.question_count} ${itemLabel}.`}
            </AppText>
            <View style={styles.setProgressStats}>
              <View style={styles.setProgressStat}>
                <View style={[styles.setProgressStatusIcon, styles.setProgressCorrectIcon]}>
                  <MaterialIcons name="check" size={25} color={theme.colors.text} />
                </View>
                <SetCompletionScoreNumber value={correctCount} fill="#B9E671" />
                <AppText language={screenLanguage} variant="caption" style={styles.setProgressStatLabel}>{tr('correct', 'ถูกต้อง')}</AppText>
              </View>
              {needsReviewCount > 0 ? (
                <>
                  <View style={styles.setProgressDivider} />
                  <View style={styles.setProgressStat}>
                    <View style={[styles.setProgressStatusIcon, styles.setProgressReviewIcon]}>
                      <MaterialIcons name="close" size={25} color={theme.colors.text} />
                    </View>
                    <SetCompletionScoreNumber value={needsReviewCount} fill="#FD6969" />
                    <AppText language={screenLanguage} variant="caption" style={styles.setProgressStatLabel}>{tr('needs review', 'ควรทบทวน')}</AppText>
                  </View>
                </>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.setCompletionButtonSpacer} />

        <Pressable
          accessibilityRole="button"
          disabled={advancePending}
          onPress={() => void continueAfterSet()}
          style={({ pressed }) => [
            styles.setCompletionButton,
            pressed ? styles.welcomeStartButtonPressed : null,
          ]}
        >
          <AppText variant="caption" style={styles.setCompletionButtonLabel}>
            {hasNextSet
              ? tr(guidedMode ? 'NEXT SECTION' : 'NEXT SET', guidedMode ? 'ส่วนถัดไป' : 'ชุดถัดไป')
              : lessonMode
                ? tr('FINISH LESSON', 'จบบทเรียน')
                : resourceMode
                  ? tr('BACK TO SPEAKING PRACTICE', 'กลับไปฝึกพูด')
                  : tr('FINISH LESSON!', 'จบบทเรียน!')}
          </AppText>
          {!hasNextSet && (!guidedMode || lessonMode) ? (
            <Image source={celebrateWhiteImage} contentFit="contain" style={styles.setCompletionButtonIcon} />
          ) : null}
        </Pressable>
      </ScrollView>
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      {guidedMode ? renderGuidedHeader() : renderLessonControls()}

      {completedPracticeSetId !== null ? (
        renderSetCompletion()
      ) : phase === 'evaluating' ? (
        renderEvaluating()
      ) : practiceSet.practice_type === 'pronunciation' ? (
        renderPronunciationExperience()
      ) : practiceSet.practice_type === 'open' ? (
        renderConversationExperience()
      ) : practiceSet.practice_type === 'translation' ? (
        renderTranslationExperience()
      ) : phase === 'correct' ? (
        renderCorrect()
      ) : phase === 'feedback' ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>{renderFeedback()}</ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {!guidedMode ? <PracticeProgress {...activeQuestion} /> : null}
          <AppText variant="caption" style={styles.eyebrow}>{typeCopy.eyebrow}</AppText>
          <View style={styles.introBlock}>
            <AppText variant="title" style={styles.mainTitle}>{typeCopy.title}</AppText>
            {typeCopy.subtitle ? <AppText variant="body" style={styles.centerText}>{typeCopy.subtitle}</AppText> : null}
          </View>
          {renderPromptCard()}
          {renderRecordingArea()}
          {renderSubmissionFooter()}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F8FC' },
  welcomeScroll: { flex: 1 },
  welcomeScrollContent: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  welcomeHero: { alignItems: 'center' },
  welcomeHeroImage: { width: 190, height: 150 },
  welcomeTitle: {
    marginTop: 2,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: theme.typography.weights.bold,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  welcomePracticeTimeline: {
    width: '100%',
    maxWidth: 350,
    alignSelf: 'center',
    marginTop: 40,
    gap: 18,
  },
  welcomePracticeRow: {
    minHeight: 118,
    flexDirection: 'row',
    position: 'relative',
  },
  welcomeStepBadge: {
    position: 'absolute',
    left: 0,
    top: 8,
    zIndex: 1,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#BDEAFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeStepNumber: { fontSize: 15, lineHeight: 20 },
  welcomePracticeCard: {
    flex: 1,
    minHeight: 118,
    marginLeft: 17,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    paddingLeft: 30,
    paddingRight: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  welcomePracticeCopy: { flex: 1, alignSelf: 'stretch', justifyContent: 'center', gap: 7 },
  welcomePracticeTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: theme.typography.weights.bold,
  },
  welcomePracticeDescription: { fontSize: 12, lineHeight: 18 },
  welcomePracticeIcon: { width: 50, height: 50 },
  welcomeActions: {
    width: '100%',
    marginTop: 62,
    gap: 24,
  },
  welcomeReminder: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#A9E64D',
    borderRadius: 6,
    backgroundColor: '#F0FFD9',
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  welcomeReminderIcon: { width: 15, height: 15 },
  welcomeReminderText: { color: '#70766A', fontSize: 10, lineHeight: 15, textAlign: 'center' },
  welcomeStartButton: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#14213B',
    borderRadius: 26,
    backgroundColor: '#2F6EEA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: theme.spacing.lg,
    boxShadow: '4px 4px 0px #14213B',
  },
  welcomeStartButtonPressed: {
    transform: [{ translateX: 2 }, { translateY: 2 }],
    boxShadow: '2px 2px 0px #14213B',
  },
  welcomeStartIcon: { width: 17, height: 17 },
  welcomeStartLabel: {
    color: theme.colors.surface,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: theme.typography.weights.medium,
    letterSpacing: 0.3,
  },
  setCompletionScroll: { flex: 1 },
  setCompletionContent: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingTop: 2,
  },
  setCompletionHero: { width: '100%', alignItems: 'center', marginTop: 54 },
  setCompletionImage: { zIndex: 0, width: 220, height: 178, transform: [{ translateX: 10 }, { translateY: 30 }] },
  setCompletionTitle: {
    marginTop: 0,
    fontSize: 25,
    lineHeight: 34,
    fontWeight: theme.typography.weights.bold,
    textAlign: 'center',
  },
  setCompletionSubtitle: { marginTop: 8, fontSize: 15, lineHeight: 23, textAlign: 'center' },
  setProgressCard: {
    zIndex: 2,
    width: '100%',
    maxWidth: 400,
    minHeight: 310,
    alignSelf: 'center',
    marginTop: -18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 24,
    paddingTop: 46,
    paddingBottom: 28,
    boxShadow: `5px 7px 0px ${theme.colors.border}`,
  },
  setProgressCardPerfect: { paddingHorizontal: 42 },
  setProgressStats: {
    marginTop: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setProgressStat: { flex: 1, maxWidth: 150, alignItems: 'center' },
  setProgressDivider: { width: 1, height: 142, marginHorizontal: 10, backgroundColor: '#D0D0D0' },
  setProgressStatusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setProgressCorrectIcon: { backgroundColor: '#99C64F' },
  setProgressReviewIcon: { backgroundColor: '#FF5858' },
  setProgressNumberWrap: { width: 86, height: 76, marginTop: 8, position: 'relative' },
  setProgressNumber: {
    position: 'absolute',
    width: '100%',
    color: '#B9E671',
    fontSize: 64,
    lineHeight: 72,
    fontWeight: theme.typography.weights.bold,
    textAlign: 'center',
    includeFontPadding: false,
  },
  setProgressNumberOutline: { color: theme.colors.text },
  setProgressStatLabel: { marginTop: 2, fontSize: 16, lineHeight: 23, textAlign: 'center' },
  setCompletionButton: {
    width: '100%',
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#14213B',
    borderRadius: 26,
    backgroundColor: '#2F6EEA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.lg,
    boxShadow: '4px 4px 0px #14213B',
  },
  setCompletionButtonSpacer: { flexGrow: 1, minHeight: 36 },
  setCompletionButtonLabel: {
    color: theme.colors.surface,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: theme.typography.weights.medium,
    letterSpacing: 0.2,
  },
  setCompletionButtonIcon: { width: 16, height: 16 },
  speakingExperience: { flex: 1 },
  pronunciationScroll: { flex: 1 },
  pronunciationScrollContent: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 2,
  },
  pronunciationEyebrow: {
    marginTop: 12,
    color: '#286BEA',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 0.9,
    textAlign: 'center',
  },
  pronunciationCoachRow: {
    minHeight: 106,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pronunciationCoachRowOverlap: {
    zIndex: 0,
    justifyContent: 'flex-start',
    marginTop: 12,
    paddingLeft: 20,
    transform: [{ translateY: 26 }],
  },
  pronunciationCoachImage: { width: 150, height: 130 },
  pronunciationCoachImageOverlapSuccess: { transform: [{ translateX: -12 }, { translateY: 7 }] },
  pronunciationCoachImageOverlapError: { transform: [{ translateX: -9 }] },
  pronunciationCoachImageOverlapUnclear: { transform: [{ translateX: -9 }] },
  pronunciationCoachBubble: {
    minWidth: 128,
    minHeight: 40,
    marginLeft: -41,
    borderWidth: 1,
    borderRadius: 9,
    borderBottomLeftRadius: 0,
    paddingHorizontal: 15,
    paddingVertical: 8,
    transform: [{ translateY: -19 }],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pronunciationCoachBubbleInstruction: {
    borderColor: '#B8DFFD',
    backgroundColor: '#E9F5FF',
  },
  pronunciationCoachBubbleSuccess: { borderColor: '#A9E64D', backgroundColor: '#F0FFD9' },
  pronunciationCoachBubbleUnclear: {
    marginLeft: -24,
    borderColor: '#F0C419',
    backgroundColor: '#FFFBE8',
  },
  pronunciationCoachBubbleError: {
    marginLeft: -24,
    borderColor: '#FF6268',
    backgroundColor: '#FFF0F1',
  },
  pronunciationCoachMessagePlain: {
    minWidth: 0,
    minHeight: 0,
    marginLeft: -42,
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
    justifyContent: 'flex-start',
  },
  pronunciationCoachMessagePlainInstruction: { backgroundColor: 'transparent' },
  pronunciationCoachMessagePlainSuccess: { backgroundColor: 'transparent' },
  pronunciationCoachMessagePlainUnclear: { backgroundColor: 'transparent' },
  pronunciationCoachMessagePlainError: { backgroundColor: 'transparent' },
  pronunciationCoachMessageOverlap: { marginLeft: -26 },
  pronunciationCoachMessageOverlapInstruction: { marginLeft: -42 },
  pronunciationCoachMessage: { fontSize: 12, lineHeight: 17, fontWeight: theme.typography.weights.semibold },
  pronunciationCoachMessagePlainText: { fontSize: 16, lineHeight: 22 },
  pronunciationCoachMessageSuccess: { color: '#84B53C' },
  pronunciationCoachMessageUnclear: { color: '#1E1E1E' },
  pronunciationCoachMessageError: { color: '#F65555' },
  pronunciationSentenceCard: {
    zIndex: 1,
    width: '100%',
    minHeight: 142,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    paddingTop: 17,
    paddingBottom: 13,
    alignItems: 'center',
    boxShadow: `4px 4px 0px ${theme.colors.border}`,
  },
  pronunciationSentenceEnglish: {
    fontSize: 19,
    lineHeight: 27,
    fontWeight: theme.typography.weights.bold,
    textAlign: 'center',
  },
  pronunciationSentenceThai: {
    width: '100%',
    marginVertical: 9,
    color: '#777777',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: theme.typography.weights.semibold,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  pronunciationPlaybackRow: {
    width: '100%',
    marginTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#D9D9D9',
    borderStyle: 'dashed',
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  pronunciationPlaybackRowWithoutTranslation: { marginTop: 8 },
  pronunciationPlaybackRowResult: {
    marginTop: 8,
  },
  pronunciationPlaybackButton: {
    width: 140,
    maxWidth: '47%',
    minHeight: 38,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  pronunciationPlaybackIcon: { width: 23, height: 23 },
  pronunciationPlaybackLabel: { fontSize: 12, lineHeight: 17, fontWeight: theme.typography.weights.semibold },
  pronunciationActionCard: {
    width: '100%',
    minHeight: 174,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#B8DFFD',
    borderRadius: 9,
    backgroundColor: '#EAF5FF',
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pronunciationNeoActionCard: {
    ...practiceNeoShadowStyle,
    borderRadius: 11,
    backgroundColor: practiceColors.question,
  },
  pronunciationRecordingActionCard: {
    backgroundColor: practiceColors.incorrectPanel,
  },
  speakingPromptActionCard: { paddingVertical: 24 },
  pronunciationActionTitle: { fontSize: 18, lineHeight: 24, fontWeight: theme.typography.weights.semibold },
  microphoneActionTitle: { fontSize: 20, lineHeight: 28, fontWeight: theme.typography.weights.bold },
  pronunciationActionHint: { marginTop: 2, color: '#777777', fontSize: 12, lineHeight: 18, fontWeight: theme.typography.weights.semibold },
  recordingPulseContainer: {
    width: 90,
    height: 90,
    marginTop: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingPulseRing: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFB5B8',
  },
  pronunciationRecordControl: { width: 70, height: 70 },
  pronunciationTimerRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  pronunciationTimerDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FF6268' },
  pronunciationTimerText: { color: '#9A9A9A', fontSize: 10, lineHeight: 15 },
  pronunciationMicButton: {
    width: 78,
    height: 78,
    marginTop: 12,
    borderRadius: 39,
    borderWidth: 8,
    borderColor: '#DBECFF',
    backgroundColor: '#2F6EEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pronunciationMicButtonEmphasized: { marginTop: 0 },
  recordingButtonEmphasis: {
    width: 172,
    height: 90,
    marginTop: 12,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingEmphasisRay: {
    position: 'absolute',
    width: 28,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#286BEA',
  },
  recordingEmphasisLeftTop: { left: 13, top: 18, transform: [{ rotate: '28deg' }] },
  recordingEmphasisLeftMiddle: { left: 5, top: 42 },
  recordingEmphasisLeftBottom: { left: 13, bottom: 18, transform: [{ rotate: '-28deg' }] },
  recordingEmphasisRightTop: { right: 13, top: 18, transform: [{ rotate: '-28deg' }] },
  recordingEmphasisRightMiddle: { right: 5, top: 42 },
  recordingEmphasisRightBottom: { right: 13, bottom: 18, transform: [{ rotate: '28deg' }] },
  pronunciationMicIcon: { width: 43, height: 43 },
  pronunciationAttemptLabel: { marginTop: 11, color: '#777777', fontSize: 12, lineHeight: 18, fontWeight: theme.typography.weights.semibold },
  pronunciationReviewPlayback: {
    width: '100%',
    minHeight: 38,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#62BDF4',
    borderRadius: 7,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pronunciationReviewPlaybackDeepBlue: { borderColor: practiceColors.checkButton },
  pronunciationReviewPlayButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: practiceColors.checkButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pronunciationReviewPlayIcon: { width: 23, height: 23 },
  pronunciationReviewLabel: { flex: 1, marginLeft: 6, fontSize: 11, lineHeight: 16, fontWeight: theme.typography.weights.semibold },
  pronunciationReviewDuration: { color: '#969696', fontSize: 10, lineHeight: 15 },
  pronunciationRedoButton: { marginTop: 15, flexDirection: 'row', alignItems: 'center', gap: 4 },
  pronunciationRedoIcon: { width: 14, height: 14 },
  pronunciationRedoLabel: { fontSize: 10, lineHeight: 15 },
  pronunciationSubmitError: { marginTop: 7, color: theme.colors.error, fontSize: 10, lineHeight: 15, textAlign: 'center' },
  pronunciationScrollContentWithFooter: { paddingBottom: 0 },
  pronunciationFeedbackCard: {
    width: '100%',
    minHeight: 80,
    marginTop: 18,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 15,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pronunciationFeedbackSuccess: { borderColor: '#A9E64D', backgroundColor: '#F0FFD9' },
  pronunciationFeedbackUnclear: { borderColor: '#F0C419', backgroundColor: '#FFFBE8' },
  pronunciationFeedbackError: { borderColor: '#FF6268', backgroundColor: '#FFF0F1' },
  pronunciationFeedbackStars: { width: 42, height: 42 },
  pronunciationFeedbackCopy: { flex: 1, gap: 3 },
  pronunciationFeedbackTitle: { fontSize: 13, lineHeight: 18, fontWeight: theme.typography.weights.semibold },
  pronunciationFeedbackText: { fontSize: 12, lineHeight: 18 },
  pronunciationSkipLabel: { color: '#666666', fontSize: 11, lineHeight: 15, fontWeight: theme.typography.weights.medium, textDecorationLine: 'underline' },
  speakingAnswerFooter: { marginTop: 'auto' },
  inlineSkipButton: { alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 3 },
  pronunciationContinueButton: {
    width: '100%',
    minHeight: 50,
    marginTop: 'auto',
    borderWidth: 1,
    borderColor: '#14213B',
    borderRadius: 26,
    backgroundColor: '#2F6EEA',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '4px 4px 0px #14213B',
  },
  pronunciationContinueLabel: { color: theme.colors.surface, fontSize: 13, lineHeight: 18, fontWeight: theme.typography.weights.medium },
  conversationPromptCard: {
    width: '100%',
    minHeight: 142,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 14,
    alignItems: 'center',
    boxShadow: `4px 4px 0px ${theme.colors.border}`,
  },
  conversationPromptEnglishRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 9,
  },
  conversationPromptAudioButton: { transform: [{ translateX: 8 }] },
  conversationPromptAudioIcon: { width: 24, height: 24, marginTop: 2 },
  conversationPromptAudioSpacer: { width: 24 },
  conversationPromptEnglish: {
    flex: 1,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: theme.typography.weights.bold,
    textAlign: 'center',
  },
  conversationPromptThai: {
    marginTop: 7,
    color: '#9A9A9A',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  conversationTipBox: {
    width: '100%',
    minHeight: 36,
    marginTop: 20,
    borderWidth: 1.5,
    borderColor: '#C4A807',
    borderRadius: 10,
    backgroundColor: '#FFFCE5',
    paddingHorizontal: 18,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
  },
  conversationTipText: {
    flex: 1,
    color: '#C4A807',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: theme.typography.weights.semibold,
    textAlign: 'left',
  },
  conversationActionCard: {
    ...practiceNeoShadowStyle,
    minHeight: 210,
    borderRadius: 11,
    backgroundColor: practiceColors.question,
  },
  conversationActionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: theme.typography.weights.semibold,
    letterSpacing: 0.5,
  },
  conversationRetestButton: { width: '100%', marginTop: 18 },
  conversationExampleButton: {
    minHeight: 28,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#B8DFFD',
    borderRadius: 5,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  conversationExampleButtonLabel: { color: '#666666', fontSize: 8, lineHeight: 12 },
  conversationExampleAnswer: {
    width: '72%',
    minHeight: 58,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#B8DFFD',
    borderRadius: 5,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  conversationExampleEnglish: { fontSize: 10, lineHeight: 15, textAlign: 'center' },
  conversationExampleThai: { color: '#999999', fontSize: 9, lineHeight: 13, textAlign: 'center' },
  conversationExampleHide: { marginTop: 2, color: '#777777', fontSize: 7, lineHeight: 10 },
  conversationScrollContentWithFooter: { paddingBottom: 0 },
  conversationLearnerAnswerCard: {
    width: '100%',
    marginTop: 18,
    borderWidth: 1,
    borderRadius: 9,
    overflow: 'hidden',
  },
  conversationLearnerAnswerSuccess: {
    borderColor: practiceColors.correctButton,
    backgroundColor: practiceColors.correctPanel,
  },
  conversationLearnerAnswerError: {
    borderColor: practiceColors.incorrectButton,
    backgroundColor: practiceColors.incorrectPanel,
  },
  conversationLearnerAnswerRow: {
    minHeight: 65,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  conversationLearnerPlayIcon: { width: 38, height: 38 },
  conversationLearnerAnswerCopy: { flex: 1, gap: 2 },
  conversationLearnerAnswerTitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: theme.typography.weights.bold,
  },
  conversationLearnerTranscript: { color: '#555555', fontSize: 12, lineHeight: 18 },
  conversationLearnerTranscriptUnavailable: { color: '#777777', fontStyle: 'italic' },
  conversationFeedbackDetail: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  conversationFeedbackStars: { width: 42, height: 42 },
  conversationFeedbackCopy: { flex: 1, gap: 3 },
  conversationFeedbackText: { color: practiceColors.text, fontSize: 12, lineHeight: 18 },
  conversationResultFooter: {
    width: 'auto',
    marginTop: 'auto',
    marginHorizontal: -22,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 12,
  },
  conversationResultFooterSuccess: {
    borderColor: practiceColors.correctButton,
    backgroundColor: practiceColors.correctPanel,
  },
  conversationResultFooterError: {
    borderColor: practiceColors.incorrectButton,
    backgroundColor: practiceColors.incorrectPanel,
  },
  conversationResultFooterUnclear: {
    borderColor: '#F1DB35',
    backgroundColor: '#FFFCE5',
  },
  conversationResultButton: {
    width: '100%',
    minHeight: 44,
    borderWidth: 1.5,
    borderColor: practiceColors.text,
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conversationResultButtonSuccess: { backgroundColor: practiceColors.correctButton },
  conversationResultButtonError: { backgroundColor: practiceColors.incorrectButton },
  conversationResultButtonUnclear: { backgroundColor: '#F1DB35' },
  conversationResultButtonPressed: { opacity: 0.86 },
  conversationResultButtonLabel: {
    color: practiceColors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: theme.typography.weights.bold,
  },
  conversationResultSkipButton: { alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 2 },
  conversationResultSkipLabel: {
    color: '#5E5E5E',
    fontSize: 10,
    lineHeight: 14,
    textDecorationLine: 'underline',
  },
  translationPromptCard: {
    width: '100%',
    minHeight: 122,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 18,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `4px 4px 0px ${theme.colors.border}`,
  },
  translationPromptThai: {
    fontSize: 25,
    lineHeight: 36,
    fontWeight: theme.typography.weights.bold,
    textAlign: 'center',
  },
  translationTestAnswer: {
    marginTop: 3,
    color: '#6F6F6F',
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  translationDirectionPill: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#C4A807',
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  translationDirectionLabel: { color: '#C4A807', fontSize: 10, lineHeight: 15 },
  translationRecordingCore: {
    flex: 1,
    width: '100%',
    minHeight: 112,
    alignItems: 'center',
    justifyContent: 'center',
  },
  translationRecordingCoreWithHearPailin: { transform: [{ translateY: -10 }] },
  translationRetryActionCard: { minHeight: 230 },
  translationRetryMicButton: { marginTop: 0 },
  translationRetryAttemptLabel: { marginTop: 9 },
  translationHearPailinButton: {
    zIndex: 10,
    elevation: 10,
    minWidth: 112,
    minHeight: 30,
    marginTop: 4,
    borderWidth: 1,
    borderColor: practiceColors.text,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  translationHearPailinButtonDisabled: { opacity: 0.62 },
  translationHearPailinButtonPressed: { opacity: 0.72 },
  translationHearPailinIcon: { width: 18, height: 18 },
  translationHearPailinLabel: {
    color: practiceColors.text,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: theme.typography.weights.semibold,
  },
  topBar: { minHeight: 64, paddingHorizontal: theme.spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resourceHeader: { width: '100%', maxWidth: 480, alignSelf: 'center', minHeight: 49, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center' },
  resourceHeaderSide: { width: 44, height: 44 },
  resourceHeaderProgress: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  screenTitleBlock: { gap: 1 },
  screenEyebrow: { color: theme.colors.accent, fontWeight: theme.typography.weights.bold, letterSpacing: 0.5 },
  selectedLessonTitle: { fontWeight: theme.typography.weights.semibold },
  lessonSelector: { width: '100%', maxWidth: 720, alignSelf: 'center', gap: theme.spacing.xs, paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.md },
  selectorRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  selectorLabel: { width: 52, color: '#66717D', fontWeight: theme.typography.weights.bold, fontSize: 10, letterSpacing: 0.6 },
  selectorChips: { alignItems: 'center', gap: theme.spacing.xs, paddingRight: theme.spacing.md },
  selectorLoadingRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm },
  selectorError: { minHeight: 38, color: theme.colors.error, textAlign: 'center' },
  lessonChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: theme.radii.xl, borderWidth: 1, borderColor: '#C9D2DC', backgroundColor: theme.colors.surface },
  lessonChipActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentMuted },
  lessonChipDisabled: { opacity: 0.5 },
  topBarActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  newSessionButton: { minHeight: 36, paddingHorizontal: 10, borderRadius: theme.radii.xl, borderWidth: 1, borderColor: theme.colors.accent, backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  newSessionButtonPressed: { backgroundColor: theme.colors.accentMuted },
  newSessionButtonDisabled: { opacity: 0.4 },
  newSessionLabel: { color: theme.colors.accent, fontWeight: theme.typography.weights.semibold },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  questionNavigation: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  questionNavigationButton: { flex: 1, minHeight: 42, paddingVertical: theme.spacing.xs },
  questionNavigationCount: { minWidth: 54, textAlign: 'center' },
  scrollContent: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: theme.spacing.lg, paddingBottom: 48, gap: theme.spacing.lg },
  progressRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  progressConnector: {
    width: 32,
    marginHorizontal: 2,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#C9D2DC',
  },
  progressConnectorComplete: { borderStyle: 'solid', borderColor: theme.colors.border },
  progressDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: '#C9D2DC', backgroundColor: theme.colors.surface },
  progressDotActive: { borderColor: theme.colors.border, backgroundColor: '#BDEAFF' },
  eyebrow: { color: theme.colors.accent, fontWeight: theme.typography.weights.bold, letterSpacing: 0.7, textAlign: 'center', fontSize: 12 },
  introBlock: { alignItems: 'center', gap: 2 },
  mainTitle: { textAlign: 'center', fontSize: 24, lineHeight: 32, fontWeight: theme.typography.weights.bold },
  centerText: { textAlign: 'center' },
  promptCard: { borderRadius: theme.radii.md, boxShadow: `4px 5px 0px ${theme.colors.shadow}` },
  promptEnglishRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm },
  inlinePlayButton: { marginTop: 2, width: 30, height: 30, borderRadius: 15, backgroundColor: '#86C8FF', alignItems: 'center', justifyContent: 'center' },
  promptEnglish: { flex: 1, fontSize: 20, lineHeight: 28, fontWeight: theme.typography.weights.bold },
  promptThai: { marginLeft: 38, color: '#777F88' },
  tipBox: { marginTop: theme.spacing.sm, padding: theme.spacing.sm, borderRadius: theme.radii.sm, backgroundColor: '#EDFFD1', flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm },
  tipTextBlock: { flex: 1, gap: 2 },
  exampleBlock: { marginTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: '#DDE3E9', paddingTop: theme.spacing.sm, gap: theme.spacing.sm },
  exampleToggle: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  exampleAnswer: { padding: theme.spacing.sm, borderRadius: theme.radii.sm, backgroundColor: theme.colors.accentSurface, gap: 2 },
  translationPrompt: { textAlign: 'center', fontSize: 28, lineHeight: 40, fontWeight: theme.typography.weights.bold },
  translationDirection: { alignSelf: 'center', marginTop: theme.spacing.md, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.radii.xl, backgroundColor: '#EDFFD1' },
  centeredBlock: { alignItems: 'center', paddingTop: theme.spacing.lg },
  completedQuestion: { width: '100%', paddingVertical: theme.spacing.lg },
  completedQuestionLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm },
  recordButton: { width: 104, height: 104, borderRadius: 52, backgroundColor: theme.colors.accent, borderWidth: 9, borderColor: '#A9D8FF', alignItems: 'center', justifyContent: 'center' },
  stopButton: { backgroundColor: theme.colors.primary, borderColor: '#FFC0C0' },
  recordingStatus: { color: theme.colors.primary, fontWeight: theme.typography.weights.bold },
  sampleText: { color: theme.colors.accent, textDecorationLine: 'underline', padding: theme.spacing.sm },
  reviewBlock: { width: '100%', paddingTop: theme.spacing.md },
  stateTitle: { textAlign: 'center', fontSize: 24, lineHeight: 32, fontWeight: theme.typography.weights.bold },
  playbackButton: { minHeight: 50, borderWidth: 1, borderColor: '#C9D2DC', borderRadius: theme.radii.md, backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.md },
  playbackButtonDisabled: { opacity: 0.45 },
  playbackIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center' },
  playbackLabel: { flex: 1, fontWeight: theme.typography.weights.semibold },
  submitError: { color: theme.colors.primary, textAlign: 'center' },
  fullState: { flex: 1, maxWidth: 520, width: '100%', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.lg, paddingHorizontal: theme.spacing.xl, paddingBottom: 80 },
  evaluationLoader: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  evaluationCopy: { alignItems: 'center', gap: 5 },
  evaluationTitle: {
    fontSize: 25,
    lineHeight: 34,
    fontWeight: theme.typography.weights.bold,
    textAlign: 'center',
  },
  evaluationSubtitle: {
    color: '#687078',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  evaluationGraphic: {
    width: 250,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
  },
  evaluationPailin: { width: 174, height: 174 },
  evaluationOrbit: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 7,
    borderColor: '#2F6EEA',
  },
  orbitDot: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  orbitDotTop: { top: -14, left: 64 },
  orbitDotLeft: { top: 96, left: -14 },
  orbitSparkle: {
    position: 'absolute',
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F8FC',
  },
  orbitSparkleRight: { top: 25, right: -20 },
  orbitSparkleBottom: { bottom: -22, left: 88 },
  orbitSparkleText: { color: '#F5D21F', fontSize: 39, lineHeight: 42 },
  evaluationReminder: {
    minHeight: 54,
    maxWidth: 360,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 27,
    backgroundColor: '#FFFBE7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  evaluationReminderSparkle: { color: '#F5D21F', fontSize: 32, lineHeight: 35 },
  evaluationReminderText: {
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: theme.typography.weights.semibold,
    textAlign: 'center',
  },
  successIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: theme.colors.success, alignItems: 'center', justifyContent: 'center' },
  playbackList: { width: '100%', gap: theme.spacing.sm },
  wideButton: { width: '100%' },
  feedbackState: { paddingTop: theme.spacing.md },
  feedbackHeading: { alignItems: 'center', gap: theme.spacing.sm },
  feedbackStatus: { color: theme.colors.accent, fontWeight: theme.typography.weights.bold, textTransform: 'uppercase' },
  feedbackCard: { backgroundColor: theme.colors.surface },
  detailLabel: { fontWeight: theme.typography.weights.bold, letterSpacing: 0.4 },
  assessmentSentence: { fontSize: 20, lineHeight: 30 },
  assessmentProblemWord: { color: theme.colors.error, fontWeight: theme.typography.weights.bold, textDecorationLine: 'underline' },
  issueList: { gap: theme.spacing.sm, padding: theme.spacing.sm, borderRadius: theme.radii.sm, backgroundColor: '#FFF8D8' },
  issueRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm },
  issueBullet: { color: theme.colors.error, fontWeight: theme.typography.weights.bold, lineHeight: 24 },
  issueText: { flex: 1, gap: 2 },
  divider: { height: 1, backgroundColor: '#DDE3E9', marginVertical: theme.spacing.xs },
  errorActions: { padding: theme.spacing.lg },
});
