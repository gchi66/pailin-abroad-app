// Run with: node --test scripts/free-pathway.test.cjs
/* global __dirname */
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

const compiled = ts.transpileModule(
  readFileSync(join(__dirname, '../src/lib/free-pathway.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
);
const context = { exports: {} };
runInNewContext(compiled.outputText, context);
const { getFreePathwaySummary } = context.exports;
const row = (id, state) => ({ lesson: { id }, state });
const freeIds = new Set(['1.1', '2.1', '3.1']);

test('a new learner starts at the first free lesson with zero progress', () => {
  const rows = [row('1.1', 'available'), row('1.2', 'locked'), row('2.1', 'available')];
  const result = getFreePathwaySummary(rows, freeIds, null);
  assert.equal(result.nextLesson, rows[0]);
  assert.equal(result.completedCount, 0);
  assert.equal(result.totalCount, 2);
  assert.equal(result.isComplete, false);
});

test('finishing a level’s free lesson skips paid lessons to the next free lesson', () => {
  const rows = [row('1.1', 'completed'), row('1.2', 'locked'), row('2.1', 'available')];
  const result = getFreePathwaySummary(rows, freeIds, rows[1]);
  assert.equal(result.nextLesson, rows[2]);
  assert.equal(result.completedCount, 1);
  assert.equal(result.totalCount, 2);
});

test('an unfinished free lesson already opened remains the continuation', () => {
  const rows = [row('1.1', 'available'), row('2.1', 'available'), row('3.1', 'available')];
  assert.equal(getFreePathwaySummary(rows, freeIds, rows[1]).nextLesson, rows[1]);
});

test('earlier unfinished free lessons remain available after reaching the end', () => {
  const rows = [row('1.1', 'available'), row('2.1', 'completed'), row('2.2', 'locked')];
  const result = getFreePathwaySummary(rows, freeIds, rows[2]);
  assert.equal(result.nextLesson, rows[0]);
  assert.equal(result.isComplete, false);
});

test('finishing every free lesson produces the upgrade state', () => {
  const rows = [row('1.1', 'completed'), row('1.2', 'locked'), row('2.1', 'completed')];
  const result = getFreePathwaySummary(rows, freeIds, rows[1]);
  assert.equal(result.nextLesson, null);
  assert.equal(result.completedCount, result.totalCount);
  assert.equal(result.isComplete, true);
});

test('completed paid lessons do not inflate free-library progress', () => {
  const rows = [row('1.1', 'completed'), row('1.2', 'completed'), row('2.1', 'available')];
  const result = getFreePathwaySummary(rows, freeIds, rows[1]);
  assert.equal(result.completedCount, 1);
  assert.equal(result.totalCount, 2);
  assert.equal(result.nextLesson, rows[2]);
});

test('missing lesson data never claims the free course is complete', () => {
  const result = getFreePathwaySummary([], new Set(), null);
  assert.equal(result.isComplete, false);
  assert.equal(result.nextLesson, null);
  assert.equal(result.totalCount, 0);
});
