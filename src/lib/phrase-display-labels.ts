import type { LessonRichInline, LessonRichNode } from '@/src/types/lesson';

type PhraseDisplayLanguage = 'en' | 'th';

type PhraseDisplayLabels = {
  phrase: string;
  phraseTh: string;
};

const AUDIO_TAG_RE = /\[audio:[^\]]+\]/gi;
const THAI_CHARACTER_RE = /[\u0E00-\u0E7F]/;

const getInlineText = (inline: LessonRichInline, language: PhraseDisplayLanguage) => {
  if (typeof inline.text === 'string') {
    return inline.text;
  }

  if (inline.text && typeof inline.text === 'object') {
    const text = inline.text as { en?: string | null; th?: string | null };
    return String(language === 'th' ? text.th ?? text.en ?? '' : text.en ?? text.th ?? '');
  }

  return '';
};

const getNodeText = (node: LessonRichNode, language: PhraseDisplayLanguage) => {
  if (Array.isArray(node.inlines)) {
    const inlineText = node.inlines.map((inline) => getInlineText(inline, language)).join('');
    if (inlineText.trim()) {
      return inlineText;
    }
  }

  if (typeof node.text === 'string') {
    return node.text;
  }

  if (node.text && typeof node.text === 'object') {
    return String(language === 'th' ? node.text.th ?? node.text.en ?? '' : node.text.en ?? node.text.th ?? '');
  }

  return language === 'th' ? String(node.text_th ?? '') : '';
};

const cleanLeadAudioText = (text: string) =>
  text
    .replace(AUDIO_TAG_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const findLeadAudioText = (nodes: LessonRichNode[], language: PhraseDisplayLanguage) => {
  const leadNode = nodes.find((node) => {
    const text = getNodeText(node, language);
    return Boolean(node.audio_key || node.audio_seq != null || /\[audio:/i.test(text));
  });

  return leadNode ? cleanLeadAudioText(getNodeText(leadNode, language)) : '';
};

const findThaiLabelStart = (leadText: string, storedPhraseTh: string) => {
  if (storedPhraseTh) {
    const storedTranslationIndex = leadText.indexOf(storedPhraseTh);
    if (storedTranslationIndex > 0) {
      return storedTranslationIndex;
    }
  }

  const firstThaiIndex = leadText.search(THAI_CHARACTER_RE);
  return firstThaiIndex > 0 ? firstThaiIndex : -1;
};

/**
 * Phrases use the all-caps document heading as their stable database identity,
 * while the first audio line contains the learner-facing label. Keep those
 * responsibilities separate so imports remain stable and cards match the doc.
 */
export const getPhraseDisplayLabels = ({
  nodes,
  language,
  storedPhrase,
  storedPhraseTh,
}: {
  nodes: LessonRichNode[];
  language: PhraseDisplayLanguage;
  storedPhrase: string;
  storedPhraseTh: string;
}): PhraseDisplayLabels => {
  const leadText = findLeadAudioText(nodes, language);
  if (!leadText) {
    return { phrase: storedPhrase, phraseTh: storedPhraseTh };
  }

  if (language === 'en') {
    return { phrase: leadText, phraseTh: '' };
  }

  const thaiLabelStart = findThaiLabelStart(leadText, storedPhraseTh);
  if (thaiLabelStart < 0) {
    return { phrase: storedPhrase, phraseTh: storedPhraseTh };
  }

  return {
    phrase: leadText.slice(0, thaiLabelStart).trim() || storedPhrase,
    phraseTh: leadText.slice(thaiLabelStart).trim() || storedPhraseTh,
  };
};
