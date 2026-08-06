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
import { Image } from 'expo-image';

import {
  advanceExerciseBankV2Set,
  fetchExerciseBankV2Set,
  fetchExerciseBankV2Topic,
  saveExerciseBankV2Cursor,
  submitExerciseBankV2Answer,
} from '@/src/api/exercise-bank';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { LanguageToggle } from '@/src/components/ui/LanguageToggle';
import { PageLoadingState } from '@/src/components/ui/PageLoadingState';
import { ResponsivePageShell } from '@/src/components/ui/ResponsivePageShell';
import { StandardPageHeader } from '@/src/components/ui/StandardPageHeader';
import { useUiLanguage } from '@/src/context/ui-language-context';
import { theme } from '@/src/theme/theme';
import pailinBlueThumbsUpImage from '@/assets/images/pailin-blue-circle-thumbs-up.webp';
import {
  ExerciseBankAnswer,
  ExerciseBankAnswerResult,
  ExerciseBankTopicDetail,
  ExerciseBankV2Example,
  ExerciseBankV2Question,
  ExerciseBankV2Set,
} from '@/src/types/exercise-bank';

type UiLanguage = 'en' | 'th';

const getParam = (value?: string | string[]) => (Array.isArray(value) ? value[0] ?? '' : value ?? '');

const getCopy = (language: UiLanguage) => language === 'th' ? {
  back: 'กลับ', set: 'ชุดที่', question: 'คำถาม', of: 'จาก', check: 'ตรวจคำตอบ', checking: 'กำลังตรวจ…',
  continue: 'ถัดไป →', answerTryAgain: 'ลองอีกครั้ง', correct: 'ถูกต้อง!', incorrect: 'ลองอีกครั้ง', retry: 'ลองคำถามที่พลาดอีกครั้ง',
  backToTopics: 'กลับไปที่หัวข้อ', setFinished: 'จบชุดแบบฝึกหัด', mastered: 'ทำสำเร็จ', chooseSet: 'เลือกชุดแบบฝึกหัด',
  typeAnswer: 'พิมพ์คำตอบ', rewrite: 'เขียนประโยคใหม่', sentenceCorrect: 'ประโยคนี้ถูกต้อง',
  sentenceIncorrect: 'ประโยคนี้ไม่ถูกต้อง', loadError: 'ไม่สามารถโหลดแบบฝึกหัดได้', tryAgain: 'ลองอีกครั้ง',
  example: 'ตัวอย่าง', answer: 'คำตอบ', exampleCorrect: 'ถูกต้อง', exampleIncorrect: 'ไม่ถูกต้อง', showAnswer: 'ดูคำตอบ', hideAnswer: 'ซ่อนคำตอบ', answerUnavailable: 'ยังไม่สามารถแสดงคำตอบได้',
  greatWork: 'เยี่ยมมาก!', greatProgress: 'พัฒนาได้ดีมาก!', keepPracticing: 'ฝึกต่อไป!', gotCorrect: 'คุณตอบถูก', perfectBody: 'คุณตอบถูกทุกข้อ! พร้อมสำหรับความท้าทายต่อไปแล้ว', progressBody: 'ใกล้เข้าใจหัวข้อนี้แล้ว ลองอีกครั้งหรือฝึกต่อไป', practiceBody: 'ไวยากรณ์ต้องใช้เวลา ทบทวนแบบฝึกหัดแล้วลองอีกครั้ง คุณทำได้!', goNextSet: 'ไปชุดถัดไป', chooseNewTopic: 'เลือกหัวข้อใหม่', backToBank: 'กลับคลังแบบฝึกหัด',
} : {
  back: 'Back', set: 'Set', question: 'Question', of: 'of', check: 'CHECK ANSWER', checking: 'CHECKING…',
  continue: 'NEXT →', answerTryAgain: 'TRY AGAIN', correct: 'Correct!', incorrect: 'Try again', retry: 'Retry missed questions',
  backToTopics: 'Back to topics', setFinished: 'Set finished', mastered: 'mastered', chooseSet: 'Choose a set',
  typeAnswer: 'Type your answer', rewrite: 'Rewrite the sentence', sentenceCorrect: 'The sentence is correct',
  sentenceIncorrect: 'The sentence is incorrect', loadError: 'Unable to load this exercise.', tryAgain: 'Try again',
  example: 'Example', answer: 'Answer', exampleCorrect: 'Correct', exampleIncorrect: 'Incorrect', showAnswer: 'Show Answer', hideAnswer: 'Hide Answer', answerUnavailable: 'The answer is not available yet.',
  greatWork: 'Great Work!', greatProgress: 'Great Progress!', keepPracticing: 'Keep Practicing!', gotCorrect: 'You got', perfectBody: "You nailed every single question! You're ready for the next challenge.", progressBody: "You're super close to mastering this concept! Give it another shot or keep moving.", practiceBody: "Grammar takes time to master. Review the exercise and try again. You've got this!", goNextSet: 'Go to Next Set', chooseNewTopic: 'Choose a New Topic', backToBank: 'Back to Exercise Bank',
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
  language: UiLanguage;
  onChange: (answer: ExerciseBankAnswer) => void;
  question: ExerciseBankV2Question;
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
  const isJudgmentExample = exerciseType === 'sentence_transform'
    && typeof content.example_is_correct === 'boolean';

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
    <View style={[styles.examplePanel, isJudgmentExample ? styles.judgmentExamplePanel : null]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        style={styles.exampleHeader}
        onPress={() => setIsExpanded((current) => !current)}>
        <AppText language={language} variant="caption" style={styles.exampleLabel}>{copy.example}</AppText>
        <AppText language="en" variant="body" style={styles.exampleArrow}>{isExpanded ? '↑' : '↓'}</AppText>
      </Pressable>
      {isExpanded ? (
        isJudgmentExample ? (
          <View style={styles.judgmentExampleBody}>
            {sourceText ? <AppText language="en" variant="body" style={styles.judgmentExampleSentence}>{sourceText}</AppText> : null}
            <View style={styles.judgmentExampleChoices}>
              <View style={[styles.judgmentExampleChoice, content.example_is_correct ? styles.judgmentExampleChoiceCorrect : null]}>
                <AppText language={language} variant="caption" style={[styles.judgmentExampleChoiceText, content.example_is_correct ? styles.judgmentExampleChoiceTextActive : null]}>
                  {copy.exampleCorrect} ✓
                </AppText>
              </View>
              <View style={[styles.judgmentExampleChoice, !content.example_is_correct ? styles.judgmentExampleChoiceIncorrect : null]}>
                <AppText language={language} variant="caption" style={[styles.judgmentExampleChoiceText, !content.example_is_correct ? styles.judgmentExampleChoiceTextActive : null]}>
                  {copy.exampleIncorrect} X
                </AppText>
              </View>
            </View>
            <View style={styles.judgmentExampleAnswerShell}>
              <AppText language="en" variant="body" style={styles.judgmentExampleAnswerText}>{answer || sourceText}</AppText>
              <View style={styles.judgmentExampleAnswerBadge}>
                <AppText language="en" variant="caption" style={styles.judgmentExampleAnswerBadgeText}>✓</AppText>
              </View>
            </View>
          </View>
        ) : (
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
        )
      ) : null}
    </View>
  );
}

