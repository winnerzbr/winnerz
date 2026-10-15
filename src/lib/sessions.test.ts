import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sessionMinutes, notFitStreak, NOT_FIT } from './sessions';

test('a duração sai do começo e do fim', () => {
  assert.equal(sessionMinutes('2026-10-09T21:00:00-03:00', '2026-10-09T22:40:00-03:00'), 100);
  assert.equal(sessionMinutes('2026-10-09T21:00:00Z', '2026-10-09T21:00:20Z'), 1);
});
test('sessão esquecida (mais de 12 h) fica sem duração; até 12 h vira no máximo 10 h', () => {
  assert.equal(sessionMinutes('2026-10-09T08:00:00Z', '2026-10-09T21:00:00Z'), undefined);
  assert.equal(sessionMinutes('2026-10-09T08:00:00Z', '2026-10-09T19:30:00Z'), 600);
  assert.equal(sessionMinutes('2026-10-09T08:00:00Z', '2026-10-09T07:00:00Z'), undefined);
});
test('três "Não encaixou" seguidos sugerem a pausa; um diferente no meio não', () => {
  const s = (id: string, day: number, feeling?: string) => ({ id, startedAt: `2026-10-0${day}T20:00:00Z`, endedAt: `2026-10-0${day}T21:00:00Z`, feeling });
  assert.equal(notFitStreak([s('a', 1, NOT_FIT), s('b', 2, NOT_FIT), s('c', 3, NOT_FIT)])?.id, 'c');
  assert.equal(notFitStreak([s('a', 1, NOT_FIT), s('b', 2, 'Adorei'), s('c', 3, NOT_FIT), s('d', 4, NOT_FIT)]), null);
  assert.equal(notFitStreak([s('a', 1, NOT_FIT), s('b', 2, NOT_FIT)]), null);
  assert.equal(notFitStreak([s('a', 1, NOT_FIT), s('b', 2, NOT_FIT), s('c', 3, NOT_FIT), { id: 'open', startedAt: '2026-10-05T20:00:00Z' }])?.id, 'c');
});
