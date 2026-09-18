import type { ImageSourcePropType } from 'react-native';

import commonMistakesImage from '@/assets/images/resources-common-mistakes.png';
import conversationsImage from '@/assets/images/resources-conversations.png';
import cultureNotesImage from '@/assets/images/resources-culture-notes.png';
import exerciseBankImage from '@/assets/images/resources-exercise-bank.png';
import phrasesVerbsImage from '@/assets/images/resources-phrases-verbs.png';
import pronunciationImage from '@/assets/images/resources-pronunciation.png';
import topicLibraryImage from '@/assets/images/resources-topic-library.png';

export const resourceCardImages = {
  'exercise-bank': exerciseBankImage,
  'topic-library': topicLibraryImage,
  'common-mistakes': commonMistakesImage,
  'phrases-verbs': phrasesVerbsImage,
  conversations: conversationsImage,
  pronunciation: pronunciationImage,
  'culture-notes': cultureNotesImage,
} satisfies Record<string, ImageSourcePropType>;
