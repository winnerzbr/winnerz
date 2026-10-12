import { useMemo, useState } from 'react';
import { Link } from '../lib/router';
import { useStore, currentHistory, lastNote } from '../data/store';
import type { State, Game } from '../data/types';
import { ago } from '../lib/format';
import { playStateFor } from './PlayButton';

type Idea = { game: Game; meta: string; why: string; cta: string };

export function ideasFor(s: State, mood: number, focusId?: string): Idea[] {
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
  );
}
