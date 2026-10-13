import { useMemo, useState } from 'react';
import { useStore } from '../data/store';
import type { PieceRef } from '../data/types';
import { CoverArt } from './CoverArt';
import { KindIcon } from './HardwareArt';
import { canonicalPlatform, platformRank, shortPlatform } from '../lib/platforms';

const same = (a: PieceRef, b: PieceRef) => a.t === b.t && a.id === b.id;

/**
 * Escolher peças da coleção pelas capas (e os consoles), na ordem em que são tocadas.
 * Usado pelas Vitrines curadas e pelas salas do Museu.
 */
export function PiecePicker({ value, onChange, hardware = true }: { value: PieceRef[]; onChange: (v: PieceRef[]) => void; hardware?: boolean }) {
  const s = useStore((x) => x);
  const [q, setQ] = useState('');
  const [plat, setPlat] = useState('');
  const [limit, setLimit] = useState(60);
  const plats = useMemo(() => [...new Set(s.copies.map((c) => canonicalPlatform(c.platform)))].sort((a, b) => platformRank(a) - platformRank(b)), [s.copies]);
  const copies = useMemo(() => {
    const t = q.trim().toLowerCase();
    return s.copies
      .filter((c) => s.games[c.gameId] && (!plat || canonicalPlatform(c.platform) === plat) && (!t || s.games[c.gameId].title.toLowerCase().includes(t)))
      .sort((a, b) => s.games[a.gameId].title.localeCompare(s.games[b.gameId].title, 'pt-BR'));
  }, [s.copies, s.games, q, plat]);
  const hws = (s.hardware ?? []).filter((h) => !q.trim() || h.name.toLowerCase().includes(q.trim().toLowerCase()));
  const toggle = (r: PieceRef) => onChange(value.some((v) => same(v, r)) ? value.filter((v) => !same(v, r)) : [...value, r]);
  const order = (r: PieceRef) => value.findIndex((v) => same(v, r)) + 1;

  return (
    <div className="ppick">
      <div className="ppick__bar">
        <input className="field" placeholder="Buscar na coleção" value={q} onChange={(e) => { setQ(e.target.value); setLimit(60); }} aria-label="Buscar na coleção" />
        <select className="field" value={plat} onChange={(e) => { setPlat(e.target.value); setLimit(60); }} aria-label="Plataforma">
          <option value="">Todas as plataformas</option>
          {plats.map((p) => <option key={p} value={p}>{shortPlatform(p)}</option>)}
        </select>
      </div>
      <p className="faint ppick__count" aria-live="polite">{value.length ? `${value.length} ${value.length === 1 ? 'peça escolhida' : 'peças escolhidas'}, na ordem em que você tocou.` : 'Toque nas capas para escolher. A ordem do toque é a ordem da vitrine.'}</p>
      <ul className="ppick__grid">
        {copies.slice(0, limit).map((c) => {
          const r: PieceRef = { t: 'c', id: c.id }, n = order(r);
          return (
            <li key={c.id}>
              <button type="button" className={`ppick__item${n ? ' is-on' : ''}`} aria-pressed={!!n} onClick={() => toggle(r)} aria-label={`${s.games[c.gameId].title}, ${shortPlatform(c.platform)}`}>
                <CoverArt game={s.games[c.gameId]} platform={c.platform} />
                {n > 0 && <span className="ppick__n" aria-hidden="true">{n}</span>}
                <span className="ppick__plat" aria-hidden="true">{shortPlatform(c.platform)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {copies.length > limit && <button type="button" className="btn quiet sm" onClick={() => setLimit((n) => n + 60)}>Mostrar mais ({copies.length - limit})</button>}
      {!copies.length && <p className="muted">Nada na estante com esse nome.</p>}
      {hardware && hws.length > 0 && !plat && (
        <>
          <span className="kicker ppick__h">Consoles e acessórios</span>
          <ul className="ppick__hw">
            {hws.map((h) => {
              const r: PieceRef = { t: 'h', id: h.id }, n = order(r);
              return (
                <li key={h.id}>
                  <button type="button" className={`ppick__hwitem${n ? ' is-on' : ''}`} aria-pressed={!!n} onClick={() => toggle(r)}>
                    <KindIcon k={h.kind} />
                    <span>{h.name}</span>
                    {n > 0 && <span className="ppick__n ppick__n--inline" aria-hidden="true">{n}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
