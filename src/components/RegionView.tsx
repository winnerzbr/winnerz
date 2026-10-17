/**
 * S3 · Jogo aberto "Por região" (Elden Ring e outros divididos em etapas, áreas ou chefes): as regiões do jogo com o
 * andamento de cada uma na linha do horizonte, e a região escolhida com o que tem nela (feito, o próximo, o resto e o
 * que tem spoiler, coberto) e as suas sessões ali. Regiões ainda longe ficam com o nome escondido.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { History, Session } from '../data/types';
import type { GameOutline, OutlinePart } from '../lib/outline';
import { partAt } from '../lib/outline';
import { durText } from '../lib/chapters';
import { whenLabel } from '../lib/dates';
import { Icon } from './Icon';

const THIS_YEAR = String(new Date().getFullYear());
const day = (iso: string) => { const t = whenLabel(iso, 'dia', { short: true }); return t.endsWith(` ${THIS_YEAR}`) ? t.slice(0, -5) : t; };
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

type Region = { key: string; name: string; items: OutlinePart[]; done: number; sessions: Session[]; from?: string; to?: string; minutes: number };

export function RegionView({ outline, history, sessions, images, play, today, video, title, full = false, onExitFull }: {
  outline: GameOutline; history: History; sessions: Session[]; images: string[]; title?: string;
  /** Tela cheia (como a faixa): Esc ou o botão saem. */ full?: boolean; onExitFull?: () => void;
  play: { label: string; now: boolean; onClick: () => void }; today: { open: boolean; note?: string } | null;
  video?: (part: OutlinePart, label: string) => ReactNode;
}) {
  const parts = useMemo(() => [...outline.parts].sort((a, b) => a.pct - b.pct), [outline.parts]);
  // Quando cada item foi feito: a primeira sessão que o marcou.
  const doneAt = useMemo(() => {
    const m = new Map<string, string>();
    for (const x of [...sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt))) for (const d of x.partMarks?.done ?? []) if (!m.has(d.id)) m.set(d.id, x.startedAt);
    return m;
  }, [sessions]);
  const regions = useMemo(() => {
    const out: Region[] = [];
    for (const p of parts) {
      const key = p.group ?? '—';
      let r = out.find((x) => x.key === key);
      if (!r) { r = { key, name: p.group ?? 'Sem região', items: [], done: 0, sessions: [], minutes: 0 }; out.push(r); }
      r.items.push(p);
      if (doneAt.has(p.id)) r.done++;
    }
    for (const r of out) {
      const ids = new Set(r.items.map((p) => p.id));
      r.sessions = sessions.filter((x) => (x.partMarks?.done ?? []).some((d) => ids.has(d.id)) || (x.partMarks?.from && ids.has(x.partMarks.from.id))).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
      r.from = r.sessions[0]?.startedAt; r.to = r.sessions.at(-1)?.startedAt;
      r.minutes = r.sessions.reduce((a, x) => a + (x.minutes ?? 0), 0);
    }
    return out;
  }, [parts, doneAt, sessions]);
  const cur = partAt(parts, history.progress, history.part);
  const curKey = cur ? cur.group ?? '—' : regions.find((r) => r.done < r.items.length)?.key ?? regions[0]?.key;
  // Até onde os nomes aparecem: as regiões visitadas e as duas seguintes.
  const lastSeen = Math.max(regions.findIndex((r) => r.key === curKey), ...regions.map((r, i) => (r.done || r.sessions.length ? i : -1)));
  const named = regions.slice(0, lastSeen + 3);
  const hidden = regions.length - named.length;
  const [sel, setSel] = useState<string | undefined>(undefined);
  const region = regions.find((r) => r.key === (sel ?? curKey)) ?? regions[0];
  const ri = regions.indexOf(region);
  const [opened, setOpened] = useState<Set<string>>(() => new Set());
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!full) return;
    box.current?.requestFullscreen?.().catch(() => {});
    const onChange = () => { if (!document.fullscreenElement) onExitFull?.(); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onExitFull?.(); };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('fullscreenchange', onChange); document.removeEventListener('keydown', esc); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
  }, [full, onExitFull]);
  if (!region) return null;
  const next = region.items.find((p) => !doneAt.has(p.id));
  const isCur = region.key === curKey;
  const img = images.length ? images[ri % images.length] : undefined;
  const kinds = (r: Region) => {
    const by = new Map<string, [number, number]>();
    for (const p of r.items) if (p.kind && p.kind !== 'opcional') { const k = by.get(p.kind) ?? [0, 0]; k[1]++; if (doneAt.has(p.id)) k[0]++; by.set(p.kind, k); }
    return [...by].slice(0, 3).map(([k, [d, t]]) => `${k} ${d} de ${t}`).join(' · ');
  };
  const names = (x: Session) => (x.partMarks?.done ?? []).filter((d) => region.items.some((p) => p.id === d.id)).map((d) => d.name);
  const nOf = (x: Session) => sessions.filter((y) => y.startedAt <= x.startedAt).length;

  return (
    <div ref={box} className={`rv${full ? ' is-full' : ''}`}>
      {full && (
        <div className="rv__fullbar">
          <span className="rv__label">{title}</span>
          <button className="btn ghost sm" onClick={onExitFull}><Icon name="sairTela" size={16} />Sair da tela cheia</button>
        </div>
      )}
      <nav className="rv__list" aria-label="Regiões">
        {named.map((r, i) => {
          const pct = r.items.length ? (r.done / r.items.length) * 100 : 0;
          const here = r.key === curKey, full = r.done === r.items.length && r.done > 0;
          return (
            <button key={r.key} type="button" className={`rv__reg${here ? ' is-now' : ''}${r === region ? ' is-sel' : ''}${!r.done && !r.sessions.length && !here ? ' is-far' : ''}`} aria-current={r === region ? 'true' : undefined} onClick={() => setSel(r.key)}>
              <span className="rv__reg-top"><b>{r.name}</b><span className="mono">{r.done} de {r.items.length}{full ? ' ✓' : here ? ' · aqui' : ''}</span></span>
              <span className={`rv__hz${full ? ' is-full' : here ? ' is-now' : ''}`} aria-hidden="true"><i style={{ width: `${pct}%` }} />{here && <em style={{ left: `${pct}%` }} />}</span>
              <small>{r.done || r.sessions.length ? [kinds(r), r.from ? (r.to && day(r.to) !== day(r.from) ? `${day(r.from)} – ${day(r.to)}` : day(r.from)) : ''].filter(Boolean).join(' · ') : i > lastSeen ? 'Ainda não foi' : kinds(r)}</small>
            </button>
          );
        })}
        {hidden > 0 && <p className="rv__more">Mais {plural(hidden, 'região', 'regiões')} à frente · nomes escondidos</p>}
      </nav>

      <section className="rv__main" aria-label={region.name}>
        {img && <div className="rv__bg" style={{ backgroundImage: `url(${img})` }} aria-hidden="true" />}
        <div className="rv__head">
          <div>
            <span className={`rv__k${isCur ? ' is-now' : ''}`}>Região {ri + 1}{isCur ? ' · você está aqui' : ''}</span>
            <h3 className="rv__name">{region.name}</h3>
            <p className="rv__facts">{[region.from ? (isCur ? `Desde ${day(region.from)}` : day(region.from)) : 'Ainda sem sessões aqui', region.sessions.length ? plural(region.sessions.length, 'sessão', 'sessões') : '', region.minutes ? durText(region.minutes) : ''].filter(Boolean).join(' · ')}</p>
          </div>
          {isCur && !today?.open && <button className={`btn sm ${play.now ? 'now' : 'primary'}`} onClick={play.onClick}><Icon name="play" size={13} />{play.label}</button>}
        </div>

        <div className="rv__block">
          <span className="rv__label">O que tem aqui</span>
          <ul className="rv__items">
            {region.items.map((p) => {
              const done = doneAt.get(p.id);
              const isNext = p === next;
              const covered = p.spoiler && !done && !opened.has(p.id);
              return (
                <li key={p.id} className={`rv__it${done ? ' is-done' : ''}${isNext ? ' is-next' : ''}${covered ? ' is-covered' : ''}`}>
                  <span className="rv__it-k">{[p.kind ?? 'item', done ? `feito ${day(done)}` : isNext ? 'o próximo' : ''].filter(Boolean).join(' · ')}</span>
                  {covered
                    ? <button type="button" className="rv__cover" onClick={() => setOpened(new Set([...opened, p.id]))}>Com spoiler · tocar para ver</button>
                    : <b>{done ? '✓ ' : ''}{p.name}</b>}
                  {!covered && video?.(p, p.kind ? p.kind[0].toUpperCase() + p.kind.slice(1) : 'Trecho')}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rv__block">
          <span className="rv__label">Suas sessões em {region.name}</span>
          {region.sessions.length || (isCur && today) ? (
            <div className="rv__sess">
              {region.sessions.slice(-4).map((x) => (
                <article key={x.id} className="rv__s">
                  <span className="rv__it-k">Sessão {nOf(x)} · {day(x.startedAt)}{x.minutes ? ` · ${durText(x.minutes)}` : ''}</span>
                  <b>{x.partMarks?.from && region.items.some((p) => p.id === x.partMarks!.from!.id) && !names(x).length ? `Começou em ${x.partMarks.from.name}` : names(x).length ? `Fez: ${names(x).join(', ')}` : x.whereStopped ?? 'Sessão'}</b>
                  {x.note && <small>“{x.note}”</small>}
                </article>
              ))}
              {isCur && today && (
                <article className="rv__s is-today">
                  <span className="rv__it-k">Hoje{today.open ? ' · sessão aberta' : ''}</span>
                  <b>{next ? `Próximo: ${next.spoiler && !opened.has(next.id) ? 'com spoiler' : next.name}` : 'Tudo feito por aqui'}</b>
                  {today.note && <small>Recado: {today.note}</small>}
                </article>
              )}
            </div>
          ) : <p className="faint">Nenhuma sessão marcada nesta região ainda. No fim da sessão, marque o que você fez.</p>}
        </div>
      </section>
    </div>
  );
}
