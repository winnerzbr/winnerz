import { navigate } from '../lib/router';
import { actions, useStore, openSession, journeyForGame, currentHistory } from '../data/store';
import type { State } from '../data/types';
import { Icon } from './Icon';

export type PlayState = { label: string; now: boolean; hint?: string; go: () => void };

/**
 * O que o botão de jogar faz para um jogo:
 * volta para a sessão aberta dele, leva à sessão aberta de outro jogo (nunca troca em silêncio)
 * ou começa uma sessão nova (criando a Jornada ou a nova História se precisar).
 */
export function playStateFor(s: State, gameId: string, idle = 'Jogar agora'): PlayState {
  const open = openSession(s);
  const j = journeyForGame(s, gameId);
  if (open && j && open.journeyId === j.id) return { label: 'Voltar para a sessão', now: true, go: () => navigate('/sessao') };
  if (open) {
    const other = s.games[s.journeys.find((x) => x.id === open.journeyId)?.gameId ?? ''];
    return { label: other ? `Sessão aberta em ${other.title}` : 'Sessão aberta', now: true, hint: 'Finalize aquela sessão para começar uma aqui.', go: () => navigate('/sessao') };
  }
  const h = j ? currentHistory(s, j.id) : null;
  const label = h?.state === 'concluida' ? 'Jogar de novo' : j ? 'Continuar' : idle;
  return { label, now: false, go: () => { actions.play(gameId); navigate('/sessao'); } };
}

export function PlayButton({ gameId, className = 'btn lg', idle, showHint }: { gameId: string; className?: string; idle?: string; showHint?: boolean }) {
  const s = useStore((x) => x);
  const p = playStateFor(s, gameId, idle);
  return (
    <>
      <button className={`${className} ${p.now ? 'now' : 'primary'}`} onClick={p.go} title={p.hint}>
        {p.now ? <span className="session-pill__dot" aria-hidden="true" /> : <Icon name="play" size={15} />}{p.label}
      </button>
      {showHint && p.hint && <p className="faint play-hint">{p.hint}</p>}
    </>
  );
}
