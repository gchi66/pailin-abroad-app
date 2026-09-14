import {
  ExerciseBankTopic,
  ExerciseBankV2Question,
  ExerciseBankV2QuestionContent,
} from '@/src/types/exercise-bank';
import { UiLanguage } from '@/src/types/home';

const localizedText = (
  english: string | null | undefined,
  thai: string | null | undefined,
  language: UiLanguage
) => {
  const preferred = language === 'th' ? thai : english;
  const fallback = language === 'th' ? english : thai;
  return preferred?.trim() || fallback?.trim() || '';
};

const localizedContent = (
  english: ExerciseBankV2QuestionContent | undefined,
  thai: ExerciseBankV2QuestionContent | undefined,
  language: UiLanguage
) => {
  if (language !== 'th' || !thai || Object.keys(thai).length === 0) {
    return english ?? thai ?? {};
  }
  return { ...(english ?? {}), ...thai };
};

type LocalizableTopic = Pick<ExerciseBankTopic, 'topic' | 'display_title'> &
  Partial<Pick<ExerciseBankTopic, 'topic_en' | 'topic_th' | 'display_title_en' | 'display_title_th'>>;

export const localizeExerciseBankTopic = <T extends LocalizableTopic>(
  topic: T,
  language: UiLanguage
): T => ({
  ...topic,
  topic: localizedText(topic.topic_en ?? topic.topic, topic.topic_th, language),
  display_title: localizedText(
    topic.display_title_en ?? topic.display_title,
    topic.display_title_th,
    language
  ),
});

export const localizeExerciseBankQuestion = (
  question: ExerciseBankV2Question,
  language: UiLanguage
): ExerciseBankV2Question => {
  const exercise = question.exercise;
  return {
    ...question,
    content: localizedContent(question.content_en ?? question.content, question.content_th, language),
    exercise: {
      ...exercise,
      display_type: localizedText(
        exercise.display_type_en ?? exercise.display_type,
        exercise.display_type_th,
        language
      ),
      prompt: localizedText(exercise.prompt_en ?? exercise.prompt, exercise.prompt_th, language),
      examples: exercise.examples.map((example) => ({
        ...example,
        content: localizedContent(example.content_en ?? example.content, example.content_th, language),
      })),
    },
  };
};
