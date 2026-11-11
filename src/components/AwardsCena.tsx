/* Peças da página do WinnerZ Awards na linguagem da cena de votação:
   o troféu Zênite em 3D (abertura e aba própria), "Por que Zênite" (o sol interativo) e "Como funciona".
   A cena de voto em si continua em pages/Awards.tsx, sem mudança. Estilo em styles/awards-cena.css. */
import { useEffect, useRef, useState } from 'react';
import { mountZenite } from '../lib/zenite3d';

const calmo = () => (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) || document.documentElement.dataset.motion === 'reduzidas';

/** O troféu no fundo da abertura: enquadrado à direita (em cima, no celular), girando bem devagar. */
export function TrofeuAbertura() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    return mountZenite(ref.current, (_dt, t, w, h) => {
      const slim = w < h * 1.15, a = 0.12 + Math.sin(t * 0.16) * (slim ? 0.2 : 0.3), el = -0.08, d = slim ? 14.5 : 12.4, ct = slim ? [0, 1.3, 0] : [0, 2.72, 0];
      const eye = [ct[0] + Math.sin(a) * Math.cos(el) * d, ct[1] + Math.sin(el) * d, ct[2] + Math.cos(a) * Math.cos(el) * d];
      return { eye, ct, x0: slim ? 0 : 0.34, wf: slim ? 1 : 0.66, sel: -1, lit: 1.45, fill: 0.2 };
    }, () => setOn(true));
  }, []);
  return <canvas ref={ref} className={`aw2gl${on ? ' is-on' : ''}`} aria-hidden="true" />;
}

/** As quatro partes do troféu: nome, material no modelo, para onde a câmera olha, distância, texto e cor da tira. */
const PARTES: [string, number, number[], number, string, string][] = [
  ['A figura', 0, [0, 3.2, 0], 7.4, 'A figura em ouro, de braço erguido para o alto, com a bandeira e o manto ao vento. É quem joga, no momento em que chega lá.', 'radial-gradient(ellipse at 40% 30%,#F6E2B0,#B98A3E 40%,#3a2a10 80%)'],
  ['O símbolo', 1, [-1.2, 4.75, 0.3], 2.6, 'Na bandeira, em prata polida, o símbolo da Jornada: a marca de cada história vivida dentro de um jogo.', 'radial-gradient(ellipse at 50% 30%,#ffffff,#AEB6C2 40%,#22262c 80%)'],
  ['A base', 2, [-0.35, 0.15, 0.35], 5.2, 'A base de diamante, transparente e lapidada. É o chão de onde a subida começa.', 'linear-gradient(120deg,#0c1016 30%,#9fc4ff 41%,#0c1016 46%,#0c1016 60%,#ffe2b0 64%,#0c1016 70%)'],
  ['O logo', 3, [-0.73, 0.12, 0.85], 2.8, 'O logo WinnerZ em ouro, em relevo na frente da base.', 'radial-gradient(ellipse at 60% 40%,#fff3d6,#E2BE84 36%,#4a3413 80%)'],
];
const INTEIRO = { tg: [0, 2.75, 0], dist: 13.2 };

