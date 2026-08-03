import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  fetchExerciseBankV2Set,
  fetchExerciseBankV2Topic,
  submitExerciseBankV2Answer,
} from '@/src/api/exercise-bank';
import { AndroidNeoShadowLayer } from '@/src/components/ui/AndroidNeoShadowLayer';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { LanguageToggle } from '@/src/components/ui/LanguageToggle';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
import { StandardPageHeader } from '@/src/components/ui/StandardPageHeader';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';
import {
  ExerciseBankAnswer,
  ExerciseBankAnswerResult,
  ExerciseBankTopicDetail,
  ExerciseBankV2Question,
  ExerciseBankV2Set,
} from '@/src/types/exercise-bank';

type UiLanguage = 'en' | 'th';

const getParam = (value?: string | string[]) => (Array.isArray(value) ? value[0] ?? '' : value ?? '');

const getCopy = (language: UiLanguage) => language === 'th' ? {
  back: 'กลับ', set: 'ชุดที่', question: 'คำถาม', of: 'จาก', check: 'ตรวจคำตอบ', checking: 'กำลังตรวจ…',
  continue: 'ต่อไป', correct: 'ถูกต้อง!', incorrect: 'ยังไม่ถูกต้อง', retry: 'ลองคำถามที่พลาดอีกครั้ง',
  backToTopics: 'กลับไปที่หัวข้อ', setFinished: 'จบชุดแบบฝึกหัด', mastered: 'ทำสำเร็จ', chooseSet: 'เลือกชุดแบบฝึกหัด',
  typeAnswer: 'พิมพ์คำตอบ', rewrite: 'เขียนประโยคใหม่', sentenceCorrect: 'ประโยคนี้ถูกต้อง',
  sentenceIncorrect: 'ประโยคนี้ไม่ถูกต้อง', loadError: 'ไม่สามารถโหลดแบบฝึกหัดได้', tryAgain: 'ลองอีกครั้ง',
} : {
  back: 'Back', set: 'Set', question: 'Question', of: 'of', check: 'Check answer', checking: 'Checking…',
  continue: 'Continue', correct: 'Correct!', incorrect: 'Not quite yet', retry: 'Retry missed questions',
  backToTopics: 'Back to topics', setFinished: 'Set finished', mastered: 'mastered', chooseSet: 'Choose a set',
  typeAnswer: 'Type your answer', rewrite: 'Rewrite the sentence', sentenceCorrect: 'The sentence is correct',
  sentenceIncorrect: 'The sentence is incorrect', loadError: 'Unable to load this exercise.', tryAgain: 'Try again',
};

const hasAnswer = (answer: ExerciseBankAnswer | undefined) => {
  if (typeof answer === 'string') return answer.trim().length > 0;
  if (!answer || typeof answer.marked_as_correct !== 'boolean') return false;
  return answer.marked_as_correct || answer.rewrite.trim().length > 0;
};

type QuestionInputProps = {
  answer: ExerciseBankAnswer | undefined;
  disabled: boolean;
  language: UiLanguage;
  onChange: (answer: ExerciseBankAnswer) => void;
  question: ExerciseBankV2Question;
};

function QuestionInput({ answer, disabled, language, onChange, question }: QuestionInputProps) {
  const copy = getCopy(language);
  const exerciseType = question.exercise.exercise_type;
  const isJudgment = exerciseType === 'sentence_transform'
    && /correct.*incorrect|incorrect.*correct/i.test(question.exercise.display_type);

  if (exerciseType === 'multiple_choice') {
    const selectedLabel = typeof answer === 'string' ? answer : '';
    return (
      <View style={styles.optionList}>
        {(question.content.options ?? []).map((option) => (
          <Pressable
            key={option.label}
            accessibilityRole="radio"
            accessibilityState={{ checked: selectedLabel === option.label, disabled }}
            disabled={disabled}
            style={[styles.optionButton, selectedLabel === option.label ? styles.optionButtonSelected : null]}
            onPress={() => onChange(option.label)}>
            <View style={styles.optionLabelCircle}>
              <AppText language="en" variant="caption" style={styles.optionLabel}>{option.label}</AppText>
            </View>
            <AppText language="en" variant="body" style={styles.optionText}>{option.text}</AppText>
          </Pressable>
        ))}
      </View>
    );
  }

  if (isJudgment) {
    const judgment = typeof answer === 'object' ? answer.marked_as_correct : undefined;
    const rewrite = typeof answer === 'object' ? answer.rewrite : '';
    return (
      <View style={styles.inputGroup}>
        <View style={styles.judgmentRow}>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: judgment === true, disabled }}
            disabled={disabled}
            style={[styles.judgmentButton, judgment === true ? styles.optionButtonSelected : null]}
            onPress={() => onChange({ marked_as_correct: true, rewrite: '' })}>
            <AppText language={language} variant="caption" style={styles.judgmentText}>{copy.sentenceCorrect}</AppText>
          </Pressable>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: judgment === false, disabled }}
            disabled={disabled}
            style={[styles.judgmentButton, judgment === false ? styles.optionButtonSelected : null]}
            onPress={() => onChange({ marked_as_correct: false, rewrite })}>
            <AppText language={language} variant="caption" style={styles.judgmentText}>{copy.sentenceIncorrect}</AppText>
          </Pressable>
        </View>
        {judgment === false ? (
          <TextInput
            accessibilityLabel={copy.rewrite}
            editable={!disabled}
            multiline
            placeholder={copy.rewrite}
            placeholderTextColor={theme.colors.mutedText}
            style={[styles.textInput, styles.multilineInput, language === 'th' ? styles.thaiInput : styles.englishInput]}
            value={rewrite}
            onChangeText={(value) => onChange({ marked_as_correct: false, rewrite: value })}
          />
        ) : null}
      </View>
    );
  }

  const multiline = exerciseType === 'sentence_transform' || exerciseType === 'open' || exerciseType === 'open_ended';
  return (
    <TextInput
      accessibilityLabel={copy.typeAnswer}
      autoCapitalize="sentences"
      editable={!disabled}
      multiline={multiline}
      placeholder={copy.typeAnswer}
      placeholderTextColor={theme.colors.mutedText}
      style={[
        styles.textInput,
        multiline ? styles.multilineInput : null,
        language === 'th' ? styles.thaiInput : styles.englishInput,
      ]}
      value={typeof answer === 'string' ? answer : ''}
      onChangeText={onChange}
    />
  );
}

