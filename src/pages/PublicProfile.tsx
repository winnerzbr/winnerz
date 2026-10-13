import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, usePath } from '../lib/router';
import { useStore } from '../data/store';
import { CoverArt } from '../components/CoverArt';
import { linkLabel, profileApi, type PublicPiece, type PublicProfile } from '../data/profileApi';
import { Shelf, type ShelfItem } from '../components/Showcase';
import { PublicCollection } from '../components/PublicCollection';
import { whenLabel } from '../lib/dates';
import { formatScore, scaleMax } from '../lib/rating';
import { shortPlatform } from '../lib/platforms';

export const pubShelfItem = (p: PublicPiece, k: number): ShelfItem => (p.t === 'c'
  ? { key: `c-${k}-${p.slug}`, t: 'c', title: p.title, cover: p.cover ?? '', platform: p.platform, slug: p.slug }
  : { key: `h-${k}`, t: 'h', title: p.name, platform: p.platform ?? undefined, hwKind: p.kind });

const TZ = 'America/Sao_Paulo';
const since = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: TZ });
const yearOf = (iso?: string | null) => (iso ? new Date(iso).getFullYear() : null);
const ago = (iso: string) => {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 60 ? `há ${m} min` : `há ${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`;
};

type Tab = 'geral' | 'jornadas' | 'colecao' | 'museu' | 'notas';
const TAB_LABEL: Record<Tab, string> = { geral: 'Visão geral', jornadas: 'Jornadas', colecao: 'Coleção', museu: 'Museu e Vitrines', notas: 'Notas' };

