// Run with: node --test scripts/phrase-display-labels.test.cjs
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

const source = readFileSync(join(__dirname, '../src/lib/phrase-display-labels.ts'), 'utf8')
  .replace(/^import type .*;\n/m, '');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
});
const context = { exports: {} };
runInNewContext(compiled.outputText, context);
const { getPhraseDisplayLabels } = context.exports;

const audioNode = (text) => ({
  kind: 'list_item',
  audio_key: 'phrases_verbs_bail_on_1',
  audio_seq: 1,
  inlines: [{ text }],
});

test('uses the complete English lead-audio label', () => {
  const labels = getPhraseDisplayLabels({
    nodes: [audioNode('Bail on [someone / something] [audio:phrases_verbs_bail_on_1]')],
    language: 'en',
    storedPhrase: 'BAIL ON',
    storedPhraseTh: '',
  });

  assert.equal(labels.phrase, 'Bail on [someone / something]');
  assert.equal(labels.phraseTh, '');
});

test('splits the Thai lead-audio label into its English and Thai display lines', () => {
  const labels = getPhraseDisplayLabels({
    nodes: [audioNode('Bail on เทนัดกับใคร, ยกเลิก[audio:phrases_verbs_bail_on_1]')],
    language: 'th',
    storedPhrase: 'BAIL ON',
    storedPhraseTh: 'เทนัด',
  });

  assert.equal(labels.phrase, 'Bail on');
  assert.equal(labels.phraseTh, 'เทนัดกับใคร, ยกเลิก');
});

test('does not split an English label at a Thai usage placeholder', () => {
  const labels = getPhraseDisplayLabels({
    nodes: [audioNode('[อวัยวะของร่างกาย] is killing me เจ็บมากๆ ปวดมากๆ [audio:phrases_verbs_killing_me_1]')],
    language: 'th',
    storedPhrase: '[BODY PART] IS KILLING ME',
    storedPhraseTh: 'เจ็บมากๆ ปวดมากๆ',
  });

  assert.equal(labels.phrase, '[อวัยวะของร่างกาย] is killing me');
  assert.equal(labels.phraseTh, 'เจ็บมากๆ ปวดมากๆ');
});

test('falls back to stored labels when there is no lead audio node', () => {
  const labels = getPhraseDisplayLabels({
    nodes: [{ kind: 'paragraph', inlines: [{ text: 'Definition only' }] }],
    language: 'th',
    storedPhrase: 'LOOK',
    storedPhraseTh: 'ฟังนะ',
  });

  assert.equal(labels.phrase, 'LOOK');
  assert.equal(labels.phraseTh, 'ฟังนะ');
});
