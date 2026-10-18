import { useState } from 'react';
import type { History } from '../data/types';
import { actions } from '../data/store';
import { FEATS, speedrunTime } from '../lib/feats';

const DIFFS = ['Fácil', 'Normal', 'Difícil', 'Muito difícil', 'Máximo'];

/** Dificuldade em que a pessoa joga ou jogou. Salva ao sair do campo. */
export function DifficultyField({ history }: { history: History }) {
  const [v, setV] = useState(history.mode ?? '');
  const save = () => { if (v.trim() !== (history.mode ?? '')) actions.setDifficulty(history.id, v); };
  const id = `dif-${history.id}`;
  return (
    <label className="feats__dif" htmlFor={id}>
      <span className="kicker">Dificuldade</span>
      <input id={id} className="field" value={v} maxLength={40} placeholder="Opcional, ex.: Difícil" list="dif-sugestoes"
        onChange={(e) => setV(e.target.value)} onBlur={save} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
      <datalist id="dif-sugestoes">{DIFFS.map((d) => <option key={d} value={d} />)}</datalist>
    </label>
  );
}

/** Feitos além de zerar. Cada toque marca ou desmarca; o speedrun pede o tempo. */
export function FeatsPanel({ history }: { history: History }) {
  const has = (k: string) => history.feats?.some((f) => f.kind === k);
  const run = history.feats?.find((f) => f.kind === 'speedrun');
  const [askTime, setAskTime] = useState(false);
  const [time, setTime] = useState(run?.detail ?? '');
  const parsed = speedrunTime(time);
  const saveRun = () => {
    actions.toggleFeat(history.id, 'speedrun', parsed ?? '');
    setAskTime(false);
  };
  return (
    <div className="feats">
      <span className="kicker">Além de zerar</span>
      <div className="chips chips--sm" role="group" aria-label="Feitos além de zerar">
        {FEATS.map((f) => f.kind === 'speedrun' ? (
          <button key={f.kind} type="button" className="chip" aria-pressed={!!run || askTime}
            onClick={() => (run ? actions.toggleFeat(history.id, 'speedrun') : setAskTime((x) => !x))}>
            {run?.detail ? `Speedrun ${run.detail}` : f.label}
          </button>
        ) : (
          <button key={f.kind} type="button" className="chip" aria-pressed={!!has(f.kind)} onClick={() => actions.toggleFeat(history.id, f.kind)}>{f.label}</button>
        ))}
      </div>
      {askTime && !run && (
        <form className="feats__time" onSubmit={(e) => { e.preventDefault(); saveRun(); }}>
          <input className="field" autoFocus value={time} onChange={(e) => setTime(e.target.value)} placeholder="Tempo (ex.: 1:42:10). Opcional" aria-label="Tempo do speedrun" />
          <button className="btn sm" type="submit">{time.trim() && !parsed ? 'Salvar sem tempo' : 'Salvar'}</button>
        </form>
      )}
      <DifficultyField history={history} />
    </div>
  );
}