/** O perfil como os outros veem (Palco): o topo com a arte do jogo que te definiu, abas e a visão geral. Só mostra o que foi liberado. */
export function PublicProfilePage({ handle }: { handle: string }) {
  usePath();
  const mode = useStore((s) => s.mode);
  const me = useStore((s) => s.profile);
  const key = new URLSearchParams(location.search).get('k');
  const [data, setData] = useState<PublicProfile | null | undefined>(undefined);
  const [mine, setMine] = useState(false);
  const [asVisitor, setAsVisitor] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTabState] = useState<Tab>(() => (location.hash.slice(1) as Tab) || 'geral');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setData(undefined); setError('');
    profileApi.publicOf(handle, key).then(setData).catch((e) => { setError(e instanceof Error ? e.message : 'Não consegui carregar.'); setData(null); });
    if (mode === 'demo' || me) profileApi.mine().then((p) => setMine(!!p?.handle && p.handle.toLowerCase() === handle.toLowerCase())).catch(() => setMine(false));
  }, [handle, key, mode, me]);

  useEffect(() => {
    document.title = data ? `${data.name} (@${data.handle}) · WinnerZ` : 'Perfil · WinnerZ';
    // Perfil só com link não deve aparecer em buscadores.
    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (data?.onlyLink || key) {
      if (!meta) { meta = document.createElement('meta'); meta.name = 'robots'; document.head.appendChild(meta); }
      meta.content = 'noindex';
    }
    return () => { document.querySelector('meta[name="robots"]')?.remove(); };
  }, [data, key]);

  if (data === undefined) return <main className="page pad"><p className="muted">Carregando o perfil…</p></main>;
  if (!data) return (
    <main className="page pad narrow pp-empty">
      <h1 className="t big">Perfil não encontrado</h1>
      <p className="muted lead">{error || 'Este endereço não existe, ou a pessoa ainda não abriu nada do perfil para você.'}</p>
      {mine && <Link className="btn primary" to="/preferencias#perfil">Abrir algum pilar do seu perfil</Link>}
    </main>
  );

  const j = data.jornada, c = data.colecao, n = data.notas;
  const tabs: Tab[] = ['geral', ...(j ? ['jornadas' as Tab] : []), ...(c ? ['colecao' as Tab] : []), ...(data.vitrines?.length || data.museu ? ['museu' as Tab] : []), ...(n ? ['notas' as Tab] : [])];
  const cur: Tab = tabs.includes(tab) ? tab : 'geral';
  const setTab = (t: Tab) => {
    setTabState(t);
    history.replaceState(history.state, '', `${location.pathname}${location.search}${t === 'geral' ? '' : `#${t}`}`);
    document.querySelector('.pd-tabs')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };
  const owner = mine && !asVisitor;
  const share = async () => { try { await navigator.clipboard.writeText(location.href.replace(location.hash, '')); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* sem área de transferência */ } };
  const qs = key ? `?k=${key}` : '';
  const at = `/@${data.handle.toLowerCase()}`;

  return (
    <main className="pd">
      {mine && (
        <div className="pp-owner"><div className="page pp-owner__row">
          <span>{asVisitor ? 'Você está vendo o perfil como um visitante.' : `É assim que ${key ? 'quem tem o seu link vê' : 'todo mundo vê'} o seu perfil.`}</span>
          <span className="pp-owner__acts">
            <button className="linkish" onClick={() => setAsVisitor((v) => !v)} aria-pressed={asVisitor}>{asVisitor ? 'Voltar a ver como dono' : 'Ver como visitante'}</button>
            {!asVisitor && <Link to="/preferencias#perfil">Mudar o que aparece</Link>}
          </span>
        </div></div>
      )}

      <Hero data={data} owner={owner} onShare={share} copied={copied} />

      <nav className="pd-tabs" aria-label="Seções do perfil">
        <div className="page pd-tabs__row">
          {tabs.map((t) => <button key={t} className="pd-tab" aria-current={cur === t ? 'page' : undefined} onClick={() => setTab(t)}>{TAB_LABEL[t]}</button>)}
        </div>
      </nav>

      <div className="page pd-body">
        {cur === 'geral' && <Overview data={data} mine={mine} qs={qs} at={at} goTab={setTab} />}

        {cur === 'jornadas' && j && (
          <section className="pp__sec" aria-label="Jornadas">
            {!!data.showcase?.length && <>
              <h2 className="t pp__h">Jornadas em destaque</h2>
              <ul className="pp-show">
                {data.showcase.map((g) => (
                  <li key={g.slug}><Link to={`${at}/${g.slug}${qs}`} className="pp-show__card on-photo">
                    {(g.backdrop || g.cover) && <img className="pp-show__bg" src={g.backdrop || g.cover!} alt="" loading="lazy" />}
                    <span className="pp-show__shade" aria-hidden="true" />
                    <span className="pp-show__text">
                      <span className="kicker">{g.finished ? 'Zerado' : 'Em andamento'}{g.stories > 1 ? ` · ${g.stories} Histórias` : ''}</span>
                      <b className="t">{g.title}</b>
                      <span className="pp-show__meta">{g.moments} {g.moments === 1 ? 'momento guardado' : 'momentos guardados'} · Ver a linha do tempo →</span>
                    </span>
                  </Link></li>
                ))}
              </ul>
            </>}
            {j.playing.length > 0 && <>
              <h3 className="kicker kicker--now pp__sub">Jogando agora</h3>
              <ul className="pp-play">
                {j.playing.map((g) => (
                  <li key={g.slug + g.ordinal}><Link to={`/jogos/${g.slug}`} className="pp-play__card">
                    <span className="pp-play__cover"><CoverArt game={{ title: g.title, cover: g.cover ?? '' }} /></span>
                    <span className="pp-play__text">
                      <b>{g.title}</b>
                      <span className="mono">{g.ordinal > 1 ? `História ${g.ordinal} · ` : ''}desde {whenLabel(g.startedAt, g.startedPrecision, { short: true })}</span>
                      {g.progress != null && <span className="hline pp-play__prog" aria-label={`${g.progress}%`}><i style={{ width: `${g.progress}%` }} /><b style={{ left: `${g.progress}%` }} /></span>}
                    </span>
                  </Link></li>
                ))}
              </ul>
            </>}
            {j.completed.length > 0 && <>
              <h3 className="kicker pp__sub">Zerados</h3>
              <ul className="pp-grid">
                {j.completed.map((g) => (
                  <li key={g.slug + g.ordinal}><Link to={`/jogos/${g.slug}`} className="pp-grid__item">
                    <span className="pp-grid__cover"><CoverArt game={{ title: g.title, cover: g.cover ?? '' }} /></span>
                    <span className="pp-grid__t">{g.title}</span>
                    <span className="mono pp-grid__d"><i aria-hidden="true" />{whenLabel(g.completedAt ?? undefined, g.completedPrecision, { short: true })}</span>
                  </Link></li>
                ))}
              </ul>
            </>}
            {!j.playing.length && !j.completed.length && !data.showcase?.length && <p className="muted">Nenhuma Jornada para mostrar ainda.</p>}
          </section>
        )}

        {cur === 'colecao' && c && <PublicCollection handle={data.handle} k={key} c={c} />}

        {cur === 'museu' && (
          <section className="pp__sec" aria-label="Museu e Vitrines">
            {data.museu && (
              <Link to={`${at}/museu${qs}`} className="pp-museum">
                <span className="kicker">Museu pessoal · {data.museu.rooms} {data.museu.rooms === 1 ? 'sala' : 'salas'}</span>
                <b className="t">{data.museu.title || `O museu de ${data.name}`}</b>
                <span className="muted">Entrar no museu →</span>
              </Link>
            )}
            <div className="vlist pp-vitrines">
              {(data.vitrines ?? []).map((v) => (
                <article key={v.id} className="vcard">
                  <div className="vcard__head"><div>
                    <span className="kicker">{v.items.length} {v.items.length === 1 ? 'peça' : 'peças'}</span>
                    <h3 className="t vcard__title"><Link to={`${at}/vitrines/${v.id}${qs}`}>{v.title}</Link></h3>
                    {v.description && <p className="muted vcard__desc">{v.description}</p>}
                  </div><Link className="btn ghost sm" to={`${at}/vitrines/${v.id}${qs}`}>Abrir a vitrine</Link></div>
                  <Shelf compact items={v.items.map(pubShelfItem)} />
                </article>
              ))}
            </div>
          </section>
        )}

        {cur === 'notas' && n && <Notes notes={n} />}
      </div>
    </main>
  );
}

