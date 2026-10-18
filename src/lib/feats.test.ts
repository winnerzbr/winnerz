import { test } from 'node:test';
import assert from 'node:assert/strict';
import { featBadge, sortFeats, speedrunTime } from './feats';

test('feitos saem na ordem da lista, sem repetir', () => {
  const at = '2026-10-18T00:00:00Z';
  const out = sortFeats([{ kind: 'speedrun', at }, { kind: 'platina', at }, { kind: 'platina', at }, { kind: 'cem', at }]);
  assert.deepEqual(out.map((f) => f.kind), ['platina', 'cem', 'speedrun']);
  assert.deepEqual(sortFeats(undefined), []);
});

test('selo do feito inclui o tempo do speedrun', () => {
  assert.equal(featBadge({ kind: 'platina', at: '' }), 'Platina');
  assert.equal(featBadge({ kind: 'speedrun', at: '', detail: '1:42:10' }), 'Speedrun 1:42:10');
});

test('tempo de speedrun aceita formatos comuns', () => {
  assert.equal(speedrunTime('1:42:10'), '1:42:10');
  assert.equal(speedrunTime(' 42:10 '), '42:10');
  assert.equal(speedrunTime('42m'), '42:00');
  assert.equal(speedrunTime('1h 5m'), '1:05:00');
  assert.equal(speedrunTime('rápido'), null);
  assert.equal(speedrunTime(''), null);
});
