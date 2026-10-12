import { useEffect, useRef, useState } from 'react';
import { actions, useStore, uid } from '../data/store';
import type { ID } from '../data/types';
import { captureDate } from '../lib/captures';
import { shrink, toDataUrl } from '../lib/image';
import { SUPABASE_ON } from '../lib/env';
import { Sheet } from './Sheet';
import { track } from '../lib/track';

type Row = { key: string; file: File; url: string; when: string; source: 'nome' | 'foto' | 'arquivo'; title: string; keep: boolean };
const SOURCE: Record<Row['source'], string> = { nome: 'pelo nome do arquivo', foto: 'pelos dados da foto', arquivo: 'pela data do arquivo (confira)' };
const MAX = 40;
/** No modo demonstração, as fotos ficam no próprio navegador, que tem pouco espaço. */
const MAX_DEMO = 6;

/** "datetime-local" no horário de quem usa. */
const toLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

/**
 * Linha do tempo a partir das capturas de tela: várias de uma vez, cada uma vira um momento na data em que foi tirada.
 * A data vem do nome do arquivo (consoles e Steam), dos dados da foto ou da data do arquivo; dá para corrigir antes.
 */
export function CaptureImportSheet({ journeyId, gameTitle, onClose }: { journeyId: ID; gameTitle: string; onClose: () => void }) {
  const s = useStore((x) => x);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<string>('');
  const [done, setDone] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const live = useRef<Row[]>([]);
  live.current = rows;
  useEffect(() => () => live.current.forEach((r) => URL.revokeObjectURL(r.url)), []);
  const max = s.mode === 'demo' ? MAX_DEMO : MAX;

  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = [...files].filter((f) => f.type.startsWith('image/')).slice(0, max - rows.length);
    const next: Row[] = [];
    for (const f of list) {
      const d = await captureDate(f);
      next.push({ key: `${f.name}-${f.size}-${f.lastModified}`, file: f, url: URL.createObjectURL(f), when: toLocal(d.date), source: d.source, title: '', keep: true });
    }
    setRows((r) => [...r, ...next.filter((n) => !r.some((x) => x.key === n.key))].sort((a, b) => a.when.localeCompare(b.when)));
  };

  const set = (key: string, p: Partial<Row>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...p } : x)));
  const chosen = rows.filter((r) => r.keep);

  const save = async () => {
    const sb = SUPABASE_ON && s.profile ? await import('../data/supabaseAdapter') : null;
    let n = 0;
    for (const r of chosen) {
      setBusy(`Guardando ${n + 1} de ${chosen.length}…`);
      try {
        const blob = await shrink(r.file, s.mode === 'demo' ? 720 : 1080);
        const when = new Date(r.when);
        if (Number.isNaN(when.getTime())) continue;
        const at = when.toISOString();
        // Cada captura vai para a História em que ela aconteceu (a última que já tinha começado naquela data).
        const hs = s.histories.filter((h) => h.journeyId === journeyId).sort((a, b) => a.ordinal - b.ordinal);
        const historyId = ([...hs].reverse().find((h) => h.startedPrecision === 'desconhecida' || h.startedAt <= at) ?? hs[0])?.id;
        if (!historyId) continue;
        if (sb?.photoStorageReady()) {
          const id = uid();
          const path = sb.photoPath(s.profile!.id, id);
          await sb.uploadPhoto(path, blob);
          actions.addPastMoment(historyId, { id, at, title: r.title.trim() || undefined, text: 'Da captura de tela.', image: URL.createObjectURL(blob), imagePath: path });
        } else {
          actions.addPastMoment(historyId, { at, title: r.title.trim() || undefined, text: 'Da captura de tela.', image: await toDataUrl(blob) });
        }
        n++;
      } catch { /* essa ficou de fora; as outras seguem */ }
    }
    track('jornada.capturas');
    setDone(n); setBusy('');
  };

  return (
    <Sheet title="Capturas de tela" onClose={onClose} labelId="caps" wide>
      {done ? (
        <>
          <p>{done} {done === 1 ? 'momento entrou' : 'momentos entraram'} na linha do tempo de {gameTitle}, cada um na data da captura.</p>
          <div className="sheet__actions"><button className="btn primary lg" onClick={onClose}>Ver a linha do tempo</button></div>
        </>
      ) : (
        <>
          <p className="muted">Escolha várias capturas de uma vez (do console, da Steam ou do celular). Cada uma vira um momento na data em que foi tirada. Confira as datas antes de guardar; nome e nota são opcionais.</p>
          <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { void pick(e.target.files); e.target.value = ''; }} />
          <button className="btn ghost" onClick={() => input.current?.click()} disabled={rows.length >= max}>{rows.length ? 'Adicionar mais capturas' : 'Escolher capturas'}</button>
          {rows.length > 0 && (
            <ul className="caps__list">
              {rows.map((r) => (
                <li key={r.key} className={r.keep ? '' : 'is-off'}>
                  <img src={r.url} alt="" />
                  <div className="caps__fields">
                    <input className="field" type="datetime-local" value={r.when} onChange={(e) => set(r.key, { when: e.target.value, source: r.source })} aria-label={`Data de ${r.file.name}`} />
                    <span className={`faint caps__src${r.source === 'arquivo' ? ' is-check' : ''}`}>Data {SOURCE[r.source]}</span>
                    <input className="field" value={r.title} placeholder="Nome do momento (opcional)" onChange={(e) => set(r.key, { title: e.target.value })} maxLength={80} />
                  </div>
                  <label className="caps__keep"><input type="checkbox" checked={r.keep} onChange={(e) => set(r.key, { keep: e.target.checked })} /> Incluir</label>
                </li>
              ))}
            </ul>
          )}
          {rows.length >= max && <p className="faint">Até {max} por vez{s.mode === 'demo' ? ' no modo demonstração' : ''}. Guarde estas e importe o resto depois.</p>}
          <div className="sheet__actions">
            <button className="btn primary lg" disabled={!chosen.length || !!busy} onClick={() => void save()}>{busy || (chosen.length ? `Guardar ${chosen.length} ${chosen.length === 1 ? 'momento' : 'momentos'}` : 'Guardar')}</button>
            <button className="btn quiet" onClick={onClose}>Cancelar</button>
          </div>
        </>
      )}
    </Sheet>
  );
}
