import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from '../lib/router';
import { actions, getState, uid, useStore } from '../data/store';
import { ensureRules } from '../data/moderationApi';
import type { MuseumPiece, MuseumRoom, PieceRef } from '../data/types';
import { SubNav } from '../components/SubNav';
import { ConfirmButton } from '../components/Sheet';
import { Icon } from '../components/Icon';
import { PiecePicker } from '../components/PiecePicker';
import { ExhibitView, RoomView } from '../components/MuseumView';
import { MuseumTour } from '../components/MuseumTour';
import { ROOM_MODELS, exhibitOf, roomExhibits, suggestedRooms } from '../lib/museum';
import { shrink, toDataUrl } from '../lib/image';

/** Texto que só grava quando você sai do campo (sem gravar a cada letra). */
function Commit({ value, onCommit, multiline, className, placeholder, max, label }: { value: string; onCommit: (v: string) => void; multiline?: boolean; className?: string; placeholder?: string; max: number; label: string }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const done = () => { if (v.trim() !== value.trim()) onCommit(v.trim().slice(0, max)); };
  return multiline
    ? <textarea className={`field ${className ?? ''}`} aria-label={label} value={v} rows={2} maxLength={max} placeholder={placeholder} onChange={(e) => setV(e.target.value)} onBlur={done} />
    : <input className={`field ${className ?? ''}`} aria-label={label} value={v} maxLength={max} placeholder={placeholder} onChange={(e) => setV(e.target.value)} onBlur={done} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />;
}

