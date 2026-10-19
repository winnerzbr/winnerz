import { useState } from 'react';
import { actions, activeLoan, loansOf, useStore } from '../data/store';
import type { Loan } from '../data/types';
import { localDay } from '../lib/dates';
import { ConfirmButton } from './Sheet';
import { setupNote } from '../lib/setupNote';

export const loanDate = (d?: string) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '') : '');

/** Passou da data combinada (sem drama: só um aviso discreto). */
export const overdue = (l: Loan) => !l.returnedOn && !!l.dueOn && l.dueOn < localDay();

/**
 * Empréstimo de um exemplar ou console: emprestar, marcar que voltou e o histórico.
 * Quem pegou é sempre privado: nunca aparece no perfil nem em Vitrines e Museu.
 */
export function LoanPanel({ item }: { item: { copyId?: string; hardwareId?: string } }) {
  const ready = useStore((s) => s.mode === 'demo' || !!s.schemaV15);
  const s = useStore((x) => x);
  const now = activeLoan(s, item);
  const past = loansOf(s, item).filter((l) => l.returnedOn);
  const [editing, setEditing] = useState<Loan | 'novo' | null>(null);

  if (!ready) return <p className="faint loan__mig">{setupNote('Para registrar empréstimos, rode a migração 0015 no Supabase.')}</p>;

  return (
    <section className="loan" aria-label="Empréstimo">
      {editing ? (
        <LoanForm loan={editing === 'novo' ? undefined : editing} onDone={() => setEditing(null)} item={item} />
      ) : now ? (
        <div className={`loan__now${overdue(now) ? ' is-late' : ''}`}>
          <span className="loan__ic" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M9 7h8v8" /></svg>
          </span>
          <div className="loan__txt">
            <b>Emprestado para {now.person}</b>
            <span className="muted">
              desde {loanDate(now.lentOn)}{now.dueOn ? `, combinado até ${loanDate(now.dueOn)}` : ''}
              {overdue(now) && <em className="loan__late"> · passou da data combinada</em>}
            </span>
            {now.note && <span className="faint loan__note">{now.note}</span>}
          </div>
          <div className="loan__acts">
            <button type="button" className="btn primary sm" onClick={() => actions.returnLoan(now.id)}>Voltou</button>
            <button type="button" className="btn quiet sm" onClick={() => setEditing(now)}>Editar</button>
          </div>
        </div>
      ) : (
        <div className="loan__idle">
          <button type="button" className="btn ghost sm" onClick={() => setEditing('novo')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
            Emprestar
          </button>
          <span className="faint">Guarda para quem foi e quando volta. Só você vê.</span>
        </div>
      )}
      {past.length > 0 && !editing && (
        <details className="loan__hist">
          <summary>{past.length === 1 ? 'Já foi emprestado 1 vez' : `Já foi emprestado ${past.length} vezes`}</summary>
          <ul>
            {past.map((l) => (
              <li key={l.id}>
                <span><b>{l.person}</b> <span className="muted">· {loanDate(l.lentOn)} a {loanDate(l.returnedOn)}</span></span>
                <button type="button" className="linklike" onClick={() => setEditing(l)}>Editar</button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function LoanForm({ loan, item, onDone }: { loan?: Loan; item: { copyId?: string; hardwareId?: string }; onDone: () => void }) {
  const [f, setF] = useState({ person: loan?.person ?? '', lentOn: loan?.lentOn ?? localDay(), dueOn: loan?.dueOn ?? '', returnedOn: loan?.returnedOn ?? '', note: loan?.note ?? '' });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const ok = f.person.trim().length > 0 && !!f.lentOn && (!f.returnedOn || f.returnedOn >= f.lentOn);
  const save = () => {
    if (!ok) return;
    if (loan) actions.updateLoan({ ...loan, person: f.person.trim().slice(0, 80), lentOn: f.lentOn, dueOn: f.dueOn || undefined, returnedOn: f.returnedOn || undefined, note: f.note.trim().slice(0, 300) || undefined });
    else actions.lend(item, { person: f.person.slice(0, 80), lentOn: f.lentOn, dueOn: f.dueOn || undefined, note: f.note.slice(0, 300) });
    onDone();
  };
  return (
    <form className="cform loan__form" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <div className="cform__grid">
        <label className="cform__wide">Para quem<input className="field" value={f.person} onChange={set('person')} autoFocus maxLength={80} placeholder="Ex.: Rafa, primo Léo" required /></label>
        <label>Desde<input className="field" type="date" value={f.lentOn} onChange={set('lentOn')} required /></label>
        <label>Combinado até <span className="faint">(opcional)</span><input className="field" type="date" value={f.dueOn} onChange={set('dueOn')} /></label>
        {loan && <label>Voltou em <span className="faint">(vazio = ainda está com a pessoa)</span><input className="field" type="date" value={f.returnedOn} onChange={set('returnedOn')} /></label>}
        <label className="cform__wide">Nota <span className="faint">(opcional)</span><input className="field" value={f.note} onChange={set('note')} maxLength={300} placeholder="Ex.: levou com o manual" /></label>
      </div>
      <div className="sheet__actions">
        <button type="submit" className="btn primary" disabled={!ok}>{loan ? 'Salvar' : 'Emprestar'}</button>
        <button type="button" className="btn quiet" onClick={onDone}>Cancelar</button>
        {loan && <ConfirmButton label="Apagar este registro" confirm="Toque de novo para apagar" onConfirm={() => { actions.deleteLoan(loan.id); onDone(); }} />}
      </div>
    </form>
  );
}
