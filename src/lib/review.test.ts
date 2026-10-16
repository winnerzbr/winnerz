import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewItems, quarterKey, quarterLabel, reviewDue, draftSummary } from './review';

const g = (id: string, more: any = {}) => ({ id, slug: id, title: id, cover: '', platforms: [], ...more });
const now = Date.parse('2026-10-15T12:00:00-03:00');
const st: any = {
  prefs: {},
  games: { a: g('a'), b: g('b'), c: g('c'), d: g('d'), e: g('e'), w1: g('w1', { releasedOn: '2024-05-01' }), w2: g('w2', { releasedOn: '2026-08-01' }), f: g('f') },
  journeys: [{ id: 'ja', gameId: 'a' }, { id: 'jb', gameId: 'b' }, { id: 'jc', gameId: 'c' }, { id: 'jf', gameId: 'f' }],
  histories: [
    { id: 'ha', journeyId: 'ja', ordinal: 1, state: 'ativa', startedAt: '2026-01-01T12:00:00-03:00' },
    { id: 'hb', journeyId: 'jb', ordinal: 1, state: 'pausada', startedAt: '2026-08-01T12:00:00-03:00' },
    { id: 'hc', journeyId: 'jc', ordinal: 1, state: 'ativa', startedAt: '2026-01-01T12:00:00-03:00' },
    { id: 'hf', journeyId: 'jf', ordinal: 1, state: 'concluida', startedAt: '2025-01-01T12:00:00-03:00' },
  ],
  sessions: [
    { id: 's1', journeyId: 'ja', historyId: 'ha', startedAt: '2026-06-01T20:00:00-03:00', endedAt: '2026-06-01T21:00:00-03:00', whereStopped: 'ponte' },
    { id: 's2', journeyId: 'jc', historyId: 'hc', startedAt: '2026-10-01T20:00:00-03:00', endedAt: '2026-10-01T21:00:00-03:00' },
  ],
  copies: [
    { id: 'cd', gameId: 'd', purchasedOn: '2023-02-01' },
    { id: 'ce', gameId: 'e', createdAt: '2025-03-01T10:00:00Z' },
    { id: 'ca', gameId: 'a' },
  ],
  myGames: { e: { gameId: 'e', notNowUntil: '2026-12-01' } },
  wishes: [{ gameId: 'w1' }, { gameId: 'w2' }],
  loans: [],
};

test('revisão: paradas, estante e desejos antigos, sem o que não cabe', () => {
  const items = reviewItems(st, now);
  assert.deepEqual(items.map((i) => i.key), ['parada:ha', 'estante:d', 'desejo:w1']);
  assert.equal(items[0].whereStopped, 'ponte');
  assert.equal(items[1].since, '2023-02-01');
  // Pausada há 75 dias ainda não entra; com mais de 90, entra.
  const st2 = { ...st, histories: st.histories.map((h: any) => (h.id === 'hb' ? { ...h, startedAt: '2026-05-01T12:00:00-03:00' } : h)) };
  assert.ok(reviewItems(st2, now).some((i) => i.key === 'parada:hb'));
});

test('trimestre e resumo', () => {
  assert.equal(quarterKey('2026-10-15T12:00:00-03:00'), '2026-T4');
  assert.equal(quarterKey('2026-01-01T01:00:00Z'), '2025-T4');
  assert.equal(quarterLabel('2026-T2'), 'abril a junho de 2026');
  assert.equal(reviewDue(st, '2026-10-15T12:00:00-03:00'), true);
  assert.equal(reviewDue({ ...st, prefs: { review: { quarter: '2026-T4', at: '', how: 'feita' } } }, '2026-10-15T12:00:00-03:00'), false);
  const items = reviewItems(st, now);
  const sm = draftSummary(items, { 'parada:ha': 'encerrar', 'estante:d': 'alta' });
  assert.deepEqual([sm.continua.length, sm.deixou.length, sm.depois.length], [1, 1, 0]);
});
