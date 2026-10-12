import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findDuplicatePairs } from './repair';
import type { Game, Copy, Journey, State } from '../data/types';

const T1 = '2026-10-12T06:58:00Z', T2 = '2026-10-12T07:22:00Z', T0 = '2026-10-12T03:19:00Z';
const g = (id: string, title: string, source: 'manual' | 'igdb'): Game => ({ id, slug: id, title, cover: '', platforms: [], source });
const c = (id: string, gameId: string, platform: string, at: string, kind: Copy['kind'] = 'fisico'): Copy => ({ id, gameId, platform, kind, createdAt: at });

test('junta cada jogo da planilha com a sua ficha, sem confundir jogos parecidos', () => {
  const s = { games: {}, copies: [], journeys: [], sessions: [] } as unknown as State;
  const games = [
    g('wz-bc2', 'Battlefield: Bad Company 2', 'manual'), g('igdb-bc2', 'Battlefield: Bad Company 2', 'igdb'),
    g('wz-bf1', 'Battlefield 1', 'manual'), g('igdb-bf1', 'Battlefield 1', 'igdb'),
    g('wz-bf3', 'Battlefield 3', 'manual'),
    g('wz-astro', 'Astrobot', 'manual'), g('astro-bot', 'Astro Bot', 'igdb'),
    g('wz-yk', 'Yakuza Kiwami', 'manual'), g('igdb-yk', 'Yakuza Kiwami', 'igdb'),
  ];
  s.games = Object.fromEntries(games.map((x) => [x.id, x]));
  s.copies = [
    c('m1', 'wz-bc2', 'PlayStation 3', T1), c('m2', 'wz-bc2', 'PlayStation 3', T1), c('i1', 'igdb-bc2', 'PlayStation 3', T2), c('i2', 'igdb-bc2', 'PlayStation 3', T2),
    c('m3', 'wz-bf1', 'PlayStation 4', T1), c('i3', 'igdb-bf1', 'PlayStation 4', T2),
    c('m4', 'wz-bf3', 'PlayStation 4', T1),
    c('m5', 'wz-astro', 'PlayStation 5', T1), c('own', 'astro-bot', 'PlayStation 5', T0),
    c('m6', 'wz-yk', 'PlayStation 4', T1), c('i6', 'igdb-yk', 'PlayStation 4', T2),
  ];
  const j = (id: string, gameId: string, at: string): Journey => ({ id, gameId, mood: 'jogando', createdAt: at });
  s.journeys = [j('jm', 'wz-yk', T1), j('ji', 'igdb-yk', T2)];
  const pairs = findDuplicatePairs(s);
  const by = Object.fromEntries(pairs.map((p) => [p.manual.id, p]));
  assert.equal(pairs.length, 4);
  assert.equal(by['wz-bc2'].igdb.id, 'igdb-bc2');
  assert.deepEqual(by['wz-bc2'].dropCopies.sort(), ['i1', 'i2']);
  assert.equal(by['wz-bf1'].igdb.id, 'igdb-bf1');
  assert.equal(by['wz-bf3'], undefined, 'Battlefield 3 não tem ficha repetida e não pode virar Battlefield 1');
  // Astro Bot já era seu antes da planilha: sai a cópia sem ficha, fica a sua.
  assert.equal(by['wz-astro'].igdb.id, 'astro-bot');
  assert.deepEqual(by['wz-astro'].dropCopies, ['m5']);
  assert.deepEqual(by['wz-astro'].igdbDupCopies, [], 'ficha errada nunca tira uma cópia que já era sua');
  assert.deepEqual(by['wz-bc2'].igdbDupCopies.sort(), ['i1', 'i2']);
  assert.ok(by['wz-astro'].sim >= 0.9);
  // Zerado nas duas importações: sai a Jornada repetida (a mais nova).
  assert.equal(by['wz-yk'].dropJourney, 'ji');
});
