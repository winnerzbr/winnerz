/**
 * Linha do tempo da Jornada · "Mapa ilustrado": a História como uma ilha pintada.
 * Cada capítulo vira uma região; os registros são pontos na trilha; o que ainda não aconteceu fica a lápis.
 * A pintura sai no navegador uma vez por História e fica guardada nele, para abrir na hora da próxima vez.
 */
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { Link } from '../lib/router';
import { actions } from '../data/store';
import type { TLItem, ChapterItem } from '../lib/chapters';
import { durText } from '../lib/chapters';
import { whenLabel } from '../lib/dates';
import { MAP_W, MAP_H, BIOME_NAME, paintMap, trailPoint, loadPainting, savePainting, type Biome, type MapPlan } from '../lib/mapPainter';
import { Icon } from './Icon';
import type { FaixaPlay, FaixaToday } from './Faixa';

type Pt = { id: string; x: number; y: number; t: number; it: TLItem; kind: string; label: string; sub: string; up: boolean };
const KIND: Record<string, string> = { inicio: 'Início', sessao: 'Sessão', momento: 'Momento', ponto: 'Para voltar', marco: 'Marco', carta: 'Carta' };
const ICON: Record<string, string> = { inicio: '◇', sessao: '●', momento: '✦', ponto: '⚑', marco: '◆', carta: '✉', silence: '…', memory: '◴', today: '☺', goal: '◆' };
const short = (iso: string) => whenLabel(iso, 'dia', { short: true }).replace(/ \d{4}$/, '');

