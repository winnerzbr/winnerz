/**
 * Transformação da voz, em JavaScript puro (roda no navegador sobre o áudio inteiro, antes de tocar):
 *   - mudarTom: sobe ou desce o tom sem mudar a duração (estica com WSOLA e depois reamostra). Sem corrigir os
 *     formantes, de propósito: é isso que deixa a voz "pequena", de robozinho.
 *   - vocoder: a voz modula um zumbido eletrônico (dente de serra no tom fixo, com chiado nos agudos para os "s"),
 *     o efeito clássico de voz de robô.
 * Sem dependência de nada: testável no Node (src/lib/vozDsp.test.ts).
 */

/** Estica o áudio no tempo (fator > 1 deixa mais longo) sem mudar o tom: WSOLA com janelas de 30 ms. */
export function esticar(x: Float32Array, fator: number, taxa: number): Float32Array {
  if (Math.abs(fator - 1) < 1e-3) return x.slice();
  const N = Math.max(64, Math.round(0.03 * taxa));
  const Hs = Math.floor(N / 2);
  const Ha = Hs / fator;
  const tol = Math.round(0.008 * taxa);
  const comp = Math.floor(N / 2); // trecho comparado na busca
  const janela = new Float32Array(N);
  for (let i = 0; i < N; i++) janela[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));
  const total = Math.ceil(x.length * fator) + N;
  const y = new Float32Array(total), peso = new Float32Array(total);
  let anterior = 0;
  for (let k = 0; ; k++) {
    const saida = k * Hs;
    const nominal = Math.round(k * Ha);
    if (nominal + N + tol >= x.length || saida + N >= total) break;
    let pos = nominal;
    if (k > 0) {
      // A continuação natural do quadro anterior; acha, perto do lugar nominal, o trecho mais parecido com ela.
      const alvo = anterior + Hs;
      let melhor = -Infinity;
      for (let d = -tol; d <= tol; d++) {
        const p = nominal + d;
        if (p < 0 || p + comp >= x.length || alvo + comp >= x.length) continue;
        let s = 0;
        for (let i = 0; i < comp; i += 2) s += x[p + i] * x[alvo + i];
        if (s > melhor) { melhor = s; pos = p; }
      }
    }
    for (let i = 0; i < N; i++) { y[saida + i] += x[pos + i] * janela[i]; peso[saida + i] += janela[i]; }
    anterior = pos;
  }
  for (let i = 0; i < total; i++) if (peso[i] > 1e-3) y[i] /= peso[i];
  return y.subarray(0, Math.ceil(x.length * fator));
}

/** Reamostra para um novo tamanho (interpolação linear). */
export function reamostrar(x: Float32Array, tamanho: number): Float32Array {
  const y = new Float32Array(tamanho);
  const k = (x.length - 1) / Math.max(1, tamanho - 1);
  for (let i = 0; i < tamanho; i++) {
    const t = i * k, j = Math.floor(t), f = t - j;
    y[i] = x[j] * (1 - f) + (x[Math.min(j + 1, x.length - 1)] ?? 0) * f;
  }
  return y;
}

/** Muda o tom em semitons, mantendo a duração. */
export function mudarTom(x: Float32Array, semitons: number, taxa: number): Float32Array {
  if (Math.abs(semitons) < 0.05) return x.slice();
  const r = Math.pow(2, semitons / 12);
  return reamostrar(esticar(x, r, taxa), x.length);
}

/** Filtro passa-banda (biquad, fórmulas RBJ), aplicado no lugar. */
function passaBanda(x: Float32Array, f0: number, q: number, taxa: number): Float32Array {
  const w = (2 * Math.PI * f0) / taxa, a = Math.sin(w) / (2 * q), cw = Math.cos(w);
  const b0 = a, b2 = -a, a0 = 1 + a, a1 = -2 * cw, a2 = 1 - a;
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = (b0 * x[i] + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}

export const rms = (x: Float32Array) => { let s = 0; for (let i = 0; i < x.length; i++) s += x[i] * x[i]; return Math.sqrt(s / Math.max(1, x.length)); };

/**
 * Vocoder de canais: a voz (modulador) dá o volume de cada faixa de frequência a um zumbido no tom fixo (portadora).
 * tomHz: o tom do zumbido. Os agudos usam chiado, para as consoantes ("s", "x") continuarem claras.
 */
export function vocoder(x: Float32Array, taxa: number, tomHz = 180, faixas = 22): Float32Array {
  const n = x.length;
  const portadora = new Float32Array(n), chiado = new Float32Array(n);
  let fase = 0, semente = 12345;
  for (let i = 0; i < n; i++) {
    fase += tomHz / taxa; if (fase >= 1) fase -= 1;
    portadora[i] = 2 * fase - 1; // dente de serra
    semente = (semente * 1103515245 + 12345) & 0x7fffffff; chiado[i] = (semente / 0x7fffffff) * 2 - 1;
  }
  const y = new Float32Array(n);
  const fMin = 120, fMax = Math.min(7000, taxa * 0.45);
  const env = Math.exp(-1 / (0.012 * taxa)); // o volume de cada faixa segue a voz com ~12 ms
  for (let b = 0; b < faixas; b++) {
    const f = fMin * Math.pow(fMax / fMin, (b + 0.5) / faixas);
    const q = 6;
    const m = passaBanda(x, f, q, taxa);
    const c = passaBanda(f > 3500 ? chiado : portadora, f, q, taxa);
    const cr = rms(c) || 1;
    let e = 0;
    for (let i = 0; i < n; i++) { const a = Math.abs(m[i]); e = a > e ? a : e * env + a * (1 - env); y[i] += (c[i] / cr) * e; }
  }
  const alvo = rms(x), atual = rms(y) || 1;
  for (let i = 0; i < n; i++) y[i] *= alvo / atual;
  return y;
}

/** Mistura: (1 - k) * a + k * b, com o mesmo volume da voz original. */
export function misturar(a: Float32Array, b: Float32Array, k: number): Float32Array {
  const y = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) y[i] = a[i] * (1 - k) + (b[i] ?? 0) * k;
  const alvo = rms(a), atual = rms(y) || 1;
  for (let i = 0; i < y.length; i++) y[i] *= alvo / atual;
  return y;
}
