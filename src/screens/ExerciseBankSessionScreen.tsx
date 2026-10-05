import { ScriptAwareTextInput } from '@/src/components/ui/ScriptAwareTextInput';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  advanceExerciseBankV2Set,
  fetchExerciseBankV2Session,
  saveExerciseBankV2Cursor,
  submitExerciseBankV2Answer,
} from '@/src/api/exercise-bank';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { ExerciseSetResultCard } from '@/src/components/practice/ExerciseSetResultCard';
import {
  FillBlankExampleDisclosure,
  FillBlankExampleSentence,
  PracticeImage,
  practiceColors,
  PracticeSectionLabel,
  PracticeSurface,
  PracticeAnswerFooter,
  SentenceTransformExampleDisclosure,
} from '@/src/components/practice/PracticeExerciseUI';
import { LanguageToggle } from '@/src/components/ui/LanguageToggle';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
import { ResourcePageHeader } from '@/src/components/resources/ResourcePageHeader';
import { useUiLanguage } from '@/src/context/ui-language-context';
import {
  localizeExerciseBankQuestion,
  localizeExerciseBankTopic,
} from '@/src/lib/exercise-bank-localization';
import { theme } from '@/src/theme/theme';
import completionPerfectImage from '@/assets/images/speaking-coach/pailin-set-complete.webp';
import completionProgressImage from '@/assets/images/pailin-extra-tips.webp';
import completionPracticeImage from '@/assets/images/pailin-common-mistakes.webp';
import {
  ExerciseBankAnswer,
  ExerciseBankAnswerResult,
  ExerciseBankTopic,
  ExerciseBankTopicDetail,
  ExerciseBankV2Example,
  ExerciseBankV2Question,
  ExerciseBankV2Set,
} from '@/src/types/exercise-bank';

type UiLanguage = 'en' | 'th';

type ExerciseBankSessionTopic = Pick<
  ExerciseBankTopic,
  'id' | 'topic' | 'topic_en' | 'topic_th' | 'display_title' | 'display_title_en' | 'display_title_th'
>;

const getParam = (value?: string | string[]) => (Array.isArray(value) ? value[0] ?? '' : value ?? '');

const getCopy = (language: UiLanguage) => language === 'th' ? {
  back: 'กลับ', set: 'ชุดที่', question: 'คำถาม', of: 'จาก', check: 'ตรวจคำตอบ', checking: 'กำลังตรวจ…',
  continue: 'ถัดไป', answerTryAgain: 'ลองอีกครั้ง', correct: 'ถูกต้อง!', incorrect: 'ไม่ถูกต้อง', skip: 'ข้าม', retry: 'ลองคำถามที่พลาดอีกครั้ง',
  backToTopics: 'กลับไปที่หัวข้อ', setFinished: 'จบชุดแบบฝึกหัด', mastered: 'ทำสำเร็จ', chooseSet: 'เลือกชุดแบบฝึกหัด',
  typeAnswer: 'พิมพ์คำตอบ', rewrite: 'เขียนประโยคใหม่', sentenceCorrect: 'ประโยคนี้ถูกต้อง',
  sentenceIncorrect: 'ประโยคนี้ไม่ถูกต้อง', loadError: 'ไม่สามารถโหลดแบบฝึกหัดได้', tryAgain: 'ลองอีกครั้ง',
  example: 'ตัวอย่าง', answer: 'คำตอบ', exampleCorrect: 'ถูกต้อง', exampleIncorrect: 'ไม่ถูกต้อง', showAnswer: 'ดูคำตอบ', hideAnswer: 'ซ่อนคำตอบ', answerUnavailable: 'ยังไม่สามารถแสดงคำตอบได้',
  greatWork: 'เยี่ยมมาก!', greatProgress: 'พัฒนาได้ดีมาก!', keepPracticing: 'ฝึกต่อไป!', gotCorrect: 'คุณตอบถูก', perfectBody: 'คุณตอบถูกทุกข้อ! พร้อมสำหรับความท้าทายต่อไปแล้ว', progressBody: 'ใกล้เข้าใจหัวข้อนี้แล้ว ลองอีกครั้งหรือฝึกต่อไป', practiceBody: 'ไวยากรณ์ต้องใช้เวลา ทบทวนแบบฝึกหัดแล้วลองอีกครั้ง คุณทำได้!', goNextSet: 'ไปชุดถัดไป', chooseNewTopic: 'เลือกหัวข้อใหม่', backToBank: 'กลับคลังแบบฝึกหัด',
} : {
  back: 'Back', set: 'Set', question: 'Question', of: 'of', check: 'CHECK ANSWER', checking: 'CHECKING…',
  continue: 'NEXT', answerTryAgain: 'TRY AGAIN', correct: 'Correct!', incorrect: 'Incorrect', skip: 'Skip', retry: 'Retry missed questions',
  backToTopics: 'Back to topics', setFinished: 'Set finished', mastered: 'mastered', chooseSet: 'Choose a set',
  typeAnswer: 'Type your answer', rewrite: 'Rewrite the sentence', sentenceCorrect: 'The sentence is correct',
  sentenceIncorrect: 'The sentence is incorrect', loadError: 'Unable to load this exercise.', tryAgain: 'Try again',
  example: 'Example', answer: 'Answer', exampleCorrect: 'Correct', exampleIncorrect: 'Incorrect', showAnswer: 'Show Answer', hideAnswer: 'Hide Answer', answerUnavailable: 'The answer is not available yet.',
  greatWork: 'Amazing!', greatProgress: 'Good job!', keepPracticing: 'Nice effort!', gotCorrect: 'You got', perfectBody: "You nailed every single question! You're ready for the next challenge.", progressBody: "You're super close to mastering this concept! Give it another shot or keep moving.", practiceBody: "Grammar takes time to master. Review the exercise and try again. You've got this!", goNextSet: 'Go to Next Set', chooseNewTopic: 'Choose a New Topic', backToBank: 'Back to Exercise Bank',
};

const hasAnswer = (answer: ExerciseBankAnswer | undefined) => {
  if (typeof answer === 'string') return answer.trim().length > 0;
  if (!answer || typeof answer.marked_as_correct !== 'boolean') return false;
  return answer.marked_as_correct || answer.rewrite.trim().length > 0;
};

const estimateFillBlankWidth = (containerWidth: number, minLen: number) => {
  const fontSize = 17;
  const horizontalPadding = theme.spacing.sm;
  const safeLength = Math.max(1, minLen);
  const rawWidth = (safeLength + 1) * fontSize * 0.56 + horizontalPadding * 2;
  const minimumWidth = fontSize * 4.2;
  const responsiveMaximum = containerWidth > 0 ? containerWidth * 0.72 : 220;
  return Math.round(Math.max(minimumWidth, Math.min(220, responsiveMaximum, rawWidth)));
};

type QuestionInputProps = {
  answer: ExerciseBankAnswer | undefined;
  disabled: boolean;
  judgmentRewriteStage?: boolean;
  language: UiLanguage;
  onChange: (answer: ExerciseBankAnswer) => void;
  question: ExerciseBankV2Question;
  result?: ExerciseBankAnswerResult;
};

type ExamplePanelProps = {
  example: ExerciseBankV2Example;
  exerciseType: string;
  language: UiLanguage;
};

