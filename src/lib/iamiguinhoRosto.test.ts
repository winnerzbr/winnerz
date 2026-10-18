import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXPRESSOES, dePassagem, expressaoDe, rosto } from './iamiguinhoRosto';
import { TELA } from './iamiguinhoTela';
import { HELICE } from './iamiguinhoHelice';

test('toda imagem animada tem a tela medida e uma cara de repouso', () => {
  for (const img of Object.keys(HELICE)) {
    const t = TELA[img];
    assert.ok(t, `sem tela: ${img}`);
    assert.ok(t.w > 30 && t.w < 65 && Math.abs(t.a) < 30, `tela estranha: ${img}`);
    assert.ok(EXPRESSOES.includes(expressaoDe(img)), img);
  }
  assert.equal(expressaoDe('cara-tonto'), 'tonto');
  assert.equal(expressaoDe('pose-dormindo'), 'sonolento');
  assert.equal(expressaoDe('pose-que-nao-existe'), 'sorriso-confiante');
});

test('as 12 expressões desenham com o filtro do próprio id', () => {
  for (const e of EXPRESSOES) {
    const s = rosto(e, 'iam-bx1');
    assert.match(s, /<filter id="iam-bx1"/);
    assert.match(s, /url\(#iam-bx1\)/);
    assert.ok(!s.includes('NaN') && !s.includes('undefined'), e);
  }
  assert.match(rosto('feliz'), /class="iam-olhos"/);
  assert.ok(!rosto('sonolento').includes('iam-olhos'), 'dormindo não pisca');
});

test('de passagem: outra cara, nunca dormindo nem tonto', () => {
  assert.equal(dePassagem('sonolento'), null);
  for (const e of EXPRESSOES) for (const s of [0, 0.5, 0.99]) {
    const p = dePassagem(e, s);
    if (p) { assert.notEqual(p, e); assert.ok(p !== 'tonto' && p !== 'sonolento'); }
  }
});