/** Aba "Troféu Zênite": o troféu para girar, com as quatro partes de perto. */
export function ZeniteCena() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [part, setPart] = useState(-1);
  const [on, setOn] = useState(false);
  const z = useRef({ ang: 0.25, el: 0.08, va: 0.2, dist: INTEIRO.dist, cd: INTEIRO.dist, tg: [...INTEIRO.tg], ct: [...INTEIRO.tg], part: -1, drag: false, lx: 0, ly: 0 });

  useEffect(() => {
    if (!ref.current) return;
    const parado = calmo();
    const up = () => { z.current.drag = false; };
    addEventListener('pointerup', up);
    const off = mountZenite(ref.current, (dt) => {
      const Z = z.current;
      if (!Z.drag) { Z.va += ((parado ? 0 : 0.2) - Z.va) * 0.02; Z.ang += Z.va * dt; }
      const k = 1 - Math.exp(-dt * 3);
      Z.cd += (Z.dist - Z.cd) * k;
      for (let i = 0; i < 3; i++) Z.ct[i] += (Z.tg[i] - Z.ct[i]) * k;
      const eye = [Z.ct[0] + Math.sin(Z.ang) * Math.cos(Z.el) * Z.cd, Z.ct[1] + Math.sin(Z.el) * Z.cd, Z.ct[2] + Math.cos(Z.ang) * Math.cos(Z.el) * Z.cd];
      // No celular o troféu fica na metade direita; inteiro, aparece um pouco mais afastado e mais para cima.
      const cel = innerWidth <= 760, todo = cel && Z.part < 0;
      let ct = Z.ct;
      if (todo) { for (let i = 0; i < 3; i++) eye[i] = Z.ct[i] + (eye[i] - Z.ct[i]) * 1.16; eye[1] -= 0.5; ct = [Z.ct[0], Z.ct[1] - 0.5, Z.ct[2]]; }
      return { eye, ct, x0: cel ? 0.46 : 0, wf: cel ? 0.54 : 0.62, sel: Z.part >= 0 ? PARTES[Z.part][1] : -1, lit: Z.part >= 2 ? 1.45 : 1.15, fill: 0.12 };
    }, () => setOn(true));
    return () => { removeEventListener('pointerup', up); off(); };
  }, []);

  const escolher = (i: number) => {
    const n = part === i ? -1 : i, Z = z.current, p = PARTES[n];
    Z.part = n; Z.tg = p ? [...p[2]] : [...INTEIRO.tg]; Z.dist = p ? p[3] : INTEIRO.dist;
    if (n === 3) Z.ang = 0;
    setPart(n);
  };
  const p = PARTES[part];

  return (
    <div className="scene zen has">
      <div className="scene__row">
        <div
          className="scene__p on"
          onPointerDown={(e) => { const Z = z.current; Z.drag = true; Z.lx = e.clientX; Z.ly = e.clientY; }}
          onPointerMove={(e) => { const Z = z.current; if (!Z.drag) return; const dx = e.clientX - Z.lx; Z.ang -= dx * 0.008; Z.va = -dx * 0.5; Z.el = Math.max(-0.25, Math.min(0.7, Z.el + (e.clientY - Z.ly) * 0.004)); Z.lx = e.clientX; Z.ly = e.clientY; }}
          onPointerCancel={() => { z.current.drag = false; }}
        >
          <span className="aw2zen__bg" aria-hidden="true" />
          <canvas ref={ref} className={`aw2gl${on ? ' is-on' : ''}`} role="img" aria-label="Troféu Zênite em 3D: figura em ouro de braço erguido, com bandeira ao vento, sobre base de diamante" />
          <span className="scene__shade" aria-hidden="true" />
          <span className="scene__leak" aria-hidden="true" />
          <span className="scene__ttl" key={part}>
            <span className={`scene__tag${p ? '' : ' ghosty'}`}>{p ? `Parte ${part + 1} de 4` : 'O troféu do WinnerZ Awards'}</span>
            <span className="scene__nm">{p ? p[0] : 'Zênite'}</span>
            <span className="scene__hint">{p ? p[4] : 'Arraste o troféu para girar. Toque numa das tiras para ver cada parte de perto.'}</span>
          </span>
        </div>
        {PARTES.map((q, i) => (
          <button key={q[0]} className={`scene__p${part === i ? ' sel' : ''}`} aria-pressed={part === i} aria-label={q[0]} onClick={() => escolher(i)}>
            <span className="aw2zen__img" style={{ background: q[5] }} aria-hidden="true" />
            <span className="scene__shade" aria-hidden="true" />
            <span className="scene__vt" aria-hidden="true">0{i + 1} · {q[0]}</span>
          </button>
        ))}
      </div>
      <span className="scene__grain" aria-hidden="true" />
      <span className="scene__flare" key={`f${part}`} aria-hidden="true" />
      <span className="scene__ghost" aria-hidden="true" />
      <span className="scene__ghost scene__ghost--2" aria-hidden="true" />
      <span className="scene__flash" key={`x${part}`} aria-hidden="true" />
      <span className="scene__lb scene__lb--t" aria-hidden="true" />
      <span className="scene__lb scene__lb--b" aria-hidden="true" />
      <div className="scene__top">
        <div className="scene__head"><h2 className="t">Troféu Zênite</h2></div>
        <span className="kicker">Arraste para girar</span>
      </div>
      <div className="scene__bottom">
        <span className="scene__desc">Ouro, prata e diamante</span>
        {part >= 0 && <button className="kicker scene__next" onClick={() => escolher(part)}>Ver o troféu inteiro</button>}
      </div>
    </div>
  );
}

