import { test } from 'node:test';
import assert from 'node:assert/strict';
import { affinity, affinityLabel, type GameRef } from './affinity';

const g = (slug: string): GameRef => ({ slug, title: slug.toUpperCase(), cover: null });
const empty = { done: [], shelf: [], playing: [], wishes: [] };

test('pouca coisa para comparar: sem número, só os jogos em comum', () => {
  const a = affinity({ mine: { ...empty, done: [g('a')] }, theirs: { done: [g('a'), g('b'), g('c')], shelf: [], playing: [], loved: [] } });
  assert.equal(a.score, null);
  assert.equal(a.label, 'Alguma coisa em comum');
  assert.deepEqual(a.common.map((x) => x.slug), ['a']);
});

test('conta em comum, pesa os jogos que marcaram e não passa de 100', () => {
  const a = affinity({
    mine: { done: [g('a'), g('b')], shelf: [g('c'), g('d')], playing: [g('e')], wishes: [g('z')] },
    theirs: { done: [g('a'), g('z')], shelf: [g('c'), g('x')], playing: [g('e')], loved: [g('a')] },
  });
  // mine = 5 jogos, theirs = 5 (a, z, c, x, e); em comum a, c, e = 3, +1 por "a" ser dos que marcaram
  assert.equal(a.score, 80);
  assert.equal(a.label, 'Muito em comum');
  assert.deepEqual(a.bothDone.map((x) => x.slug), ['a']);
  assert.deepEqual(a.playingSame.map((x) => x.slug), ['e']);
  assert.deepEqual(a.tips.map((x) => x.slug), ['z']);
  assert.deepEqual(a.lovedCommon.map((x) => x.slug), ['a']);
});

test('rótulos', () => {
  assert.equal(affinityLabel(30, 3), 'Bastante em comum');
  assert.equal(affinityLabel(12, 1), 'Um pouco em comum');
  assert.equal(affinityLabel(0, 0), 'Gostos diferentes, por enquanto');
  assert.equal(affinityLabel(null, 0), '');
});
