import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findParts, partsAround, type OutlinePart } from './outline';

const tlou2: OutlinePart[] = [
  { id: 'a', name: 'Jackson', pct: 0 },
  { id: 'b', name: 'Seattle Dia 1', pct: 10 },
  { id: 'c', name: 'Seattle Dia 2', pct: 30 },
  { id: 'd', name: 'Seattle Dia 3', pct: 50 },
  { id: 'e', name: 'O Teatro', pct: 60 },
  { id: 'f', name: 'Santa Bárbara', pct: 85, group: 'Califórnia' },
];

test('acha pelo nome sem acento e sem maiúscula', () => {
  assert.equal(findParts(tlou2, 'santa barbara')[0].id, 'f');
  assert.equal(findParts(tlou2, 'TEATRO')[0].id, 'e');
});
test('"dia 2" e "seattle 2" acham o dia 2 primeiro', () => {
  assert.equal(findParts(tlou2, 'dia 2')[0].id, 'c');
  assert.equal(findParts(tlou2, 'seattle dia 2')[0].id, 'c');
});
test('número sozinho ou "cap 3" acha o terceiro item', () => {
  assert.equal(findParts(tlou2, 'cap 3')[0].id, 'c');
  assert.equal(findParts(tlou2, '5')[0].id, 'e');
});
test('aceita palavra pela metade, erro de digitação e o grupo', () => {
  assert.equal(findParts(tlou2, 'jack')[0].id, 'a');
  assert.equal(findParts(tlou2, 'jakson')[0].id, 'a');
  assert.equal(findParts(tlou2, 'california')[0].id, 'f');
});
test('texto sem relação não acha nada', () => {
  assert.deepEqual(findParts(tlou2, 'pescaria no lago'), []);
  assert.deepEqual(findParts(tlou2, '  '), []);
});
test('atalhos: o atual e os dois seguintes', () => {
  assert.deepEqual(partsAround(tlou2, tlou2[2]).map((p) => p.id), ['c', 'd', 'e']);
  assert.deepEqual(partsAround(tlou2, null).map((p) => p.id), ['a', 'b', 'c']);
  assert.deepEqual(partsAround(tlou2, tlou2[5]).map((p) => p.id), ['f']);
});
