import { useState } from 'react';
import { actions, useStore, openSession } from '../data/store';
import { Link } from '../lib/router';
import { Icon } from './Icon';
import { Toast } from './Toast';

/** Barra compacta enquanto há sessão aberta. Não mostra cronômetro de "tempo jogado". */
export function SessionDock() {
  const session = useStore(openSession);
  const game = useStore((s) => {
    const ses = openSession(s);
    const j = ses && s.journeys.find((x) => x.id === ses.journeyId);
    return j ? s.games[j.gameId] : null;
  });
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  if (!session || !game) return null;
  const since = new Date(session.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const say = (text: string) => setToast({ id: Date.now(), text });

  return (
    <div className="dock-wrap">
      <div className="dock" role="region" aria-label="Sessão em andamento">
        <span className="dock__label"><span className="session-pill__dot" aria-hidden="true" /><span><strong>{game.title}</strong> <span className="muted">desde {since}</span></span></span>
        <button onClick={() => { actions.addMoment(session.id, {}); say('Momento guardado na linha do tempo.'); }}><Icon name="camera" /><span className="lbl">Momento</span></button>
        <button onClick={() => { actions.addMoment(session.id, { kind: 'ponto' }); say('Ponto para voltar criado.'); }}><Icon name="pin" /><span className="lbl">Quero voltar aqui</span></button>
        <Link to="/sessao" className="dock__link"><Icon name="caneta" /><span className="lbl">Abrir sessão</span></Link>
        <Link to="/sessao?finalizar=1" className="dock__finish">Finalizar</Link>
      </div>
      {toast && <Toast key={toast.id} text={toast.text} />}
    </div>
  );
}
