import { test } from 'node:test';
import assert from 'node:assert/strict';
import { autoSeasons, seasonById, seasonStats } from './seasons';

test('estações do Brasil como temporadas, da atual para trás', () => {
  const l = autoSeasons(new Date('2026-10-15T15:00:00Z'), 5);
  assert.deepEqual(l.map((s) => s.id), ['primavera-2026', 'inverno-2026', 'outono-2026', 'verao-2025', 'primavera-2025']);
  assert.equal(l[3].name, 'Verão 2025/26');
  assert.equal(l[3].from, '2025-12-21');
  assert.equal(autoSeasons(new Date('2027-01-10T12:00:00Z'), 1)[0].id, 'verao-2026');
});

test('temporada pelo endereço (e nada do futuro)', () => {
  const now = new Date('2026-10-15T15:00:00Z');
  assert.equal(seasonById('inverno-2026', [], now)?.to, '2026-09-21');
  assert.equal(seasonById('verao-2026', [], now), null);
  assert.equal(seasonById('c-1', [{ id: 'c-1', name: 'Férias', from: '2026-07-01', to: '2026-07-31' }], now)?.name, 'Férias');
});

test('retrospectiva só com o que foi registrado', () => {
  const g = { id: 'g', slug: 'g', title: 'Hades', cover: '', platforms: [] };
  const st: any = {
    games: { g }, journeys: [{ id: 'j', gameId: 'g', mood: 'jogando' }],
    histories: [{ id: 'h', journeyId: 'j', ordinal: 1, title: 'x', state: 'concluida', startedAt: '2026-07-02T20:00:00-03:00', completedAt: '2026-08-10T22:00:00-03:00' }],
    sessions: [
      { id: 'a', journeyId: 'j', historyId: 'h', startedAt: '2026-07-02T20:00:00-03:00', endedAt: '2026-07-02T21:00:00-03:00', minutes: 60, companions: ['Ana'] },
      { id: 'b', journeyId: 'j', historyId: 'h', startedAt: '2026-08-10T20:00:00-03:00', endedAt: '2026-08-10T22:00:00-03:00' },
      { id: 'c', journeyId: 'j', historyId: 'h', startedAt: '2026-10-01T20:00:00-03:00', endedAt: '2026-10-01T22:00:00-03:00', minutes: 120 },
    ],
    events: [],
  };
  const s = seasonStats(st, seasonById('inverno-2026', [], new Date('2026-10-15'))!);
  assert.equal(s.sessions, 2);
  assert.equal(s.minutes, 60);
  assert.equal(s.informed, 1);
  assert.equal(s.done.length, 1);
  assert.equal(s.started[0].title, 'Hades');
  assert.deepEqual(s.companions, [{ name: 'Ana', sessions: 1 }]);
});

import { monthSeason, monthKeys } from './seasons';
test('um mês vira uma temporada com o último dia certo', () => {
  assert.deepEqual(monthSeason('2026-02'), { id: 'mes-2026-02', name: 'Fevereiro de 2026', from: '2026-02-01', to: '2026-02-28', auto: true });
  assert.equal(monthSeason('2026-10').to, '2026-10-31');
  assert.deepEqual(monthKeys(new Date('2026-01-15T12:00:00-03:00')), { current: '2026-01', previous: '2025-12' });
});
