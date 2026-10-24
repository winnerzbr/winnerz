/**
 * O álbum aberto: um livro de verdade que vira página (St.PageFlip, carregada só aqui), com as figurinhas coladas,
 * os espaços vazios com o número, a bandeja das novas (arrastar até o espaço que brilha, ou "Colar todas"), as fitas
 * marcadoras das páginas com novidade e o selo de página completa.
 */
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { albumApi, artSrc, type AlbumBook as Book, type AlbumState, type Sticker } from '../../data/albumApi';
import { pastedCount, toPaste, TIER_LABEL, type PersonalSticker } from '../../lib/album';
import { useStore } from '../../data/store';
import { coverHTML, esc, logoGold, num3, stickerHTML } from './render';
import { AURORA, burst, DUST, GOLD, HOLO, reduceMotion, sfx, vibrate } from './fx';
import { StickerView, lightFollow, lightReset } from './StickerView';
import { CameoJornada } from '../IAmiguinho';
import { chunk, slotLayout } from '../../lib/enquadrar';

/* St.PageFlip vem como script (MIT), em /vendor/page-flip. */
interface PageFlip {
  loadFromHTML(els: HTMLElement[]): void; on(ev: string, cb: (e: { data: unknown }) => void): void;
  flip(i: number, corner?: string): void; flipNext(c?: string): void; flipPrev(c?: string): void; turnToPage(i: number): void; turnToNextPage(): void; turnToPrevPage(): void;
  getCurrentPageIndex(): number; getPageCount(): number; getOrientation(): string; getState(): string; destroy(): void; getSettings(): Record<string, unknown>;
}
declare global { interface Window { St?: { PageFlip: new (el: HTMLElement, o: Record<string, unknown>) => PageFlip } } }
let flipLoad: Promise<void> | null = null;
export function loadPageFlip(): Promise<void> {
  if (window.St?.PageFlip) return Promise.resolve();
  return (flipLoad ??= new Promise<void>((ok, bad) => {
    const s = document.createElement('script'); s.src = '/vendor/page-flip/page-flip.browser.js'; s.async = true;
    s.onload = () => ok(); s.onerror = () => { flipLoad = null; bad(new Error('pageflip')); };
    document.head.appendChild(s);
  }));
}

export interface BookPage { id: string; kicker: string; title: string; body: string; banner: string | null; legendary: boolean; stickers: Sticker[] }
/** As páginas de um álbum, cada uma com as suas figurinhas na ordem. */
export function bookPages(book: Book, stickers: Sticker[]): BookPage[] {
  return [...book.pages].sort((a, b) => a.position - b.position).map((p) => ({ id: p.id, kicker: p.kicker, title: p.title, body: p.body, banner: p.banner, legendary: p.legendary,
    stickers: stickers.filter((s) => s.pageId === p.id).sort((a, b) => a.slot - b.slot || a.number - b.number) }));
}

/** As páginas que aparecem no livro: uma seção com mais figurinhas que o álbum põe por página continua na seguinte. */
export function bookLeaves(book: Book, stickers: Sticker[]): (BookPage & { part: number })[] {
  return bookPages(book, stickers).flatMap((p) => p.legendary ? [{ ...p, part: 1 }] : chunk(p.stickers, book.perPage ?? 6).map((st, i) => ({ ...p, id: i ? `${p.id}~${i + 1}` : p.id, banner: i ? null : p.banner, body: i ? '' : p.body, kicker: i ? (p.kicker ? `${p.kicker} · continuação` : 'Continuação') : p.kicker, stickers: st, part: i + 1 })));
}

/** O selo de página completa: o traço dourado com o ✓ e o texto. */
const STAMP = '<i aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></i><b>Página completa</b>';
const onScreen = (el: Element | null) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 12 && r.left >= -2 && r.right <= innerWidth + 2 && r.top < innerHeight && r.bottom > 0; };

/** Uma figurinha pessoal (Minhas páginas): a foto do jogo zerado, como polaroide presa com fita. */
function personalHTML(p: PersonalSticker, i: number): string {
  const r = [-2.2, 1.6, 1.2, -1.4][i % 4];
  return `<figure class="alb-pol" style="--r:${r}deg"><span class="alb-pol__tape"></span><span class="alb-pol__img">${p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ''}</span><figcaption><b>${esc(p.title)}</b><small>${p.part ? `${esc(p.part)} · ` : ''}Zerado ${esc(p.when)}</small></figcaption></figure>`;
}
export const PERSONAL_PER_PAGE = 4;

