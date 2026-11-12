/**
 * Linha do tempo geral da Jornada · um mês por cena, com o corte em lâmina (igual à linha do tempo de cada jogo).
 * Embaixo, a mesma régua da linha do jogo, mas com as capas dos jogos de cada mês centradas na linha.
 * Escolhido em 12/11/2026 (prévia "Lâmina").
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import { Link } from '../lib/router';
import { CoverArt } from './CoverArt';
import type { GlobalItem } from '../lib/memory';
import type { Game } from '../data/types';

const TZ = 'America/Sao_Paulo';
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
const ymOf = (iso: string) => { const [y, m] = new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ }).split('-').map(Number); return { y, m }; };

type Jogo = { game: Game; items: GlobalItem[]; label: string; zerou: boolean; to: string };
export type Mes = { key: string; nome: string; ano: number; idx: number; agora: boolean; items: GlobalItem[]; jogos: Jogo[]; soltos: GlobalItem[]; resumo: string; arte?: string };

const ehZerou = (x: GlobalItem) => x.ev === 'marco' && /^zerou$/i.test(x.title.trim());

/** Agrupa os registros com data em meses, do mais antigo ao mais recente. */
export function meses(list: GlobalItem[]): Mes[] {
  const hoje = ymOf(new Date().toISOString());
  const map = new Map<string, Mes>();
  for (const it of list) {
    if (it.precision === 'desconhecida') continue;
    const { y, m } = ymOf(it.at);
    const soAno = it.precision === 'ano';
    const key = soAno ? `${y}` : `${y}-${String(m).padStart(2, '0')}`;
    let mes = map.get(key);
    if (!mes) { mes = { key, nome: soAno ? String(y) : MESES[m - 1], ano: y, idx: y * 12 + (soAno ? 0 : m - 1), agora: !soAno && y === hoje.y && m === hoje.m, items: [], jogos: [], soltos: [], resumo: '' }; map.set(key, mes); }
    mes.items.push(it);
  }
  const out = [...map.values()].sort((a, b) => a.idx - b.idx || a.key.length - b.key.length);
  for (const mes of out) {
    const porJogo = new Map<string, GlobalItem[]>();
    for (const it of mes.items) {
      if (!it.game) { mes.soltos.push(it); continue; }
      porJogo.set(it.game.id, [...(porJogo.get(it.game.id) ?? []), it]);
    }
    let sessoes = 0;
    const zerados: string[] = [], comecados: string[] = [];
    for (const items of porJogo.values()) {
      const game = items[0].game!;
      const jor = items.filter((x) => x.kind === 'jornada');
      const sess = jor.filter((x) => x.ev === 'sessao').length;
      const mom = jor.filter((x) => x.ev === 'momento' || (x.ev === 'marco' && !ehZerou(x))).length;
      const zerou = jor.some(ehZerou), comecou = jor.some((x) => x.ev === 'inicio');
      const lote = items.find((x) => x.id.startsWith('batch-'));
      const chegou = items.some((x) => x.kind === 'colecao' && !x.id.startsWith('batch-'));
      sessoes += sess;
      if (zerou) zerados.push(game.title);
      if (comecou) comecados.push(game.title);
      const label = lote ? lote.title : [zerou ? 'Zerou' : '', sess ? plural(sess, 'sessão', 'sessões') : '', comecou && !zerou ? 'começou' : '', !sess && mom ? plural(mom, 'momento', 'momentos') : '', chegou && !jor.length ? 'Chegou à coleção' : ''].filter(Boolean).join(' · ') || plural(items.length, 'registro', 'registros');
      const to = lote ? '/colecao' : jor.length ? `/jornada/${game.slug}/linha-do-tempo` : (items[0].to ?? `/jogos/${game.slug}`);
      mes.jogos.push({ game, items, label, zerou, to });
    }
    mes.jogos.sort((a, b) => Number(b.zerou) - Number(a.zerou) || b.items.length - a.items.length);
    const nJogos = mes.jogos.length;
    mes.resumo = [nJogos ? plural(nJogos, 'jogo', 'jogos') : '', sessoes ? plural(sessoes, 'sessão', 'sessões') : '', zerados.length ? (zerados.length <= 2 ? `zerou ${zerados.join(' e ')}` : `zerou ${zerados.length} jogos`) : '', comecados.length && !zerados.length ? `começou ${comecados[0]}` : ''].filter(Boolean).join(' · ');
    const foto = mes.items.find((x) => ehZerou(x) && x.image)?.image ?? mes.items.find((x) => x.image)?.image;
    const g = mes.jogos[0]?.game;
    mes.arte = foto ?? g?.backdrop ?? g?.artworks?.[0] ?? g?.cover;
  }
  return out;
}

