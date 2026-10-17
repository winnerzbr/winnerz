/**
 * Abrir um pacote: puxar a fita (ou "Abrir sem puxar"), as figurinhas sobem pela boca do pacote e se abrem em leque,
 * cada uma vira com um toque (as raras brilham antes, a lendária ganha uma cerimônia), e no fim o resumo com
 * "Colar no álbum". Quem sorteia é o banco; aqui é só a cena.
 */
import { useEffect, useRef, useState } from 'react';
import { albumApi, type Pack, type Sticker } from '../../data/albumApi';
import { TIER_LABEL, type Drawn } from '../../lib/album';
import { buildPack, DEFAULT_LIGHT, shadePack, type PackRender } from './packArt';
import { mysteryHTML, stickerHTML } from './render';
import { AURORA, burst, GOLD, HOLO, reduceMotion, sfx, vibrate } from './fx';

type Phase = 'sealed' | 'opening' | 'torn' | 'rising' | 'fanned' | 'ceremony' | 'done';
interface Card { el: HTMLButtonElement; d: Drawn; open: boolean; base: { x: number; y: number; r: number } }

export function PackOpening({ pack, stickers, sections, more, onPaste, onNext, onClose, labels }: {
  pack: Pack; stickers: Record<string, Sticker>; sections: Record<string, string>; more: number;
  onPaste: (contents: Drawn[]) => void; onNext: () => void; onClose: () => void;
  /** Textos dos botões quando o pacote abre fora da página de Pacotes (na Chegada, por exemplo). */
  labels?: { paste?: string; done?: string; later?: string };
}) {
  const root = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('sealed');
  const [status, setStatus] = useState('Pacote fechado · 5 figurinhas');
  const [err, setErr] = useState('');
  const [title, setTitle] = useState('');
  const [result, setResult] = useState<Drawn[] | null>(null);
  const api = useRef<{ quick: () => void; all: () => void } | null>(null);
  const data = useRef({ stickers, sections });
  data.current = { stickers, sections };

  useEffect(() => {
    const pk = root.current!;
    const stickersOf = (id: string) => data.current.stickers[id];
    const stage = pk.querySelector<HTMLDivElement>('.pk__stage')!;
    const packEl = pk.querySelector<HTMLDivElement>('.pk__pack')!;
    const tilt = pk.querySelector<HTMLDivElement>('.pk__tilt')!;
    const hit = pk.querySelector<HTMLButtonElement>('.pk__hit')!;
    const cardsBox = pk.querySelector<HTMLDivElement>('.pk__cards')!;
    const cvs = [...pk.querySelectorAll<HTMLCanvasElement>('canvas.pkc')];
    const motion = !reduceMotion();
    let state: Phase = 'sealed', cards: Card[] = [], openedCount = 0, dragging = false, alive = true;
    let art: PackRender | null = null, contents: Drawn[] | null = null, shadeQ = false;
    const go = (p: Phase) => { state = p; if (alive) setPhase(p); };
    const setP = (p: number) => packEl.style.setProperty('--p', p.toFixed(3));

    // A embalagem (Ônix ou Prisma), desenhada para o tamanho da tela.
    buildPack(pack.kind === 'prisma' ? 'prisma' : 'onix', packEl.clientWidth || 220).then((r) => {
      if (!alive) return; art = r; cvs.forEach((c) => { c.width = r.W; c.height = r.H; }); shadePack(r, cvs);
    }).catch(() => { /* fica sem desenho; ainda dá para abrir */ });
    const queueShade = () => { if (shadeQ || !art) return; shadeQ = true; requestAnimationFrame(() => { shadeQ = false; if (art) shadePack(art, cvs); }); };
    const onMove = (e: PointerEvent) => {
      if (state !== 'sealed' || dragging) return;
      const r = packEl.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width * 1.2))), y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height * 1.2)));
      if (motion) { tilt.style.setProperty('--ry', `${x * 14}deg`); tilt.style.setProperty('--rx', `${-y * 9}deg`); }
      if (art) { art.L = [x * 0.9, y * 0.9, 0.75]; queueShade(); }
    };
    const onLeave = () => { tilt.style.removeProperty('--ry'); tilt.style.removeProperty('--rx'); if (art) { art.L = DEFAULT_LIGHT; queueShade(); } };
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerleave', onLeave);

    // O sorteio começa assim que a pessoa decide abrir; a cena espera a resposta.
    let fetching: Promise<Drawn[]> | null = null;
    const fetchContents = () => (fetching ??= albumApi.open(pack.id).then((c) => (contents = c)));

    const reset = (msg: string) => {
      pk.classList.remove('is-torn', 'is-out', 'is-ceremony'); setP(0); cardsBox.innerHTML = ''; cards = []; fetching = null; contents = null; go('sealed');
      if (alive) { setErr(msg); setStatus('Pacote fechado · 5 figurinhas'); }
    };
    const tear = async () => {
      go('torn'); sfx('rip'); pk.classList.add('is-torn'); if (alive) setStatus('Aberto!');
      const r = packEl.getBoundingClientRect(); burst(r.left + r.width * 0.9, r.top + r.height * 0.15, GOLD, 30, 5);
      try { await Promise.all([fetchContents(), new Promise((res) => setTimeout(res, motion ? 650 : 0))]); }
      catch (e) { reset(e instanceof Error ? e.message : 'Não deu para abrir agora.'); return; }
      if (alive) rise();
    };
    const finishPull = (p: number) => {
      dragging = false;
      if (p >= 0.72) { setP(1); void tear(); return; }
      if (motion) { const s = p, t0 = performance.now(); const back = (now: number) => { const k = Math.min(1, (now - t0) / 320); setP(s * (1 - k) * (1 - k)); if (k < 1) requestAnimationFrame(back); }; requestAnimationFrame(back); } else setP(0);
      if (alive) setStatus('Quase! Puxe até o fim');
    };
    const onDown = (e: PointerEvent) => {
      if (state !== 'sealed') return; e.preventDefault(); dragging = true; hit.setPointerCapture(e.pointerId); if (alive) setErr('');
      void fetchContents().catch(() => {}); // já pede o sorteio enquanto a pessoa puxa
      const r = packEl.getBoundingClientRect(); const x0 = e.clientX; let p = 0, last = 0, ended = false;
      const end = () => { if (ended) return; ended = true; hit.removeEventListener('pointermove', mv); hit.removeEventListener('pointerup', end); hit.removeEventListener('pointercancel', end); finishPull(p); };
      const mv = (ev: PointerEvent) => { p = Math.max(0, Math.min(1, (ev.clientX - x0) / (r.width * 0.8))); setP(p); if (p - last > 0.1) { sfx('tick'); vibrate(4); last = p; } if (p >= 1) end(); };
      hit.addEventListener('pointermove', mv); hit.addEventListener('pointerup', end); hit.addEventListener('pointercancel', end);
    };
    hit.addEventListener('pointerdown', onDown);
    const quick = () => {
      if (state !== 'sealed') return; setErr(''); go('opening'); void fetchContents().catch(() => {});
      if (!motion) { setP(1); void tear(); return; }
      const t0 = performance.now(); const step = (now: number) => { const k = Math.min(1, (now - t0) / 700); setP(k * k * (3 - 2 * k)); if (k < 1) requestAnimationFrame(step); else void tear(); }; requestAnimationFrame(step);
    };
    const onKey = (e: KeyboardEvent) => { if ((e.key === 'Enter' || e.key === ' ') && state === 'sealed') { e.preventDefault(); quick(); } };
    hit.addEventListener('keydown', onKey);

    const cardW = () => (stage.clientWidth < 560 ? Math.min(104, stage.clientWidth / 3.6) : Math.min(150, stage.clientWidth / 6.2));
    const layout = () => {
      const w = cardW(), sw = stage.clientWidth, n = cards.length; stage.style.setProperty('--cw', `${w}px`);
      if (sw < 560) { const pos = [[-1, -0.62], [0, -0.62], [1, -0.62], [-0.5, 0.62], [0.5, 0.62]]; cards.forEach((c, i) => { c.base = { x: pos[i][0] * w * 1.1, y: pos[i][1] * w * 1.45 - 18, r: 0 }; }); }
      else cards.forEach((c, i) => { const k = i - (n - 1) / 2; c.base = { x: k * w * 1.14, y: Math.abs(k) * w * 0.12 - 10, r: k * 4 }; });
    };
    const setBase = (c: Card) => { c.el.style.setProperty('--x', `${c.base.x}px`); c.el.style.setProperty('--y', `${c.base.y}px`); c.el.style.setProperty('--r', `${c.base.r}deg`); c.el.style.setProperty('--s', '1'); };
    const done = () => {
      go('done');
      const list = contents ?? []; const nw = list.filter((d) => !d.dup).length, dp = list.length - nw;
      if (alive) { setResult(list); setStatus(`${nw} ${nw === 1 ? 'nova' : 'novas'} · ${dp} ${dp === 1 ? 'repetida' : 'repetidas'}`); }
    };
    const reveal = (i: number) => {
      const c = cards[i]; if (!c || c.open || state === 'ceremony' || state === 'rising') return;
      if (c.d.tier === 'lendaria' && motion) { ceremony(c); return; }
      c.open = true; c.el.classList.add('is-open');
      const s = stickersOf(c.d.id); c.el.setAttribute('aria-label', `${s?.name ?? 'Figurinha'}, ${TIER_LABEL[c.d.tier]}${c.d.dup ? ', repetida' : ', nova'}`);
      const r = c.el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      sfx(c.d.tier === 'rara' ? 'rare' : c.d.tier === 'incomum' ? 'inc' : 'card');
      if (c.d.tier === 'rara') setTimeout(() => burst(cx, cy, AURORA, 40, 5), 300);
      else if (c.d.tier === 'incomum') setTimeout(() => burst(cx, cy, GOLD, 22, 4), 300);
      else if (c.d.tier === 'lendaria') burst(cx, cy, HOLO, 60, 7);
      openedCount++; if (openedCount === cards.length) done();
    };
    const ceremony = (c: Card) => {
      go('ceremony'); pk.classList.add('is-ceremony'); c.el.classList.add('is-center');
      const s = Math.min(2.1, (stage.clientHeight * 0.62) / (cardW() * 1.4));
      c.el.style.transition = 'transform .9s cubic-bezier(.2,.75,.2,1)';
      c.el.style.setProperty('--x', '0px'); c.el.style.setProperty('--y', '-10px'); c.el.style.setProperty('--r', '0deg'); c.el.style.setProperty('--s', String(s));
      const rot = c.el.querySelector<HTMLDivElement>('.pk__rot')!; sfx('drum');
      if (alive) setTitle(`Lendária · ${stickersOf(c.d.id)?.name ?? ''}`);
      setTimeout(() => {
        rot.style.transition = 'none';
        rot.animate([{ transform: 'rotateY(180deg)' }, { transform: 'rotateY(-560deg)' }], { duration: 1500, easing: 'cubic-bezier(.3,.1,.2,1)' }).onfinish = () => {
          c.open = true; c.el.classList.add('is-open'); rot.style.transform = 'rotateY(0)'; rot.style.transition = '';
          sfx('legend'); const r = c.el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, HOLO, 110, 9, 0.12); setTimeout(() => burst(r.left + r.width / 2, r.top + r.height * 0.3, GOLD, 60, 7), 250);
          if (alive) setStatus('Toque para continuar');
          const back = () => {
            stage.removeEventListener('click', back, true); pk.classList.remove('is-ceremony'); c.el.classList.remove('is-center'); setBase(c);
            go('fanned'); openedCount++; if (openedCount === cards.length) done(); else if (alive) setStatus('Toque em cada figurinha');
          };
          setTimeout(() => stage.addEventListener('click', back, true), 400);
        };
      }, 700);
    };
    const rise = () => {
      go('rising'); cardsBox.innerHTML = ''; cards = [];
      (contents ?? []).forEach((d, i) => {
        const s = stickersOf(d.id);
        const b = document.createElement('button'); b.type = 'button'; b.className = 'pk__card';
        b.setAttribute('aria-label', `Figurinha ${i + 1}, virada para baixo. Toque para revelar`);
        const front = s ? `<div class="wsw alb-face">${stickerHTML(s, data.current.sections[d.id] ?? '')}</div>` : '<div class="wsw alb-face"></div>';
        b.innerHTML = `<div class="pk__rot">${front}<div class="alb-face alb-face--b"${d.tier === 'rara' || d.tier === 'lendaria' ? ` data-hint="${d.tier}"` : ''}><div class="wsw">${mysteryHTML()}</div></div></div><span class="pk__badge ${d.dup ? 'pk__badge--dup' : 'pk__badge--new'}">${d.dup ? 'Repetida +1' : 'Nova'}</span>`;
        cardsBox.append(b); cards.push({ el: b, d, open: false, base: { x: 0, y: 0, r: 0 } });
        b.addEventListener('click', () => reveal(i));
      });
      layout();
      const packR = packEl.getBoundingClientRect(), stR = stage.getBoundingClientRect();
      const mouthY = packR.top - stR.top + packR.height * 0.153;
      cardsBox.style.clipPath = `inset(0 0 ${stR.height - mouthY}px 0)`;
      const centerY = packR.top - stR.top + packR.height / 2 - stR.height / 2;
      cards.forEach((c, i) => { c.el.style.transition = 'none'; c.el.style.setProperty('--x', `${(i - 2) * 3}px`); c.el.style.setProperty('--y', `${centerY + packR.height * 0.25}px`); c.el.style.setProperty('--r', `${(i - 2) * 2}deg`); });
      void cardsBox.offsetWidth;
      cards.forEach((c, i) => { c.el.style.transition = `transform ${motion ? 900 : 0}ms cubic-bezier(.2,.75,.2,1) ${motion ? i * 90 : 0}ms`; c.el.style.setProperty('--y', `${centerY - packR.height * 0.32}px`); });
      setTimeout(() => {
        cardsBox.style.clipPath = 'none'; pk.classList.add('is-out'); sfx('flip');
        cards.forEach((c, i) => { c.el.style.transition = `transform ${motion ? 900 : 0}ms cubic-bezier(.2,.75,.2,1) ${motion ? i * 70 : 0}ms`; setBase(c); });
        go('fanned'); if (alive) setStatus('Toque em cada figurinha');
      }, motion ? 1300 : 0);
    };
    const all = async () => {
      for (let i = 0; i < cards.length; i++) {
        if (cards[i].open) continue;
        if (cards[i].d.tier === 'lendaria' && motion) { reveal(i); break; }
        reveal(i); await new Promise((r) => setTimeout(r, motion ? 380 : 0));
      }
    };
    api.current = { quick, all: () => void all() };
    const onResize = () => { if (cards.length && state !== 'rising') { layout(); cards.forEach((c) => { if (!c.el.classList.contains('is-center')) setBase(c); }); } };
    addEventListener('resize', onResize);
    return () => {
      alive = false; api.current = null;
      stage.removeEventListener('pointermove', onMove); stage.removeEventListener('pointerleave', onLeave);
      hit.removeEventListener('pointerdown', onDown); hit.removeEventListener('keydown', onKey); removeEventListener('resize', onResize);
    };
  }, [pack.id, pack.kind]);

  const fresh = result?.filter((d) => !d.dup).length ?? 0;
  const hint = phase === 'done'
    ? (fresh ? 'As novas já estão na bandeja do álbum, esperando para colar. As repetidas ficam guardadas para as trocas e o Cofre.' : 'Todas repetidas desta vez. Elas ficam guardadas para as trocas e o Cofre.')
    : phase === 'fanned' || phase === 'ceremony' ? 'As de brilho violeta escondem uma Rara. A dourada que treme é Lendária.'
    : 'Arraste o lacre da esquerda para a direita, como um pacote de verdade. Se soltar antes do fim, ele volta.';

  return (
    <div className="pk" ref={root}>
      <div className="pk__wrap">
        <div className="pk__intro">
          <span className="alb-kick">{pack.kind === 'prisma' ? 'Pacote especial' : 'Pacote'}{pack.game ? ` · ${pack.game.title}` : pack.origin === 'memoria' ? ' · memória' : pack.origin === 'boas_vindas' ? ' · boas-vindas' : pack.origin === 'codigo' ? ' · código' : ''}</span>
          <h2 className="t big">{phase === 'done' ? 'Pacote aberto' : 'Puxe a fita'}</h2>
          <p className="muted">{hint}</p>
          {err && <p className="awards__error" role="alert">{err}</p>}
          <span className="pk__status" role="status" aria-live="polite">{status}</span>
          <div className="pk__btns">
            {(phase === 'sealed' || phase === 'opening') && <button className="btn ghost" onClick={() => api.current?.quick()} disabled={phase === 'opening'}>Abrir sem puxar</button>}
            {phase === 'fanned' && <button className="btn ghost" onClick={() => api.current?.all()}>Revelar todas</button>}
            {phase === 'done' && fresh > 0 && <button className="btn now" onClick={() => onPaste(result ?? [])}>{labels?.paste ?? 'Colar no álbum'}</button>}
            {phase === 'done' && more > 0 && <button className="btn ghost" onClick={onNext}>Abrir outro ({more})</button>}
            {(phase === 'done' || phase === 'sealed') && <button className="btn quiet" onClick={onClose}>{phase === 'done' ? (labels?.done ?? 'Ver pacotes') : (labels?.later ?? 'Depois')}</button>}
          </div>
        </div>
        <div className="pk__stage">
          <div className="pk__rays" />
          <div className="pk__dim" />
          <div className="pk__pack">
            <div className="pk__float"><div className="pk__tilt">
              <div className="pk__light" />
              <div className="pk__body"><canvas className="pkc" width={1} height={1} /></div>
              <span className="pk__mouth" />
              <div className="pk__strip"><canvas className="pkc" width={1} height={1} /></div>
              <span className="pk__spark" />
              <span className="pk__grip"><i /></span>
            </div></div>
            <button className="pk__hit" aria-label="Puxar a fita do pacote (ou Enter para abrir)" />
          </div>
          <div className="pk__cards" />
          <div className="pk__ttl">{title}</div>
          {err && <p className="pk__err" role="alert">{err}</p>}
        </div>
      </div>
    </div>
  );
}
