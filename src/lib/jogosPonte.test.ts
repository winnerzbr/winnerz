import { test } from 'node:test';
import assert from 'node:assert/strict';
import { caminhoDoJogo, filhosDiretos, nomeDaImagem } from './jogosPonte';

test('caminho do jogo: tudo fica dentro de verao/', () => {
  assert.equal(caminhoDoJogo('wz/rascunho'), 'verao/wz/rascunho');
  assert.equal(caminhoDoJogo('/wz/aplicado/'), 'verao/wz/aplicado');
  assert.throws(() => caminhoDoJogo('../x'));
  assert.throws(() => caminhoDoJogo(''));
});

test('coleção: só os documentos de dentro, sem subcoleções', () => {
  const c = ['verao/wz/rascunho', 'verao/wz/v1', 'verao/wz/v1/sub/a', 'verao/outro/x', 'verao/wzz/a'];
  assert.deepEqual(filhosDiretos('wz', c), ['verao/wz/rascunho', 'verao/wz/v1']);
});

test('nome da imagem: seguro e dentro de verao/', () => {
  assert.equal(nomeDaImagem('verao/abc-1.webp'), 'verao/abc-1.webp');
  assert.equal(nomeDaImagem('x y/../z.webp'), 'verao/x-y/z.webp');
  assert.ok(!nomeDaImagem('a/../../b.webp').includes('..'));
  assert.ok(nomeDaImagem('a b?.webp').startsWith('verao/'));
});
