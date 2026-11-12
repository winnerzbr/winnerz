import { AssistiField } from '../components/Assisti';
import { GameJourneyStats } from '../components/GameJourneyStats';
import { AddToList, GameLists } from './Lists';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FixSheet } from '../components/FixSheet';
import { fixedFields, fixLabel } from '../lib/fixes';
import { Link, navigate } from '../lib/router';
import { actions, dispatch, useStore, journeyForGame, currentHistory, historiesOf, openSession, myGame } from '../data/store';
import { PastButton } from '../components/PastPlay';
import { STATE_LABEL } from '../components/JourneyManage';
import { whenLabel } from '../lib/dates';
import { shortPlatform } from '../lib/platforms';
import { LinkToIgdb } from '../components/LinkToIgdb';
import { GameSwapOnPage } from '../components/GameSwap';
import { CoverArt } from '../components/CoverArt';
import type { Review } from '../data/types';
import { FavoriteCover, FavoriteButton, useFavorite } from '../components/FavoriteCover';
import { Stars, StarInput } from '../components/Stars';
import { ScoreSlider, AnimatedScore } from '../components/ScoreInput';
import { Icon } from '../components/Icon';
import { formatScore, normalize, originalLabel, scaleMax, toScale, type Scale } from '../lib/rating';
import { SUPABASE_ON } from '../lib/env';
import { pt, ptJoined, ptList } from '../lib/igdbPt';
import { MediaGallery, buildMedia } from '../components/MediaGallery';
import { refreshGame, gameBySlug } from '../components/AddGameDialog';
import { GameUniverse } from '../components/GameUniverse';
import { GameDna } from '../components/GameDna';
import { RadarToggle } from '../components/RadarToggle';
import { MoreActions } from '../components/MoreActions';
import { localDay } from '../lib/dates';
import { Backdrop } from '../components/Backdrop';
import { GameConversations } from '../components/Posts';
import { GameClubs } from './Clubs';
import { GameCommunity } from './Communities';
import { setupNote } from '../lib/setupNote';

/** Fichas guardadas antes da tradução e dos vídeos são atualizadas uma vez por visita. */
const refreshed = new Set<string>();
const FRESH_KEY = 'wz.fichas.v3';

/** Origem da sinopse, sem nomear a fonte (que fica na página Sobre). */
const summaryLabel = (src: string) => (/traduzid/i.test(src) ? 'Traduzido automaticamente' : /ingl/i.test(src) ? 'Texto original, em inglês' : src.replace(/\s*do IGDB,?/i, '').trim());

export function GamePage({ slug }: { slug: string }) {
  const s = useStore((x) => x);
  const game = Object.values(s.games).find((g) => g.slug === slug);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (game) return;
    let alive = true;
    (async () => {
      // 1) já está no banco do site; 2) senão, busca no IGDB pelo slug (qualquer jogo abre).
      let g = SUPABASE_ON ? await import('../data/supabaseAdapter').then(({ fetchGameBySlug }) => fetchGameBySlug(slug)) : null;
      if (!g) g = await gameBySlug(slug);
      if (!alive) return;
      if (!g) { setMissing(true); return; }
      actions.mergeGames([g]);
      if (g.slug !== slug) navigate(`/jogos/${g.slug}`, { replace: true });
    })();
    return () => { alive = false; };
  }, [game, slug]);

  if (!game) return <main className="page pad"><h1 className="t big">{missing ? 'Jogo não encontrado' : 'Carregando…'}</h1>{missing && <Link to="/jogos">Buscar outro jogo</Link>}</main>;
  return <GameView gameId={game.id} />;
}

