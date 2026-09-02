import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Asset } from 'expo-asset';
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
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { Stack as UiStack } from '@/src/components/ui/Stack';
import { theme } from '@/src/theme/theme';
import conversationPracticeImage from '@/assets/images/speaking-coach/conversation-practice.png';
import audioRedoImage from '@/assets/images/speaking-coach/audio-redo.png';
import lightBulbImage from '@/assets/images/speaking-coach/light-bulb.png';
import microphoneWhiteImage from '@/assets/images/speaking-coach/mic-white.png';
import pailinDoTheTaskImage from '@/assets/images/speaking-coach/pailin-do-the-task.webp';
import pailinGoodJobImage from '@/assets/images/speaking-coach/pailin-good-job.webp';
import pailinTimeToSpeakImage from '@/assets/images/speaking-coach/pailin-time-to-speak.webp';
import pailinTryAgainImage from '@/assets/images/speaking-coach/pailin-try-again.webp';
import pauseBlueImage from '@/assets/images/speaking-coach/pause-blue.png';
import pauseRedImage from '@/assets/images/speaking-coach/pause-red.png';
import playBlueImage from '@/assets/images/speaking-coach/play-blue.png';
import playRedImage from '@/assets/images/speaking-coach/play-red.png';
import pronunciationPracticeImage from '@/assets/images/speaking-coach/pronunciation-practice.png';
import speakerBlueImage from '@/assets/images/speaking-coach/speaker-blue.png';
import speakerGreyImage from '@/assets/images/speaking-coach/speaker-grey.png';
import starsGreenImage from '@/assets/images/speaking-coach/stars-green.png';
import starsRedImage from '@/assets/images/speaking-coach/stars-red.png';
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

