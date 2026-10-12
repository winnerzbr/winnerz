import { useEffect, useState } from 'react';
import { actions, useStore } from '../data/store';
import type { Game } from '../data/types';
import { loadRadar, whenSoon, type RadarInfo } from '../lib/radar';
import { localDay } from '../lib/dates';
import { Link } from '../lib/router';

/** Na ficha: acompanhar no Radar e, para o que ainda vai sair, a data com a precisão real. */
export function RadarToggle({ game, on }: { game: Game; on: boolean }) {
  const today = localDay();
  const v6 = useStore((x) => x.schemaV6 || x.mode === 'demo');
  const upcoming = game.releasedOn ? game.releasedOn > today : game.year == null || game.year >= Number(today.slice(0, 4));
  const [info, setInfo] = useState<RadarInfo | null>(null);
  useEffect(() => {
    if (!game.igdbId || !(on || upcoming)) return;
    let alive = true;
    loadRadar([game.igdbId]).then((r) => alive && setInfo(r[game.igdbId!] ?? null));
    return () => { alive = false; };
  }, [game.igdbId, on, upcoming]);
  const soon = info?.day && info.status === 'previsto' ? whenSoon(info.day, today) : '';
  return (
    <div className="radar-toggle">
      {info && info.status !== 'lancado' && <p className="radar-toggle__when"><span className="muted">Lançamento</span> {info.label}{soon && ` (${soon})`}</p>}
      <button className="btn quiet sm" aria-pressed={on} disabled={!v6} title={v6 ? undefined : 'Disponível depois da migração 0006'} onClick={() => actions.toggleRadar(game.id)}>
        {on ? '◉ No Radar (deixar de acompanhar)' : '◎ Acompanhar no Radar'}
      </button>
      {on && <Link to="/jogos/radar" className="radar-toggle__link">Ver o Radar</Link>}
    </div>
  );
}