function ExamplePanel({ example, exerciseType, language }: ExamplePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const copy = getCopy(language);
  const content = example.content;
  const sourceText = content.stem ?? content.text ?? '';
  const answer = content.example_answer ?? '';
  const isSentenceTransformExample = exerciseType === 'sentence_transform';

  if (isSentenceTransformExample) {
    return (
      <SentenceTransformExampleDisclosure
        correctedSentence={answer}
        expanded={isExpanded}
        label={copy.example}
        language={language}
        sentence={sourceText}
        onToggle={() => setIsExpanded((current) => !current)}
      />
    );
  }

  const renderFillBlankExample = () => {
    const parts = sourceText.split(/_{2,}/);
    if (parts.length < 2) return null;
    return (
      <View style={styles.exampleInlineSentence}>
        <AppText language="en" variant="body" style={styles.exampleSentenceText}>{parts[0]}</AppText>
        <View style={styles.exampleAnswerPill}>
          <AppText language="en" variant="body" style={styles.exampleAnswerPillText}>{answer}</AppText>
        </View>
        <AppText language="en" variant="body" style={styles.exampleSentenceText}>{parts.slice(1).join(' ')}</AppText>
      </View>
    );
  };

  const correctOption = content.options?.find((option) => option.label === content.example_correct_option);
  return (
    <View style={styles.examplePanel}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        style={styles.exampleHeader}
        onPress={() => setIsExpanded((current) => !current)}>
        <AppText language={language} variant="caption" style={styles.exampleLabel}>{copy.example}</AppText>
        <AppText language="en" variant="body" style={styles.exampleArrow}>{isExpanded ? '↑' : '↓'}</AppText>
      </Pressable>
      {isExpanded ? (
          <View style={styles.exampleBody}>
            {exerciseType === 'fill_blank' && renderFillBlankExample()}
            {exerciseType !== 'fill_blank' && sourceText ? (
              <AppText language="en" variant="body" style={styles.exampleSentenceText}>{sourceText}</AppText>
            ) : null}
            {exerciseType !== 'fill_blank' && (answer || correctOption) ? (
              <View style={styles.exampleSolutionRow}>
                <AppText language={language} variant="caption" style={styles.exampleSolutionLabel}>{copy.answer}:</AppText>
                <AppText language="en" variant="body" style={styles.exampleSolutionText}>
                  {correctOption ? `${correctOption.label}. ${correctOption.text}` : answer}
                </AppText>
              </View>
            ) : null}
          </View>
      ) : null}
    </View>
  );
}

function FillBlankExamplePanel({ example, language }: Pick<ExamplePanelProps, 'example' | 'language'>) {
  const [isExpanded, setIsExpanded] = useState(false);
  const copy = getCopy(language);
  const sourceText = example.content.stem ?? example.content.text ?? '';
  const answer = example.content.example_answer ?? '';

  return (
    <FillBlankExampleDisclosure
      expanded={isExpanded}
      label={copy.example}
      language={language}
      onToggle={() => setIsExpanded((current) => !current)}>
      <FillBlankExampleSentence answers={[answer]} language="en" text={sourceText || answer} />
    </FillBlankExampleDisclosure>
  );
}

function QuestionInput({ answer, disabled, judgmentRewriteStage = false, language, onChange, question, result }: QuestionInputProps) {
  const copy = getCopy(language);
  const [inputContainerWidth, setInputContainerWidth] = useState(0);
  const [rewriteIsWrapped, setRewriteIsWrapped] = useState(false);
  const oneLineContentHeightRef = useRef<number | null>(null);
  const inputValueRef = useRef(typeof answer === 'string' ? answer : typeof answer === 'object' ? answer.rewrite : '');
  const exerciseType = question.exercise.exercise_type;
  const isJudgment = exerciseType === 'sentence_transform'
    && /correct.*incorrect|incorrect.*correct/i.test(
      question.exercise.display_type_en ?? question.exercise.display_type
    );

  if (exerciseType === 'multiple_choice') {
    const selectedLabel = typeof answer === 'string' ? answer : '';
    return (
      <View style={styles.optionList}>
        {(question.content.options ?? []).map((option) => {
          const isSelected = selectedLabel === option.label;
          const isSelectedCorrect = isSelected && result?.correct === true;
          const isSelectedWrong = isSelected && result?.correct === false;
          return (
            <Pressable
              key={option.label}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected, disabled }}
              disabled={disabled}
              style={[
                styles.optionButton,
                isSelectedCorrect
                  ? styles.optionButtonCorrect
                  : isSelectedWrong
                    ? styles.optionButtonWrong
                    : isSelected
                      ? styles.optionButtonSelected
                      : null,
              ]}
              onPress={() => onChange(option.label)}>
              <AppText language={language} variant="body" style={styles.optionText}>{option.text}</AppText>
              {isSelectedCorrect || isSelectedWrong ? (
                <AppText
                  language="en"
                  variant="caption"
                  style={[styles.optionOutcome, isSelectedCorrect ? styles.optionOutcomeCorrect : styles.optionOutcomeWrong]}>
                  {isSelectedCorrect ? '✓' : '✕'}
                </AppText>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    );
  }

  if (exerciseType === 'fill_blank') {
    const sentence = question.content.text ?? question.content.stem ?? '';
    const sentenceParts = sentence.match(/(_{2,}|[^\s_]+)/g) ?? [sentence];
    let blankIndex = 0;

    return (
      <View
        style={styles.fillBlankSentence}
        onLayout={(event) => setInputContainerWidth(Math.round(event.nativeEvent.layout.width))}>
        {sentenceParts.map((part, index) => {
          if (!/^_{2,}$/.test(part)) {
            return (
              <AppText key={`text-${index}`} language={language} variant="body" style={styles.fillBlankSentenceText}>
                {part}
              </AppText>
            );
          }

          const currentBlankIndex = blankIndex;
          blankIndex += 1;
          const authoredMinLength = question.content.blanks?.[currentBlankIndex]?.min_len;
          const minLength = typeof authoredMinLength === 'number' && authoredMinLength > 0
            ? authoredMinLength
            : part.length;
          return (
            <View
              key={`blank-${index}`}
              style={[styles.fillBlankInlineInputShell, { width: estimateFillBlankWidth(inputContainerWidth, minLength) }]}>
              <ScriptAwareTextInput
                accessibilityLabel={copy.typeAnswer}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!disabled}
                numberOfLines={1}
                placeholder=""
                style={styles.fillBlankInlineInput}
                value={typeof answer === 'string' ? answer : ''}
                onChangeText={onChange}
              />
            </View>
          );
        })}
      </View>
    );
  }

  if (isJudgment) {
    const judgment = typeof answer === 'object' ? answer.marked_as_correct : undefined;
    const rewrite = typeof answer === 'object' ? answer.rewrite : '';
    return (
      <View style={styles.inputGroup}>
        {!judgmentRewriteStage ? <View style={styles.judgmentRow}>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: judgment === true, disabled }}
            disabled={disabled}
            style={[
              styles.judgmentButton,
              judgment === true ? styles.judgmentButtonCorrect : null,
            ]}
            onPress={() => {
              inputValueRef.current = '';
              setRewriteIsWrapped(false);
              onChange({ marked_as_correct: true, rewrite: '' });
            }}>
            <AppText language={language} variant="caption" style={[styles.judgmentText, judgment === true ? styles.judgmentTextActive : null]}>{language === 'th' ? copy.exampleCorrect : 'It’s correct'} ✓</AppText>
          </Pressable>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: judgment === false, disabled }}
            disabled={disabled}
            style={[
              styles.judgmentButton,
              judgment === false ? styles.judgmentButtonIncorrect : null,
            ]}
            onPress={() => onChange({ marked_as_correct: false, rewrite })}>
            <AppText language={language} variant="caption" style={[styles.judgmentText, judgment === false ? styles.judgmentTextActive : null]}>{language === 'th' ? copy.exampleIncorrect : 'It’s incorrect'} X</AppText>
          </Pressable>
        </View> : null}
        {judgmentRewriteStage ? <View style={[styles.judgmentRewriteInputShell, rewriteIsWrapped ? styles.judgmentRewriteInputShellTwoLine : null]}>
          <ScriptAwareTextInput
            accessibilityLabel={copy.rewrite}
            editable={!disabled && judgment !== true}
            multiline
            placeholder={language === 'th' ? 'เขียนประโยคที่ถูกต้อง' : 'Write the correct sentence'}
            placeholderTextColor={theme.colors.mutedText}
            style={[styles.judgmentRewriteInput, rewriteIsWrapped ? styles.judgmentRewriteInputTwoLine : null, language === 'th' ? styles.thaiInput : styles.englishInput]}
            value={rewrite}
            onContentSizeChange={(event) => {
              const height = event.nativeEvent.contentSize.height;
              const currentValue = inputValueRef.current;
              if (!currentValue) oneLineContentHeightRef.current = height;
              setRewriteIsWrapped(currentValue.includes('\n') || (currentValue.length > 0 && height > (oneLineContentHeightRef.current ?? 21) + 10));
            }}
            onChangeText={(value) => {
              inputValueRef.current = value;
              if (!value) setRewriteIsWrapped(false);
              onChange({ marked_as_correct: false, rewrite: value });
            }}
          />
        </View> : null}
      </View>
    );
  }

  const multiline = exerciseType === 'sentence_transform' || exerciseType === 'open' || exerciseType === 'open_ended';
  const isOpenEnded = exerciseType === 'open' || exerciseType === 'open_ended';
  const autoSizeRewrite = exerciseType === 'sentence_transform';
  return (
    <ScriptAwareTextInput
      accessibilityLabel={copy.typeAnswer}
      autoCapitalize="sentences"
      editable={!disabled}
      multiline={multiline}
      numberOfLines={autoSizeRewrite ? undefined : multiline ? 2 : 1}
      placeholder={copy.typeAnswer}
      placeholderTextColor={theme.colors.mutedText}
      style={[
        styles.textInput,
        multiline ? styles.multilineInput : null,
        isOpenEnded ? styles.openResponseInput : null,
        isOpenEnded && (typeof answer !== 'string' || !answer.trim()) ? styles.openResponseInputEmpty : null,
        autoSizeRewrite ? styles.sentenceTransformResponseInput : null,
        autoSizeRewrite && rewriteIsWrapped ? styles.twoLineRewriteInput : null,
        autoSizeRewrite && !rewriteIsWrapped ? styles.singleLineRewriteInput : null,
        language === 'th' ? styles.thaiInput : styles.englishInput,
      ]}
      value={typeof answer === 'string' ? answer : ''}
      onContentSizeChange={autoSizeRewrite ? (event) => {
        const value = inputValueRef.current;
        const height = event.nativeEvent.contentSize.height;
        if (!value) oneLineContentHeightRef.current = height;
        setRewriteIsWrapped(value.includes('\n') || (value.length > 0 && height > (oneLineContentHeightRef.current ?? 38) + 10));
      } : undefined}
      onChangeText={(value) => {
        inputValueRef.current = value;
        if (autoSizeRewrite && !value) setRewriteIsWrapped(false);
        onChange(value);
      }}
    />
  );
}

