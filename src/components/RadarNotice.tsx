import { useEffect, useMemo, useState } from 'react';
import { Link } from '../lib/router';
import { useStore } from '../data/store';
import { CoverArt } from './CoverArt';
import { loadRadar, daysUntil, whenSoon, type RadarInfo } from '../lib/radar';
import { localDay } from '../lib/dates';
import { radarGames } from '../pages/Radar';

/** No Início, só quando há motivo: algo do seu Radar sai nesta semana (ou saiu ontem). Sem contagem regressiva. */
export function RadarNotice() {
  const s = useStore((x) => x);
  const games = useMemo(() => radarGames(s).filter((g) => g.igdbId), [s]);
  const [info, setInfo] = useState<Record<number, RadarInfo>>({});
  const key = games.map((g) => g.igdbId).join(',');
  useEffect(() => {
    if (!games.length) return;
    let alive = true;
    loadRadar(games.map((g) => g.igdbId!)).then((r) => alive && setInfo(r));
    return () => { alive = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const today = localDay();
  const soon = games.map((g) => ({ g, i: info[g.igdbId!] }))
    .filter(({ i }) => i?.day && ((i.status === 'previsto' && daysUntil(i.day, today) <= 7) || (i.status === 'lancado' && daysUntil(i.day, today) >= -1)))
    .sort((a, b) => a.i!.day!.localeCompare(b.i!.day!));
  if (!soon.length) return null;
  return (
    <section className="card aside-card radar-home" aria-labelledby="radar-home">
      <h2 id="radar-home" className="t">No seu Radar</h2>
      <ul>
        {soon.slice(0, 3).map(({ g, i }) => {
          const w = whenSoon(i!.day!, today);
          return (
            <li key={g.id}>
              <Link to={`/jogos/${g.slug}`} className="radar-home__item">
                <span className="radar-note__cover"><CoverArt game={g} /></span>
                <span><strong>{g.title}</strong><span className="muted">{i!.status === 'lancado' ? `Saiu ${w || 'agora'}.` : `Sai ${w ? (w === 'hoje' || w === 'amanhã' ? w : `${/sábado|domingo/.test(w) ? 'no' : 'na'} ${w}`) : i!.label.replace(/^Sai em /, 'em ')}.`}</span></span>
              </Link>
            </li>
          );
        })}
      </ul>
      <Link to="/jogos/radar" className="btn ghost sm">Abrir o Radar</Link>
    </section>
  );
}
