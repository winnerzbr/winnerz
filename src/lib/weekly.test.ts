import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weekOf, inWeek, candidates, pickWeekly, isDone } from './weekly';

const g = (id: string) => ({ id, slug: id, title: id.toUpperCase(), cover: '', platforms: [] });
const base: any = {
  games: { a: g('a'), b: g('b'), c: g('c') },
  journeys: [{ id: 'ja', gameId: 'a', mood: 'pausado' }, { id: 'jb', gameId: 'b', mood: 'jogando' }],
  histories: [
    { id: 'ha', journeyId: 'ja', ordinal: 1, title: 'P', state: 'pausada', startedAt: '2026-01-01T10:00:00-03:00' },
    { id: 'hb', journeyId: 'jb', ordinal: 1, title: 'P', state: 'ativa', startedAt: '2026-01-01T10:00:00-03:00', progress: 80 },
  ],
  sessions: [{ id: 's0', journeyId: 'jb', historyId: 'hb', startedAt: '2026-08-01T20:00:00-03:00', endedAt: '2026-08-01T21:00:00-03:00' }],
  events: [], copies: [{ id: 'c', gameId: 'c' }], wishes: [], prefs: {},
};
const now = new Date('2026-10-16T12:00:00-03:00'); // sexta

test('a semana começa na segunda (horário de Brasília)', () => {
  assert.equal(weekOf(now), '2026-10-12');
  assert.equal(weekOf(new Date('2026-10-12T01:00:00-03:00')), '2026-10-12');
  assert.equal(weekOf(new Date('2026-10-12T02:00:00Z')), '2026-10-05'); // ainda domingo em Brasília
  assert.ok(inWeek('2026-10-18T23:00:00-03:00', '2026-10-12'));
  assert.ok(!inWeek('2026-10-19T00:30:00-03:00', '2026-10-12'));
});

test('os convites saem do que você tem', () => {
  const ids = candidates(base, now).map((c) => c.id);
  assert.ok(ids.includes('pausado') && ids.includes('antigo') && ids.includes('perto') && ids.includes('nunca'));
  assert.ok(!ids.includes('companhia'));
  const p = candidates(base, now).find((c) => c.id === 'pausado')!;
  assert.equal(p.target, 'ja');
  // Mesmo convite na mesma semana; trocar muda; evita o da semana passada.
  assert.equal(pickWeekly(base, '2026-10-12', 0, undefined, now).id, pickWeekly(base, '2026-10-12', 0, undefined, now).id);
  assert.notEqual(pickWeekly(base, '2026-10-12', 0, undefined, now).id, pickWeekly(base, '2026-10-12', 1, undefined, now).id);
  const a = pickWeekly(base, '2026-10-12', 0, undefined, now).id;
  assert.notEqual(pickWeekly(base, '2026-10-12', 0, a, now).id, a);
});

test('feito só com o que foi registrado na semana', () => {
  const s = { ...base, sessions: [...base.sessions, { id: 's1', journeyId: 'ja', historyId: 'ha', startedAt: '2026-10-14T20:00:00-03:00', endedAt: '2026-10-14T21:00:00-03:00', note: 'Parei no chefe' }] };
  assert.equal(isDone(s, { week: '2026-10-12', id: 'pausado', target: 'ja' }), true);
  assert.equal(isDone(s, { week: '2026-10-05', id: 'pausado', target: 'ja' }), false);
  assert.equal(isDone(s, { week: '2026-10-12', id: 'recado' }), true);
  assert.equal(isDone(s, { week: '2026-10-12', id: 'momento' }), false);
});
