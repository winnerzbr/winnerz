/**
 * O Álbum da Galera: um livro como os da Temporada, mas da comunidade. Cada pessoa da Galera tem o seu espaço, pelo
 * número de chegada (só os números de quem participa, sem buracos). As figurinhas tiradas nos pacotes esperam na
 * bandeja para colar; quem saiu vira aposentada. O álbum nunca fecha: sempre chega gente nova.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../data/store';
import { galeraApi, type GaleraCard as Card, type GaleraCollection } from '../../data/galeraApi';
import { coverHTML, esc, logoGold } from '../album/render';
import { loadPageFlip } from '../album/AlbumBook';
import { burst, DUST, GOLD, reduceMotion, sfx } from '../album/fx';
import { galeraHTML, ghostHTML, n3 } from './render';
import { GaleraCard } from './GaleraCard';
import { GaleraSheet } from './GaleraSection';

const PER_PAGE = 6;
export const GALERA_BOOK = { title: 'Galera', subtitle: 'A comunidade WinnerZ', cover: '/galera/litoral.webp' };

interface PF {
  loadFromHTML(els: HTMLElement[]): void; on(ev: string, cb: (e: { data: unknown }) => void): void; flip(i: number, corner?: string): void;
  flipNext(c?: string): void; flipPrev(c?: string): void; turnToPage(i: number): void; turnToNextPage(): void; turnToPrevPage(): void;
  getCurrentPageIndex(): number; getPageCount(): number; getOrientation(): string; getState(): string; destroy(): void;
}

/** Os espaços do álbum: quem está na Galera mais as aposentadas que você guardou, em ordem de número. */
export function galeraSlots(col: GaleraCollection): number[] {
  return [...new Set([...col.slots, ...col.cards.filter((c) => c.number != null).map((c) => c.number as number)])].sort((a, b) => a - b);
}

