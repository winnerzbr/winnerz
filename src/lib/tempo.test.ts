import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sessaoDe, cabeNoTempo, pesoDoTempo } from './tempo';

test('RPG, estratégia e mundo aberto pedem sessão longa; luta e corrida, curta', () => {
  assert.equal(sessaoDe({ genres: 'Role-playing (RPG), Adventure', themes: ['Fantasy'] }), 'longa');
  assert.equal(sessaoDe({ genres: "Hack and slash/Beat 'em up, Role-playing (RPG)" }), 'longa');
  assert.equal(sessaoDe({ genres: 'Fighting', themes: ['Action'] }), 'curta');
  assert.equal(sessaoDe({ genres: 'Racing, Sport' }), 'curta');
  assert.equal(sessaoDe({ genres: 'Adventure', themes: ['Action', 'Open world'] }), 'longa');
  assert.equal(sessaoDe({ genres: 'Adventure', themes: ['Horror'] }), 'media');
  assert.equal(sessaoDe({ genres: 'Role-playing (RPG)' }, { short: 3 }), 'curta');
  // Yakuza: RPG de história longa, com atividades curtas na cidade: sessão média (cabe em 45, não em 20).
  assert.equal(sessaoDe({ genres: 'Ação e RPG' }, { short: 2, story: 3 }), 'media');
  // Um FPS que a comunidade diz que rende em partidas curtas.
  assert.equal(sessaoDe({ genres: 'Tiro em primeira pessoa' }, { short: 2, story: 1 }), 'curta');
});

test('Dragon Age Inquisition não cabe em 20 nem em 45 minutos', () => {
  const s = sessaoDe({ genres: 'Role-playing (RPG), Adventure', themes: ['Action', 'Fantasy', 'Open world'] });
  assert.equal(cabeNoTempo(s, 20), false);
  assert.equal(cabeNoTempo(s, 45), false);
  assert.equal(cabeNoTempo(s, 90), true);
  assert.ok(pesoDoTempo(s, 180) > pesoDoTempo('curta', 180));
});

test('20 min só aceita sessão curta; sem tempo escolhido, tudo cabe', () => {
  assert.equal(cabeNoTempo('media', 20), false);
  assert.equal(cabeNoTempo('curta', 20), true);
  assert.equal(cabeNoTempo('longa', null), true);
});

test('no dia todo, o jogo curto de zerar sobe', () => {
  assert.ok(pesoDoTempo('media', 600, 6) > pesoDoTempo('media', 600, 40));
});
