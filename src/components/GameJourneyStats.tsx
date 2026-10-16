/** "Jornadas da comunidade" na ficha do jogo: números anônimos de quem liberou. Nada com menos de 5 pessoas. */
import { useEffect, useState } from 'react';
import { Link } from '../lib/router';
import { useStore } from '../data/store';
import { journeyStatsApi, type JourneyStats } from '../data/journeyStatsApi';

const pct = (a: number | null | undefined, b: number) => (a == null ? null : Math.round((a / b) * 100));
const few = 'menos de 5';
const days = (d: number) => (d < 1 ? 'menos de 1 dia' : d === 1 ? '1 dia' : d < 60 ? `${d} dias` : `${Math.round(d / 30)} meses`);
const hours = (h: number) => `${String(h).replace('.', ',').replace(/,0$/, '')} h`;
const mins = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim());

export function GameJourneyStats({ slug, title }: { slug: string; title: string }) {
  const counting = useStore((s) => s.prefs.comunidade?.numeros ?? false);
  const [st, setSt] = useState<JourneyStats | null | undefined>(undefined);
  useEffect(() => { let alive = true; journeyStatsApi.get(slug).then((x) => alive && setSt(x)).catch(() => alive && setSt(null)); return () => { alive = false; }; }, [slug]);
  if (!st) return null;
  const foot = (
    <p className="faint gjs__foot">
      Números de quem liberou nas Preferências{st.pessoas ? ` (${st.pessoas} pessoas)` : ''}, sem nome e sem lista. Abaixo de 5 pessoas, não mostramos.
      {' '}{counting ? 'As suas Jornadas entram na conta.' : 'As suas não entram.'} <Link to="/preferencias#comunidade">{counting ? 'Mudar' : 'Contar as minhas'}</Link>
    </p>
  );
  if (!st.enough) return (
    <section aria-labelledby="gjs" className="cm-gamesec gjs">
      <div className="sec-head"><h2 id="gjs" className="t sec-title">Jornadas da comunidade</h2></div>
      <p className="muted">Ainda são poucas Jornadas de {title} para mostrar números sem expor ninguém. Quando 5 pessoas que liberaram tiverem este jogo, aparecem aqui quantas zeraram, quanto tempo levam e onde costumam pausar.</p>
      {foot}
    </section>
  );
  const n = st.pessoas ?? 0;
  const tiles: { k: string; v: string; s?: string }[] = [];
  tiles.push({ k: 'Zeraram', v: st.zeraram == null ? few : `${pct(st.zeraram, n)}%`, s: st.zeraram == null ? undefined : `${st.zeraram} de ${n} pessoas` });
  if (st.dias) tiles.push({ k: 'Do começo ao fim', v: days(st.dias.mediana), s: st.dias.p25 != null && st.dias.p75 != null ? `metade leva entre ${days(st.dias.p25)} e ${days(st.dias.p75)}` : `de ${st.dias.n} pessoas` });
  if (st.horas) tiles.push({ k: 'Horas até zerar', v: hours(st.horas.mediana), s: `as que ${st.horas.n} pessoas informaram` });
  if (st.sessoes) tiles.push({ k: 'Sessões até zerar', v: String(st.sessoes.mediana), s: st.minutos ? `de uns ${mins(st.minutos)} cada` : undefined });
  else if (st.minutos) tiles.push({ k: 'Sessão típica', v: mins(st.minutos) });
  tiles.push({ k: 'Jogando agora', v: st.jogando == null ? few : String(st.jogando) });
  const stopped = (st.pausaram ?? 0) + (st.largaram ?? 0);
  if (st.pausaram != null || st.largaram != null) tiles.push({ k: 'Pausaram ou largaram', v: String(stopped), s: st.progressoAoPausar != null ? `em média por volta de ${st.progressoAoPausar}%` : undefined });
  if (st.rejogaram != null) tiles.push({ k: 'Jogaram de novo', v: String(st.rejogaram) });
  return (
    <section aria-labelledby="gjs" className="cm-gamesec gjs">
      <div className="sec-head"><h2 id="gjs" className="t sec-title">Jornadas da comunidade</h2>{st.exemplo && <span className="kicker">Números de exemplo</span>}</div>
      <dl className="gjs__tiles">{tiles.map((t) => <div key={t.k} className="gjs__tile"><dt className="kicker">{t.k}</dt><dd><b className="t">{t.v}</b>{t.s && <small className="faint">{t.s}</small>}</dd></div>)}</dl>
      {!!st.pausas?.length && (
        <p className="gjs__stops"><span className="kicker">Onde costumam pausar</span> {st.pausas.map((p, i) => <span key={p.part}>{i ? ' · ' : ''}{p.name ?? 'Um capítulo com nome de spoiler'}{p.pct != null ? ` (perto de ${p.pct}%)` : ''}</span>)}</p>
      )}
      {foot}
    </section>
  );
}
