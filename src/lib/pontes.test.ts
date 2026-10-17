import { test } from 'node:test';
import assert from 'node:assert/strict';
import { raCleanTitle, raClusters, playniteSession, achRows, achMoves, achPrompt } from '../../api/pontes';

test('títulos do RetroAchievements viram nomes buscáveis', () => {
  assert.equal(raCleanTitle('Legend of Zelda, The: A Link to the Past'), 'The Legend of Zelda: A Link to the Past');
  assert.equal(raCleanTitle('~Hack~ Super Mario World [Subset - Bonus]'), 'Super Mario World');
});

test('conquistas viram sessões por jogo, separadas por pausas longas', () => {
  const u = (Date: string, GameID: number, Title = 'x') => ({ Date, GameID, Title, GameTitle: `Jogo ${GameID}` });
  const c = raClusters([u('2026-10-14 20:00:00', 1, 'a'), u('2026-10-14 20:40:00', 1, 'b'), u('2026-10-14 21:00:00', 2), u('2026-10-14 23:30:00', 1, 'c')]);
  assert.equal(c.length, 3);
  assert.deepEqual(c[0].names, ['a', 'b']);
  assert.equal((c[0].last - c[0].first) / 60000, 40);
  assert.equal(c[2].game, 1);
});

test('sessão do Playnite: início e fim exatos, sem sessões curtas demais nem no futuro', () => {
  const now = Date.parse('2026-10-15T22:00:00Z');
  const g = { id: 'x', name: 'Hades' };
  assert.deepEqual(playniteSession(g, '2026-10-15T20:00:00Z', '2026-10-15T21:30:00Z', now)?.minutes, 90);
  assert.equal(playniteSession(g, '2026-10-15T21:00:00Z', '2026-10-15T21:01:00Z', now), null);
  assert.equal(playniteSession({ id: 'x' }, '2026-10-15T20:00:00Z', '2026-10-15T21:00:00Z', now), null);
  assert.equal(playniteSession(g, '2026-10-15T21:00:00Z', '2026-10-16T21:00:00Z', now)?.minutes, 60);
});

test('C3: a resposta da IA vira ligações conferidas (índice fora da lista, repetido ou inválido fica de fora)', () => {
  const parts = [{ id: 'p1', name: 'Um', pct: 0 }, { id: 'p2', name: 'Dois', pct: 50 }, { id: 'p3', name: 'Tres', pct: 90 }];
  const achs = [{ key: 'k1', name: 'Começo' }, { key: 'k2', name: 'Meio' }, { key: 'k3', name: 'Coleção' }];
  const rows = achRows({ links: [{ a: 1, n: 2 }, { a: 2, n: 3 }, { a: 2, n: 1 }, { a: 9, n: 1 }, { a: 3, n: 7 }, { a: 'x', n: 1 }] }, achs, parts);
  assert.deepEqual(rows, [{ key: 'k1', name: 'Começo', partId: 'p2' }, { key: 'k2', name: 'Meio', partId: 'p3' }, { key: 'k3', name: 'Coleção', partId: '' }]);
  assert.deepEqual(achRows(null, achs, parts).map((r) => r.partId), ['', '', '']);
});

test('C3: só conquistas ligadas e desbloqueadas viram avanços, em ordem de data e sem repetir', () => {
  const links = [{ ach_key: 'a', part_id: 'p2', name: 'A' }, { ach_key: 'b', part_id: null, name: 'B' }, { ach_key: 'c', part_id: 'p3', name: 'C' }];
  const m = achMoves(links, [{ key: 'c', at: 2000 }, { key: 'a', at: 1000 }, { key: 'b', at: 500 }, { key: 'a', at: 3000 }, { key: 'z', at: 10 }, { key: 'c', at: NaN }]);
  assert.deepEqual(m.map((x) => [x.key, x.partId, x.at]), [['a', 'p2', 1000], ['c', 'p3', 2000]]);
});

test('C3: o texto para a IA numera a lista e as conquistas', () => {
  const t = achPrompt('Jogo (2020)', [{ id: 'p1', name: 'Um', pct: 0, group: 'Mundo 1' }, { id: 'p2', name: 'Chefe', pct: 50, kind: 'chefe' }], [{ key: 'k', name: 'Fim', desc: 'Veja o final', pct: 12.345, kind: 'final do jogo' }]);
  assert.match(t, /1\. Um \(Mundo 1\)/);
  assert.match(t, /2\. Chefe \[chefe\]/);
  assert.match(t, /1\. Fim — Veja o final \(12\.3% dos jogadores\) \[final do jogo\]/);
});
