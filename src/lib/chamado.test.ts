import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acharChamado, perguntaCompleta } from './chamado';

test('acha o "Ô iamiguinho!" do jeito que o reconhecimento de voz escreve', () => {
  assert.deepEqual(acharChamado('Ô iamiguinho, quantas vezes eu morri?'), { chamou: true, resto: 'quantas vezes eu morri?' });
  assert.deepEqual(acharChamado('o amiguinho o que você acha desse chefe'), { chamou: true, resto: 'o que você acha desse chefe' });
  assert.deepEqual(acharChamado('ia amiguinho me ajuda aqui'), { chamou: true, resto: 'me ajuda aqui' });
  assert.deepEqual(acharChamado('E aí Amiguinho!'), { chamou: true, resto: '' });
  assert.equal(acharChamado('esse chefe é muito difícil').chamou, false);
  assert.equal(acharChamado('amiguinhozinho').chamou, false);
});

test('pergunta curta demais espera a próxima frase', () => {
  assert.equal(perguntaCompleta('oi'), false);
  assert.equal(perguntaCompleta('e aí'), true);
  assert.equal(perguntaCompleta('quantas mortes?'), true);
  assert.equal(perguntaCompleta(''), false);
});
