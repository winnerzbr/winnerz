import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameDna } from './dna';
import type { Game } from '../data/types';

const g = (x: Partial<Game>): Game => ({ id: 'x', slug: 'x', title: 'X', cover: '', platforms: [], ...x });

test('modos do IGDB viram "Dá para jogar junto" com origem IGDB', () => {
  const d = gameDna(g({ modes: ['Single player', 'Co-operative', 'Split screen'] }));
  const t = d.traits.find((x) => x.key === 'junto');
  assert.ok(t && t.source === 'igdb');
  assert.match(t!.detail, /cooperativo/);
  assert.equal(d.fits.together, true);
});

test('corrida é inferida como boa em sessões curtas e fácil de retomar', () => {
  const d = gameDna(g({ genres: 'Racing' }));
  assert.ok(d.traits.some((x) => x.key === 'curtas' && x.source === 'inferido'));
  assert.ok(d.traits.some((x) => x.key === 'retomar'));
  assert.equal(d.fits.short, true);
});

test('gêneros em português do acervo antigo também contam', () => {
  const d = gameDna(g({ genres: 'RPG de ação' }));
  assert.ok(d.traits.some((x) => x.key === 'historia'));
  assert.ok(d.traits.some((x) => x.key === 'reaprender'));
  assert.equal(d.fits.light, false);
});

test('tempo para zerar: sua estimativa vence a média do IGDB, e nada é inventado', () => {
  const game = g({ id: 'a', ttb: { n: 30 } });
  assert.equal(gameDna(game).hours, 30);
  assert.equal(gameDna(game).hoursSource, 'igdb');
  const s = { myGames: { a: { gameId: 'a', estHours: 12 } } } as any;
  assert.equal(gameDna(game, s).hours, 12);
  assert.equal(gameDna(game, s).hoursSource, 'voce');
  assert.equal(gameDna(g({})).hours, undefined);
  assert.ok(!gameDna(g({})).traits.some((x) => x.key === 'duracao'));
});

test('terror nunca é sugerido como algo leve', () => {
  const d = gameDna(g({ genres: 'Puzzle', themes: ['Horror'], ttb: { n: 4 } }));
  assert.equal(d.fits.horror, true);
  assert.equal(d.fits.light, false);
});
