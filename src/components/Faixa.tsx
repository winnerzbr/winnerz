/**
 * Linha do tempo da Jornada · Rolagem "Faixa".
 * Uma faixa de painéis (capítulos, registros, silêncios, lembranças e o "Hoje"). O painel do centro fica
 * nítido e aceso; os outros recuam, escurecem e desfocam. A luz ambiente vem da arte do capítulo.
 * Horizontal no computador, vertical no celular. Com "reduzir movimento", sem profundidade nem poeira.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent, type MouseEvent, type KeyboardEvent } from 'react';
import { Link } from '../lib/router';
import { actions } from '../data/store';
import type { TLItem, ChapterItem } from '../lib/chapters';
import { chapterOf, durText, compareLines } from '../lib/chapters';
import { whenLabel } from '../lib/dates';
import { awayLabel } from '../lib/recap';
import { Icon, Compass } from './Icon';
import { BrandMark } from './Brand';
import { PhotoViewer } from './MediaGallery';

export type FaixaPlay = { label: string; now: boolean; onClick: () => void; hint?: string };
export type FaixaToday = { where?: string; note?: string; away: number | null; slug: string; open: boolean; friends?: { handle: string; state: string }[] };
export type FaixaNarrate = { saved: Record<string, string>; left: number; ask: (c: ChapterItem, range: string) => Promise<string>; save: (c: ChapterItem, text: string) => void };

/** "@duda e @carol também jogaram este jogo · 1 já zerou" (sem marcar gênero). */
export function friendsLine(fr: { handle: string; state: string }[]): string {
  if (!fr.length) return '';
  const names = fr.slice(0, 2).map((f) => `@${f.handle}`);
  const rest = fr.length - names.length;
  const who = rest > 0 ? `${names.join(', ')} e mais ${rest}` : names.join(' e ');
  const done = fr.filter((f) => f.state === 'zerou').length;
  const tail = !done ? '' : fr.length === 1 ? ' · e zerou' : ` · ${done} já ${done === 1 ? 'zerou' : 'zeraram'}`;
  return `${who} também ${fr.length === 1 ? 'jogou' : 'jogaram'} este jogo${tail}.`;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
const KIND: Record<string, string> = { inicio: 'Início', sessao: 'Sessão', momento: 'Momento', ponto: 'Para voltar', marco: 'Marco', carta: 'Carta' };
const TZ = 'America/Sao_Paulo';
const periodOf = (iso: string) => { const h = Number(new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', hour12: false, timeZone: TZ }).slice(0, 2)); return h < 6 ? 'De madrugada' : h < 12 ? 'De manhã' : h < 18 ? 'À tarde' : 'À noite'; };
const THIS_YEAR = String(new Date().getFullYear());
const shortDay = (iso: string) => { const t = whenLabel(iso, 'dia', { short: true }); return t.endsWith(` ${THIS_YEAR}`) ? t.slice(0, -5) : t; };
const range = (c: ChapterItem) => { const a = shortDay(c.from), b = shortDay(c.to); return a === b ? a : `${a} – ${b}`; };

function itemDate(it: TLItem): string {
  if (it.type === 'chapter') return it.from;
  if (it.type === 'event') return it.e.at;
  if (it.type === 'silence') return it.from;
  if (it.type === 'memory') return it.e.at;
  if (it.type === 'echo') return '';
  return new Date().toISOString();
}

export function Faixa({ items, bg, title, play, today, onEdit, full, onExitFull, reduced, light, narrate }: {
  items: TLItem[]; bg: string; title: string; play: FaixaPlay; today: FaixaToday | null; onEdit: (eventId: string) => void;
  full: boolean; onExitFull: () => void; reduced: boolean; light: boolean; narrate?: FaixaNarrate | null;
}) {
  const [draft, setDraft] = useState<{ id: string; text: string } | null>(null);
  const [asking, setAsking] = useState<string | null>(null);
  const [aiErr, setAiErr] = useState<{ id: string; text: string } | null>(null);
  const askAi = async (c: ChapterItem) => {
    if (!narrate) return;
    setAsking(c.id); setAiErr(null);
    try { setDraft({ id: c.id, text: await narrate.ask(c, range(c)) }); } catch (err) { setAiErr({ id: c.id, text: err instanceof Error ? err.message : 'A IA não respondeu agora.' }); }
    setAsking(null);
  };
  const stage = useRef<HTMLElement>(null);
  const vp = useRef<HTMLDivElement>(null);
  const big = useRef<HTMLDivElement>(null);
  const dust = useRef<HTMLCanvasElement>(null);
  const els = useRef<(HTMLElement | null)[]>([]);
  const [focus, setFocus] = useState(items.length - 1);
  const [vertical, setVertical] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 640);
  const [viewer, setViewer] = useState<number | null>(null);
  const [tour, setTour] = useState(false);
  const focusRef = useRef(focus);
  focusRef.current = focus;
  const photos = useMemo(() => items.filter((x): x is Extract<TLItem, { type: 'event' }> => x.type === 'event' && !!x.e.image), [items]);
  const chapters = useMemo(() => items.filter((x): x is ChapterItem => x.type === 'chapter'), [items]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const on = () => setVertical(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // Foco, profundidade e paralaxe a cada rolagem (direto no DOM, sem redesenhar o React).
  const update = useCallback(() => {
    const v = vp.current;
    if (!v) return;
    const vert = window.innerWidth <= 640;
    const mid = vert ? v.scrollTop + v.clientHeight / 2 : v.scrollLeft + v.clientWidth / 2;
    let best = 0, bd = Infinity;
    els.current.forEach((el, i) => {
      if (!el) return;
      const c = vert ? el.offsetTop + el.offsetHeight / 2 : el.offsetLeft + el.offsetWidth / 2;
      const d = c - mid, ad = Math.abs(d), k = Math.min(1, ad / (vert ? 420 : 820));
      el.style.setProperty('--s', (1 - k * 0.08).toFixed(3));
      el.style.setProperty('--b', (1 - k * 0.42).toFixed(2));
      if (!reduced) {
        el.style.setProperty('--bl', (k * 1.8).toFixed(1) + 'px');
        if (!vert) { el.style.setProperty('--ry', (-Math.sign(d) * Math.min(1, ad / 900) * 9).toFixed(1) + 'deg'); el.style.setProperty('--tz', (-k * 140).toFixed(0) + 'px'); }
        el.style.setProperty('--px', (d * -0.03).toFixed(1) + 'px');
      }
      if (ad < bd) { bd = ad; best = i; }
    });
    if (big.current && !reduced) big.current.style.transform = `translateX(${(-v.scrollLeft * 0.35).toFixed(1)}px)`;
    if (best !== focusRef.current) setFocus(best);
  }, [reduced]);

  const center = useCallback((i: number, smooth = true) => {
    const v = vp.current, el = els.current[i];
    if (!v || !el) return;
    const vert = window.innerWidth <= 640;
    v.scrollTo({ left: vert ? 0 : el.offsetLeft + el.offsetWidth / 2 - v.clientWidth / 2, top: vert ? el.offsetTop + el.offsetHeight / 2 - v.clientHeight / 2 : 0, behavior: smooth && !reduced ? 'smooth' : 'auto' });
  }, [reduced]);

  // Abre no fim (o "Hoje" ou o último registro).
  useLayoutEffect(() => { center(items.length - 1, false); update(); }, [items.length, vertical, full]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const v = vp.current;
    if (!v) return;
    let raf = 0;
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    v.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    // Roda do mouse vira rolagem lateral no computador.
    const wheel = (e: WheelEvent) => { if (window.innerWidth > 640 && Math.abs(e.deltaY) > Math.abs(e.deltaX)) { v.scrollLeft += e.deltaY; e.preventDefault(); } };
    v.addEventListener('wheel', wheel, { passive: false });
    return () => { v.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); v.removeEventListener('wheel', wheel); cancelAnimationFrame(raf); };
  }, [update]);

  // Arrastar com o mouse.
  const drag = useRef<{ x: number; y: number; l: number; t: number; moved: boolean } | null>(null);
  const onDown = (e: PointerEvent) => { if (e.pointerType !== 'mouse' || (e.target as HTMLElement).closest('button,a')) return; const v = vp.current!; drag.current = { x: e.clientX, y: e.clientY, l: v.scrollLeft, t: v.scrollTop, moved: false }; };
  const onMove = (e: PointerEvent) => { const d = drag.current; if (!d) return; const v = vp.current!; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (Math.abs(dx) + Math.abs(dy) > 5) d.moved = true; v.scrollLeft = d.l - dx; v.scrollTop = d.t - dy; };
  const onUp = () => { setTimeout(() => { drag.current = null; }, 0); };

  // Passeio: avança um painel a cada 3,4 s.
  useEffect(() => {
    if (!tour) return;
    const t = setInterval(() => { const i = focusRef.current; if (i >= items.length - 1) { setTour(false); return; } center(i + 1); }, 3400);
    return () => clearInterval(t);
  }, [tour, items.length, center]);

  // Poeira dourada (leve; some com "reduzir movimento" e no modo leve).
  useEffect(() => {
    const c = dust.current;
    if (!c || reduced || light) return;
    const g = c.getContext('2d');
    if (!g) return;
    let P: { x: number; y: number; r: number; v: number; a: number }[] = [], raf = 0, last = vp.current?.scrollLeft ?? 0, speed = 0;
    const size = () => { c.width = c.clientWidth; c.height = c.clientHeight; P = Array.from({ length: c.width < 700 ? 30 : 70 }, () => ({ x: Math.random() * c.width, y: Math.random() * c.height, r: 0.6 + Math.random() * 1.6, v: 0.1 + Math.random() * 0.3, a: Math.random() * 6.28 })); };
    size();
    const draw = (t: number) => {
      const sl = vp.current?.scrollLeft ?? 0; speed = speed * 0.9 + (sl - last) * 0.1; last = sl;
      g.clearRect(0, 0, c.width, c.height);
      for (const p of P) {
        p.x -= p.v + speed * 0.5 * p.r; p.y += Math.sin(t * 0.001 + p.a) * 0.15;
        if (p.x < -10) p.x = c.width + 10; if (p.x > c.width + 10) p.x = -10;
        g.globalAlpha = 0.3 + Math.sin(t * 0.002 + p.a) * 0.22; g.fillStyle = '#FFE2B8'; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    window.addEventListener('resize', size);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size); };
  }, [reduced, light]);

  // Tela cheia de verdade quando o navegador deixa; Esc sai.
  useEffect(() => {
    if (!full) return;
    const el = stage.current;
    el?.requestFullscreen?.().catch(() => {});
    const onChange = () => { if (!document.fullscreenElement) onExitFull(); };
    const esc = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') onExitFull(); };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('fullscreenchange', onChange); document.removeEventListener('keydown', esc); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
  }, [full, onExitFull]);

  const cur = items[Math.max(0, Math.min(items.length - 1, focus))];
  const curChap = chapterOf(items, focus);
  const ambient = curChap?.image ?? bg;
  const ambients = useMemo(() => [...new Set([bg, ...chapters.map((c) => c.image).filter((x): x is string => !!x)])], [bg, chapters]);

  // Régua: cada painel avança um passo, mais um pouco pelo tempo que passou (raiz dos dias, para as pausas
  // longas aparecerem sem esmagar o resto). O "Hoje" fica no fim.
  const posMap = useMemo(() => {
    const m = new Map<string, number>();
    let acc = 0, prev: number | null = null;
    const raw = items.map((it) => { const t = Date.parse(itemDate(it)); const gap = prev == null || !Number.isFinite(t) ? 0 : Math.max(0, (t - prev) / 86_400_000); if (Number.isFinite(t)) prev = t; acc += (m.size ? 1 : 0) + Math.sqrt(gap) / 2; m.set(it.id, acc); return acc; });
    const max = Math.max(1, raw[raw.length - 1] ?? 1);
    for (const [k, v] of m) m.set(k, (v / max) * 100);
    return m;
  }, [items]);
  const pos = (it: TLItem) => posMap.get(it.id) ?? 0;
  // Rótulos dos capítulos sem se encostar.
  const labels = useMemo(() => {
    const out: { c: ChapterItem; p: number }[] = [];
    for (const c of chapters) { const p = posMap.get(c.id) ?? 0; if ((!out.length || p - out[out.length - 1].p >= 9) && (!today || p <= 90)) out.push({ c, p }); }
    return out;
  }, [chapters, posMap, today]);
  const onRuler = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect(), p = ((e.clientX - r.left) / r.width) * 100;
    let best = 0, bd = Infinity;
    items.forEach((it, i) => { const d = Math.abs(pos(it) - p); if (d < bd) { bd = d; best = i; } });
    center(best);
  };
  const key = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); center(Math.min(items.length - 1, focus + 1)); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); center(Math.max(0, focus - 1)); }
    if (e.key === 'Home') { e.preventDefault(); center(0); }
    if (e.key === 'End') { e.preventDefault(); center(items.length - 1); }
  };
  const click = (i: number) => {
    if (drag.current?.moved) return;
    if (i !== focus) { center(i); return; }
    const it = items[i];
    if (it.type === 'event' && it.e.image) setViewer(photos.indexOf(it));
  };

  const panel = (it: TLItem, i: number) => {
    const on = i === focus;
    const ref = (el: HTMLElement | null) => { els.current[i] = el; };
    const common = { ref, onClick: () => click(i), 'data-on': on || undefined } as const;
    if (it.type === 'chapter') return (
      <article key={it.id} {...common} className="fx-pn fx-chap" aria-label={`Capítulo ${it.n}: ${it.name}`}>
        <div className="fx-bg" style={{ backgroundImage: `url(${it.image ?? bg})` }} /><div className="fx-sh" />
        <span className="fx-num">{ROMAN[it.n - 1] ?? it.n}</span>
        <span className="fx-k">Capítulo {it.n} · {range(it)}</span>
        <h3 className="fx-h">{it.name}</h3>
        {draft?.id === it.id ? (
          <div className="fx-ai" onClick={(ev) => ev.stopPropagation()}>
            <p className="fx-p fx-ai__text">{draft.text}</p>
            <small className="fx-src">Inferido · narrado pela IA só com o que você registrou. Guarde se gostou.</small>
            <div className="fx-actions">
              <button className="btn now sm" onClick={() => { narrate?.save(it, draft.text); setDraft(null); }}>Guardar</button>
              <button className="btn ghost sm fx-btn" onClick={() => setDraft(null)}>Descartar</button>
            </div>
          </div>
        ) : narrate?.saved[it.id] ? (
          <>
            <p className="fx-p fx-ai__text">{narrate.saved[it.id]}</p>
            <small className="fx-src">Inferido · narrado pela IA</small>
            {on && <div className="fx-actions"><button className="btn quiet sm" onClick={(ev) => { ev.stopPropagation(); narrate.save(it, ''); }}>Voltar ao resumo do site</button></div>}
          </>
        ) : (
          <>
            <p className="fx-p">{it.summary}</p>
            {on && narrate && !full && (
              <div className="fx-actions">
                <button className="btn ghost sm fx-btn" disabled={asking === it.id || narrate.left <= 0} onClick={(ev) => { ev.stopPropagation(); askAi(it); }}>
                  <Icon name="brilho" size={13} />{asking === it.id ? 'Narrando…' : 'Narrar com a IA'}
                </button>
                {narrate.left <= 0 && <small className="fx-src">Os pedidos de IA deste mês acabaram.</small>}
              </div>
            )}
            {aiErr?.id === it.id && <small className="fx-src fx-err" role="alert">{aiErr.text}</small>}
          </>
        )}
      </article>
    );
    if (it.type === 'echo') {
      const x = it.echo;
      return (
        <article key={it.id} {...common} className={`fx-pn fx-ev fx-echo${x.image ? ' has-img' : ''}`} aria-label={`Eco de @${x.handle}: ${x.title}`}>
          {x.image && <div className="fx-bg" style={{ backgroundImage: `url(${x.image})` }} />}
          <span className="fx-ava" aria-hidden="true">{x.avatar ? <img src={x.avatar} alt="" /> : x.handle.slice(0, 1).toUpperCase()}</span>
          <span className="fx-k fx-k--echo">Eco · @{x.handle}{x.progress > 0 ? ` · ${x.progress}%` : ''}</span>
          <h3 className="fx-h fx-h--sm">{x.kind === 'inicio' ? 'Começou a jogar' : x.title}</h3>
          {x.legend && <p className="fx-p">{x.legend}</p>}
          <small className="fx-src">Passou por aqui em {whenLabel(x.at, 'mes')}</small>
          {on && <div className="fx-actions"><Link className="btn quiet sm" to={`/@${x.handle}`} onClick={(ev) => ev.stopPropagation()}>Ver o perfil</Link></div>}
        </article>
      );
    }
    if (it.type === 'compare') {
      const c = it.data, lines = compareLines(c, it.mine);
      const max = Math.max(1, ...(c.pauseBuckets ?? []).map((b) => b.count));
      return (
        <article key={it.id} {...common} className="fx-pn fx-cmp" aria-label="Quem também jogou">
          <span className="fx-k">Quem também jogou · comparação anônima</span>
          <h3 className="fx-h fx-h--sm">{c.players} pessoas no WinnerZ</h3>
          {(c.pauseBuckets ?? []).length > 0 && (
            <div className="fx-bars" aria-hidden="true">
              {Array.from({ length: 10 }, (_, k) => { const b = c.pauseBuckets!.find((x) => x.from === k * 10); const me = it.mine != null && Math.min(9, Math.floor(it.mine / 10)) === k; return <i key={k} className={me ? 'me' : undefined} style={{ height: `${8 + ((b?.count ?? 0) / max) * 52}px` }} title={`${k * 10}%`} />; })}
            </div>
          )}
          {(c.pauseBuckets ?? []).length > 0 && <small className="fx-src">Onde as pessoas pausaram, de 0% a 100%{it.mine != null ? ' · em destaque, onde você está' : ''}</small>}
          <ul className="fx-lines">{lines.map((l) => <li key={l}>{l}</li>)}</ul>
          <small className="fx-src">Números de todo mundo que registrou este jogo, sem nomes. Só aparece com 5 pessoas ou mais.</small>
        </article>
      );
    }
    if (it.type === 'silence') return (
      <article key={it.id} {...common} className="fx-pn fx-sil" aria-label={`${it.days} dias sem jogar`}>
        <b>{it.days} dias</b><small>sem jogar</small>
        {it.meanwhile.length > 0 && <ul>{it.meanwhile.map((m) => <li key={m}>{m}</li>)}</ul>}
      </article>
    );
    if (it.type === 'memory') return (
      <article key={it.id} {...common} className="fx-pn fx-ev fx-mem">
        {it.e.image && <div className="fx-bg" style={{ backgroundImage: `url(${it.e.image})` }} />}
        <span className="fx-ic"><Icon name="calendario" size={16} /></span>
        <span className="fx-k">Lembrança · há {it.years === 1 ? 'um ano' : `${it.years} anos`}, hoje</span>
        <h3 className="fx-h fx-h--sm">{it.e.title}</h3>
        <p className="fx-p">{it.e.quote ? `“${it.e.quote}”` : it.gameTitle}</p>
        <small className="fx-src">{it.gameTitle}</small>
      </article>
    );
    if (it.type === 'today') return (
      <article key={it.id} {...common} className="fx-pn fx-today" aria-label="Hoje">
        <span className="fx-k fx-k--now">Hoje{today?.away != null && today.away > 0 ? ` · última vez ${awayLabel(today.away)}` : ''}</span>
        <h3 className="fx-h">{today?.open ? 'Sessão aberta agora' : today?.where ? <>Você parou em {today.where}</> : 'O próximo instante'}</h3>
        {today?.note && !today.open && <p className="fx-p">“{today.note}”</p>}
        {!!today?.friends?.length && <p className="fx-sub fx-friends"><Icon name="pessoas" size={14} /> {friendsLine(today.friends)}</p>}
        <div className="fx-actions">
          {today?.open ? <Link className="btn now sm" to="/sessao">Abrir a sessão</Link> : <button className={`btn sm ${play.now ? 'now' : 'primary'}`} onClick={(e) => { e.stopPropagation(); play.onClick(); }}>{play.now ? <span className="session-pill__dot" aria-hidden="true" /> : <Icon name="play" size={13} />}{play.label}</button>}
          {today && !today.open && (today.away ?? 0) >= 3 && <Link className="btn ghost sm" to={`/jornada/${today.slug}/voltar`} onClick={(e) => e.stopPropagation()}>Preparar a volta</Link>}
        </div>
      </article>
    );
    const e = it.e, x = it.session;
    const back = e.kind === 'ponto' && !e.resolved;
    const sub = e.kind === 'sessao' && x
      ? [x.goal ? `${x.goalDone === 'sim' ? '✓' : x.goalDone === 'quase' ? '≈' : '○'} ${x.goal}` : null, x.startedAt ? periodOf(x.startedAt) : null, x.companions?.length ? `com ${x.companions.join(', ')}` : null, x.feeling ? `“${x.feeling}”` : null].filter(Boolean).join(' · ')
      : e.kind === 'carta' ? 'Lacrada até você zerar' : e.quote ? `“${e.quote}”` : e.text ?? '';
    const head = e.kind === 'sessao' && x?.minutes ? durText(x.minutes) : e.title;
    return (
      <article key={it.id} {...common} className={`fx-pn fx-ev fx-${e.kind}${e.image ? ' has-img' : ''}${back ? ' is-back' : ''}`}>
        {e.image && <div className="fx-bg" style={{ backgroundImage: `url(${e.image})` }} />}
        {!e.image && (e.kind === 'inicio' ? <span className="fx-mark"><BrandMark width={40} /></span> : e.kind === 'marco' ? <span className="fx-mark"><Compass size={34} color="#E2BE84" /></span> : <span className={`fx-ic${e.kind === 'ponto' ? ' fx-ic--now' : ''}`}><Icon name={e.kind === 'ponto' ? 'pin' : e.kind === 'carta' ? 'carta' : e.kind === 'momento' ? 'camera' : 'relogio'} size={16} /></span>)}
        <span className={`fx-k${back ? ' fx-k--now' : ''}`}>{KIND[e.kind] ?? e.kind} · {e.dateLabel ?? whenLabel(e.at, e.precision, { short: true })}</span>
        <h3 className="fx-h fx-h--sm">{head}</h3>
        {e.kind === 'sessao' && head !== e.title && <span className="fx-sub">{e.title}{x?.whereStopped ? ` · parou em ${x.whereStopped}` : ''}</span>}
        {sub && <p className="fx-p">{sub.length > 140 ? sub.slice(0, 138) + '…' : sub}</p>}
        {on && (
          <div className="fx-actions">
            {back && <button className="btn now sm" onClick={(ev) => { ev.stopPropagation(); actions.resolveWaypoint(e.id); }}>Resolver</button>}
            {e.kind === 'ponto' && e.resolved && <span className="fx-k">Resolvido</span>}
            {e.kind !== 'carta' && !full && <button className="btn quiet sm" onClick={(ev) => { ev.stopPropagation(); onEdit(e.id); }}>Editar</button>}
          </div>
        )}
      </article>
    );
  };

  const narr = cur?.type === 'chapter' || cur?.type === 'event' ? curChap : null;
  return (
    <section ref={stage} tabIndex={-1} onKeyDown={key} className={`fx${full ? ' is-full' : ''}${reduced ? ' is-reduced' : ''}${vertical ? ' is-vert' : ''}`} aria-label="Linha do tempo. Use as setas para andar entre os registros.">
      <div className="fx-amb" aria-hidden="true">{ambients.map((src) => <div key={src} className={`fx-amb__a${src === ambient ? ' on' : ''}`} style={{ backgroundImage: `url(${src})` }} />)}</div>
      {!vertical && <div ref={big} className="fx-big" aria-hidden="true">{chapters.map((c, i) => <span key={c.id} style={{ left: `${i * 1500 + 200}px` }}>{c.name}</span>)}</div>}
      <canvas ref={dust} className="fx-dust" aria-hidden="true" />
      <div className="fx-spot" aria-hidden="true" />
      <div ref={vp} className="fx-vp" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}>
        <div className="fx-track">{items.map(panel)}</div>
      </div>
      <div className="fx-glow" aria-hidden="true" /><div className="fx-vig" aria-hidden="true" />
      <div className="fx-top">
        {full && <button className="fx-exit" onClick={onExitFull} aria-label="Sair da tela cheia" title="Sair da tela cheia"><Icon name="sairTela" size={18} /></button>}
        <button className="btn ghost sm fx-btn" onClick={() => setTour(!tour)} aria-pressed={tour}>{tour ? '❚❚ Pausar' : '▶ Passeio'}</button>
        {today && <button className="btn sm fx-btn fx-btn--now" onClick={() => center(items.length - 1)}>Hoje</button>}
        {full && <span className="fx-title">{title}</span>}
      </div>
      {narr && (
        <div className="fx-narr" key={narr.id} aria-live="polite">
          <b>{narrate?.saved[narr.id] ?? narr.summary}</b>
          <small>{narrate?.saved[narr.id] ? 'Inferido · narrado pela IA' : 'Resumo do site · só com o que você registrou'}</small>
        </div>
      )}
      {!vertical && (
        <div className="fx-ruler" onClick={onRuler} role="presentation">
          <div className="fx-ruler__fill" style={{ width: `${cur ? pos(cur) : 0}%` }} />
          {labels.map(({ c, p }, i) => <span key={c.id} className="fx-ruler__lb" style={{ left: `${p}%`, transform: i === 0 ? 'none' : undefined }}>{shortDay(c.from)}</span>)}
          {today && <span className="fx-ruler__lb fx-ruler__lb--now" style={{ left: '100%', transform: 'translateX(-100%)' }}>hoje</span>}
          {items.map((it) => it.type === 'event' ? <i key={it.id} className={`fx-ruler__dot${it.e.kind === 'ponto' && !it.e.resolved ? ' a' : ''}`} style={{ left: `${pos(it)}%` }} /> : null)}
          <div className="fx-ruler__hd" style={{ left: `${cur ? pos(cur) : 0}%` }} />
        </div>
      )}
      {viewer !== null && photos.length > 0 && (
        <PhotoViewer title={title} items={photos.map((x) => ({ kind: 'image' as const, src: x.e.image!, label: x.e.title }))} start={Math.max(0, viewer)} onClose={() => setViewer(null)} container={full ? stage.current : null} />
      )}
    </section>
  );
}
