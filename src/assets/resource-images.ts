import type { ImageSourcePropType } from 'react-native';

import commonMistakesImage from '@/assets/images/resources/common-mistakes.png';
import cultureNotesImage from '@/assets/images/resources/culture-notes.png';
import exerciseBankImage from '@/assets/images/resources/exercise-bank.png';
import phrasesAndPhrasalVerbsImage from '@/assets/images/resources/phrases-and-phrasal-verbs.png';
import topicLibraryImage from '@/assets/images/resources/topic-library.png';

export const resourceCardImages = {
  'exercise-bank': exerciseBankImage,
  'topic-library': topicLibraryImage,
  'common-mistakes': commonMistakesImage,
  'phrases-verbs': phrasesAndPhrasalVerbsImage,
  'culture-notes': cultureNotesImage,
} satisfies Record<string, ImageSourcePropType>;