/** O topo: a arte do jogo que definiu a pessoa, o avatar com aro dourado, o nome grande e a frase. */
function Hero({ data, owner, onShare, copied }: { data: PublicProfile; owner: boolean; onShare: () => void; copied: boolean }) {
  const st = data.stage, def = st?.defining;
  const art = def?.backdrop || data.showcase?.find((s) => s.backdrop)?.backdrop || null;
  const links = data.links ?? [];
  return (
    <section className={`pd-hero on-photo${art ? '' : ' pd-hero--plain'}`}>
      {art && <img className="pd-hero__bg" src={art} alt="" />}
      <span className="pd-hero__shade" aria-hidden="true" />
      <span className="pd-hero__flare" aria-hidden="true" />
      {def && (
        <div className="page pd-hero__top">
          <Link to={`/jogos/${def.slug}`} className="pd-defchip">
            <span className="pd-defchip__cover"><CoverArt game={{ title: def.title, cover: def.cover ?? '' }} /></span>
            <span className="kicker">O jogo que me definiu · <b>{def.title}</b></span>
          </Link>
        </div>
      )}
      <div className="page pd-hero__in">
        <div className="pd-id">
          <span className="pd-avatar" aria-hidden="true">{data.name.slice(0, 1).toUpperCase()}</span>
          <div className="pd-id__text">
            <div className="pd-chips">
              {data.live && <Link to={`/jogos/${data.live.slug}`} className="pd-chip pd-chip--live"><i aria-hidden="true" />Jogando agora · {data.live.title}</Link>}
              <span className="pd-chip">@{data.handle}</span>
              {st?.since && <span className="pd-chip">Joga desde {st.since}</span>}
              <span className="pd-chip">No WinnerZ desde {since(data.since)}</span>
            </div>
            <h1 className="t pd-name">{data.name}</h1>
            {data.bio && <p className="pd-quote">“{data.bio}”</p>}
          </div>
          <div className="pd-id__acts">
            {owner ? <>
              <Link className="btn ghost" to="/preferencias#perfil">Editar perfil</Link>
              <button className="btn primary" onClick={onShare}>{copied ? 'Link copiado' : 'Compartilhar'}</button>
            </> : links.slice(0, 3).map((l, i) => (
              <a key={l.url} className={`btn ${i === 0 ? 'primary' : 'ghost'}`} href={l.url} target="_blank" rel="noopener noreferrer me">{linkLabel(l)}</a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Block({ title, aside, children, className = '' }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`pd-block ${className}`}>
      <div className="pd-block__h"><h2 className="t">{title}</h2>{aside && <span className="kicker">{aside}</span>}</div>
      {children}
    </section>
  );
}

/** Visão geral: o que está jogando, os três da vida, o mural e a linha da vida; ao lado, o jogo que definiu, a fila e o passaporte. */
function Overview({ data, mine, qs, at, goTab }: { data: PublicProfile; mine: boolean; qs: string; at: string; goTab: (t: Tab) => void }) {
  const j = data.jornada, c = data.colecao, st = data.stage;
  const now = j?.playing[0];
  const live = data.live;
  const top = st?.top ?? [];
  const order = top.length === 3 ? [1, 0, 2] : top.map((_, i) => i);
  const mural = (data.mural ?? []).filter((m) => m.image).slice(0, 5);
  const life = useMemo(() => lifeline(data), [data]);
  const [more, setMore] = useState(false);
  const empty = !now && !live && !top.length && !mural.length && life.length < 2;
  return (
    <div className="pd-grid">
      <div className="pd-col">
        {(live || now) && (
          <Block title="Jogando agora" aside={live ? <span className="pd-live">● Sessão aberta {ago(live.since)}</span> : now ? `Desde ${whenLabel(now.startedAt, now.startedPrecision, { short: true })}` : null}>
            {(() => {
              const g = live ? { title: live.title, slug: live.slug, cover: live.cover, progress: j?.playing.find((p) => p.slug === live.slug)?.progress ?? null, ordinal: j?.playing.find((p) => p.slug === live.slug)?.ordinal ?? 1 } : now!;
              return (
                <Link to={`/jogos/${g.slug}`} className="pd-now on-photo">
                  {g.cover && <img className="pd-now__bg" src={g.cover} alt="" />}
                  <span className="pd-now__shade" aria-hidden="true" />
                  <span className="pd-now__cover"><CoverArt game={{ title: g.title, cover: g.cover ?? '' }} /></span>
                  <span className="pd-now__tx">
                    <span className="kicker">{g.ordinal > 1 ? `História ${g.ordinal}` : 'Primeira História'}</span>
                    <b className="t">{g.title}</b>
                    {g.progress != null && <span className="pd-bar" aria-label={`${g.progress}%`}><i style={{ width: `${g.progress}%` }} /></span>}
                    {g.progress != null && <span className="mono pd-now__pct">{g.progress}%</span>}
                  </span>
                </Link>
              );
            })()}
            {j && j.playing.length > 1 && (
              <p className="pd-also">Também jogando: {j.playing.filter((p) => p.slug !== (live?.slug ?? now?.slug)).slice(0, 4).map((p, i, a) => <span key={p.slug}><Link to={`/jogos/${p.slug}`}>{p.title}</Link>{i < a.length - 1 ? ', ' : ''}</span>)}</p>
            )}
          </Block>
        )}

        {top.length > 0 && (
          <Block title="Os três da vida" aside="Escolhidos a dedo">
            <ol className={`pd-three pd-three--${top.length}`}>
              {order.map((i) => {
                const g = top[i];
                return (
                  <li key={g.slug + i} className={i === 0 ? 'pd-three__first' : ''}>
                    <Link to={`/jogos/${g.slug}`} className="pd-three__cv"><CoverArt game={{ title: g.title, cover: g.cover ?? '' }} /><span className="pd-three__n" aria-label={`${i + 1}º`}>{i + 1}</span></Link>
                    <b className="pd-three__t">{g.title}</b>
                    {g.quote && <q className="pd-serif">{g.quote}</q>}
                  </li>
                );
              })}
            </ol>
          </Block>
        )}

        {mural.length > 0 && (
          <Block title="Mural de cenas" aside={<button className="linkish" onClick={() => goTab('jornadas')}>Ver as Jornadas →</button>}>
            <ul className={`pd-mural pd-mural--${mural.length}`}>
              {mural.map((m, i) => (
                <li key={i}><Link to={`${at}/${m.slug}${qs}`} className="pd-mural__it on-photo">
                  <img src={m.image} alt="" loading="lazy" />
                  <span>{m.title} · {m.game}</span>
                </Link></li>
              ))}
            </ul>
          </Block>
        )}

        {life.length >= 2 && (
          <Block title="Linha da vida" aside={st?.since ? `De ${st.since} até hoje` : 'Os zerados, ano a ano'}>
            <div className="pd-life">
              <span className="pd-life__ln" aria-hidden="true" />
              <ol className="pd-life__row">
                {life.map((p, i) => (
                  <li key={i} className={`pd-life__p${p.kind === 'now' ? ' is-now' : ''}`}>
                    {p.cover !== undefined ? (
                      <Link to={`/jogos/${p.slug}`} className="pd-life__cv" title={p.title}><CoverArt game={{ title: p.title, cover: p.cover ?? '' }} /></Link>
                    ) : <span className="pd-life__dot" aria-hidden="true" />}
                    <span className="pd-life__y">{p.label}</span>
                  </li>
                ))}
              </ol>
            </div>
          </Block>
        )}

        {empty && (
          <p className="muted pd-emptyov">{mine ? 'Escolha o jogo que te definiu e os três da vida em Preferências → Perfil, e mostre uma Jornada no perfil para o mural aparecer aqui.' : 'Ainda não tem muito por aqui. Veja as abas acima.'}</p>
        )}
      </div>

      <aside className="pd-col pd-side">
        {!mine && <InCommon data={data} />}
        {st?.defining && (
          <Link to={`/jogos/${st.defining.slug}`} className="pd-def on-photo">
            {(st.defining.backdrop || st.defining.cover) && <img src={st.defining.backdrop || st.defining.cover!} alt="" loading="lazy" />}
            <span className="pd-def__shade" aria-hidden="true" />
            <span className="pd-def__tx">
              <span className="kicker">O jogo que me definiu</span>
              <b className="t">{st.defining.title}</b>
              {st.defining.text && <span className={`pd-serif pd-def__text${more ? ' is-open' : ''}`}>“{st.defining.text}”</span>}
              {st.defining.text && st.defining.text.length > 220 && <button className="linkish" onClick={(e) => { e.preventDefault(); setMore((v) => !v); }}>{more ? 'Mostrar menos' : 'Ler tudo'}</button>}
            </span>
          </Link>
        )}
        {!!j?.paused?.length && (
          <div className="pd-card">
            <span className="kicker">Próximo da fila · sem pressa</span>
            <ul className="pd-queue">
              {j.paused.slice(0, 3).map((g) => (
                <li key={g.slug + g.ordinal}><Link to={`/jogos/${g.slug}`}>
                  <span className="pd-queue__cv"><CoverArt game={{ title: g.title, cover: g.cover ?? '' }} /></span>
                  <span><b>{g.title}</b><small className="mono">{g.progress != null ? `Pausado em ${g.progress}%` : 'Pausado'}</small></span>
                </Link></li>
              ))}
            </ul>
          </div>
        )}
        {!!c?.platforms.length && (
          <div className="pd-card">
            <span className="kicker">Passaporte</span>
            <ul className="pd-stamps">
              {c.platforms.slice(0, 10).map((p) => <li key={p.platform} className="pd-stamp"><b>{shortPlatform(p.platform)}</b><small>{p.n} {p.n === 1 ? 'jogo' : 'jogos'}</small></li>)}
            </ul>
          </div>
        )}
        <div className="pd-card pd-nums">
          {j && <><div><b className="t">{j.journeys}</b><span>Jornadas</span></div><div><b className="t">{j.finished}</b><span>Zerados</span></div></>}
          {c && <div><b className="t">{c.count}</b><span>Na coleção</span></div>}
          {data.notas && <div><b className="t">{data.notas.length}</b><span>Análises</span></div>}
        </div>
        {!!data.links?.length && (
          <div className="pd-card">
            <span className="kicker">No canal</span>
            <div className="pd-links">{data.links.map((l) => <a key={l.url} className="btn ghost sm" href={l.url} target="_blank" rel="noopener noreferrer me">{linkLabel(l)}</a>)}</div>
          </div>
        )}
      </aside>
    </div>
  );
}

type LifePoint = { kind: 'since' | 'done' | 'now'; label: string; title: string; slug?: string; cover?: string | null };

/** A linha da vida: o ano em que começou, alguns zerados espalhados no tempo e o que está jogando agora. */
function lifeline(d: PublicProfile): LifePoint[] {
  const out: LifePoint[] = [];
  if (d.stage?.since) out.push({ kind: 'since', label: String(d.stage.since), title: 'Começou a jogar' });
  const done = [...(d.jornada?.completed ?? [])].filter((g) => g.completedAt).sort((a, b) => a.completedAt!.localeCompare(b.completedAt!));
  // um por ano (o último zerado daquele ano), no máximo 6, espalhados
  const byYear = new Map<number, (typeof done)[number]>();
  done.forEach((g) => byYear.set(yearOf(g.completedAt)!, g));
  let picks = [...byYear.values()];
  if (picks.length > 6) picks = Array.from({ length: 6 }, (_, i) => picks[Math.round((i * (picks.length - 1)) / 5)]);
  picks.forEach((g) => out.push({ kind: 'done', label: String(yearOf(g.completedAt)), title: g.title, slug: g.slug, cover: g.cover }));
  const now = d.live ?? d.jornada?.playing[0];
  if (now) out.push({ kind: 'now', label: 'agora', title: now.title, slug: now.slug, cover: now.cover });
  return out;
}

/** "Em comum com você": o que quem visita também zerou ou tem na estante. Só conta, nada é gravado. */
function InCommon({ data }: { data: PublicProfile }) {
  const profile = useStore((s) => s.profile);
  const mode = useStore((s) => s.mode);
  const games = useStore((s) => s.games);
  const journeys = useStore((s) => s.journeys);
  const histories = useStore((s) => s.histories);
  const copies = useStore((s) => s.copies);
  const res = useMemo(() => {
    const slugOf = (id: string) => games[id]?.slug;
    const myDone = new Set(histories.filter((h) => h.state === 'concluida').map((h) => journeys.find((x) => x.id === h.journeyId)).map((x) => x && slugOf(x.gameId)).filter(Boolean) as string[]);
    const myShelf = new Set(copies.map((c) => slugOf(c.gameId)).filter(Boolean) as string[]);
    const done = [...new Map((data.jornada?.completed ?? []).filter((g) => myDone.has(g.slug)).map((g) => [g.slug, g])).values()];
    const shelf = [...new Map((data.colecao?.items ?? []).filter((g) => myShelf.has(g.slug)).map((g) => [g.slug, g])).values()];
    const covers = [...new Map([...done, ...shelf].map((g) => [g.slug, g])).values()].slice(0, 5);
    return { done: done.length, shelf: shelf.length, covers };
  }, [data, games, journeys, histories, copies]);
  if ((mode === 'supabase' && !profile) || (!res.done && !res.shelf)) return null;
  return (
    <div className="pd-common">
      <span className="kicker">Em comum com você</span>
      <p>{res.done > 0 && <>Vocês dois zeraram <b>{res.done} {res.done === 1 ? 'jogo' : 'jogos'}</b>{res.shelf > 0 ? ' e ' : '.'}</>}
        {res.shelf > 0 && <>{res.done > 0 ? 'têm' : 'Vocês dois têm'} <b>{res.shelf}</b> na estante.</>}</p>
      <div className="pd-common__cv">{res.covers.map((g) => <Link key={g.slug} to={`/jogos/${g.slug}`} title={g.title}><CoverArt game={{ title: g.title, cover: g.cover ?? '' }} /></Link>)}</div>
    </div>
  );
}

function Notes({ notes }: { notes: NonNullable<PublicProfile['notas']> }) {
  const scale = useStore((s) => s.prefs.scale);
  return (
    <section className="pp__sec" aria-label="Notas e análises">
      <h2 className="t pp__h">Notas e análises</h2>
      {notes.length === 0 ? <p className="muted">Nenhuma análise ainda.</p> : (
        <ul className="pp-notes">
          {notes.map((r) => (
            <li key={r.slug}><Link to={`/jogos/${r.slug}`} className="pp-note">
              <span className="pp-note__cover"><CoverArt game={{ title: r.title, cover: r.cover ?? '' }} /></span>
              <span className="pp-note__body">
                <span className="pp-note__game">{r.title}</span>
                {r.reviewTitle && <b className="pp-note__title">{r.reviewTitle}</b>}
                {r.spoiler ? <span className="pp-note__spoiler">Contém spoiler · leia na ficha do jogo</span> : r.text && <span className="pp-note__text">{r.text}</span>}
              </span>
              <span className="pp-note__score"><span className="t">{formatScore(r.normalized, scale)}</span><small>/{scaleMax(scale)}</small></span>
            </Link></li>
          ))}
        </ul>
      )}
    </section>
  );
}
