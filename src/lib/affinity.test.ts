import { test } from 'node:test';
import assert from 'node:assert/strict';
import { affinity, type GameRef } from './affinity';

const g = (slug: string): GameRef => ({ slug, title: slug.toUpperCase(), cover: null });
const empty = { done: [], shelf: [], playing: [], wishes: [] };

test('pouca coisa em comum: só os jogos, sem número', () => {
  const a = affinity({ mine: { ...empty, done: [g('a')] }, theirs: { done: [g('a'), g('b'), g('c')], shelf: [], playing: [], loved: [] } });
  assert.deepEqual(a.common.map((x) => x.slug), ['a']);
  assert.equal('score' in a, false);
});

test('cruza zerados, jogando agora, desejos e os jogos que marcaram', () => {
  const a = affinity({
    mine: { done: [g('a'), g('b')], shelf: [g('c'), g('d')], playing: [g('e')], wishes: [g('z')] },
    theirs: { done: [g('a'), g('z')], shelf: [g('c'), g('x')], playing: [g('e')], loved: [g('a')] },
  });
  assert.deepEqual(a.common.map((x) => x.slug), ['a', 'e', 'c']);
  assert.deepEqual(a.bothDone.map((x) => x.slug), ['a']);
  assert.deepEqual(a.playingSame.map((x) => x.slug), ['e']);
  assert.deepEqual(a.tips.map((x) => x.slug), ['z']);
  assert.deepEqual(a.lovedCommon.map((x) => x.slug), ['a']);
});
