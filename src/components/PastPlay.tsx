import { useState, useSyncExternalStore } from 'react';
import { actions, useStore, getState, journeyForGame, currentHistory, isOpenState, eventsOf } from '../data/store';
import { Sheet } from './Sheet';
import { DateField, type WhenValue } from './DateField';
import { Icon } from './Icon';

type Ending = 'concluida' | 'encerrada' | 'dropada';
const ENDINGS: [Ending, string][] = [['concluida', 'Zerei'], ['encerrada', 'Parei antes do fim'], ['dropada', 'Larguei']];
const WORD: Record<Ending, (again: boolean) => string> = {
  concluida: (again) => (again ? 'Zerou de novo' : 'Zerou'), encerrada: () => 'Encerrou', dropada: () => 'Largou',
};

/* A folha de detalhes vive fora do botão: o botão some quando o jogo vira "zerado", a folha não. */
let pending: { historyId: string; ongoing: boolean } | null = null;
const subs = new Set<() => void>();
const setPending = (v: typeof pending) => { pending = v; subs.forEach((f) => f()); };
export function PastSheetHost() {
  const p = useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => pending);
  return p ? <PastDetailsSheet key={p.historyId} historyId={p.historyId} ongoing={p.ongoing} onClose={() => setPending(null)} /> : null;
}

/**
 * "Já zerei": um toque registra. Depois, se a pessoa quiser, diz quando, como terminou e quantas horas.
 * Se o jogo está em andamento, é a História atual que termina.
 */
export function PastButton({ gameId, className = 'btn ghost', label = 'Já zerei', onDone }: { gameId: string; className?: string; label?: string; onDone?: (historyId: string) => void }) {
  const tap = () => {
    const st = getState();
    const j = journeyForGame(st, gameId);
    const cur = j ? currentHistory(st, j.id) : null;
    const ongoing = !!cur && isOpenState(cur.state);
    const id = actions.recordPast(gameId);
    setPending({ historyId: id, ongoing });
    onDone?.(id);
  };
  return <button type="button" className={className} onClick={tap}><Icon name="check" size={15} />{label}</button>;
}

export function PastDetailsSheet({ historyId, ongoing, onClose }: { historyId: string; ongoing: boolean; onClose: () => void }) {
  const s = useStore((x) => x);
  const h = s.histories.find((x) => x.id === historyId);
  const [when, setWhen] = useState<WhenValue>({ iso: h?.completedAt ?? new Date().toISOString(), precision: h?.completedPrecision ?? 'desconhecida' });
  const [ending, setEnding] = useState<Ending>((h?.state as Ending) ?? 'concluida');
  const [hours, setHours] = useState('');
  if (!h) return null;
  const game = s.games[s.journeys.find((j) => j.id === h.journeyId)?.gameId ?? ''];
  const save = () => {
    const n = hours.trim() ? Number(hours.replace(',', '.')) : undefined;
    const patch: Parameters<typeof actions.updateHistory>[1] = { hours: n != null && isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : undefined };
    if (!ongoing) {
      Object.assign(patch, { completedAt: when.iso, completedPrecision: when.precision, startedAt: when.iso, state: ending, progress: ending === 'concluida' ? 100 : undefined });
      const end = [...eventsOf(s, h.journeyId)].reverse().find((e) => e.historyId === historyId && e.kind === 'marco');
      if (end) actions.updateEvent(end.id, { title: WORD[ending](h.ordinal > 1), text: `Registrado depois${patch.hours ? `, ${String(patch.hours).replace('.', ',')} horas informadas` : ''}.` });
    }
    actions.updateHistory(historyId, patch);
    onClose();
  };
  return (
    <Sheet title={ongoing ? 'Zerou! Parabéns.' : `${game?.title ?? 'Jogo'} registrado`} onClose={onClose} labelId="past-sheet" wide>
      <p className="muted sheet__lead">{ongoing ? 'A História foi concluída hoje. Se quiser, diga quantas horas jogou.' : 'Já está na sua Jornada. Se lembrar de mais alguma coisa, conte aqui; tudo é opcional.'}</p>
      {!ongoing && (
        <>
          <div className="finish__label">Como terminou</div>
          <div className="chips" role="group" aria-label="Como terminou">
            {ENDINGS.map(([id, l]) => <button key={id} type="button" className="chip" aria-pressed={ending === id} onClick={() => setEnding(id)}>{l}</button>)}
          </div>
          <DateField idPrefix="past-when" label="Quando foi" value={when} onChange={setWhen} />
        </>
      )}
      <label htmlFor="past-hours" className="finish__label">Horas jogadas <span className="faint">(opcional)</span></label>
      <input id="past-hours" className="field field--short" inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="Ex.: 25" />
      <div className="sheet__actions">
        <button className="btn primary lg" onClick={save}>Pronto</button>
        <button className="btn quiet" onClick={onClose}>Pular</button>
      </div>
    </Sheet>
  );
}
