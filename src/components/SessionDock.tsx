import { useStore, openSession } from '../data/store';
import { Link, navigate } from '../lib/router';
import { Icon } from './Icon';

/** Barra compacta enquanto há sessão aberta. Não mostra cronômetro de "tempo jogado". */
export function SessionDock() {
  const session = useStore(openSession);
  const game = useStore((s) => {
    const ses = openSession(s);
    const j = ses && s.journeys.find((x) => x.id === ses.journeyId);
    return j ? s.games[j.gameId] : null;
  });
  if (!session || !game) return null;
  const since = new Date(session.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });


  return (
    <div className="dock-wrap">
      <div className="dock" role="region" aria-label="Sessão em andamento">
        <span className="dock__label"><span className="session-pill__dot" aria-hidden="true" /><span><strong>{game.title}</strong> <span className="muted">desde {since}</span></span></span>
        <button onClick={() => navigate('/sessao?acao=momento')}><Icon name="camera" /><span className="lbl">Momento</span></button>
        <button onClick={() => navigate('/sessao?acao=ponto')}><Icon name="pin" /><span className="lbl">Quero voltar aqui</span></button>
        <Link to="/sessao" className="dock__link"><Icon name="caneta" /><span className="lbl">Abrir sessão</span></Link>
        <Link to="/sessao?finalizar=1" className="dock__finish">Finalizar</Link>
      </div>
    </div>
  );
}