export function AlbumBook({ book, vol, state, personal, onZoom, onBack }: { book: Book; vol: number; state: AlbumState; personal?: PersonalSticker[]; onZoom: (s: Sticker, el: HTMLElement) => void; onBack: () => void }) {
  const handle = useStore((s) => s.profile?.name ?? null);
  const pages = useMemo(() => bookLeaves(book, state.stickers), [book, state.stickers]);
  const items = useMemo(() => Object.fromEntries(state.items.map((i) => [i.id, i])), [state.items]);
  const ids = useMemo(() => pages.flatMap((p) => p.stickers.map((s) => s.id)), [pages]);
  const section = useMemo(() => Object.fromEntries(pages.flatMap((p) => p.stickers.map((s) => [s.id, p.title]))), [pages]);
  const byId = useMemo(() => Object.fromEntries(state.stickers.map((s) => [s.id, s])), [state.stickers]);
  const tray = toPaste(ids, items);
  const total = ids.length, have = pastedCount(ids, items);
  const sig = useMemo(() => JSON.stringify([book.id, book.cover, book.title, pages.map((p) => [p.id, p.title, p.kicker, p.body, p.banner, p.stickers.map((s) => [s.id, s.art, s.name, s.tier])]),
    personal?.map((p) => [p.id, p.image, p.title, p.when])]), [book, pages, personal]);

  const wrap = useRef<HTMLDivElement>(null);
  const flip = useRef<PageFlip | null>(null);
  const live = useRef({ items, tray, byId, section, onZoom });
  live.current = { items, tray, byId, section, onZoom };
  const [status, setStatus] = useState('Capa');
  /** Página que acabou de fechar: o IAmiguinho dá os parabéns (uma vez por página). */
  const [fechou, setFechou] = useState<string | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const motion = !reduceMotion();

  /* ---- montar o livro ---- */
  useEffect(() => {
    const host = wrap.current!; let alive = true;
    host.innerHTML = '<div class="alb-book"></div><div class="alb-ribbons"></div>';
    const el = host.querySelector<HTMLDivElement>('.alb-book')!;
    const add = (html: string, hard = false) => { const d = document.createElement('div'); d.className = 'alb-page'; if (hard) d.dataset.density = 'hard'; d.innerHTML = html; el.append(d); return d; };
    const it = live.current.items;
    add(`<div class="alb-cover-page">${coverHTML(book, vol)}</div>`, true);
    const list: string[] = [];
    list.push(`<div class="alb-pg alb-pg--center"><span class="alb-pg__kick">${esc(book.subtitle || 'Temporada ' + book.season)}</span><span class="alb-pg__mark">${logoGold()}</span><h3 class="alb-pg__ttl">${esc(book.title)}</h3>${handle ? `<p class="alb-pg__desc">Este álbum pertence a @${esc(handle)}</p>` : ''}<span class="alb-pg__kick" data-count>${pastedCount(ids, it)} de ${ids.length} coladas</span></div>`);
    pages.forEach((p, k) => {
      const n = p.stickers.length;
      const slots = p.stickers.map((s) => `<div class="alb-slot" data-slot="${s.id}">${it[s.id]?.pasted ? '' : `<div class="alb-well" data-well="${s.id}"><span>${num3(s.number)}</span></div>`}<span class="alb-slot__cap"><b>${esc(s.name)}</b>${num3(s.number)}</span></div>`).join('');
      const done = n > 0 && p.stickers.every((s) => it[s.id]?.pasted);
      list.push(`<div class="alb-pg${p.legendary ? ' alb-pg--center' : ''}" data-page="${p.id}">${p.banner && !p.legendary ? `<div class="alb-pg__banner" style="background-image:url('${esc(artSrc(p.banner) ?? '')}')"></div>` : ''}<span class="alb-pg__kick">${esc(p.kicker || (p.legendary ? 'Página lendária' : ''))}</span><h3 class="alb-pg__ttl">${esc(p.title)}</h3>${p.body ? `<p class="alb-pg__desc">${esc(p.body)}</p>` : ''}<div class="alb-slots${p.legendary || n === 1 ? ' alb-slots--one' : ' alb-slots--fit'}"${p.legendary || n <= 1 ? '' : ` style="--cols:${slotLayout(n).cols};--cw:${slotLayout(n).cw}cqw"`}>${slots || '<p class="alb-pg__desc">As figurinhas desta página ainda vão chegar.</p>'}</div><span class="alb-pg__num">${String(k + 2).padStart(2, '0')}</span>${done ? `<span class="alb-stamp is-still">${STAMP}</span>` : ''}</div>`);
    });
    if (personal) {
      const n = personal.length;
      list.push(`<div class="alb-pg alb-pg--center alb-pg--mine" data-mine><span class="alb-pg__kick">Minhas páginas</span><h3 class="alb-pg__ttl">Os jogos que eu zerei</h3><p class="alb-pg__desc">${n ? 'Cada jogo que você zera vira uma figurinha sua, com a última foto que você guardou dele. Elas são só suas: não saem em pacotes e não entram em trocas.' : 'Zere um jogo na Jornada e ele aparece aqui, com a última foto que você guardou dele. Estas figurinhas são só suas.'}</p><span class="alb-pg__kick">${n === 1 ? '1 jogo zerado' : `${n} jogos zerados`}</span></div>`);
      for (let k = 0; k < n; k += PERSONAL_PER_PAGE) {
        const chunk = personal.slice(k, k + PERSONAL_PER_PAGE);
        list.push(`<div class="alb-pg alb-pg--mine"><span class="alb-pg__kick">Minhas páginas</span><div class="alb-mine">${chunk.map((p, i) => personalHTML(p, k + i)).join('')}</div><span class="alb-pg__num">${String(list.length + 1).padStart(2, '0')}</span></div>`);
      }
    }
    list.push(`<div class="alb-pg alb-pg--center"><span class="alb-pg__kick">Fim do volume</span><h3 class="alb-pg__ttl">Continua na próxima Temporada</h3><p class="alb-pg__desc">Obrigado por colecionar com o WinnerZ.</p></div>`);
    if ((list.length + 2) % 2 !== 0) list.push(`<div class="alb-pg alb-pg--center"><span class="alb-pg__kick">Anotações</span></div>`);
    list.forEach((html, i) => { const d = add(html); d.firstElementChild!.classList.add((i + 1) % 2 === 1 ? 'alb-pg--l' : 'alb-pg--r'); });
    add(`<div class="alb-cover-page">${coverHTML({ title: 'WinnerZ', subtitle: 'Uma coleção de histórias', cover: book.cover }, vol)}</div>`, true);
    // figurinhas coladas
    el.querySelectorAll<HTMLElement>('.alb-slot[data-slot]').forEach((slot) => { if (it[slot.dataset.slot!]?.pasted) slot.prepend(stickerEl(slot.dataset.slot!)); });

    loadPageFlip().then(() => {
      if (!alive || !window.St) return;
      const MH = Math.max(420, Math.min(680, innerHeight - (innerWidth < 640 ? 250 : 300)));
      const MW = Math.min(500, Math.round((MH * 460) / 640));
      host.style.maxWidth = `${innerWidth >= 640 ? 2 * MW : 500}px`;
      const pf = new window.St.PageFlip(el, { width: 460, height: 640, size: 'stretch', minWidth: 250, maxWidth: MW, minHeight: 350, maxHeight: MH, maxShadowOpacity: 0.6, flippingTime: motion ? 1000 : 1,
        showCover: true, usePortrait: true, autoSize: true, mobileScrollSupport: false, useMouseEvents: true, showPageCorners: motion, disableFlipByClick: true, clickEventForward: true, swipeDistance: 30 });
      pf.loadFromHTML([...el.querySelectorAll<HTMLElement>('.alb-page')]);
      pf.on('flip', () => { update(); });
      pf.on('changeOrientation', () => update());
      pf.on('changeState', (e) => { if (e.data === 'flipping') sfx('flip'); });
      flip.current = pf; setReady(true); update(); marks();
    }).catch(() => { if (alive) setErr('A virada de página não carregou. Recarregue a página.'); });
    return () => { alive = false; try { flip.current?.destroy(); } catch { /* já foi */ } flip.current = null; setReady(false); host.innerHTML = ''; };
  }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps

  function stickerEl(id: string): HTMLElement {
    const s = live.current.byId[id];
    const b = document.createElement('button'); b.type = 'button'; b.className = 'wsw';
    b.setAttribute('aria-label', `${s.name}, ${TIER_LABEL[s.tier]}, número ${num3(s.number)}. Ver de perto`);
    b.innerHTML = stickerHTML(s, live.current.section[id] ?? '');
    (['pointerdown', 'mousedown', 'touchstart'] as const).forEach((ev) => b.addEventListener(ev, (e) => e.stopPropagation(), { passive: true }));
    b.addEventListener('click', (e) => { e.stopPropagation(); live.current.onZoom(s, b); });
    b.addEventListener('pointermove', (e) => lightFollow({ currentTarget: b, clientX: e.clientX, clientY: e.clientY }));
    b.addEventListener('pointerleave', () => lightReset({ currentTarget: b }));
    return b;
  }
  const host = () => wrap.current;
  const wellOf = (id: string) => host()?.querySelector<HTMLElement>(`[data-well="${id}"]`) ?? null;
  const pageIndexOf = (id: string) => [...(host()?.querySelectorAll('.alb-page') ?? [])].findIndex((p) => p.querySelector(`[data-well="${id}"]`));
  function update() {
    const pf = flip.current; if (!pf) return;
    const p = pf.getCurrentPageIndex(), last = pf.getPageCount() - 1, portrait = pf.getOrientation() === 'portrait';
    setStatus(p === 0 ? 'Capa' : p >= last ? 'Contracapa' : portrait ? `Página ${p}` : `Páginas ${p}–${p + 1}`);
    setAtStart(p === 0); setAtEnd(p >= last);
    marks();
  }
  function marks() {
    const h = host(); if (!h) return;
    const t = new Set(live.current.tray);
    h.querySelectorAll<HTMLElement>('.alb-well').forEach((w) => w.classList.toggle('is-target', t.has(w.dataset.well!)));
    const rb = h.querySelector<HTMLElement>('.alb-ribbons'); if (!rb) return;
    const byPage = new Map<number, string[]>();
    live.current.tray.forEach((id) => { const k = pageIndexOf(id); if (k > 0) byPage.set(k, [...(byPage.get(k) ?? []), id]); });
    rb.querySelectorAll<HTMLElement>('.alb-ribbon').forEach((b) => { if (!byPage.has(Number(b.dataset.k))) b.remove(); });
    [...byPage.entries()].sort((a, b) => a[0] - b[0]).forEach(([k, l], i) => {
      let b = rb.querySelector<HTMLButtonElement>(`[data-k="${k}"]`);
      if (!b) { b = document.createElement('button'); b.type = 'button'; b.className = 'alb-ribbon'; b.dataset.k = String(k); b.style.animationDelay = `${i * 90}ms`; const bb = b; b.addEventListener('click', () => { const id = live.current.tray.find((x) => pageIndexOf(x) === Number(bb.dataset.k)); if (id) void goTo(id); }); rb.append(b); }
      b.innerHTML = `<span>p.${k}</span><small>${l.length === 1 ? '1 nova' : `${l.length} novas`}</small>`;
      b.setAttribute('aria-label', `Ir para a página ${k}: ${l.length} para colar`);
    });
  }
  // Quando a coleção muda por fora (outro pacote aberto, outra aba), o livro acompanha sem remontar.
  useEffect(() => {
    const h = host(); if (!h) return;
    h.querySelectorAll<HTMLElement>('.alb-well').forEach((w) => { const id = w.dataset.well!; if (items[id]?.pasted) { const slot = w.parentElement!; w.remove(); slot.prepend(stickerEl(id)); } });
    const c = h.querySelector('[data-count]'); if (c) c.textContent = `${have} de ${total} coladas`;
    marks();
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const turn = (d: number) => {
    const pf = flip.current; if (!pf || pf.getState() !== 'read') return;
    if (motion) { if (d > 0) pf.flipNext('bottom'); else pf.flipPrev('bottom'); } else if (d > 0) pf.turnToNextPage(); else pf.turnToPrevPage();
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (document.querySelector('.alb-zoom') || (e.target as HTMLElement)?.closest?.('input,textarea')) return; if (e.key === 'ArrowRight') turn(1); if (e.key === 'ArrowLeft') turn(-1); };
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k);
  });
  async function goTo(id: string) {
    const pf = flip.current; const idx = pageIndexOf(id); if (!pf || idx < 0) return;
    const cur = pf.getCurrentPageIndex(); const vis = pf.getOrientation() === 'portrait' ? [cur] : [cur, cur + 1];
    if (vis.includes(idx) && onScreen(wellOf(id))) return;
    if (motion) { pf.flip(idx, 'bottom'); await new Promise((r) => setTimeout(r, 1150)); } else pf.turnToPage(idx);
    update();
  }
  function goToMine() {
    const pf = flip.current; if (!pf || pf.getState() !== 'read') return;
    const idx = [...(host()?.querySelectorAll('.alb-page') ?? [])].findIndex((p) => p.querySelector('[data-mine]'));
    if (idx < 0) return;
    if (motion) pf.flip(idx, 'bottom'); else { pf.turnToPage(idx); update(); }
  }
  // Ao chegar com novas na bandeja, vai até a primeira.
  const jumped = useRef(false);
  useEffect(() => { if (ready && !jumped.current && tray.length) { jumped.current = true; setTimeout(() => { void goTo(tray[0]); }, 500); } }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  function ghost(id: string, w: number) { const g = document.createElement('div'); g.className = 'alb-ghost'; g.style.width = `${w}px`; g.innerHTML = `<div class="wsw">${stickerHTML(live.current.byId[id], live.current.section[id] ?? '')}</div>`; document.body.append(g); return g; }
  function place(id: string) {
    const well = wellOf(id); if (!well) return; const slot = well.parentElement!; const r = well.getBoundingClientRect();
    well.remove(); const st = stickerEl(id); slot.prepend(st);
    void albumApi.paste(id).catch((e) => setErr(e instanceof Error ? e.message : 'Não deu para colar agora.'));
    if (motion) {
      st.animate([{ transform: 'scale(1.16) rotate(-4deg)', filter: 'drop-shadow(0 26px 20px rgba(0,0,0,.5))' }, { transform: 'scale(.95) rotate(.6deg)', offset: 0.55 }, { transform: 'none' }], { duration: 850, easing: 'cubic-bezier(.2,.8,.25,1)' });
      const sh = st.querySelector<HTMLElement>('.wst__sheen'); if (sh) { sh.style.opacity = '1'; sh.style.animation = 'alb-sweep 1.1s .3s ease-out 1'; }
      setTimeout(() => { sfx('thump'); burst(r.left + r.width / 2, r.top + r.height * 0.95, DUST, 26, 3.2, 0.12); }, 330);
      const t = live.current.byId[id].tier;
      if (t !== 'comum') setTimeout(() => burst(r.left + r.width / 2, r.top + r.height / 2, t === 'lendaria' ? HOLO : t === 'rara' ? AURORA : GOLD, t === 'lendaria' ? 70 : 34, t === 'lendaria' ? 8 : 5), 420);
    } else sfx('thump');
    const pg = slot.closest<HTMLElement>('.alb-pg'); if (pg && !pg.querySelector('.alb-well') && !pg.querySelector('.alb-stamp')) complete(pg);
  }
  function complete(pg: HTMLElement) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'alb-trace'); svg.setAttribute('preserveAspectRatio', 'none');
    svg.innerHTML = '<rect x="1" y="1" width="99.5%" height="99.5%" rx="6" pathLength="4000"/>';
    const stp = document.createElement('span'); stp.className = 'alb-stamp'; stp.innerHTML = STAMP;
    pg.append(svg, stp);
    setTimeout(() => svg.classList.add('on'), motion ? 300 : 0);
    setTimeout(() => {
      stp.classList.add(motion ? 'on' : 'is-still'); setTimeout(() => sfx('stamp'), motion ? 380 : 0);
      const r = stp.getBoundingClientRect(); setTimeout(() => burst(r.left + r.width / 2, r.top + r.height / 2, GOLD, 60, 6), 260);
    }, motion ? 1500 : 0);
    setStatus('Página completa');
    if (pg.dataset.page) setFechou(pg.dataset.page.split('~')[0]);
  }
  function fly(id: string, from: HTMLElement): Promise<void> {
    return new Promise((done) => {
      const well = wellOf(id); if (!well) { done(); return; }
      const a = from.getBoundingClientRect(), b = well.getBoundingClientRect();
      if (!motion) { place(id); done(); return; }
      const g = ghost(id, a.width); const s = b.width / a.width, mx = (a.left + b.left) / 2, my = Math.min(a.top, b.top) - 80;
      g.animate([{ transform: `translate(${a.left}px,${a.top}px) rotate(0) scale(1)` }, { transform: `translate(${mx}px,${my}px) rotate(-10deg) scale(${(1 + s) / 1.5})`, offset: 0.5 }, { transform: `translate(${b.left}px,${b.top}px) rotate(0) scale(${s})` }], { duration: 720, easing: 'cubic-bezier(.3,.6,.2,1)' }).onfinish = () => { g.remove(); place(id); done(); };
    });
  }
  async function pasteAll() {
    setBusy(true); setErr('');
    try {
      for (const id of [...live.current.tray]) {
        await goTo(id);
        const from = document.querySelector<HTMLElement>(`.alb-tray [data-tray="${id}"]`);
        if (!from || !wellOf(id)) { void albumApi.paste(id).catch(() => {}); continue; }
        await fly(id, from); await new Promise((r) => setTimeout(r, motion ? 650 : 0));
      }
    } finally { setBusy(false); }
  }
  function startDrag(e: RPointerEvent<HTMLElement>, id: string) {
    e.preventDefault(); const src = e.currentTarget; const r = src.getBoundingClientRect();
    const W = Math.max(r.width * 1.5, 96); const g = ghost(id, W); let near: HTMLElement | null = null, ang = 0, lastX = e.clientX;
    const target = wellOf(id);
    src.style.opacity = '.25';
    const pos = (x: number, y: number) => {
      ang += ((x - lastX) * 0.6 - ang) * 0.2; lastX = x; let gx = x - W / 2, gy = y - W * 0.7;
      if (target && onScreen(target)) {
        const tr = target.getBoundingClientRect(); const d = Math.hypot(x - (tr.left + tr.width / 2), y - (tr.top + tr.height / 2));
        const was = near; near = d < Math.max(110, tr.width) ? target : null; target.classList.toggle('is-near', !!near);
        if (near) { const k = Math.min(1, (Math.max(110, tr.width) - d) / 80); gx += (tr.left - gx) * k * 0.6; gy += (tr.top - gy) * k * 0.6; }
        if (near && !was) vibrate(8);
      }
      g.style.transform = `translate(${gx}px,${gy}px) rotate(${Math.max(-14, Math.min(14, ang))}deg) scale(${near && target ? (target.getBoundingClientRect().width / W) * 1.05 : 1})`;
    };
    pos(e.clientX, e.clientY);
    const mv = (ev: PointerEvent) => pos(ev.clientX, ev.clientY);
    const up = () => {
      removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); src.style.opacity = '';
      if (near && target) {
        target.classList.remove('is-near'); const tr = target.getBoundingClientRect();
        if (motion) g.animate([{ transform: g.style.transform }, { transform: `translate(${tr.left}px,${tr.top}px) scale(${tr.width / W})` }], { duration: 180, easing: 'ease-out', fill: 'forwards' }).onfinish = () => { g.remove(); place(id); };
        else { g.remove(); place(id); }
      } else {
        if (motion) g.animate([{ transform: g.style.transform }, { transform: `translate(${r.left - (W - r.width) / 2}px,${r.top - (W - r.width) * 0.7}px) scale(${r.width / W})` }], { duration: 320, easing: 'cubic-bezier(.3,.6,.2,1)' }).onfinish = () => g.remove();
        else g.remove();
        const k = pageIndexOf(id); if (target && !onScreen(target)) setStatus(`A ${num3(live.current.byId[id].number)} vai na página ${k > 0 ? k : '?'}. Toque na fita para ir até lá`);
      }
    };
    addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  }

  return (
    <section className="alb-reader" aria-label={book.title}>
      {fechou && <CameoJornada key={fechou} motivo="pagina" escopo={fechou} fatos={{}} atraso={2600} />}
      <div className="alb-reader__head">
        <div><span className="alb-kick">Folheie arrastando o canto · {have} de {total} coladas</span><h2 className="alb-reader__title">{book.title}</h2></div>
        <div className="alb-reader__acts">
          {personal && <button className="btn ghost" onClick={goToMine} disabled={!ready}>Minhas páginas</button>}
          <button className="btn ghost" onClick={onBack}>Voltar à estante</button>
        </div>
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
            <span>{tray.length ? 'Arraste até o espaço que brilha, ou cole todas de uma vez.' : 'As figurinhas novas deste álbum aparecem aqui.'}</span>
          </div>
          {tray.length > 0 && (
            <div className="alb-tray__items">
              {tray.map((id) => byId[id] && (
                <div className="alb-tray__it" key={id}>
                  <div data-tray={id} onPointerDown={(e) => startDrag(e, id)}><StickerView s={byId[id]} section={section[id]} /></div>
                  <small>{num3(byId[id].number)} · {TIER_LABEL[byId[id].tier]}</small>
                </div>
              ))}
            </div>
          )}
          {tray.length > 0 && <button className="btn now" onClick={() => void pasteAll()} disabled={busy || !ready}>{busy ? 'Colando…' : 'Colar todas'}</button>}
        </div>
      </div>
    </section>
  );
}
