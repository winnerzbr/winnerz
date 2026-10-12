import { useMemo, useState } from 'react';
import { Link, navigate } from '../lib/router';
import { actions, useStore, currentHistory, lastNote, activeWaypoints, sessionsOf, eventsOf, openSession } from '../data/store';
import type { State, Game } from '../data/types';
import { Icon } from '../components/Icon';
import { ago, capitalize, dayMonthYear, longDay } from '../lib/format';

type Idea = { game: Game; meta: string; why: string; cta: string };

function focusJourney(s: State) {
  const open = openSession(s);
  if (open) return s.journeys.find((j) => j.id === open.journeyId) ?? null;
  const f = s.journeys.find((j) => j.id === s.focusJourneyId);
  if (f) return f;
  const recent = [...s.sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  return recent ? s.journeys.find((j) => j.id === recent.journeyId) ?? null : null;
}

function ideasFor(s: State, mood: number, focusId?: string): Idea[] {
  const owned = s.copies.map((c) => c.gameId);
  const started = new Set(s.journeys.map((j) => j.gameId));
  const neverPlayed: Idea[] = [...new Set(owned)].filter((g) => !started.has(g)).map((gid) => {
    const c = s.copies.find((x) => x.gameId === gid)!;
    return { game: s.games[gid], meta: `${c.platform}, ${c.kind === 'fisico' ? 'mídia física' : 'digital'}. Na sua estante, ainda sem História.`, why: 'Está ao seu alcance agora e você ainda não começou. Ter não obriga, mas pode ser hoje.', cta: 'Começar Jornada' };
  });
  const active = s.journeys.filter((j) => j.id !== focusId).map((j) => {
    const h = currentHistory(s, j.id);
    const note = lastNote(s, j.id);
    const last = [...s.sessions].filter((x) => x.journeyId === j.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
    if (!h || h.state === 'concluida') return null;
    const paused = j.mood === 'pausado' || h.state === 'pausada';
    return {
      paused,
      idea: {
        game: s.games[j.gameId],
        meta: paused ? (j.pausedNote ?? 'Pausado.') : `Em andamento${h.progress != null ? `, ${h.progress}%` : ''}.${last ? ` Última sessão ${ago(last.startedAt)}.` : ''}`,
        why: note?.note ? `Seu último recado: “${note.note}”` : paused ? 'Você pausou sem pressa. Dá para voltar de onde parou.' : 'Você já está no meio desta história. É o retorno mais fácil.',
        cta: paused ? 'Retomar' : 'Continuar',
      } as Idea,
    };
  }).filter(Boolean) as { paused: boolean; idea: Idea }[];
  const going = active.filter((a) => !a.paused).map((a) => a.idea);
  const paused = active.filter((a) => a.paused).map((a) => a.idea);
  const orders = [
    [...going, ...neverPlayed],            // tenho pouco tempo
    [...paused, ...neverPlayed, ...going], // uma noite inteira
    [...going, ...paused],                 // algo leve
    [...neverPlayed].sort(() => Math.random() - 0.5), // surpreenda-me
  ];
  return (orders[mood].length ? orders[mood] : [...going, ...paused, ...neverPlayed]).filter((i) => i.game);
}

const buddyLines = [
  'Eu tentei jogar isso uma vez. Fiquei preso no menu de pausa. Você vai se sair melhor.',
  'Bip. Escolhi com a minha hélice. Ela sempre aponta pro norte. Ou pro sul. Varia.',
  'Eu dirijo como jogo: com muita confiança e nenhum resultado.',
  'Me escondi numa caixa de papelão pra pensar nessa dica. Ninguém me achou por dois dias.',
];

export function Home() {
  const s = useStore((x) => x);
  const j = focusJourney(s);
  const game = j ? s.games[j.gameId] : null;
  const h = j ? currentHistory(s, j.id) : null;
  const note = j ? lastNote(s, j.id) : null;
  const wps = j ? activeWaypoints(s, j.id) : [];
  const nSessions = h ? sessionsOf(s, h.id).length : 0;
  const [mood, setMood] = useState(0);
  const [alt, setAlt] = useState(0);
  const [skipped, setSkipped] = useState<string[]>([]);
  const ideas = useMemo(() => ideasFor(s, mood, j?.id).filter((i) => !skipped.includes(i.game.id)), [s, mood, j?.id, skipped]);
  const idea = ideas.length ? ideas[alt % ideas.length] : null;

  const others = s.journeys.filter((x) => x.id !== j?.id).map((x) => ({ j: x, g: s.games[x.gameId], h: currentHistory(s, x.id) })).filter((x) => x.h && x.h.state !== 'concluida').slice(0, 3);

  const memory = useMemo(() => {
    const yearAgo = Date.now() - 300 * 86_400_000;
    return s.events.filter((e) => (e.quote || e.image) && new Date(e.at).getTime() < yearAgo && e.kind !== 'marco').sort((a, b) => b.at.localeCompare(a.at))[0] ?? null;
  }, [s.events]);

  const play = (gameId: string) => { actions.play(gameId); navigate('/sessao'); };
  const today = capitalize(longDay(new Date().toISOString()));

  return (
    <main>
      {j && game && h ? (
        <section className="hero on-photo" aria-labelledby="hero-title">
          <img className="hero__bg kb" src={game.backdrop ?? game.cover} alt="" />
          <div className="hero__shade" aria-hidden="true" />
          <div className="hero__fade" aria-hidden="true" />
          <div className="page hero__row">
            <div className="hero__text">
              <p className="hero__kicker in-1">{today}. Anteriormente na sua Jornada…</p>
              <h1 id="hero-title" className="t hero__title in-1">{game.title}</h1>
              <p className="hero__lead in-2">
                {h.ordinal > 1 ? `Sua ${h.ordinal}ª História com este jogo` : 'Sua primeira História com este jogo'}
                {nSessions ? `. ${nSessions} ${nSessions === 1 ? 'sessão' : 'sessões'} desde ${dayMonthYear(h.startedAt).replace(/ de \d{4}$/, '')}` : ''}.
              </p>
              {h.progress != null && (
                <div className="hero__progress in-2">
                  <div><span>Seu progresso</span><span>{h.progress}%, informado por você</span></div>
                  <div className="bar" aria-hidden="true"><span style={{ width: `${h.progress}%` }} /></div>
                </div>
              )}
              {note?.note && (
                <figure className="hero__note in-3">
                  <blockquote className="quote">“{note.note}”</blockquote>
                  <figcaption>Seu recado para a próxima sessão, {longDay(note.startedAt)}</figcaption>
                </figure>
              )}
              <div className="hero__actions in-3">
                <button className="btn primary lg" onClick={() => play(game.id)}><Icon name="play" size={16} />{openSession(s) ? 'Voltar para a sessão' : 'Jogar agora'}</button>
                <Link className="btn ghost lg" to={`/jornada/${game.slug}`}>Abrir linha do tempo</Link>
              </div>
            </div>
            {wps[0]?.image && (
              <Link to={`/jornada/${game.slug}`} className="polaroid in-3">
                <div className="polaroid__paper">
                  <img src={wps[0].image} alt={`Ponto para voltar: ${wps[0].title}`} />
                  <div className="polaroid__cap"><div className="quote">Quero voltar aqui</div><div>{wps[0].title}{wps[0].text ? `, ${wps[0].text.replace(/\.$/, '')}` : ''}</div></div>
                </div>
                <div className="polaroid__count">1 de {wps.length} {wps.length === 1 ? 'ponto' : 'pontos'} para voltar</div>
              </Link>
            )}
          </div>
        </section>
      ) : (
        <section className="page empty-hero">
          <h1 className="t">Onde jogos viram histórias</h1>
          <p className="muted">Escolha um jogo e toque em Jogar. Sua primeira História começa sem formulário.</p>
          <div className="hero__actions"><Link className="btn primary lg" to="/colecao">Abrir sua estante</Link><Link className="btn ghost lg" to="/jogos">Buscar um jogo</Link></div>
        </section>
      )}

      <div className="page home-body">
        {others.length > 0 && (
          <section aria-labelledby="andamento" className="block">
            <div className="block__head"><h2 id="andamento" className="t">Também em andamento</h2><Link to="/jornada">Todas as Jornadas</Link></div>
            <div className="also">
              {others.map(({ j: x, g, h: hh }) => (
                <Link key={x.id} to={`/jornada/${g.slug}`} className="also__item">
                  <img src={g.cover} alt="" style={{ opacity: x.mood === 'pausado' ? 0.7 : 1 }} />
                  <div>
                    <div className="serif also__name">{g.title}</div>
                    <div className="muted also__meta">{x.mood === 'pausado' ? (x.pausedNote ?? 'Pausado.') : x.mood === 'silencioso' ? 'Jogando no modo silencioso.' : `Jogando${hh?.progress != null ? `, ${hh.progress}%` : ''}.`}</div>
                    {hh?.progress != null && x.mood !== 'pausado' && <div className="bar bar--thin" aria-hidden="true"><span style={{ width: `${hh.progress}%` }} /></div>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="split">
          <section aria-labelledby="oqj" className="card what">
            <h2 id="oqj" className="t">O que jogar hoje?</h2>
            <p className="muted">Uma ideia por vez, a partir do que já está ao seu alcance.</p>
            <div role="group" aria-label="Como está seu dia" className="chips">
              {['Tenho 30 minutos', 'Uma noite inteira', 'Algo leve', 'Surpreenda-me'].map((l, i) => (
                <button key={l} className="chip" aria-pressed={mood === i} onClick={() => { setMood(i); setAlt(0); }}>{l}</button>
              ))}
            </div>
            {idea ? (
              <div className="what__pick" key={idea.game.id + mood}>
                <Link to={`/jogos/${idea.game.slug}`} className="what__cover"><img src={idea.game.cover} alt={`Abrir a ficha de ${idea.game.title}`} /></Link>
                <div className="what__info">
                  <div className="t what__title">{idea.game.title}</div>
                  <div className="muted what__meta">{idea.meta}</div>
                  <p className="what__why"><strong>Por que isso? </strong>{idea.why}</p>
                  <div className="what__actions">
                    <button className="btn primary" onClick={() => play(idea.game.id)}>{idea.cta}</button>
                    <button className="btn ghost" onClick={() => setAlt(alt + 1)}>Outra ideia</button>
                    <button className="btn quiet" onClick={() => setSkipped([...skipped, idea.game.id])}>Não agora</button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="what__empty">Nada por enquanto, e tudo bem. <Link to="/colecao">Adicione jogos à estante</Link> para receber ideias.</p>
            )}
            <div className="buddy">
              <img src="/brand/iamiguinho-icon.webp" alt="" />
              <p><span className="buddy__name">IAmiguinho</span> <span className="buddy__tag">mascote</span>{buddyLines[(mood + alt) % buddyLines.length]}</p>
            </div>
          </section>

          <aside className="home-aside" aria-label="Sua estante">
            <section className="card aside-card">
              <h2 className="t">Sua estante</h2>
              <p className="muted">{new Set(s.copies.map((c) => c.gameId)).size} jogos, {s.wishes.length} desejos.</p>
              <div className="aside-covers">
                {s.copies.slice(-4).reverse().map((c) => s.games[c.gameId] && (
                  <Link key={c.id} to={`/jogos/${s.games[c.gameId].slug}`}><img src={s.games[c.gameId].cover} alt={s.games[c.gameId].title} /></Link>
                ))}
              </div>
              <Link to="/colecao" className="btn ghost sm">Abrir a estante</Link>
            </section>
            {s.wishes[0] && s.games[s.wishes[0].gameId] && (
              <section className="card aside-card aside-wish">
                <img src={s.games[s.wishes[0].gameId].cover} alt="" />
                <div>
                  <div className="muted" style={{ fontSize: 13 }}>Nos seus desejos</div>
                  <h2 className="t" style={{ fontSize: 30 }}>{s.games[s.wishes[0].gameId].title}</h2>
                  {s.wishes[0].note && <p className="muted" style={{ margin: '6px 0 0', fontSize: 14 }}>{s.wishes[0].note}</p>}
                </div>
              </section>
            )}
          </aside>
        </div>

        {memory && (
          <section aria-labelledby="memoria" className="block">
            <h2 id="memoria" className="t block__title">{capitalize(ago(memory.at))}</h2>
            <figure className="memory on-photo">
              {memory.image && <img src={memory.image} alt="" />}
              <figcaption>
                {memory.quote && <div className="quote">“{memory.quote}”</div>}
                <div className="memory__meta">{memory.title}, {s.games[s.journeys.find((x) => x.id === memory.journeyId)?.gameId ?? '']?.title}, {dayMonthYear(memory.at)}</div>
              </figcaption>
            </figure>
          </section>
        )}
      </div>
    </main>
  );
}

// Usado por outras páginas para reaproveitar a mesma regra de foco.
export { focusJourney, eventsOf };
