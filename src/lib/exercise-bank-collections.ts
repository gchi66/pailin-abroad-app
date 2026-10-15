import type { ImageSourcePropType } from 'react-native';

import adjectivesImage from '@/assets/images/exercise-bank/exercise-bank-adjectives.webp';
import featuredImage from '@/assets/images/exercise-bank/exercise-bank-featured.webp';
import nounsArticlesImage from '@/assets/images/exercise-bank/exercise-bank-nouns-articles.webp';
import otherImage from '@/assets/images/exercise-bank/exercise-bank-other.webp';
import pronounsImage from '@/assets/images/exercise-bank/exercise-bank-pronouns.webp';
import verbsTensesImage from '@/assets/images/exercise-bank/exercise-bank-verbs-tenses.webp';

export type ExerciseBankCollectionDefinition = {
  slug: string;
  category: string | null;
  emoji: string;
  image?: ImageSourcePropType;
  label: { en: string; th: string };
};

export const EXERCISE_BANK_COLLECTIONS: ExerciseBankCollectionDefinition[] = [
  {
    slug: 'featured',
    category: null,
    emoji: '✨',
    image: featuredImage,
    label: { en: 'Featured', th: 'หัวข้อแนะนำ' },
  },
  {
    slug: 'verbs-and-tenses',
    category: 'verbs_and_tenses',
    emoji: '🕘',
    image: verbsTensesImage,
    label: { en: 'Verbs & Tenses', th: 'คำกริยาและกาล' },
  },
  {
    slug: 'nouns-and-articles',
    category: 'nouns_and_articles',
    emoji: '🕺',
    image: nounsArticlesImage,
    label: { en: 'Nouns & Articles', th: 'คำนามและคำนำหน้านาม' },
  },
  {
    slug: 'adjectives',
    category: 'adjectives',
    emoji: '🎨',
    image: adjectivesImage,
    label: { en: 'Adjectives', th: 'คำคุณศัพท์' },
  },
  {
    slug: 'pronouns',
    category: 'pronouns',
    emoji: '👤',
    image: pronounsImage,
    label: { en: 'Pronouns', th: 'คำสรรพนาม' },
  },
  {
    slug: 'conjunctions',
    category: 'conjunctions',
    emoji: '🔗',
    label: { en: 'Conjunctions', th: 'คำเชื่อม' },
  },
  {
    slug: 'prepositions',
    category: 'prepositions',
    emoji: '📍',
    label: { en: 'Prepositions', th: 'คำบุพบท' },
  },
  {
    slug: 'other-concepts',
    category: 'other_concepts',
    emoji: '＋',
    image: otherImage,
    label: { en: 'Other Topics', th: 'หัวข้ออื่นๆ' },
  },
];

export const getExerciseBankCollection = (slug: string) =>
  EXERCISE_BANK_COLLECTIONS.find((collection) => collection.slug === slug) ?? null;
