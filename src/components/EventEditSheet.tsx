import { useState } from 'react';
import { actions, useStore } from '../data/store';
import { Sheet, ConfirmButton } from './Sheet';
import { DateField, type WhenValue } from './DateField';

const NAMES: Record<string, string> = { inicio: 'início', sessao: 'sessão', momento: 'momento', ponto: 'ponto para voltar', marco: 'marco', carta: 'carta' };

/** Corrigir ou apagar um acontecimento da linha do tempo. */
export function EventEditSheet({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const e = useStore((s) => s.events.find((x) => x.id === eventId));
  // Momento e sessão guardam a nota como citação; os demais, como texto.
  const quoteFirst = e?.kind === 'momento' || e?.kind === 'sessao';
  const [title, setTitle] = useState(e?.title ?? '');
  const [note, setNote] = useState((quoteFirst ? e?.quote : e?.text) ?? '');
  const [extra, setExtra] = useState((quoteFirst ? e?.text : e?.quote) ?? '');
  const [when, setWhen] = useState<WhenValue>({ iso: e?.at ?? new Date().toISOString(), precision: e?.precision ?? 'dia' });
  const [dropPhoto, setDropPhoto] = useState(false);
  if (!e) return null;
  const save = () => {
    const n = note.trim() || undefined, x = extra.trim() || undefined;
    actions.updateEvent(eventId, {
      title: title.trim() || e.title, at: when.iso, precision: when.precision,
      // A data editada substitui o rótulo antigo de período ("jun a ago 2020").
      dateLabel: when.iso !== e.at || when.precision !== (e.precision ?? 'dia') ? undefined : e.dateLabel,
      ...(quoteFirst ? { quote: n, text: x } : { text: n, quote: x }),
      ...(dropPhoto ? { image: undefined, imagePath: '' } : {}),
    });
    onClose();
  };
  return (
    <Sheet title={`Editar ${NAMES[e.kind] ?? 'acontecimento'}`} onClose={onClose} labelId="ev-edit" wide>
      <label htmlFor="ev-title" className="finish__label">Título</label>
      <input id="ev-title" className="field" value={title} onChange={(ev) => setTitle(ev.target.value)} maxLength={80} />
      <label htmlFor="ev-note" className="finish__label">{e.kind === 'sessao' ? 'Recado para a próxima vez' : 'Nota'}</label>
      <textarea id="ev-note" className="field" rows={3} value={note} onChange={(ev) => setNote(ev.target.value)} />
      {extra && (
        <>
          <label htmlFor="ev-extra" className="finish__label">Detalhe</label>
          <textarea id="ev-extra" className="field" rows={2} value={extra} onChange={(ev) => setExtra(ev.target.value)} />
        </>
      )}
      <DateField idPrefix="ev-when" value={when} onChange={setWhen} />
      {e.image && (
        <div className="ev-photo">
          <img src={e.image} alt="" style={{ opacity: dropPhoto ? 0.3 : 1 }} />
          <button type="button" className="btn quiet sm" aria-pressed={dropPhoto} onClick={() => setDropPhoto((v) => !v)}>{dropPhoto ? 'Manter a foto' : 'Tirar a foto'}</button>
        </div>
      )}
      <div className="sheet__actions">
        <button className="btn primary lg" onClick={save}>Salvar</button>
        <button className="btn quiet" onClick={onClose}>Cancelar</button>
      </div>
      {e.kind !== 'inicio' && (
        <div className="sheet__danger">
          <ConfirmButton label={`Apagar este ${NAMES[e.kind] ?? 'acontecimento'}`} confirm="Toque de novo para apagar" onConfirm={() => { actions.deleteEvent(eventId); onClose(); }} />
        </div>
      )}
    </Sheet>
  );
}
