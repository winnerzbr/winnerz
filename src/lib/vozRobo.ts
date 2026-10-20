/**
 * A voz de robozinho do IAmiguinho. A voz do Google é a base (para a fala sair clara); aqui ela é transformada:
 *   1. tom: sobe sem acelerar a fala (vozDsp.mudarTom), o que tira a cara de adulto;
 *   2. robô: o vocoder, que troca a voz por um zumbido eletrônico falando as mesmas palavras, misturado na medida;
 *   3. metal: a vibração metálica (modulação em anel), ao vivo no Web Audio;
 *   4. efeito extra opcional: lata, radinho, fliperama, hélice ou espacial.
 * Os passos 1 e 2 rodam sobre o áudio inteiro antes de tocar (leva uma fração de segundo).
 */
import { misturar, mudarTom, vocoder } from './vozDsp';

export type EfeitoVoz = 'nenhum' | 'lata' | 'radinho' | 'fliperama' | 'helice' | 'espacial';
export interface AjusteVoz { tom: number; robo: number; metal: number; efeito: EfeitoVoz }

export const EFEITOS: { id: EfeitoVoz; nome: string }[] = [
  { id: 'nenhum', nome: 'Nenhum' },
  { id: 'lata', nome: 'Cabeça de lata' },
  { id: 'radinho', nome: 'Radinho' },
  { id: 'fliperama', nome: 'Fliperama' },
  { id: 'helice', nome: 'Pela hélice' },
  { id: 'espacial', nome: 'Espacial' },
];

export const MODELOS: { id: string; nome: string; dica: string; ajuste: AjusteVoz }[] = [
  { id: 'robozinho', nome: 'Robozinho', dica: 'Pequeno e metálico, ainda bem claro.', ajuste: { tom: 7, robo: 35, metal: 25, efeito: 'nenhum' } },
  { id: 'mini', nome: 'Mini robô', dica: 'Bem agudo, quase um brinquedo.', ajuste: { tom: 11, robo: 25, metal: 20, efeito: 'nenhum' } },
  { id: 'vocoder', nome: 'Robô vocoder', dica: 'O zumbido eletrônico clássico de robô.', ajuste: { tom: 4, robo: 85, metal: 0, efeito: 'nenhum' } },
  { id: 'lata', nome: 'Robô de lata', dica: 'Robozinho com eco de cabeça de metal.', ajuste: { tom: 6, robo: 45, metal: 35, efeito: 'lata' } },
  { id: 'bits', nome: 'Robô 8 bits', dica: 'Saído de um videogame antigo.', ajuste: { tom: 8, robo: 55, metal: 10, efeito: 'fliperama' } },
  { id: 'helice', nome: 'Robô hélice', dica: 'A voz vibrando no ritmo da hélice.', ajuste: { tom: 7, robo: 30, metal: 15, efeito: 'helice' } },
];
export const AJUSTE_PADRAO: AjusteVoz = MODELOS[0].ajuste;

const limitar = (v: unknown, a: number, b: number, d: number) => { const n = Number(v); return Number.isFinite(n) ? Math.max(a, Math.min(b, Math.round(n))) : d; };
export function ajusteValido(v: unknown): AjusteVoz {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<AjusteVoz>;
  return {
    tom: limitar(o.tom, -4, 12, AJUSTE_PADRAO.tom),
    robo: limitar(o.robo, 0, 100, AJUSTE_PADRAO.robo),
    metal: limitar(o.metal, 0, 100, AJUSTE_PADRAO.metal),
    efeito: EFEITOS.some((e) => e.id === o.efeito) ? (o.efeito as EfeitoVoz) : AJUSTE_PADRAO.efeito,
  };
}

/** Passos 1 e 2: o áudio transformado (tom e vocoder), num AudioBuffer novo. */
export function transformar(ctx: BaseAudioContext, buf: AudioBuffer, a: AjusteVoz): AudioBuffer {
  const taxa = buf.sampleRate;
  let x = buf.getChannelData(0);
  if (buf.numberOfChannels > 1) { const r = buf.getChannelData(1); const m = new Float32Array(x.length); for (let i = 0; i < m.length; i++) m[i] = (x[i] + r[i]) / 2; x = m; }
  let y = mudarTom(x, a.tom, taxa);
  if (a.robo > 0) y = misturar(y, vocoder(y, taxa, 140 * Math.pow(2, a.tom / 12)), a.robo / 100);
  const out = ctx.createBuffer(1, y.length, taxa);
  out.getChannelData(0).set(y);
  return out;
}

/* ---- Passos 3 e 4, ao vivo no Web Audio ---- */
type Corrente = { entrada: AudioNode; saida: AudioNode; osc: OscillatorNode[] };

