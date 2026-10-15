import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { verifyDiscord, signState, readState, postFor } from '../../api/discord';

test('confere a assinatura do Discord', () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const raw = (publicKey.export({ format: 'der', type: 'spki' }) as Buffer).subarray(-32).toString('hex');
  const body = '{"type":1}', ts = '1700000000';
  const sig = sign(null, Buffer.from(ts + body), privateKey).toString('hex');
  assert.equal(verifyDiscord(raw, sig, ts, body), true);
  assert.equal(verifyDiscord(raw, sig, ts, body + ' '), false);
  assert.equal(verifyDiscord(raw, 'zz', ts, body), false);
});

test('o "state" do login volta para a mesma pessoa e vence em 15 minutos', () => {
  const st = signState('u-1', 1_000_000, 'segredo');
  assert.equal(readState(st, 'segredo', 1_000_000 + 60_000), 'u-1');
  assert.equal(readState(st, 'outro', 1_000_000 + 60_000), null);
  assert.equal(readState(st, 'segredo', 1_000_000 + 16 * 60_000), null);
  assert.equal(readState(st.replace('u-1', 'u-2'), 'segredo', 1_000_000), null);
});

test('as publicações não levam onde parou nem recado', () => {
  const p = postFor({ kind: 'sessao', handle: 'hev', discordId: '42', game: 'Hades', slug: 'hades', minutes: 95, where: 'Asfódelo' }, 'https://winnerz.com.br');
  const txt = JSON.stringify(p);
  assert.match(txt, /<@42> jogou \*\*Hades\*\* por 1 h 35/);
  assert.doesNotMatch(txt, /Asfódelo/);
  const j = postFor({ kind: 'jogatina', id: 'abc', title: 'Sábado', game: 'Hades', startsAt: '2026-10-17T22:00:00Z', handle: 'hev' }, 'https://winnerz.com.br');
  assert.match(JSON.stringify(j), /winnerz\.com\.br\/jogatina\/abc/);
});
