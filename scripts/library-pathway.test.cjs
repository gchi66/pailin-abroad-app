/* global __dirname */
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');
const context = { exports: {} };
runInNewContext(ts.transpileModule(readFileSync(join(__dirname, '../src/lib/library-pathway.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, context);
const { lessonMarker, matchesLessonSearch, freeLibraryIds, shortLessonFocus } = context.exports;
const lesson = { id: 'lesson', level: 5, lesson_order: 3, stage: 'Intermediate', title: 'Mom and Dad miss you', title_th: 'พ่อกับแม่คิดถึงคุณ', focus: 'How to use object pronouns', focus_th: 'สรรพนามที่เป็นกรรม' };

test('selected always has the blue marker, including previously started or completed lessons', () => {
  assert.equal(lessonMarker(true, { is_completed: true, percent_complete: 100 }).kind, 'selected');
  assert.equal(lessonMarker(true, { has_started: true, percent_complete: 30 }).kind, 'selected');
});
test('untouched, partial, and completed lessons have distinct markers', () => {
  assert.equal(lessonMarker(false).kind, 'empty');
  assert.equal(lessonMarker(false, { percent_complete: 0 }).kind, 'empty');
  assert.equal(lessonMarker(false, { percent_complete: 27 }).percent, 27);
  assert.equal(lessonMarker(false, { is_completed: true, percent_complete: 100 }).kind, 'complete');
});
test('percentage rounding never shows a completion value before the lesson is completed', () => {
  assert.equal(lessonMarker(false, { percent_complete: 99.8 }).percent, 99);
  assert.equal(lessonMarker(false, { percent_complete: 0.1 }).percent, 1);
});
test('search matches English, Thai, numbers, and topic labels independently of UI language', () => {
  for (const query of ['MOM dad', 'คิดถึง', '5.3', 'object pronouns', 'สรรพนาม']) assert.equal(matchesLessonSearch(lesson, query), true, query);
  assert.equal(matchesLessonSearch(lesson, 'bank account'), false);
});
test('unknown short labels fall back to the existing localized focus', () => {
  assert.equal(shortLessonFocus({ ...lesson, level: 99 }, 'th'), lesson.focus_th);
});
test('the free library uses the first lesson of each stage and level, independent of input order', () => {
  const rows = [{ ...lesson, id: 'second', lesson_order: 2 }, { ...lesson, id: 'first', lesson_order: 1 }, { ...lesson, id: 'other-stage', stage: 'Beginner', lesson_order: 1 }];
  const ids = freeLibraryIds(rows);
  assert.equal(ids.size, 2);
  assert.equal(ids.has('first'), true);
  assert.equal(ids.has('other-stage'), true);
  assert.equal(ids.has('second'), false);
});