export function GaleraBook({ col, vol, onChange, onBack }: { col: GaleraCollection; vol: number; onChange: (c: GaleraCollection) => void; onBack: () => void }) {
  const handle = useStore((s) => s.profile?.name ?? null);
  const slots = useMemo(() => galeraSlots(col), [col]);
  const byNum = useMemo(() => new Map(col.cards.filter((c) => c.number != null).map((c) => [c.number as number, c])), [col.cards]);
  const tray = col.cards.filter((c) => !c.retired && !c.pasted);
  const have = col.cards.filter((c) => c.pasted || c.retired).length;
  const total = slots.length;
  const sig = useMemo(() => JSON.stringify([slots, col.cards.map((c) => [c.number, c.retired, c.scene, c.portrait, c.phrase, c.name, c.game, c.handle])]), [slots, col.cards]);
  const wrap = useRef<HTMLDivElement>(null);
  const flip = useRef<PF | null>(null);
  const live = useRef({ byNum, col });
  live.current = { byNum, col };
  const [open, setOpen] = useState<Card | null>(null);
  const [status, setStatus] = useState('Capa');
  const [ready, setReady] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const motion = !reduceMotion();

  const cardEl = (c: Card): HTMLElement => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'glr is-still glr-book__card';
    b.setAttribute('aria-label', `@${c.handle}, nº ${n3(c.number)}. Ver de perto`);
    b.innerHTML = galeraHTML(c);
    (['pointerdown', 'mousedown', 'touchstart'] as const).forEach((ev) => b.addEventListener(ev, (e) => e.stopPropagation(), { passive: true }));
    b.addEventListener('click', (e) => { e.stopPropagation(); setOpen(c); });
    return b;
  };
  const ghostEl = (n: number): HTMLElement => { const d = document.createElement('div'); d.className = 'glr is-still'; d.innerHTML = ghostHTML('gone', n); return d; };

  useEffect(() => {
    const host = wrap.current!; let alive = true;
    host.innerHTML = '<div class="alb-book"></div>';
    const el = host.querySelector<HTMLDivElement>('.alb-book')!;
    const add = (html: string, hard = false) => { const d = document.createElement('div'); d.className = 'alb-page'; if (hard) d.dataset.density = 'hard'; d.innerHTML = html; el.append(d); return d; };
    add(`<div class="alb-cover-page">${coverHTML(GALERA_BOOK, vol)}</div>`, true);
    const list: string[] = [];
    list.push(`<div class="alb-pg alb-pg--center"><span class="alb-pg__kick">Álbum da comunidade</span><span class="alb-pg__mark">${logoGold()}</span><h3 class="alb-pg__ttl">Galera</h3><p class="alb-pg__desc">Cada pessoa tem o seu espaço, pelo número de chegada. Elas saem como +1 nos pacotes. Este álbum nunca fecha: sempre chega gente nova.</p>${handle ? `<p class="alb-pg__desc">Este álbum pertence a @${esc(handle)}</p>` : ''}<span class="alb-pg__kick" data-count>${have} de ${total} coladas</span></div>`);
    if (!slots.length) list.push('<div class="alb-pg alb-pg--center"><span class="alb-pg__kick">Galera</span><h3 class="alb-pg__ttl">A Galera está chegando</h3><p class="alb-pg__desc">Quando as primeiras pessoas fizerem a figurinha delas, os espaços aparecem aqui.</p></div>');
    for (let k = 0; k < slots.length; k += PER_PAGE) {
      const chunk = slots.slice(k, k + PER_PAGE);
      const first = chunk[0], last = chunk[chunk.length - 1];
      const kick = last <= 100 ? 'Fundadores' : first <= 100 ? 'Fundadores e Galera' : 'Galera';
      const cells = chunk.map((n) => {
        const c = live.current.byNum.get(n);
        const shown = c && (c.retired || c.pasted);
        return `<div class="alb-slot" data-slot="${n}">${shown ? '' : `<div class="alb-well" data-well="${n}"><span>${n3(n)}</span></div>`}<span class="alb-slot__cap">${c && !c.retired && c.pasted ? `<b>@${esc(c.handle)}</b>` : ''}${n3(n)}</span></div>`;
      }).join('');
      list.push(`<div class="alb-pg" data-page="${k}"><span class="alb-pg__kick">${kick}</span><h3 class="alb-pg__ttl">Nº ${n3(first)}${chunk.length > 1 ? ` a ${n3(last)}` : ''}</h3><div class="alb-slots${chunk.length > 3 ? ' alb-slots--many' : ''}">${cells}</div><span class="alb-pg__num">${String(list.length + 1).padStart(2, '0')}</span></div>`);
    }
    list.push('<div class="alb-pg alb-pg--center"><span class="alb-pg__kick">Continua</span><h3 class="alb-pg__ttl">A Galera não para de chegar</h3><p class="alb-pg__desc">Quando alguém novo entrar, o espaço dele aparece aqui.</p></div>');
    if ((list.length + 2) % 2 !== 0) list.push('<div class="alb-pg alb-pg--center"><span class="alb-pg__kick">Anotações</span></div>');
    list.forEach((html, i) => { const d = add(html); d.firstElementChild!.classList.add((i + 1) % 2 === 1 ? 'alb-pg--l' : 'alb-pg--r'); });
    add(`<div class="alb-cover-page">${coverHTML({ title: 'WinnerZ', subtitle: 'Uma coleção de histórias', cover: GALERA_BOOK.cover }, vol)}</div>`, true);
    el.querySelectorAll<HTMLElement>('.alb-slot[data-slot]').forEach((slot) => {
      const c = live.current.byNum.get(Number(slot.dataset.slot));
      if (c?.retired) slot.prepend(ghostEl(c.number ?? 0)); else if (c?.pasted) slot.prepend(cardEl(c));
    });
    loadPageFlip().then(() => {
      if (!alive || !window.St) return;
      const MH = Math.max(420, Math.min(680, innerHeight - (innerWidth < 640 ? 250 : 300)));
      const MW = Math.min(500, Math.round((MH * 460) / 640));
      host.style.maxWidth = `${innerWidth >= 640 ? 2 * MW : 500}px`;
      const pf = new window.St.PageFlip(el, { width: 460, height: 640, size: 'stretch', minWidth: 250, maxWidth: MW, minHeight: 350, maxHeight: MH, maxShadowOpacity: 0.6, flippingTime: motion ? 1000 : 1,
        showCover: true, usePortrait: true, autoSize: true, mobileScrollSupport: false, useMouseEvents: true, showPageCorners: motion, disableFlipByClick: true, clickEventForward: true, swipeDistance: 30 }) as unknown as PF;
      pf.loadFromHTML([...el.querySelectorAll<HTMLElement>('.alb-page')]);
      pf.on('flip', () => update());
      pf.on('changeOrientation', () => update());
      pf.on('changeState', (e) => { if (e.data === 'flipping') sfx('flip'); });
      flip.current = pf; setReady(true); update();
    }).catch(() => { if (alive) setErr('A virada de página não carregou. Recarregue a página.'); });
    return () => { alive = false; try { flip.current?.destroy(); } catch { /* já foi */ } flip.current = null; setReady(false); host.innerHTML = ''; };
  }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps

  function update() {
    const pf = flip.current; if (!pf) return;
    const p = pf.getCurrentPageIndex(), last = pf.getPageCount() - 1, portrait = pf.getOrientation() === 'portrait';
    setStatus(p === 0 ? 'Capa' : p >= last ? 'Contracapa' : portrait ? `Página ${p}` : `Páginas ${p}–${p + 1}`);
    setAtStart(p === 0); setAtEnd(p >= last);
    const t = new Set(tray.map((c) => c.number));
    wrap.current?.querySelectorAll<HTMLElement>('.alb-well').forEach((w) => w.classList.toggle('is-target', t.has(Number(w.dataset.well))));
  }
  useEffect(() => { update(); const c = wrap.current?.querySelector('[data-count]'); if (c) c.textContent = `${have} de ${total} coladas`; }); // marca os espaços das novas e atualiza a contagem
  const wellOf = (n: number) => wrap.current?.querySelector<HTMLElement>(`[data-well="${n}"]`) ?? null;
  const pageIndexOf = (n: number) => [...(wrap.current?.querySelectorAll('.alb-page') ?? [])].findIndex((p) => p.querySelector(`[data-well="${n}"]`));
  const turn = (d: number) => {
    const pf = flip.current; if (!pf || pf.getState() !== 'read') return;
    if (motion) { if (d > 0) pf.flipNext('bottom'); else pf.flipPrev('bottom'); } else if (d > 0) pf.turnToNextPage(); else pf.turnToPrevPage();
  };
  async function goTo(n: number) {
    const pf = flip.current; const idx = pageIndexOf(n); if (!pf || idx < 0) return;
    const cur = pf.getCurrentPageIndex(); const vis = pf.getOrientation() === 'portrait' ? [cur] : [cur, cur + 1];
    if (vis.includes(idx)) return;
    if (motion) { pf.flip(idx, 'bottom'); await new Promise((r) => setTimeout(r, 1150)); } else pf.turnToPage(idx);
    update();
  }
  function place(c: Card) {
    const n = c.number ?? 0; const well = wellOf(n); if (!well) return;
    const slot = well.parentElement!; const r = well.getBoundingClientRect();
    well.remove(); const st = cardEl({ ...c, pasted: true }); slot.prepend(st);
    const cap = slot.querySelector('.alb-slot__cap'); if (cap) cap.innerHTML = `<b>@${esc(c.handle)}</b>${n3(n)}`;
    if (motion) {
      st.animate([{ transform: 'scale(1.16) rotate(-4deg)' }, { transform: 'scale(.95) rotate(.6deg)', offset: 0.55 }, { transform: 'none' }], { duration: 850, easing: 'cubic-bezier(.2,.8,.25,1)' });
      setTimeout(() => { sfx('thump'); burst(r.left + r.width / 2, r.top + r.height * 0.95, DUST, 26, 3.2, 0.12); }, 330);
      setTimeout(() => burst(r.left + r.width / 2, r.top + r.height / 2, GOLD, 30, 5), 420);
    } else sfx('thump');
  }
  async function paste(c: Card, from: HTMLElement | null) {
    if (!c.owner || c.number == null) return;
    await goTo(c.number);
    const well = wellOf(c.number);
    if (well && from && motion) {
      const a = from.getBoundingClientRect(), b = well.getBoundingClientRect();
      const g = document.createElement('div'); g.className = 'alb-ghost glr is-still'; g.style.width = `${a.width}px`; g.innerHTML = galeraHTML(c); document.body.append(g);
      const s = b.width / a.width, mx = (a.left + b.left) / 2, my = Math.min(a.top, b.top) - 80;
      await new Promise<void>((done) => { g.animate([{ transform: `translate(${a.left}px,${a.top}px) scale(1)` }, { transform: `translate(${mx}px,${my}px) rotate(-10deg) scale(${(1 + s) / 1.5})`, offset: 0.5 }, { transform: `translate(${b.left}px,${b.top}px) scale(${s})` }], { duration: 720, easing: 'cubic-bezier(.3,.6,.2,1)' }).onfinish = () => { g.remove(); done(); }; });
    }
    place(c);
    try { await galeraApi.paste(c.owner); } catch (e) { setErr(e instanceof Error ? e.message : 'Não deu para colar agora.'); }
    const next = { ...live.current.col, cards: live.current.col.cards.map((x) => (x.owner === c.owner ? { ...x, pasted: true } : x)) };
    live.current.col = next;
    return next;
  }
  async function pasteAll() {
    setBusy(true); setErr('');
    let last: GaleraCollection | undefined;
    try {
      for (const c of [...tray]) {
        const from = document.querySelector<HTMLElement>(`.alb-tray [data-gtray="${c.number}"]`);
        last = await paste(c, from) ?? last;
        await new Promise((r) => setTimeout(r, motion ? 500 : 0));
      }
    } finally { setBusy(false); if (last) onChange(last); }
  }
  const pasteOne = async (c: Card, el: HTMLElement) => { setBusy(true); try { const n = await paste(c, el); if (n) onChange(n); } finally { setBusy(false); } };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (document.querySelector('.sheet') || (e.target as HTMLElement)?.closest?.('input,textarea')) return; if (e.key === 'ArrowRight') turn(1); if (e.key === 'ArrowLeft') turn(-1); };
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k);
  });

  return (
    <section className="alb-reader" aria-label="Álbum da Galera">
      <div className="alb-reader__head">
        <div><span className="alb-kick">Folheie arrastando o canto · {have} de {total} coladas</span><h2 className="alb-reader__title">Galera</h2></div>
        <div className="alb-reader__acts"><button className="btn ghost" onClick={onBack}>Voltar à estante</button></div>
      </div>
      {err && <p className="awards__error" role="alert">{err}</p>}
      <div className="alb-reader__body">
        <div>
          <div className="alb-bookwrap" ref={wrap} />
          {!ready && !err && <p className="faint" style={{ textAlign: 'center' }}>Abrindo o álbum…</p>}
          <div className="alb-controls">
            <button className="btn ghost" onClick={() => turn(-1)} disabled={!ready || atStart}>‹ Anterior</button>
            <span className="alb-status" role="status" aria-live="polite">{status}</span>
            <button className="btn ghost" onClick={() => turn(1)} disabled={!ready || atEnd}>{atStart ? 'Abrir ›' : 'Próxima ›'}</button>
          </div>
        </div>
        <div className="alb-tray">
          <div className="alb-tray__txt">
            <b>{tray.length ? (tray.length === 1 ? '1 nova para colar' : `${tray.length} novas para colar`) : 'Nada para colar'}</b>
            <span>{tray.length ? 'Toque para colar no espaço do número dela, ou cole todas de uma vez.' : 'Quem você tirar nos pacotes aparece aqui.'}</span>
          </div>
          {tray.length > 0 && (
            <div className="alb-tray__items">
              {tray.map((c) => (
                <div className="alb-tray__it" key={c.owner}>
                  <button type="button" data-gtray={c.number} onClick={(e) => void pasteOne(c, e.currentTarget)} disabled={busy || !ready} style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', width: '100%' }} aria-label={`Colar @${c.handle}, nº ${n3(c.number)}`}>
                    <GaleraCard card={c} still />
                  </button>
                  <small>{n3(c.number)} · @{c.handle}</small>
                </div>
              ))}
            </div>
          )}
          {tray.length > 0 && <button className="btn now" onClick={() => void pasteAll()} disabled={busy || !ready}>{busy ? 'Colando…' : 'Colar todas'}</button>}
        </div>
      </div>
      {open && <GaleraSheet card={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
