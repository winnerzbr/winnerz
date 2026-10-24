import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leafMode, sectionLeaves, mixedLayout, chunk, clampFraming, coversAll, cropRect, moveTo, pan, placeInBox, slotLayout, snapInside, STICKER_ASPECT } from './enquadrar';

const near = (a: number, b: number, e = 0.01) => assert.ok(Math.abs(a - b) <= e, `${a} ≠ ${b}`);

test('o recorte inicial é o maior 5:7 que cabe, centrado', () => {
  const r = cropRect(2000, 1400, STICKER_ASPECT, { x: 0.5, y: 0.5, z: 1 });
  near(r.sh, 1400); near(r.sw, 1000); near(r.sx, 500); near(r.sy, 0);
  const v = cropRect(1000, 2000, STICKER_ASPECT, { x: 0.5, y: 0.5, z: 1 });
  near(v.sw, 1000); near(v.sh, 1400); near(v.sy, 300);
});

test('enquadramento livre: dá para afastar e passar da borda; Encaixar traz para dentro', () => {
  const r = cropRect(2000, 1400, STICKER_ASPECT, { x: 0, y: 1, z: 2 });
  near(r.sw, 500); near(r.sh, 700); near(r.sx, -250); near(r.sy, 1050);
  assert.equal(coversAll(2000, 1400, r), false);
  const f = clampFraming(2000, 1400, STICKER_ASPECT, { x: -3, y: 9, z: 99 });
  assert.deepEqual(f, { x: 0, y: 1, z: 5 });
  near(clampFraming(2000, 1400, STICKER_ASPECT, { x: 0.5, y: 0.5, z: 0.01 }).z, 0.4);
  const s = snapInside(2000, 1400, STICKER_ASPECT, { x: 0, y: 1, z: 0.5 });
  assert.equal(s.z, 1);
  assert.ok(coversAll(2000, 1400, cropRect(2000, 1400, STICKER_ASPECT, s)));
  // uma pintura quase no formato da figurinha agora também anda para os lados
  const g = pan(1000, 1450, STICKER_ASPECT, { x: 0.5, y: 0.5, z: 1 }, 100, 0, 250, 350);
  assert.ok(g.x < 0.5);
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

test('página mista: deitada e em pé com a mesma área, tudo cabe', () => {
  for (const kinds of [['h', 'v', 'v'], ['h', 'h'], ['v', 'h', 'v', 'h', 'v', 'v'], ['v', 'v', 'v', 'v', 'v', 'v'], ['h']] as ('v' | 'h')[][]) {
    const { pw, rows } = mixedLayout(kinds);
    assert.ok(pw >= 14, `${kinds.join('')} pequeno demais (${pw})`);
    assert.equal(rows.flat().length, kinds.length);
    for (const r of rows) assert.ok(r.reduce((t, i) => t + (kinds[i] === 'h' ? 1.4 * pw : pw), 0) + 3.4 * (r.length - 1) <= 84.1);
  }
  // mesma área: 1,4·L × L = L × 1,4·L
  const { pw } = mixedLayout(['h', 'v']);
  near(1.4 * pw * pw, pw * 1.4 * pw);
});

test('páginas da seção: escolhidas à mão ou divididas sozinhas', () => {
  const a = (id: string, leaf?: number) => ({ id, leaf });
  assert.deepEqual(sectionLeaves([a('1'), a('2'), a('3')], 2).map((g) => g.map((x) => x.id)), [['1', '2'], ['3']]);
  assert.deepEqual(sectionLeaves([a('1', 2), a('2', 1), a('3', 2), a('4')], 6).map((g) => g.map((x) => x.id)), [['2'], ['1', '3'], ['4']]);
  assert.equal(leafMode([{ pos: null }, { pos: { x: 10, y: 20 } }]), 'free');
  assert.equal(leafMode([{}, {}]), 'rows');
});