/** "Por que Zênite": a pessoa leva o sol pelo arco do céu; no ponto mais alto, o risco de luz da votação acende.
 *  O sol segue o mouse, o dedo (arrastando) ou as setas. Nada fica em repetição: o desenho para quando o sol para. */
export function SolZenite() {
  const box = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const A = box.current, C = cv.current, X = C?.getContext('2d');
    if (!A || !C || !X) return;
    const parado = calmo();
    const S = { v: 0, tv: 0.42, f: 0 };
    let raf = 0, down = false, visto = false;
    const ez = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3));
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
    const glow = (x: number, y: number, r: number, c: string, a: number) => { const g = X.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${c},${a})`); g.addColorStop(1, `rgba(${c},0)`); X.fillStyle = g; X.fillRect(x - r, y - r, r * 2, r * 2); };
    const flare = (x: number, y: number, len: number, a: number) => {
      if (a <= 0) return;
      const g = X.createLinearGradient(x - len, 0, x + len, 0);
      g.addColorStop(0, 'rgba(120,170,255,0)'); g.addColorStop(0.3, `rgba(120,170,255,${0.45 * a})`); g.addColorStop(0.5, `rgba(255,243,224,${a})`); g.addColorStop(0.68, `rgba(255,178,91,${0.7 * a})`); g.addColorStop(1, 'rgba(255,178,91,0)');
      X.fillStyle = g; X.fillRect(x - len, y - 1, len * 2, 2); X.globalAlpha = 0.35 * a; X.fillRect(x - len, y - 4, len * 2, 8); X.globalAlpha = 1; glow(x, y, 90 * a + 10, '255,214,150', 0.5 * a);
    };
    const sun = (x: number, y: number, k: number) => { glow(x, y, 120 * k, '255,178,91', 0.28); glow(x, y, 46 * k, '255,226,170', 0.8); X.fillStyle = '#fff'; X.beginPath(); X.arc(x, y, 9 * k, 0, 7); X.fill(); };
    const txt = (t: string, x: number, y: number, a: number, al: CanvasTextAlign = 'left', c = '255,226,184') => { X.font = '500 11px "IBM Plex Mono",ui-monospace,monospace'; X.textAlign = al; X.fillStyle = `rgba(${c},${a})`; try { (X as unknown as { letterSpacing: string }).letterSpacing = '2px'; } catch { /* navegador antigo */ } X.fillText(t, x, y); };
    const line = (x1: number, y1: number, x2: number, y2: number, c: string | CanvasGradient, w = 1, dash: number[] = []) => { X.strokeStyle = c; X.lineWidth = w; X.setLineDash(dash); X.beginPath(); X.moveTo(x1, y1); X.lineTo(x2, y2); X.stroke(); X.setLineDash([]); };

    const draw = () => {
      const r = C.getBoundingClientRect(), dp = Math.min(devicePixelRatio || 1, 2), W = r.width, H = r.height;
      if (W < 2) { raf = 0; return; }
      if (C.width !== Math.round(W * dp) || C.height !== Math.round(H * dp)) { C.width = Math.round(W * dp); C.height = Math.round(H * dp); }
      const top = S.tv === 1;
      if (parado) { S.v = S.tv; S.f = top ? 1 : 0; } else { S.v += (S.tv - S.v) * 0.13; S.f += ((top && Math.abs(S.v - 1) < 0.03 ? 1 : 0) - S.f) * 0.08; }
      const v = S.v, f = ez(S.f), hy = H * 0.52, tp = H * 0.16, x0 = W * 0.14, x1 = W * 0.5;
      const P = (q: number) => { const k = q <= 1 ? q : 2 - q, x = lerp(x0, x1, k); return [q <= 1 ? x : W - x, hy - (hy - tp) * (1 - (1 - k) * (1 - k))]; };
      const alt = 1 - (1 - v) * (1 - v), deg = Math.round(alt * 90);
      X.setTransform(dp, 0, 0, dp, 0, 0); X.clearRect(0, 0, W, H);
      const sk = X.createLinearGradient(0, 0, 0, hy); sk.addColorStop(0, `rgba(120,150,230,${0.05 * alt + 0.05 * f})`); sk.addColorStop(1, `rgba(255,178,91,${0.05 + 0.13 * alt})`); X.fillStyle = sk; X.fillRect(0, 0, W, hy);
      for (let i = 0; i < 46; i++) { X.fillStyle = `rgba(230,236,246,${(0.15 + 0.55 * rnd(i + 2)) * (1 - alt) * (1 - alt)})`; X.fillRect(rnd(i) * W, rnd(i + 60) * hy * 0.92, 1.3, 1.3); }
      line(0, hy, W, hy, 'rgba(255,214,150,.26)');
      X.strokeStyle = 'rgba(255,255,255,.12)'; X.setLineDash([3, 7]); X.beginPath(); for (let q = 0; q <= 2.001; q += 0.02) { const p = P(q); if (q) X.lineTo(p[0], p[1]); else X.moveTo(p[0], p[1]); } X.stroke(); X.setLineDash([]);
      const marcas: [number, string][] = W < 560 ? [[0, '0°'], [0.5, '45°'], [1, '90°']] : [[0, '0° · horizonte'], [0.5, '45°'], [1, '90° · zênite']];
      for (const [d, l] of marcas) { const y = lerp(hy, tp, d); line(W - 56, y, W - 24, y, 'rgba(255,255,255,.26)'); txt(l, W - 64, y + 4, d === 1 ? 0.5 + 0.5 * f : 0.5, 'right', d === 1 && f > 0.5 ? '255,226,184' : '201,206,212'); }
      const my = lerp(hy, tp, alt); line(W - 56, my, W - 24, my, 'rgba(255,226,170,.95)', 2);
      const s = P(v); X.lineWidth = 2; X.beginPath(); for (let q = 0; q <= v; q += 0.01) { const p = P(q); if (q) X.lineTo(p[0], p[1]); else X.moveTo(p[0], p[1]); } X.lineTo(s[0], s[1]);
      const g = X.createLinearGradient(x0, 0, s[0], 0); g.addColorStop(0, 'rgba(255,178,91,0)'); g.addColorStop(1, 'rgba(255,226,170,.9)'); X.strokeStyle = g; X.stroke();
      line(s[0], s[1], s[0], hy, `rgba(255,255,255,${0.1 * (1 - f)})`, 1, [2, 6]); sun(s[0], s[1], 0.55 + 0.5 * alt + 0.3 * f); flare(s[0], s[1], W * 0.46 * f, f);
      txt(`${deg}°`, s[0] + 24, s[1] + 4, 0.9 * (1 - f)); txt('ZÊNITE · O PONTO MAIS ALTO', s[0] + 26, s[1] - 20, f);
      A.setAttribute('aria-valuenow', String(deg)); A.classList.toggle('hit', top && S.f > 0.6);
      raf = !parado && (Math.abs(S.tv - S.v) > 0.0006 || Math.abs((top ? 1 : 0) - S.f) > 0.004) ? requestAnimationFrame(draw) : 0;
    };
    const go = (v: number) => { v = Math.max(0, Math.min(2, v)); if (Math.abs(v - 1) < 0.07) v = 1; S.tv = v; if (!raf) raf = requestAnimationFrame(draw); };
    const at = (e: PointerEvent) => { const r = C.getBoundingClientRect(); go((e.clientX - r.left - r.width * 0.14) / (r.width * 0.36)); };
    const onDown = (e: PointerEvent) => { down = true; at(e); };
    const onUp = () => { down = false; };
    const onMove = (e: PointerEvent) => { if (e.pointerType === 'mouse' || down) at(e); };
    const onKey = (e: KeyboardEvent) => {
      const k = ({ ArrowRight: 0.08, ArrowUp: 0.08, ArrowLeft: -0.08, ArrowDown: -0.08 } as Record<string, number>)[e.key];
      if (k) { e.preventDefault(); const n = S.tv + k; go((S.tv < 1 && n > 1) || (S.tv > 1 && n < 1) ? 1 : n); }
      else if (e.key === 'Home') { e.preventDefault(); go(0); }
      else if (e.key === 'End') { e.preventDefault(); go(1); }
    };
    const onResize = () => { if (!raf) raf = requestAnimationFrame(draw); };
    A.addEventListener('pointerdown', onDown); A.addEventListener('pointermove', onMove); A.addEventListener('pointercancel', onUp); A.addEventListener('keydown', onKey);
    addEventListener('pointerup', onUp); addEventListener('resize', onResize);
    let io: IntersectionObserver | null = null;
    try { io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting && !visto) { visto = true; S.v = 0; go(S.tv); } }, { threshold: 0.5 }); io.observe(A); } catch { go(S.tv); }
    return () => { cancelAnimationFrame(raf); io?.disconnect(); A.removeEventListener('pointerdown', onDown); A.removeEventListener('pointermove', onMove); A.removeEventListener('pointercancel', onUp); A.removeEventListener('keydown', onKey); removeEventListener('pointerup', onUp); removeEventListener('resize', onResize); };
  }, []);
  return (
    <div ref={box} className="aw2arc" tabIndex={0} role="slider" aria-label="Altura do sol no céu, em graus" aria-valuemin={0} aria-valuemax={90} aria-valuenow={0}>
      <canvas ref={cv} aria-hidden="true" />
      <span className="scene__grain" aria-hidden="true" />
      <div className="aw2arc__cp">
        <span className="kicker" style={{ color: '#FFE2B8' }}>O ponto mais alto do céu</span>
        <b>O mais alto que um jogo chega</b>
        <p>Zênite é o ponto mais alto do céu: aquele que fica bem acima da sua cabeça. O troféu tem esse nome porque é o ponto mais alto que um jogo alcança no WinnerZ Awards. Quem leva o troféu chegou ao zênite.</p>
      </div>
    </div>
  );
}

const PASSOS: [string, string, string][] = [
  ['Você escolhe', 'Em cada categoria, toque na arte do jogo que merece. A cena abre e o voto fica gravado. Dá para mudar até o fim.', 'radial-gradient(ellipse at 30% 30%,#7d5a2a,#2a1d0c 45%,transparent 70%),linear-gradient(160deg,#17120a,#07080a)'],
  ['O resultado fica lacrado', 'Ninguém vê parciais: nem você, nem a administração. O resultado só existe na hora da revelação.', 'radial-gradient(ellipse at 60% 40%,#3d4a66,#141a26 45%,transparent 70%),linear-gradient(160deg,#0c1016,#07080a)'],
  ['A revelação', 'Na data marcada, cada categoria abre com o vencedor em tela larga, e o Zênite ganha dono.', 'radial-gradient(ellipse at 50% 30%,#c9a45a,#4a3413 40%,transparent 70%),linear-gradient(160deg,#1a1207,#07080a)'],
];

/** Aba "Como funciona": três faixas. `artes` são imagens de indicados (não revelam nada); sem elas, ficam as cores. */
export function ComoFunciona({ artes = [] }: { artes?: string[] }) {
  return (
    <div className="scene scene--steps has">
      <div className="scene__row">
        {PASSOS.map((s, i) => (
          <div key={s[0]} className="scene__p on">
            {artes[i] ? <img className="scene__img" src={artes[i]} alt="" loading="lazy" /> : <span className="aw2steps__art" style={{ background: s[2] }} aria-hidden="true" />}
            <span className="scene__shade" aria-hidden="true" />
            <span className="aw2steps__num">0{i + 1}</span>
            <span className="scene__name"><b>{s[0]}</b><span className="aw2steps__p">{s[1]}</span></span>
          </div>
        ))}
      </div>
      <span className="scene__grain" aria-hidden="true" />
      <span className="scene__flare" aria-hidden="true" />
      <span className="scene__lb scene__lb--t" aria-hidden="true" />
      <span className="scene__lb scene__lb--b" aria-hidden="true" />
    </div>
  );
}
