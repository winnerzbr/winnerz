import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agruparBusca } from './buscaGrupos';

test('agrupa versões no jogo principal e separa remakes, DLCs e cancelados', () => {
  const hits = [
    { igdbId: 1, slug: 'ff7', kind: 'main' },
    { igdbId: 2, slug: 'ff7-pc', kind: 'port', parent: 1, versionOf: true },
    { igdbId: 3, slug: 'ff7-remake', kind: 'remake' },
    { igdbId: 4, slug: 'ff7-intergrade', kind: 'expanded', parent: 3, versionOf: true },
    { igdbId: 5, slug: 'ff7-dlc', kind: 'dlc', parent: 3 },
    { igdbId: 6, slug: 'ff7-proto', kind: 'main', cancelled: true },
    { igdbId: 7, slug: 'crisis-core', kind: 'main' },
  ];
  const g = agruparBusca(hits);
  assert.deepEqual(g.principais.map((p) => [p.hit.slug, p.versoes.map((v) => v.slug)]), [['ff7', ['ff7-pc']], ['crisis-core', []]]);
  assert.deepEqual(g.relancamentos.map((p) => [p.hit.slug, p.versoes.map((v) => v.slug)]), [['ff7-remake', ['ff7-intergrade']]]);
  assert.deepEqual(g.extras.map((h) => h.slug), ['ff7-dlc']);
  assert.deepEqual(g.cancelados.map((h) => h.slug), ['ff7-proto']);
});

test('sem os campos de versão, nada muda', () => {
  const hits = [{ igdbId: 1, slug: 'a' }, { igdbId: 2, slug: 'b' }];
  assert.deepEqual(agruparBusca(hits).principais.map((p) => p.hit.slug), ['a', 'b']);
});

test('só relançamentos: sobem para o grupo principal', () => {
  const g = agruparBusca([{ igdbId: 3, slug: 'r', kind: 'remake' }]);
  assert.deepEqual(g.principais.map((p) => p.hit.slug), ['r']);
  assert.equal(g.relancamentos.length, 0);
});
