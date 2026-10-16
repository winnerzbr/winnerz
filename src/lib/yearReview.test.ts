import { test } from 'node:test';
import assert from 'node:assert/strict';
import { yearReview, reviewYears } from './yearReview';

const g = (id: string) => ({ id, slug: id, title: id.toUpperCase(), cover: '', platforms: [] });
const ses = (id: string, h: string, at: string, minutes?: number, more: any = {}) => ({ id, journeyId: `j-${h.split('-')[1]}`, historyId: h, startedAt: at, endedAt: at, minutes, ...more });
const state: any = {
  games: { a: g('a'), b: g('b'), c: g('c') },
  journeys: [{ id: 'j-a', gameId: 'a', mood: 'jogando' }, { id: 'j-b', gameId: 'b', mood: 'jogando' }, { id: 'j-c', gameId: 'c', mood: 'pausado' }],
  histories: [
    { id: 'h-a', journeyId: 'j-a', ordinal: 1, title: 'Primeira', state: 'concluida', startedAt: '2026-01-03T20:00:00-03:00', completedAt: '2026-02-10T22:00:00-03:00' },
    { id: 'h-b', journeyId: 'j-b', ordinal: 2, title: 'Rejogada', state: 'ativa', startedAt: '2026-05-01T20:00:00-03:00' },
    { id: 'h-c', journeyId: 'j-c', ordinal: 1, title: 'Primeira', state: 'dropada', startedAt: '2025-11-01T20:00:00-03:00' },
  ],
  sessions: [
    ses('s1', 'h-a', '2026-01-08T21:00:00-03:00', 90), ses('s2', 'h-a', '2026-01-09T21:30:00-03:00', 60), ses('s3', 'h-a', '2026-01-10T22:00:00-03:00'),
    ses('s4', 'h-b', '2026-05-07T20:00:00-03:00', 200), ses('s5', 'h-c', '2026-03-05T14:00:00-03:00', 30), ses('s6', 'h-a', '2025-12-30T21:00:00-03:00', 500),
  ],
  events: [
    { id: 'e1', journeyId: 'j-a', historyId: 'h-a', kind: 'momento', at: '2026-01-09T22:00:00-03:00', title: 'Chefe', quote: 'Que luta inesquecível' },
    { id: 'e2', journeyId: 'j-a', historyId: 'h-a', kind: 'momento', at: '2026-06-01T00:00:00-03:00', title: 'Sem data exata', precision: 'mes' },
  ],
  copies: [{ id: 'c1', gameId: 'a', createdAt: '2026-04-01T10:00:00-03:00' }, { id: 'c2', gameId: 'b', createdAt: '2025-04-01T10:00:00-03:00' }],
  wishes: [], prefs: {},
};

test('o ano sai só do que foi registrado', () => {
  const r = yearReview(state, 2026, new Date('2026-10-16T12:00:00-03:00'));
  assert.equal(r.partial, true);
  assert.equal(r.sessions, 5);
  // Só as horas informadas (s3 não tem tempo; s6 é do ano passado).
  assert.equal(r.minutes, 90 + 60 + 200 + 30);
  assert.equal(r.informed, 4);
  assert.equal(r.months[0], 3);
  assert.equal(r.streak, 3);
  assert.equal(r.longest?.minutes, 200);
  assert.equal(r.done.length, 1);
  assert.equal(r.allMoments, 1);
  assert.equal(r.quote?.text, 'Que luta inesquecível');
  assert.deepEqual(r.setAside.map((x) => x.game.id), ['c']);
  assert.deepEqual(r.replays.map((x) => x.id), ['b']);
  assert.equal(r.copies, 1);
  assert.equal(r.weekday?.day, 4);
  assert.equal(r.part?.part, 'noite');
});

test('anos com registro, o de agora sempre', () => {
  assert.deepEqual(reviewYears(state, new Date('2026-10-16T12:00:00-03:00')), [2026, 2025]);
  assert.equal(yearReview(state, 2027, new Date('2028-01-02T12:00:00-03:00')).partial, false);
});
