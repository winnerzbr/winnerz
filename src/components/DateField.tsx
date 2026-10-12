import { useState } from 'react';
import { PRECISIONS, isoFor, partsOf, type DatePrecision } from '../lib/dates';

export type WhenValue = { iso: string; precision: DatePrecision };

/**
 * Data com precisão: a pessoa diz o quanto lembra (dia, mês, ano, "por volta de" ou "não lembro")
 * e só então digita o que sabe.
 */
export function DateField({ value, onChange, idPrefix, label = 'Quando' }: { value: WhenValue; onChange: (v: WhenValue) => void; idPrefix: string; label?: string }) {
  const p = partsOf(value.iso);
  const [y, setY] = useState(p.y);
  const [m, setM] = useState(p.m);
  const [d, setD] = useState(p.d);
  const thisYear = partsOf(new Date().toISOString()).y;

  const emit = (precision: DatePrecision, yy = y, mm = m, dd = d) => onChange({ precision, iso: isoFor(precision, yy, mm, dd, value.iso) });

  return (
    <fieldset className="datefield">
      <legend className="datefield__legend">{label}</legend>
      <div className="chips" role="group" aria-label="Quanto você lembra">
        {PRECISIONS.map((x) => (
          <button key={x.id} type="button" className="chip" aria-pressed={value.precision === x.id} onClick={() => emit(x.id)}>{x.label}</button>
        ))}
      </div>
      {value.precision === 'dia' && (
        <input id={`${idPrefix}-dia`} aria-label="Data" className="field" type="date" max={new Date().toISOString().slice(0, 10)}
          value={`${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`}
          onChange={(e) => { const [yy, mm, dd] = e.target.value.split('-').map(Number); if (!yy) return; setY(yy); setM(mm); setD(dd); emit('dia', yy, mm, dd); }} />
      )}
      {value.precision === 'mes' && (
        <input id={`${idPrefix}-mes`} aria-label="Mês e ano" className="field" type="month"
          value={`${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}`}
          onChange={(e) => { const [yy, mm] = e.target.value.split('-').map(Number); if (!yy) return; setY(yy); setM(mm); emit('mes', yy, mm); }} />
      )}
      {(value.precision === 'ano' || value.precision === 'aprox') && (
        <div className="datefield__year">
          <input id={`${idPrefix}-ano`} aria-label="Ano" className="field" type="number" inputMode="numeric" min={1970} max={thisYear} value={y}
            onChange={(e) => { const yy = Number(e.target.value); setY(yy); if (yy >= 1970 && yy <= thisYear) emit(value.precision, yy); }} />
          <div className="chips">
            {[thisYear, thisYear - 1, thisYear - 2].map((yy) => <button key={yy} type="button" className="chip" aria-pressed={y === yy} onClick={() => { setY(yy); emit(value.precision, yy); }}>{yy}</button>)}
          </div>
        </div>
      )}
    </fieldset>
  );
}
