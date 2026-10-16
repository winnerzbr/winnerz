import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawPack, judgeFinish, memoryPackDue, neededHours, pastedCount, signalsLine, spares, tierFor, toPaste, personalStickers, tradeBalance, tradeableTier, tradeSuggest, vaultCheck, vaultSuggest, type Tier } from './album';

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

test('Cofre: confere a troca como o banco', () => {
  const items = { a: { qty: 3, pasted: true }, b: { qty: 2, pasted: false }, c: { qty: 1, pasted: true }, x: { qty: 1, pasted: false } };
  const comum = { id: 't', tier: 'comum' as Tier };
  assert.equal(vaultCheck(comum, [{ id: 'a', n: 2 }, { id: 'b', n: 1 }], items), null);
  assert.equal(vaultCheck(comum, [{ id: 'a', n: 1 }, { id: 'a', n: 1 }, { id: 'b', n: 1 }], items), null);
  assert.equal(vaultCheck(comum, [{ id: 'a', n: 3 }], items), 'vault_not_spare');
  assert.equal(vaultCheck(comum, [{ id: 'c', n: 1 }, { id: 'a', n: 2 }], items), 'vault_not_spare');
  assert.equal(vaultCheck(comum, [{ id: 'a', n: 2 }], items), 'vault_count');
  assert.equal(vaultCheck(comum, [{ id: 'a', n: 0 }], items), 'vault_give');
  assert.equal(vaultCheck({ id: 'x', tier: 'comum' }, [{ id: 'a', n: 2 }, { id: 'b', n: 1 }], items), 'vault_owned');
  assert.equal(vaultCheck({ id: 't', tier: 'rara' }, [], items), 'vault_tier');
  assert.equal(vaultCheck({ id: 't', tier: 'incomum' }, [{ id: 'a', n: 2 }, { id: 'b', n: 1 }], items), 'vault_count');
});

test('Cofre: sugestão usa as mais comuns e nunca a última cópia', () => {
  const pool = [{ id: 'r', tier: 'rara' as Tier, number: 1 }, { id: 'c1', tier: 'comum' as Tier, number: 2 }, { id: 'c2', tier: 'comum' as Tier, number: 3 }, { id: 'i', tier: 'incomum' as Tier, number: 4 }];
  const items = { r: { qty: 5, pasted: true }, c1: { qty: 2, pasted: true }, c2: { qty: 4, pasted: false }, i: { qty: 3, pasted: true } };
  assert.deepEqual(vaultSuggest(3, pool, items), [{ id: 'c2', n: 3 }]);
  assert.deepEqual(vaultSuggest(5, pool, items), [{ id: 'c2', n: 3 }, { id: 'c1', n: 1 }, { id: 'i', n: 1 }]);
  const all = vaultSuggest(20, pool, items);
  assert.equal(all.reduce((t, g) => t + g.n, 0), 10);
  assert.equal(vaultCheck({ id: 'z', tier: 'incomum' }, all, items), null);
});

test('Minhas páginas: uma por história zerada, com a última foto', () => {
  const games = { g1: { id: 'g1', slug: 'a', title: 'Astro', cover: 'c1.jpg', backdrop: 'b1.jpg' }, g2: { id: 'g2', slug: 'b', title: 'Brisa', cover: 'c2.jpg' } };
  const journeys = [{ id: 'j1', gameId: 'g1' }, { id: 'j2', gameId: 'g2' }, { id: 'j3', gameId: 'gx' }];
  const histories = [
    { id: 'h1', journeyId: 'j1', state: 'concluida', completedAt: '2026-05-02T12:00:00Z' },
    { id: 'h2', journeyId: 'j2', state: 'concluida', completedAt: '2026-01-02T12:00:00Z' },
    { id: 'h3', journeyId: 'j1', state: 'ativa' },
    { id: 'h4', journeyId: 'j3', state: 'concluida', completedAt: '2026-01-01T12:00:00Z' },
  ];
  const events = [{ historyId: 'h1', at: '2026-04-01', image: 'old.jpg' }, { historyId: 'h1', at: '2026-05-01', image: 'new.jpg' }, { historyId: 'h1', at: '2026-05-02' }];
  const r = personalStickers(histories, journeys, games, events, (iso) => iso ?? 'sem data');
  assert.deepEqual(r.map((p) => [p.title, p.image]), [['Brisa', 'c2.jpg'], ['Astro', 'new.jpg']]);
  const r2 = personalStickers(histories, journeys, games, [], (iso) => iso ?? '');
  assert.equal(r2[1].image, 'b1.jpg');
});

test('Trocas: sugestão equilibrada e peso dos lados', () => {
  const s = (id: string, tier: Tier, number: number) => ({ id, tier, number });
  const give = [s('a', 'comum', 1), s('b', 'incomum', 2), s('c', 'comum', 3), s('d', 'rara', 4)];
  const take = [s('x', 'comum', 5), s('y', 'rara', 6)];
  const r = tradeSuggest(give, take);
  assert.deepEqual(r.take.map((t) => t.id), ['y', 'x']);
  assert.deepEqual(r.give.map((t) => t.id), ['d', 'a']);
  assert.equal(tradeBalance(r.give, r.take), 'igual');
  assert.equal(tradeBalance([s('a', 'comum', 1)], [s('y', 'rara', 6)]), 'voce_recebe_mais');
  const many = Array.from({ length: 8 }, (_, i) => s(`g${i}`, 'comum', i));
  assert.equal(tradeSuggest(many, many).give.length, 5);
  assert.equal(tradeableTier('lendaria'), false);
});
