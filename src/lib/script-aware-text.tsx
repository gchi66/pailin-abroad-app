import React from 'react';

export type ScriptLanguage = 'en' | 'th';

const THAI_SCRIPT_PATTERN = /[\u0E00-\u0E7F]/;

export const getScriptLanguage = (value: string): ScriptLanguage => (THAI_SCRIPT_PATTERN.test(value) ? 'th' : 'en');

export const splitTextByScript = (value: string) => {
  const characters = Array.from(value);

  if (!characters.length) {
    return [] as { language: ScriptLanguage; text: string }[];
  }

  const segments: { language: ScriptLanguage; text: string }[] = [];
  let currentLanguage = getScriptLanguage(characters[0]);
  let currentText = characters[0];

  for (let index = 1; index < characters.length; index += 1) {
    const character = characters[index];
    const nextLanguage = getScriptLanguage(character);

    if (nextLanguage === currentLanguage) {
      currentText += character;
      continue;
    }

    segments.push({ language: currentLanguage, text: currentText });
    currentLanguage = nextLanguage;
    currentText = character;
  }

  segments.push({ language: currentLanguage, text: currentText });
  return segments;
};

export function containsThaiGlyphs(node: React.ReactNode): boolean {
  if (typeof node === 'string') {
    return THAI_SCRIPT_PATTERN.test(node);
  }

  if (typeof node === 'number' || typeof node === 'boolean' || node == null) {
    return false;
  }

  if (Array.isArray(node)) {
    return node.some((child) => containsThaiGlyphs(child));
  }

  if (React.isValidElement(node)) {
    return containsThaiGlyphs((node.props as { children?: React.ReactNode }).children);
  }

  return false;
}