export function ExerciseBankSessionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { uiLanguage } = useUiLanguage();
  const copy = getCopy(uiLanguage);
  const params = useLocalSearchParams<{ topicId?: string | string[]; setNumber?: string | string[]; returnTo?: string | string[] }>();
  const topicId = getParam(params.topicId);
  const setNumberParam = getParam(params.setNumber);
  const returnToParam = getParam(params.returnTo);
  const returnTo = returnToParam.startsWith('/(tabs)/resources') ? returnToParam : null;
  const setNumber = Number.parseInt(setNumberParam, 10);
  const hasSetNumber = Number.isInteger(setNumber) && setNumber > 0;
  const [topicDetail, setTopicDetail] = useState<ExerciseBankTopicDetail | null>(null);
  const [topic, setTopic] = useState<ExerciseBankSessionTopic | null>(null);
  const [setData, setSetData] = useState<ExerciseBankV2Set | null>(null);
  const [queue, setQueue] = useState<number[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, ExerciseBankAnswer>>({});
  const [results, setResults] = useState<Record<number, ExerciseBankAnswerResult>>({});
  const [skippedIds, setSkippedIds] = useState<Record<number, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isSetNavigatorOpen, setIsSetNavigatorOpen] = useState(false);
  const [revealedAnswerIds, setRevealedAnswerIds] = useState<Record<number, boolean>>({});
  const [judgmentRewriteQuestionIds, setJudgmentRewriteQuestionIds] = useState<Record<number, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsFinished(false);
    setIsSetNavigatorOpen(false);
    setRevealedAnswerIds({});
    setJudgmentRewriteQuestionIds({});
    setAnswers({});
    setResults({});
    setSkippedIds({});
    try {
      if (!topicId) throw new Error('Unable to load this exercise.');
      const response = await fetchExerciseBankV2Session(
        topicId,
        hasSetNumber ? setNumber : undefined,
        (freshResponse) => {
          if (!isMountedRef.current) return;
          setTopicDetail(freshResponse.topic);
          setTopic(freshResponse.topic);
          setSetData(freshResponse.set);
        }
      );
      const detail = response.topic;
      const resolvedSetNumber = response.set?.set_number ?? detail.next_incomplete_set;
      setTopicDetail(detail);
      setTopic(detail);
      setSetData(response.set);
      if (!response.set || resolvedSetNumber === null) return;
      setAnswers(Object.fromEntries(
        response.set.questions
          .filter((question) => question.progress.latest_user_answer != null)
          .map((question) => [question.id, question.progress.latest_user_answer as ExerciseBankAnswer])
      ));
      setResults(Object.fromEntries(
        response.set.questions
          .filter((question) => typeof question.progress.latest_is_correct === 'boolean')
          .map((question) => [question.id, {
            question_id: question.id,
            topic_id: Number(response.topic.id),
            correct: Boolean(question.progress.latest_is_correct),
            score: question.progress.latest_score ?? 0,
            feedback_en: question.progress.latest_feedback_en ?? '',
            feedback_th: question.progress.latest_feedback_th ?? '',
            review_answer: question.progress.review_answer ?? '',
            grading_method: 'deterministic' as const,
            progress: { has_answered_correctly: question.progress.has_answered_correctly },
          }])
      ));
      setJudgmentRewriteQuestionIds(Object.fromEntries(
        response.set.questions
          .filter((question) => {
            const savedAnswer = question.progress.latest_user_answer;
            return question.exercise.exercise_type === 'sentence_transform'
              && typeof savedAnswer === 'object'
              && savedAnswer?.marked_as_correct === false
              && savedAnswer.rewrite.trim().length > 0;
          })
          .map((question) => [question.id, true])
      ));
      const allQuestionIds = response.set.questions.map((question) => question.id);
      const firstIncompleteIndex = response.set.questions.findIndex(
        (question) => !question.progress.has_answered_correctly
      );
      const resume = detail?.resume;
      const resumesThisSet = resume?.set_number === resolvedSetNumber;
      const resumeIndex = resumesThisSet && resume
        ? Math.min(Math.max(resume.set_position - 1, 0), allQuestionIds.length - 1)
        : firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0;
      const resumeView = resumesThisSet && resume ? resume.view : 'question';
      setQueue(allQuestionIds);
      setQueueIndex(resumeIndex);
      setIsFinished(resumeView === 'results');
      if (!resumesThisSet) {
        void saveExerciseBankV2Cursor(topicId, {
          setNumber: resolvedSetNumber,
          setPosition: resumeIndex + 1,
          view: 'question',
        }).catch(() => undefined);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load this exercise.');
    } finally {
      setIsLoading(false);
    }
  }, [hasSetNumber, setNumber, topicId]);

  useEffect(() => { void load(); }, [load]);

  const localizedTopic = useMemo(
    () => topic ? localizeExerciseBankTopic(topic, uiLanguage) : null,
    [topic, uiLanguage]
  );
  const localizedTopicDetail = useMemo(
    () => topicDetail ? localizeExerciseBankTopic(topicDetail, uiLanguage) : null,
    [topicDetail, uiLanguage]
  );
  const questionsById = useMemo(
    () => new Map((setData?.questions ?? []).map((question) => {
      const localized = localizeExerciseBankQuestion(question, uiLanguage);
      return [localized.id, localized] as const;
    })),
    [setData, uiLanguage]
  );
  const currentQuestion = questionsById.get(queue[queueIndex]);
  const currentResult = currentQuestion ? results[currentQuestion.id] : undefined;
  const latestCorrectCount = queue.filter((questionId) => results[questionId]?.correct === true).length;

  const handleExitToBank = () => {
    router.replace(returnTo
      ? `/(tabs)/exercises?returnTo=${encodeURIComponent(returnTo)}`
      : '/(tabs)/exercises');
  };

  const submit = async () => {
    if (!currentQuestion) return;
    const currentAnswer = answers[currentQuestion.id];
    const hasJudgment = currentQuestion.exercise.exercise_type === 'sentence_transform'
      && typeof currentAnswer === 'object'
      && typeof currentAnswer.marked_as_correct === 'boolean';
    if (!hasAnswer(currentAnswer) && !hasJudgment) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await submitExerciseBankV2Answer(currentQuestion.id, answers[currentQuestion.id]);
      if (result.requires_rewrite) {
        setJudgmentRewriteQuestionIds((current) => ({ ...current, [currentQuestion.id]: true }));
        return;
      }
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

  const persistCursor = (position: number, view: 'question' | 'results') => {
    if (!topicId || !setData) return;
    void saveExerciseBankV2Cursor(topicId, {
      setNumber: setData.set_number,
      setPosition: position,
      view,
    }).catch((error) => {
      console.warn('[exercise-bank] failed to save position', error);
    });
  };

  const advance = () => {
    setErrorMessage(null);
    if (queueIndex < queue.length - 1) {
      const nextIndex = queueIndex + 1;
      setQueueIndex(nextIndex);
      persistCursor(nextIndex + 1, 'question');
    } else {
      setIsFinished(true);
      persistCursor(queue.length, 'results');
    }
  };

  const skipCurrentQuestion = () => {
    if (!currentQuestion) return;
    const nextSkippedIds = { ...skippedIds, [currentQuestion.id]: true };
    setSkippedIds(nextSkippedIds);
    if (queueIndex < queue.length - 1) {
      advance();
      return;
    }
    const firstUnansweredIndex = queue.findIndex((questionId, index) =>
      index !== queueIndex && !results[questionId] && !nextSkippedIds[questionId]
    );
    if (firstUnansweredIndex >= 0) {
      navigateToQuestion(firstUnansweredIndex);
      return;
    }
    advance();
  };

  const navigateToQuestion = (index: number) => {
    const questionId = queue[index];
    if (questionId === undefined) return;
    setQueueIndex(index);
    setIsFinished(false);
    setErrorMessage(null);
    persistCursor(index + 1, 'question');
  };

  const retryCurrentQuestion = () => {
    if (!currentQuestion) return;
    setAnswers((current) => {
      const next = { ...current };
      if (judgmentRewriteQuestionIds[currentQuestion.id]) {
        next[currentQuestion.id] = { marked_as_correct: false, rewrite: '' };
      } else {
        delete next[currentQuestion.id];
      }
      return next;
    });
    setResults((current) => {
      const next = { ...current };
      delete next[currentQuestion.id];
      return next;
    });
    setRevealedAnswerIds((current) => {
      const next = { ...current };
      delete next[currentQuestion.id];
      return next;
    });
    if (!judgmentRewriteQuestionIds[currentQuestion.id]) {
      setJudgmentRewriteQuestionIds((current) => {
        const next = { ...current };
        delete next[currentQuestion.id];
        return next;
      });
    }
    setErrorMessage(null);
  };

  const restartSet = () => {
    setAnswers({});
    setResults({});
    setSkippedIds({});
    setRevealedAnswerIds({});
    setJudgmentRewriteQuestionIds({});
    setQueueIndex(0);
    setIsFinished(false);
    setErrorMessage(null);
    persistCursor(1, 'question');
  };

  const goToNextSet = async () => {
    if (!topicId || !setData || isSubmitting) return;
    const currentSetNumber = setData?.set_number ?? setNumber;
    const nextSet = topicDetail?.sets
      .filter((item) => item.set_number > currentSetNumber)
      .sort((a, b) => a.set_number - b.set_number)[0];
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await advanceExerciseBankV2Set(topicId, currentSetNumber);
      if (nextSet) {
        router.setParams({ setNumber: String(nextSet.set_number) });
        return;
      }
      handleExitToBank();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.loadError);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <PageLoadingState language={uiLanguage} />;

  if (errorMessage && !setData && !topicDetail) {
    return (
      <View style={styles.fullState}>
        <AppText language={uiLanguage} variant="body" style={styles.stateTitle}>{copy.loadError}</AppText>
        <AppText language={uiLanguage} variant="muted" style={styles.stateBody}>{errorMessage}</AppText>
        <Button title={copy.tryAgain} language={uiLanguage} onPress={() => void load()} />
        <Button title={copy.backToTopics} language={uiLanguage} variant="outline" onPress={handleExitToBank} />
      </View>
    );
  }

  if (!setData && topicDetail) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
        <ResponsivePageShell>
          <View style={styles.pickerHeader}>
            <ResourcePageHeader
              language={uiLanguage}
              title={localizedTopicDetail?.display_title ?? ''}
              subtitle={copy.chooseSet}
              onBackPress={handleExitToBank}
            />
          </View>
          <View style={styles.pickerContent}>
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
    const isPerfect = setData.question_count === 5 && latestCorrectCount === 5;
    const isProgress = latestCorrectCount >= 3 && !isPerfect;
    const completionTitle = isPerfect ? copy.greatWork : isProgress ? copy.greatProgress : copy.keepPracticing;
    const completionBody = isPerfect ? copy.perfectBody : isProgress ? copy.progressBody : copy.practiceBody;
    const completionImage = isPerfect
      ? completionPerfectImage
      : isProgress
        ? completionProgressImage
        : completionPracticeImage;
    const hasNextSet = Boolean(topicDetail?.sets.some((item) => item.set_number > setData.set_number));
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
        <ResponsivePageShell>
          <View style={styles.exerciseHeader}>
            <View style={styles.exerciseHeaderCopy}>
              <AppText language={uiLanguage} variant="title" style={styles.topicDisplayTitle}>{localizedTopic?.display_title}</AppText>
              <AppText language={uiLanguage} variant="body" style={styles.topicTechnicalName}>{localizedTopic?.topic}</AppText>
            </View>
            <View style={styles.headerActions}>
              <LanguageToggle />
              <Pressable accessibilityRole="button" accessibilityLabel={copy.backToTopics} hitSlop={10} style={styles.closeButton} onPress={handleExitToBank}>
                <MaterialIcons name="close" size={30} color={theme.colors.text} />
              </Pressable>
            </View>
          </View>
          <View style={styles.sessionContent}>
            <AppText language={uiLanguage} variant="body" style={styles.setLabel}>{copy.set} {setData.set_number} {copy.of} {topicDetail?.sets.length ?? setData.set_number}</AppText>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: '100%' }]} /></View>
            <View style={styles.questionSectionDivider} />
            <View style={styles.completionResult}>
              <ExerciseSetResultCard
                body={completionBody}
                imageSource={completionImage}
                language={uiLanguage}
                score={latestCorrectCount}
                title={completionTitle}
                tone={isPerfect ? 'perfect' : isProgress ? 'partial' : 'low'}
                total={setData.question_count}
              />
            </View>
            <View style={styles.completionActions}>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.completionButton, isPerfect ? styles.completionPracticeButton : styles.completionRetryButton, pressed ? styles.practiceCheckButtonPressed : null]}
                onPress={isPerfect ? goToNextSet : restartSet}>
                <AppText language={uiLanguage} variant="caption" style={styles.completionButtonText}>
                  {isPerfect ? (hasNextSet ? copy.goNextSet : copy.backToBank) : copy.answerTryAgain}
                </AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.completionButton, styles.completionNextButton, pressed ? styles.practiceCheckButtonPressed : null]}
                onPress={isPerfect ? handleExitToBank : goToNextSet}>
                <AppText language={uiLanguage} variant="caption" style={styles.completionButtonText}>
                  {isPerfect ? copy.chooseNewTopic : hasNextSet ? copy.goNextSet : copy.backToBank}
                </AppText>
              </Pressable>
            </View>
          </View>
        </ResponsivePageShell>
      </ScrollView>
    );
  }

  const isJudgmentQuestion = currentQuestion.exercise.exercise_type === 'sentence_transform'
    && /correct.*incorrect|incorrect.*correct/i.test(
      currentQuestion.exercise.display_type_en ?? currentQuestion.exercise.display_type
    );
  const isFillBlankQuestion = currentQuestion.exercise.exercise_type === 'fill_blank';
  const isOpenQuestion = currentQuestion.exercise.exercise_type === 'open'
    || currentQuestion.exercise.exercise_type === 'open_ended';
  const isMultipleChoiceQuestion = currentQuestion.exercise.exercise_type === 'multiple_choice';
  const isRewriteQuestion = currentQuestion.exercise.exercise_type === 'sentence_transform' && !isJudgmentQuestion;
  const isJudgmentRewriteStage = Boolean(judgmentRewriteQuestionIds[currentQuestion.id]);
  const currentAnswer = answers[currentQuestion.id];
  const judgmentAnswer = typeof currentAnswer === 'object'
    ? currentAnswer
    : undefined;
  const usesSharedAnswerFooter = isFillBlankQuestion || isOpenQuestion || isMultipleChoiceQuestion || isJudgmentQuestion || isRewriteQuestion;
  const extendsFeedbackThroughSafeArea = Boolean(currentResult && usesSharedAnswerFooter);
  const feedback = uiLanguage === 'th' ? currentResult?.feedback_th : currentResult?.feedback_en;
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: extendsFeedbackThroughSafeArea ? 0 : Math.max(insets.bottom, theme.spacing.md) },
        ]}>
        <ResponsivePageShell style={styles.exerciseShell}>
          <View style={styles.exerciseHeader}>
            <View style={styles.exerciseHeaderCopy}>
              <AppText language={uiLanguage} variant="title" style={styles.topicDisplayTitle}>{localizedTopic?.display_title}</AppText>
              <AppText language={uiLanguage} variant="body" style={styles.topicTechnicalName}>{localizedTopic?.topic}</AppText>
            </View>
            <View style={styles.headerActions}>
              <LanguageToggle />
              <Pressable accessibilityRole="button" accessibilityLabel={copy.backToTopics} hitSlop={10} style={styles.closeButton} onPress={handleExitToBank}>
                <MaterialIcons name="close" size={30} color={theme.colors.text} />
              </Pressable>
            </View>
          </View>
          <View style={[styles.sessionContent, styles.questionSessionContent]}>
            <View style={styles.setSelectorWrap}>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: isSetNavigatorOpen }} style={styles.setSelector} onPress={() => setIsSetNavigatorOpen((open) => !open)}>
                <AppText language={uiLanguage} variant="body" style={styles.setLabel}>{copy.set} {setData.set_number} {copy.of} {topicDetail?.sets.length ?? setData.set_number} ▾</AppText>
              </Pressable>
              {isSetNavigatorOpen ? (
                <View style={styles.setNavigatorMenu}>
                  <ScrollView nestedScrollEnabled style={styles.setNavigatorScroll}>
                    {topicDetail?.sets.map((set) => (
                      <Pressable key={set.set_number} accessibilityRole="button" style={styles.setNavigatorItem} onPress={() => {
                        setIsSetNavigatorOpen(false);
                        router.setParams({ setNumber: String(set.set_number) });
                      }}>
                        <AppText language={uiLanguage} variant="caption">{copy.set} {set.set_number}</AppText>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
            </View>
            <View style={styles.progressRow}>
              <View
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: queue.length, now: queueIndex + 1 }}
                style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${((queueIndex + 1) / queue.length) * 100}%` }]} />
              </View>
            </View>
            <View style={[
              styles.questionContent,
              styles.judgmentQuestionContent,
              usesSharedAnswerFooter ? styles.fillBlankQuestionContent : null,
            ]}>
              <View style={[
                styles.questionInstructions,
                currentResult?.correct ? styles.questionInstructionsCorrect : null,
                currentResult && !currentResult.correct ? styles.questionInstructionsIncorrect : null,
              ]}>
                <View style={usesSharedAnswerFooter ? styles.promptInstructionSlot : null}>
                  <AppText
                    language={uiLanguage}
                    variant="body"
                    style={[
                      styles.prompt,
                      currentQuestion.exercise.exercise_type === 'fill_blank' ? styles.fillBlankPrompt : null,
                      isOpenQuestion ? styles.openPrompt : null,
                      isMultipleChoiceQuestion ? styles.multipleChoicePrompt : null,
                      isJudgmentQuestion || isRewriteQuestion ? styles.judgmentPrompt : null,
                    ]}>
                    {currentQuestion.exercise.prompt}
                  </AppText>
                </View>
                {!usesSharedAnswerFooter && currentQuestion.exercise.examples?.[0] ? (
                  <ExamplePanel
                    key={currentQuestion.id}
                    example={currentQuestion.exercise.examples[0]}
                    exerciseType={currentQuestion.exercise.exercise_type}
                    language={uiLanguage}
                  />
                ) : null}
                {isFillBlankQuestion ? (
                  <View style={styles.fillBlankWorkArea}>
                    <PracticeSectionLabel label={currentQuestion.exercise.display_type} language={uiLanguage} />
                    <PracticeSurface>
                      <QuestionInput
                        key={currentQuestion.id}
                        answer={answers[currentQuestion.id]}
                        disabled={Boolean(currentResult)}
                        language={uiLanguage}
                        question={currentQuestion}
                        onChange={(answer) => setAnswers((current) => ({ ...current, [currentQuestion.id]: answer }))}
                      />
                    </PracticeSurface>
                    {typeof currentQuestion.content.image_url === 'string' && currentQuestion.content.image_url ? (
                      <PracticeImage
                        accessibilityLabel={String(currentQuestion.content.alt_text ?? currentQuestion.exercise.prompt)}
                        source={{ uri: currentQuestion.content.image_url }}
                      />
                    ) : null}
                    {currentQuestion.exercise.examples?.[0] ? (
                      <FillBlankExamplePanel
                        key={currentQuestion.id}
                        example={currentQuestion.exercise.examples[0]}
                        language={uiLanguage}
                      />
                    ) : null}
                  </View>
                ) : isMultipleChoiceQuestion ? (
                  <View style={styles.multipleChoiceWorkArea}>
                    <PracticeSectionLabel
                      icon="◎"
                      label={uiLanguage === 'th' ? 'เลือกคำตอบ' : 'CHOOSE THE ANSWER'}
                      language={uiLanguage}
                    />
                    <PracticeSurface style={styles.multipleChoicePromptCard}>
                      {currentQuestion.content.stem || currentQuestion.content.text ? (
                        <AppText language={uiLanguage} variant="body" style={styles.multipleChoicePromptText}>
                          {currentQuestion.content.stem ?? currentQuestion.content.text}
                        </AppText>
                      ) : null}
                    </PracticeSurface>
                    <QuestionInput
                      key={currentQuestion.id}
                      answer={answers[currentQuestion.id]}
                      disabled={Boolean(currentResult)}
                      language={uiLanguage}
                      question={currentQuestion}
                      result={currentResult}
                      onChange={(answer) => setAnswers((current) => ({ ...current, [currentQuestion.id]: answer }))}
                    />
                  </View>
                ) : isJudgmentQuestion ? (
                  <View style={styles.judgmentWorkArea}>
                    {isJudgmentRewriteStage && !currentResult ? (
                      <AppText language={uiLanguage} variant="body" style={styles.judgmentStageSuccess}>
                        <AppText language={uiLanguage} style={styles.judgmentStageSuccessAccent}>
                          {uiLanguage === 'th' ? 'ทำได้ดี!' : 'Good work!'}
                        </AppText>
                        {uiLanguage === 'th' ? ' ประโยคนี้ไม่ถูกต้อง' : ' It is incorrect.'}
                      </AppText>
                    ) : null}
                    <PracticeSectionLabel
                      icon="⌘"
                      label={isJudgmentRewriteStage
                        ? (uiLanguage === 'th' ? 'แก้ไขประโยค' : 'FIX IT!')
                        : (uiLanguage === 'th' ? 'ประโยคนี้ถูกต้องไหม' : 'IS THIS CORRECT?')}
                      language={uiLanguage}
                    />
                    <PracticeSurface style={styles.judgmentPromptCard}>
                      {currentQuestion.content.stem || currentQuestion.content.text ? (
                        <AppText language={uiLanguage} variant="body" style={styles.judgmentPromptText}>{currentQuestion.content.stem ?? currentQuestion.content.text}</AppText>
                      ) : null}
                    </PracticeSurface>
                    <QuestionInput
                      key={currentQuestion.id}
                      answer={answers[currentQuestion.id]}
                      disabled={Boolean(currentResult)}
                      judgmentRewriteStage={isJudgmentRewriteStage}
                      language={uiLanguage}
                      question={currentQuestion}
                      onChange={(answer) => setAnswers((current) => ({ ...current, [currentQuestion.id]: answer }))}
                    />
                    {isJudgmentRewriteStage && currentQuestion.exercise.examples?.[0] ? (
                      <ExamplePanel
                        key={`${currentQuestion.id}-rewrite-example`}
                        example={currentQuestion.exercise.examples[0]}
                        exerciseType={currentQuestion.exercise.exercise_type}
                        language={uiLanguage}
                      />
                    ) : null}
                  </View>
                ) : isRewriteQuestion ? (
                  <View style={styles.judgmentWorkArea}>
                    <PracticeSectionLabel
                      icon="✎"
                      label={uiLanguage === 'th' ? 'เขียนประโยคใหม่' : 'REWRITE THIS'}
                      language={uiLanguage}
                    />
                    <PracticeSurface style={styles.judgmentPromptCard}>
                      {currentQuestion.content.stem || currentQuestion.content.text ? (
                        <AppText language={uiLanguage} variant="body" style={styles.judgmentPromptText}>
                          {currentQuestion.content.stem ?? currentQuestion.content.text}
                        </AppText>
                      ) : null}
                    </PracticeSurface>
                    <QuestionInput
                      key={currentQuestion.id}
                      answer={answers[currentQuestion.id]}
                      disabled={Boolean(currentResult)}
                      language={uiLanguage}
                      question={currentQuestion}
                      onChange={(answer) => setAnswers((current) => ({ ...current, [currentQuestion.id]: answer }))}
                    />
                    {currentQuestion.exercise.examples?.[0] ? (
                      <ExamplePanel
                        key={`${currentQuestion.id}-rewrite-example`}
                        example={currentQuestion.exercise.examples[0]}
                        exerciseType={currentQuestion.exercise.exercise_type}
                        language={uiLanguage}
                      />
                    ) : null}
                  </View>
                ) : isOpenQuestion ? (
                  <View style={styles.openWorkArea}>
                    <PracticeSectionLabel
                      icon="✎"
                      label={uiLanguage === 'th' ? 'ตอบคำถาม' : 'RESPOND TO THE PROMPT'}
                      language={uiLanguage}
                    />
                    <PracticeSurface style={styles.openPromptCard}>
                      {currentQuestion.content.stem || currentQuestion.content.text ? (
                        <AppText language={uiLanguage} variant="body" style={styles.openPromptText}>
                          {currentQuestion.content.stem ?? currentQuestion.content.text}
                        </AppText>
                      ) : null}
                    </PracticeSurface>
                    <QuestionInput
                      key={currentQuestion.id}
                      answer={answers[currentQuestion.id]}
                      disabled={Boolean(currentResult)}
                      language={uiLanguage}
                      question={currentQuestion}
                      onChange={(answer) => setAnswers((current) => ({ ...current, [currentQuestion.id]: answer }))}
                    />
                  </View>
                ) : (
                  <>
                    <View style={styles.questionWorkPanel}>
                      <AppText language={uiLanguage} variant="caption" style={styles.displayType}>{currentQuestion.exercise.display_type}</AppText>
                      {currentQuestion.content.stem || currentQuestion.content.text ? (
                        <AppText language={uiLanguage} variant="body" style={styles.stem}>{currentQuestion.content.stem ?? currentQuestion.content.text}</AppText>
                      ) : null}
                    </View>
                    <QuestionInput
                      key={currentQuestion.id}
                      answer={answers[currentQuestion.id]}
                      disabled={Boolean(currentResult)}
                      language={uiLanguage}
                      question={currentQuestion}
                      onChange={(answer) => setAnswers((current) => ({ ...current, [currentQuestion.id]: answer }))}
                    />
                  </>
                )}
              </View>
            </View>
            {currentResult && !currentResult.correct && !usesSharedAnswerFooter ? (
              <View style={styles.answerRevealSection}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: Boolean(revealedAnswerIds[currentQuestion.id]) }}
                  onPress={() => setRevealedAnswerIds((current) => ({
                    ...current,
                    [currentQuestion.id]: !current[currentQuestion.id],
                  }))}>
                  <AppText language={uiLanguage} variant="caption" style={styles.showAnswerLink}>
                    {revealedAnswerIds[currentQuestion.id] ? copy.hideAnswer : copy.showAnswer}
                  </AppText>
                </Pressable>
                {revealedAnswerIds[currentQuestion.id] ? (
                  <View style={styles.revealedAnswerCard}>
                    <AppText language={currentResult.review_answer ? 'en' : uiLanguage} variant="body" style={styles.revealedAnswer}>
                      {currentResult.review_answer || copy.answerUnavailable}
                    </AppText>
                  </View>
                ) : null}
              </View>
            ) : null}
            {usesSharedAnswerFooter ? (
              <PracticeAnswerFooter
                disabled={
                  isJudgmentQuestion && !isJudgmentRewriteStage
                    ? typeof judgmentAnswer?.marked_as_correct !== 'boolean'
                    : !hasAnswer(answers[currentQuestion.id])
                }
                error={errorMessage}
                feedback={
                  currentResult && !isMultipleChoiceQuestion &&
                  ((!currentResult.correct && (!isJudgmentQuestion || isJudgmentRewriteStage)) || currentResult.advisory === true)
                    ? feedback
                    : null
                }
                language={uiLanguage}
                labels={{
                  check: copy.check,
                  checking: copy.checking,
                  continue: copy.continue,
                  correct: copy.correct,
                  incorrect: isMultipleChoiceQuestion || isJudgmentQuestion || isRewriteQuestion ? copy.answerTryAgain : copy.incorrect,
                  clear: uiLanguage === 'th' ? 'ล้างคำตอบ' : 'CLEAR ANSWER',
                  skip: copy.skip,
                }}
                loading={isSubmitting}
                status={!currentResult ? 'idle' : currentResult.correct ? 'correct' : 'incorrect'}
                onPrimary={() => {
                  if (!currentResult) {
                    void submit();
                  } else if (currentResult.correct) {
                    advance();
                  } else {
                    retryCurrentQuestion();
                  }
                }}
                onSkip={skipCurrentQuestion}
                review={
                  (isMultipleChoiceQuestion || isRewriteQuestion || (isJudgmentQuestion && isJudgmentRewriteStage)) &&
                  currentResult && !currentResult.correct
                    ? {
                        answer: currentResult.review_answer || copy.answerUnavailable,
                        expanded: Boolean(revealedAnswerIds[currentQuestion.id]),
                        hideLabel: copy.hideAnswer,
                        showLabel: copy.showAnswer,
                        onToggle: () => setRevealedAnswerIds((current) => ({
                          ...current,
                          [currentQuestion.id]: !current[currentQuestion.id],
                        })),
                      }
                    : undefined
                }
                style={styles.fillBlankFooter}
              />
            ) : (
            <View style={styles.questionFooter}>
                {errorMessage ? <AppText language={uiLanguage} variant="caption" style={styles.errorText}>{errorMessage}</AppText> : null}
                {currentResult?.correct ? (
                  <View style={styles.correctResult}>
                    <View style={styles.correctResultIcon}>
                      <AppText language="en" variant="body" style={styles.correctResultCheck}>✓</AppText>
                    </View>
                    <AppText language={uiLanguage} variant="body" style={styles.correctResultText}>{copy.correct}</AppText>
                  </View>
                ) : null}
                {currentResult && !currentResult.correct ? (
                  <View style={styles.feedback}>
                    <View style={styles.incorrectResult}>
                      <View style={styles.incorrectResultIcon}>
                        <AppText language="en" variant="body" style={styles.incorrectResultMark}>✕</AppText>
                      </View>
                      <AppText language={uiLanguage} variant="body" style={styles.incorrectResultText}>{copy.incorrect}</AppText>
                    </View>
                    {feedback ? <AppText language={uiLanguage} variant="caption">{feedback}</AppText> : null}
                  </View>
                ) : null}
                {!currentResult ? (
                  <View style={styles.checkActions}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={isSubmitting || !hasAnswer(answers[currentQuestion.id])}
                    style={({ pressed }) => [
                      styles.practiceCheckButton,
                      isSubmitting || !hasAnswer(answers[currentQuestion.id]) ? styles.practiceCheckButtonDisabled : null,
                      pressed ? styles.practiceCheckButtonPressed : null,
                    ]}
                    onPress={() => void submit()}>
                    <AppText language={uiLanguage} variant="caption" style={[styles.practiceCheckButtonText, hasAnswer(answers[currentQuestion.id]) ? styles.practiceCheckButtonTextActive : styles.practiceCheckButtonTextDisabled]}>
                      {isSubmitting ? copy.checking : copy.check}
                    </AppText>
                  </Pressable>
                  <Pressable accessibilityRole="button" style={styles.skipButton} onPress={skipCurrentQuestion}>
                    <AppText language={uiLanguage} variant="caption" style={styles.skipText}>{copy.skip}</AppText>
                  </Pressable>
                  </View>
                ) : currentResult.correct ? (
                  <Pressable
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.practiceCheckButton, styles.practiceNextButton, pressed ? styles.practiceCheckButtonPressed : null]}
                    onPress={advance}>
                    <AppText language={uiLanguage} variant="caption" style={styles.practiceCheckButtonText}>{copy.continue}</AppText>
                  </Pressable>
                ) : (
                  <View style={styles.incorrectActions}>
                    <Pressable
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.practiceCheckButton, styles.practiceIncorrectRetryButton, pressed ? styles.practiceCheckButtonPressed : null]}
                      onPress={retryCurrentQuestion}>
                      <AppText language={uiLanguage} variant="caption" style={[styles.practiceCheckButtonText, styles.retryButtonText]}>{copy.answerTryAgain}</AppText>
                    </Pressable>
                    <Pressable accessibilityRole="button" style={styles.skipButton} onPress={skipCurrentQuestion}>
                      <AppText language={uiLanguage} variant="caption" style={styles.skipText}>{copy.skip}</AppText>
                    </Pressable>
                  </View>
                )}
            </View>
            )}
          </View>
        </ResponsivePageShell>
        {extendsFeedbackThroughSafeArea ? (
          <View
            pointerEvents="none"
            style={[
              styles.feedbackSafeArea,
              { height: Math.max(insets.bottom, theme.spacing.md) },
              currentResult?.correct ? styles.feedbackSafeAreaCorrect : styles.feedbackSafeAreaIncorrect,
            ]}
          />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  contentContainer: { flexGrow: 1, paddingBottom: theme.spacing.md },
  feedbackSafeArea: { width: '100%' },
  feedbackSafeAreaCorrect: { backgroundColor: practiceColors.correctPanel },
  feedbackSafeAreaIncorrect: { backgroundColor: practiceColors.incorrectPanel },
  exerciseShell: { flexGrow: 1 },
  exerciseHeader: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: '#9A9A9A', paddingHorizontal: theme.spacing.md, paddingVertical: 10 },
  exerciseHeaderCopy: { flex: 1, gap: 3 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  closeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  sessionContent: { paddingHorizontal: theme.spacing.md, paddingTop: 18, gap: 15 },
  questionSessionContent: { flexGrow: 1, paddingBottom: theme.spacing.md },
  setSelectorWrap: { position: 'relative', zIndex: 20 },
  setSelector: { alignSelf: 'flex-start', minHeight: 30, justifyContent: 'center' },
  setLabel: { color: theme.colors.text, fontSize: 18, lineHeight: 23, fontWeight: theme.typography.weights.semibold },
  setNavigatorMenu: { position: 'absolute', top: 30, left: 0, zIndex: 30, minWidth: 150, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radii.sm, backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow, shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  setNavigatorScroll: { maxHeight: 240 },
  setNavigatorItem: { minHeight: 38, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#D5D9DE', paddingHorizontal: theme.spacing.md },
  setHeaderTitle: { fontSize: 26, lineHeight: 31 },
  sessionHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: theme.spacing.md },
  topicHeadingCopy: { flex: 1, gap: 2 },
  topicDisplayTitle: { color: theme.colors.text, fontSize: 22, lineHeight: 28, fontWeight: theme.typography.weights.bold },
  topicTechnicalName: { color: theme.colors.text, fontSize: 13, lineHeight: 18, fontWeight: theme.typography.weights.semibold },
  progressRow: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, zIndex: 10 },
  progressTrack: { width: '100%', height: 6, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radii.xl, backgroundColor: '#E8E8E8' },
  progressFill: { height: '100%', backgroundColor: '#B9E671' },
  questionSectionDivider: { height: 1, marginVertical: theme.spacing.xs, backgroundColor: '#C9CDD2' },
  questionContent: { width: '100%', paddingHorizontal: 0, paddingVertical: 0, gap: theme.spacing.md },
  fillBlankQuestionContent: { marginTop: -6 },
  judgmentQuestionContent: { paddingHorizontal: 0 },
  questionPanel: { width: '100%', borderRadius: theme.radii.md, backgroundColor: '#D6ECFF', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, gap: theme.spacing.md },
  questionInstructions: { width: '100%', paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0, gap: theme.spacing.md },
  questionInstructionsCorrect: { paddingBottom: theme.spacing.xs },
  questionInstructionsIncorrect: { paddingBottom: 0 },
  questionWorkPanel: { width: '100%', borderWidth: 1, borderColor: '#A8D4FF', borderRadius: theme.radii.md, backgroundColor: '#EDF5FF', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, gap: theme.spacing.sm },
  displayType: { color: theme.colors.text, fontSize: 10, fontWeight: theme.typography.weights.bold, textTransform: 'uppercase' },
  promptInstructionSlot: { width: '100%', minHeight: 36, justifyContent: 'flex-start' },
  prompt: { fontSize: 15, lineHeight: 22, fontWeight: theme.typography.weights.regular },
  judgmentPrompt: { fontSize: 15, lineHeight: 22, fontWeight: theme.typography.weights.regular },
  judgmentWorkArea: { width: '100%', gap: 14 },
  judgmentPromptCard: { paddingHorizontal: 16, paddingVertical: 18 },
  judgmentPromptText: { color: '#1E1E1E', fontSize: 17, lineHeight: 24, fontWeight: theme.typography.weights.bold },
  judgmentStageSuccess: { color: '#1E1E1E', fontSize: 14, lineHeight: 20, fontWeight: theme.typography.weights.semibold },
  judgmentStageSuccessAccent: { color: '#99C64F', fontWeight: theme.typography.weights.bold },
  fillBlankPrompt: { color: '#1E1E1E', fontSize: 13, lineHeight: 18, fontWeight: theme.typography.weights.bold },
  openPrompt: { color: '#1E1E1E', fontSize: 13, lineHeight: 18, fontWeight: theme.typography.weights.bold },
  multipleChoicePrompt: { color: '#1E1E1E', fontSize: 13, lineHeight: 18, fontWeight: theme.typography.weights.bold },
  fillBlankWorkArea: { width: '100%', gap: theme.spacing.md },
  openWorkArea: { width: '100%', gap: theme.spacing.md },
  openPromptCard: { minHeight: 112, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 22 },
  openPromptText: { color: '#1E1E1E', fontSize: 20, lineHeight: 28, fontWeight: theme.typography.weights.bold },
  multipleChoiceWorkArea: { width: '100%', gap: theme.spacing.md },
  multipleChoicePromptCard: { minHeight: 92, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 20 },
  multipleChoicePromptText: { color: '#1E1E1E', fontSize: 20, lineHeight: 28, fontWeight: theme.typography.weights.bold },
  examplePanel: { overflow: 'hidden', borderWidth: 1, borderColor: '#DDDDDD', borderRadius: theme.radii.md, backgroundColor: '#F8F8F8', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
  exampleHeader: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  exampleLabel: { color: theme.colors.mutedText, fontSize: 13, fontWeight: theme.typography.weights.regular, textDecorationLine: 'underline' },
  exampleArrow: { color: theme.colors.mutedText, fontSize: 18, lineHeight: 22 },
  exampleBody: { gap: theme.spacing.sm, paddingTop: theme.spacing.xs, paddingBottom: theme.spacing.xs },
  exampleInlineSentence: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  exampleSentenceText: { fontSize: 15, lineHeight: 23 },
  exampleAnswerPill: { minHeight: 34, justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radii.sm, backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.md, paddingVertical: 4 },
  exampleAnswerPillText: { fontSize: 14, lineHeight: 20 },
  exampleJudgment: { color: theme.colors.mutedText, fontWeight: theme.typography.weights.semibold },
  exampleSolutionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm },
  exampleSolutionLabel: { paddingTop: 2, color: theme.colors.mutedText, fontWeight: theme.typography.weights.semibold },
  exampleSolutionText: { flex: 1, fontSize: 15, lineHeight: 22 },
  fillBlankSentence: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 0, rowGap: 1 },
  fillBlankSentenceText: { marginRight: 5, fontSize: 17, lineHeight: 24, fontWeight: theme.typography.weights.bold },
  fillBlankInlineInputShell: { height: 34, minHeight: 34, marginRight: 5, justifyContent: 'center', borderWidth: 1.1, borderColor: '#000000', borderRadius: 12, backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.sm },
  fillBlankInlineInput: { flex: 1, width: '100%', height: '100%', padding: 0, borderWidth: 0, backgroundColor: 'transparent', color: theme.colors.text, fontFamily: theme.typography.fontFaces.en.semibold, fontSize: 17, fontWeight: theme.typography.weights.semibold, textAlignVertical: 'center', includeFontPadding: false },
  stem: { fontSize: 17, lineHeight: 26, fontWeight: theme.typography.weights.semibold },
  optionList: { width: '100%', gap: 12 },
  optionButton: { width: '100%', minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, borderWidth: 1.5, borderColor: '#C1C1C1', borderRadius: 15, backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 8, boxShadow: 'none' },
  optionButtonSelected: { backgroundColor: '#FFFAE0', borderColor: '#F3C63F' },
  optionButtonCorrect: { backgroundColor: '#F1FFD9', borderColor: '#99C64F' },
  optionButtonWrong: { backgroundColor: '#FFF0F1', borderColor: '#FF5858' },
  optionLabelCircle: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: theme.colors.accentMuted },
  optionLabel: { fontWeight: theme.typography.weights.bold },
  optionText: { flex: 1, color: '#1E1E1E', fontSize: 16, lineHeight: 22, fontWeight: theme.typography.weights.semibold },
  optionOutcome: { width: 22, textAlign: 'center', fontSize: 19, lineHeight: 22, fontWeight: theme.typography.weights.bold },
  optionOutcomeCorrect: { color: '#74A82E' },
  optionOutcomeWrong: { color: '#FD6969' },
  inputGroup: { gap: theme.spacing.md },
  judgmentRow: { width: '100%', gap: 10 },
  judgmentButton: { width: '100%', minHeight: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#C1C1C1', borderRadius: 15, backgroundColor: theme.colors.surface, paddingHorizontal: 20, paddingVertical: 8 },
  judgmentButtonCorrect: { borderColor: '#8C8C8C', backgroundColor: '#FFFAE0' },
  judgmentButtonIncorrect: { borderColor: '#8C8C8C', backgroundColor: '#FFFAE0' },
  judgmentButtonMuted: { borderColor: '#B7B7B7' },
  judgmentText: { color: theme.colors.text, textAlign: 'center', fontSize: 13, lineHeight: 17, fontWeight: theme.typography.weights.semibold },
  judgmentTextActive: { color: theme.colors.text, fontWeight: theme.typography.weights.bold },
  judgmentTextMuted: { color: '#989898', fontWeight: theme.typography.weights.regular },
  judgmentRewriteInputShell: { minHeight: 52, width: '100%', justifyContent: 'center', borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 11, backgroundColor: theme.colors.surface, paddingHorizontal: 14, paddingVertical: 8, boxShadow: `2px 2px 0px ${theme.colors.border}` },
  judgmentRewriteInputShellTwoLine: { minHeight: 58 },
  judgmentRewriteInput: { width: '100%', minHeight: 22, padding: 0, borderWidth: 0, backgroundColor: 'transparent', color: theme.colors.text, fontSize: 14, lineHeight: 21, fontWeight: theme.typography.weights.semibold, textAlignVertical: 'top', includeFontPadding: false },
  judgmentRewriteInputTwoLine: { minHeight: 44 },
  textInput: { minHeight: 50, borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: theme.radii.md, backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, color: theme.colors.text, fontSize: 16, fontWeight: theme.typography.weights.semibold },
  multilineInput: { minHeight: 68, textAlignVertical: 'top' },
  openResponseInput: { height: 56, minHeight: 56, borderWidth: 1.5, borderColor: '#1E1E1E', borderRadius: 11, backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 0, boxShadow: '2px 2px 0px #1E1E1E' },
  openResponseInputEmpty: { textAlignVertical: 'center', paddingTop: 2, paddingBottom: 0 },
  sentenceTransformResponseInput: { borderColor: '#1E1E1E', borderRadius: 11, backgroundColor: '#FFFFFF', paddingHorizontal: 14, boxShadow: '2px 2px 0px #1E1E1E' },
  singleLineRewriteInput: { minHeight: 52, paddingVertical: 6, textAlignVertical: 'center' },
  twoLineRewriteInput: { minHeight: 62, paddingVertical: 6 },
  englishInput: { fontFamily: theme.typography.fontFaces.en.semibold },
  thaiInput: { fontFamily: theme.typography.fontFaces.th.semibold },
  questionFooter: { width: '100%', marginTop: 'auto', gap: theme.spacing.sm, paddingTop: theme.spacing.lg },
  fillBlankFooter: { marginTop: 'auto', marginHorizontal: -theme.spacing.md, marginBottom: -theme.spacing.md, width: 'auto' },
  feedback: { gap: theme.spacing.xs, borderRadius: theme.radii.md, paddingHorizontal: theme.spacing.xs },
  correctResult: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.sm },
  correctResultIcon: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#99C64F' },
  correctResultCheck: { color: theme.colors.surface, fontSize: 12, lineHeight: 15, fontWeight: theme.typography.weights.bold, includeFontPadding: false },
  correctResultText: { color: '#84B53C', fontSize: 16, lineHeight: 21, fontWeight: theme.typography.weights.bold },
  incorrectResult: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  incorrectResultIcon: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#F65555' },
  incorrectResultMark: { color: theme.colors.surface, fontSize: 11, lineHeight: 14, fontWeight: theme.typography.weights.semibold, includeFontPadding: false, textAlign: 'center', textAlignVertical: 'center' },
  incorrectResultText: { color: '#F65555', fontSize: 16, lineHeight: 21, fontWeight: theme.typography.weights.bold },
  errorText: { color: theme.colors.error },
  practiceCheckButton: { minHeight: 42, width: '100%', borderRadius: 25, borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: '#2862E8', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 5, boxShadow: `3px 3px 0px ${theme.colors.shadow}` },
  practiceNextButton: { backgroundColor: '#C8F0FF' },
  practiceIncorrectRetryButton: { minHeight: 44, borderRadius: 24, backgroundColor: '#FF5858' },
  incorrectActions: { width: '100%', alignItems: 'center', gap: 4 },
  checkActions: { width: '100%', alignItems: 'center', gap: theme.spacing.sm },
  skipButton: { alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 4 },
  skipText: { color: '#666666', fontSize: 11, lineHeight: 15, textDecorationLine: 'underline', textTransform: 'uppercase' },
  answerRevealSection: { width: '100%', alignItems: 'flex-start', gap: theme.spacing.sm, paddingTop: 2 },
  showAnswerLink: { color: '#666666', fontSize: 13, lineHeight: 18, textDecorationLine: 'underline' },
  revealedAnswerCard: { width: '100%', borderWidth: 1, borderColor: '#D7DCE2', borderRadius: theme.radii.md, backgroundColor: '#F8F8F8', padding: theme.spacing.md },
  revealedAnswer: { width: '100%', fontSize: 15, lineHeight: 22, fontWeight: theme.typography.weights.semibold },
  resultActionsRow: { width: '100%', flexDirection: 'row', gap: theme.spacing.sm },
  resultActionButton: { flex: 1, width: 'auto' },
  practiceCheckButtonText: { color: theme.colors.text, fontSize: 12, lineHeight: 16, fontWeight: theme.typography.weights.semibold, textTransform: 'uppercase' },
  retryButtonText: { color: theme.colors.surface, fontSize: 13 },
  practiceCheckButtonTextActive: { color: theme.colors.surface },
  practiceCheckButtonTextDisabled: { color: '#909090' },
  practiceCheckButtonPressed: { opacity: 0.9 },
  practiceCheckButtonDisabled: { backgroundColor: '#F3F3F3', borderColor: '#C4C4C4' },
  completionResult: { width: '100%', alignItems: 'center', marginTop: -8 },
  completionActions: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: theme.spacing.md, marginTop: theme.spacing.lg },
  completionButton: { minHeight: 46, width: '100%', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 24, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, boxShadow: `3px 4px 0px ${theme.colors.shadow}` },
  completionPracticeButton: { backgroundColor: '#B9E671' },
  completionRetryButton: { backgroundColor: '#FFD66B' },
  completionNextButton: { backgroundColor: theme.colors.surface },
  completionButtonText: { color: theme.colors.text, textAlign: 'center', fontSize: 14, lineHeight: 18, fontWeight: theme.typography.weights.semibold, textTransform: 'uppercase' },
  fullState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md, backgroundColor: theme.colors.background, padding: theme.spacing.xl },
  stateTitle: { textAlign: 'center', fontWeight: theme.typography.weights.bold },
  stateBody: { textAlign: 'center' },
  completeIcon: { width: 68, height: 68, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 34, backgroundColor: theme.colors.success },
  completeIconText: { fontWeight: theme.typography.weights.bold },
  completeTitle: { textAlign: 'center', fontSize: 28 },
  pickerHeader: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.sm },
  pickerContent: { padding: theme.spacing.lg, gap: theme.spacing.md },
  setList: { gap: theme.spacing.sm },
  setButton: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: theme.radii.md, backgroundColor: theme.colors.surface, padding: theme.spacing.md },
  setButtonTitle: { fontWeight: theme.typography.weights.bold },
});
