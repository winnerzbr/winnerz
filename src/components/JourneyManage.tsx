import { useState } from 'react';
import { navigate } from '../lib/router';
import { actions, useStore, historiesOf, currentHistory } from '../data/store';
import type { History } from '../data/types';
import { Sheet, ConfirmButton } from './Sheet';
import { DateField, type WhenValue } from './DateField';
import { whenLabel } from '../lib/dates';

export const STATE_LABEL: Record<History['state'], string> = {
  ativa: 'Em andamento', pausada: 'Pausada', concluida: 'Zerada', encerrada: 'Encerrada sem zerar', dropada: 'Largada',
};

/** Recado opcional depois de pausar, largar ou encerrar. Nada obriga a escrever. */
export function StateNoteSheet({ historyId, onClose }: { historyId: string; onClose: () => void }) {
  const h = useStore((s) => s.histories.find((x) => x.id === historyId));
  const [note, setNote] = useState(h?.note ?? '');
  if (!h) return null;
  const verb = h.state === 'pausada' ? 'pausou' : h.state === 'dropada' ? 'largou' : 'encerrou';
  return (
    <Sheet title="Quer deixar um recado?" onClose={onClose} labelId="state-note">
      <p className="muted sheet__lead">Por que você {verb}? Fica só com você e aparece quando voltar.</p>
      <label htmlFor="state-note-t" className="sr-only">Recado</label>
      <textarea id="state-note-t" className="field" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={h.state === 'pausada' ? 'Ex.: esperando a DLC sair' : 'Ex.: o combate não encaixou comigo agora'} />
      <div className="sheet__actions">
        <button className="btn primary lg" onClick={() => { actions.updateHistory(historyId, { note: note.trim() || undefined }); onClose(); }}>Guardar recado</button>
        <button className="btn quiet" onClick={onClose}>Agora não</button>
      </div>
    </Sheet>
  );
}

/** Corrigir uma História: nome, datas com precisão, horas e recado. Também apaga. */
export function HistoryEditSheet({ historyId, onClose }: { historyId: string; onClose: () => void }) {
  const h = useStore((s) => s.histories.find((x) => x.id === historyId));
  const siblings = useStore((s) => (h ? historiesOf(s, h.journeyId).length : 0));
  const [title, setTitle] = useState(h?.title ?? '');
  const [start, setStart] = useState<WhenValue>({ iso: h?.startedAt ?? new Date().toISOString(), precision: h?.startedPrecision ?? 'dia' });
  const [end, setEnd] = useState<WhenValue>({ iso: h?.completedAt ?? new Date().toISOString(), precision: h?.completedPrecision ?? 'dia' });
  const [hours, setHours] = useState(h?.hours != null ? String(h.hours).replace('.', ',') : '');
  const [note, setNote] = useState(h?.note ?? '');
  if (!h) return null;
  const closed = h.state === 'concluida' || h.state === 'encerrada' || h.state === 'dropada';
  const save = () => {
    const n = hours.trim() ? Number(hours.replace(',', '.')) : undefined;
    actions.updateHistory(historyId, {
      title: title.trim() || h.title, startedAt: start.iso, startedPrecision: start.precision,
      ...(closed ? { completedAt: end.iso, completedPrecision: end.precision } : {}),
      hours: n != null && isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : undefined, note: note.trim() || undefined,
    });
    onClose();
  };
  return (
    <Sheet title={`Editar a História ${h.ordinal}`} onClose={onClose} labelId="hist-edit" wide>
      <p className="muted sheet__lead">{STATE_LABEL[h.state]}. Corrija o que quiser; nada aqui é obrigatório.</p>
      <label htmlFor="hist-title" className="finish__label">Nome da História</label>
      <input id="hist-title" className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} />
      <DateField idPrefix="hist-start" label="Quando começou" value={start} onChange={setStart} />
      {closed && <DateField idPrefix="hist-end" label={h.state === 'concluida' ? 'Quando zerou' : 'Quando parou'} value={end} onChange={setEnd} />}
      <label htmlFor="hist-hours" className="finish__label">Horas jogadas <span className="faint">(informadas por você)</span></label>
      <input id="hist-hours" className="field field--short" inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="Ex.: 32" />
      <label htmlFor="hist-note" className="finish__label">Recado</label>
      <textarea id="hist-note" className="field" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="sheet__actions">
        <button className="btn primary lg" onClick={save}>Salvar</button>
        <button className="btn quiet" onClick={onClose}>Cancelar</button>
      </div>
      <div className="sheet__danger">
        <ConfirmButton
          label={siblings > 1 ? 'Apagar esta História' : 'Apagar esta História (e a Jornada)'}
          confirm="Toque de novo para apagar de vez"
          onConfirm={() => { const journeyGone = siblings <= 1; actions.deleteHistory(historyId); onClose(); if (journeyGone) navigate('/jornada'); }}
        />
        <p className="faint">Apaga sessões, momentos e fotos desta História. Não dá para desfazer.</p>
      </div>
    </Sheet>
  );
}

