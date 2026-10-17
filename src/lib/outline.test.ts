import { test } from 'node:test';
import assert from 'node:assert/strict';
import { partAt, nextPart, stopAdvice, goalSuggestions, cleanParts, pickMove, type OutlinePart, type PartMove } from './outline';

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

test('C3: o avanço das conquistas nunca volta para trás nem passa por cima de marca mais nova', () => {
  const parts = [{ id: 'a', pct: 0 }, { id: 'b', pct: 30 }, { id: 'c', pct: 60 }, { id: 'd', pct: 90 }];
  const mv = (partId: string, at: string, id = partId): PartMove => ({ id, gameId: 'g', provider: 'steam', partId, at });
  // o mais à frente vence, mesmo chegando antes de outro
  assert.equal(pickMove(parts, false, { part: 'a' }, [mv('c', '2026-10-10T10:00:00Z'), mv('b', '2026-10-11T10:00:00Z')])?.partId, 'c');
  // não volta para trás
  assert.equal(pickMove(parts, false, { part: 'c' }, [mv('b', '2026-10-11T10:00:00Z')]), null);
  assert.equal(pickMove(parts, false, { progress: 65 }, [mv('c', '2026-10-11T10:00:00Z')]), null);
  // a pessoa marcou depois da conquista: a conquista não passa por cima
  assert.equal(pickMove(parts, false, { part: 'b', partLog: [{ id: 'b', at: '2026-10-12T10:00:00Z' }] }, [mv('d', '2026-10-11T10:00:00Z')]), null);
  assert.equal(pickMove(parts, false, { part: 'b', partLog: [{ id: 'b', at: '2026-10-10T10:00:00Z' }] }, [mv('d', '2026-10-11T10:00:00Z')])?.partId, 'd');
  // item que não está mais na lista fica de fora
  assert.equal(pickMove(parts, false, {}, [mv('zz', '2026-10-11T10:00:00Z')]), null);
  // jogo aberto: vale a mais recente, mesmo "atrás" na lista
  assert.equal(pickMove(parts, true, { part: 'd' }, [mv('b', '2026-10-12T10:00:00Z'), mv('c', '2026-10-11T10:00:00Z')])?.partId, 'b');
  assert.equal(pickMove(parts, true, { part: 'b' }, [mv('b', '2026-10-12T10:00:00Z')]), null);
});
