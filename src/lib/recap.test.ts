import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recapFor, wantsRecap, awayLabel } from './recap';

const now = Date.parse('2026-10-12T12:00:00Z');
const base: any = {
  journeys: [{ id: 'j', gameId: 'g', mood: 'jogando' }],
  histories: [{ id: 'h', journeyId: 'j', ordinal: 1, title: 'Primeira vez', state: 'ativa', startedAt: '2026-09-01T00:00:00Z' }],
  sessions: [
    { id: 's1', journeyId: 'j', historyId: 'h', startedAt: '2026-09-20T20:00:00Z', endedAt: '2026-09-20T22:00:00Z', note: 'antigo' },
    { id: 's2', journeyId: 'j', historyId: 'h', startedAt: '2026-10-01T20:00:00Z', endedAt: '2026-10-01T22:00:00Z', note: 'pegar a chave', whereStopped: 'teatro' },
  ],
  events: [
    { id: 'p1', journeyId: 'j', historyId: 'h', kind: 'ponto', at: '2026-10-01T21:00:00Z', title: 'Cofre' },
    { id: 'p2', journeyId: 'j', historyId: 'h', kind: 'ponto', at: '2026-09-20T21:00:00Z', title: 'Velho', resolved: true },
    { id: 'm1', journeyId: 'j', historyId: 'h', kind: 'momento', at: '2026-10-01T21:30:00Z', title: 'Vista' },
  ],
};

test('junta o que você registrou: último recado, pontos abertos e momentos', () => {
  const r = recapFor(base, 'j', now)!;
  assert.equal(r.last?.note, 'pegar a chave');
  assert.equal(r.last?.whereStopped, 'teatro');
  assert.deepEqual(r.points.map((p) => p.id), ['p1']);
  assert.deepEqual(r.moments.map((p) => p.id), ['m1']);
  assert.equal(r.daysAway, 10);
  assert.equal(wantsRecap(r), true);
});

test('voltou ontem: só o recado, sem resumo completo', () => {
  const r = recapFor(base, 'j', Date.parse('2026-10-02T12:00:00Z'))!;
  assert.equal(wantsRecap(r), false);
});

test('sem nada registrado, não há resumo', () => {
  const r = recapFor({ ...base, sessions: [], events: [] }, 'j', now)!;
  assert.equal(r.any, false);
  assert.equal(wantsRecap(r), false);
});

test('rótulo de tempo longe', () => {
  assert.equal(awayLabel(10), 'há 10 dias');
  assert.equal(awayLabel(30), 'há 4 semanas');
  assert.equal(awayLabel(400), 'há mais de um ano');
});
