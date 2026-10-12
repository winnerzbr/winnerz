import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, formatScore, average, originalLabel, starFill } from './rating.ts';

test('normaliza nas duas escalas', () => {
  assert.equal(normalize(8.5, 'TEN_POINT').normalized, 850);
  assert.equal(normalize(4.5, 'FIVE_STAR').normalized, 900);
  assert.equal(normalize(0, 'FIVE_STAR').normalized, 0);
  assert.equal(normalize(10, 'TEN_POINT').normalized, 1000);
});

test('recusa valores fora da grade', () => {
  assert.throws(() => normalize(8.3, 'TEN_POINT'));
  assert.throws(() => normalize(5.5, 'FIVE_STAR'));
  assert.throws(() => normalize(-1, 'TEN_POINT'));
});

test('conversão de exibição não arredonda a opinião', () => {
  assert.equal(formatScore(850, 'FIVE_STAR'), '4,25');
  assert.equal(formatScore(750, 'FIVE_STAR'), '3,75');
  assert.equal(formatScore(900, 'TEN_POINT'), '9,0');
  assert.equal(formatScore(900, 'FIVE_STAR'), '4,5');
  assert.equal(formatScore(950, 'FIVE_STAR'), '4,75');
});

test('médias usam valores normalizados e uma casa decimal', () => {
  const m = average([850, 900, 900])!;
  assert.equal(formatScore(m, 'TEN_POINT', { average: true }), '8,8');
  assert.equal(formatScore(m, 'FIVE_STAR', { average: true }), '4,4');
  assert.equal(average([]), null);
});

test('rótulo da nota original e preenchimento', () => {
  assert.equal(originalLabel(normalize(8.5, 'TEN_POINT'), 'FIVE_STAR'), 'Nota original: 8,5/10');
  assert.equal(originalLabel(normalize(8.5, 'TEN_POINT'), 'TEN_POINT'), null);
  assert.equal(starFill(850), 85);
});