const OUTCOME_LABELS: Record<SpeakingEvaluationStatus, string> = {
  pass: 'Correct',
  retry: 'Needs retry',
  continue_with_correction: 'Final correction',
  unclear_audio: 'Unclear audio',
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

const switchAudioSession = async (allowsRecording: boolean) => {
  // Simulator and iOS hardware can retain the previous input/output route when
  // changing categories on an active session. Deactivate before changing modes.
  await setIsAudioActiveAsync(false);
  await setAudioModeAsync({ allowsRecording, playsInSilentMode: true });
  await setIsAudioActiveAsync(true);
};

function PlaybackButton({
  label,
  onPress,
  playing,
}: {
  label: string;
  onPress: () => void;
  playing: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.playbackButton}>
      <View style={styles.playbackIcon}>
        <MaterialIcons name={playing ? 'pause' : 'play-arrow'} size={22} color={theme.colors.surface} />
      </View>
      <AppText variant="caption" style={styles.playbackLabel}>
        {label}
      </AppText>
    </Pressable>
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
  onPress,
}: {
  label: string;
  playing: boolean;
  tone?: 'blue' | 'red';
  onPress: () => void;
}) {
  const icon = tone === 'red'
    ? (playing ? pauseRedImage : playRedImage)
    : (playing ? pauseBlueImage : playBlueImage);

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Play ${label}`} onPress={onPress} style={styles.pronunciationPlaybackButton}>
      <Image source={icon} contentFit="contain" style={styles.pronunciationPlaybackIcon} />
      <AppText variant="caption" style={styles.pronunciationPlaybackLabel}>{label}</AppText>
    </Pressable>
  );
}

function PailinCoachBubble({
  tone,
  instruction,
}: {
  tone: 'instruction' | 'success' | 'error';
  instruction: string;
}) {
  const image = tone === 'success'
    ? pailinGoodJobImage
    : tone === 'error'
      ? pailinTryAgainImage
      : pailinDoTheTaskImage;
  const message = tone === 'success' ? 'Correct!' : tone === 'error' ? 'Not quite!' : instruction;

  return (
    <View style={styles.pronunciationCoachRow}>
      <Image source={image} contentFit="contain" style={styles.pronunciationCoachImage} />
      <View
        style={[
          styles.pronunciationCoachBubble,
          tone === 'success'
            ? styles.pronunciationCoachBubbleSuccess
            : tone === 'error'
              ? styles.pronunciationCoachBubbleError
              : styles.pronunciationCoachBubbleInstruction,
        ]}
      >
        <AppText variant="caption" style={styles.pronunciationCoachMessage}>{message}</AppText>
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

export default function SpeakingCoachTestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ lesson?: string }>();
  const initialLessonId = typeof params.lesson === 'string' && params.lesson.trim() ? params.lesson : '1.1';
  const [lessonId, setLessonId] = useState(initialLessonId);
  const [selectedLevel, setSelectedLevel] = useState(lessonLevel(initialLessonId));
  const [lessonOptions, setLessonOptions] = useState<SpeakingCoachLessonSummary[]>([]);
  const [lessonOptionsLoading, setLessonOptionsLoading] = useState(true);
  const [lessonOptionsError, setLessonOptionsError] = useState<string | null>(null);
  const [lesson, setLesson] = useState<SpeakingCoachLesson | null>(null);
  const [session, setSession] = useState<SpeakingCoachSession | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
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
  const promptPlayer = useAudioPlayer(promptAudioUrl, { updateInterval: 200 });
  const promptPlayerStatus = useAudioPlayerStatus(promptPlayer);
  const recordingPlayer = useAudioPlayer(recordedUri, { updateInterval: 200 });
  const recordingPlayerStatus = useAudioPlayerStatus(recordingPlayer);

  useEffect(() => {
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
  }, [initialLessonId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setLesson(null);
    setSession(null);
    setShowWelcome(true);
    setQuestionIndex(0);
    setPhase('prompt');
    setRecordedUri(null);

    setEvaluation(null);
    setInstructionalAttemptNumber(1);
    setPreviousAttemptId(null);
    setSubmitError(null);
    setClientSubmissionId(null);

    void Promise.all([
      fetchSpeakingCoachLesson(lessonId),
      createOrResumeSpeakingSession(lessonId),
    ])
      .then(([nextLesson, nextSession]) => {
        if (!cancelled) {
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
  }, [lessonId]);

  const resetQuestion = () => {
    promptPlayer.pause();
    recordingPlayer.pause();
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
    setQuestionIndex(Math.max(0, Math.min(nextIndex, questions.length - 1)));
  };

  const goNext = () => {
    if (questionIndex < questions.length - 1) {
      goToQuestion(questionIndex + 1);
      return;
    }
    resetQuestion();
    setQuestionIndex(0);
    Alert.alert('Test lesson complete', 'This test interface restarts after the final question.');
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
      if (nextSession.current_question_id === null) {
        setQuestionIndex(0);
        setShowWelcome(true);
        Alert.alert('Test lesson complete', 'Every question was completed or skipped.');
        return;
      }
      const nextIndex = questions.findIndex(
        ({ question }) => question.id === nextSession.current_question_id
      );
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

  const renderQuestionNavigation = () => {
    const navigationDisabled = phase === 'recording' || phase === 'evaluating';
    return (
      <View style={styles.questionNavigation}>
        <Button
          title="Previous"
          variant="outline"
          disabled={navigationDisabled || questionIndex === 0}
          onPress={() => goToQuestion(questionIndex - 1)}
          style={styles.questionNavigationButton}
        />
        <AppText variant="caption" style={styles.questionNavigationCount}>
          {questionIndex + 1} / {questions.length}
        </AppText>
        <Button
          title="Next"
          variant="outline"
          disabled={navigationDisabled || questionIndex === questions.length - 1}
          onPress={() => goToQuestion(questionIndex + 1)}
          style={styles.questionNavigationButton}
        />
      </View>
    );
  };

  const togglePromptAudio = () => {
    recordingPlayer.pause();
    if (promptPlayerStatus.playing) {
      promptPlayer.pause();
      return;
    }
    if (promptPlayerStatus.didJustFinish) void promptPlayer.seekTo(0);
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
    if (recordingPlayerStatus.didJustFinish) await recordingPlayer.seekTo(0);
    recordingPlayer.play();
  };

  const startRecording = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone permission needed', 'Allow microphone access to test voice recording.');
        return;
      }
      promptPlayer.pause();
      recordingPlayer.pause();
      setRecordedUri(null);
      setRecordedDurationMillis(0);
      setRecordedFile(SPEAKING_RECORDING_FILE);
      setClientSubmissionId(null);
      setSubmitError(null);
      await switchAudioSession(true);
      // Passing the options forces iOS to create a fresh AVAudioRecorder and
      // output URL. Reusing the stopped WAV recorder fails after its file has
      // been opened for review playback.
      await recorder.prepareToRecordAsync(SPEAKING_RECORDING_OPTIONS);
      recorder.record();
      setPhase('recording');
    } catch (error) {
      Alert.alert('Could not record', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const stopRecording = async () => {
    try {
      const duration = recorderState.durationMillis;
      await recorder.stop();
      await switchAudioSession(false);
      const uri = recorder.uri ?? recorder.getStatus().url;
      if (!uri) throw new Error('The recording did not produce an audio file.');
      setRecordedUri(uri);
      setRecordedDurationMillis(duration);
      setClientSubmissionId(Crypto.randomUUID());
      setPhase('review');
    } catch (error) {
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
      if (nextEvaluation.status === 'retry') {
        setInstructionalAttemptNumber(2);
        setPreviousAttemptId(response.attempt.id);
      }
      setPhase(nextEvaluation.status === 'pass' ? 'correct' : 'feedback');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to evaluate this recording.';
      setSubmitError(message);
      setPhase('review');
      Alert.alert('Evaluation unavailable', message);
    }
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <PageLoadingState loadingTitle="Loading speaking coach…" />
      </View>
    );
  }

  if (loadError || !activeQuestion || !session) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + theme.spacing.lg }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <PageLoadingState
          showImage={false}
          errorTitle="Speaking coach unavailable"
          errorBody={loadError || 'This lesson has no speaking questions.'}
        />
        <View style={styles.errorActions}>
          <Button title="Back to profile" variant="outline" onPress={() => router.back()} />
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

  if (showWelcome) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        {renderLessonControls()}
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
            <AppText variant="title" style={styles.welcomeTitle}>Time to speak!</AppText>
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
  const typeCopy = TYPE_COPY[practiceSet.practice_type];
  const hasPromptAudio = Boolean(question.prompt_audio_url) && practiceSet.practice_type !== 'translation';
  const pailinPlaybackLabel = practiceSet.practice_type === 'pronunciation' ? 'Pailin’s version' : 'Replay question';
  const learnerPlaybackLabel = practiceSet.practice_type === 'translation' ? 'Your translation' : practiceSet.practice_type === 'open' ? 'Your answer' : 'Your recording';
  const isCompletedQuestion = session.completed_question_ids.includes(question.id);
  const unclearAudioCount = session.consecutive_unclear_audio_count;
  const unclearAudioLimitReached = evaluation?.status === 'unclear_audio'
    && unclearAudioCount >= session.unclear_audio_retry_limit;
  const unclearAudioNeedsGuidance = evaluation?.status === 'unclear_audio'
    && unclearAudioCount >= 3;
  const unclearAudioFeedback = unclearAudioLimitReached
    ? 'We’re unable to check another recording for this question. You can skip it or exit practice.'
    : unclearAudioNeedsGuidance
      ? 'We’re still unable to hear your audio. Try moving somewhere quieter and make sure your microphone isn’t covered.'
      : evaluation?.feedback_en;
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
                <AppText variant="caption">{showExample ? 'Hide example answer' : 'Show example answer'}</AppText>
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
            <AppText variant="body">Completed in this session</AppText>
          </View>
          <Button
            title="Retest in a fresh session"
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
          <AppText variant="muted">Tap to stop</AppText>
        </UiStack>
      );
    }

    if (phase === 'review') {
      return (
        <UiStack gap="md" style={styles.reviewBlock}>
          <AppText variant="title" style={styles.stateTitle}>Review your recording</AppText>
          <AppText variant="muted" style={styles.centerText}>{formatDuration(recordedDurationMillis)} recorded</AppText>
          <PlaybackButton label={learnerPlaybackLabel} onPress={() => void toggleRecordingAudio()} playing={recordingPlayerStatus.playing} />
          {submitError ? <AppText variant="muted" style={styles.submitError}>{submitError}</AppText> : null}
          <Button title="Submit recording" onPress={() => void submitRecording()} />
          <Button title="Record again" variant="outline" onPress={() => void startRecording()} />
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
        <Pressable accessibilityRole="button" disabled={skipPending} onPress={() => void skipCurrentQuestion()}>
          <AppText variant="muted" style={styles.skipText}>{skipPending ? 'Skipping…' : 'Skip'}</AppText>
        </Pressable>
      </UiStack>
    );
  };

  const renderEvaluating = () => (
    <View style={styles.fullState}>
      <PageLoadingState
        loadingTitle="Evaluating your answer…"
        loadingBody="The AI checker will listen to your original recording."
      />
    </View>
  );

  const renderCorrect = () => (
    <View style={styles.fullState}>
      <View style={styles.successIcon}>
        <MaterialIcons name="check" size={54} color={theme.colors.text} />
      </View>
      <AppText variant="title" style={styles.stateTitle}>You got it!</AppText>
      <AppText variant="body" style={styles.centerText}>{evaluation?.feedback_en || 'Nice work—your answer passed the checker.'}</AppText>
      {evaluation?.feedback_th ? <AppText language="th" variant="muted" style={styles.centerText}>{evaluation.feedback_th}</AppText> : null}
      <View style={styles.playbackList}>
        <PlaybackButton label={learnerPlaybackLabel} onPress={() => void toggleRecordingAudio()} playing={recordingPlayerStatus.playing} />
        {hasPromptAudio ? <PlaybackButton label={pailinPlaybackLabel} onPress={togglePromptAudio} playing={promptPlayerStatus.playing} /> : null}
      </View>
      <Button title="Next question" onPress={goNext} style={styles.wideButton} />
    </View>
  );

  const renderFeedback = () => {
    if (!evaluation) return null;
    const isRetry = evaluation.status === 'retry';
    const isUnclear = evaluation.status === 'unclear_audio';
    return (
      <UiStack gap="lg" style={styles.feedbackState}>
        <View style={styles.feedbackHeading}>
          <AppText variant="caption" style={styles.feedbackStatus}>{OUTCOME_LABELS[evaluation.status]}</AppText>
          <AppText variant="title" style={styles.stateTitle}>
            {unclearAudioLimitReached
              ? 'Recording unavailable'
              : isUnclear
                ? 'Let’s record that again'
                : isRetry
                  ? 'Almost—try once more'
                  : 'Here’s the correction'}
          </AppText>
          <AppText variant="body" style={styles.centerText}>
            {isUnclear ? unclearAudioFeedback : evaluation.feedback_en}
          </AppText>
          {!isUnclear || !unclearAudioNeedsGuidance ? (
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
          <PlaybackButton label={learnerPlaybackLabel} onPress={() => void toggleRecordingAudio()} playing={recordingPlayerStatus.playing} />
          {hasPromptAudio ? <PlaybackButton label={pailinPlaybackLabel} onPress={togglePromptAudio} playing={promptPlayerStatus.playing} /> : null}
        </View>

        {unclearAudioLimitReached ? (
          <UiStack gap="sm">
            <Button title={skipPending ? 'Skipping…' : 'Skip question'} disabled={skipPending} onPress={() => void skipCurrentQuestion()} />
            <Button title="Exit practice" variant="outline" onPress={() => router.back()} />
          </UiStack>
        ) : isRetry || isUnclear ? (
          <UiStack gap="sm">
            <Button title={isUnclear && !unclearAudioNeedsGuidance ? 'Record again' : 'Try again'} onPress={() => void startRecording()} />
            {isUnclear && unclearAudioNeedsGuidance ? (
              <Button title={skipPending ? 'Skipping…' : 'Skip question'} variant="outline" disabled={skipPending} onPress={() => void skipCurrentQuestion()} />
            ) : null}
          </UiStack>
        ) : (
          <Button title="Next question" onPress={goNext} />
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
    const finalResult = phase === 'feedback' && !retryReady && !unclearAudioLimitReached;
    const showEvaluation = Boolean(evaluation) && (correctResult || finalResult || retryReady || retryInProgress || unclearAudioLimitReached);
    const showLearnerPlayback = showEvaluation && Boolean(recordedUri);
    const coachTone = correctResult ? 'success' : showEvaluation ? 'error' : 'instruction';
    const feedbackIssueDescriptions = evaluation?.displayed_issues
      .map((issue) => issue.description_en)
      .filter((description) => description !== evaluation.feedback_en) ?? [];
    const showSkip = phase === 'prompt' || phase === 'recording' || phase === 'review' || retryReady || unclearAudioLimitReached;

    const renderAttemptPanel = () => {
      if (phase === 'recording') {
        return (
          <View style={styles.pronunciationActionCard}>
            <AppText variant="caption" style={styles.pronunciationActionTitle}>RECORDING…</AppText>
            <AppText variant="caption" style={styles.pronunciationActionHint}>Tap to stop</AppText>
            <Pressable accessibilityRole="button" accessibilityLabel="Stop recording" onPress={() => void stopRecording()}>
              <Image source={stopRecordRedImage} contentFit="contain" style={styles.pronunciationRecordControl} />
            </Pressable>
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
          <View style={styles.pronunciationActionCard}>
            <AppText variant="caption" style={styles.pronunciationActionTitle}>REVIEW YOUR RECORDING</AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Play your recording"
              onPress={() => void toggleRecordingAudio()}
              style={styles.pronunciationReviewPlayback}
            >
              <Image
                source={recordingPlayerStatus.playing ? pauseBlueImage : playBlueImage}
                contentFit="contain"
                style={styles.pronunciationReviewPlayIcon}
              />
              <AppText variant="caption" style={styles.pronunciationReviewLabel}>Your recording</AppText>
              <AppText variant="caption" style={styles.pronunciationReviewDuration}>
                {formatDuration(recordedDurationMillis)}
              </AppText>
            </Pressable>
            {submitError ? <AppText variant="caption" style={styles.pronunciationSubmitError}>{submitError}</AppText> : null}
            <Pressable accessibilityRole="button" onPress={() => void submitRecording()} style={styles.pronunciationSubmitButton}>
              <AppText variant="caption" style={styles.pronunciationSubmitLabel}>SUBMIT ANSWER</AppText>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => void startRecording()} style={styles.pronunciationRedoButton}>
              <Image source={audioRedoImage} contentFit="contain" style={styles.pronunciationRedoIcon} />
              <AppText variant="caption" style={styles.pronunciationRedoLabel}>Record again</AppText>
            </Pressable>
          </View>
        );
      }

      if (phase === 'prompt' || retryReady) {
        const isRetryAttempt = retryReady || instructionalAttemptNumber === 2;
        return (
          <View style={styles.pronunciationActionCard}>
            <AppText variant="caption" style={styles.pronunciationActionTitle}>
              {isRetryAttempt ? 'TRY AGAIN!' : 'YOUR TURN!'}
            </AppText>
            <AppText variant="caption" style={styles.pronunciationActionHint}>Tap to speak</AppText>
            <Pressable accessibilityRole="button" accessibilityLabel="Start recording" onPress={() => void startRecording()} style={styles.pronunciationMicButton}>
              <Image source={microphoneWhiteImage} contentFit="contain" style={styles.pronunciationMicIcon} />
            </Pressable>
            <AppText variant="caption" style={styles.pronunciationAttemptLabel}>
              Try {instructionalAttemptNumber} of 2
            </AppText>
          </View>
        );
      }

      return null;
    };

    return (
      <ScrollView
        style={styles.pronunciationScroll}
        contentContainerStyle={[
          styles.pronunciationScrollContent,
          { paddingBottom: Math.max(theme.spacing.lg, insets.bottom + theme.spacing.md) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <PracticeProgress {...activeQuestion} />
        <AppText variant="caption" style={styles.pronunciationEyebrow}>PRONUNCIATION PRACTICE</AppText>

        <PailinCoachBubble tone={coachTone} instruction="Listen, then repeat!" />

        <View style={styles.pronunciationSentenceCard}>
          <AppText variant="title" style={styles.pronunciationSentenceEnglish}>{question.prompt_en}</AppText>
          {question.prompt_th ? (
            <AppText language="th" variant="caption" style={styles.pronunciationSentenceThai}>{question.prompt_th}</AppText>
          ) : null}
          <View style={[styles.pronunciationPlaybackRow, showEvaluation ? styles.pronunciationPlaybackRowResult : null]}>
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
                onPress={() => void toggleRecordingAudio()}
              />
            ) : null}
          </View>
        </View>

        {showEvaluation && evaluation ? (
          <View style={[
            styles.pronunciationFeedbackCard,
            correctResult ? styles.pronunciationFeedbackSuccess : styles.pronunciationFeedbackError,
          ]}>
            <Image
              source={correctResult ? starsGreenImage : starsRedImage}
              contentFit="contain"
              style={styles.pronunciationFeedbackStars}
            />
            <View style={styles.pronunciationFeedbackCopy}>
              {correctResult ? (
                <AppText variant="caption" style={styles.pronunciationFeedbackTitle}>Clean and natural!</AppText>
              ) : null}
              <AppText variant="caption" style={styles.pronunciationFeedbackText}>
                {evaluation.status === 'unclear_audio' ? unclearAudioFeedback : evaluation.feedback_en}
              </AppText>
              {!correctResult ? feedbackIssueDescriptions.map((description, index) => (
                <AppText key={`${index}-${description}`} variant="caption" style={styles.pronunciationFeedbackText}>
                  • {description}
                </AppText>
              )) : null}
            </View>
          </View>
        ) : null}

        {renderAttemptPanel()}

        {showSkip ? (
          <Pressable accessibilityRole="button" disabled={skipPending} onPress={() => void skipCurrentQuestion()} style={styles.pronunciationSkipButton}>
            <AppText variant="caption" style={styles.pronunciationSkipLabel}>{skipPending ? 'SKIPPING…' : 'SKIP →'}</AppText>
          </Pressable>
        ) : null}

        {unclearAudioLimitReached ? (
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.pronunciationContinueButton}>
            <AppText variant="caption" style={styles.pronunciationContinueLabel}>EXIT PRACTICE</AppText>
          </Pressable>
        ) : null}

        {correctResult || finalResult ? (
          <Pressable accessibilityRole="button" onPress={goNext} style={styles.pronunciationContinueButton}>
            <AppText variant="caption" style={styles.pronunciationContinueLabel}>CONTINUE</AppText>
          </Pressable>
        ) : null}
      </ScrollView>
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
    const finalResult = phase === 'feedback' && !retryReady && !unclearAudioLimitReached;
    const showEvaluation = Boolean(evaluation) && (correctResult || finalResult || retryReady || retryInProgress || unclearAudioLimitReached);
    const coachTone = correctResult ? 'success' : showEvaluation ? 'error' : 'instruction';
    const feedbackIssueDescriptions = evaluation?.displayed_issues
      .map((issue) => issue.description_en)
      .filter((description) => description !== evaluation.feedback_en) ?? [];
    const referenceAnswer = evaluation?.corrected_answer
      ?? question.examples.find((example) => example.en)?.en
      ?? null;
    const hasReferenceAudio = Boolean(question.prompt_audio_url);
    const showSkip = phase === 'prompt' || phase === 'recording' || phase === 'review' || retryReady || unclearAudioLimitReached;

    const renderHearPailin = (compact = false) => (
      <View style={[styles.translationReferenceBlock, compact ? styles.translationReferenceBlockCompact : null]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hear Pailin say the answer"
          disabled={!hasReferenceAudio}
          onPress={togglePromptAudio}
          style={[
            styles.translationHearPailinButton,
            compact ? styles.translationHearPailinButtonCompact : null,
            !hasReferenceAudio ? styles.translationHearPailinButtonDisabled : null,
          ]}
        >
          <Image
            source={hasReferenceAudio ? speakerBlueImage : speakerGreyImage}
            contentFit="contain"
            style={styles.translationHearPailinIcon}
          />
          <AppText variant="caption" style={styles.translationHearPailinLabel}>HEAR PAILIN</AppText>
        </Pressable>
        {!compact && referenceAnswer ? (
          <AppText variant="caption" style={styles.translationReferenceAnswer}>“{referenceAnswer}”</AppText>
        ) : null}
      </View>
    );

    const renderAttemptPanel = () => {
      if (phase === 'recording') {
        return (
          <View style={styles.pronunciationActionCard}>
            <AppText variant="caption" style={styles.pronunciationActionTitle}>RECORDING…</AppText>
            <AppText variant="caption" style={styles.pronunciationActionHint}>Tap to stop</AppText>
            <Pressable accessibilityRole="button" accessibilityLabel="Stop recording" onPress={() => void stopRecording()}>
              <Image source={stopRecordRedImage} contentFit="contain" style={styles.pronunciationRecordControl} />
            </Pressable>
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
          <View style={styles.pronunciationActionCard}>
            <AppText variant="caption" style={styles.pronunciationActionTitle}>REVIEW YOUR RECORDING</AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Play your recording"
              onPress={() => void toggleRecordingAudio()}
              style={styles.pronunciationReviewPlayback}
            >
              <Image
                source={recordingPlayerStatus.playing ? pauseBlueImage : playBlueImage}
                contentFit="contain"
                style={styles.pronunciationReviewPlayIcon}
              />
              <AppText variant="caption" style={styles.pronunciationReviewLabel}>Your recording</AppText>
              <AppText variant="caption" style={styles.pronunciationReviewDuration}>
                {formatDuration(recordedDurationMillis)}
              </AppText>
            </Pressable>
            {submitError ? <AppText variant="caption" style={styles.pronunciationSubmitError}>{submitError}</AppText> : null}
            <Pressable accessibilityRole="button" onPress={() => void submitRecording()} style={styles.pronunciationSubmitButton}>
              <AppText variant="caption" style={styles.pronunciationSubmitLabel}>SUBMIT ANSWER</AppText>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => void startRecording()} style={styles.pronunciationRedoButton}>
              <Image source={audioRedoImage} contentFit="contain" style={styles.pronunciationRedoIcon} />
              <AppText variant="caption" style={styles.pronunciationRedoLabel}>Record again</AppText>
            </Pressable>
          </View>
        );
      }

      if (phase === 'prompt' || retryReady) {
        const isRetryAttempt = retryReady || instructionalAttemptNumber === 2;
        return (
          <View style={styles.pronunciationActionCard}>
            <AppText variant="caption" style={styles.pronunciationActionTitle}>
              {isRetryAttempt ? 'TRY AGAIN!' : 'TRANSLATE THE SENTENCE'}
            </AppText>
            <AppText variant="caption" style={styles.pronunciationActionHint}>Tap to speak</AppText>
            <Pressable accessibilityRole="button" accessibilityLabel="Start recording" onPress={() => void startRecording()} style={styles.pronunciationMicButton}>
              <Image source={microphoneWhiteImage} contentFit="contain" style={styles.pronunciationMicIcon} />
            </Pressable>
            <AppText variant="caption" style={styles.pronunciationAttemptLabel}>
              Try {instructionalAttemptNumber} of 2
            </AppText>
            {isRetryAttempt ? renderHearPailin(true) : null}
          </View>
        );
      }

      return null;
    };

    return (
      <ScrollView
        style={styles.pronunciationScroll}
        contentContainerStyle={[
          styles.pronunciationScrollContent,
          { paddingBottom: Math.max(theme.spacing.lg, insets.bottom + theme.spacing.md) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <PracticeProgress {...activeQuestion} />
        <AppText variant="caption" style={styles.pronunciationEyebrow}>THAI TO ENGLISH</AppText>

        <PailinCoachBubble tone={coachTone} instruction="Say it in English!" />

        <View style={styles.translationPromptCard}>
          <AppText language="th" variant="title" style={styles.translationPromptThai}>{question.prompt_th}</AppText>
          {question.test_answer_en ? (
            <AppText variant="caption" style={styles.translationTestAnswer}>{question.test_answer_en}</AppText>
          ) : null}
          <View style={styles.translationDirectionPill}>
            <AppText variant="caption" style={styles.translationDirectionLabel}>Thai</AppText>
            <MaterialIcons name="arrow-forward" size={20} color="#3CA0FE" />
            <AppText variant="caption" style={styles.translationDirectionLabel}>English</AppText>
          </View>
        </View>

        {showEvaluation && evaluation ? (
          <View style={[
            styles.translationFeedbackCard,
            correctResult ? styles.translationFeedbackSuccess : styles.translationFeedbackError,
          ]}>
            <View style={styles.translationLearnerAnswerRow}>
              <Pressable accessibilityRole="button" accessibilityLabel="Play your answer" onPress={() => void toggleRecordingAudio()}>
                <Image
                  source={recordingPlayerStatus.playing
                    ? (correctResult ? pauseBlueImage : pauseRedImage)
                    : (correctResult ? playBlueImage : playRedImage)}
                  contentFit="contain"
                  style={styles.translationLearnerPlayIcon}
                />
              </Pressable>
              <AppText variant="caption" style={styles.translationLearnerAnswerTitle}>YOUR RECORDING</AppText>
            </View>
            <View style={[
              styles.translationFeedbackDivider,
              correctResult ? styles.translationFeedbackDividerSuccess : styles.translationFeedbackDividerError,
            ]} />
            <View style={styles.translationFeedbackDetail}>
              <Image
                source={correctResult ? starsGreenImage : starsRedImage}
                contentFit="contain"
                style={styles.translationFeedbackStars}
              />
              <View style={styles.translationFeedbackCopy}>
                <AppText variant="caption" style={styles.translationFeedbackText}>
                  {evaluation.status === 'unclear_audio' ? unclearAudioFeedback : evaluation.feedback_en}
                </AppText>
                {!correctResult ? feedbackIssueDescriptions.map((description, index) => (
                  <AppText key={`${index}-${description}`} variant="caption" style={styles.translationFeedbackText}>
                    • {description}
                  </AppText>
                )) : null}
              </View>
            </View>
          </View>
        ) : null}

        {showEvaluation && !retryReady && !retryInProgress ? renderHearPailin() : null}
        {renderAttemptPanel()}

        {showSkip ? (
          <Pressable accessibilityRole="button" disabled={skipPending} onPress={() => void skipCurrentQuestion()} style={styles.pronunciationSkipButton}>
            <AppText variant="caption" style={styles.pronunciationSkipLabel}>{skipPending ? 'SKIPPING…' : 'SKIP →'}</AppText>
          </Pressable>
        ) : null}

        {unclearAudioLimitReached ? (
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.pronunciationContinueButton}>
            <AppText variant="caption" style={styles.pronunciationContinueLabel}>EXIT PRACTICE</AppText>
          </Pressable>
        ) : null}

        {correctResult || finalResult ? (
          <Pressable accessibilityRole="button" onPress={goNext} style={styles.pronunciationContinueButton}>
            <AppText variant="caption" style={styles.pronunciationContinueLabel}>CONTINUE</AppText>
          </Pressable>
        ) : null}
      </ScrollView>
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      {renderLessonControls()}

      {practiceSet.practice_type === 'open' ? renderQuestionNavigation() : null}

      {phase === 'evaluating' ? (
        renderEvaluating()
      ) : practiceSet.practice_type === 'pronunciation' ? (
        renderPronunciationExperience()
      ) : practiceSet.practice_type === 'translation' ? (
        renderTranslationExperience()
      ) : phase === 'correct' ? (
        renderCorrect()
      ) : phase === 'feedback' ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>{renderFeedback()}</ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <PracticeProgress {...activeQuestion} />
          <AppText variant="caption" style={styles.eyebrow}>{typeCopy.eyebrow}</AppText>
          <View style={styles.introBlock}>
            <AppText variant="title" style={styles.mainTitle}>{typeCopy.title}</AppText>
            {typeCopy.subtitle ? <AppText variant="body" style={styles.centerText}>{typeCopy.subtitle}</AppText> : null}
          </View>
          {renderPromptCard()}
          {renderRecordingArea()}
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
    borderBottomWidth: 5,
    borderColor: '#14213B',
    borderRadius: 26,
    backgroundColor: '#2F6EEA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: theme.spacing.lg,
  },
  welcomeStartButtonPressed: { transform: [{ translateY: 3 }], borderBottomWidth: 2 },
  welcomeStartIcon: { width: 17, height: 17 },
  welcomeStartLabel: {
    color: theme.colors.surface,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: theme.typography.weights.medium,
    letterSpacing: 0.3,
  },
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
    marginTop: 5,
    color: '#286BEA',
    fontSize: 10,
    lineHeight: 15,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  pronunciationCoachRow: {
    minHeight: 106,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pronunciationCoachImage: { width: 150, height: 130 },
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
  pronunciationCoachBubbleError: {
    marginLeft: -24,
    borderColor: '#FF6268',
    backgroundColor: '#FFF0F1',
  },
  pronunciationCoachMessage: { fontSize: 12, lineHeight: 17, fontWeight: theme.typography.weights.semibold },
  pronunciationSentenceCard: {
    width: '100%',
    minHeight: 142,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    borderBottomWidth: 5,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    paddingTop: 17,
    paddingBottom: 13,
    alignItems: 'center',
  },
  pronunciationSentenceEnglish: {
    fontSize: 19,
    lineHeight: 27,
    fontWeight: theme.typography.weights.bold,
    textAlign: 'center',
  },
  pronunciationSentenceThai: { marginTop: 5, color: '#9A9A9A', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  pronunciationPlaybackRow: {
    width: '100%',
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  pronunciationPlaybackRowResult: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#D9D9D9',
    borderStyle: 'dashed',
    paddingTop: 13,
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
  },
  pronunciationActionTitle: { fontSize: 11, lineHeight: 16, fontWeight: theme.typography.weights.semibold },
  pronunciationActionHint: { marginTop: 1, color: '#969696', fontSize: 10, lineHeight: 15 },
  pronunciationRecordControl: { width: 70, height: 70, marginTop: 10 },
  pronunciationTimerRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  pronunciationTimerDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FF6268' },
  pronunciationTimerText: { color: '#9A9A9A', fontSize: 10, lineHeight: 15 },
  pronunciationMicButton: {
    width: 78,
    height: 78,
    marginTop: 8,
    borderRadius: 39,
    borderWidth: 8,
    borderColor: '#DBECFF',
    backgroundColor: '#2F6EEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pronunciationMicIcon: { width: 43, height: 43 },
  pronunciationAttemptLabel: { marginTop: 7, color: '#969696', fontSize: 11, lineHeight: 16 },
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
  pronunciationReviewPlayIcon: { width: 23, height: 23 },
  pronunciationReviewLabel: { flex: 1, marginLeft: 6, fontSize: 11, lineHeight: 16, fontWeight: theme.typography.weights.semibold },
  pronunciationReviewDuration: { color: '#969696', fontSize: 10, lineHeight: 15 },
  pronunciationSubmitButton: {
    width: '68%',
    minHeight: 36,
    marginTop: 12,
    borderRadius: 19,
    backgroundColor: '#2F6EEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pronunciationSubmitLabel: { color: theme.colors.surface, fontSize: 10, lineHeight: 15, fontWeight: theme.typography.weights.semibold },
  pronunciationRedoButton: { marginTop: 9, flexDirection: 'row', alignItems: 'center', gap: 4 },
  pronunciationRedoIcon: { width: 14, height: 14 },
  pronunciationRedoLabel: { fontSize: 10, lineHeight: 15 },
  pronunciationSubmitError: { marginTop: 7, color: theme.colors.error, fontSize: 10, lineHeight: 15, textAlign: 'center' },
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
  pronunciationFeedbackError: { borderColor: '#FF6268', backgroundColor: '#FFF0F1' },
  pronunciationFeedbackStars: { width: 42, height: 42 },
  pronunciationFeedbackCopy: { flex: 1, gap: 3 },
  pronunciationFeedbackTitle: { fontSize: 13, lineHeight: 18, fontWeight: theme.typography.weights.semibold },
  pronunciationFeedbackText: { fontSize: 12, lineHeight: 18 },
  pronunciationSkipButton: { alignSelf: 'center', marginTop: 'auto', paddingHorizontal: 20, paddingTop: 28, paddingBottom: 8 },
  pronunciationSkipLabel: { fontSize: 10, lineHeight: 15, fontWeight: theme.typography.weights.medium },
  pronunciationContinueButton: {
    width: '100%',
    minHeight: 50,
    marginTop: 'auto',
    borderWidth: 1,
    borderBottomWidth: 5,
    borderColor: '#14213B',
    borderRadius: 26,
    backgroundColor: '#2F6EEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pronunciationContinueLabel: { color: theme.colors.surface, fontSize: 13, lineHeight: 18, fontWeight: theme.typography.weights.medium },
  translationPromptCard: {
    width: '100%',
    minHeight: 122,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    borderBottomWidth: 5,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 18,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: 18,
    backgroundColor: '#FFF9DF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  translationDirectionLabel: { color: '#696969', fontSize: 10, lineHeight: 15 },
  translationFeedbackCard: {
    width: '100%',
    marginTop: 18,
    borderWidth: 1,
    borderRadius: 9,
    overflow: 'hidden',
  },
  translationFeedbackSuccess: { borderColor: '#A9E64D', backgroundColor: '#F0FFD9' },
  translationFeedbackError: { borderColor: '#FF6268', backgroundColor: '#FFF0F1' },
  translationLearnerAnswerRow: {
    minHeight: 66,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  translationLearnerPlayIcon: { width: 38, height: 38 },
  translationLearnerAnswerTitle: { fontSize: 12, lineHeight: 17, fontWeight: theme.typography.weights.bold },
  translationFeedbackDivider: { height: 1 },
  translationFeedbackDividerSuccess: { backgroundColor: '#A9E64D' },
  translationFeedbackDividerError: { backgroundColor: '#FF6268' },
  translationFeedbackDetail: {
    minHeight: 78,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  translationFeedbackStars: { width: 36, height: 36 },
  translationFeedbackCopy: { flex: 1, gap: 3 },
  translationFeedbackText: { fontSize: 12, lineHeight: 18 },
  translationReferenceBlock: { alignItems: 'center', marginTop: 16, gap: 7 },
  translationReferenceBlockCompact: { marginTop: 10, gap: 0 },
  translationHearPailinButton: {
    minWidth: 138,
    minHeight: 38,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  translationHearPailinButtonCompact: { minWidth: 96, minHeight: 26, borderRadius: 14, paddingHorizontal: 9 },
  translationHearPailinButtonDisabled: { opacity: 0.62 },
  translationHearPailinIcon: { width: 20, height: 20 },
  translationHearPailinLabel: { color: '#666666', fontSize: 10, lineHeight: 15, fontWeight: theme.typography.weights.medium },
  translationReferenceAnswer: { color: '#6F6F6F', fontSize: 12, lineHeight: 18, fontStyle: 'italic', textAlign: 'center' },
  topBar: { minHeight: 64, paddingHorizontal: theme.spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
  progressRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: theme.spacing.sm },
  progressConnector: {
    width: 32,
    marginHorizontal: 2,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#C9D2DC',
  },
  progressDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: '#C9D2DC', backgroundColor: theme.colors.surface },
  progressDotActive: { borderColor: theme.colors.border, backgroundColor: '#BDEAFF' },
  eyebrow: { color: theme.colors.accent, fontWeight: theme.typography.weights.bold, letterSpacing: 0.7, textAlign: 'center', fontSize: 12 },
  introBlock: { alignItems: 'center', gap: 2 },
  mainTitle: { textAlign: 'center', fontSize: 24, lineHeight: 32, fontWeight: theme.typography.weights.bold },
  centerText: { textAlign: 'center' },
  promptCard: { borderRadius: theme.radii.md, shadowColor: theme.colors.shadow, shadowOffset: { width: 4, height: 5 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 },
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
  skipText: { textDecorationLine: 'underline', padding: theme.spacing.sm },
  sampleText: { color: theme.colors.accent, textDecorationLine: 'underline', padding: theme.spacing.sm },
  reviewBlock: { width: '100%', paddingTop: theme.spacing.md },
  stateTitle: { textAlign: 'center', fontSize: 24, lineHeight: 32, fontWeight: theme.typography.weights.bold },
  playbackButton: { minHeight: 50, borderWidth: 1, borderColor: '#C9D2DC', borderRadius: theme.radii.md, backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.md },
  playbackIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center' },
  playbackLabel: { flex: 1, fontWeight: theme.typography.weights.semibold },
  submitError: { color: theme.colors.primary, textAlign: 'center' },
  fullState: { flex: 1, maxWidth: 520, width: '100%', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.lg, paddingHorizontal: theme.spacing.xl, paddingBottom: 80 },
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
