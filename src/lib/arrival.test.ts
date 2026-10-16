import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LAST, STEPS, canonOf, chapterIndex, chaptersLeft, daysUntil } from './arrival';

test('Chegada: capítulos acendem na ordem', () => {
  assert.equal(STEPS.length, 15);
  assert.equal(LAST, 14);
  assert.equal(chapterIndex(0), -1);
  assert.equal(chapterIndex(1), 0);
  assert.equal(chapterIndex(5), 1);
  assert.equal(chapterIndex(9), 2);
  assert.equal(chapterIndex(12), 4);
  assert.equal(chapterIndex(13), 5);
  assert.deepEqual(chaptersLeft(6).map((c) => c.key), ['jornada', 'jogos', 'comunidade', 'album']);
});

test('Chegada: plataformas viram nomes do IGDB e dias até o lançamento', () => {
  assert.deepEqual(canonOf(['PS5', 'PC · Steam', 'Epic', 'Game Pass', 'Neo Geo']), ['PlayStation 5', 'PC (Microsoft Windows)', 'Neo Geo']);
  const today = new Date(2026, 9, 16);
  assert.equal(daysUntil('2026-11-19', today), 34);
  assert.equal(daysUntil(null, today), null);
  assert.equal(daysUntil('2026', today), null);
});
