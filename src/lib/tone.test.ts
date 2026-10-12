import { test } from 'node:test';
import assert from 'node:assert/strict';
import { say, TONES } from './tone';

test('cada tom tem frase para cada momento', () => {
  for (const t of TONES) for (const k of ['momento', 'ponto', 'sessao', 'primeira', 'metade', 'dez', 'zerou', 'zerouSub', 'retomou'] as const) assert.ok(say(k, t.id).length > 3, `${k}/${t.id}`);
});
test('sem tom escolhido, usa o encorajador', () => {
  assert.equal(say('zerou'), 'Você chegou ao fim!');
});
