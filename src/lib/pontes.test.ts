import { test } from 'node:test';
import assert from 'node:assert/strict';
import { raCleanTitle, raClusters, playniteSession } from '../../api/pontes';

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