type Lay = { w: number; rows: number; titles: boolean };
/** Escolhe quantas fileiras e o tamanho das capas para caberem todas no espaço que sobra na cena. */
function arrumar(n: number, W: number, H: number): Lay {
  const gap = 12;
  let best: Lay | null = null;
  for (let r = 1; r <= Math.min(n, 4); r++) {
    const cols = Math.ceil(n / r), titles = r === 1 && n <= 6;
    const rowH = (H - (titles ? 0 : 30) - (r - 1) * 10) / r - (titles ? 58 : 0);
    const w = Math.floor(Math.min(124, (W - (cols - 1) * gap) / cols, rowH * 0.75));
    if (!best || w > best.w + (titles ? -6 : 0)) best = { w, rows: r, titles };
  }
  return best ?? { w: 40, rows: 1, titles: false };
}

export function LinhaMeses({ meses: lista, reduced, light }: { meses: Mes[]; reduced: boolean; light: boolean }) {
  const n = lista.length;
  const home = n - 1;
  const [focus, setFocus] = useState(home);
  const [was, setWas] = useState<number | null>(null);
  const [tour, setTour] = useState(false);
  /** Tamanho das capas de cada mês, para todos os jogos caberem na cena (medido na tela). */
  const [lay, setLay] = useState<Record<string, Lay>>({});
  const [info, setInfo] = useState(0);
  const pnRef = useRef<HTMLElement | null>(null);
  const focusRef = useRef(focus);
  focusRef.current = focus;
  const vp = useRef<HTMLDivElement>(null);
  const dust = useRef<HTMLCanvasElement>(null);
  const lastWheel = useRef(0);
  const touch = useRef<number | null>(null);
  const drag = useRef<{ x: number; dx: number; moved: boolean } | null>(null);

  const center = useCallback((i: number) => {
    const k = Math.max(0, Math.min(n - 1, i));
    if (k !== focusRef.current) { setWas(focusRef.current); setFocus(k); }
  }, [n]);

  // Mede o espaço que sobra embaixo do título do mês e arruma as capas nele.
  const medir = useCallback(() => {
    const pn = pnRef.current, grid = pn?.querySelector<HTMLElement>('.lm-jogos'), m = lista[focusRef.current];
    if (!pn || !grid || !m) return;
    const cs = getComputedStyle(pn), gap = parseFloat(cs.rowGap) || 12;
    let used = 0, k = 0;
    for (const ch of Array.from(pn.children) as HTMLElement[]) {
      if (ch === grid || getComputedStyle(ch).position === 'absolute') continue;
      used += ch.offsetHeight; k++;
    }
    const H = pn.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - used - gap * k - 8;
    const W = pn.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const novo = arrumar(m.jogos.length + m.soltos.length, W, H);
    setLay((o) => { const v = o[m.key]; return v && v.w === novo.w && v.rows === novo.rows && v.titles === novo.titles ? o : { ...o, [m.key]: novo }; });
  }, [lista]);
  useLayoutEffect(() => { setInfo(0); medir(); }, [focus, medir]);
  useEffect(() => {
    const v = vp.current;
    if (!v || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => medir());
    ro.observe(v);
    return () => ro.disconnect();
  }, [medir]);

  // Roda do mouse: um mês por vez; nas pontas, a página rola normalmente.
  useEffect(() => {
    const v = vp.current;
    if (!v) return;
    const wheel = (e: WheelEvent) => {
      const d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      const i = focusRef.current;
      if (Math.abs(d) < 12 || (d > 0 && i >= n - 1) || (d < 0 && i <= 0)) return;
      e.preventDefault();
      if (Date.now() - lastWheel.current < 700) return;
      lastWheel.current = Date.now();
      center(i + (d > 0 ? 1 : -1));
    };
    v.addEventListener('wheel', wheel, { passive: false });
    return () => v.removeEventListener('wheel', wheel);
  }, [center, n]);

  // Arrastar com o mouse.
  const onDown = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || (e.target as HTMLElement).closest('button,a')) return;
    e.preventDefault();
    drag.current = { x: e.clientX, dx: 0, moved: false };
  };
  const onMove = (e: PointerEvent) => { const d = drag.current; if (!d) return; d.dx = e.clientX - d.x; if (Math.abs(d.dx) > 5) d.moved = true; };
  const onUp = () => { const d = drag.current; drag.current = null; if (d?.moved && Math.abs(d.dx) > 60) center(focusRef.current + (d.dx < 0 ? 1 : -1)); };

  // Passeio: um mês a cada 4,6 s. No fim, começa do primeiro.
  useEffect(() => {
    if (!tour) return;
    const t = setInterval(() => { const i = focusRef.current; if (i >= n - 1) { setTour(false); return; } center(i + 1); }, 4600);
    return () => clearInterval(t);
  }, [tour, n, center]);
  const passeio = () => { if (tour) { setTour(false); return; } if (focusRef.current >= n - 1) { setWas(focusRef.current); setFocus(0); } setTour(true); };

  // Poeira dourada (some com "reduzir movimento" e no modo leve).
  useEffect(() => {
    const c = dust.current;
    if (!c || reduced || light) return;
    const g = c.getContext('2d');
    if (!g) return;
    let P: { x: number; y: number; r: number; v: number; a: number }[] = [], raf = 0;
    const size = () => { c.width = c.clientWidth; c.height = c.clientHeight; P = Array.from({ length: c.width < 700 ? 30 : 70 }, () => ({ x: Math.random() * c.width, y: Math.random() * c.height, r: 0.6 + Math.random() * 1.6, v: 0.1 + Math.random() * 0.3, a: Math.random() * 6.28 })); };
    size();
    const draw = (t: number) => {
      g.clearRect(0, 0, c.width, c.height);
      for (const p of P) {
        p.x -= p.v; p.y += Math.sin(t * 0.001 + p.a) * 0.15;
        if (p.x < -10) p.x = c.width + 10;
        g.globalAlpha = 0.3 + Math.sin(t * 0.002 + p.a) * 0.22; g.fillStyle = '#FFE2B8'; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    window.addEventListener('resize', size);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size); };
  }, [reduced, light]);

  // Régua: cada mês avança um passo, mais um pouco pelos meses vazios no meio (raiz, para os anos parados
  // aparecerem sem esmagar o resto).
  const pos = useMemo(() => {
    let acc = 0;
    const raw = lista.map((m, i) => { if (i) acc += 1 + Math.min(5, Math.sqrt(Math.max(0, m.idx - lista[i - 1].idx - 1)) * 0.7); return acc; });
    const max = acc || 1;
    return raw.map((v) => (n === 1 ? 50 : (v / max) * 100));
  }, [lista, n]);
  // Rótulos sem se encostar: o primeiro, o último e os do meio com folga.
  const labels = useMemo(() => {
    const out: number[] = [];
    lista.forEach((_, i) => { if (i === n - 1) return; if (!out.length || pos[i] - pos[out[out.length - 1]] >= 11) out.push(i); });
    if (n > 1) { while (out.length && pos[n - 1] - pos[out[out.length - 1]] < 9) out.pop(); }
    if (n) out.push(n - 1);
    return out;
  }, [lista, pos, n]);
  /** Na régua, as capas das pontas não passam da borda. */
  const at = (p: number) => `calc(var(--cw) * .8 + (100% - var(--cw) * 1.6) * ${(p / 100).toFixed(4)})`;
  const curto = (m: Mes) => (m.key.length === 4 ? m.nome : `${m.nome.slice(0, 3).toLowerCase()} ${m.ano}`);
  const tam = n <= 10 ? 'g' : n <= 24 ? 'm' : 'p';

  const onRuler = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const r = e.currentTarget.getBoundingClientRect(), cw = parseFloat(getComputedStyle(e.currentTarget).getPropertyValue('--cw')) || 30, p = ((e.clientX - r.left - cw * 0.8) / Math.max(1, r.width - cw * 1.6)) * 100;
    let best = 0, bd = Infinity;
    pos.forEach((x, i) => { const d = Math.abs(x - p); if (d < bd) { bd = d; best = i; } });
    setTour(false); center(best);
  };
  const key = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); center(focus + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); center(focus - 1); }
    if (e.key === 'Home') { e.preventDefault(); center(0); }
    if (e.key === 'End') { e.preventDefault(); center(n - 1); }
  };

  const cur = lista[focus];
  const ambients = useMemo(() => [...new Set(lista.map((m) => m.arte).filter((x): x is string => !!x))], [lista]);

  return (
    <section tabIndex={-1} onKeyDown={key} className={`fx is-blade lm${reduced ? ' is-reduced' : ''}${ambients.length ? ' has-imgs' : ''}`} aria-label="Linha do tempo, um mês por cena. Use as setas para andar entre os meses.">
      <div className="fx-amb" aria-hidden="true">{ambients.map((src) => <div key={src} className={`fx-amb__a${src === cur?.arte ? ' on' : ''}`} style={{ backgroundImage: `url(${src})` }} />)}</div>
      <canvas ref={dust} className="fx-dust" aria-hidden="true" />
      <div ref={vp} className="fx-vp" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}
        onTouchStart={(e) => { touch.current = e.touches[0]?.clientX ?? null; }}
        onTouchEnd={(e) => { const a = touch.current, b = e.changedTouches[0]?.clientX; touch.current = null; if (a != null && b != null && Math.abs(b - a) > 50) center(focus + (b < a ? 1 : -1)); }}>
        <div className="fx-track">
          {lista.map((m, i) => {
            const on = i === focus;
            const L = lay[m.key];
            const todos = [...m.jogos.map((j) => ({ id: j.game.id, to: j.to, nome: j.game.title, label: j.zerou ? j.label.replace(/^Zerou( · )?/, '') || 'Zerou' : j.label, j, x: null as GlobalItem | null })), ...m.soltos.map((x) => ({ id: x.id, to: x.to ?? '#', nome: x.title, label: x.text ?? x.label, j: null as Jogo | null, x }))];
            const sel = todos[Math.min(info, todos.length - 1)];
            return (
              <div key={m.key} className={`fx-sc${on ? ' is-on' : ''}${i === was && !on ? ' is-was' : ''}`} aria-hidden={!on || undefined}>
                {(on || i === was) && (
                  <article ref={on ? (el) => { pnRef.current = el; } : undefined} className="fx-pn lm-mes" data-on={on || undefined} aria-label={`${m.nome} de ${m.ano}`}>
                    {m.arte && <div className="fx-bg" style={{ backgroundImage: `url(${m.arte})` }} />}<div className="fx-sh" />
                    <span className={`fx-k${m.agora ? ' fx-k--now' : ''}`}>{m.key.length === 4 ? 'Ano sem mês certo' : m.ano}{m.agora ? ' · agora' : ''}</span>
                    <h2 className="fx-h">{m.nome}</h2>
                    {m.resumo && <p className="fx-p">{m.resumo}</p>}
                    {todos.length > 0 && (
                      <div className={`lm-jogos${L && !L.titles ? ' is-compacto' : ''}`} style={{ '--w': `${L?.w ?? 0}px`, '--cols': Math.ceil(todos.length / (L?.rows ?? 1)), visibility: L ? undefined : 'hidden' } as CSSProperties}>
                        <div className="lm-jogos__grade">
                          {todos.map((t, k) => (
                            <Link key={t.id} to={t.to} className={`lm-jg${!L?.titles && k === info ? ' is-sel' : ''}`} tabIndex={on ? undefined : -1} aria-label={`${t.nome}: ${t.label}`}
                              onMouseEnter={() => setInfo(k)} onFocus={() => setInfo(k)}>
                              <span className={`lm-jg__c${t.j ? '' : ' lm-jg__c--solto'}`}>{t.j ? <CoverArt game={t.j.game} /> : t.x?.label}{t.j?.zerou && <span className="lm-jg__z">Zerou</span>}</span>
                              {L?.titles && <><b>{t.nome}</b><small>{t.label}</small></>}
                            </Link>
                          ))}
                        </div>
                        {L && !L.titles && sel && <p className="lm-info" aria-hidden="true"><b>{sel.nome}</b>{sel.label ? ` · ${sel.label}` : ''}</p>}
                      </div>
                    )}
                  </article>
                )}
                <i className="fx-edge" aria-hidden="true" />
              </div>
            );
          })}
        </div>
      </div>
      {n > 1 && (
        <>
          <button type="button" className="fx-arrow fx-arrow--l" onClick={() => { setTour(false); center(focus - 1); }} disabled={focus <= 0} aria-label="Mês anterior">‹</button>
          <button type="button" className="fx-arrow fx-arrow--r" onClick={() => { setTour(false); center(focus + 1); }} disabled={focus >= n - 1} aria-label="Próximo mês">›</button>
        </>
      )}
      <div className="fx-glow" aria-hidden="true" /><div className="fx-vig" aria-hidden="true" />
      <div className="fx-top">
        {n > 1 && <button className="btn ghost sm fx-btn" onClick={passeio} aria-pressed={tour}>{tour ? '❚❚ Pausar' : '▶ Passeio'}</button>}
        {n > 1 && <button className="btn sm fx-btn fx-btn--now" onClick={() => { setTour(false); center(home); }}>Hoje</button>}
        {n > 1 && <span className="fx-count" aria-hidden="true"><b>{String(focus + 1).padStart(2, '0')}</b> / {String(n).padStart(2, '0')}</span>}
      </div>
      <div className={`fx-ruler fx-ruler--capas is-${tam}`} onClick={onRuler} role="navigation" aria-label="Meses">
        <i className="lm-line" aria-hidden="true" />
        <div className="fx-ruler__fill" style={{ width: at(pos[focus] ?? 0) }} />
        {labels.map((i) => <span key={lista[i].key} className={`fx-ruler__lb${lista[i].agora ? ' fx-ruler__lb--now' : ''}`} style={{ left: at(pos[i]) }}>{lista[i].agora ? 'agora' : curto(lista[i])}</span>)}
        {lista.map((m, i) => {
          const g = m.jogos[0]?.game;
          return (
            <button key={m.key} type="button" className={`lm-cap${i === focus ? ' is-on' : ''}`} style={{ left: at(pos[i]), zIndex: i === focus ? 40 : 2 + i % 3 }}
              onClick={() => { setTour(false); center(i); }} aria-label={`${m.nome} de ${m.ano}${m.resumo ? `: ${m.resumo}` : ''}`} aria-current={i === focus ? 'date' : undefined} title={`${curto(m)}${g ? ` · ${g.title}` : ''}`}>
              {g ? <CoverArt game={g} /> : <span className="lm-cap__v" />}
              {m.jogos.length > 1 && <span className="lm-cap__n">{m.jogos.length}</span>}
            </button>
          );
        })}
        <div className="fx-ruler__hd" style={{ left: at(pos[focus] ?? 0) }} />
      </div>
    </section>
  );
}
