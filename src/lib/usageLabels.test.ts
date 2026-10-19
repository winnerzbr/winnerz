import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageEvent, usageLabel } from './usageLabels';

test('a visita conta só a seção, nunca o @ de alguém nem o resto do endereço', () => {
  assert.equal(pageEvent('/'), 'pagina.inicio');
  assert.equal(pageEvent('/colecao/museu?x=1'), 'pagina.colecao');
  assert.equal(pageEvent('/@fulana'), 'pagina.perfil');
  assert.equal(pageEvent('/@fulana/elden-ring'), 'pagina.perfil');
  assert.equal(pageEvent('/t/abc123'), 'pagina.trecho');
  assert.equal(pageEvent('/codigo/SEGREDO'), 'pagina.codigo');
});

test('nomes legíveis para o painel do Studio', () => {
  assert.deepEqual(usageLabel('pagina.jornada'), { area: 'Visitas por área', label: 'Jornada' });
  assert.deepEqual(usageLabel('pagina.@antigo'), { area: 'Visitas por área', label: 'Perfis públicos' });
  assert.equal(usageLabel('retomada.ia').area, 'Jornada');
  assert.equal(usageLabel('oqj.filtro.curto').label, 'Clima escolhido: curto');
  assert.deepEqual(usageLabel('algo.novo'), { area: 'Outros', label: 'algo.novo' });
});
