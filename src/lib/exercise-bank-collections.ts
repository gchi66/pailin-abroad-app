export type ExerciseBankCollectionDefinition = {
  slug: string;
  category: string | null;
  emoji: string;
  label: { en: string; th: string };
};

export const EXERCISE_BANK_COLLECTIONS: ExerciseBankCollectionDefinition[] = [
  {
    slug: 'featured',
    category: null,
    emoji: '✨',
    label: { en: 'Featured', th: 'หัวข้อแนะนำ' },
  },
  {
    slug: 'verbs-and-tenses',
    category: 'verbs_and_tenses',
    emoji: '🕘',
    label: { en: 'Verbs & Tenses', th: 'คำกริยาและกาล' },
  },
  {
    slug: 'nouns-and-articles',
    category: 'nouns_and_articles',
    emoji: '🕺',
    label: { en: 'Nouns & Articles', th: 'คำนามและคำนำหน้านาม' },
  },
  {
    slug: 'adjectives',
    category: 'adjectives',
    emoji: '🎨',
    label: { en: 'Adjectives', th: 'คำคุณศัพท์' },
  },
  {
    slug: 'pronouns',
    category: 'pronouns',
    emoji: '👤',
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
    label: { en: 'Other Topics', th: 'หัวข้ออื่นๆ' },
  },
];

export const getExerciseBankCollection = (slug: string) =>
  EXERCISE_BANK_COLLECTIONS.find((collection) => collection.slug === slug) ?? null;
