import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chunk, clampFraming, cropRect, moveTo, pan, placeInBox, slotLayout, STICKER_ASPECT } from './enquadrar';

const near = (a: number, b: number, e = 0.01) => assert.ok(Math.abs(a - b) <= e, `${a} ≠ ${b}`);

test('o recorte inicial é o maior 5:7 que cabe, centrado', () => {
  const r = cropRect(2000, 1400, STICKER_ASPECT, { x: 0.5, y: 0.5, z: 1 });
  near(r.sh, 1400); near(r.sw, 1000); near(r.sx, 500); near(r.sy, 0);
  const v = cropRect(1000, 2000, STICKER_ASPECT, { x: 0.5, y: 0.5, z: 1 });
  near(v.sw, 1000); near(v.sh, 1400); near(v.sy, 300);
});

test('zoom e centro nunca deixam o recorte sair da imagem', () => {
  const r = cropRect(2000, 1400, STICKER_ASPECT, { x: 0, y: 1, z: 2 });
  near(r.sw, 500); near(r.sh, 700); near(r.sx, 0); near(r.sy, 700);
  const f = clampFraming(2000, 1400, STICKER_ASPECT, { x: -3, y: 9, z: 99 });
  assert.ok(f.z <= 5 && f.x > 0 && f.y < 1);
});

test('arrastar para a direita mostra mais da esquerda da pintura', () => {
  const f = pan(2000, 1400, STICKER_ASPECT, { x: 0.5, y: 0.5, z: 1 }, 100, 0, 250, 350);
  assert.ok(f.x < 0.5);
  near(f.y, 0.5);
});

test('a posição na caixa reproduz o recorte com a sobra do site', () => {
  const p = placeInBox(2000, 1400, STICKER_ASPECT, { x: 0.5, y: 0.5, z: 1 }, 1.1);
  near(p.width, 220); near(p.height, 110); near(p.top, -5); near(p.left, -60);
  const q = placeInBox(2000, 1400, STICKER_ASPECT, { x: 0.5, y: 0.5, z: 1 }, 1);
  near(q.left, -50); near(q.width, 200);
});

test('figurinhas por página: colunas e tamanhos que cabem', () => {
  assert.equal(slotLayout(1).cols, 1);
  for (let n = 2; n <= 12; n++) {
    const { cols, cw } = slotLayout(n);
    const rows = Math.ceil(n / cols);
    assert.ok(cols * cw + (cols - 1) * 3.4 <= 84.1, `${n} largura`);
    assert.ok(rows * (cw * 1.4 + 8) + (rows - 1) * 3.4 <= 96.1, `${n} altura`);
    assert.ok(cw > 14, `${n} pequeno demais (${cw})`);
  }
  assert.deepEqual(chunk([1, 2, 3, 4, 5, 6, 7], 3), [[1, 2, 3], [4, 5, 6], [7]]);
  assert.deepEqual(chunk([], 6), [[]]);
});

test('mover na lista ao arrastar', () => {
  assert.deepEqual(moveTo(['a', 'b', 'c', 'd'], 'a', 3), ['b', 'c', 'a', 'd']);
  assert.deepEqual(moveTo(['a', 'b', 'c', 'd'], 'd', 0), ['d', 'a', 'b', 'c']);
  assert.deepEqual(moveTo(['a', 'b', 'c'], 'b', -1), ['a', 'c', 'b']);
  assert.deepEqual(moveTo(['a', 'b'], 'x', 1), ['a', 'x', 'b']);
});
