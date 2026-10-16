import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawPack, judgeFinish, memoryPackDue, neededHours, pastedCount, signalsLine, spares, tierFor, toPaste, type Tier } from './album';

test('tierFor segue as chances 1/7/22/70', () => {
  assert.equal(tierFor(0), 'lendaria');
  assert.equal(tierFor(0.0099), 'lendaria');
  assert.equal(tierFor(0.01), 'rara');
  assert.equal(tierFor(0.0799), 'rara');
  assert.equal(tierFor(0.08), 'incomum');
  assert.equal(tierFor(0.2999), 'incomum');
  assert.equal(tierFor(0.3), 'comum');
  assert.equal(tierFor(0.9999), 'comum');
});

const pool: { id: string; tier: Tier }[] = [
  { id: 'c1', tier: 'comum' }, { id: 'c2', tier: 'comum' }, { id: 'i1', tier: 'incomum' }, { id: 'r1', tier: 'rara' }, { id: 'l1', tier: 'lendaria' },
];
const seq = (...xs: number[]) => { let i = 0; return () => xs[i++ % xs.length]; };

test('pacote tem 5 figurinhas e marca repetidas, inclusive dentro do mesmo pacote', () => {
  const { contents } = drawPack(pool, { c1: 1 }, 0, seq(0.5, 0));
  assert.equal(contents.length, 5);
  assert.deepEqual(contents.map((c) => c.id), ['c1', 'c1', 'c1', 'c1', 'c1']);
  assert.ok(contents.every((c) => c.dup));
  const fresh = drawPack(pool, {}, 0, seq(0.5, 0)).contents;
  assert.deepEqual(fresh.map((c) => c.dup), [false, true, true, true, true]);
});

test('Rara garantida depois de 9 pacotes sem nenhuma', () => {
  const r = drawPack(pool, {}, 9, seq(0.5, 0));
  assert.equal(r.contents[4].tier, 'rara');
  assert.ok(r.rare);
  const no = drawPack(pool, {}, 8, seq(0.5, 0));
  assert.ok(!no.rare);
});

test('se uma raridade não tem figurinha, cai para outra', () => {
  const only = [{ id: 'c1', tier: 'comum' as Tier }];
  const r = drawPack(only, {}, 9, seq(0.005, 0));
  assert.ok(r.contents.every((c) => c.id === 'c1'));
  assert.throws(() => drawPack([], {}, 0), /catalog_empty/);
});

test('regras ao zerar: tempo, conta nova, semana, pontes e jogo que já contou', () => {
  assert.equal(neededHours(40), 20);
  assert.equal(neededHours(null), 24);
  assert.equal(judgeFinish({ counted: true, elapsedH: 100, ttbH: 10, bridgeMin: 0, accountDays: 90, weekPacks: 0 }), null);
  assert.equal(judgeFinish({ counted: false, elapsedH: 3, ttbH: 40, bridgeMin: 0, accountDays: 90, weekPacks: 0 })!.rule, 'tempo');
  assert.equal(judgeFinish({ counted: false, elapsedH: 3, ttbH: 40, bridgeMin: 900, accountDays: 90, weekPacks: 0 })!.state, 'fechado');
  assert.equal(judgeFinish({ counted: false, elapsedH: 30, ttbH: null, bridgeMin: 0, accountDays: 3, weekPacks: 1 })!.rule, 'conta_nova');
  assert.equal(judgeFinish({ counted: false, elapsedH: 30, ttbH: null, bridgeMin: 0, accountDays: 3, weekPacks: 0 })!.state, 'fechado');
  assert.equal(judgeFinish({ counted: false, elapsedH: 30, ttbH: 20, bridgeMin: 0, accountDays: 90, weekPacks: 2 })!.rule, 'semana');
});

test('pacote de memória a cada 10, até 3', () => {
  assert.ok(memoryPackDue(10, 0));
  assert.ok(!memoryPackDue(11, 1));
  assert.ok(memoryPackDue(30, 2));
  assert.ok(!memoryPackDue(40, 3));
  assert.ok(!memoryPackDue(0, 0));
});

test('colar e repetidas', () => {
  const items = { a: { qty: 2, pasted: true }, b: { qty: 1, pasted: false }, c: undefined };
  assert.deepEqual(toPaste(['a', 'b', 'c'], items), ['b']);
  assert.equal(pastedCount(['a', 'b', 'c'], items), 1);
  assert.equal(spares(items.a), 1);
  assert.equal(spares(items.b), 0);
});

test('sinais do pacote retido em português', () => {
  const l = signalsLine({ elapsedH: 3.25, needH: 20, ttbH: 40, bridgeMin: 90, accountDays: 1, weekPacks: 2 });
  assert.match(l, /zerou 3,3 h depois de começar \(o mínimo era 20 h; o jogo leva 40 h\)/);
  assert.match(l, /1,5 h registradas pelas pontes/);
  assert.match(l, /conta com 1 dia/);
});