function GameView({ gameId }: { gameId: string }) {
  const s = useStore((x) => x);
  const g = s.games[gameId];
  const scale = s.prefs.scale;
  const { fav, burst, toggle } = useFavorite(gameId);
  const owned = s.copies.filter((c) => c.gameId === gameId);
  const wished = s.wishes.some((w) => w.gameId === gameId);
  const j = journeyForGame(s, gameId);
  const h = j ? currentHistory(s, j.id) : null;
  const nHist = j ? historiesOf(s, j.id).length : 0;
  const reviews = s.reviews.filter((r) => r.gameId === gameId);
  const mine = reviews.find((r) => r.mine) ?? null;
  const others = reviews.filter((r) => !r.mine);
  // A parte social: o que cada bloco achou (conversas, comunidades, clubes, listas). Tudo vazio: fica recolhida.
  const [social, setSocial] = useState<Record<string, number>>({});
  const conta = (k: string, n: number) => setSocial((x) => (x[k] === n ? x : { ...x, [k]: n }));
  useEffect(() => setSocial({}), [gameId]);
  const socialConhecido = ['conversas', 'clubes', 'listas'].every((k) => k in social);
  const socialVazio = socialConhecido && !others.length && !Object.values(social).some((n) => n > 0);
  const socialResumo = [others.length ? `${others.length} ${others.length === 1 ? 'análise' : 'análises'}` : '', social.conversas ? `${social.conversas} ${social.conversas === 1 ? 'conversa' : 'conversas'}` : '', social.comunidades ? `${social.comunidades} ${social.comunidades === 1 ? 'comunidade' : 'comunidades'}` : '', social.clubes ? `${social.clubes} ${social.clubes === 1 ? 'clube' : 'clubes'}` : '', social.listas ? `${social.listas} ${social.listas === 1 ? 'lista' : 'listas'}` : ''].filter(Boolean).join(' · ');
  const stats = s.reviewStats[gameId];
  const [revealed, setRevealed] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  // A parte da análise fica recolhida dentro do cartão das notas até a pessoa abrir.
  const [analiseAberta, setAnaliseAberta] = useState(false);
  useEffect(() => { setAnaliseAberta(false); setEditing(false); }, [gameId]);
  const abrirAnalise = () => { setAnaliseAberta(true); requestAnimationFrame(() => document.getElementById('analise')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })); };
  const progressOf = h && h.state !== 'concluida' ? h.progress : null;
  const mine2 = myGame(s, gameId);
  const today = localDay();
  const upcoming = g ? (g.releasedOn ? g.releasedOn > today : g.year == null || g.year >= Number(today.slice(0, 4))) : false;
  const canTrack = s.schemaV6 || s.mode === 'demo';
  // Jogo que ainda não saiu (e sem Jornada começada): no lugar de "Jogar agora" e "Já zerei", a data de lançamento.
  const naoSaiu = !!g && !j && (g.releasedOn ? g.releasedOn > today : g.year != null && g.year > Number(today.slice(0, 4)));
  const faltam = g?.releasedOn && naoSaiu ? Math.round((Date.parse(`${g.releasedOn}T12:00:00`) - Date.parse(`${today}T12:00:00`)) / 86400000) : null;
  const saiEm = !naoSaiu || !g ? '' : g.releasedOn
    ? `Sai em ${new Date(`${g.releasedOn}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '').replace(' de ', ' ')}${faltam != null ? ` · ${faltam === 1 ? 'falta 1 dia' : `faltam ${faltam} dias`}` : ''}`
    : `Sai em ${g.year}`;

  // Análises públicas vêm do banco quando o Supabase está ligado.
  useEffect(() => {
    if (!SUPABASE_ON) return;
    import('../data/supabaseAdapter').then(async ({ fetchReviews }) => {
      const r = await fetchReviews(gameId, s.profile?.id ?? null);
      dispatch({ type: 'reviews.merge', gameId, reviews: r.reviews, stats: r.stats });
    });
  }, [gameId]); // eslint-disable-line react-hooks/exhaustive-deps
  // Depois de dar, mudar ou tirar a sua nota, a média da comunidade é buscada de novo (no mesmo cartão).
  const minhaNota = mine ? mine.rating.normalized : -1;
  const primeira = useRef(true);
  useEffect(() => {
    if (primeira.current) { primeira.current = false; return; }
    if (!SUPABASE_ON) return;
    const t = window.setTimeout(() => {
      import('../data/supabaseAdapter').then(async ({ fetchReviews }) => {
        const r = await fetchReviews(gameId, s.profile?.id ?? null);
        dispatch({ type: 'reviews.merge', gameId, reviews: r.reviews, stats: r.stats });
      });
    }, 1200);
    return () => window.clearTimeout(t);
  }, [minhaNota]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!g.igdbId || refreshed.has(gameId)) return;
    // Fichas antigas: sem vídeos, em inglês, ou de antes do filtro de logotipos (atualizadas uma vez por aparelho).
    let fresh: string[] = [];
    try { fresh = JSON.parse(localStorage.getItem(FRESH_KEY) || '[]'); } catch { fresh = []; }
    // E toda ficha com mais de 7 dias: as informações dos jogos precisam ficar em dia com a fonte.
    const old = !!g.updatedAt && Date.now() - Date.parse(g.updatedAt) > 7 * 86_400_000;
    const stale = g.videos === undefined || /em inglês/.test(g.summarySource ?? '') || !fresh.includes(gameId) || old;
    if (!stale) return;
    refreshed.add(gameId);
    try { localStorage.setItem(FRESH_KEY, JSON.stringify([...fresh, gameId].slice(-2000))); } catch { /* nada */ }
    refreshGame(g.igdbId).then((fresh) => { if (fresh && fresh.id === gameId) actions.mergeGames([fresh]); });
  }, [gameId, g.igdbId, g.videos, g.summarySource, g.updatedAt]);
  const [showOriginal, setShowOriginal] = useState(false);
  const [fixOpen, setFixOpen] = useState(false);
  const fixed = fixedFields(g);
  const media = useMemo(() => buildMedia(g.videos, g.screenshots, g.artworks), [g.videos, g.screenshots, g.artworks]);

  const avg = stats?.avg ?? (reviews.length ? reviews.reduce((a, r) => a + r.rating.normalized, 0) / reviews.length : null);
  const count = stats?.count ?? reviews.length;
  // Barras da distribuição: a barra "9" junta as notas de 9 a 9,5 e a "10" só as notas 10 (antes um 9,5 aparecia no 10).
  // Usa dist10b (migração 0099); sem ela, o jeito antigo do banco. Nas estrelas: 4★ = 4 a 4,5, 5★ = só 5.
  const dist = useMemo(() => {
    const novo = stats ? stats.dist10b : Array.from({ length: 10 }, (_, i) => reviews.filter((r) => bucket10(r.rating.normalized) === i).length);
    if (novo) return scale === 'TEN_POINT' ? novo : [novo[0] + novo[1] + novo[2], novo[3] + novo[4], novo[5] + novo[6], novo[7] + novo[8], novo[9]];
    const d10 = stats!.dist10;
    return scale === 'TEN_POINT' ? d10 : [0, 1, 2, 3, 4].map((i) => d10[i * 2] + d10[i * 2 + 1]);
  }, [stats, reviews, scale]);
  const maxD = Math.max(1, ...dist);
  const setScale = (sc: Scale) => actions.setPrefs({ scale: sc });
  const play = () => { actions.play(gameId); navigate('/sessao'); };

  const concluded = j ? historiesOf(s, j.id).filter((x) => x.state === 'concluida' && x.completedAt).sort((x, y) => (y.completedAt ?? '').localeCompare(x.completedAt ?? ''))[0] : undefined;
  const journeyValue = j && h
    ? [nHist > 1 ? `História ${nHist}` : null, STATE_LABEL[h.state], h.state === 'ativa' && h.progress != null ? `${h.progress}%` : null, h.hours ? `${String(h.hours).replace('.', ',')} h` : null].filter(Boolean).join(' · ')
    : mine2.wontPlay ? 'Não vou jogar' : 'Ainda não começou';
  const kindLabel = (k: string) => (k === 'fisico' ? 'Físico' : k === 'digital' ? 'Digital' : k === 'assinatura' ? 'Assinatura' : 'Outro');
  const genreList = (ptJoined(g.genres) ?? '').split(/,\s*|\s+e\s+/).map((x) => x.trim()).filter(Boolean).map((x) => x[0].toUpperCase() + x.slice(1));
  const mineDate = mine ? new Date(mine.writtenAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '').replace(/ de /g, ' ') : '';
  const lockedAny = others.some((r) => r.spoiler && !revealed.includes(r.id));
  const playLabel = openSession(s)?.journeyId === j?.id && j ? 'Voltar para a sessão' : j && (h?.state === 'ativa' || h?.state === 'pausada') ? 'Continuar Jornada' : j && h?.state !== 'concluida' && h?.state !== 'encerrada' ? 'Retomar' : j ? 'Jogar de novo' : 'Jogar agora';

  return (
    <main>
      <section className="ghero on-photo" aria-labelledby="titulo">
        <Backdrop game={g} className="ghero__bg kb" />
        <div className="ghero__shade" aria-hidden="true" />
        <div className="ghero__fade" aria-hidden="true" />
        <div className="page ghero__row">
          {g.cover ? <FavoriteCover src={g.cover} alt={`Capa de ${g.title}`} width={210} height={280} burst={burst} /> : <CoverArt game={g} className="ghero__cover-art" />}
          <div className="ghero__info">
            <h1 id="titulo" className="t ghero__title">{g.title}</h1>
            <p className="ghero__by">{[g.developer, g.year].filter(Boolean).join(', ')}{g.publisher && g.publisher !== g.developer ? `. Publicado pela ${g.publisher}.` : g.developer || g.year ? '.' : ''}</p>
            {(g.platforms.length > 0 || genreList.length > 0) && (
              <div className="ghero__chips">
                {g.platforms.slice(0, 4).map((p) => <span key={p} className="ghero__chip">{shortPlatform(pt(p))}</span>)}
                {g.platforms.length > 0 && genreList.length > 0 && <span className="ghero__sep" aria-hidden="true" />}
                {genreList.slice(0, 3).map((x) => <span key={x} className="ghero__chip">{x}</span>)}
              </div>
            )}
            <div className="ghero__actions">
              {naoSaiu ? <span className="ghero__sai" role="status"><Icon name="radar" size={14} />{saiEm}</span> : <>
                <button className="btn primary" onClick={play}><Icon name="play" size={14} />{playLabel}</button>
                {h?.state !== 'concluida' && <PastButton gameId={gameId} className="btn ghost ghero__past" />}
              </>}
              {owned.length ? (
                <Link className="btn ghost" to="/colecao"><Icon name="check" size={15} />Na sua coleção</Link>
              ) : (
                <button className="btn ghost" aria-pressed={wished} onClick={() => actions.toggleWish(gameId)}><Icon name="desejo" size={15} fill={wished ? 'currentColor' : 'none'} />{wished ? 'Nos seus desejos' : 'Desejar'}</button>
              )}
              {g.igdbId && (upcoming || mine2.onRadar) && (
                <button className={`btn ghost${mine2.onRadar ? ' is-radar' : ''}`} aria-pressed={!!mine2.onRadar} disabled={!canTrack} title={canTrack ? undefined : setupNote('Disponível depois da migração 0006')} onClick={() => actions.toggleRadar(gameId)}>
                  <Icon name="radar" size={15} />{mine2.onRadar ? 'No Radar' : 'Acompanhar no Radar'}
                </button>
              )}
              <FavoriteButton fav={fav} burst={burst} onClick={toggle} className="btn ghost icon" iconOnly />
              <MoreActions className="btn ghost icon" label="Mais ações" align="left" items={[
                { key: 'analise', icon: 'caneta', label: mine ? 'Editar sua análise' : 'Escrever análise', onSelect: () => { if (mine) setEditing(true); abrirAnalise(); } },
                ...(g.igdbId && !(upcoming || mine2.onRadar) ? [{ key: 'radar', icon: 'radar', label: 'Acompanhar no Radar', disabled: !canTrack, hint: canTrack ? undefined : setupNote('Disponível depois da migração 0006'), onSelect: () => { actions.toggleRadar(gameId); } }] : []),
                ...(mine2.onRadar ? [{ key: 'verradar', icon: 'radar', label: 'Ver o Radar', onSelect: () => navigate('/jogos/radar') }] : []),
                ...(!h || h.state !== 'ativa' ? [{ key: 'nao', icon: 'fechar', on: !!mine2.wontPlay, label: mine2.wontPlay ? 'Marcado: não vou jogar (desfazer)' : 'Não vou jogar', onSelect: () => { actions.toggleWontPlay(gameId); } }] : []),
                { key: 'traduzir', icon: 'mensagem', label: 'Traduzir a tela', hint: 'Para jogos sem português', onSelect: () => navigate(`/jogos/${g.slug}/traduzir`) },
                { key: 'link', icon: 'avancar', label: 'Copiar o link da ficha', onSelect: () => { void navigator.clipboard?.writeText(location.origin + '/jogos/' + g.slug); } },
              ]} />
            </div>
          </div>
        </div>
      </section>

      <div className="page game-body">
        <div className="game-main">
          {/* Um cartão só: a nota da comunidade, a sua nota (vale na hora) e, aberta por um botão, a sua análise (12/11/2026). */}
          <section id="analise" className="rate-card rate-card--uni" aria-label="Notas">
            <div className="rate-uni">
              <div className="rate-uni__com">
                <div className="rate-card__head">
                  <h2 className="kicker">Comunidade WinnerZ</h2>
                  <div className="seg seg--sm" role="group" aria-label="Escala das notas">
                    <button aria-pressed={scale === 'TEN_POINT'} onClick={() => setScale('TEN_POINT')}>0–10</button>
                    <button aria-pressed={scale === 'FIVE_STAR'} onClick={() => setScale('FIVE_STAR')}>0–5</button>
                  </div>
                </div>
                <div className="rate-card__body">
                  <div className="rate-card__num">
                    {avg != null ? (
                      <>
                        <div className="t rate-card__v">{formatScore(avg, scale, { average: true })}</div>
                        {scale === 'FIVE_STAR' && <Stars normalized={avg} />}
                        <div className="muted rate-card__n">{count.toLocaleString('pt-BR')} {count === 1 ? 'nota' : 'notas'}</div>
                      </>
                    ) : <div className="muted rate-card__n">Ainda sem notas.</div>}
                  </div>
                  {count > 0 && (
                    <figure className="dist" aria-label={`Distribuição das ${count.toLocaleString('pt-BR')} notas`}>
                      <div className="dist__bars" aria-hidden="true">
                        {dist.map((v, i) => {
                          const top = v === maxD && v > 0;
                          const last = i === dist.length - 1;
                          return <div key={i} className={`dist__col${top ? ' is-top' : ''}${last ? ' is-max' : ''}`}><div className="dist__bar" style={{ height: `${Math.max(2, Math.round((v / maxD) * 100))}%` }} /><span>{scale === 'TEN_POINT' ? i + 1 : `${i + 1}★`}</span></div>;
                        })}
                      </div>
                    </figure>
                  )}
                </div>
                {count > 0 && <p className="faint rate-card__note">As médias usam a nota original de cada pessoa, sem arredondar.</p>}
              </div>
              <div className="rate-uni__mine">
                <NotaEditor key={`n-${gameId}-${scale}`} gameId={gameId} existing={mine} scale={scale} />
              </div>
            </div>
            <div className="rate-uni__foot">
              <button type="button" className="btn ghost sm" aria-expanded={analiseAberta} onClick={() => (analiseAberta ? setAnaliseAberta(false) : abrirAnalise())}>
                {analiseAberta ? 'Fechar a análise' : mine && (mine.title || mine.text) ? 'Ver sua análise' : 'Escrever análise'}
              </button>
            </div>
            {analiseAberta && (
              <div className="rate-uni__analise">
                {mine && (mine.title || mine.text) && !editing ? (
                  <>
                    <div className="sec-head"><h2 id="sua" className="t my-review__title">Sua análise</h2><button className="btn quiet sm" onClick={() => setEditing(true)}>Editar</button></div>
                    <blockquote className="my-review__quote">
                      {mine.title && <p className="t my-review__title">“{mine.title}”</p>}
                      {mine.text && <p className="my-review__text">{mine.text}</p>}
                      <span className="mono my-review__meta">{[mine.author?.name, mineDate, mine.context].filter(Boolean).join(' · ')}</span>
                    </blockquote>
                  </>
                ) : (
                  <AnaliseEditor key={`a-${gameId}`} gameId={gameId} existing={mine} onDone={() => setEditing(false)} canCancel={editing} />
                )}
              </div>
            )}
          </section>

          {/* Etapa 6 da revisão: primeiro o jogo (imagens e o que vem depois); a parte social vem junta e, vazia, recolhida. */}
          <MediaGallery title={g.title} items={media} gameId={g.id} />

          <GameUniverse game={g} part="next" />

          <details className="game-social" open={socialConhecido && !socialVazio}>
            <summary className="game-social__sum"><span className="t sec-title">Na comunidade</span><span className="muted">{!socialConhecido ? '' : socialVazio ? `Ainda sem análises, conversas, clubes ou listas sobre ${g.title}. Abrir para começar.` : socialResumo}</span></summary>
            <section aria-labelledby="comunidade" className="community-reviews">
              <div className="sec-head">
                <h2 id="comunidade" className="t sec-title">Análises da comunidade</h2>
                {lockedAny ? <span className="kicker sec-head__note"><span className="dot-now" aria-hidden="true" />Spoilers protegidos{progressOf != null ? ` · você está em ${progressOf}%` : ''}</span> : others.length > 0 && <span className="kicker">{others.length} {others.length === 1 ? 'análise' : 'análises'}</span>}
              </div>
              {others.length === 0 && <p className="muted">Ninguém além de você escreveu sobre este jogo ainda.</p>}
              <div className="reviews">
                {others.map((r) => <ReviewItem key={r.id} r={r} scale={scale} locked={!!r.spoiler && !revealed.includes(r.id)} reveal={() => setRevealed([...revealed, r.id])} progress={progressOf ?? null} />)}
              </div>
            </section>


            <GameJourneyStats slug={g.slug} title={g.title} />
            <GameConversations gameId={g.id} title={g.title} onCount={(n) => conta('conversas', n)} />
            <GameCommunity gameId={g.id} slug={g.slug} title={g.title} onCount={(n) => conta('comunidades', n)} />
            <GameClubs gameId={g.id} slug={g.slug} title={g.title} onCount={(n) => conta('clubes', n)} />
            <GameLists slug={g.slug} title={g.title} onCount={(n) => conta('listas', n)} />
          </details>
        </div>

        <aside className="game-aside">
          <section className="side-card relation" aria-labelledby="relacao">
            <h2 id="relacao" className="kicker">Sua relação com este jogo</h2>
            <div className="kv"><span className="muted">Jornada</span>{j ? <Link to={`/jornada/${g.slug}`} className="kv__v">{journeyValue}</Link> : <span className="kv__v">{journeyValue}</span>}</div>
            <div className="kv"><span className="muted">Coleção</span>{owned.length ? <Link to="/colecao" className="kv__v">{owned.map((c) => `${shortPlatform(c.platform)} · ${kindLabel(c.kind)}`).join('; ')}</Link> : <span className="kv__v">{wished ? 'Nos seus desejos' : 'Não está na estante'}</span>}</div>
            <div className="kv">
              <span className="muted">Prioridade</span>
              <div className="chips chips--sm" role="group" aria-label="Prioridade">
                {([1, 2, 3] as const).map((p) => <button key={p} className="chip" aria-pressed={mine2.priority === p} onClick={() => actions.setMyGame(gameId, { priority: mine2.priority === p ? undefined : p })}>{p === 1 ? 'Alta' : p === 2 ? 'Média' : 'Baixa'}</button>)}
              </div>
            </div>
            {concluded && <div className="kv"><span className="muted">Zerou</span><span className="mono kv__v kv__date">{whenLabel(concluded.completedAt, concluded.completedPrecision, { short: true })}</span></div>}
            {mine2.steamMinutes != null && mine2.steamMinutes > 0 && <div className="kv"><span className="muted">Tempo na Steam</span><span className="kv__v">{mine2.steamMinutes < 60 ? `${mine2.steamMinutes} min` : `${(Math.round(mine2.steamMinutes / 6) / 10).toLocaleString('pt-BR')} h`} <span className="prov">Informado pela Steam</span></span></div>}
            {mine2.estHours != null && <div className="kv"><span className="muted">Tempo estimado</span><span className="kv__v">{String(mine2.estHours).replace('.', ',')} h</span></div>}
            {mine2.genre && <div className="kv"><span className="muted">Seu gênero</span><span className="kv__v">{mine2.genre}</span></div>}
            <AssistiField gameId={gameId} />
            {!j && !mine2.wontPlay && <p className="faint relation__hint">Jogar cria a primeira História da sua Jornada.</p>}
            {(!h || h.state !== 'ativa') && (
              <button className="btn quiet sm relation__wont" aria-pressed={!!mine2.wontPlay} onClick={() => actions.toggleWontPlay(gameId)}>{mine2.wontPlay ? 'Marcado: não vou jogar (desfazer)' : 'Não vou jogar'}</button>
            )}
            {g.source === 'manual' ? <LinkToIgdb game={g} /> : <GameSwapOnPage key={g.id} game={g} />}
            {g.igdbId && <RadarToggle game={g} on={!!mine2.onRadar} />}
            <AddToList game={{ id: g.id, slug: g.slug, title: g.title, cover: g.cover || null, backdrop: g.backdrop ?? null }} />
          </section>
          <GameDna game={g} />
          {(g.summary || g.themes?.length || g.modes?.length) && (
            <section className="side-card" aria-labelledby="sobre">
              <h2 id="sobre" className="kicker">Sobre o jogo</h2>
              {g.summary && <p className="about" lang={showOriginal ? 'en' : 'pt-BR'}>{showOriginal && g.summaryOriginal ? g.summaryOriginal : g.summary}</p>}
              {g.summarySource && (
                <div className="about__src faint">
                  {showOriginal ? 'Texto original, em inglês' : summaryLabel(g.summarySource)}
                  {g.summaryOriginal && <button className="linklike" onClick={() => setShowOriginal((v) => !v)}>{showOriginal ? 'Ver em português' : 'Ver original'}</button>}
                </div>
              )}
              <dl className="facts">
                {g.genres && <div><dt>Gêneros</dt><dd>{ptJoined(g.genres)}</dd></div>}
                {g.themes && g.themes.length > 0 && <div><dt>Temas</dt><dd>{ptList(g.themes).join(', ')}</dd></div>}
                {g.modes && g.modes.length > 0 && <div><dt>Como se joga</dt><dd>{ptList(g.modes).join(', ')}</dd></div>}
                {g.platforms.length > 0 && <div><dt>Plataformas</dt><dd>{ptList(g.platforms).join(', ')}</dd></div>}
              </dl>
            </section>
          )}
          <GameUniverse game={g} part="aside" />
          {g.releases && g.releases.length > 0 && (
            <section className="side-card" aria-labelledby="lanc">
              <h2 id="lanc" className="kicker">Lançamentos</h2>
              <dl className="releases">{g.releases.map((r) => <div key={r.platform + r.date} className="kv"><dt className="muted">{pt(r.platform)}</dt><dd className="mono kv__v">{r.date}</dd></div>)}</dl>
            </section>
          )}
          {g.source !== 'manual' && (
            <div className="gfix">
              {fixed.size > 0 && <p className="faint gfix__ok">Revisado pela comunidade: {[...fixed].map((k) => fixLabel(k).toLowerCase()).join(', ')}.</p>}
              <button className="linklike gfix__btn" onClick={() => setFixOpen(true)}>Algo errado nesta ficha?</button>
            </div>
          )}
        </aside>
      </div>
      {fixOpen && <FixSheet game={g} onClose={() => setFixOpen(false)} />}
    </main>
  );
}

function ReviewItem({ r, scale, locked, reveal, progress }: { r: Review; scale: Scale; locked: boolean; reveal: () => void; progress: number | null }) {
  const orig = originalLabel(r.rating, scale);
  return (
    <article className={`review${locked ? ' is-locked' : ''}`}>
      <div className="review__head">
        <span className="review__avatar" aria-hidden="true">{r.author.initial}</span>
        <div className="review__who"><div className="review__name">{r.author.name}</div>{r.context && <div className="mono review__ctx">{r.context}</div>}</div>
        <div className="review__score" title={orig ?? (r.rating.originalScale === 'TEN_POINT' ? 'Nota dada de 0 a 10' : 'Nota dada de 0 a 5')}>
          <span className="t">{formatScore(r.rating.normalized, scale)}</span>
          {scale === 'FIVE_STAR' && <Stars normalized={r.rating.normalized} size={12} />}
        </div>
      </div>
      {locked ? (
        <>
          <p className="review__text review__blur" aria-hidden="true">Este trecho fala do final do jogo e fica escondido até você decidir ver, para não estragar nada da sua História.</p>
          <div className="spoiler">
            <span><Icon name="escudo" size={14} /> Fala do final{progress != null ? ` · você está em ${progress}%` : ''}</span>
            <button className="btn quiet sm" onClick={reveal}>Mostrar</button>
          </div>
        </>
      ) : (
        <>
          {r.title && <h3 className="t review__title">{r.title}</h3>}
          <p className="review__text">{r.text}</p>
        </>
      )}
      <div className="faint review__foot">{orig ?? (r.rating.originalScale === 'TEN_POINT' ? 'Nota dada de 0 a 10' : 'Nota dada de 0 a 5')}{r.useful != null ? ` · ${r.useful} pessoas acharam útil` : ''}</div>
    </article>
  );
}

/** Barra da distribuição (0 a 9) de uma nota 0..1000: 9 a 9,5 na barra "9", só 10 na "10", abaixo de 2 na "1". */
function bucket10(n: number) { return n >= 1000 ? 9 : Math.max(0, Math.floor(n / 100) - 1); }

/** Sua nota: vale assim que é dada (clique, toque, arraste ou teclado), sem precisar salvar a análise.
 *  O número ao lado acompanha o mouse/dedo enquanto se arrasta. Dá para tirar a nota (pedido do dono, 12/11/2026). */
function NotaEditor({ gameId, existing, scale }: { gameId: string; existing: Review | null; scale: Scale }) {
  const max = scaleMax(scale);
  const step = scale === 'TEN_POINT' ? 50 : 100; // meio ponto ou meia estrela
  // Sem mexer, a nota original fica como estava (trocar de escala só muda a exibição, não arredonda nada).
  const [norm, setNorm] = useState<number | null>(existing ? existing.rating.normalized : null);
  const [preview, setPreview] = useState<number | null>(null);
  const [touched, setTouched] = useState(false);
  const [tirar, setTirar] = useState(false);
  useEffect(() => { if (!touched) setNorm(existing ? existing.rating.normalized : null); }, [existing, touched]);
  const value = norm == null ? 0 : toScale(Math.round(norm / step) * step, scale);
  // Grava um instante depois da última mudança (arrastando, só o ponto onde parou).
  const latest = useRef(existing);
  latest.current = existing;
  const timer = useRef<number | undefined>(undefined);
  const pend = useRef<number | null>(null);
  const gravar = () => {
    window.clearTimeout(timer.current);
    const v = pend.current; pend.current = null;
    if (v == null) return;
    const e = latest.current;
    actions.saveReview(gameId, normalize(v, scale), e?.title ?? '', e?.text ?? '', e?.id);
  };
  useEffect(() => () => gravar(), []); // eslint-disable-line react-hooks/exhaustive-deps
  const setValue = (v: number) => {
    setTouched(true); setTirar(false);
    setNorm(normalize(v, scale).normalized);
    pend.current = v;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(gravar, 450);
  };
  const remover = () => {
    const e = latest.current;
    if (!e) return;
    if ((e.title || e.text) && !tirar) { setTirar(true); return; }
    window.clearTimeout(timer.current); pend.current = null;
    actions.removeReview(e.id);
    setNorm(null); setTouched(false); setTirar(false);
  };
  const temNota = norm != null;
  const mostra = preview ?? (temNota ? value : null);
  const rounded = !!existing && !touched && existing.rating.originalScale !== scale && normalize(value, scale).normalized !== existing.rating.normalized;

  return (
    <div className="editor editor--nota">
      <div className="nota-head">
        <h2 id="sua-nota" className="kicker">Sua nota</h2>
        <div className="nota-head__v" aria-live="polite">
          {mostra == null ? <span className="editor__unset">Arraste e clique para dar a nota</span> : <AnimatedScore value={mostra} max={max} />}
        </div>
      </div>
      {rounded && existing && (
        <p className="muted editor__note">Sua nota original foi {String(existing.rating.originalValue).replace('.', ',')}/{scaleMax(existing.rating.originalScale)}. {scale === 'FIVE_STAR' ? 'De 0 a 5' : 'De 0 a 10'}, ela aparece arredondada para o meio ponto mais próximo; só muda se você mexer na nota.</p>
      )}
      <div className="editor__score">
        <span id="nota-label" className="sr-only">Nota</span>
        <div className={scale === 'TEN_POINT' ? 'editor__ten' : 'editor__stars'} data-reserva="0">
          {scale === 'TEN_POINT'
            ? <ScoreSlider id="nota" value={value} onChange={setValue} onPreview={setPreview} />
            : <StarInput value={value} onChange={setValue} labelledBy="nota-label" size={36} onPreview={setPreview} />}
        </div>
        <div className="editor__nota-foot">
          {scale === 'FIVE_STAR' && <span className="faint editor__hint">Dá para dar meio ponto.</span>}
          {existing && (
            <button type="button" className="btn quiet sm editor__tirar" onClick={remover}>
              {tirar ? 'Tirar a nota e a análise junto' : 'Remover nota'}
            </button>
          )}
          {tirar && <button type="button" className="btn quiet sm" onClick={() => setTirar(false)}>Manter</button>}
        </div>
      </div>
    </div>
  );
}

/** Sua análise: título e texto, opcionais, presos à nota. */
function AnaliseEditor({ gameId, existing, onDone, canCancel }: { gameId: string; existing: Review | null; onDone: () => void; canCancel: boolean }) {
  const [title, setTitle] = useState(existing?.title ?? '');
  const [text, setText] = useState(existing?.text ?? '');
  const save = () => {
    if (!existing) return;
    actions.saveReview(gameId, existing.rating, title.trim(), text.trim(), existing.id);
    onDone();
  };
  return (
    <div className="editor editor--analise">
      <h2 id="sua" className="t my-review__title">Sua análise</h2>
      <label htmlFor="rev-title" className="editor__label">Título (opcional)</label>
      <input id="rev-title" className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Em uma frase, como foi?" />
      <label htmlFor="rev-text" className="editor__label">Texto (opcional)</label>
      <textarea id="rev-text" className="field" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Sem spoilers aqui fora, por favor." />
      <div className="editor__actions">
        <button className="btn primary" onClick={save} disabled={!existing}>Salvar análise</button>
        {canCancel && <button className="btn quiet" onClick={onDone}>Cancelar</button>}
        {!existing && <span className="faint editor__hint">A análise vai junto com a nota: dê a nota acima.</span>}
      </div>
    </div>
  );
}