function QuestionInput({ answer, disabled, language, onChange, question }: QuestionInputProps) {
  const copy = getCopy(language);
  const [inputContainerWidth, setInputContainerWidth] = useState(0);
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
              <AppText key={`text-${index}`} language="en" variant="body" style={styles.fillBlankSentenceText}>
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
              <TextInput
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
        <View style={styles.judgmentRow}>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: judgment === true, disabled }}
            disabled={disabled}
            style={[
              styles.judgmentButton,
              judgment === true ? styles.judgmentButtonCorrect : null,
              judgment === false ? styles.judgmentButtonMuted : null,
            ]}
            onPress={() => onChange({ marked_as_correct: true, rewrite: '' })}>
            <AppText language={language} variant="caption" style={[styles.judgmentText, judgment === true ? styles.judgmentTextActive : null, judgment === false ? styles.judgmentTextMuted : null]}>{copy.exampleCorrect} ✓</AppText>
          </Pressable>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: judgment === false, disabled }}
            disabled={disabled}
            style={[
              styles.judgmentButton,
              judgment === false ? styles.judgmentButtonIncorrect : null,
              judgment === true ? styles.judgmentButtonMuted : null,
            ]}
            onPress={() => onChange({ marked_as_correct: false, rewrite })}>
            <AppText language={language} variant="caption" style={[styles.judgmentText, judgment === false ? styles.judgmentTextActive : null, judgment === true ? styles.judgmentTextMuted : null]}>{copy.exampleIncorrect} X</AppText>
          </Pressable>
        </View>
        {judgment === false ? (
          <View style={styles.judgmentRewriteInputShell}>
            <TextInput
              accessibilityLabel={copy.rewrite}
              editable={!disabled}
              numberOfLines={1}
              placeholder={copy.rewrite}
              placeholderTextColor={theme.colors.mutedText}
              style={[styles.judgmentRewriteInput, language === 'th' ? styles.thaiInput : styles.englishInput]}
              value={rewrite}
              onChangeText={(value) => onChange({ marked_as_correct: false, rewrite: value })}
            />
          </View>
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
  const [topicName, setTopicName] = useState('');
  const [setData, setSetData] = useState<ExerciseBankV2Set | null>(null);
  const [queue, setQueue] = useState<number[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, ExerciseBankAnswer>>({});
  const [results, setResults] = useState<Record<number, ExerciseBankAnswerResult>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isQuestionNavigatorOpen, setIsQuestionNavigatorOpen] = useState(false);
  const [revealedAnswerIds, setRevealedAnswerIds] = useState<Record<number, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsFinished(false);
    setIsQuestionNavigatorOpen(false);
    setRevealedAnswerIds({});
    setAnswers({});
    setResults({});
    try {
      if (!topicId) throw new Error(copy.loadError);
      let resolvedSetNumber = hasSetNumber ? setNumber : null;
      let detail: ExerciseBankTopicDetail | null = null;

      if (resolvedSetNumber === null) {
        detail = await fetchExerciseBankV2Topic(topicId);
        setTopicDetail(detail);
        setTopicTitle(detail.display_title);
        setTopicName(detail.topic);
        resolvedSetNumber = detail.next_incomplete_set;
        if (resolvedSetNumber === null) return;
      }

      const [response, fetchedDetail] = await Promise.all([
        fetchExerciseBankV2Set(topicId, resolvedSetNumber),
        detail ? Promise.resolve(detail) : fetchExerciseBankV2Topic(topicId).catch(() => null),
      ]);
      detail = fetchedDetail;
      if (detail) setTopicDetail(detail);
      setTopicTitle(response.topic.display_title);
      setTopicName(response.topic.topic);
      setSetData(response.set);
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
      setErrorMessage(error instanceof Error ? error.message : copy.loadError);
    } finally {
      setIsLoading(false);
    }
  }, [copy.loadError, hasSetNumber, setNumber, topicId]);

  useEffect(() => { void load(); }, [load]);

  const questionsById = useMemo(
    () => new Map((setData?.questions ?? []).map((question) => [question.id, question])),
    [setData]
  );
  const currentQuestion = questionsById.get(queue[queueIndex]);
  const currentResult = currentQuestion ? results[currentQuestion.id] : undefined;
  const latestCorrectCount = queue.filter((questionId) => results[questionId]?.correct === true).length;

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
    setIsQuestionNavigatorOpen(false);
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

  const navigateToQuestion = (index: number) => {
    const questionId = queue[index];
    if (questionId === undefined) return;
    setQueueIndex(index);
    setIsFinished(false);
    setIsQuestionNavigatorOpen(false);
    setErrorMessage(null);
    persistCursor(index + 1, 'question');
  };

  const retryCurrentQuestion = () => {
    if (!currentQuestion) return;
    setAnswers((current) => {
      const next = { ...current };
      delete next[currentQuestion.id];
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
    setErrorMessage(null);
  };

  const restartSet = () => {
    setAnswers({});
    setResults({});
    setRevealedAnswerIds({});
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
      router.replace('/(tabs)/resources/exercise-bank');
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
        <Button title={copy.backToTopics} language={uiLanguage} variant="outline" onPress={() => router.back()} />
      </View>
    );
  }

  if (!setData && topicDetail) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
        <ResponsivePageShell>
          <StandardPageHeader language={uiLanguage} title="" hideTitle bottomSpacing={16} onBackPress={() => router.back()} backLabel={copy.back} rightElement={<LanguageToggle compact />} />
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
    const isPerfect = setData.question_count === 5 && latestCorrectCount === 5;
    const isProgress = latestCorrectCount >= 3 && !isPerfect;
    const completionTitle = isPerfect ? copy.greatWork : isProgress ? copy.greatProgress : copy.keepPracticing;
    const completionBody = isPerfect ? copy.perfectBody : isProgress ? copy.progressBody : copy.practiceBody;
    const hasNextSet = Boolean(topicDetail?.sets.some((item) => item.set_number > setData.set_number));
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.contentContainer}>
        <ResponsivePageShell>
          <StandardPageHeader language={uiLanguage} title={`${copy.set} ${setData.set_number}`} titleSize="compact" titleStyle={styles.setHeaderTitle} inlineActions bottomSpacing={6} onBackPress={() => router.back()} backLabel={copy.back} rightElement={<LanguageToggle compact />} />
          <View style={styles.sessionContent}>
            <View style={styles.sessionHeading}>
              <View style={styles.topicHeadingCopy}>
                <AppText language="en" variant="title" style={styles.topicDisplayTitle}>{topicTitle}</AppText>
                <AppText language="en" variant="body" style={styles.topicTechnicalName}>{topicName}</AppText>
              </View>
              <View style={styles.questionMeta}>
                <AppText language={uiLanguage} variant="caption" style={styles.questionMetaText}>{setData.question_count} / {setData.question_count}</AppText>
              </View>
            </View>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: '100%' }]} /></View>
            <View style={styles.questionSectionDivider} />
            <View style={styles.completionCard}>
              {isPerfect ? <Image source={pailinBlueThumbsUpImage} contentFit="contain" style={styles.completionImage} /> : null}
              <AppText language={uiLanguage} variant="title" style={styles.completionTitle}>{completionTitle}</AppText>
              <AppText language={uiLanguage} variant="body" style={styles.completionScore}>
                {copy.gotCorrect} {latestCorrectCount} / {setData.question_count}{uiLanguage === 'en' ? ' correct!' : ' ข้อ'}
              </AppText>
              <AppText language={uiLanguage} variant="caption" style={styles.completionBody}>{completionBody}</AppText>
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
                  onPress={isPerfect ? () => router.replace('/(tabs)/resources/exercise-bank') : goToNextSet}>
                  <AppText language={uiLanguage} variant="caption" style={styles.completionButtonText}>
                    {isPerfect ? copy.chooseNewTopic : hasNextSet ? copy.goNextSet : copy.backToBank}
                  </AppText>
                </Pressable>
              </View>
            </View>
          </View>
        </ResponsivePageShell>
      </ScrollView>
    );
  }

  const isJudgmentQuestion = currentQuestion.exercise.exercise_type === 'sentence_transform'
    && /correct.*incorrect|incorrect.*correct/i.test(currentQuestion.exercise.display_type);
  const isFillBlankQuestion = currentQuestion.exercise.exercise_type === 'fill_blank';
  const feedback = uiLanguage === 'th' ? currentResult?.feedback_th : currentResult?.feedback_en;
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.contentContainer}>
        <ResponsivePageShell>
          <StandardPageHeader language={uiLanguage} title={`${copy.set} ${setData.set_number}`} titleSize="compact" titleStyle={styles.setHeaderTitle} inlineActions bottomSpacing={6} onBackPress={() => router.back()} backLabel={copy.back} rightElement={<LanguageToggle compact />} />
          <View style={styles.sessionContent}>
            <View style={styles.sessionHeading}>
              <View style={styles.topicHeadingCopy}>
                <AppText language="en" variant="title" style={styles.topicDisplayTitle}>{topicTitle}</AppText>
                <AppText language="en" variant="body" style={styles.topicTechnicalName}>{topicName}</AppText>
              </View>
            </View>
            <View style={styles.progressRow}>
              <View style={[styles.progressTrack, styles.progressTrackInline]}><View style={[styles.progressFill, { width: `${((queueIndex + 1) / queue.length) * 100}%` }]} /></View>
              <View style={styles.questionMetaWrap}>
                <View style={styles.questionMeta}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isQuestionNavigatorOpen }}
                    style={styles.questionNavigatorTrigger}
                    onPress={() => setIsQuestionNavigatorOpen((current) => !current)}>
                    <AppText language={uiLanguage} variant="caption" style={styles.questionMetaText}>
                      {queueIndex + 1} {copy.of} {queue.length}
                    </AppText>
                    <AppText language="en" variant="caption" style={styles.questionNavigatorChevron}>
                      {isQuestionNavigatorOpen ? '▲' : '▼'}
                    </AppText>
                  </Pressable>
                </View>
                {isQuestionNavigatorOpen ? (
                  <View style={styles.questionNavigatorMenu}>
                    {queue.map((questionId, index) => {
                      const question = questionsById.get(questionId);
                      const isCurrent = index === queueIndex;
                      return (
                        <Pressable
                          key={questionId}
                          accessibilityRole="button"
                          style={[styles.questionNavigatorItem, isCurrent ? styles.questionNavigatorItemCurrent : null]}
                          onPress={() => navigateToQuestion(index)}>
                          <AppText language={uiLanguage} variant="caption" style={styles.questionNavigatorItemText}>
                            {copy.question} {index + 1}
                          </AppText>
                          {question?.progress.has_answered_correctly ? (
                            <AppText language="en" variant="caption" style={styles.questionNavigatorCompleted}>✓</AppText>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            </View>
            <View style={styles.questionSectionDivider} />

            <View style={[styles.questionContent, styles.judgmentQuestionContent]}>
              <View style={[
                styles.questionInstructions,
                currentResult?.correct ? styles.questionInstructionsCorrect : null,
                currentResult && !currentResult.correct ? styles.questionInstructionsIncorrect : null,
              ]}>
                <AppText
                  language="en"
                  variant="body"
                  style={[
                    styles.prompt,
                    currentQuestion.exercise.exercise_type === 'fill_blank' ? styles.fillBlankPrompt : null,
                    isJudgmentQuestion ? styles.judgmentPrompt : null,
                  ]}>
                  {currentQuestion.exercise.prompt}
                </AppText>
                {currentQuestion.exercise.examples?.[0] ? (
                  <ExamplePanel
                    key={currentQuestion.id}
                    example={currentQuestion.exercise.examples[0]}
                    exerciseType={currentQuestion.exercise.exercise_type}
                    language={uiLanguage}
                  />
                ) : null}
                {isFillBlankQuestion ? (
                  <View style={styles.questionWorkPanel}>
                    <AppText language="en" variant="caption" style={styles.displayType}>{currentQuestion.exercise.display_type}</AppText>
                    <QuestionInput
                      answer={answers[currentQuestion.id]}
                      disabled={Boolean(currentResult)}
                      language={uiLanguage}
                      question={currentQuestion}
                      onChange={(answer) => setAnswers((current) => ({ ...current, [currentQuestion.id]: answer }))}
                    />
                  </View>
                ) : isJudgmentQuestion ? (
                  <>
                    <View style={styles.questionWorkPanel}>
                      <AppText language="en" variant="caption" style={styles.displayType}>{currentQuestion.exercise.display_type}</AppText>
                      {currentQuestion.content.stem || currentQuestion.content.text ? (
                        <AppText language="en" variant="body" style={styles.stem}>{currentQuestion.content.stem ?? currentQuestion.content.text}</AppText>
                      ) : null}
                    </View>
                    <QuestionInput
                      answer={answers[currentQuestion.id]}
                      disabled={Boolean(currentResult)}
                      language={uiLanguage}
                      question={currentQuestion}
                      onChange={(answer) => setAnswers((current) => ({ ...current, [currentQuestion.id]: answer }))}
                    />
                  </>
                ) : (
                  <>
                    <View style={styles.questionWorkPanel}>
                      <AppText language="en" variant="caption" style={styles.displayType}>{currentQuestion.exercise.display_type}</AppText>
                      {currentQuestion.content.stem || currentQuestion.content.text ? (
                        <AppText language="en" variant="body" style={styles.stem}>{currentQuestion.content.stem ?? currentQuestion.content.text}</AppText>
                      ) : null}
                    </View>
                    <QuestionInput
                      answer={answers[currentQuestion.id]}
                      disabled={Boolean(currentResult)}
                      language={uiLanguage}
                      question={currentQuestion}
                      onChange={(answer) => setAnswers((current) => ({ ...current, [currentQuestion.id]: answer }))}
                    />
                  </>
                )}
              </View>
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
                  <Pressable
                    accessibilityRole="button"
                    disabled={isSubmitting || !hasAnswer(answers[currentQuestion.id])}
                    style={({ pressed }) => [
                      styles.practiceCheckButton,
                      isSubmitting || !hasAnswer(answers[currentQuestion.id]) ? styles.practiceCheckButtonDisabled : null,
                      pressed ? styles.practiceCheckButtonPressed : null,
                    ]}
                    onPress={() => void submit()}>
                    <AppText language={uiLanguage} variant="caption" style={styles.practiceCheckButtonText}>
                      {isSubmitting ? copy.checking : copy.check}
                    </AppText>
                  </Pressable>
                ) : currentResult.correct ? (
                  <Pressable
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.practiceCheckButton, styles.practiceNextButton, pressed ? styles.practiceCheckButtonPressed : null]}
                    onPress={advance}>
                    <AppText language={uiLanguage} variant="caption" style={styles.practiceCheckButtonText}>{copy.continue}</AppText>
                  </Pressable>
                ) : (
                  <View style={styles.incorrectActions}>
                    <View style={styles.resultActionsRow}>
                      <Pressable
                        accessibilityRole="button"
                        style={({ pressed }) => [styles.practiceCheckButton, styles.practiceIncorrectRetryButton, styles.resultActionButton, pressed ? styles.practiceCheckButtonPressed : null]}
                        onPress={retryCurrentQuestion}>
                        <AppText language={uiLanguage} variant="caption" style={styles.practiceCheckButtonText}>{copy.answerTryAgain}</AppText>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        style={({ pressed }) => [styles.practiceCheckButton, styles.practiceNextButton, styles.resultActionButton, pressed ? styles.practiceCheckButtonPressed : null]}
                        onPress={advance}>
                        <AppText language={uiLanguage} variant="caption" style={styles.practiceCheckButtonText}>{copy.continue}</AppText>
                      </Pressable>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setRevealedAnswerIds((current) => ({
                        ...current,
                        [currentQuestion.id]: !current[currentQuestion.id],
                      }))}>
                      <AppText language={uiLanguage} variant="caption" style={styles.showAnswerLink}>
                        {revealedAnswerIds[currentQuestion.id] ? copy.hideAnswer : copy.showAnswer}
                      </AppText>
                    </Pressable>
                    {revealedAnswerIds[currentQuestion.id] ? (
                      <AppText language={currentResult.review_answer ? 'en' : uiLanguage} variant="body" style={styles.revealedAnswer}>
                        {currentResult.review_answer || copy.answerUnavailable}
                      </AppText>
                    ) : null}
                  </View>
                )}
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
  setHeaderTitle: { fontSize: 26, lineHeight: 31 },
  sessionHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: theme.spacing.md },
  topicHeadingCopy: { flex: 1, gap: 2 },
  topicDisplayTitle: { color: theme.colors.text, fontSize: 25, lineHeight: 30, fontWeight: theme.typography.weights.bold },
  topicTechnicalName: { color: theme.colors.text, fontSize: 14, lineHeight: 19, fontWeight: theme.typography.weights.semibold },
  questionMetaWrap: { position: 'relative', zIndex: 10, alignItems: 'flex-end' },
  questionMeta: { alignItems: 'flex-end' },
  questionMetaText: { color: theme.colors.mutedText, fontSize: 11, lineHeight: 18 },
  questionNavigatorTrigger: { height: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5, paddingLeft: theme.spacing.sm },
  questionNavigatorChevron: { color: theme.colors.mutedText, fontSize: 8, lineHeight: 18 },
  questionNavigatorMenu: { position: 'absolute', top: 28, right: 0, zIndex: 20, minWidth: 150, overflow: 'hidden', borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: theme.radii.md, backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow, shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  questionNavigatorItem: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#D5D9DE', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
  questionNavigatorItemCurrent: { backgroundColor: '#EAF6FF' },
  questionNavigatorItemText: { color: theme.colors.text, fontWeight: theme.typography.weights.semibold },
  questionNavigatorCompleted: { color: '#4E8A14', fontSize: 16, fontWeight: theme.typography.weights.bold },
  progressRow: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, zIndex: 10, marginTop: -3 },
  progressTrack: { width: '100%', height: 10, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radii.xl, backgroundColor: '#E8E8E8' },
  progressTrackInline: { flex: 1, width: 'auto' },
  progressFill: { height: '100%', backgroundColor: '#B9E671' },
  questionSectionDivider: { height: 1, marginVertical: theme.spacing.xs, backgroundColor: '#C9CDD2' },
  questionContent: { width: '100%', paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs, gap: theme.spacing.md },
  judgmentQuestionContent: { paddingHorizontal: 0 },
  questionPanel: { width: '100%', borderRadius: theme.radii.md, backgroundColor: '#D6ECFF', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, gap: theme.spacing.md },
  questionInstructions: { width: '100%', paddingHorizontal: theme.spacing.sm, paddingTop: theme.spacing.xs, paddingBottom: theme.spacing.md, gap: theme.spacing.md },
  questionInstructionsCorrect: { paddingBottom: theme.spacing.xs },
  questionInstructionsIncorrect: { paddingBottom: 0 },
  questionWorkPanel: { width: '100%', borderRadius: theme.radii.md, backgroundColor: '#D6ECFF', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, gap: theme.spacing.md },
  displayType: { color: '#2D4C7C', fontSize: 12, fontWeight: theme.typography.weights.bold, textTransform: 'uppercase' },
  prompt: { fontSize: 15, lineHeight: 22, fontWeight: theme.typography.weights.regular },
  judgmentPrompt: { fontSize: 15, lineHeight: 22, fontWeight: theme.typography.weights.regular },
  fillBlankPrompt: { fontSize: 15, lineHeight: 22, fontWeight: theme.typography.weights.regular },
  examplePanel: { overflow: 'hidden', borderRadius: theme.radii.sm, backgroundColor: '#EEEEEE', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
  judgmentExamplePanel: { borderRadius: 6, paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.sm },
  exampleHeader: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  exampleLabel: { color: theme.colors.mutedText, fontSize: 14, fontWeight: theme.typography.weights.semibold, textDecorationLine: 'underline' },
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
  judgmentExampleBody: { gap: theme.spacing.sm, paddingTop: 2, paddingBottom: theme.spacing.xs },
  judgmentExampleSentence: { fontSize: 14.5, lineHeight: 21, fontWeight: theme.typography.weights.regular },
  judgmentExampleChoices: { width: '100%', flexDirection: 'row', gap: theme.spacing.sm },
  judgmentExampleChoice: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#999999', borderRadius: 20, backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.sm, paddingVertical: 5 },
  judgmentExampleChoiceCorrect: { borderColor: theme.colors.border, backgroundColor: '#E9F8D3' },
  judgmentExampleChoiceIncorrect: { borderColor: theme.colors.border, backgroundColor: '#FFF4C7' },
  judgmentExampleChoiceText: { color: '#989898', fontSize: 13, lineHeight: 17, textAlign: 'center' },
  judgmentExampleChoiceTextActive: { color: theme.colors.text, fontWeight: theme.typography.weights.bold },
  judgmentExampleAnswerShell: { minHeight: 40, width: '100%', flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, borderWidth: 1.1, borderColor: theme.colors.border, borderRadius: theme.radii.sm, backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.sm, paddingVertical: 6 },
  judgmentExampleAnswerText: { flex: 1, minWidth: 0, color: '#62656D', fontSize: 14, lineHeight: 20 },
  judgmentExampleAnswerBadge: { width: 14, height: 14, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 4, backgroundColor: '#3CA0FE' },
  judgmentExampleAnswerBadgeText: { color: theme.colors.surface, fontSize: 8, lineHeight: 8, fontWeight: theme.typography.weights.bold, includeFontPadding: false },
  fillBlankSentence: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 0, rowGap: 1 },
  fillBlankSentenceText: { marginRight: 5, fontSize: 17, lineHeight: 24, fontWeight: theme.typography.weights.semibold },
  fillBlankInlineInputShell: { height: 34, minHeight: 34, marginRight: 5, justifyContent: 'center', borderWidth: 1.1, borderColor: '#000000', borderRadius: 12, backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.sm },
  fillBlankInlineInput: { flex: 1, width: '100%', height: '100%', padding: 0, borderWidth: 0, backgroundColor: 'transparent', color: theme.colors.text, fontFamily: theme.typography.fontFaces.en.semibold, fontSize: 17, fontWeight: theme.typography.weights.semibold, textAlignVertical: 'center', includeFontPadding: false },
  stem: { fontSize: 17, lineHeight: 26, fontWeight: theme.typography.weights.semibold },
  optionList: { gap: theme.spacing.sm },
  optionButton: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: theme.radii.md, backgroundColor: theme.colors.surface, padding: theme.spacing.md },
  optionButtonSelected: { backgroundColor: theme.colors.accentMuted, borderColor: '#2D4C7C' },
  optionLabelCircle: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: theme.colors.accentMuted },
  optionLabel: { fontWeight: theme.typography.weights.bold },
  optionText: { flex: 1 },
  inputGroup: { gap: theme.spacing.md },
  judgmentRow: { flexDirection: 'row', gap: theme.spacing.sm },
  judgmentButton: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1.1, borderColor: theme.colors.border, borderRadius: 22, backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.sm, paddingVertical: 6 },
  judgmentButtonCorrect: { borderColor: theme.colors.border, backgroundColor: '#E9F8D3' },
  judgmentButtonIncorrect: { borderColor: theme.colors.border, backgroundColor: '#FFF4C7' },
  judgmentButtonMuted: { borderColor: '#B7B7B7' },
  judgmentText: { color: theme.colors.text, textAlign: 'center', fontSize: 13, lineHeight: 17, fontWeight: theme.typography.weights.semibold },
  judgmentTextActive: { color: theme.colors.text, fontWeight: theme.typography.weights.bold },
  judgmentTextMuted: { color: '#989898', fontWeight: theme.typography.weights.regular },
  judgmentRewriteInputShell: { height: 42, width: '100%', justifyContent: 'center', borderWidth: 1.1, borderColor: theme.colors.border, borderRadius: theme.radii.sm, backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.sm },
  judgmentRewriteInput: { flex: 1, width: '100%', height: '100%', padding: 0, borderWidth: 0, backgroundColor: 'transparent', color: theme.colors.text, fontSize: 14, fontWeight: theme.typography.weights.semibold, textAlignVertical: 'center', includeFontPadding: false },
  textInput: { minHeight: 50, borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: theme.radii.md, backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, color: theme.colors.text, fontSize: 16, fontWeight: theme.typography.weights.semibold },
  multilineInput: { minHeight: 110, textAlignVertical: 'top' },
  englishInput: { fontFamily: theme.typography.fontFaces.en.semibold },
  thaiInput: { fontFamily: theme.typography.fontFaces.th.semibold },
  feedback: { gap: theme.spacing.xs, borderRadius: theme.radii.md, paddingHorizontal: theme.spacing.sm },
  correctResult: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.sm },
  correctResultIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#3CA0FE' },
  correctResultCheck: { color: theme.colors.surface, fontSize: 21, lineHeight: 24, fontWeight: theme.typography.weights.bold, includeFontPadding: false },
  correctResultText: { color: '#3CA0FE', fontSize: 24, lineHeight: 30, fontWeight: theme.typography.weights.bold },
  incorrectResult: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  incorrectResultIcon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#F65555' },
  incorrectResultMark: { color: theme.colors.surface, fontSize: 16, lineHeight: 18, fontWeight: theme.typography.weights.semibold, includeFontPadding: false, textAlign: 'center', textAlignVertical: 'center' },
  incorrectResultText: { color: '#F65555', fontSize: 20, lineHeight: 26, fontWeight: theme.typography.weights.bold },
  errorText: { color: theme.colors.error },
  practiceCheckButton: { minHeight: 38, width: '100%', borderRadius: 25, borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: '#91CAFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 5, shadowColor: theme.colors.shadow, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 3, height: 3 }, elevation: 3 },
  practiceNextButton: { backgroundColor: '#B9E671' },
  practiceIncorrectRetryButton: { backgroundColor: '#F65555' },
  incorrectActions: { width: '100%', alignItems: 'center', gap: theme.spacing.md },
  showAnswerLink: { color: theme.colors.mutedText, fontSize: 14, textDecorationLine: 'underline' },
  revealedAnswer: { width: '100%', textAlign: 'center', fontSize: 15, lineHeight: 22, fontWeight: theme.typography.weights.semibold },
  resultActionsRow: { width: '100%', flexDirection: 'row', gap: theme.spacing.sm },
  resultActionButton: { flex: 1, width: 'auto' },
  practiceCheckButtonText: { color: theme.colors.text, fontSize: 14, lineHeight: 18, fontWeight: theme.typography.weights.semibold, textTransform: 'uppercase' },
  practiceCheckButtonPressed: { opacity: 0.9 },
  practiceCheckButtonDisabled: { opacity: 0.55 },
  completionCard: { width: '100%', maxWidth: 520, alignSelf: 'center', alignItems: 'center', gap: theme.spacing.sm, borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: theme.radii.md, backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.xl, shadowColor: theme.colors.shadow, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 5, height: 6 }, elevation: 6 },
  completionImage: { width: 128, height: 128, marginBottom: theme.spacing.xs },
  completionTitle: { color: theme.colors.text, textAlign: 'center', fontSize: 28, lineHeight: 34, fontWeight: theme.typography.weights.bold },
  completionScore: { color: theme.colors.text, textAlign: 'center', fontSize: 17, lineHeight: 23, fontWeight: theme.typography.weights.semibold },
  completionBody: { maxWidth: 300, color: theme.colors.text, textAlign: 'center', fontSize: 13, lineHeight: 18 },
  completionActions: { width: '100%', gap: theme.spacing.md, marginTop: theme.spacing.lg },
  completionButton: { minHeight: 46, width: '100%', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 24, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, shadowColor: theme.colors.shadow, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 3, height: 4 }, elevation: 4 },
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
  pickerContent: { padding: theme.spacing.lg, gap: theme.spacing.md },
  pickerTitle: { textAlign: 'left', fontSize: 28, fontWeight: theme.typography.weights.bold },
  pickerSubtitle: { fontWeight: theme.typography.weights.semibold },
  setList: { gap: theme.spacing.sm },
  setButton: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: theme.radii.md, backgroundColor: theme.colors.surface, padding: theme.spacing.md },
  setButtonTitle: { fontWeight: theme.typography.weights.bold },
});
