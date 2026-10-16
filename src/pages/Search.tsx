/**
 * Busca (Comunidade, entrega G): a página com todos os resultados, por tipo. Jogos vêm do IGDB, o seu acervo do
 * navegador, e pessoas, conversas, comunidades, clubes e jogatinas do servidor (respeitando o que você pode ver).
 */
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, navigate, usePath } from '../lib/router';
import { useStore } from '../data/store';
import { searchGames, type Hit } from '../components/AddGameDialog';
import { searchApi, EMPTY_HITS, type CommunityHits } from '../data/searchApi';
import { CoverArt } from '../components/CoverArt';
import { PersonAvatar, ago } from '../components/Posts';
import { Icon } from '../components/Icon';
import { shortPlatform } from '../lib/platforms';
import { whenLabel } from '../lib/when';
import { track } from '../lib/track';
import { ListCard } from './Lists';

const TABS = [
  ['tudo', 'Tudo'], ['jogos', 'Jogos'], ['pessoas', 'Pessoas'], ['conversas', 'Conversas'], ['comunidades', 'Comunidades'], ['grupos', 'Clubes e jogatinas'], ['listas', 'Listas'], ['acervo', 'Seu acervo'],
] as const;
type Tab = (typeof TABS)[number][0];
const norm = (x: string) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function SearchPage() {
  const path = usePath();
  const params = new URLSearchParams(path.split('?')[1] ?? '');
  const q0 = params.get('q') ?? '';
  const [q, setQ] = useState(q0);
  const [tab, setTab] = useState<Tab>((params.get('tipo') as Tab) || 'tudo');
  const [games, setGames] = useState<Hit[] | null>(null);
  const [cm, setCm] = useState<CommunityHits | null>(null);
  const s = useStore((x) => x);
  useEffect(() => { setQ(q0); }, [q0]);
  useEffect(() => {
    const t = q0.trim();
    if (t.length < 2) { setGames([]); setCm(EMPTY_HITS); return; }
    let alive = true;
    setGames(null); setCm(null);
    track('busca.pagina');
    searchGames(t, []).then((r) => alive && setGames(r.source === 'igdb' ? r.hits : [])).catch(() => alive && setGames([]));
    searchApi.community(t, 20).then((r) => alive && setCm(r)).catch(() => alive && setCm(EMPTY_HITS));
    return () => { alive = false; };
  }, [q0]);
  const acervo = useMemo(() => {
    const t = norm(q0.trim()); if (t.length < 2) return [];
    const owned = new Set([...s.copies.map((c) => c.gameId), ...s.journeys.map((j) => j.gameId), ...s.wishes.map((w) => w.gameId)]);
    return [...owned].map((id) => s.games[id]).filter((g) => g && norm(g.title).includes(t)).slice(0, 40);
  }, [q0, s]);
  const submit = (e: FormEvent) => { e.preventDefault(); navigate(`/busca?q=${encodeURIComponent(q.trim())}${tab !== 'tudo' ? `&tipo=${tab}` : ''}`, { replace: true, keepScroll: true }); };
  const pick = (t: Tab) => { setTab(t); navigate(`/busca?q=${encodeURIComponent(q0)}${t !== 'tudo' ? `&tipo=${t}` : ''}`, { replace: true, keepScroll: true }); };
  const c = cm ?? EMPTY_HITS;
  const counts: Record<Tab, number> = {
    tudo: 0, jogos: games?.length ?? 0, pessoas: c.pessoas.length, conversas: c.conversas.length, comunidades: c.comunidades.length,
    grupos: c.clubes.length + c.jogatinas.length, listas: c.listas?.length ?? 0, acervo: acervo.length,
  };
  const show = (t: Tab) => tab === 'tudo' || tab === t;
  const lim = (n: number) => (tab === 'tudo' ? n : 100);
  const loading = games === null || cm === null;
  const none = !loading && Object.entries(counts).every(([, n]) => !n);
  return (
    <main className="page pad search">
      <header className="page-head"><div className="page-head__text"><h1 className="t big">Busca</h1></div></header>
      <form className="search__field" onSubmit={submit} role="search">
        <Icon name="busca" size={18} />
        <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Jogo, pessoa, conversa, comunidade, clube…" aria-label="Buscar" autoFocus />
        <button className="btn primary sm" disabled={q.trim().length < 2}>Buscar</button>
      </form>
      {q0.trim().length >= 2 && (
        <div className="chips search__tabs" role="tablist" aria-label="Tipo de resultado">
          {TABS.map(([k, l]) => <button key={k} role="tab" className="chip" aria-pressed={tab === k} aria-selected={tab === k} onClick={() => pick(k)}>{l}{k !== 'tudo' && !loading ? <span className="what__n">{counts[k]}</span> : null}</button>)}
        </div>
      )}
      {q0.trim().length < 2 ? <p className="muted">Escreva pelo menos duas letras. Dica: <kbd>Ctrl</kbd>+<kbd>K</kbd> abre a busca rápida de qualquer página.</p>
        : loading ? <p className="muted">Procurando…</p>
        : none ? <p className="muted">Nada encontrado para “{q0}”. Tente outra palavra, sem acento ou só parte do nome.</p>
        : (
          <div className="search__groups">
            {show('acervo') && acervo.length > 0 && (
              <section className="search__group"><h2 className="kicker">Seu acervo</h2>
                <ul className="search__games">{acervo.slice(0, lim(8)).map((g) => <li key={g.id}><Link to={s.journeys.some((j) => j.gameId === g.id) ? `/jornada/${g.slug}` : `/jogos/${g.slug}`}><CoverArt game={g} /><span>{g.title}</span></Link></li>)}</ul>
              </section>
            )}
            {show('jogos') && (games?.length ?? 0) > 0 && (
              <section className="search__group"><h2 className="kicker">Jogos</h2>
                <ul className="search__games">{games!.slice(0, lim(8)).map((h) => <li key={h.slug}><Link to={`/jogos/${h.slug}`}><CoverArt game={{ title: h.title, cover: h.cover }} /><span>{h.title}<small className="faint">{[h.year, h.platforms.slice(0, 2).map(shortPlatform).join(', ')].filter(Boolean).join(' · ')}</small></span></Link></li>)}</ul>
              </section>
            )}
            {show('pessoas') && c.pessoas.length > 0 && (
              <section className="search__group"><h2 className="kicker">Pessoas</h2>
                <ul className="search__rows">{c.pessoas.slice(0, lim(6)).map((p) => <li key={p.id}><Link to={`/@${(p.handle ?? '').toLowerCase()}`} className="search__row"><PersonAvatar p={p} size={40} /><span><b>@{p.handle}</b>{p.bio && <small className="muted">{p.bio}</small>}</span></Link></li>)}</ul>
              </section>
            )}
            {show('conversas') && c.conversas.length > 0 && (
              <section className="search__group"><h2 className="kicker">Conversas</h2>
                <ul className="search__rows">{c.conversas.slice(0, lim(6)).map((p) => <li key={p.id}><Link to={`/conversa/${p.id}`} className="search__row"><span className="search__ic"><Icon name="mensagem" size={16} /></span><span><b>{p.title}</b>{p.excerpt && <small className="muted">{p.excerpt}</small>}<small className="faint">{p.place}{p.author?.handle ? ` · @${p.author.handle}` : ''} · {ago(p.at)} · {p.replies} {p.replies === 1 ? 'resposta' : 'respostas'}{p.spoiler ? ' · com spoiler' : ''}</small></span></Link></li>)}</ul>
              </section>
            )}
            {show('comunidades') && c.comunidades.length > 0 && (
              <section className="search__group"><h2 className="kicker">Comunidades</h2>
                <ul className="search__rows">{c.comunidades.slice(0, lim(6)).map((k) => <li key={k.slug}><Link to={`/w/${k.slug}`} className="search__row"><span className="search__ic"><Icon name="comunidade" size={16} /></span><span><b>{k.name}{k.official ? ' · oficial' : ''}</b>{k.description && <small className="muted">{k.description}</small>}<small className="faint">{k.members} {k.members === 1 ? 'pessoa' : 'pessoas'}</small></span></Link></li>)}</ul>
              </section>
            )}
            {show('grupos') && (c.clubes.length > 0 || c.jogatinas.length > 0) && (
              <section className="search__group"><h2 className="kicker">Clubes e jogatinas</h2>
                <ul className="search__rows">
                  {c.clubes.slice(0, lim(4)).map((k) => <li key={k.slug}><Link to={`/clube/${k.slug}`} className="search__row">{k.game?.cover ? <span className="search__cv"><CoverArt game={{ title: k.game.title, cover: k.game.cover }} /></span> : <span className="search__ic"><Icon name="pessoas" size={16} /></span>}<span><b>{k.name}</b><small className="faint">Clube{k.game ? ` · ${k.game.title}` : ''} · {k.members} {k.members === 1 ? 'pessoa' : 'pessoas'}</small></span></Link></li>)}
                  {c.jogatinas.slice(0, lim(4)).map((j) => <li key={j.id}><Link to={`/jogatina/${j.id}`} className="search__row">{j.game?.cover ? <span className="search__cv"><CoverArt game={{ title: j.game.title, cover: j.game.cover }} /></span> : <span className="search__ic"><Icon name="calendario" size={16} /></span>}<span><b>{j.title}</b><small className="faint">Jogatina · {whenLabel(j.startsAt)} · {j.going} {j.going === 1 ? 'vai' : 'vão'}</small></span></Link></li>)}
                </ul>
              </section>
            )}
            {show('listas') && (c.listas?.length ?? 0) > 0 && (
              <section className="search__group"><h2 className="kicker">Listas</h2>
                <div className="glist-grid glist-grid--tight">{c.listas.slice(0, lim(4)).map((l) => <ListCard key={l.id} l={l} />)}</div>
              </section>
            )}
          </div>
        )}
    </main>
  );
}
