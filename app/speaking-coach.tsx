import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Asset } from 'expo-asset';
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
} from '@/src/api/speaking-coach';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { Stack as UiStack } from '@/src/components/ui/Stack';
import { theme } from '@/src/theme/theme';
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
        <View
          key={index}
          style={[styles.progressDot, index + 1 === question.position ? styles.progressDotActive : null]}
        />
      ))}
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
  const initialLessonId = typeof params.lesson === 'string' && params.lesson.trim() ? params.lesson : '4.1';
  const [lessonId, setLessonId] = useState(initialLessonId);
  const [selectedLevel, setSelectedLevel] = useState(lessonLevel(initialLessonId));
  const [lessonOptions, setLessonOptions] = useState<SpeakingCoachLessonSummary[]>([]);
  const [lessonOptionsLoading, setLessonOptionsLoading] = useState(true);
  const [lessonOptionsError, setLessonOptionsError] = useState<string | null>(null);
  const [lesson, setLesson] = useState<SpeakingCoachLesson | null>(null);
  const [session, setSession] = useState<SpeakingCoachSession | null>(null);
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
    setQuestionIndex(0);
    setPhase('prompt');
    setRecordedUri(null);

    setEvaluation(null);
    setInstructionalAttemptNumber(1);
    setPreviousAttemptId(null);
    setSubmitError(null);

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
    try {
      const response = await evaluateSpeakingRecording({
        uri: recordedUri,
        fileName: recordedFile.name,
        mimeType: recordedFile.mimeType,
        sessionId: session.id,
        questionId: activeQuestion.question.id,
        instructionalAttemptNumber,
        previousAttemptId,
      });
      if (__DEV__ && response.attempt.debug) {
        const evaluatorTimings = response.attempt.debug.provider_response.timings_ms;
        console.log('[Speaking Coach] Evaluation timing summary', {
          client_total_ms: Date.now() - evaluationStarted,
          provider_latency_ms: response.attempt.debug.latency_ms,
          backend_stages_ms: response.attempt.debug.request_timings_ms,
          evaluator_stages_ms: evaluatorTimings,
        });
        console.log(
          '[Speaking Coach] Evaluator diagnostics\n',
          JSON.stringify(response.attempt.debug, null, 2)
        );
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

  const { practiceSet, question } = activeQuestion;
  const sessionResetDisabled = phase === 'recording' || phase === 'evaluating';
  const typeCopy = TYPE_COPY[practiceSet.practice_type];
  const hasPromptAudio = Boolean(question.prompt_audio_url) && practiceSet.practice_type !== 'translation';
  const pailinPlaybackLabel = practiceSet.practice_type === 'pronunciation' ? 'Pailin’s version' : 'Replay question';
  const learnerPlaybackLabel = practiceSet.practice_type === 'translation' ? 'Your translation' : practiceSet.practice_type === 'open' ? 'Your answer' : 'Your recording';
  const isCompletedQuestion = session.completed_question_ids.includes(question.id);
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
        <Pressable accessibilityRole="button" onPress={goNext}>
          <AppText variant="muted" style={styles.skipText}>Skip</AppText>
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
            {isUnclear ? 'Let’s record that again' : isRetry ? 'Almost—try once more' : 'Here’s the correction'}
          </AppText>
          <AppText variant="body" style={styles.centerText}>
            {evaluation.feedback_en}
          </AppText>
          <AppText language="th" variant="muted" style={styles.centerText}>{evaluation.feedback_th}</AppText>
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
            ) : practiceSet.practice_type !== 'open' && evaluation.transcript ? (
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

        {isRetry || isUnclear ? (
          <Button title={isUnclear ? 'Record again' : 'Try again'} onPress={() => void startRecording()} />
        ) : (
          <Button title="Next question" onPress={goNext} />
        )}
      </UiStack>
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topBar}>
        <View style={styles.screenTitleBlock}>
          <AppText variant="caption" style={styles.screenEyebrow}>SPEAKING COACH TEST</AppText>
          <AppText variant="body" style={styles.selectedLessonTitle}>Lesson {lessonOptionLabel(lessonId)}</AppText>
        </View>
        <View style={styles.topBarActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start a new speaking coach test session"
            disabled={sessionResetDisabled}
            onPress={() => void retestInFreshSession()}
            style={({ pressed }) => [
              styles.newSessionButton,
              pressed && !sessionResetDisabled ? styles.newSessionButtonPressed : null,
              sessionResetDisabled ? styles.newSessionButtonDisabled : null,
            ]}
          >
            <MaterialIcons name="refresh" size={17} color={theme.colors.accent} />
            <AppText variant="caption" style={styles.newSessionLabel}>New session</AppText>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.closeButton}>
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

      {renderQuestionNavigation()}

      {phase === 'evaluating' ? (
        renderEvaluating()
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
  progressRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: theme.spacing.sm, paddingTop: theme.spacing.sm },
  progressDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: '#C9D2DC', backgroundColor: theme.colors.surface },
  progressDotActive: { borderColor: theme.colors.border, backgroundColor: theme.colors.accent },
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
