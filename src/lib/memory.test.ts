import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weekSummary, anniversaries, rhythm, globalTimeline } from './memory';

const now = Date.parse('2026-10-12T15:00:00Z');
const g = (id: string) => ({ id, slug: id, title: id.toUpperCase(), cover: 'c', platforms: [] });
const s: any = {
  games: { a: g('a'), b: g('b') },
  journeys: [{ id: 'ja', gameId: 'a', mood: 'jogando' }, { id: 'jb', gameId: 'b', mood: 'jogando' }],
  histories: [
    { id: 'ha', journeyId: 'ja', ordinal: 1, title: 'Primeira vez', state: 'concluida', startedAt: '2025-09-01T15:00:00Z', startedPrecision: 'dia', completedAt: '2025-10-11T15:00:00Z', completedPrecision: 'dia' },
    { id: 'hb', journeyId: 'jb', ordinal: 1, title: 'Primeira vez', state: 'ativa', startedAt: '2024-10-12T15:00:00Z', startedPrecision: 'dia' },
  ],
  sessions: [
    { id: 's1', journeyId: 'jb', historyId: 'hb', startedAt: '2026-10-10T23:00:00Z', endedAt: '2026-10-11T01:00:00Z', minutes: 120, companions: ['Ana'] },
    { id: 's2', journeyId: 'jb', historyId: 'hb', startedAt: '2026-10-07T13:00:00Z', endedAt: '2026-10-07T14:00:00Z' },
    { id: 's3', journeyId: 'jb', historyId: 'hb', startedAt: '2026-09-01T13:00:00Z', endedAt: '2026-09-01T14:00:00Z', minutes: 60 },
  ],
  events: [{ id: 'e1', journeyId: 'jb', historyId: 'hb', kind: 'momento', at: '2026-10-10T23:30:00Z', title: 'Vista' }],
  copies: [
    ...Array.from({ length: 5 }, (_, i) => ({ id: 'c' + i, gameId: i % 2 ? 'a' : 'b', platform: 'PS5', kind: 'fisico', createdAt: '2026-10-01T10:00:30Z' })),
    { id: 'cx', gameId: 'a', platform: 'PC', kind: 'digital', createdAt: '2026-10-02T10:00:00Z', purchasedOn: '2020-05-01' },
  ],
  wishes: [],
};

test('semana: sessões, jogos, momentos, minutos informados e companhia', () => {
  const w = weekSummary(s, now)!;
  assert.equal(w.sessions, 2);
  assert.deepEqual(w.games.map((x) => x.id), ['b']);
  assert.equal(w.moments, 1);
  assert.equal(w.minutes, 120);
  assert.deepEqual(w.companions, ['Ana']);
});

test('semana vazia não aparece', () => {
  assert.equal(weekSummary(s, Date.parse('2027-03-01T12:00:00Z')), null);
});

test('aniversários: zerou há 1 ano (ontem) e começou há 2 anos (hoje)', () => {
  const a = anniversaries(s, now);
  assert.deepEqual(a.map((x) => [x.kind, x.years, x.game.id]), [['zerou', 1, 'a'], ['comecou', 2, 'b']]);
});

test('ritmo: dia da semana e período no horário de Brasília, mediana só do informado', () => {
  const r = rhythm(s, now);
  assert.equal(r.sessions, 3);
  assert.equal(r.byWeekday[6], 1); // sábado 20h em Brasília
  assert.equal(r.byPeriod[3], 1);  // noite
  assert.equal(r.medianMinutes, 90);
  assert.equal(r.medianDaysToFinish, 40);
  assert.equal(r.months.at(-1)!.count, 2);
  assert.deepEqual(r.companions, [{ name: 'Ana', sessions: 1, games: 1 }]);
});

test('linha do tempo geral: importação vira um registro e a data da compra vale', () => {
  const t = globalTimeline(s);
  assert.ok(t.some((x) => x.id.startsWith('batch-') && x.title === '5 jogos entraram na coleção'));
  const cx = t.find((x) => x.id === 'copy-cx')!;
  assert.ok(cx.at.startsWith('2020-05-01'));
  assert.equal(t[0].id, 'e1');
});