function anel(ctx: BaseAudioContext, hz: number): Corrente {
  const g = ctx.createGain(); g.gain.value = 0;
  const o = ctx.createOscillator(); o.frequency.value = hz; o.connect(g.gain);
  return { entrada: g, saida: g, osc: [o] };
}
function tubo(ctx: BaseAudioContext, ms: number, volta: number): Corrente {
  const ent = ctx.createGain(), sai = ctx.createGain();
  const d = ctx.createDelay(0.5); d.delayTime.value = ms / 1000;
  const fb = ctx.createGain(); fb.gain.value = volta;
  ent.connect(sai); ent.connect(d); d.connect(fb).connect(d); d.connect(sai);
  return { entrada: ent, saida: sai, osc: [] };
}
function filtro(ctx: BaseAudioContext, tipo: BiquadFilterType, hz: number, q = 0.7, ganho = 0): BiquadFilterNode {
  const f = ctx.createBiquadFilter(); f.type = tipo; f.frequency.value = hz; f.Q.value = q; f.gain.value = ganho; return f;
}
function curva(ctx: BaseAudioContext, fn: (x: number) => number): WaveShaperNode {
  const ws = ctx.createWaveShaper(); const n = 4096, c = new Float32Array(n);
  for (let i = 0; i < n; i++) c[i] = fn((i / (n - 1)) * 2 - 1);
  ws.curve = c; return ws;
}
function fila(nos: AudioNode[]): Corrente {
  for (let i = 0; i < nos.length - 1; i++) nos[i].connect(nos[i + 1]);
  return { entrada: nos[0], saida: nos[nos.length - 1], osc: [] };
}
function efeito(ctx: BaseAudioContext, e: EfeitoVoz): Corrente | null {
  switch (e) {
    case 'lata': { const t = tubo(ctx, 6, 0.6); const p = filtro(ctx, 'peaking', 1500, 1.2, 6); t.saida.connect(p); return { entrada: t.entrada, saida: p, osc: [] }; }
    case 'radinho': return fila([filtro(ctx, 'highpass', 450), curva(ctx, (x) => (7 * x) / (1 + 6 * Math.abs(x))), filtro(ctx, 'lowpass', 3200), filtro(ctx, 'peaking', 1800, 1, 5)]);
    case 'fliperama': return fila([curva(ctx, (x) => Math.round(x * 7) / 7), filtro(ctx, 'highpass', 260), filtro(ctx, 'lowpass', 3800)]);
    case 'helice': {
      const g = ctx.createGain(); g.gain.value = 0.6;
      const o = ctx.createOscillator(); o.frequency.value = 13; const p = ctx.createGain(); p.gain.value = 0.4; o.connect(p).connect(g.gain);
      return { entrada: g, saida: g, osc: [o] };
    }
    case 'espacial': { const t = tubo(ctx, 140, 0.32); const p = filtro(ctx, 'highpass', 200); t.saida.connect(p); return { entrada: t.entrada, saida: p, osc: [] }; }
    default: return null;
  }
}

/** Toca o áudio já transformado, com o metal e o efeito extra. Devolve uma função que para. */
export function tocar(ctx: BaseAudioContext, buf: AudioBuffer, a: AjusteVoz, onFim?: () => void): () => void {
  const src = ctx.createBufferSource(); src.buffer = buf;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
  const vol = ctx.createGain(); vol.gain.value = 0.9;
  // Um limitador suave no fim: o eco e o metal podem somar picos, e a live não pode estourar.
  comp.connect(vol).connect(curva(ctx, (x) => Math.tanh(1.2 * x) / Math.tanh(1.2))).connect(ctx.destination);
  const osc: OscillatorNode[] = [];
  // Metal: a voz seca mais a voz multiplicada por uma onda de 45 Hz, na medida.
  const k = a.metal / 100;
  const meio = ctx.createGain();
  const seco = ctx.createGain(); seco.gain.value = 1 - k * 0.7;
  src.connect(seco).connect(meio);
  if (k > 0) { const r = anel(ctx, 45); const m = ctx.createGain(); m.gain.value = k * 1.2; src.connect(r.entrada); r.saida.connect(m).connect(meio); osc.push(...r.osc); }
  const e = efeito(ctx, a.efeito);
  if (e) { const s = ctx.createGain(); s.gain.value = 0.35; const w = ctx.createGain(); w.gain.value = 0.85; meio.connect(s).connect(comp); meio.connect(e.entrada); e.saida.connect(w).connect(comp); osc.push(...e.osc); }
  else meio.connect(comp);
  osc.forEach((o) => o.start());
  let parado = false;
  const parar = () => { if (parado) return; parado = true; try { src.stop(); } catch { /* já parou */ } osc.forEach((o) => { try { o.stop(); } catch { /* já parou */ } }); };
  src.onended = () => { parar(); onFim?.(); };
  src.start();
  return parar;
}