/** Coleção → Museu: abre pela exposição. Editar acontece nas próprias salas. */
export function MuseumPage() {
  const s = useStore((x) => x);
  const ready = s.mode === 'demo' || !!s.schemaV15;
  const rooms = useMemo(() => [...(s.rooms ?? [])].sort((a, b) => a.position - b.position), [s.rooms]);
  const suggestion = useMemo(() => (rooms.length ? [] : suggestedRooms(s)), [rooms.length, s]);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [tour, setTour] = useState(false);
  const museum = s.museum ?? {};
  const pieces = rooms.reduce((n, r) => n + roomExhibits(s, r).length, 0);
  useEffect(() => { document.title = 'Museu · WinnerZ'; }, []);
  useEffect(() => {
    if (!tour) return;
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [tour]);

  const keepSuggestion = () => {
    suggestion.forEach((r, i) => actions.saveRoom({ title: r.title, text: r.text, pieces: r.pieces, position: i }));
    if (!museum.title) actions.setMuseum({ title: `O museu de ${s.profile?.name ?? 'você'}` });
  };
  const newRoom = (key: string) => {
    const m = ROOM_MODELS.find((x) => x.key === key)!;
    actions.saveRoom({ title: m.title, text: m.text || undefined, pieces: m.pieces(s) });
    setAdding(false); setEditing(true);
  };
  const move = (i: number, d: -1 | 1) => {
    const ids = rooms.map((r) => r.id), j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    actions.orderRooms(ids);
  };

  if (!ready) {
    return (
      <main className="page pad museum">
        <MuseumHead editing={false}><SubNav pillar="colecao" /></MuseumHead>
        <div className="card tl-empty"><p className="muted">Para montar o Museu, rode a migração 0015 no Supabase (SQL Editor → colar → Run).</p></div>
      </main>
    );
  }

  return (
    <main className={`page pad museum${editing ? ' is-editing' : ''}`}>
      <MuseumHead editing={editing}><SubNav pillar="colecao" /></MuseumHead>

      <header className="museum__hero">
        <span className="kicker">Museu pessoal{rooms.length ? ` · ${rooms.length} ${rooms.length === 1 ? 'sala' : 'salas'} · ${pieces} ${pieces === 1 ? 'peça' : 'peças'}` : ''}</span>
        {editing ? (
          <div className="museum__meta">
            <Commit label="Nome do museu" className="museum__titlein" value={museum.title ?? ''} max={80} placeholder="Nome do museu" onCommit={(title) => actions.setMuseum({ title })} />
            <Commit label="Apresentação" multiline className="museum__introin" value={museum.intro ?? ''} max={1000} placeholder="Uma apresentação curta, como a placa da entrada." onCommit={(intro) => actions.setMuseum({ intro })} />
          </div>
        ) : (
          <>
            <h1 className="t museum__title">{museum.title || (rooms.length ? 'Meu museu' : 'Um começo para o seu museu')}</h1>
            {(museum.intro || !rooms.length) && <p className="museum__intro">{museum.intro || 'Montamos esta exposição com o que já está na sua coleção. Nada foi gravado ainda: guarde como está e mude o que quiser, sala por sala.'}</p>}
          </>
        )}
        <div className="museum__actions">
          {rooms.length > 0 && !editing && pieces > 0 && <button className="btn primary" onClick={() => setTour(true)}>Fazer a visita guiada</button>}
          {rooms.length > 0 && (editing ? <button className="btn primary" onClick={() => { setEditing(false); setAdding(false); }}>Pronto</button> : <button className="btn ghost" onClick={() => setEditing(true)}>Editar o museu</button>)}
          {!rooms.length && suggestion.length > 0 && <button className="btn primary" onClick={keepSuggestion}>Guardar este museu</button>}
          {!rooms.length && <button className="btn ghost" onClick={() => newRoom('livre')}>Começar do zero</button>}
          {rooms.length > 0 && (
            <label className="vitrine__share">
              <input type="checkbox" role="switch" className="switch" checked={!!museum.shared} onChange={async () => { if (!museum.shared && !(await ensureRules())) return; actions.setMuseum({ shared: !museum.shared }); }} />
              <span>Mostrar no meu perfil</span>
            </label>
          )}
        </div>
        {museum.shared && rooms.length > 0 && <p className="faint vitrine__hint">Aberto para quem pode ver a sua Coleção (<Link to="/preferencias#perfil">Perfil e privacidade</Link>). As plaquinhas, fotos e momentos das salas aparecem como estão aqui; preços, estado e notas dos exemplares, nunca.</p>}
      </header>

      {tour && (
        <div className="mtour-overlay" role="dialog" aria-modal="true" aria-label="Visita guiada do seu museu">
          <MuseumTour title={museum.title || 'Meu museu'} intro={museum.intro} owner={s.profile?.name ?? 'você'} onClose={() => setTour(false)}
            rooms={rooms.map((r) => ({ title: r.title, text: r.text, exhibits: roomExhibits(s, r) }))} />
        </div>
      )}

      {rooms.length === 0 && suggestion.length === 0 && (
        <div className="card tl-empty"><p className="muted">Quando a coleção tiver jogos especiais, presentes, consoles ou momentos com foto, o museu se monta sozinho. Ou comece do zero, uma sala de cada vez.</p></div>
      )}

      {rooms.length === 0 && suggestion.map((r, i) => (
        <RoomView key={r.id} index={i} title={<h2 className="t mroom__title">{r.title}</h2>} text={r.text ? <p className="mroom__text">{r.text}</p> : null}
          exhibits={roomExhibits(s, r).map((ex) => <ExhibitView key={ex.key} ex={ex} />)} />
      ))}

      {rooms.map((r, i) => editing
        ? <RoomEditor key={r.id} room={r} index={i} first={i === 0} last={i === rooms.length - 1} onMove={(d) => move(i, d)} />
        : (
          <RoomView key={r.id} index={i} title={<h2 className="t mroom__title">{r.title}</h2>} text={r.text ? <p className="mroom__text">{r.text}</p> : null}
            exhibits={roomExhibits(s, r).length ? roomExhibits(s, r).map((ex) => <ExhibitView key={ex.key} ex={ex} />) : <p className="muted mroom__empty">Sala vazia por enquanto. Toque em Editar o museu para pendurar as peças.</p>} />
        ))}

      {rooms.length > 0 && editing && (
        <section className="mnew">
          {adding ? (
            <>
              <span className="kicker">Nova sala a partir de um modelo</span>
              <div className="mnew__models">
                {ROOM_MODELS.map((m) => {
                  const n = m.pieces(s).length;
                  return (
                    <button key={m.key} className="mnew__model" onClick={() => newRoom(m.key)}>
                      <b>{m.title}</b>
                      <span className="muted">{m.key === 'livre' ? 'Vazia, para montar do seu jeito.' : n ? `Começa com ${n} ${n === 1 ? 'peça' : 'peças'}.` : 'Começa vazia (nada na coleção entra hoje).'}</span>
                    </button>
                  );
                })}
              </div>
              <button className="btn quiet sm" onClick={() => setAdding(false)}>Cancelar</button>
            </>
          ) : <button className="btn ghost" onClick={() => setAdding(true)}><Icon name="mais" size={16} />Nova sala</button>}
        </section>
      )}
    </main>
  );
}

function MuseumHead({ editing, children }: { editing: boolean; children: ReactNode }) {
  return (
    <header className="page-head museum__top">
      <div className="page-head__text"><h1 className="t big">Museu</h1>{editing && <p className="muted lead">Editando. Cada mudança é guardada na hora.</p>}</div>
      <div className="page-head__side">{children}</div>
    </header>
  );
}

type Tab = 'colecao' | 'momentos' | 'foto';

function RoomEditor({ room, index, first, last, onMove }: { room: MuseumRoom; index: number; first: boolean; last: boolean; onMove: (d: -1 | 1) => void }) {
  const s = useStore((x) => x);
  const [tab, setTab] = useState<Tab | null>(null);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const save = (patch: Partial<MuseumRoom>) => actions.saveRoom({ ...room, ...patch });
  const setPieces = (pieces: MuseumPiece[]) => save({ pieces });
  const live = room.pieces.map((p, i) => ({ p, i, ex: exhibitOf(s, p) })).filter((x) => x.ex);
  const movePiece = (k: number, d: -1 | 1) => {
    const j = k + d;
    if (j < 0 || j >= live.length) return;
    const pieces = [...room.pieces];
    const a = live[k].i, b = live[j].i;
    [pieces[a], pieces[b]] = [pieces[b], pieces[a]];
    setPieces(pieces);
  };
  const caption = (i: number, c: string) => setPieces(room.pieces.map((p, x) => (x === i ? { ...p, caption: c || undefined } : p)));

  // Peças da coleção: o seletor devolve a lista inteira; o que entrou vai para o fim, o que saiu sai (plaquinhas ficam).
  const refs: PieceRef[] = room.pieces.filter((p): p is MuseumPiece & PieceRef => p.t === 'c' || p.t === 'h').map((p) => ({ t: p.t as 'c' | 'h', id: p.id }));
  const pickRefs = (next: PieceRef[]) => {
    const has = (r: { t: string; id: string }, list: { t: string; id: string }[]) => list.some((x) => x.t === r.t && x.id === r.id);
    const kept = room.pieces.filter((p) => (p.t !== 'c' && p.t !== 'h') || has(p, next));
    const added = next.filter((r) => !has(r, refs)).map((r) => ({ t: r.t, id: r.id }) as MuseumPiece);
    setPieces([...kept, ...added]);
  };
  const moments = useMemo(() => s.events.filter((e) => (e.kind === 'momento' || e.kind === 'marco') && e.title).sort((a, b) => b.at.localeCompare(a.at)), [s.events]);
  const hasMoment = (id: string) => room.pieces.some((p) => p.t === 'm' && p.id === id);
  const toggleMoment = (id: string) => setPieces(hasMoment(id) ? room.pieces.filter((p) => !(p.t === 'm' && p.id === id)) : [...room.pieces, { t: 'm', id }]);

  const addPhoto = async (file?: File | null) => {
    if (!file) return;
    setMsg('');
    let blob: Blob;
    try { blob = await shrink(file, 1600); } catch { setMsg('Não consegui abrir essa imagem. Tente outra foto.'); return; }
    const id = uid();
    if (s.mode === 'supabase') {
      const sb = await import('../data/supabaseAdapter');
      if (!sb.photoStorageReady() || !s.profile) { setMsg('As fotos precisam da migração 0003 no Supabase.'); return; }
      const path = `${s.profile.id}/museu-${id}.jpg`;
      const piece: MuseumPiece = { t: 'f', id, path, image: URL.createObjectURL(blob) };
      actions.saveRoom({ ...room, pieces: [...room.pieces, piece] });
      setMsg('Enviando a foto…');
      try { await sb.uploadPhoto(path, blob); setMsg(''); } catch {
        const cur = getState().rooms.find((r) => r.id === room.id) ?? room;
        actions.saveRoom({ ...cur, pieces: cur.pieces.filter((p) => p.id !== id) });
        setMsg('A foto não subiu (sem conexão?). Tente de novo.');
      }
    } else {
      actions.saveRoom({ ...room, pieces: [...room.pieces, { t: 'f', id, image: await toDataUrl(blob) }] });
    }
  };

  return (
    <RoomView
      index={index}
      title={<Commit label="Nome da sala" className="mroom__titlein" value={room.title} max={80} onCommit={(title) => title && save({ title })} />}
      text={<Commit label="Texto da parede" multiline className="mroom__textin" value={room.text ?? ''} max={2000} placeholder="O texto da parede: o que une estas peças?" onCommit={(text) => save({ text: text || undefined })} />}
      tools={(
        <span className="mroom__tools">
          <button className="icon-btn" aria-label="Subir a sala" disabled={first} onClick={() => onMove(-1)}>↑</button>
          <button className="icon-btn" aria-label="Descer a sala" disabled={last} onClick={() => onMove(1)}>↓</button>
        </span>
      )}
      exhibits={live.length ? live.map(({ p, i, ex }, k) => (
        <ExhibitView key={ex!.key} ex={{ ...ex!, caption: undefined }} link={false}>
          <div className="mx__edit">
            <Commit label="Plaquinha" multiline value={p.caption ?? ''} max={400} placeholder="Escreva a plaquinha (opcional)" onCommit={(c) => caption(i, c)} />
            {p.t === 'c' && !p.caption && s.copies.find((c) => c.id === p.id)?.note && (
              <button className="linklike mx__usenote" onClick={() => caption(i, s.copies.find((c) => c.id === p.id)!.note!.slice(0, 400))}>Usar a nota do exemplar</button>
            )}
            <span className="vedit__tools">
              <button className="icon-btn" aria-label="Para a esquerda" disabled={k === 0} onClick={() => movePiece(k, -1)}>←</button>
              <button className="icon-btn" aria-label="Para a direita" disabled={k === live.length - 1} onClick={() => movePiece(k, 1)}>→</button>
              <button className="icon-btn" aria-label="Tirar da sala" onClick={() => setPieces(room.pieces.filter((_, x) => x !== i))}>×</button>
            </span>
          </div>
        </ExhibitView>
      )) : <p className="muted mroom__empty">Sala vazia. Pendure peças da coleção, momentos da Jornada ou fotos suas.</p>}
    >
      <div className="mroom__add">
        <div className="seg" role="tablist" aria-label="Pendurar">
          <button role="tab" aria-selected={tab === 'colecao'} onClick={() => setTab(tab === 'colecao' ? null : 'colecao')}>Da coleção</button>
          <button role="tab" aria-selected={tab === 'momentos'} onClick={() => setTab(tab === 'momentos' ? null : 'momentos')}>Momentos</button>
          <button role="tab" aria-selected={tab === 'foto'} onClick={() => { setTab('foto'); fileRef.current?.click(); }}>Foto sua</button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { void addPhoto(e.target.files?.[0]); e.target.value = ''; }} />
        {msg && <p className="faint" role="status">{msg}</p>}
        {tab === 'colecao' && <PiecePicker value={refs} onChange={pickRefs} />}
        {tab === 'momentos' && (
          moments.length ? (
            <ul className="mmoments">
              {moments.slice(0, 60).map((e) => {
                const j = s.journeys.find((x) => x.id === e.journeyId);
                const g = j ? s.games[j.gameId] : undefined;
                return (
                  <li key={e.id}>
                    <button className={`mmoment${hasMoment(e.id) ? ' is-on' : ''}`} aria-pressed={hasMoment(e.id)} onClick={() => toggleMoment(e.id)}>
                      {e.image ? <img src={e.image} alt="" loading="lazy" /> : <span className="mmoment__noimg">“</span>}
                      <span><b>{e.title}</b><span className="muted">{g?.title}</span></span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : <p className="muted">Ainda não há momentos na sua Jornada. Eles aparecem aqui quando você guardar um durante uma sessão.</p>
        )}
      </div>
      <div className="mroom__danger">
        <ConfirmButton label="Apagar esta sala" confirm="Toque de novo para apagar" onConfirm={() => actions.deleteRoom(room.id)} />
        <span className="faint">As peças continuam na coleção; fotos enviadas só para esta sala saem junto.</span>
      </div>
    </RoomView>
  );
}
