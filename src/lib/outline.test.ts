import { test } from 'node:test';
import assert from 'node:assert/strict';
import { partAt, nextPart, stopAdvice, goalSuggestions, cleanParts, type OutlinePart } from './outline';

const parts: OutlinePart[] = [
  { id: 'b', name: 'Seattle, dia 1', pct: 20, minutes: 90, stop: 'fim' },
  { id: 'a', name: 'Jackson', pct: 0, minutes: 25, stop: 'qualquer' },
  { id: 'c', name: 'O teatro', pct: 60, stop: 'pontos', spoiler: true },
];

test('acha o capítulo pelo % (ou pelo que a pessoa escolheu)', () => {
  assert.equal(partAt(parts, 45)?.id, 'b');
  assert.equal(partAt(parts, 0)?.id, 'a');
  assert.equal(partAt(parts, 80)?.id, 'c');
  assert.equal(partAt(parts, null), null);
  assert.equal(partAt(parts, 5, 'c')?.id, 'c');
  assert.equal(nextPart(parts, partAt(parts, 45))?.id, 'c');
  assert.equal(nextPart(parts, null)?.id, 'a');
});

test('Dá para parar aqui?', () => {
  assert.equal(stopAdvice(parts[1]).tone, 'sim');
  assert.match(stopAdvice(parts[0]).text, /uns 1 h 30/);
  assert.equal(stopAdvice(null).tone, 'sem');
});

test('objetivos pequenos sem repetir e sem spoiler', () => {
  const g = goalSuggestions({ note: 'Abrir o cofre', capsuleNext: 'abrir o cofre', waypoint: 'Porão', part: parts[2], short: true });
  assert.deepEqual(g, ['abrir o cofre', 'Voltar a: Porão', 'Terminar o capítulo atual', 'Chegar ao próximo ponto de save', 'Só uma volta curta, sem meta'].filter((x) => x !== 'Terminar o capítulo atual'));
  assert.ok(goalSuggestions({ part: parts[1] }).includes('Terminar Jackson'));
});

test('limpa a lista antes de gravar', () => {
  const c = cleanParts([{ id: '1', name: '  Fim  ', pct: 140 }, { id: '2', name: ' ', pct: 3 }, { id: '3', name: 'Início', pct: -4, minutes: 0 }]);
  assert.deepEqual(c.map((p) => [p.name, p.pct]), [['Início', 0], ['Fim', 100]]);
});
