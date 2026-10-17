/**
 * E7.5 · Agenda de eventos: as datas do WinnerZ Awards, os eventos do canal (lives, estreias…) e as jogatinas abertas
 * do canal, por mês. Cada item vai para a agenda da pessoa (.ics ou Google Agenda). A administração marca, edita,
 * cancela e apaga eventos aqui mesmo.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from '../lib/router';
import { eventsApi, KIND_LABEL, type AgendaItem, type EventDraft, type EventKind } from '../data/eventsApi';
import { downloadIcs, googleLink, type CalEvent } from '../lib/ics';
import { ConfirmButton } from './Sheet';

const tz = 'America/Sao_Paulo';
const dayBox = (iso: string) => {
  const d = new Date(iso);
  return { n: d.toLocaleDateString('pt-BR', { day: '2-digit', timeZone: tz }), w: d.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: tz }).replace('.', '') };
};
const hour = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: tz });
const monthOf = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: tz });
const isToday = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: tz }) === new Date().toLocaleDateString('pt-BR', { timeZone: tz });
const local = (iso?: string | null) => { if (!iso) return ''; const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
const KINDS: EventKind[] = ['live', 'estreia', 'jogatina', 'awards', 'outro'];
const DURS = [30, 60, 90, 120, 180, 240];

function calOf(it: AgendaItem): CalEvent {
  const url = it.link ? (it.link.startsWith('/') ? `${window.location.origin}${it.link}` : it.link) : `${window.location.origin}/eventos`;
  return { id: `${it.source}-${it.id}`, title: it.title.toLowerCase().startsWith(KIND_LABEL[it.kind].toLowerCase()) ? it.title : `${KIND_LABEL[it.kind]}: ${it.title}`, start: it.startsAt, end: it.endsAt, details: [it.game?.title, it.note].filter(Boolean).join(' · ') || null, url };
}

export function Agenda({ extra, admin }: { extra: AgendaItem[]; admin: boolean }) {
  const [items, setItems] = useState<AgendaItem[] | null>(null);
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState<EventDraft | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { eventsApi.agenda().then(setItems).catch(() => setItems([])); }, []);

  const all = useMemo(() => [...(items ?? []), ...extra].filter((x) => Date.parse(x.endsAt ?? x.startsAt) > Date.now() - 3 * 3600_000 || isToday(x.startsAt))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt)), [items, extra]);
  const months = useMemo(() => {
    const m: { label: string; list: AgendaItem[] }[] = [];
    for (const it of all) { const l = monthOf(it.startsAt); const last = m.at(-1); if (last?.label === l) last.list.push(it); else m.push({ label: l, list: [it] }); }
    return m;
  }, [all]);

  const save = async () => {
    if (!edit) return;
    setBusy(true); setErr('');
    try { setItems(await eventsApi.save(edit)); setEdit(null); } catch (e) { setErr(e instanceof Error ? e.message : 'Não deu agora.'); } finally { setBusy(false); }
  };
  const remove = async (id: string) => { try { setItems(await eventsApi.remove(id)); } catch (e) { setErr(e instanceof Error ? e.message : 'Não deu agora.'); } };
  const cancel = async (it: AgendaItem) => {
    try { setItems(await eventsApi.save({ id: it.id, title: it.title, kind: it.kind, startsAt: it.startsAt, endsAt: it.endsAt, link: it.link, gameId: it.game?.id ?? null, note: it.note, canceled: !it.canceled })); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Não deu agora.'); }
  };
  const startNew = () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(21, 0, 0, 0); setEdit({ title: '', kind: 'live', startsAt: d.toISOString(), endsAt: new Date(d.getTime() + 2 * 3600_000).toISOString(), link: '', note: '' }); };
  const dur = edit?.endsAt ? Math.round((Date.parse(edit.endsAt) - Date.parse(edit.startsAt)) / 60000) : 120;

  return (
    <section className="page agenda" aria-labelledby="agenda-t">
      <div className="agenda__head">
        <h2 className="t agenda__title" id="agenda-t">Agenda</h2>
        {admin && !edit && <button className="btn ghost sm" onClick={startNew}>Marcar evento</button>}
      </div>
      {edit && (
        <form className="agenda__form" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <div className="agenda__formrow">
            <label className="agenda__f agenda__f--wide">Nome<input className="field" value={edit.title} maxLength={100} placeholder="Live: Elden Ring às cegas" onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></label>
            <label className="agenda__f">Começa<input className="field" type="datetime-local" value={local(edit.startsAt)} onChange={(e) => { if (!e.target.value) return; const st = new Date(e.target.value).toISOString(); setEdit({ ...edit, startsAt: st, endsAt: new Date(Date.parse(st) + dur * 60000).toISOString() }); }} /></label>
            <label className="agenda__f">Duração<select className="field" value={DURS.includes(dur) ? dur : 120} onChange={(e) => setEdit({ ...edit, endsAt: new Date(Date.parse(edit.startsAt) + Number(e.target.value) * 60000).toISOString() })}>{DURS.map((m) => <option key={m} value={m}>{m < 60 ? `${m} min` : `${m / 60} h`}</option>)}</select></label>
          </div>
          <div className="seg" role="group" aria-label="Tipo">{KINDS.map((k) => <button type="button" key={k} aria-pressed={edit.kind === k} onClick={() => setEdit({ ...edit, kind: k })}>{KIND_LABEL[k]}</button>)}</div>
          <div className="agenda__formrow">
            <label className="agenda__f agenda__f--wide">Link (live, vídeo ou página)<input className="field" type="url" inputMode="url" value={edit.link ?? ''} placeholder="https://www.twitch.tv/…" onChange={(e) => setEdit({ ...edit, link: e.target.value })} /></label>
            <label className="agenda__f agenda__f--wide">Nota<input className="field" value={edit.note ?? ''} maxLength={300} placeholder="Primeira vez no DLC, sem guia." onChange={(e) => setEdit({ ...edit, note: e.target.value })} /></label>
          </div>
          <div className="agenda__formacts">
            <button className="btn now" disabled={busy || edit.title.trim().length < 3}>{busy ? 'Salvando…' : edit.id ? 'Salvar' : 'Marcar na agenda'}</button>
            <button type="button" className="btn quiet" onClick={() => { setEdit(null); setErr(''); }}>Cancelar</button>
          </div>
        </form>
      )}
      {err && <p className="form-error" role="alert">{err}</p>}
      {items === null ? <p className="muted">Carregando a agenda…</p> : !all.length ? (
        <p className="agenda__empty">Nada marcado por enquanto. As próximas lives, estreias e jogatinas do canal aparecem aqui.</p>
      ) : months.map((m) => (
        <div key={m.label} className="agenda__month">
          <h3 className="agenda__mlabel">{m.label}</h3>
          <ul className="agenda__list">
            {m.list.map((it) => {
              const d = dayBox(it.startsAt);
              const now = Date.parse(it.startsAt) <= Date.now() && Date.parse(it.endsAt ?? it.startsAt) > Date.now();
              const internal = it.link?.startsWith('/');
              const cal = calOf(it);
              return (
                <li key={`${it.source}:${it.id}`} className={`agenda__row${it.canceled ? ' is-off' : ''}${now ? ' is-now' : ''}`}>
                  <span className="agenda__day" aria-hidden="true"><b>{d.n}</b>{d.w}</span>
                  <div className="agenda__body">
                    <span className="agenda__kind">{now ? 'Agora' : KIND_LABEL[it.kind]} · {hour(it.startsAt)}{it.game ? ` · ${it.game.title}` : ''}</span>
                    <b className="agenda__name">{it.title}{it.canceled ? ' (cancelado)' : ''}</b>
                    {it.note && <span className="agenda__note">{it.note}</span>}
                  </div>
                  {!it.canceled && (
                    <div className="agenda__acts">
                      {it.link && (internal ? <Link className="btn ghost sm" to={it.link}>{it.kind === 'jogatina' ? 'Ver jogatina' : 'Abrir'}</Link>
                        : <a className="btn ghost sm" href={it.link} target="_blank" rel="noopener noreferrer">{it.kind === 'live' ? 'Assistir' : 'Abrir'}</a>)}
                      <button className="btn quiet sm" onClick={() => downloadIcs(cal)} title="Arquivo para a agenda do celular ou do computador">Pôr na agenda</button>
                      <a className="btn quiet sm" href={googleLink(cal)} target="_blank" rel="noopener noreferrer" aria-label="Pôr no Google Agenda">Google<span className="agenda__long"> Agenda</span></a>
                    </div>
                  )}
                  {admin && it.source === 'canal' && (
                    <div className="agenda__admin">
                      <button className="btn quiet sm" onClick={() => setEdit({ id: it.id, title: it.title, kind: it.kind, startsAt: it.startsAt, endsAt: it.endsAt, link: it.link, gameId: it.game?.id ?? null, note: it.note })}>Editar</button>
                      <button className="btn quiet sm" onClick={() => void cancel(it)}>{it.canceled ? 'Desfazer cancelamento' : 'Cancelar'}</button>
                      <ConfirmButton className="btn quiet sm" label="Apagar" confirm="Apagar de vez" onConfirm={() => void remove(it.id)} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
