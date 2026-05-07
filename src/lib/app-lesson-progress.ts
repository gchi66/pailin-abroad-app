import {
  LessonRichInline,
  LessonRichNode,
  ResolvedLessonSection,
} from '@/src/types/lesson';

export const APP_PROGRESS_PREFIX = 'app:';

export type AppLessonProgressUnitType = 'page' | 'card' | 'exercise' | 'example_reveal';

export type AppLessonExpectedUnit = {
  unit_type: AppLessonProgressUnitType;
  unit_key: string;
  parent_unit_key: string | null;
  section_key: string | null;
  sort_order: number;
  label: string;
};

export type AppLessonProgressResume = {
  unit_type: 'page' | 'card';
  unit_key: string;
} | null;

const CARD_SECTION_TYPES = new Set(['understand', 'extra_tip', 'common_mistake', 'culture_note']);

const cleanText = (value: unknown) => (value == null ? '' : String(value).trim());

const slugify = (value: string) => {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'card';
};

const getInlineText = (inline: LessonRichInline | null | undefined) => {
  if (!inline) {
    return '';
  }

  if (typeof inline.text === 'string') {
    return inline.text;
  }

  if (inline.text && typeof inline.text === 'object') {
    const localizedText = inline.text as { en?: string | null; th?: string | null };
    return cleanText(localizedText.en || localizedText.th);
  }

  return '';
};

const getNodeText = (node: LessonRichNode) => {
  if (!node || typeof node !== 'object') {
    return '';
  }

  const rawNode = node as Record<string, unknown>;

  if (node.text && typeof node.text === 'object') {
    const text = cleanText(node.text.en || node.text.th);
    if (text) {
      return text;
    }
  } else if (typeof node.text === 'string') {
    const text = cleanText(node.text);
    if (text) {
      return text;
    }
  }

  for (const field of ['header_en', 'header', 'title', 'prompt', 'prompt_en'] as const) {
    const text = cleanText(rawNode[field]);
    if (text) {
      return text;
    }
  }

  if (Array.isArray(node.inlines)) {
    return cleanText(node.inlines.map((inline) => getInlineText(inline)).join(''));
  }

  return '';
};

const isAllCapsHeadingNode = (node: LessonRichNode) => {
  if (node.kind !== 'heading') {
    return false;
  }

  const text = getNodeText(node);
  if (!text) {
    return false;
  }

  const letters = text.replace(/[^A-Za-z]+/g, '');
  if (!letters) {
    return false;
  }

  return letters === letters.toUpperCase();
};

const isQuickPracticeHeading = (text: string) => {
  const normalized = cleanText(text).toLowerCase();
  return normalized.includes('quick practice') || text.includes('แบบฝึกหัด') || text.includes('ฝึกหัด');
};

export const buildAppPageKey = (pageName: string) => `${APP_PROGRESS_PREFIX}page:${pageName}`;

export const buildAppCardKey = (sectionType: string, cardSlug: string) =>
  `${APP_PROGRESS_PREFIX}card:${sectionType}:${cardSlug}`;

export const buildAppExerciseKey = (exerciseId: string) => `${APP_PROGRESS_PREFIX}exercise:${exerciseId}`;

export const buildAppComprehensionExerciseKey = () => `${APP_PROGRESS_PREFIX}exercise:comprehension_quiz`;

export const buildAppExampleRevealKey = (name = 'apply') => `${APP_PROGRESS_PREFIX}example_reveal:${name}`;

export const isAppCardSectionType = (sectionType: string | null | undefined) =>
  typeof sectionType === 'string' && CARD_SECTION_TYPES.has(sectionType);

export const parseAppCardKey = (unitKey: string) => {
  const match = /^app:card:([^:]+):(.+)$/.exec(unitKey);
  if (!match) {
    return null;
  }

  return {
    sectionType: match[1] ?? null,
    slug: match[2] ?? null,
  };
};

export const buildAppCardUnitsForSection = (
  sectionType: string,
  section: ResolvedLessonSection | null
): AppLessonExpectedUnit[] => {
  if (!section || !isAppCardSectionType(sectionType)) {
    return [];
  }

  const nodes = Array.isArray(section.content_jsonb) ? section.content_jsonb : [];
  const pageKey = buildAppPageKey(sectionType);
  const seenSlugs = new Map<string, number>();
  const units: AppLessonExpectedUnit[] = [];

  nodes.forEach((node) => {
    if (!isAllCapsHeadingNode(node)) {
      return;
    }

    const headingText = getNodeText(node);
    if (!headingText || isQuickPracticeHeading(headingText)) {
      return;
    }

    const baseSlug = slugify(headingText);
    const seenCount = (seenSlugs.get(baseSlug) ?? 0) + 1;
    seenSlugs.set(baseSlug, seenCount);
    const slug = seenCount > 1 ? `${baseSlug}-${seenCount}` : baseSlug;

    units.push({
      unit_type: 'card',
      unit_key: buildAppCardKey(sectionType, slug),
      parent_unit_key: pageKey,
      section_key: pageKey,
      sort_order: units.length + 1,
      label: headingText,
    });
  });

  return units;
};
