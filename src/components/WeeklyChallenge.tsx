/** Desafio da semana: um convite leve, sem pontos nem sequência. Trocar, pular ou desligar quando quiser. */
import { useEffect, useMemo } from 'react';
import { Link } from '../lib/router';
import { actions, useStore } from '../data/store';
import { weekOf, pickWeekly, isDone, describe, type WeeklyPick } from '../lib/weekly';
import { CoverArt } from './CoverArt';
import { Icon } from './Icon';
import { track } from '../lib/track';

const MAX_SWAPS = 2;

export function WeeklyChallenge() {
  const s = useStore((x) => x);
  const week = weekOf();
  const pick = s.prefs.weekly;
  const off = !!s.prefs.weeklyOff;
  const light = !!s.prefs.light;
  // Semana nova: escolhe o convite (evitando repetir o da semana passada).
  useEffect(() => {
    if (off || pick?.week === week) return;
    const c = pickWeekly(s, week, 0, pick?.id);
    actions.setPrefs({ weekly: { week, id: c.id, target: c.target } });
  }, [off, week, pick?.week]); // eslint-disable-line react-hooks/exhaustive-deps
  const cur = pick?.week === week ? pick : null;
  const done = !!cur && (!!cur.doneAt || isDone(s, cur));
  // Cumpriu: guarda a semana (só para a sua lista; nada muda se não cumprir).
  useEffect(() => {
    if (!cur || cur.doneAt || !done) return;
    const list = [...new Set([...(s.prefs.weeklyDone ?? []), week])].slice(-60);
    actions.setPrefs({ weekly: { ...cur, doneAt: new Date().toISOString() }, weeklyDone: list });
    track('jornada.desafio.feito');
  }, [done, cur?.doneAt]); // eslint-disable-line react-hooks/exhaustive-deps
  const c = useMemo(() => (cur ? describe(s, cur) : null), [s, cur]);
  if (off || !cur || !c) return null;
  const set = (p: Partial<WeeklyPick>) => actions.setPrefs({ weekly: { ...cur, ...p } });
  const swap = () => { const n = (cur.swaps ?? 0) + 1; const x = pickWeekly(s, week, n); set({ id: x.id, target: x.target, swaps: n }); track('jornada.desafio.trocou'); };
  const j = c.target ? s.journeys.find((x) => x.id === c.target) : undefined;
  const g = j ? s.games[j.gameId] : undefined;
  const year = week.slice(0, 4);
  const doneYear = (s.prefs.weeklyDone ?? []).filter((w) => w.startsWith(year)).length;
  if (cur.skipped) return (
    <p className="wkc wkc--skipped faint">Desafio desta semana pulado. Na segunda chega outro. <button className="linklike" onClick={() => set({ skipped: false })}>Desfazer</button></p>
  );
  return (
    <section className={`card wkc${done ? ' is-done' : ''}`} aria-labelledby="wkc-h">
      <div className="wkc__head">
        <h2 id="wkc-h" className="kicker">{done ? 'Desafio da semana · feito' : 'Desafio da semana'}</h2>
        {done && <span className="wkc__ok" aria-hidden="true"><Icon name="check" size={14} /></span>}
      </div>
      <div className="wkc__body">
        {g && <Link to={`/jornada/${g.slug}`} className="wkc__cover"><CoverArt game={g} /></Link>}
        <div>
          <p className="wkc__title">{c.title}</p>
          <p className="muted wkc__hint">{done ? 'Pronto. Sem pontos e sem sequência: foi só pelo gosto de jogar.' : c.hint}</p>
        </div>
      </div>
      {!done && (
        <div className="wkc__acts">
          {(cur.swaps ?? 0) < MAX_SWAPS && <button className="btn quiet sm" onClick={swap}>Trocar</button>}
          <button className="btn quiet sm" onClick={() => { set({ skipped: true }); track('jornada.desafio.pulou'); }}>Pular esta semana</button>
        </div>
      )}
      <p className="faint wkc__foot">Se não der, nada acontece. {!light && doneYear > 0 ? `${doneYear} ${doneYear === 1 ? 'feito' : 'feitos'} em ${year}. ` : ''}<button className="linklike" onClick={() => actions.setPrefs({ weeklyOff: true })}>Não quero desafios</button></p>
    </section>
  );
}