export function ExerciseBankSessionScreen() {
  const router = useRouter();
  const { uiLanguage } = useUiLanguage();
  const copy = getCopy(uiLanguage);
  const params = useLocalSearchParams<{ topicId?: string | string[]; setNumber?: string | string[] }>();
  const topicId = getParam(params.topicId);
  const setNumberParam = getParam(params.setNumber);
  const setNumber = Number.parseInt(setNumberParam, 10);
  const hasSetNumber = Number.isInteger(setNumber) && setNumber > 0;
  const [topicDetail, setTopicDetail] = useState<ExerciseBankTopicDetail | null>(null);
  const [topicTitle, setTopicTitle] = useState('');
  const [setData, setSetData] = useState<ExerciseBankV2Set | null>(null);
  const [queue, setQueue] = useState<number[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, ExerciseBankAnswer>>({});
  const [results, setResults] = useState<Record<number, ExerciseBankAnswerResult>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsFinished(false);
    setAnswers({});
    setResults({});
    try {
      if (!topicId) throw new Error(copy.loadError);
      if (!hasSetNumber) {
        const detail = await fetchExerciseBankV2Topic(topicId);
        setTopicDetail(detail);
        setTopicTitle(detail.display_title);
        if (detail.next_incomplete_set) {
          router.replace({
            pathname: '/(tabs)/resources/exercise-bank/topic/[topicId]',
            params: { topicId, setNumber: String(detail.next_incomplete_set) },
          });
        }
        return;
      }

      const response = await fetchExerciseBankV2Set(topicId, setNumber);
      setTopicTitle(response.topic.display_title);
      setSetData(response.set);
      const incompleteIds = response.set.questions
        .filter((question) => !question.progress.has_answered_correctly)
        .map((question) => question.id);
      setQueue(incompleteIds.length ? incompleteIds : response.set.questions.map((question) => question.id));
      setQueueIndex(0);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.loadError);
    } finally {
      setIsLoading(false);
    }
  }, [copy.loadError, hasSetNumber, router, setNumber, topicId]);

  useEffect(() => { void load(); }, [load]);

  const questionsById = useMemo(
    () => new Map((setData?.questions ?? []).map((question) => [question.id, question])),
    [setData]
  );
  const currentQuestion = questionsById.get(queue[queueIndex]);
  const currentResult = currentQuestion ? results[currentQuestion.id] : undefined;
  const masteredCount = setData?.questions.filter((question) => question.progress.has_answered_correctly).length ?? 0;

  const submit = async () => {
    if (!currentQuestion || !hasAnswer(answers[currentQuestion.id])) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await submitExerciseBankV2Answer(currentQuestion.id, answers[currentQuestion.id]);
      setResults((current) => ({ ...current, [currentQuestion.id]: result }));
      if (result.correct) {
        setSetData((current) => current ? {
          ...current,
          questions: current.questions.map((question) => question.id === currentQuestion.id
            ? { ...question, progress: { ...question.progress, has_answered_correctly: true } }
            : question),
        } : current);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.loadError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const advance = () => {
    if (queueIndex < queue.length - 1) setQueueIndex((current) => current + 1);
    else setIsFinished(true);
  };

  const retryMissed = () => {
    if (!setData) return;
    const missed = setData.questions.filter((question) => !question.progress.has_answered_correctly).map((question) => question.id);
    setQueue(missed);
    setQueueIndex(0);
    setAnswers((current) => Object.fromEntries(Object.entries(current).filter(([id]) => !missed.includes(Number(id)))));
    setResults((current) => Object.fromEntries(Object.entries(current).filter(([id]) => !missed.includes(Number(id)))));
    setIsFinished(false);
    setErrorMessage(null);
  };

  if (isLoading) return <PageLoadingState language={uiLanguage} />;

  if (errorMessage && !setData && !topicDetail) {
    return (
      <View style={styles.fullState}>
        <AppText language={uiLanguage} variant="body" style={styles.stateTitle}>{copy.loadError}</AppText>
        <AppText language={uiLanguage} variant="muted" style={styles.stateBody}>{errorMessage}</AppText>
        <Button title={copy.tryAgain} language={uiLanguage} onPress={() => void load()} />
        <Button title={copy.backToTopics} language={uiLanguage} variant="outline" onPress={() => router.back()} />
      </View>
    );
  }

  if (!hasSetNumber && topicDetail) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
        <ResponsivePageShell>
          <StandardPageHeader language={uiLanguage} title="" hideTitle onBackPress={() => router.back()} backLabel={copy.back} rightElement={<LanguageToggle compact />} />
          <View style={styles.pickerContent}>
            <AppText language="en" variant="title" style={styles.pickerTitle}>{topicDetail.display_title}</AppText>
            <AppText language={uiLanguage} variant="body" style={styles.pickerSubtitle}>{copy.chooseSet}</AppText>
            <View style={styles.setList}>{topicDetail.sets.map((item) => (
              <Pressable key={item.set_number} style={styles.setButton} onPress={() => router.setParams({ setNumber: String(item.set_number) })}>
                <AppText language={uiLanguage} variant="body" style={styles.setButtonTitle}>{copy.set} {item.set_number}</AppText>
                <AppText language={uiLanguage} variant="caption">{item.mastered_questions}/{item.question_count} {copy.mastered}</AppText>
              </Pressable>
            ))}</View>
          </View>
        </ResponsivePageShell>
      </ScrollView>
    );
  }

  if (!setData || !currentQuestion) return <PageLoadingState language={uiLanguage} />;

  if (isFinished) {
    return (
      <View style={styles.fullState}>
        <View style={styles.completeIcon}><AppText language="en" variant="title" style={styles.completeIconText}>✓</AppText></View>
        <AppText language={uiLanguage} variant="title" style={styles.completeTitle}>{copy.setFinished}</AppText>
        <AppText language={uiLanguage} variant="body">{masteredCount}/{setData.question_count} {copy.mastered}</AppText>
        {masteredCount < setData.question_count ? <Button title={copy.retry} language={uiLanguage} onPress={retryMissed} /> : null}
        <Button title={copy.backToTopics} language={uiLanguage} variant="outline" onPress={() => router.back()} />
      </View>
    );
  }

  const feedback = uiLanguage === 'th' ? currentResult?.feedback_th : currentResult?.feedback_en;
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.contentContainer}>
        <ResponsivePageShell>
          <StandardPageHeader language={uiLanguage} title="" hideTitle onBackPress={() => router.back()} backLabel={copy.back} rightElement={<LanguageToggle compact />} />
          <View style={styles.sessionContent}>
            <View style={styles.sessionHeading}>
              <View>
                <AppText language={uiLanguage} variant="caption">{copy.set} {setData.set_number}</AppText>
                <AppText language={uiLanguage} variant="body" style={styles.questionCounter}>{copy.question} {queueIndex + 1} {copy.of} {queue.length}</AppText>
              </View>
              <AppText language="en" variant="caption" numberOfLines={1} style={styles.topicTitle}>{topicTitle}</AppText>
            </View>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${((queueIndex + 1) / queue.length) * 100}%` }]} /></View>

            <View style={styles.questionCardWrap}>
              <AndroidNeoShadowLayer borderRadius={theme.radii.lg} color={theme.colors.shadow} offset={3} />
              <View style={styles.questionCard}>
                <AppText language="en" variant="caption" style={styles.displayType}>{currentQuestion.exercise.display_type}</AppText>
                <AppText language="en" variant="body" style={styles.prompt}>{currentQuestion.exercise.prompt}</AppText>
                {currentQuestion.content.stem || currentQuestion.content.text ? (
                  <AppText language="en" variant="body" style={styles.stem}>{currentQuestion.content.stem ?? currentQuestion.content.text}</AppText>
                ) : null}
                <QuestionInput
                  answer={answers[currentQuestion.id]}
                  disabled={Boolean(currentResult)}
                  language={uiLanguage}
                  question={currentQuestion}
                  onChange={(answer) => setAnswers((current) => ({ ...current, [currentQuestion.id]: answer }))}
                />
                {errorMessage ? <AppText language={uiLanguage} variant="caption" style={styles.errorText}>{errorMessage}</AppText> : null}
                {currentResult ? (
                  <View style={[styles.feedback, currentResult.correct ? styles.feedbackCorrect : styles.feedbackIncorrect]}>
                    <AppText language={uiLanguage} variant="body" style={styles.feedbackTitle}>{currentResult.correct ? copy.correct : copy.incorrect}</AppText>
                    {feedback ? <AppText language={uiLanguage} variant="caption">{feedback}</AppText> : null}
                  </View>
                ) : null}
                <Button
                  title={currentResult ? copy.continue : isSubmitting ? copy.checking : copy.check}
                  language={uiLanguage}
                  disabled={isSubmitting || (!currentResult && !hasAnswer(answers[currentQuestion.id]))}
                  onPress={currentResult ? advance : () => void submit()}
                />
              </View>
            </View>
          </View>
        </ResponsivePageShell>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  contentContainer: { flexGrow: 1, paddingBottom: theme.spacing.xl * 2 },
  sessionContent: { paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md, gap: theme.spacing.md },
  sessionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: theme.spacing.md },
  questionCounter: { fontWeight: theme.typography.weights.bold },
  topicTitle: { flex: 1, textAlign: 'right', color: theme.colors.mutedText },
  progressTrack: { height: 10, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radii.xl, backgroundColor: '#E8E8E8' },
  progressFill: { height: '100%', backgroundColor: theme.colors.accent },
  questionCardWrap: { position: 'relative', width: '100%' },
  questionCard: { borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: theme.radii.lg, backgroundColor: theme.colors.surface, padding: theme.spacing.lg, gap: theme.spacing.md, ...Platform.select({ ios: { shadowColor: theme.colors.shadow, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 }, android: { elevation: 0 } }) },
  displayType: { color: '#2D4C7C', fontSize: 12, fontWeight: theme.typography.weights.bold, textTransform: 'uppercase' },
  prompt: { fontSize: 18, lineHeight: 25, fontWeight: theme.typography.weights.bold },
  stem: { fontSize: 17, lineHeight: 26 },
  optionList: { gap: theme.spacing.sm },
  optionButton: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: theme.radii.md, backgroundColor: theme.colors.surface, padding: theme.spacing.md },
  optionButtonSelected: { backgroundColor: theme.colors.accentMuted, borderColor: '#2D4C7C' },
  optionLabelCircle: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: theme.colors.accentMuted },
  optionLabel: { fontWeight: theme.typography.weights.bold },
  optionText: { flex: 1 },
  inputGroup: { gap: theme.spacing.md },
  judgmentRow: { flexDirection: 'row', gap: theme.spacing.sm },
  judgmentButton: { flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: theme.radii.md, backgroundColor: theme.colors.surface, padding: theme.spacing.sm },
  judgmentText: { textAlign: 'center', fontWeight: theme.typography.weights.semibold },
  textInput: { minHeight: 50, borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: theme.radii.md, backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, color: theme.colors.text, fontSize: 16 },
  multilineInput: { minHeight: 110, textAlignVertical: 'top' },
  englishInput: { fontFamily: theme.typography.fontFaces.en.regular },
  thaiInput: { fontFamily: theme.typography.fontFaces.th.regular },
  feedback: { gap: theme.spacing.xs, borderRadius: theme.radii.md, padding: theme.spacing.md },
  feedbackCorrect: { backgroundColor: '#DCF7E8' },
  feedbackIncorrect: { backgroundColor: '#FFF0ED' },
  feedbackTitle: { fontWeight: theme.typography.weights.bold },
  errorText: { color: theme.colors.error },
  fullState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md, backgroundColor: theme.colors.background, padding: theme.spacing.xl },
  stateTitle: { textAlign: 'center', fontWeight: theme.typography.weights.bold },
  stateBody: { textAlign: 'center' },
  completeIcon: { width: 68, height: 68, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 34, backgroundColor: theme.colors.success },
  completeIconText: { fontWeight: theme.typography.weights.bold },
  completeTitle: { textAlign: 'center', fontSize: 28 },
  pickerContent: { padding: theme.spacing.lg, gap: theme.spacing.md },
  pickerTitle: { textAlign: 'left', fontSize: 28, fontWeight: theme.typography.weights.bold },
  pickerSubtitle: { fontWeight: theme.typography.weights.semibold },
  setList: { gap: theme.spacing.sm },
  setButton: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: theme.radii.md, backgroundColor: theme.colors.surface, padding: theme.spacing.md },
  setButtonTitle: { fontWeight: theme.typography.weights.bold },
});
