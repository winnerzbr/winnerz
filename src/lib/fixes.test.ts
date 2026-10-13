import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyFixes, checkFix, keepFixes, fixedFields } from './fixes';
import type { Game } from '../data/types';

const g: Game = { id: 'g1', slug: 'burnout-3', title: 'Burnout', cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/abc.jpg', platforms: ['PlayStation 2'], year: 2004 };

test('aplica as correções e mantém quando chega ficha sem elas', () => {
  const fixed = applyFixes(g, { title: { v: 'Burnout 3: Takedown' }, summary_source: { v: 'Revisado pela comunidade' } });
  assert.equal(fixed.title, 'Burnout 3: Takedown');
  assert.equal(fixed.summarySource, 'Revisado pela comunidade');
  assert.deepEqual([...fixedFields(fixed)], ['title']);
  const fresh: Game = { ...g, title: 'Burnout (IGDB)' };
  assert.equal(keepFixes(fixed, fresh).title, 'Burnout 3: Takedown');
  assert.equal(keepFixes(undefined, fresh).title, 'Burnout (IGDB)');
  // A ficha nova traz as correções dela: valem as dela (uma correção desfeita some).
  assert.equal(keepFixes(fixed, { ...fresh, fixes: {} }).title, 'Burnout (IGDB)');
});

test('confere a sugestão', () => {
  assert.deepEqual(checkFix('year', '2004', g), { error: 'Isso já é o que a ficha mostra.' });
  assert.deepEqual(checkFix('year', '2005', g), { value: 2005 });
  assert.ok('error' in checkFix('year', '05', g));
  assert.deepEqual(checkFix('platforms', ['PlayStation 2', 'Xbox', 'Xbox'], g), { value: ['PlayStation 2', 'Xbox'] });
  assert.ok('error' in checkFix('platforms', [], g));
  assert.ok('error' in checkFix('cover', 'https://evil.com/a.jpg', g));
  assert.deepEqual(checkFix('cover', '//images.igdb.com/igdb/image/upload/t_cover_big/xyz.webp', g), { value: 'https://images.igdb.com/igdb/image/upload/t_cover_big/xyz.webp' });
  assert.ok('error' in checkFix('summary', 'curto', g));
  assert.deepEqual(checkFix('title', '  Burnout 3  ', g), { value: 'Burnout 3' });
  assert.deepEqual(checkFix('outro', '', g), { value: null });
});
