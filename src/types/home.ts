export type UiLanguage = 'en' | 'th';

export type LocalizedText = {
  en: string;
  th: string;
};

export type HeroData = {
  title: LocalizedText;
  subtitle: LocalizedText;
  cta: LocalizedText;
};

export type FreeLessonCard = {
  id: string;
  level: LocalizedText;
  title: LocalizedText;
  focusLabel: LocalizedText;
  description: LocalizedText;
  comingSoon?: boolean;
};

export type FreeLessonsData = {
  headerTitleFirst: LocalizedText;
  headerTitleSecond: LocalizedText;
  headerSubtitle: LocalizedText;
  cards: FreeLessonCard[];
};

export type SignUpCTAData = {
  titleParts: {
    beforeEm: LocalizedText;
    emphasis: LocalizedText;
    afterEm: LocalizedText;
  };
  cta: LocalizedText;
};

export type ChooseUsData = {
  title: LocalizedText;
  reasons: { text: LocalizedText }[];
};

export type HowItWorksData = {
  title: LocalizedText;
  steps: {
    number: string;
    header: LocalizedText;
    text: LocalizedText;
  }[];
};

export type CharacterEntry = {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
};

export type CharactersData = {
  title: LocalizedText;
  entries: CharacterEntry[];
};

export type TakeTheLeapData = {
  title: LocalizedText;
  cta: LocalizedText;
};

export type FAQItem = {
  id: number;
  question: LocalizedText;
  answer: LocalizedText;
};

export type FAQData = {
  title: LocalizedText;
  items: FAQItem[];
};

export type HomeData = {
  hero: HeroData;
  freeLessons: FreeLessonsData;
  signUpCTA: SignUpCTAData;
  chooseUs: ChooseUsData;
  howItWorks: HowItWorksData;
  characters: CharactersData;
  takeTheLeap: TakeTheLeapData;
  faq: FAQData;
};
