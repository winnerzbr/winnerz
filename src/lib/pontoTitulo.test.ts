import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pontoTitulo } from './pontoTitulo';

test('ponto sem nome: usa o começo do motivo', () => {
  assert.equal(pontoTitulo('porta trancada no distrito Neon.'), 'Porta trancada no distrito Neon');
  assert.equal(pontoTitulo('Porta trancada no distrito Neon, voltar com mais poder para abrir'), 'Porta trancada no distrito Neon, voltar com…');
  assert.equal(pontoTitulo('  '), 'Ponto para voltar');
  assert.equal(pontoTitulo(undefined), 'Ponto para voltar');
});
