import { useEffect, useMemo, useState } from 'react';
import { Link, navigate } from '../lib/router';
import { actions, dispatch, useStore, journeyForGame, currentHistory, historiesOf, openSession, myGame } from '../data/store';
import { PastButton } from '../components/PastPlay';
import { STATE_LABEL } from '../components/JourneyManage';
import { whenLabel } from '../lib/dates';
import { shortPlatform } from '../lib/platforms';
import { LinkToIgdb } from '../components/LinkToIgdb';
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
import { refreshGame } from '../components/AddGameDialog';
import { Backdrop } from '../components/Backdrop';

/** Fichas guardadas antes da tradução e dos vídeos são atualizadas uma vez por visita. */
const refreshed = new Set<string>();
const FRESH_KEY = 'wz.fichas.v3';

export function GamePage({ slug }: { slug: string }) {
  const s = useStore((x) => x);
  const game = Object.values(s.games).find((g) => g.slug === slug);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (game || !SUPABASE_ON) { if (!game) setMissing(true); return; }
    import('../data/supabaseAdapter').then(async ({ fetchGameBySlug }) => {
      const g = await fetchGameBySlug(slug);
      if (g) actions.mergeGames([g]); else setMissing(true);
    });
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
  const stats = s.reviewStats[gameId];
  const [revealed, setRevealed] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const progressOf = h && h.state !== 'concluida' ? h.progress : null;
  const mine2 = myGame(s, gameId);

  // Análises públicas vêm do banco quando o Supabase está ligado.
  useEffect(() => {
    if (!SUPABASE_ON) return;
    import('../data/supabaseAdapter').then(async ({ fetchReviews }) => {
      const r = await fetchReviews(gameId, s.profile?.id ?? null);
      dispatch({ type: 'reviews.merge', gameId, reviews: r.reviews, stats: r.stats });
    });
  }, [gameId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!g.igdbId || refreshed.has(gameId)) return;
    // Fichas antigas: sem vídeos, em inglês, ou de antes do filtro de logotipos (atualizadas uma vez por aparelho).
    let fresh: string[] = [];
    try { fresh = JSON.parse(localStorage.getItem(FRESH_KEY) || '[]'); } catch { fresh = []; }
    const stale = g.videos === undefined || /em inglês/.test(g.summarySource ?? '') || !fresh.includes(gameId);
    if (!stale) return;
    refreshed.add(gameId);
    try { localStorage.setItem(FRESH_KEY, JSON.stringify([...fresh, gameId].slice(-2000))); } catch { /* nada */ }
    refreshGame(g.igdbId).then((fresh) => { if (fresh && fresh.id === gameId) actions.mergeGames([fresh]); });
  }, [gameId, g.igdbId, g.videos, g.summarySource]);
  const [showOriginal, setShowOriginal] = useState(false);
  const media = useMemo(() => buildMedia(g.videos, g.screenshots, g.artworks), [g.videos, g.screenshots, g.artworks]);

  const avg = stats?.avg ?? (reviews.length ? reviews.reduce((a, r) => a + r.rating.normalized, 0) / reviews.length : null);
  const count = stats?.count ?? reviews.length;
  const dist = useMemo(() => {
    const d10 = stats?.dist10 ?? Array.from({ length: 10 }, (_, i) => reviews.filter((r) => Math.min(9, Math.floor(r.rating.normalized / 100)) === i).length);
    return scale === 'TEN_POINT' ? d10 : [0, 1, 2, 3, 4].map((i) => d10[i * 2] + d10[i * 2 + 1]);
  }, [stats, reviews, scale]);
  const maxD = Math.max(1, ...dist);
  const setScale = (sc: Scale) => actions.setPrefs({ scale: sc });
  const play = () => { actions.play(gameId); navigate('/sessao'); };

  return (
    <main>
      <section className="ghero on-photo" aria-labelledby="titulo">
        <Backdrop game={g} className="ghero__bg kb" />
        <div className="ghero__shade" aria-hidden="true" />
        <div className="ghero__fade" aria-hidden="true" />
        <div className="page ghero__row">
          {g.cover ? <FavoriteCover src={g.cover} alt={`Capa de ${g.title}`} width={240} height={320} burst={burst} /> : <CoverArt game={g} className="ghero__cover-art" />}
          <div className="ghero__info">
            <div className="muted">{[g.developer, g.year].filter(Boolean).join(', ')}{g.publisher && g.publisher !== g.developer ? `. Publicado pela ${g.publisher}.` : '.'}</div>
            <h1 id="titulo" className="t ghero__title">{g.title}</h1>
            <div className="ghero__chips">
              {g.platforms.slice(0, 4).map((p) => <span key={p} className="ghero__chip">{pt(p)}</span>)}
              {g.genres && <span className="muted">{ptJoined(g.genres)}</span>}
            </div>
            <div className="ghero__actions">
              <button className="btn primary lg" onClick={play}><Icon name="play" size={15} />{openSession(s)?.journeyId === j?.id && j ? 'Voltar para a sessão' : j && (h?.state === 'ativa' || h?.state === 'pausada') ? 'Continuar Jornada' : j && h?.state !== 'concluida' && h?.state !== 'encerrada' ? 'Retomar' : j ? 'Jogar de novo' : 'Jogar agora'}</button>
              {h?.state !== 'concluida' && <PastButton gameId={gameId} className="btn ghost lg" />}
              {owned.length ? (
                <Link className="btn ghost lg" to="/colecao"><Icon name="check" size={16} />Na sua coleção</Link>
              ) : (
                <button className="btn ghost lg" aria-pressed={wished} onClick={() => actions.toggleWish(gameId)}>{wished ? 'Nos seus desejos' : 'Desejar'}</button>
              )}
              <FavoriteButton fav={fav} burst={burst} onClick={toggle} className="btn ghost lg" />
              <a className="btn ghost lg" href="#analise">{mine ? 'Editar sua análise' : 'Escrever análise'}</a>
            </div>
          </div>
          <div className="ratings" role="region" aria-label="Notas">
            <div className="ratings__head">
              <span className="muted">Ver notas em</span>
              <div className="seg seg--glass" role="group" aria-label="Escala das notas">
                <button aria-pressed={scale === 'TEN_POINT'} onClick={() => setScale('TEN_POINT')}>0–10</button>
                <button aria-pressed={scale === 'FIVE_STAR'} onClick={() => setScale('FIVE_STAR')}>5 estrelas</button>
              </div>
            </div>
            <div className="ratings__cols">
              <div>
                <div className="muted ratings__k">Média da comunidade</div>
                {avg != null ? (
                  <>
                    <div className="ratings__v"><span className="t">{formatScore(avg, scale, { average: true })}</span><span className="muted">/{scaleMax(scale)}</span></div>
                    {scale === 'FIVE_STAR' && <Stars normalized={avg} />}
                    <div className="muted ratings__n">{count.toLocaleString('pt-BR')} {count === 1 ? 'análise' : 'análises'}</div>
                  </>
                ) : <div className="muted ratings__n">Ainda sem análises.</div>}
              </div>
              <div className="ratings__sep" />
              <div>
                <div className="muted ratings__k">Sua nota</div>
                {mine ? (
                  <>
                    <div className="ratings__v"><span className="t ratings__mine">{formatScore(mine.rating.normalized, scale)}</span><span className="muted">/{scaleMax(scale)}</span></div>
                    {scale === 'FIVE_STAR' && <Stars normalized={mine.rating.normalized} />}
                    <div className="muted ratings__n">{originalLabel(mine.rating, scale) ?? 'Na sua análise'}</div>
                  </>
                ) : <div className="muted ratings__n">Você ainda não avaliou.</div>}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="page game-body">
        <div className="game-main">
          <section id="analise" className="card my-review" aria-labelledby="sua">
            {mine && !editing ? (
              <>
                <div className="my-review__top"><span className="my-review__k">Sua análise</span><span className="muted">{mine.context ?? `Escrita em ${new Date(mine.writtenAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`}</span></div>
                <h2 id="sua" className="t my-review__title">{mine.title || 'Sem título'}</h2>
                <div className="my-review__score"><span className="t">{formatScore(mine.rating.normalized, scale)}/{scaleMax(scale)}</span>{scale === 'FIVE_STAR' && <Stars normalized={mine.rating.normalized} size={20} />}</div>
                {mine.text && <p className="my-review__text">{mine.text}</p>}
                <div className="my-review__actions"><button className="btn ghost sm" onClick={() => setEditing(true)}>Editar</button></div>
              </>
            ) : (
              <ReviewEditor gameId={gameId} existing={mine} viewerScale={scale} onDone={() => setEditing(false)} />
            )}
          </section>

          <section aria-labelledby="comunidade" className="community-reviews">
            <div className="block__head"><h2 id="comunidade" className="t">Análises da comunidade</h2></div>
            {count > 0 && (
              <figure className="dist">
                <div className="dist__bars" aria-hidden="true">
                  {dist.map((v, i) => (
                    <div key={i} className="dist__col"><div className="dist__bar" style={{ height: `${Math.round((v / maxD) * 100)}%` }} /><div className="faint">{scale === 'TEN_POINT' ? i + 1 : `${i + 1}★`}</div></div>
                  ))}
                </div>
                <figcaption className="muted">Distribuição das {count.toLocaleString('pt-BR')} notas. As médias usam a nota original de cada pessoa, sem arredondar.</figcaption>
              </figure>
            )}
            {others.length === 0 && <p className="muted">Ninguém além de você escreveu sobre este jogo ainda.</p>}
            <div className="reviews">
              {others.map((r) => <ReviewItem key={r.id} r={r} scale={scale} locked={!!r.spoiler && !revealed.includes(r.id)} reveal={() => setRevealed([...revealed, r.id])} progress={progressOf ?? null} />)}
            </div>
          </section>
        </div>

        <aside className="game-aside">
          <section className="card relation" aria-labelledby="relacao">
            <h2 id="relacao" className="t">Sua relação com este jogo</h2>
            <ul>
              <li><span className="relation__ic">✦</span><div>{j ? <Link to={`/jornada/${g.slug}`}><strong>Jornada</strong></Link> : <strong>Jornada</strong>}<div className="muted">{j && h ? `${nHist} ${nHist === 1 ? 'História' : 'Histórias'}. ${STATE_LABEL[h.state]}${h.state === 'ativa' && h.progress != null ? `, ${h.progress}%` : ''}${h.completedAt && h.state !== 'ativa' && h.state !== 'pausada' ? `, ${whenLabel(h.completedAt, h.completedPrecision)}` : ''}${h.hours ? `, ${String(h.hours).replace('.', ',')} h informadas` : ''}.` : mine2.wontPlay ? 'Marcado como “não vou jogar”.' : 'Ainda não começou. Jogar cria a primeira História.'}</div></div></li>
              <li><span className="relation__ic">▥</span><div>{owned.length ? <Link to="/colecao"><strong>Coleção</strong></Link> : <strong>Coleção</strong>}<div className="muted">{owned.length ? owned.map((c) => `${c.kind === 'fisico' ? 'Exemplar físico' : c.kind === 'digital' ? 'Cópia digital' : 'Assinatura'} de ${shortPlatform(c.platform)}`).join('; ') + '.' : wished ? 'Nos seus desejos.' : 'Não está na sua estante.'}</div></div></li>
            </ul>
            <div className="relation__mine">
              <div className="relation__row">
                <span className="muted">Prioridade</span>
                <div className="chips chips--sm" role="group" aria-label="Prioridade">
                  {([1, 2, 3] as const).map((p) => <button key={p} className="chip" aria-pressed={mine2.priority === p} onClick={() => actions.setMyGame(gameId, { priority: mine2.priority === p ? undefined : p })}>{p === 1 ? 'Alta' : p === 2 ? 'Média' : 'Baixa'}</button>)}
                </div>
              </div>
              {mine2.estHours != null && <div className="relation__row"><span className="muted">Tempo estimado</span><span>{String(mine2.estHours).replace('.', ',')} h</span></div>}
              {mine2.genre && <div className="relation__row"><span className="muted">Seu gênero</span><span>{mine2.genre}</span></div>}
              {(!h || h.state !== 'ativa') && (
                <button className="btn quiet sm" aria-pressed={!!mine2.wontPlay} onClick={() => actions.toggleWontPlay(gameId)}>{mine2.wontPlay ? 'Marcado: não vou jogar (desfazer)' : 'Não vou jogar'}</button>
              )}
            </div>
            {g.source === 'manual' && <LinkToIgdb game={g} />}
          </section>
          {(g.summary || g.themes?.length || g.modes?.length) && (
            <section aria-labelledby="sobre">
              <h2 id="sobre" className="t aside-title">Sobre o jogo</h2>
              {g.summary && <p className="about" lang={showOriginal ? 'en' : 'pt-BR'}>{showOriginal && g.summaryOriginal ? g.summaryOriginal : g.summary}</p>}
              {g.summarySource && (
                <div className="about__src faint">
                  {showOriginal ? 'Texto original do IGDB' : g.summarySource}
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
          <MediaGallery title={g.title} items={media} gameId={g.id} />
          {g.releases && g.releases.length > 0 && (
            <section aria-labelledby="lanc">
              <h2 id="lanc" className="t aside-title">Lançamentos</h2>
              <dl className="releases">{g.releases.map((r) => <div key={r.platform + r.date}><dt className="muted">{pt(r.platform)}</dt><dd>{r.date}</dd></div>)}</dl>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}

function ReviewItem({ r, scale, locked, reveal, progress }: { r: Review; scale: Scale; locked: boolean; reveal: () => void; progress: number | null }) {
  const orig = originalLabel(r.rating, scale);
  return (
    <article className="review">
      <div className="review__head">
        <span className="review__avatar" style={{ background: r.author.color }} aria-hidden="true">{r.author.initial}</span>
        <div className="review__who"><div className="review__name">{r.author.name}</div>{r.context && <div className="muted">{r.context}</div>}</div>
        <div className="review__score">
          <div className="t">{formatScore(r.rating.normalized, scale)}<span className="muted">/{scaleMax(scale)}</span></div>
          {scale === 'FIVE_STAR' && <Stars normalized={r.rating.normalized} size={14} />}
          <div className="faint review__orig">{orig ?? (r.rating.originalScale === 'TEN_POINT' ? 'Nota dada de 0 a 10' : 'Nota dada em estrelas')}</div>
        </div>
      </div>
      {locked ? (
        <div className="spoiler">
          <Icon name="escudo" size={24} />
          <div><strong>Protegida contra spoiler</strong><div className="muted">Fala do final.{progress != null ? ` Você está em ${progress}% da sua História.` : ''}</div></div>
          <button className="btn ghost sm" onClick={reveal}>Mostrar mesmo assim</button>
        </div>
      ) : (
        <>
          {r.title && <h3 className="t review__title">{r.title}</h3>}
          <p className="review__text">{r.text}</p>
        </>
      )}
      {r.useful != null && <div className="faint review__useful">{r.useful} pessoas acharam útil</div>}
    </article>
  );
}

/** Editor de análise. Respeita a escala: a nota é dada na escala de quem escreve. */
function ReviewEditor({ gameId, existing, viewerScale, onDone }: { gameId: string; existing: Review | null; viewerScale: Scale; onDone: () => void }) {
  // Editar uma análise antiga mantém a escala original para não arredondar (regra do documento de escalas).
  const scale: Scale = existing?.rating.originalScale ?? viewerScale;
  // A nota fica guardada em 0..1000 enquanto se escreve; trocar a escala no meio só muda a exibição.
  const [norm, setNorm] = useState<number>(existing ? existing.rating.normalized : 800);
  const step = scale === 'TEN_POINT' ? 50 : 100; // meio ponto ou meia estrela
  const snapped = Math.round(norm / step) * step;
  const value = toScale(snapped, scale);
  const setValue = (v: number) => setNorm(normalize(v, scale).normalized);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [text, setText] = useState(existing?.text ?? '');
  const max = scaleMax(scale);
  const save = () => { actions.saveReview(gameId, normalize(value, scale), title.trim(), text.trim(), existing?.id); onDone(); };

  return (
    <div className="editor">
      <h2 className="t my-review__title">{existing ? 'Editar sua análise' : 'Sua análise'}</h2>
      {existing && existing.rating.originalScale !== viewerScale && (
        <p className="muted" style={{ fontSize: 14 }}>Sua nota original foi dada {scale === 'TEN_POINT' ? 'de 0 a 10' : 'em estrelas'}. Para não arredondar, ela continua sendo editada nessa escala.</p>
      )}
      <div className="editor__score">
        <label id="nota-label" htmlFor={scale === 'TEN_POINT' ? 'nota' : undefined}>Nota</label>
        {scale === 'TEN_POINT' ? (
          <div className="editor__ten">
            <ScoreSlider id="nota" value={value} onChange={setValue} />
            <AnimatedScore value={value} max={10} />
          </div>
        ) : (
          <div className="editor__stars">
            <StarInput value={value} onChange={setValue} labelledBy="nota-label" />
            <AnimatedScore value={value} max={max} />
          </div>
        )}
        {scale === 'FIVE_STAR' && <p className="faint editor__hint">Arraste sobre as estrelas ou clique. Dá para dar meia estrela.</p>}
      </div>
      <label htmlFor="rev-title" className="editor__label">Título (opcional)</label>
      <input id="rev-title" className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Em uma frase, como foi?" />
      <label htmlFor="rev-text" className="editor__label">Texto (opcional)</label>
      <textarea id="rev-text" className="field" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Sem spoilers aqui fora, por favor." />
      <div className="editor__actions"><button className="btn primary" onClick={save}>Salvar análise</button>{existing && <button className="btn quiet" onClick={onDone}>Cancelar</button>}</div>
    </div>
  );
}
