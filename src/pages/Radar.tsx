import { useEffect, useMemo, useState } from 'react';
import { Link } from '../lib/router';
import { actions, useStore } from '../data/store';
import type { Game, State } from '../data/types';
import { SubNav } from '../components/SubNav';
import { CoverArt } from '../components/CoverArt';
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
  { key: 'outros', title: 'Sem informação do IGDB', test: () => true },
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
      <SubNav pillar="jogos" />
      <h1 className="t big">Radar</h1>
      <p className="muted lead">Os lançamentos que você acompanha. Acompanhar não é ter nem querer comprar: é só não perder a data. As datas vêm do IGDB e mostram a precisão real; data prevista pode mudar.</p>

      {games.length === 0 ? (
        <div className="card tl-empty">
          <p className="muted">Nada no Radar ainda. Na ficha de qualquer jogo, toque em “Acompanhar no Radar”. O <Link to="/jogos/explorar?ordem=upcoming">Explorar, em “Em breve”</Link>, mostra o que vem por aí.</p>
        </div>
      ) : (
        grouped.map((gr) => (
          <section key={gr.key} className="block radar__group" aria-labelledby={`rg-${gr.key}`}>
            <div className="block__head"><h2 id={`rg-${gr.key}`} className="t">{gr.title}</h2><span className="muted">{gr.items.length}</span></div>
            <ul className="radar__list">{gr.items.map((r) => <RadarRow key={r.game.id} row={r} today={today} />)}</ul>
          </section>
        ))
      )}
      {loading && <p className="muted" role="status">Conferindo as datas no IGDB…</p>}

      {cands.length > 0 && (
        <section className="block" aria-labelledby="rg-desejos">
          <div className="block__head"><h2 id="rg-desejos" className="t">Nos seus Desejos, ainda por sair</h2></div>
          <ul className="radar__list">
            {cands.map((g) => (
              <li key={g.id} className="radar__row">
                <Link to={`/jogos/${g.slug}`} className="radar__cover"><CoverArt game={g} /></Link>
                <div className="radar__info">
                  <Link to={`/jogos/${g.slug}`} className="radar__title">{g.title}</Link>
                  <span className="muted">{(g.igdbId && info[g.igdbId]?.label) || 'Data ainda não conferida'}</span>
                </div>
                <button className="btn ghost sm" disabled={!canTrack} title={canTrack ? undefined : 'Disponível depois da migração 0006'} onClick={() => actions.toggleRadar(g.id)}>Acompanhar</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <CalendarBlock count={games.length} />
    </main>
  );
}

function RadarRow({ row, today }: { row: Row; today: string }) {
  const { game: g, info } = row;
  const soon = info?.day && info.status === 'previsto' ? whenSoon(info.day, today) : '';
  return (
    <li className="radar__row">
      <Link to={`/jogos/${g.slug}`} className="radar__cover"><CoverArt game={g} /></Link>
      <div className="radar__info">
        <Link to={`/jogos/${g.slug}`} className="radar__title">{g.title}</Link>
        <span className={`radar__when radar__when--${info?.precision ?? 'sem-data'}`}>{info ? info.label : g.igdbId ? 'Conferindo…' : 'Jogo sem ficha do IGDB: sem datas automáticas'}{soon && <strong> ({soon})</strong>}</span>
        {info && (info.platforms.length > 0 || info.next) && <span className="faint">{[info.platforms.slice(0, 4).map(shortPlatform).join(', '), info.next].filter(Boolean).join('. ')}</span>}
      </div>
      <button className="btn quiet sm" onClick={() => actions.toggleRadar(g.id)} aria-label={`Deixar de acompanhar ${g.title}`}>Deixar</button>
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
      <p className="muted">As datas confirmadas do Radar aparecem como eventos de dia inteiro e se atualizam sozinhas quando o IGDB muda (adiamento inclusive). Datas só com mês, trimestre ou ano ficam aqui, não no calendário.</p>
      {mode !== 'supabase' ? (
        <p className="faint">Disponível com conta (no modo demonstração não há calendário).</p>
      ) : !url ? (
        <button className="btn primary" disabled={state === 'busy' || count === 0} onClick={make}>{state === 'busy' ? 'Gerando…' : 'Gerar endereço do calendário'}</button>
      ) : (
        <div className="radar__links">
          <a className="btn primary" href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`} target="_blank" rel="noreferrer">Adicionar ao Google Agenda</a>
          <a className="btn ghost" href={webcal}>Apple, Outlook e outros</a>
          <div className="radar__url">
            <input className="field" readOnly value={url} aria-label="Endereço do calendário" onFocus={(e) => e.currentTarget.select()} />
            <button className="btn quiet sm" onClick={() => { navigator.clipboard?.writeText(url).then(() => setCopied(true), () => {}); }}>{copied ? 'Copiado' : 'Copiar'}</button>
          </div>
          <p className="faint">Este endereço é só seu: quem tiver ele vê os jogos do seu Radar. Não publique.</p>
        </div>
      )}
      {state === 'error' && <p className="muted" role="alert">Não consegui gerar agora. Tente de novo em instantes.</p>}
    </section>
  );
}
