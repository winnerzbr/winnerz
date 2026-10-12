import { useState } from 'react';
import { actions, useStore, forgottenSession } from '../data/store';
import { hourMin, longDay } from '../lib/format';

const KEY = 'wz.forgotten.ok';
const okFor = () => { try { return sessionStorage.getItem(KEY); } catch { return null; } };

/**
 * Sessão aberta há muitas horas: provavelmente ficou esquecida.
 * A pergunta é gentil, e a pessoa diz quanto jogou (o site não inventa).
 */
export function ForgottenSession() {
  const s = useStore((x) => x);
  const o = forgottenSession(s);
  const [dismissed, setDismissed] = useState(okFor());
  const [asking, setAsking] = useState(false);
  if (!o || dismissed === o.id) return null;
  const game = s.games[s.journeys.find((j) => j.id === o.journeyId)?.gameId ?? ''];
  const keep = () => { try { sessionStorage.setItem(KEY, o.id); } catch { /* nada */ } setDismissed(o.id); };
  const finish = (minutes: number) => {
    const end = new Date(new Date(o.startedAt).getTime() + minutes * 60_000).toISOString();
    actions.finishSession(o.id, { minutes, endedAt: end });
  };
  const today = new Date().toDateString() === new Date(o.startedAt).toDateString();
  return (
    <aside className="forgotten" role="region" aria-label="Sessão esquecida aberta">
      <div className="page forgotten__row">
        <p><strong>Sua sessão de {game?.title ?? 'jogo'} está aberta desde {today ? 'hoje' : longDay(o.startedAt)}, às {hourMin(o.startedAt)}.</strong> Você ainda está jogando?</p>
        {!asking ? (
          <div className="forgotten__actions">
            <button className="btn sm ghost" onClick={keep}>Ainda estou</button>
            <button className="btn sm primary" onClick={() => setAsking(true)}>Já terminei</button>
            <button className="btn sm quiet" onClick={() => actions.deleteSession(o.id)}>Não joguei, apagar</button>
          </div>
        ) : (
          <div className="forgotten__actions" role="group" aria-label="Quanto tempo você jogou">
            <span className="muted">Jogou mais ou menos</span>
            {[30, 60, 120, 180].map((m) => <button key={m} className="btn sm ghost" onClick={() => finish(m)}>{m < 60 ? `${m} min` : `${m / 60} h`}</button>)}
            <button className="btn sm quiet" onClick={() => setAsking(false)}>Voltar</button>
          </div>
        )}
      </div>
    </aside>
  );
}
