import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zereiPedeConfirmacao, minutosDaHistoria } from './zerei';

test('zerei: pede confirmação só com pouco tempo e pouco progresso', () => {
  assert.equal(zereiPedeConfirmacao(1, 0), true);
  assert.equal(zereiPedeConfirmacao(1, undefined), true);
  assert.equal(zereiPedeConfirmacao(59, 19), true);
  assert.equal(zereiPedeConfirmacao(60, 0), false, 'uma hora já basta para jogos curtos');
  assert.equal(zereiPedeConfirmacao(5, 20), false, 'progresso informado vale mesmo com pouco tempo registrado');
});

test('zerei: soma só os minutos da História pedida', () => {
  const s = [{ historyId: 'a', minutes: 30 }, { historyId: 'a' }, { historyId: 'b', minutes: 500 }, { historyId: 'a', minutes: 15 }];
  assert.equal(minutosDaHistoria(s, 'a'), 45);
  assert.equal(minutosDaHistoria(s, 'c'), 0);
});
