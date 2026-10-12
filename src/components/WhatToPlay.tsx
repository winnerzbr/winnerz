import { useMemo, useState } from 'react';
import { Link } from '../lib/router';
import { useStore, currentHistory, lastNote, isOpenState } from '../data/store';
import { shortPlatform } from '../lib/platforms';
import { CoverArt } from './CoverArt';
import type { State, Game } from '../data/types';
import { ago } from '../lib/format';
import { playStateFor } from './PlayButton';

type Idea = { game: Game; meta: string; why: string; cta: string };

export function ideasFor(s: State, mood: number, focusId?: string): Idea[] {
  const started = new Set(s.journeys.map((j) => j.gameId));
  const mine = (g: string) => s.myGames[g] ?? { gameId: g };
  const hoursText = (g: string) => { const h = mine(g).estHours; return h != null ? ` Cerca de ${String(h).replace('.', ',')} h para zerar.` : ''; };
  const owned = [...new Set(s.copies.map((c) => c.gameId))].filter((g) => !started.has(g) && !mine(g).wontPlay && s.games[g]);
  // Prioridade alta primeiro; depois os mais curtos.
  owned.sort((a, b) => (mine(a).priority ?? 2) - (mine(b).priority ?? 2) || (mine(a).estHours ?? 99) - (mine(b).estHours ?? 99));
  const neverPlayedOf = (ids: string[]): Idea[] => ids.map((gid) => {
    const c = s.copies.find((x) => x.gameId === gid)!;
    const pr = mine(gid).priority;
    return { game: s.games[gid], meta: `${shortPlatform(c.platform)}, ${c.kind === 'fisico' ? 'mídia física' : 'digital'}. Na sua estante, ainda sem História.${hoursText(gid)}`, why: pr === 1 ? 'Está na sua lista de prioridade alta e ao seu alcance agora.' : 'Está ao seu alcance agora e você ainda não começou. Ter não obriga, mas pode ser hoje.', cta: 'Começar Jornada' };
  });
  const neverPlayed = neverPlayedOf(owned.slice(0, 60));
  const short = neverPlayedOf(owned.filter((g) => (mine(g).estHours ?? 99) <= 10).slice(0, 40));
  const active = s.journeys.filter((j) => j.id !== focusId).map((j) => {
    const h = currentHistory(s, j.id);
    const note = lastNote(s, j.id);
    const last = [...s.sessions].filter((x) => x.journeyId === j.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
    if (!h || !isOpenState(h.state) || !s.games[j.gameId]) return null;
    const paused = h.state === 'pausada';
    return {
      paused,
      idea: {
        game: s.games[j.gameId],
        meta: paused ? (h.note ?? j.pausedNote ?? 'Pausado.') : `Em andamento${h.progress != null ? `, ${h.progress}%` : ''}.${last ? ` Última sessão ${ago(last.startedAt)}.` : ''}`,
        why: note?.note ? `Seu último recado: “${note.note}”` : paused ? 'Você pausou sem pressa. Dá para voltar de onde parou.' : 'Você já está no meio desta história. É o retorno mais fácil.',
        cta: paused ? 'Retomar' : 'Continuar',
      } as Idea,
    };
  }).filter(Boolean) as { paused: boolean; idea: Idea }[];
  const going = active.filter((a) => !a.paused).map((a) => a.idea);
  const paused = active.filter((a) => a.paused).map((a) => a.idea);
  const orders = [
    [...going, ...short],                  // tenho pouco tempo
    [...paused, ...neverPlayed, ...going], // uma noite inteira
    [...going, ...short, ...paused],       // algo leve
    shuffle(neverPlayedOf(owned)),         // surpreenda-me
  ];
  return (orders[mood].length ? orders[mood] : [...going, ...paused, ...neverPlayed]).filter((i) => i.game);
}

function shuffle<T>(a: T[]): T[] {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) { const k = Math.floor(Math.random() * (i + 1)); [x[i], x[k]] = [x[k], x[i]]; }
  return x.slice(0, 40);
}

const buddyLines = [
  'Eu tentei jogar isso uma vez. Fiquei preso no menu de pausa. Você vai se sair melhor.',
  'Bip. Escolhi com a minha hélice. Ela sempre aponta pro norte. Ou pro sul. Varia.',
  'Eu dirijo como jogo: com muita confiança e nenhum resultado.',
  'Me escondi numa caixa de papelão pra pensar nessa dica. Ninguém me achou por dois dias.',
];


/** "O que jogar hoje?": uma ideia por vez, a partir do que já está ao alcance. */
export function WhatToPlay({ excludeJourneyId, headingId = 'oqj' }: { excludeJourneyId?: string; headingId?: string }) {
  const s = useStore((x) => x);
  const [mood, setMood] = useState(0);
  const [alt, setAlt] = useState(0);
  const [skipped, setSkipped] = useState<string[]>([]);
  const ideas = useMemo(() => ideasFor(s, mood, excludeJourneyId).filter((i) => !skipped.includes(i.game.id)), [s, mood, excludeJourneyId, skipped]);
  const idea = ideas.length ? ideas[alt % ideas.length] : null;
  const play = (gameId: string) => playStateFor(s, gameId).go();

  return (
          <section aria-labelledby={headingId} className="card what">
            <h2 id={headingId} className="t">O que jogar hoje?</h2>
            <p className="muted">Uma ideia por vez, a partir do que já está ao seu alcance.</p>
            <div role="group" aria-label="Como está seu dia" className="chips">
              {['Tenho 30 minutos', 'Uma noite inteira', 'Algo leve', 'Surpreenda-me'].map((l, i) => (
                <button key={l} className="chip" aria-pressed={mood === i} onClick={() => { setMood(i); setAlt(0); }}>{l}</button>
              ))}
            </div>
            {idea ? (
              <div className="what__pick" key={idea.game.id + mood}>
                <Link to={`/jogos/${idea.game.slug}`} className="what__cover" aria-label={`Abrir a ficha de ${idea.game.title}`}><CoverArt game={idea.game} lazy={false} /></Link>
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
  );
}
