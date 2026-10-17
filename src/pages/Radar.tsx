import { useEffect, useMemo, useState } from 'react';
import { Link } from '../lib/router';
import { actions, useStore } from '../data/store';
import type { Game, State } from '../data/types';
import { SubNav } from '../components/SubNav';
import { CoverArt } from '../components/CoverArt';
import { Backdrop } from '../components/Backdrop';
import { loadRadar, whenSoon, daysUntil, type RadarInfo } from '../lib/radar';
import { localDay } from '../lib/dates';
import { shortPlatform } from '../lib/platforms';
import { accessToken } from '../data/supabaseAdapter';
import { track } from '../lib/track';

export function radarGames(s: State): Game[] {
  return Object.values(s.myGames).filter((m) => m.onRadar && s.games[m.gameId]).map((m) => s.games[m.gameId]);
}

/** Desejos que ainda não saíram (ou sem data): bons candidatos a acompanhar. */
function wishCandidates(s: State, today: string): Game[] {
  const year = Number(today.slice(0, 4));
  return s.wishes.map((w) => s.games[w.gameId]).filter((g): g is Game => !!g && !s.myGames[g.id]?.onRadar && (g.releasedOn ? g.releasedOn > today : g.year == null || g.year >= year));
}

type Row = { game: Game; info?: RadarInfo };

const GROUPS: { key: string; title: string; test: (r: Row, today: string) => boolean }[] = [
  { key: 'semana', title: 'Nos próximos 7 dias', test: (r, t) => !!r.info?.day && r.info.status === 'previsto' && daysUntil(r.info.day, t) <= 7 },
  { key: 'datas', title: 'Com data confirmada', test: (r) => r.info?.status === 'previsto' && r.info.precision === 'dia' },
  { key: 'janela', title: 'Previstos para um período', test: (r) => r.info?.status === 'previsto' },
  { key: 'acesso', title: 'Em acesso antecipado', test: (r) => r.info?.status === 'acesso-antecipado' },
  { key: 'recentes', title: 'Lançados há pouco', test: (r) => r.info?.status === 'lancado' && !!r.info.recent },
  { key: 'semdata', title: 'Anunciados, sem data', test: (r) => r.info?.status === 'sem-data' },
  { key: 'lancados', title: 'Já lançados', test: (r) => r.info?.status === 'lancado' },
  { key: 'cancelados', title: 'Cancelados', test: (r) => r.info?.status === 'cancelado' },
  { key: 'outros', title: 'Sem data informada', test: () => true },
];

