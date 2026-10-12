import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ptJoined, ptList, ptVideo } from './igdbPt';

test('traduz gêneros separados por vírgula', () => {
  assert.equal(ptJoined('Role-playing (RPG), Adventure'), 'RPG, Aventura');
});
test('nomes com vírgula dentro não quebram', () => {
  assert.equal(ptJoined('Strategy, 4X (explore, expand, exploit, and exterminate)'), 'Estratégia, 4X');
});
test('nome desconhecido fica como veio', () => {
  assert.equal(ptJoined('Shooter, Roguelike'), 'Tiro, Roguelike');
});
test('listas e vídeos', () => {
  assert.deepEqual(ptList(['Single player', 'Multiplayer', 'Third person']), ['Um jogador', 'Multijogador', 'Terceira pessoa']);
  assert.equal(ptVideo('Launch Trailer'), 'Trailer de lançamento');
  assert.equal(ptVideo('Gameplay video'), 'Gameplay');
});
