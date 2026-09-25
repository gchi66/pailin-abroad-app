import type { ImageSourcePropType } from 'react-native';

import commonMistakesImage from '@/assets/images/resources-more/resources-common-mistakes.webp';
import conversationsImage from '@/assets/images/resources-more/resources-conversation-library.webp';
import cultureNotesImage from '@/assets/images/resources-more/resources-culture-note-library.webp';
import exerciseBankImage from '@/assets/images/resources-more/resources-exercise-bank.webp';
import phrasesVerbsImage from '@/assets/images/resources-more/resources-phrases-verbs.webp';
import pronunciationImage from '@/assets/images/resources-more/resources-speaking-practice.webp';
import topicLibraryImage from '@/assets/images/resources-more/resources-topic-library.webp';

export const resourceCardImages = {
  'exercise-bank': exerciseBankImage,
  'topic-library': topicLibraryImage,
  'common-mistakes': commonMistakesImage,
  'phrases-verbs': phrasesVerbsImage,
  conversations: conversationsImage,
  pronunciation: pronunciationImage,
  'culture-notes': cultureNotesImage,
} satisfies Record<string, ImageSourcePropType>;
