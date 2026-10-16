import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthRest, restMonths, monthKey, prevMonthKey, restfulGames } from './rest';

const g = (id: string) => ({ id, slug: id, title: id.toUpperCase(), cover: '', platforms: [] });
const st: any = {
  games: { a: g('a'), b: g('b') },
  journeys: [{ id: 'ja', gameId: 'a', mood: 'jogando' }, { id: 'jb', gameId: 'b', mood: 'jogando' }],
  sessions: [
    { id: '1', journeyId: 'ja', historyId: 'h', startedAt: '2026-09-02T21:00:00-03:00', endedAt: '2026-09-02T22:00:00-03:00', minutes: 60, intent: 'descansar', intentMet: 'sim', feeling: 'Adorei' },
    { id: '2', journeyId: 'ja', historyId: 'h', startedAt: '2026-09-05T21:00:00-03:00', endedAt: '2026-09-05T22:00:00-03:00', minutes: 60, intent: 'descansar', intentMet: 'sim' },
    { id: '3', journeyId: 'jb', historyId: 'h', startedAt: '2026-09-06T21:30:00-03:00', endedAt: '2026-09-06T22:00:00-03:00', minutes: 30, intent: 'descansar', intentMet: 'nao' },
    { id: '4', journeyId: 'jb', historyId: 'h', startedAt: '2026-09-07T21:30:00-03:00', endedAt: '2026-09-07T22:00:00-03:00', minutes: 30, intent: 'descansar', intentMet: 'nao' },
    { id: '5', journeyId: 'jb', historyId: 'h', startedAt: '2026-09-08T10:00:00-03:00', endedAt: '2026-09-08T11:00:00-03:00', intent: 'avancar', intentMet: 'sim' },
    { id: '6', journeyId: 'jb', historyId: 'h', startedAt: '2026-09-09T10:00:00-03:00', endedAt: '2026-09-09T11:00:00-03:00' },
    { id: '7', journeyId: 'ja', historyId: 'h', startedAt: '2026-08-31T23:30:00-03:00', endedAt: '2026-09-01T00:30:00-03:00', intent: 'desafio' },
  ],
};

test('mês pela intenção: o que funcionou, quem descansou e quem não', () => {
  const m = monthRest(st, '2026-09');
  assert.equal(m.sessions, 6);
  assert.equal(m.withIntent, 5);
  const rest = m.byIntent.find((x) => x.intent === 'descansar')!;
  assert.deepEqual([rest.count, rest.sim, rest.nao, rest.answered], [4, 2, 2, 4]);
  assert.deepEqual(m.rested.map((r) => r.game.id), ['a']);
  assert.deepEqual(m.notRest.map((r) => r.game.id), ['b']);
  assert.equal(m.restMinutes, 120);
  assert.equal(m.bestPeriod, null); // à noite funcionou só metade das vezes
  assert.deepEqual(m.feelings, [{ label: 'Adorei', count: 1 }]);
  // A sessão que começou em 31/ago conta em agosto (fuso de Brasília).
  assert.equal(monthRest(st, '2026-08').withIntent, 1);
});

test('meses, chaves e jogos que descansam', () => {
  assert.equal(monthKey('2026-10-01T01:00:00Z'), '2026-09');
  assert.equal(prevMonthKey('2026-01'), '2025-12');
  assert.deepEqual(restMonths(st, '2026-10-15T12:00:00-03:00'), ['2026-10', '2026-09', '2026-08']);
  const r = restfulGames(st.sessions, (j) => (j === 'ja' ? 'a' : 'b'));
  assert.equal(r.get('a'), 2);
  assert.equal(r.get('b'), -2);
});
