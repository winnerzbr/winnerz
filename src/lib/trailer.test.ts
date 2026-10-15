import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planTrailer, trailerLength } from './trailer';

test('roteiro do trailer só com o que foi registrado', () => {
  const g = { id: 'g', slug: 'g', title: 'Hades', cover: 'c.jpg', platforms: [], backdrop: 'b.jpg' };
  const st: any = {
    games: { g }, journeys: [{ id: 'j', gameId: 'g', mood: 'jogando' }],
    histories: [{ id: 'h', journeyId: 'j', ordinal: 1, title: 'Primeira vez', state: 'concluida', startedAt: '2026-07-02T20:00:00-03:00', completedAt: '2026-08-10T22:00:00-03:00' }],
    sessions: [
      { id: 'a', journeyId: 'j', historyId: 'h', startedAt: '2026-07-02T20:00:00-03:00', endedAt: '2026-07-02T21:00:00-03:00', minutes: 60, companions: ['Ana'] },
      { id: 'b', journeyId: 'j', historyId: 'h', startedAt: '2026-08-10T20:00:00-03:00', endedAt: '2026-08-10T22:00:00-03:00', minutes: 120 },
    ],
    events: [
      { id: 'e1', journeyId: 'j', historyId: 'h', kind: 'inicio', at: '2026-07-02T20:00:00-03:00', title: 'Primeira vez' },
      { id: 's1', journeyId: 'j', historyId: 'h', sessionId: 'a', kind: 'sessao', at: '2026-07-02T21:00:00-03:00', title: 'Sessão 1' },
      { id: 'm1', journeyId: 'j', historyId: 'h', kind: 'momento', at: '2026-07-02T20:30:00-03:00', title: 'O chefe', image: 'm.jpg', quote: 'Finalmente' },
      { id: 's2', journeyId: 'j', historyId: 'h', sessionId: 'b', kind: 'sessao', at: '2026-08-10T22:00:00-03:00', title: 'Sessão 2' },
    ],
  };
  const sc = planTrailer(st, 'h', g as any, ['x.jpg', 'y.jpg']);
  assert.deepEqual(sc.map((x) => x.kind), ['intro', 'stats', 'chapter', 'chapter', 'moment', 'people', 'end']);
  const stats = sc[1] as any;
  assert.deepEqual(stats.lines[0], ['2', 'sessões']);
  assert.deepEqual(stats.lines[1], ['3 h', 'jogadas']);
  assert.equal((sc[4] as any).caption, '“Finalmente”');
  assert.equal((sc.at(-1) as any).when, 'Zerado em 10 ago 2026');
  assert.ok(trailerLength(sc) >= 20 && trailerLength(sc) <= 45);
});
