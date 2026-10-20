import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esticar, mudarTom, vocoder, rms } from './vozDsp';

const TAXA = 24000;
/** Uma "vogal" sintética: harmônicos de f0 com volume subindo e descendo, 1 segundo. */
function vogal(f0: number, s = 1): Float32Array {
  const n = Math.round(TAXA * s), x = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let v = 0;
    for (let h = 1; h <= 12; h++) v += Math.sin((2 * Math.PI * f0 * h * i) / TAXA) / h;
    x[i] = 0.3 * v * (0.6 + 0.4 * Math.sin(i / 2400));
  }
  return x;
}
/** O tom fundamental por autocorrelação (entre 60 e 800 Hz). */
function tom(x: Float32Array): number {
  const ini = Math.floor(x.length * 0.3), n = 4096;
  let melhor = 0, lag = 0;
  for (let l = Math.floor(TAXA / 800); l <= Math.floor(TAXA / 60); l++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += x[ini + i] * x[ini + i + l];
    if (s > melhor) { melhor = s; lag = l; }
  }
  return TAXA / lag;
}

test('esticar: muda a duração e não o tom', () => {
  const x = vogal(150);
  const y = esticar(x, 1.5, TAXA);
  assert.equal(y.length, Math.ceil(x.length * 1.5));
  assert.ok(Math.abs(tom(y) - 150) < 6, `tom ${tom(y)}`);
});

test('mudarTom: sobe o tom e mantém a duração', () => {
  const x = vogal(150);
  for (const st of [5, 7, 12]) {
    const y = mudarTom(x, st, TAXA);
    assert.equal(y.length, x.length);
    const esperado = 150 * Math.pow(2, st / 12);
    assert.ok(Math.abs(tom(y) - esperado) / esperado < 0.05, `+${st}: ${tom(y)} ≠ ${esperado}`);
    assert.ok(!y.some((v) => Number.isNaN(v)));
  }
});

test('vocoder: a saída fica no tom do zumbido, com o volume da voz', () => {
  const x = vogal(130);
  const y = vocoder(x, TAXA, 200);
  assert.equal(y.length, x.length);
  assert.ok(Math.abs(rms(y) - rms(x)) / rms(x) < 0.02);
  assert.ok(Math.abs(tom(y) - 200) < 12, `tom ${tom(y)}`);
});
