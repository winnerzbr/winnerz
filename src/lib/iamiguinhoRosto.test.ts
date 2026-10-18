import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXPRESSOES, arrumarPlaca, dePassagem, expressaoDe, rosto } from './iamiguinhoRosto';
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

test('placa: o texto cabe e a época tem texto', async () => {
  const { PLACA } = await import('./iamiguinhoTela');
  const { PLACA_EPOCA, PLACA_MOMENTO, EPOCAS } = await import('./iamiguinhoFalas');
  assert.ok(PLACA['pose-placa'] && PLACA['pose-espiando']);
  for (const e of Object.keys(EPOCAS) as (keyof typeof EPOCAS)[]) assert.ok(PLACA_EPOCA[e], e);
  for (const t of [...Object.values(PLACA_EPOCA), ...Object.values(PLACA_MOMENTO)]) for (const p of Object.values(PLACA)) {
    const { linhas, fs, deitado } = arrumarPlaca(t, p.r);
    assert.equal(linhas.join(' '), t);
    if (deitado) assert.ok(p.r < 1, 'só placa em pé escreve deitado');
    assert.ok(fs > 6, `${t} ficou pequeno demais (${fs})`);
    for (const l of linhas) assert.ok(l.length * 0.64 * fs <= 100, `${t}: "${l}" não cabe`);
  }
  assert.deepEqual(arrumarPlaca('', 2), { linhas: [], fs: 0, deitado: false });
  assert.equal(arrumarPlaca('Feliz Halloween!', 0.466).deitado, true);
  assert.equal(arrumarPlaca('Passei por aqui!', 0.466).deitado, false);
});
