import { test } from 'node:test';
import assert from 'node:assert/strict';
import { targetLabel, targetLink } from './moderation';

test('rótulo do alvo de cada tipo de denúncia', () => {
  assert.equal(targetLabel('jornada', { game: 'Astro Bot' }), 'Jornada de Astro Bot');
  assert.equal(targetLabel('vitrine', { title: 'Os da vida' }), 'Vitrine “Os da vida”');
  assert.equal(targetLabel('perfil', { handle: 'carol' }), 'Perfil @carol');
  assert.equal(targetLabel('momento', null), 'Já não existe');
});

test('endereço para conferir o alvo', () => {
  assert.equal(targetLink('jornada', 'Carol', 'astro-bot', null), '/@carol/astro-bot');
  assert.equal(targetLink('momento', 'Carol', 'id-1', { slug: 'astro-bot' }), '/@carol/astro-bot');
  assert.equal(targetLink('vitrine', 'Carol', 'v1', null), '/@carol/vitrines/v1');
  assert.equal(targetLink('museu', 'Carol', '', null), '/@carol/museu');
  assert.equal(targetLink('perfil', null, '', null), null);
});