/** Radar: os lançamentos que você acompanha, com a precisão real de cada data. */
export function RadarPage() {
  const s = useStore((x) => x);
  const today = localDay();
  const games = useMemo(() => radarGames(s), [s]);
  const cands = useMemo(() => wishCandidates(s, today), [s, today]);
  const [info, setInfo] = useState<Record<number, RadarInfo>>({});
  const [loading, setLoading] = useState(false);
  const canTrack = s.schemaV6 || s.mode === 'demo';
  const ids = [...games, ...cands].map((g) => g.igdbId).filter((x): x is number => !!x);
  const idKey = ids.join(',');

  useEffect(() => {
    if (!ids.length) { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    loadRadar(ids).then((r) => { if (alive) { setInfo(r); setLoading(false); } });
    return () => { alive = false; setLoading(false); };
  }, [idKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { track('jogos.radar'); }, []);

  const rows: Row[] = games.map((g) => ({ game: g, info: g.igdbId ? info[g.igdbId] : undefined }))
    .sort((a, b) => (a.info?.sort ?? '9999').localeCompare(b.info?.sort ?? '9999') || a.game.title.localeCompare(b.game.title, 'pt-BR'));
  const used = new Set<string>();
  const grouped = GROUPS.map((gr) => {
    const items = rows.filter((r) => !used.has(r.game.id) && gr.test(r, today));
    items.forEach((r) => used.add(r.game.id));
    return { ...gr, items: gr.key === 'lancados' ? items.reverse() : items };
  }).filter((g) => g.items.length);

  return (
    <main className="page pad radar">
      <header className="page-head">
        <div className="page-head__text">
          <h1 className="t big">Radar</h1>
          <p className="muted lead">Os lançamentos que você quer acompanhar, numa linha só. Acompanhar não é ter nem querer comprar: é só não perder a data. As datas aparecem com a precisão que se conhece, e data prevista pode mudar.</p>
        </div>
        <SubNav pillar="jogos" />
      </header>

      <Horizon rows={rows} today={today} />
      {loading && <p className="muted radar__loading" role="status">Conferindo as datas…</p>}

      <div className="radar__cols">
        <div className="radar__main">
          {grouped.map((gr) => (
            <section key={gr.key} className="radar__group" aria-labelledby={`rg-${gr.key}`}>
              <div className="radar__head"><h2 id={`rg-${gr.key}`} className="t">{gr.title}</h2><span className="kicker">{gr.items.length}</span></div>
              <ul className="radar__list">{gr.items.map((r) => <RadarRow key={r.game.id} row={r} today={today} />)}</ul>
            </section>
          ))}

          {cands.length > 0 && (
            <section className="radar__group" aria-labelledby="rg-desejos">
              <div className="radar__head"><h2 id="rg-desejos" className="t">Nos seus Desejos, ainda por sair</h2><span className="kicker">{cands.length}</span></div>
              <ul className="radar__list">
                {cands.map((g) => {
                  const i = g.igdbId ? info[g.igdbId] : undefined;
                  return (
                    <li key={g.id} className="rcard">
                      <Backdrop game={g} className="rcard__bg" />
                      <span className="rcard__shade" aria-hidden="true" />
                      <Link to={`/jogos/${g.slug}`} className="rcard__cover"><CoverArt game={g} /></Link>
                      <div className="rcard__info">
                        <Link to={`/jogos/${g.slug}`} className="t rcard__title">{g.title}</Link>
                        <span className="muted">{[(i?.platforms.length ? i.platforms : g.platforms).slice(0, 3).map(shortPlatform).join(', '), i?.label || 'Data ainda não conferida'].filter(Boolean).join(' · ')}</span>
                      </div>
                      <button className="btn primary rcard__btn" disabled={!canTrack} title={canTrack ? undefined : 'Disponível depois da migração 0006'} onClick={() => actions.toggleRadar(g.id)}><span className="rcard__dot" aria-hidden="true" />Acompanhar</button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <div className="radar__empty">
            <span className="radar__empty-dot" aria-hidden="true" />
            <strong>{games.length === 0 ? 'Nada no Radar ainda' : 'Nada mais no horizonte por enquanto'}</strong>
            <span className="muted">Acompanhe um jogo pela ficha dele e a data aparece aqui assim que for anunciada.</span>
            <Link className="btn ghost sm" to="/jogos/explorar?ordem=upcoming">Explorar o que está em breve →</Link>
          </div>
        </div>

        <CalendarBlock count={games.length} />
      </div>
    </main>
  );
}

const MON = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const dayMs = (d: string) => Date.parse(d + 'T12:00:00Z');

/** A linha do horizonte: hoje à esquerda, os meses à frente e cada lançamento com data confirmada no seu lugar. */
function Horizon({ rows, today }: { rows: Row[]; today: string }) {
  const dated = rows.filter((r) => r.info?.status === 'previsto' && r.info.precision === 'dia' && r.info.day && r.info.day >= today)
    .sort((a, b) => a.info!.day!.localeCompare(b.info!.day!));
  const last = dated.length ? daysUntil(dated[dated.length - 1].info!.day!, today) : 0;
  const span = Math.min(Math.max(110, last + 20), 560);
  const shown = dated.filter((r) => daysUntil(r.info!.day!, today) <= span);
  const later = dated.length - shown.length;
  const pos = (d: string) => Math.min(100, (daysUntil(d, today) / span) * 100);

  // Meses: o começo de cada mês que cabe na linha.
  const months: { left: number; label: string }[] = [];
  const t = new Date(dayMs(today));
  for (let k = 1; k < 24; k++) {
    const m = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + k, 1, 12));
    const iso = m.toISOString().slice(0, 10);
    const left = pos(iso);
    if (daysUntil(iso, today) > span) break;
    if (left < 13 || left > 96) continue;
    months.push({ left, label: `${MON[m.getUTCMonth()]}${m.getUTCMonth() === 0 ? ` ${m.getUTCFullYear()}` : ''}` });
  }

  // Faixas: cada lançamento vai para a primeira faixa livre, para os nomes não se atropelarem.
  const W = 22;
  const lanes: number[] = [];
  const placed = shown.map((r) => {
    const left = pos(r.info!.day!);
    let lane = lanes.findIndex((end) => end <= left - 1);
    if (lane < 0) { lane = lanes.length; lanes.push(0); }
    lanes[lane] = left + W;
    return { r, left, lane };
  });
  const L = placed.length ? lanes.length : 0;
  const lineTop = L ? L * 76 + 18 : 36;
  const [d, m] = [Number(today.slice(8, 10)), Number(today.slice(5, 7))];

  return (
    <section className="rhz" aria-label="Linha dos lançamentos">
      <div className="rhz__scroll">
        <div className="rhz__track" style={{ height: lineTop + 46 }}>
          <div className="rhz__line" style={{ top: lineTop }} />
          <span className="rhz__today" style={{ top: lineTop - 7 }} aria-hidden="true" />
          <span className="kicker kicker--now rhz__today-label" style={{ top: lineTop + 22 }}>Hoje · {d} {MON[m - 1]}</span>
          {months.map((mo) => <span key={mo.label} className="mono rhz__month" style={{ left: `${mo.left}%`, top: lineTop + 22 }}>{mo.label}</span>)}
          {placed.map(({ r, left, lane }) => {
            const right = left > 74;
            const n = daysUntil(r.info!.day!, today);
            const top = (L - 1 - lane) * 76;
            return (
              <div key={r.game.id}>
                <span className="rhz__stem" style={{ left: `${left}%`, top: top + 60, height: lineTop - top - 60 }} aria-hidden="true" />
                <span className="rhz__mark" style={{ left: `${left}%`, top: lineTop - 6 }} aria-hidden="true" />
                <Link to={`/jogos/${r.game.slug}`} className={`rhz__item${right ? ' is-right' : ''}`} style={right ? { right: `calc(${100 - left}% - 22px)`, top } : { left: `calc(${left}% - 22px)`, top }}>
                  <span className="rhz__cover"><CoverArt game={r.game} /></span>
                  <span className="rhz__text">
                    <span className="mono rhz__when">{r.info!.label.replace(/^sai em /i, '').replace(/ de \d{4}$/, '')}{n === 0 ? ' · hoje' : n === 1 ? ' · amanhã' : ` · em ${n} dias`}</span>
                    <span className="rhz__title">{r.game.title}</span>
                  </span>
                </Link>
              </div>
            );
          })}
          {shown.length === 0 && <span className="muted rhz__none" style={{ top: lineTop - 30 }}>Nenhuma data confirmada no seu Radar</span>}
          {later > 0 && <span className="muted rhz__none" style={{ top: lineTop + 22 }}>+{later} mais adiante</span>}
        </div>
      </div>
    </section>
  );
}

function RadarRow({ row, today }: { row: Row; today: string }) {
  const { game: g, info } = row;
  const soon = info?.day && info.status === 'previsto' ? whenSoon(info.day, today) : '';
  return (
    <li className="rcard">
      <Backdrop game={g} className="rcard__bg" />
      <span className="rcard__shade" aria-hidden="true" />
      <Link to={`/jogos/${g.slug}`} className="rcard__cover"><CoverArt game={g} /></Link>
      <div className="rcard__info">
        <Link to={`/jogos/${g.slug}`} className="t rcard__title">{g.title}</Link>
        <span className={`mono radar__when radar__when--${info?.precision ?? 'sem-data'}`}>{info ? info.label : g.igdbId ? 'Conferindo…' : 'Jogo sem ficha do catálogo: sem datas automáticas'}{soon && <strong> ({soon})</strong>}</span>
        {info && (info.platforms.length > 0 || info.next) && <span className="muted">{[info.platforms.slice(0, 4).map(shortPlatform).join(', '), info.next].filter(Boolean).join('. ')}</span>}
      </div>
      <button className="btn quiet sm rcard__btn" onClick={() => actions.toggleRadar(g.id)} aria-label={`Deixar de acompanhar ${g.title}`}>Deixar</button>
    </li>
  );
}

/** Assinar o Radar no calendário do celular ou do computador. */
function CalendarBlock({ count }: { count: number }) {
  const mode = useStore((x) => x.mode);
  const [url, setUrl] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle');
  const [copied, setCopied] = useState(false);
  const make = async () => {
    setState('busy');
    try {
      const token = await accessToken();
      const r = await fetch('/api/igdb', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ radarLink: true }) });
      if (!r.ok) throw new Error();
      const { path } = await r.json();
      setUrl(`${location.origin}${path}`); setState('idle');
      track('radar.calendario');
    } catch { setState('error'); }
  };
  const webcal = url.replace(/^https?:/, 'webcal:');
  return (
    <section className="card radar__cal" aria-labelledby="rcal">
      <h2 id="rcal" className="t">No seu calendário</h2>
      <p className="muted">Assine o Radar no Google Agenda, Apple ou Outlook. As datas confirmadas entram como eventos de dia inteiro e mudam sozinhas quando o lançamento muda (adiamento inclusive). Datas só com mês, trimestre ou ano ficam aqui.</p>
      {mode !== 'supabase' ? (
        <>
          <div className="radar__pill"><span className="mono">webcal://…/radar/••••••.ics</span><span className="kicker">Precisa de conta</span></div>
          <div className="radar__links"><button className="btn ghost" disabled>Copiar endereço</button><Link className="btn primary" to="/entrar">Entrar</Link></div>
        </>
      ) : !url ? (
        <>
          <div className="radar__pill"><span className="mono">webcal://…/radar/••••••.ics</span><span className="kicker">{count === 0 ? 'Radar vazio' : 'Ainda não gerado'}</span></div>
          <div className="radar__links"><button className="btn primary" disabled={state === 'busy' || count === 0} onClick={make}>{state === 'busy' ? 'Gerando…' : 'Gerar endereço'}</button></div>
        </>
      ) : (
        <>
          <div className="radar__pill radar__url">
            <input className="mono" readOnly value={url} aria-label="Endereço do calendário" onFocus={(e) => e.currentTarget.select()} />
          </div>
          <div className="radar__links">
            <button className="btn ghost" onClick={() => { navigator.clipboard?.writeText(url).then(() => setCopied(true), () => {}); }}>{copied ? 'Copiado' : 'Copiar endereço'}</button>
            <a className="btn primary" href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`} target="_blank" rel="noreferrer">Google Agenda</a>
            <a className="btn ghost" href={webcal}>Apple, Outlook e outros</a>
          </div>
          <p className="faint radar__warn">Este endereço é só seu: quem tiver ele vê os jogos do seu Radar. Não publique.</p>
        </>
      )}
      {state === 'error' && <p className="muted" role="alert">Não consegui gerar agora. Tente de novo em instantes.</p>}
    </section>
  );
}
