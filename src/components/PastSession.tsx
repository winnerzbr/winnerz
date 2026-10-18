import { useMemo, useState } from 'react';
import { actions, useStore, currentHistory, focusJourneys, isOpenState } from '../data/store';
import { Sheet } from './Sheet';
import { Icon } from './Icon';

const DUR: [number, string][] = [[30, '30 min'], [60, '1 h'], [120, '2 h'], [180, '3 h']];
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * "Joguei sem registrar": a sessão de ontem à noite, lançada depois. Jogo, dia, quanto tempo e, se quiser,
 * onde parou e um recado. Vira uma sessão comum na Jornada, marcada como "lançada depois".
 */
export function PastSessionSheet({ gameId, onClose, onSaved }: { gameId?: string; onClose: () => void; onSaved?: (gameId: string) => void }) {
  const s = useStore((x) => x);
  // Os jogos em andamento primeiro (o foco na frente), depois os pausados.
  const games = useMemo(() => {
    const focus = focusJourneys(s).map((f) => f.journey.id);
    return s.journeys
      .map((j) => ({ j, h: currentHistory(s, j.id), g: s.games[j.gameId] }))
      .filter((x) => x.g && x.h && isOpenState(x.h.state))
      .sort((a, b) => Number(focus.includes(b.j.id)) - Number(focus.includes(a.j.id)) || focus.indexOf(a.j.id) - focus.indexOf(b.j.id) || Number(b.h!.state === 'ativa') - Number(a.h!.state === 'ativa'))
      .map((x) => x.g!);
  }, [s]);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 864e5);
  const [game, setGame] = useState(gameId ?? games[0]?.id ?? '');
  const [day, setDay] = useState(isoDay(yesterday));
  const [time, setTime] = useState('20:00');
  const [mins, setMins] = useState<number | null>(60);
  const [typed, setTyped] = useState('');
  const [where, setWhere] = useState('');
  const [note, setNote] = useState('');
  const minutes = typed.trim() ? Math.round(Number(typed)) : mins;
  const start = new Date(`${day}T${time || '20:00'}`);
  const future = start.getTime() + (minutes ?? 0) * 60_000 > Date.now() + 60_000;
  const ok = !!game && !!minutes && minutes > 0 && minutes <= 1440 && !Number.isNaN(start.getTime()) && !future;
  const save = () => {
    if (!ok) return;
    actions.addPastSession(game, { startedAt: start.toISOString(), minutes: minutes!, whereStopped: where.trim() || undefined, note: note.trim() || undefined });
    onSaved?.(game);
    onClose();
  };
  return (
    <Sheet title="Joguei sem registrar" onClose={onClose} labelId="past-session">
      <form className="past-ses" onSubmit={(e) => { e.preventDefault(); save(); }}>
        {games.length === 0 && !gameId ? <p className="muted">Nenhum jogo em andamento. Comece um pela página do jogo.</p> : (
          <label className="finish__label" htmlFor="ps-game">Jogo
            <select id="ps-game" className="field" value={game} onChange={(e) => setGame(e.target.value)}>
              {gameId && !games.some((g) => g.id === gameId) && s.games[gameId] && <option value={gameId}>{s.games[gameId].title}</option>}
              {games.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
          </label>
        )}
        <div className="finish__label">Quando</div>
        <div className="chips" role="group" aria-label="Dia">
          <button type="button" className="chip" aria-pressed={day === isoDay(today)} onClick={() => setDay(isoDay(today))}>Hoje</button>
          <button type="button" className="chip" aria-pressed={day === isoDay(yesterday)} onClick={() => setDay(isoDay(yesterday))}>Ontem</button>
          <input className="field past-ses__day" type="date" aria-label="Outro dia" max={isoDay(today)} value={day} onChange={(e) => e.target.value && setDay(e.target.value)} />
          <input className="field past-ses__time" type="time" aria-label="Começou às" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className="finish__label">Quanto tempo</div>
        <div className="chips" role="group" aria-label="Duração">
          {DUR.map(([m, l]) => <button type="button" key={m} className="chip" aria-pressed={!typed.trim() && mins === m} onClick={() => { setMins(m); setTyped(''); }}>{l}</button>)}
          <input className="field past-ses__mins" type="number" inputMode="numeric" min={1} max={1440} placeholder="min" aria-label="Outra duração, em minutos" value={typed} onChange={(e) => setTyped(e.target.value)} />
        </div>
        {future && <p className="faint">Esse horário ainda não passou. Ajuste o dia ou a hora.</p>}
        <label className="finish__label" htmlFor="ps-where">Onde você parou? <span className="faint">(opcional)</span></label>
        <input id="ps-where" className="field" value={where} onChange={(e) => setWhere(e.target.value)} placeholder="Ex.: entrei no teatro" maxLength={140} />
        <label className="finish__label" htmlFor="ps-note">Recado para a próxima vez <span className="faint">(opcional)</span></label>
        <textarea id="ps-note" className="field" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="O que você quer lembrar quando voltar?" />
        <div className="past-ses__actions">
          <button type="submit" className="btn primary" disabled={!ok}><Icon name="check" size={16} />Lançar a sessão</button>
          <button type="button" className="btn quiet" onClick={onClose}>Cancelar</button>
        </div>
      </form>
    </Sheet>
  );
}

/** Botão discreto que abre a folha. */
export function PastSessionButton({ gameId, className = 'btn quiet sm', label = 'Joguei sem registrar' }: { gameId?: string; className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}><Icon name="relogio" size={15} />{label}</button>
      {open && <PastSessionSheet gameId={gameId} onClose={() => setOpen(false)} />}
    </>
  );
}