export function PaintedMap({ items, historyId, title, subtitle, play, today, onEdit, reduced }: {
  items: TLItem[]; historyId: string; title: string; subtitle: string; play: FaixaPlay; today: FaixaToday | null; onEdit: (eventId: string) => void; reduced: boolean;
}) {
  const vp = useRef<HTMLDivElement>(null);
  const clouds = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [painting, setPainting] = useState(false);
  const [zoom, setZoom] = useState(() => (typeof window !== 'undefined' && window.innerWidth <= 640 ? 0.42 : 0.62));
  const [sel, setSel] = useState<Pt | null>(null);
  const lite = typeof window !== 'undefined' && (window.innerWidth <= 700 || (navigator.hardwareConcurrency ?? 8) <= 4);

  // Os pontos na trilha, os capítulos como regiões e o que ainda falta.
  const { pts, regions, explored, chapters, goal } = useMemo(() => {
    const route = items.filter((x) => x.type === 'event' || x.type === 'silence' || x.type === 'today');
    const explored = today ? 0.8 : 1;
    const n = Math.max(1, route.filter((x) => x.type !== 'today').length);
    const pts: Pt[] = [];
    let k = 0;
    for (const it of route) {
      const t = it.type === 'today' ? explored : explored * ((k + 0.5) / n) * (today ? 0.9 : 1);
      if (it.type !== 'today') k += 1;
      const [x, y] = trailPoint(t);
      if (it.type === 'event') {
        const e = it.e, x2 = it.session;
        pts.push({ id: it.id, x, y, t, it, kind: e.kind, label: e.kind === 'sessao' && x2?.minutes ? `${e.title} · ${durText(x2.minutes)}` : e.title, sub: `${KIND[e.kind] ?? e.kind} · ${e.dateLabel ?? short(e.at)}`, up: e.kind === 'carta' || e.kind === 'momento' ? k % 2 === 0 : k % 2 === 1 });
      } else if (it.type === 'silence') {
        pts.push({ id: it.id, x, y, t, it, kind: 'silence', label: `${it.days} dias sem jogar`, sub: 'Silêncio', up: k % 2 === 1 });
      } else {
        pts.push({ id: it.id, x, y, t, it, kind: 'today', label: today?.where ? `Você parou em ${today.where}` : 'Você está aqui', sub: 'Hoje', up: false });
      }
    }
    // Rótulos vizinhos não se encostam: o "Hoje" fica embaixo, e quem está perto troca de lado.
    for (let i = pts.length - 2; i >= 0; i--) {
      const a = pts[i], b = pts[i + 1];
      if (Math.hypot(a.x - b.x, a.y - b.y) < 260 && a.up === b.up) a.up = !b.up;
    }
    const chapters = items.filter((x): x is ChapterItem => x.type === 'chapter');
    const regions = chapters.map((c, i) => {
      const own = pts.filter((p) => p.it.type === 'event' && p.it.chapter === c.n);
      const t = own.length ? own.reduce((a, p) => a + p.t, 0) / own.length : explored * ((i + 0.5) / chapters.length);
      const [x, y] = trailPoint(t);
      return { x, y: y - 40, biome: (['floresta', 'montanha', 'neve', 'deserto'] as Biome[])[i % 4], chapter: c };
    });
    const goal = trailPoint(0.95);
    if (today) regions.push({ x: goal[0], y: goal[1] - 40, biome: 'vulcao', chapter: null as unknown as ChapterItem });
    return { pts, regions, explored, chapters, goal };
  }, [items, today]);

  const sessions = items.filter((x) => x.type === 'event' && x.e.kind === 'sessao').length;
  const moments = items.filter((x) => x.type === 'event' && x.e.kind === 'momento').length;
  const backs = items.filter((x) => x.type === 'event' && x.e.kind === 'ponto' && !x.e.resolved).length;
  const key = `${historyId}:${items.length}:${chapters.length}:${explored}:${lite ? 'l' : 'f'}:v1`;

  // Pinta (ou abre a pintura guardada).
  useEffect(() => {
    const signal = { cancelled: false };
    let url: string | null = null;
    (async () => {
      const cached = await loadPainting(key);
      if (signal.cancelled) return;
      if (cached) { url = URL.createObjectURL(cached); setSrc(url); return; }
      setPainting(true);
      try { await document.fonts.load('700 50px Caveat'); } catch { /* sem a fonte: usa a de reserva */ }
      const path: [number, number][] = []; for (let t = 0; t <= 1.0001; t += 0.01) path.push(trailPoint(t));
      const plan: MapPlan = {
        path, explored, goal, lite,
        regions: regions.map(({ x, y, biome }) => ({ x, y, biome })),
        title, subtitle,
        stats: [`${sessions} ${sessions === 1 ? 'sessão' : 'sessões'}`, moments ? `${moments} ${moments === 1 ? 'momento' : 'momentos'}` : '', backs ? `${backs} para voltar` : '', `pintado em ${whenLabel(new Date().toISOString(), 'dia')}`].filter(Boolean).join(' · '),
      };
      const c = document.createElement('canvas');
      await paintMap(c, plan, signal);
      if (signal.cancelled) return;
      c.toBlob((b) => {
        if (signal.cancelled) return;
        if (b) { url = URL.createObjectURL(b); setSrc(url); savePainting(key, b, `${historyId}:`); }
        else setSrc(c.toDataURL('image/jpeg', 0.86));
        setPainting(false);
      }, 'image/webp', 0.86);
    })();
    return () => { signal.cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Começa olhando para onde você está.
  useEffect(() => {
    const v = vp.current; if (!v) return;
    const here = pts.find((p) => p.kind === 'today') ?? pts[pts.length - 1];
    if (here) { v.scrollLeft = here.x * zoom - v.clientWidth * 0.55; v.scrollTop = here.y * zoom - v.clientHeight * 0.5; }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const zoomTo = (nz: number) => {
    const v = vp.current; if (!v) return;
    const min = Math.max(v.clientWidth / MAP_W, v.clientHeight / MAP_H);
    nz = Math.max(min, Math.min(1.6, nz));
    const cx = (v.scrollLeft + v.clientWidth / 2) / zoom, cy = (v.scrollTop + v.clientHeight / 2) / zoom;
    setZoom(nz);
    requestAnimationFrame(() => { v.scrollLeft = cx * nz - v.clientWidth / 2; v.scrollTop = cy * nz - v.clientHeight / 2; });
  };
  const goHere = () => { const v = vp.current, here = pts.find((p) => p.kind === 'today') ?? pts[pts.length - 1]; if (v && here) v.scrollTo({ left: here.x * zoom - v.clientWidth * 0.5, top: here.y * zoom - v.clientHeight * 0.5, behavior: reduced ? 'auto' : 'smooth' }); };

  // Arrastar para passear; nuvens em paralaxe.
  const drag = useRef<{ x: number; y: number; l: number; t: number; moved: boolean } | null>(null);
  const onDown = (e: PointerEvent) => { if ((e.target as HTMLElement).closest('button,a') || e.pointerType !== 'mouse') return; const v = vp.current!; drag.current = { x: e.clientX, y: e.clientY, l: v.scrollLeft, t: v.scrollTop, moved: false }; };
  const onMove = (e: PointerEvent) => { const d = drag.current; if (!d) return; const v = vp.current!; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (Math.abs(dx) + Math.abs(dy) > 5) d.moved = true; v.scrollLeft = d.l - dx; v.scrollTop = d.t - dy; };
  const onUp = () => { setTimeout(() => { drag.current = null; }, 0); };
  const onScroll = () => { if (reduced || !clouds.current || !vp.current) return; clouds.current.style.transform = `translate(${(vp.current.scrollLeft / zoom * 0.25).toFixed(1)}px,${(vp.current.scrollTop / zoom * 0.25).toFixed(1)}px)`; };
  const pick = (p: Pt) => { if (drag.current?.moved) return; setSel(sel?.id === p.id ? null : p); };

  const walked = useMemo(() => { let d = ''; for (let t = 0; t <= explored + 1e-6; t += 0.005) { const [x, y] = trailPoint(t); d += (d ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); } return d; }, [explored]);
  const pencil = useMemo(() => { let d = ''; for (let t = explored; t <= 1.0001; t += 0.005) { const [x, y] = trailPoint(t); d += (d ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); } return d; }, [explored]);

  const selIt = sel?.it;
  return (
    <section className={`pmap${reduced ? ' is-reduced' : ''}`} aria-label="Mapa da Jornada. Arraste para passear e toque nos pontos.">
      <div ref={vp} className="pmap__vp" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp} onScroll={onScroll} onDoubleClick={() => zoomTo(zoom < 0.9 ? 1.1 : 0.62)}>
        <div className="pmap__stage" style={{ width: MAP_W * zoom, height: MAP_H * zoom }}>
          <div className="pmap__inner" style={{ transform: `scale(${zoom})` }}>
            {src ? <img className="pmap__img" src={src} alt="" draggable={false} /> : <div className="pmap__paper" />}
            <svg className="pmap__trail" width={MAP_W} height={MAP_H} aria-hidden="true">
              <path d={walked} stroke="rgba(255,240,200,.65)" strokeWidth="9" fill="none" strokeLinecap="round" />
              {today && <path d={pencil} className="pmap__pen" />}
              <path d={walked} className={`pmap__walk${src && !reduced ? ' is-drawing' : ''}`} />
            </svg>
            {regions.map((r) => r.chapter && (
              <div key={r.chapter.id} className="pmap__ribbon" style={{ left: r.x, top: r.y - 300 }}>{r.chapter.name}<small>{BIOME_NAME[r.biome]} · Capítulo {r.chapter.n}</small></div>
            ))}
            {pts.map((p) => (
              <button key={p.id} className={`pmap__pt k-${p.kind}${p.up ? ' up' : ''}${p.kind === 'ponto' && p.it.type === 'event' && !p.it.e.resolved ? ' is-back' : ''}${sel?.id === p.id ? ' is-on' : ''}`} style={{ left: p.x, top: p.y }} onClick={() => pick(p)} aria-label={`${p.sub}: ${p.label}`}>
                <i>{ICON[p.kind] ?? '●'}</i><b>{p.label.length > 34 ? p.label.slice(0, 33) + '…' : p.label}</b><small>{p.sub}</small>
              </button>
            ))}
            {today && <div className="pmap__pt k-goal is-dim" style={{ left: goal[0], top: goal[1] }} aria-hidden="true"><i>◆</i><b>Zerar</b><small>na névoa até acontecer</small></div>}
            {!reduced && (
              <div ref={clouds} className="pmap__clouds" aria-hidden="true">
                {Array.from({ length: 9 }, (_, i) => <span key={i} className="pmap__cl" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 90}%`, transform: `scale(${0.8 + ((i * 7) % 10) / 7})`, animationDelay: `${-i * 4}s` }} />)}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="pmap__tex" aria-hidden="true" /><div className="pmap__vig" aria-hidden="true" />
      {painting && <div className="pmap__painting" role="status"><span />Pintando o seu mapa…</div>}
      <div className="pmap__zoom">
        <button onClick={() => zoomTo(zoom + 0.15)} aria-label="Aproximar">+</button>
        <button onClick={() => zoomTo(zoom - 0.15)} aria-label="Afastar">−</button>
        <button onClick={goHere} aria-label="Ir para onde você está" title="Ir para onde você está">☺</button>
      </div>
      {sel && selIt && (
        <aside className="pmap__card" aria-live="polite">
          <button className="pmap__x" onClick={() => setSel(null)} aria-label="Fechar">×</button>
          {selIt.type === 'event' && <>
            <span className="pmap__k">{KIND[selIt.e.kind] ?? selIt.e.kind} · {selIt.e.dateLabel ?? whenLabel(selIt.e.at, selIt.e.precision)}</span>
            <h3>{selIt.e.title}</h3>
            {selIt.e.image && <img src={selIt.e.image} alt="" />}
            {selIt.session && <p className="pmap__meta">{[selIt.session.minutes ? durText(selIt.session.minutes) : null, selIt.session.whereStopped ? `parou em ${selIt.session.whereStopped}` : null, selIt.session.feeling ? `“${selIt.session.feeling}”` : null].filter(Boolean).join(' · ')}</p>}
            {(selIt.e.quote || selIt.e.text) && <p>{selIt.e.quote ? `“${selIt.e.quote}”` : selIt.e.text}</p>}
            <div className="pmap__actions">
              {selIt.e.kind === 'ponto' && !selIt.e.resolved && <button className="pmap__btn is-main" onClick={() => actions.resolveWaypoint(selIt.e.id)}>Resolver</button>}
              {selIt.e.kind !== 'carta' && <button className="pmap__btn" onClick={() => onEdit(selIt.e.id)}>Editar</button>}
            </div>
          </>}
          {selIt.type === 'silence' && <>
            <span className="pmap__k">Silêncio · {short(selIt.from)} → {short(selIt.to)}</span>
            <h3>{selIt.days} dias sem jogar</h3>
            {selIt.meanwhile.length > 0 ? <p>Enquanto isso: {selIt.meanwhile.join('; ')}.</p> : <p>O jogo ficou esperando, sem pressa.</p>}
          </>}
          {selIt.type === 'today' && <>
            <span className="pmap__k">Hoje</span>
            <h3>{today?.where ? `Você parou em ${today.where}` : 'Você está aqui'}</h3>
            {today?.note && <p>“{today.note}”</p>}
            <div className="pmap__actions">
              {today?.open ? <Link className="pmap__btn is-main" to="/sessao">Abrir a sessão</Link> : <button className="pmap__btn is-main" onClick={play.onClick}><Icon name="play" size={12} /> {play.label}</button>}
              {today && !today.open && <Link className="pmap__btn" to={`/jornada/${today.slug}/voltar`}>Preparar a volta</Link>}
            </div>
          </>}
        </aside>
      )}
      <p className="pmap__hint">Arraste para passear · toque nos pontos · + e − para o zoom</p>
    </section>
  );
}
