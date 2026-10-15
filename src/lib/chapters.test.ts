import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTimeline, summarize, weaveEchoes, compareLines } from './chapters';

const ev = (id: string, at: string, kind: any, more: any = {}) => ({ id, journeyId: 'j', historyId: 'h', kind, at, title: more.title ?? id, ...more });
const ses = (id: string, at: string, more: any = {}) => ({ id, journeyId: 'j', historyId: 'h', startedAt: at, endedAt: at, ...more });
const events = [
  ev('i', '2026-09-28T21:00:00-03:00', 'inicio', { title: 'Rejogada' }),
  ev('m', '2026-10-02T22:00:00-03:00', 'momento', { title: 'Loja de música', image: 'x.jpg' }),
  ev('s1', '2026-10-02T23:00:00-03:00', 'sessao', { sessionId: 'a' }),
  ev('s2', '2026-10-12T22:00:00-03:00', 'sessao', { sessionId: 'b' }),
  ev('p', '2026-10-12T22:30:00-03:00', 'ponto', { title: 'Porão' }),
];
const sessions = [ses('a', '2026-10-02T21:00:00-03:00', { minutes: 120, whereStopped: 'Loja' }), ses('b', '2026-10-12T21:00:00-03:00', { minutes: 50, whereStopped: 'Seattle, dia 2' })];
const other = [ev('o1', '2026-10-06T20:00:00-03:00', 'sessao', { journeyId: 'k' }), ev('o2', '2026-10-07T20:00:00-03:00', 'marco', { journeyId: 'k', title: 'Zerou' }), ev('old', '2025-10-15T20:00:00-03:00', 'momento', { journeyId: 'k', quote: 'Parece que voltei a ter dez anos' })];
const titles: Record<string, string> = { j: 'TLOU2', k: 'Astro Bot' };

test('divide a História pelas pausas longas, com o silêncio no meio', () => {
  const items = buildTimeline({ events, sessions, allEvents: [...events, ...other], gameTitleOf: (j) => titles[j], journeyId: 'j', today: true, now: Date.parse('2026-10-15T12:00:00-03:00') });
  const kinds = items.map((x) => x.type);
  assert.deepEqual(kinds, ['chapter', 'event', 'event', 'event', 'silence', 'chapter', 'event', 'event', 'memory', 'today']);
  const sil = items[4] as any;
  assert.equal(sil.days, 9);
  assert.deepEqual(sil.meanwhile, ['Você zerou Astro Bot']);
  const c1 = items[0] as any, c2 = items[5] as any;
  assert.equal(c1.name, 'Loja');
  assert.equal(c2.name, 'Seattle, dia 2');
  assert.match(c2.summary, /Uma sessão, 50 min no total\./);
  assert.match(c2.summary, /Um lugar marcado para voltar\./);
  assert.equal((items[8] as any).years, 1);
});

test('o resumo só usa o que foi registrado', () => {
  const r = summarize([events[1], events[2]], (id) => sessions.find((x) => x.id === id) as any);
  assert.equal(r.text, 'Uma sessão, 2 h no total. Um momento guardado. Você parou em Loja.');
});

test('sem "Hoje" quando a História não está em andamento', () => {
  const items = buildTimeline({ events, sessions, allEvents: events, gameTitleOf: (j) => titles[j], journeyId: 'j', today: false });
  assert.equal(items.at(-1)!.type, 'event');
});

test('ecos entram antes do primeiro registro seu que já passou daquele ponto; a comparação, antes do Hoje', () => {
  const ss = [ses('a', '2026-10-02T21:00:00-03:00', { progress: 20 }), ses('b', '2026-10-12T21:00:00-03:00', { progress: 50 })];
  const items = buildTimeline({ events, sessions: ss, allEvents: events, gameTitleOf: (j) => titles[j], journeyId: 'j', today: true, now: Date.parse('2026-10-15T12:00:00-03:00') });
  const echo = (id: string, progress: number) => ({ id, handle: 'duda', kind: 'momento' as const, at: '2025-01-01T00:00:00Z', title: id, progress });
  const cmp = { type: 'compare' as const, id: 'comparar' as const, data: { players: 9, enough: true } };
  const out = weaveEchoes(items, [echo('e30', 30), echo('e10', 10), echo('e45', 45)], cmp);
  const ids = out.map((x) => x.id);
  assert.ok(ids.indexOf('eco-e10') < ids.indexOf('s1'));
  assert.ok(ids.indexOf('eco-e30') > ids.indexOf('s1') && ids.indexOf('eco-e30') < ids.indexOf('s2'));
  assert.ok(ids.indexOf('eco-e45') < ids.indexOf('s2'));
  assert.equal(ids.at(-2), 'comparar');
  assert.equal(ids.at(-1), 'hoje');
  // Sem progresso nenhum: todos juntos antes do fim.
  const flat = weaveEchoes(buildTimeline({ events, sessions, allEvents: events, gameTitleOf: () => 'x', journeyId: 'j', today: true }), [echo('a', 5)], null);
  assert.equal(flat.at(-2)?.id, 'eco-a');
});

test('a comparação só diz o que os números dizem', () => {
  const c = { players: 40, enough: true, done: 12, doneSessions: 20, doneHours: 25, paused: 10, pauseBuckets: [{ from: 40, count: 6 }, { from: 10, count: 4 }] };
  const l = compareLines(c, 45);
  assert.equal(l[0], 'Muita gente pausa entre 40% e 50%: 6 em cada 10 que pararam, pararam aí.');
  assert.match(l[1], /não é só com você/);
  assert.equal(l[2], 'Quem zerou levou, em geral, 20 sessões, cerca de 25 h.');
  assert.equal(l[3], '12 de 40 pessoas zeraram.');
  assert.deepEqual(compareLines({ players: 6, enough: true, paused: 3, pauseBuckets: [] }), []);
});
