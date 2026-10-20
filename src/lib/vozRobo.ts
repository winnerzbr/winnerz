/**
 * Filtros de robô para a voz do IAmiguinho (a voz do Google vem limpa; aqui ela vira voz de robô). Tudo no Web Audio,
 * no navegador da cabine: o áudio que chega é tocado através de uma corrente de efeitos, com a intensidade misturando
 * a voz original (seca) com a processada (molhada).
 */
export type FiltroVoz = 'metalico' | 'classico' | 'robozinho' | 'lata' | 'radinho' | 'fliperama' | 'helice' | 'espacial' | 'nenhum';

export const FILTROS: { id: FiltroVoz; nome: string; dica: string }[] = [
  { id: 'metalico', nome: 'Metálico', dica: 'Um brilho de metal por cima da voz. O mais sutil.' },
  { id: 'classico', nome: 'Robô clássico', dica: 'A voz de robô de filme, chiada e vibrando.' },
  { id: 'robozinho', nome: 'Robozinho', dica: 'Mais agudo e um tiquinho mais rápido, com metal leve.' },
  { id: 'lata', nome: 'Cabeça de lata', dica: 'Ecoando dentro da cabeça dele.' },
  { id: 'radinho', nome: 'Radinho', dica: 'Como se falasse por um rádio velho.' },
  { id: 'fliperama', nome: 'Fliperama', dica: 'Som de videogame antigo, em poucos bits.' },
  { id: 'helice', nome: 'Pela hélice', dica: 'A voz tremendo no ritmo da hélice girando.' },
  { id: 'espacial', nome: 'Espacial', dica: 'Robô de nave, com eco e metal.' },
  { id: 'nenhum', nome: 'Sem filtro', dica: 'A voz crua, só para comparar.' },
];
export const filtroValido = (v: unknown): FiltroVoz => (FILTROS.some((f) => f.id === v) ? (v as FiltroVoz) : 'metalico');

type Corrente = { entrada: AudioNode; saida: AudioNode; osc: OscillatorNode[] };

/** Modulação em anel: a voz multiplicada por uma onda (o "robô" clássico). */
function anel(ctx: AudioContext, hz: number, forma: OscillatorType = 'sine'): Corrente {
  const g = ctx.createGain(); g.gain.value = 0;
  const o = ctx.createOscillator(); o.type = forma; o.frequency.value = hz; o.connect(g.gain);
  return { entrada: g, saida: g, osc: [o] };
}
/** Eco curtinho realimentado: um tubo de metal. */
function tubo(ctx: AudioContext, ms: number, volta: number): Corrente {
  const ent = ctx.createGain(), sai = ctx.createGain();
  const d = ctx.createDelay(0.5); d.delayTime.value = ms / 1000;
  const fb = ctx.createGain(); fb.gain.value = volta;
  ent.connect(sai); ent.connect(d); d.connect(fb).connect(d); d.connect(sai);
  return { entrada: ent, saida: sai, osc: [] };
}
function filtro(ctx: AudioContext, tipo: BiquadFilterType, hz: number, q = 0.7, ganho = 0): BiquadFilterNode {
  const f = ctx.createBiquadFilter(); f.type = tipo; f.frequency.value = hz; f.Q.value = q; f.gain.value = ganho; return f;
}
function degraus(ctx: AudioContext, passos: number): WaveShaperNode {
  const ws = ctx.createWaveShaper(); const n = 4096, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.round(x * passos) / passos; }
  ws.curve = c; return ws;
}
function saturar(ctx: AudioContext, k: number): WaveShaperNode {
  const ws = ctx.createWaveShaper(); const n = 2048, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = ((1 + k) * x) / (1 + k * Math.abs(x)); }
  ws.curve = c; return ws;
}
/** Liga uma fila de nós e devolve começo e fim. */
function fila(nos: AudioNode[], osc: OscillatorNode[] = []): Corrente {
  for (let i = 0; i < nos.length - 1; i++) nos[i].connect(nos[i + 1]);
  return { entrada: nos[0], saida: nos[nos.length - 1], osc };
}

function montar(ctx: AudioContext, f: FiltroVoz): Corrente | null {
  switch (f) {
    case 'metalico': { const a = anel(ctx, 70); const p = filtro(ctx, 'peaking', 2800, 1, 4); a.saida.connect(p); return { entrada: a.entrada, saida: p, osc: a.osc }; }
    case 'classico': { const a = anel(ctx, 34); const t = tubo(ctx, 9, 0.35); a.saida.connect(t.entrada); return { entrada: a.entrada, saida: t.saida, osc: a.osc }; }
    case 'robozinho': { const a = anel(ctx, 110); const p = filtro(ctx, 'highshelf', 3000, 0.7, 5); a.saida.connect(p); return { entrada: a.entrada, saida: p, osc: a.osc }; }
    case 'lata': { const t = tubo(ctx, 6, 0.62); const p = filtro(ctx, 'peaking', 1500, 1.2, 7); t.saida.connect(p); return { entrada: t.entrada, saida: p, osc: [] }; }
    case 'radinho': return fila([filtro(ctx, 'highpass', 450), saturar(ctx, 6), filtro(ctx, 'lowpass', 3200), filtro(ctx, 'peaking', 1800, 1, 5)]);
    case 'fliperama': return fila([degraus(ctx, 7), filtro(ctx, 'highpass', 260), filtro(ctx, 'lowpass', 3800)]);
    case 'helice': {
      const g = ctx.createGain(); g.gain.value = 0.55;
      const o = ctx.createOscillator(); o.frequency.value = 13; const prof = ctx.createGain(); prof.gain.value = 0.45; o.connect(prof).connect(g.gain);
      const a = anel(ctx, 90); g.connect(a.entrada);
      return { entrada: g, saida: a.saida, osc: [o, ...a.osc] };
    }
    case 'espacial': {
      const a = anel(ctx, 55); const eco = tubo(ctx, 140, 0.32); const p = filtro(ctx, 'highpass', 200);
      a.saida.connect(eco.entrada); eco.saida.connect(p);
      return { entrada: a.entrada, saida: p, osc: a.osc };
    }
    default: return null;
  }
}

/** Velocidade (e tom) de cada filtro. */
const RITMO: Partial<Record<FiltroVoz, number>> = { robozinho: 1.1, fliperama: 1.04 };

/**
 * Toca o áudio através do filtro. intensidade de 0 a 1 (0 = voz crua, 1 = só o efeito). Devolve uma função que para.
 */
export function tocarComFiltro(ctx: AudioContext, buf: AudioBuffer, f: FiltroVoz, intensidade: number, onFim?: () => void): () => void {
  const k = Math.max(0, Math.min(1, intensidade));
  const src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = RITMO[f] ?? 1;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
  const vol = ctx.createGain(); vol.gain.value = 0.95;
  comp.connect(vol).connect(ctx.destination);
  const c = montar(ctx, f);
  if (!c) { src.connect(comp); }
  else {
    const seco = ctx.createGain(); seco.gain.value = 1 - k * 0.9;
    const molhado = ctx.createGain(); molhado.gain.value = k * 1.15;
    src.connect(seco).connect(comp);
    src.connect(c.entrada); c.saida.connect(molhado).connect(comp);
    c.osc.forEach((o) => o.start());
  }
  let parado = false;
  const parar = () => { if (parado) return; parado = true; try { src.stop(); } catch { /* já parou */ } c?.osc.forEach((o) => { try { o.stop(); } catch { /* já parou */ } }); };
  src.onended = () => { parar(); onFim?.(); };
  src.start();
  return parar;
}