/** Tudo o que se pode fazer com uma Jornada, num lugar só. */
export function JourneyMenu({ journeyId, onClose, onEditHistory, onStateChanged }: { journeyId: string; onClose: () => void; onEditHistory: (id: string) => void; onStateChanged: (historyId: string, text: string) => void }) {
  const s = useStore((x) => x);
  const journey = s.journeys.find((j) => j.id === journeyId);
  if (!journey) return null;
  const game = s.games[journey.gameId];
  const hs = historiesOf(s, journeyId);
  const cur = currentHistory(s, journeyId)!;
  const set = (st: 'ativa' | 'pausada' | 'dropada' | 'encerrada', text: string) => { actions.setHistoryState(cur.id, st); onClose(); onStateChanged(cur.id, text); };

  return (
    <Sheet title={game?.title ?? 'Jornada'} onClose={onClose} labelId="jmenu" wide>
      <section className="jmenu__group" aria-labelledby="jmenu-state">
        <h3 id="jmenu-state" className="jmenu__h">Esta História: {STATE_LABEL[cur.state].toLowerCase()}</h3>
        <div className="jmenu__states">
          {cur.state === 'ativa' && (
            <>
              <button className="jstate" onClick={() => set('pausada', 'Pausado. Ele espera por você.')}><strong>Pausar</strong><span>Volto depois. Fica em Pausados.</span></button>
              <button className="jstate" onClick={() => set('dropada', 'Largado, sem culpa. Dá para retomar quando quiser.')}><strong>Largar</strong><span>Não está encaixando agora.</span></button>
              <button className="jstate" onClick={() => set('encerrada', 'Encerrado do seu jeito.')}><strong>Encerrar sem zerar</strong><span>Terminei do meu jeito.</span></button>
            </>
          )}
          {cur.state === 'pausada' && (
            <>
              <button className="jstate" onClick={() => set('ativa', 'De volta à História.')}><strong>Retomar</strong><span>Volta para Jogando agora.</span></button>
              <button className="jstate" onClick={() => set('dropada', 'Largado, sem culpa.')}><strong>Largar</strong><span>Não vou continuar por agora.</span></button>
              <button className="jstate" onClick={() => set('encerrada', 'Encerrado do seu jeito.')}><strong>Encerrar sem zerar</strong><span>Terminei do meu jeito.</span></button>
            </>
          )}
          {(cur.state === 'dropada' || cur.state === 'encerrada') && (
            <button className="jstate" onClick={() => set('ativa', 'De volta à História.')}><strong>Retomar esta História</strong><span>Continua de onde parou.</span></button>
          )}
          {cur.state === 'concluida' && <p className="muted">História zerada. Para jogar de novo, toque em Jogar de novo: uma nova História começa e esta fica guardada.</p>}
        </div>
      </section>

      <section className="jmenu__group" aria-labelledby="jmenu-hist">
        <h3 id="jmenu-hist" className="jmenu__h">Histórias</h3>
        <ul className="jmenu__hists">
          {hs.map((h) => (
            <li key={h.id}>
              <div>
                <strong>{h.ordinal}. {h.title}</strong>
                <span className="muted">{STATE_LABEL[h.state]}, {whenLabel(h.startedAt, h.startedPrecision)}{h.completedAt && h.state !== 'ativa' && h.state !== 'pausada' ? ` a ${whenLabel(h.completedAt, h.completedPrecision)}` : ''}{h.hours ? `, ${String(h.hours).replace('.', ',')} h` : ''}</span>
              </div>
              <button className="btn ghost sm" onClick={() => { onClose(); onEditHistory(h.id); }}>Editar</button>
            </li>
          ))}
        </ul>
      </section>

      <div className="sheet__danger">
        <ConfirmButton label="Apagar a Jornada inteira" confirm={`Toque de novo para apagar ${hs.length > 1 ? `as ${hs.length} Histórias` : 'tudo'}`} onConfirm={() => { actions.deleteJourney(journeyId); onClose(); navigate('/jornada'); }} />
        <p className="faint">Apaga todas as Histórias, sessões, momentos e fotos deste jogo. A cópia na coleção continua.</p>
      </div>
    </Sheet>
  );
}
