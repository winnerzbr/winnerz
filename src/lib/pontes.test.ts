import { test } from 'node:test';
import assert from 'node:assert/strict';
import { raCleanTitle, raClusters } from '../../api/pontes';

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
