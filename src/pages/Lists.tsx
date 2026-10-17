/**
 * Listas compartilhadas (Comunidade, entrega H). /listas: as suas, as que você edita junto e as salvas.
 * /lista/:id: a lista, com edição para quem criou ou edita junto. Mais os pedaços que vão na ficha do jogo
 * (Pôr numa lista, Em listas da comunidade) e no perfil.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, navigate, usePath } from '../lib/router';
import { useStore } from '../data/store';
import { listsApi, listUrl, VISIBILITY, VIS_LABEL, type GameList, type GameListFull, type ListDraft, type ListVisibility, type MyLists } from '../data/listsApi';
import { searchGames, type Hit } from '../components/AddGameDialog';
import { CoverArt } from '../components/CoverArt';
import { PersonAvatar, ago } from '../components/Posts';
import { Icon } from '../components/Icon';
import { ReportButton, useMyHandle } from '../components/Moderation';
import type { GameMini, PersonRef } from '../data/communityApi';
import { track } from '../lib/track';

const at = (p: PersonRef) => (p.handle ? `/@${p.handle.toLowerCase()}` : '#');
const errOf = (e: unknown) => (e instanceof Error ? e.message : 'Não deu certo agora.');

/* ------------------------------------------------------------------ */
/* Cartão                                                               */
/* ------------------------------------------------------------------ */
export function ListMosaic({ covers }: { covers: GameList['covers'] }) {
  const four = [...covers.slice(0, 4)];
  return (
    <span className={`glist-mosaic glist-mosaic--${Math.max(1, four.length)}`} aria-hidden="true">
      {four.length ? four.map((c) => <CoverArt key={c.slug} game={{ title: c.title, cover: c.cover ?? '' }} />) : <span className="glist-mosaic__empty"><Icon name="estante" size={22} /></span>}
    </span>
  );
}

export function ListCard({ l, showOwner = true }: { l: GameList; showOwner?: boolean }) {
  return (
    <Link to={`/lista/${l.id}${l.visibility === 'link' && l.key ? `?k=${l.key}` : ''}`} className="glist-card">
      <ListMosaic covers={l.covers} />
      <span className="glist-card__body">
        <b className="glist-card__title">{l.title}</b>
        {l.note ? <small className="glist-card__note">“{l.note}”</small> : l.description ? <small className="muted glist-card__desc">{l.description}</small> : null}
        <small className="faint">
          {showOwner && l.owner.handle ? `@${l.owner.handle}${l.editors.length ? ` e mais ${l.editors.length}` : ''} · ` : ''}
          {l.count} {l.count === 1 ? 'jogo' : 'jogos'}{l.saves ? ` · ${l.saves} ${l.saves === 1 ? 'salvou' : 'salvaram'}` : ''}
          {l.role ? ` · ${VIS_LABEL[l.visibility]}` : ''}
        </small>
      </span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Formulário (criar e editar)                                         */
/* ------------------------------------------------------------------ */
function ListForm({ initial, canVisibility = true, onSaved, onCancel }: { initial?: GameList; canVisibility?: boolean; onSaved: (l: GameList) => void; onCancel?: () => void }) {
  const [d, setD] = useState<ListDraft>({ id: initial?.id, title: initial?.title ?? '', description: initial?.description ?? '', visibility: initial?.visibility ?? 'amigos', ranked: initial?.ranked ?? false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { const l = await listsApi.save(d); if (!initial) track('lista.criou'); onSaved(l); } catch (x) { setErr(errOf(x)); } finally { setBusy(false); }
  };
  return (
    <form className="glist-form card" onSubmit={submit}>
      <label className="field-wrap"><span className="kicker">Nome</span>
        <input className="field" value={d.title} maxLength={80} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="Ex.: Para jogar no sofá com alguém" autoFocus required /></label>
      <label className="field-wrap"><span className="kicker">Sobre a lista <span className="faint">(opcional)</span></span>
        <textarea className="field" rows={2} value={d.description} maxLength={600} onChange={(e) => setD({ ...d, description: e.target.value })} placeholder="O que une esses jogos?" /></label>
      {canVisibility && (
        <fieldset className="glist-form__vis"><legend className="kicker">Quem vê</legend>
          <div className="chips">{VISIBILITY.map((v) => <button type="button" key={v.k} className="chip" aria-pressed={d.visibility === v.k} onClick={() => setD({ ...d, visibility: v.k })}>{v.label}</button>)}</div>
          <small className="faint">{VISIBILITY.find((v) => v.k === d.visibility)?.hint}</small>
        </fieldset>
      )}
      <label className="glist-form__check"><input type="checkbox" checked={d.ranked} onChange={(e) => setD({ ...d, ranked: e.target.checked })} /> Numerar os jogos (a ordem é um ranking)</label>
      {err && <p className="awards__error" role="alert">{err}</p>}
      <div className="glist-form__acts">
        {onCancel && <button type="button" className="btn quiet sm" onClick={onCancel}>Cancelar</button>}
        <button className="btn primary sm" disabled={busy || d.title.trim().length < 2}>{initial ? 'Salvar' : 'Criar lista'}</button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* /listas                                                              */
/* ------------------------------------------------------------------ */
type Tab = 'minhas' | 'comigo' | 'salvas';
export function ListsPage() {
  const mode = useStore((s) => s.mode);
  const signed = useStore((s) => !!s.profile);
  const [tab, setTab] = useState<Tab>(() => ((location.hash.slice(1) as Tab) || 'minhas'));
  const [data, setData] = useState<MyLists | null>(null);
  const [err, setErr] = useState('');
  const [creating, setCreating] = useState(false);
  useEffect(() => { document.title = 'Listas · WinnerZ'; }, []);
  useEffect(() => {
    if (mode === 'supabase' && !signed) return;
    listsApi.mine().then(setData).catch((e) => { setErr(errOf(e)); setData({ minhas: [], comigo: [], salvas: [] }); });
  }, [mode, signed]);
  if (mode === 'supabase' && !signed) return (
    <main className="page pad narrow"><h1 className="t big">Listas</h1><p className="muted lead">Entre na sua conta para criar listas de jogos e montar junto com amigos.</p><Link className="btn primary" to="/entrar">Entrar</Link></main>
  );
  const pick = (t: Tab) => { setTab(t); history.replaceState(history.state, '', `${location.pathname}#${t}`); };
  const list = data?.[tab] ?? [];
  const EMPTY: Record<Tab, string> = {
    minhas: 'Junte jogos por qualquer motivo: os melhores de uma época, os que você recomenda, os da próxima noite com amigos.',
    comigo: 'Quando um amigo convidar você para editar uma lista junto, ela aparece aqui.',
    salvas: 'Abra a lista de alguém e toque em Salvar para guardar aqui.',
  };
  return (
    <main className="page pad glists">
      <header className="studio__head">
        <Link to="/comunidade" className="back">← Comunidade</Link>
        <h1 className="t big">Listas</h1>
        <p className="muted lead">Listas de jogos para guardar, compartilhar e montar junto com amigos.</p>
      </header>
      {creating && <ListForm onSaved={(l) => navigate(`/lista/${l.id}`)} onCancel={() => setCreating(false)} />}
      <div className="cm-index__bar glists__bar">
        <div className="seg studio__tabs" role="tablist" aria-label="Listas">
          {(['minhas', 'comigo', 'salvas'] as Tab[]).map((t) => <button key={t} role="tab" aria-selected={tab === t} aria-pressed={tab === t} onClick={() => pick(t)}>{t === 'minhas' ? 'Suas' : t === 'comigo' ? 'Com você' : 'Salvas'}{data ? ` (${data[t].length})` : ''}</button>)}
        </div>
        {!creating && <button className="btn primary sm" onClick={() => setCreating(true)}><Icon name="mais" size={16} />Nova lista</button>}
      </div>
      {err && <p className="awards__error" role="alert">{err}</p>}
      {data == null ? <p className="faint">Carregando…</p> : list.length === 0 ? <div className="soc-empty"><p className="muted">{EMPTY[tab]}</p></div>
        : <div className="glist-grid">{list.map((l) => <ListCard key={l.id} l={l} showOwner={tab !== 'minhas'} />)}</div>}
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* /lista/:id                                                           */
/* ------------------------------------------------------------------ */
export function ListPage({ id }: { id: string }) {
  const path = usePath();
  const key = new URLSearchParams(path.split('?')[1] ?? '').get('k');
  const signedOut = useStore((s) => s.mode === 'supabase' && !s.profile);
  const myHandle = useMyHandle();
  const [l, setL] = useState<GameListFull | null>(null);
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState(false);
  const [people, setPeople] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sure, setSure] = useState(false);
  const load = () => listsApi.get(id, key).then((x) => { setL(x); setErr(''); }).catch((e) => setErr(errOf(e)));
  useEffect(() => { void load(); }, [id, key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (l) document.title = `${l.title} · Listas · WinnerZ`; }, [l]);
  if (err && !l) return <main className="page pad narrow"><h1 className="t big">Lista</h1><p className="muted lead">{err}</p>{signedOut && <p><Link className="btn primary" to="/entrar">Entrar</Link></p>}<Link to="/listas">Ver as suas listas</Link></main>;
  if (!l) return <main className="page pad"><p className="faint">Carregando…</p></main>;
  const can = !!l.role;
  const run = async (fn: () => Promise<unknown>, reload = true) => {
    setBusy(true); setErr('');
    try { await fn(); if (reload) await load(); } catch (e) { setErr(errOf(e)); } finally { setBusy(false); }
  };
  const share = async () => {
    try { await navigator.clipboard.writeText(listUrl(l)); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* sem área de transferência */ }
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= l.items.length) return;
    const items = [...l.items]; const [x] = items.splice(from, 1); items.splice(to, 0, x);
    setL({ ...l, items });
    void run(() => listsApi.move(l.id, items.map((i) => i.game.slug)), false);
  };
  const onAdded = (full: GameListFull) => setL(full);
  return (
    <main className="page pad glist">
      <header className="glist__head">
        <Link to="/listas" className="back">← Listas</Link>
        {editing ? <ListForm initial={l} canVisibility={l.role === 'dona'} onSaved={() => { setEditing(false); void load(); }} onCancel={() => setEditing(false)} /> : (
          <>
            <h1 className="t big glist__title">{l.title}</h1>
            {l.description && <p className="lead muted glist__desc">{l.description}</p>}
            <div className="glist__meta">
              <span className="glist__who">
                <Link to={at(l.owner)} className="glist__person"><PersonAvatar p={l.owner} size={26} />@{l.owner.handle}</Link>
                {l.editors.length > 0 && <span className="faint"> com {l.editors.map((e, n) => <span key={e.id}>{n ? ', ' : ''}<Link to={at(e)}>@{e.handle}</Link></span>)}</span>}
              </span>
              <span className="faint">{l.count} {l.count === 1 ? 'jogo' : 'jogos'} · atualizada {ago(l.updatedAt)}{l.saves ? ` · ${l.saves} ${l.saves === 1 ? 'salvou' : 'salvaram'}` : ''}</span>
              {can && <span className="glist__vis"><Icon name={l.visibility === 'privada' ? 'cadeado' : l.visibility === 'link' ? 'link' : l.visibility === 'amigos' ? 'pessoas' : 'olho'} size={13} />{VIS_LABEL[l.visibility]}</span>}
              {l.hidden && <span className="glist__vis glist__vis--mod">Fora do ar pela moderação</span>}
            </div>
            <div className="glist__acts">
              {can && <button className="btn ghost sm" onClick={() => setEditing(true)}><Icon name="caneta" size={15} />Editar</button>}
              {l.role === 'dona' && <button className="btn ghost sm" aria-expanded={people} onClick={() => setPeople((v) => !v)}><Icon name="pessoas" size={15} />Editar junto{l.editors.length ? ` (${l.editors.length})` : ''}</button>}
              {l.visibility !== 'privada' && <button className="btn ghost sm" onClick={() => void share()}><Icon name="link" size={15} />{copied ? 'Link copiado' : 'Copiar link'}</button>}
              {!can && !signedOut && <button className="btn sm" aria-pressed={l.saved} disabled={busy} onClick={() => void run(async () => { const r = await listsApi.bookmark(l.id, !l.saved, key); setL({ ...l, saved: r.saved, saves: r.saves }); }, false)}><Icon name={l.saved ? 'check' : 'desejo'} size={15} />{l.saved ? 'Salva' : 'Salvar'}</button>}
              {l.role === 'edita' && <button className="btn quiet sm" disabled={busy} onClick={() => void run(async () => { const me = l.editors.find((e) => e.handle?.toLowerCase() === (myHandle ?? '').toLowerCase()); if (!me) return; await listsApi.removeEditor(l.id, me); navigate('/listas#comigo'); }, false)}>Sair da lista</button>}
              {!can && l.owner.handle && <ReportButton kind="lista" handle={l.owner.handle} refId={l.id} what="esta lista" snapshot={{ title: l.title, description: l.description }} />}
            </div>
          </>
        )}
      </header>
      {people && l.role === 'dona' && <EditorsPanel l={l} onChange={() => void load()} />}
      {err && <p className="awards__error" role="alert">{err}</p>}
      {can && <AddGame list={l} onAdded={onAdded} />}
      {l.items.length === 0 ? <div className="soc-empty"><p className="muted">{can ? 'A lista está vazia. Procure um jogo acima para começar.' : 'Esta lista ainda não tem jogos.'}</p></div> : (
        <ol className={`glist__items${l.ranked ? ' is-ranked' : ''}`}>
          {l.items.map((it, n) => <ItemRow key={it.game.slug} it={it} n={n} last={n === l.items.length - 1} list={l} can={can} busy={busy} onMove={move}
            onRemove={() => void run(() => listsApi.removeGame(l.id, it.game.slug))}
            onNote={(note) => run(() => listsApi.note(l.id, it.game.slug, note))} />)}
        </ol>
      )}
      {l.role === 'dona' && (
        <div className="glist__danger">
          {l.visibility === 'link' && <button className="linklike" disabled={busy} onClick={() => void run(async () => { const k = await listsApi.newKey(l.id); setL({ ...l, key: k }); navigate(`/lista/${l.id}?k=${k}`, { replace: true, keepScroll: true }); }, false)}>Trocar o link (o antigo para de funcionar)</button>}
          {sure ? <span>Apagar de vez? <button className="btn sm danger" disabled={busy} onClick={() => void run(async () => { await listsApi.remove(l.id); navigate('/listas'); }, false)}>Apagar lista</button> <button className="btn quiet sm" onClick={() => setSure(false)}>Cancelar</button></span>
            : <button className="linklike" onClick={() => setSure(true)}>Apagar lista</button>}
        </div>
      )}
    </main>
  );
}

function ItemRow({ it, n, last, list, can, busy, onMove, onRemove, onNote }: {
  it: GameListFull['items'][number]; n: number; last: boolean; list: GameListFull; can: boolean; busy: boolean;
  onMove: (from: number, to: number) => void; onRemove: () => void; onNote: (note: string) => Promise<void>;
}) {
  const [edit, setEdit] = useState(false);
  const [note, setNote] = useState(it.note);
  return (
    <li className="glist__item">
      {list.ranked && <span className="glist__n t">{n + 1}</span>}
      <Link to={`/jogos/${it.game.slug}`} className="glist__cover"><CoverArt game={{ title: it.game.title, cover: it.game.cover ?? '' }} /></Link>
      <div className="glist__body">
        <Link to={`/jogos/${it.game.slug}`} className="glist__game">{it.game.title}</Link>
        {edit ? (
          <form className="glist__noteform" onSubmit={(e) => { e.preventDefault(); void onNote(note).then(() => setEdit(false)); }}>
            <textarea className="field" rows={2} maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Por que este jogo está aqui?" autoFocus />
            <div><button type="button" className="btn quiet sm" onClick={() => { setNote(it.note); setEdit(false); }}>Cancelar</button><button className="btn primary sm" disabled={busy}>Salvar nota</button></div>
          </form>
        ) : it.note ? <p className="glist__note">{it.note}</p> : null}
        {it.addedBy && <small className="faint">Pôs aqui: <Link to={at(it.addedBy)}>@{it.addedBy.handle}</Link></small>}
        {can && !edit && (
          <div className="glist__itemacts">
            <button className="cm-link" onClick={() => setEdit(true)}><Icon name="caneta" size={13} />{it.note ? 'Editar nota' : 'Escrever nota'}</button>
            <button className="cm-link" disabled={n === 0 || busy} onClick={() => onMove(n, n - 1)} aria-label={`Subir ${it.game.title}`}><Icon name="subir" size={13} />Subir</button>
            <button className="cm-link" disabled={last || busy} onClick={() => onMove(n, n + 1)} aria-label={`Descer ${it.game.title}`}><Icon name="subir" size={13} style={{ transform: 'rotate(180deg)' }} />Descer</button>
            <button className="cm-link" disabled={busy} onClick={onRemove}><Icon name="fechar" size={13} />Tirar</button>
          </div>
        )}
      </div>
    </li>
  );
}

/** Procura no catálogo (IGDB) e no seu acervo, e põe na lista. */
function AddGame({ list, onAdded }: { list: GameListFull; onAdded: (l: GameListFull) => void }) {
  const games = useStore((s) => s.games);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const t = useRef(0);
  useEffect(() => {
    clearTimeout(t.current);
    if (q.trim().length < 2) { setHits([]); return; }
    t.current = window.setTimeout(() => {
      // Primeiro o que já está no seu acervo, depois o catálogo.
      const n = (x: string) => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const mine: Hit[] = Object.values(games).filter((g) => n(g.title).includes(n(q.trim()))).slice(0, 3)
        .map((g) => ({ slug: g.slug, title: g.title, year: g.year, cover: g.cover, platforms: g.platforms, local: g }));
      searchGames(q.trim(), []).then((r) => r.hits).catch(() => [] as Hit[])
        .then((rest) => setHits([...mine, ...rest.filter((h) => !mine.some((m) => m.slug === h.slug))].slice(0, 7)));
    }, 280);
    return () => clearTimeout(t.current);
  }, [q, games]);
  const have = new Set(list.items.map((i) => i.game.slug));
  const add = async (h: Hit) => {
    setBusy(h.slug); setErr('');
    const g: GameMini = { id: h.slug, slug: h.slug, title: h.title, cover: h.cover || null };
    try { onAdded(await listsApi.add(list.id, g)); setQ(''); track('lista.jogo'); } catch (e) { setErr(errOf(e)); } finally { setBusy(''); }
  };
  return (
    <div className="glist__add">
      <label className="search__field"><Icon name="busca" size={17} /><input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pôr um jogo na lista…" aria-label="Procurar jogo para pôr na lista" /></label>
      {err && <p className="awards__error" role="alert">{err}</p>}
      {hits.length > 0 && (
        <ul className="glist__hits">
          {hits.map((h) => (
            <li key={h.slug}>
              <button className="glist__hit" disabled={!!busy || have.has(h.slug)} onClick={() => void add(h)}>
                <span className="glist__hitcv"><CoverArt game={{ title: h.title, cover: h.cover }} /></span>
                <span><b>{h.title}</b><small className="faint">{[h.year, h.local ? 'no seu acervo' : null].filter(Boolean).join(' · ')}</small></span>
                <span className="glist__hitact">{have.has(h.slug) ? 'Já está' : busy === h.slug ? '…' : <><Icon name="mais" size={14} />Pôr</>}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EditorsPanel({ l, onChange }: { l: GameListFull; onChange: () => void }) {
  const [h, setH] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const add = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await listsApi.addEditor(l.id, h); setH(''); onChange(); } catch (x) { setErr(errOf(x)); } finally { setBusy(false); }
  };
  return (
    <section className="glist__people card" aria-label="Quem edita junto">
      <p className="muted">Amigos que você convidar podem pôr e tirar jogos, escrever notas e mudar a ordem. Só você muda quem vê e apaga a lista.</p>
      <form className="glist__peopleform" onSubmit={add}>
        <input className="field" value={h} onChange={(e) => setH(e.target.value)} placeholder="@ de um amigo" aria-label="@ de um amigo" />
        <button className="btn primary sm" disabled={busy || h.trim().length < 2}>Convidar</button>
      </form>
      {err && <p className="awards__error" role="alert">{err}</p>}
      {l.editors.length > 0 && (
        <ul className="glist__editors">
          {l.editors.map((p) => <li key={p.id}><Link to={at(p)} className="glist__person"><PersonAvatar p={p} size={28} />@{p.handle}</Link><button className="btn quiet sm" disabled={busy} onClick={() => void listsApi.removeEditor(l.id, p).then(onChange).catch((x) => setErr(errOf(x)))}>Tirar</button></li>)}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Na ficha do jogo                                                     */
/* ------------------------------------------------------------------ */
/** "Pôr numa lista": as suas listas (e as que você edita junto), com um toque para pôr ou criar outra. */
export function AddToList({ game }: { game: GameMini }) {
  const signedOut = useStore((s) => s.mode === 'supabase' && !s.profile);
  const [open, setOpen] = useState(false);
  const [mine, setMine] = useState<GameList[] | null>(null);
  const [inList, setInList] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!open || mine) return;
    listsApi.mine().then(async (m) => {
      const all = [...m.minhas, ...m.comigo];
      setMine(all);
      // Quais já têm o jogo (as primeiras 12, para não pesar).
      const got = await Promise.all(all.slice(0, 12).map((l) => listsApi.get(l.id).then((f) => (f.items.some((i) => i.game.slug === game.slug) ? l.id : null)).catch(() => null)));
      setInList(new Set(got.filter(Boolean) as string[]));
    }).catch((e) => { setErr(errOf(e)); setMine([]); });
  }, [open, mine, game.slug]);
  const toggle = async (l: GameList) => {
    setBusy(l.id); setErr('');
    try {
      if (inList.has(l.id)) { await listsApi.removeGame(l.id, game.slug); const s = new Set(inList); s.delete(l.id); setInList(s); }
      else { await listsApi.add(l.id, game); setInList(new Set([...inList, l.id])); track('lista.jogo'); }
    } catch (e) { setErr(errOf(e)); } finally { setBusy(''); }
  };
  const create = async (e: FormEvent) => {
    e.preventDefault(); setBusy('nova'); setErr('');
    try {
      const l = await listsApi.save({ title, description: '', visibility: 'amigos' as ListVisibility, ranked: false });
      await listsApi.add(l.id, game); setMine([{ ...l, count: 1 }, ...(mine ?? [])]); setInList(new Set([...inList, l.id])); setTitle(''); track('lista.criou');
    } catch (x) { setErr(errOf(x)); } finally { setBusy(''); }
  };
  if (signedOut) return null;
  return (
    <div className="addlist">
      <button className="btn quiet sm" aria-expanded={open} onClick={() => setOpen((v) => !v)}><Icon name="estante" size={15} />Pôr numa lista</button>
      {open && (
        <div className="addlist__panel">
          {mine == null ? <p className="faint">Carregando…</p> : (
            <ul className="addlist__list">
              {mine.map((l) => <li key={l.id}><button className="addlist__row" aria-pressed={inList.has(l.id)} disabled={busy === l.id} onClick={() => void toggle(l)}>
                <span className="addlist__check">{inList.has(l.id) && <Icon name="check" size={13} />}</span><span>{l.title}<small className="faint"> · {VIS_LABEL[l.visibility]}</small></span></button></li>)}
            </ul>
          )}
          <form className="addlist__new" onSubmit={create}>
            <input className="field" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="Nova lista…" aria-label="Nome da nova lista" />
            <button className="btn sm" disabled={busy === 'nova' || title.trim().length < 2}>Criar</button>
          </form>
          {err && <p className="awards__error" role="alert">{err}</p>}
          <Link to="/listas" className="faint addlist__all">Ver as suas listas →</Link>
        </div>
      )}
    </div>
  );
}

/** "Em listas da comunidade": listas públicas (e de amigos) que têm o jogo. */
export function GameLists({ slug, title }: { slug: string; title: string }) {
  const [list, setList] = useState<GameList[] | null>(null);
  useEffect(() => { let alive = true; listsApi.withGame(slug, 6).then((l) => alive && setList(l)).catch(() => alive && setList([])); return () => { alive = false; }; }, [slug]);
  if (!list || list.length === 0) return null;
  return (
    <section aria-labelledby="listas-jogo" className="cm-gamesec">
      <div className="sec-head"><h2 id="listas-jogo" className="t sec-title">Em listas da comunidade</h2><Link to="/listas" className="btn ghost sm">Suas listas</Link></div>
      <p className="faint">Listas com {title}, das mais salvas para as menos.</p>
      <div className="glist-grid glist-grid--tight">{list.map((l) => <ListCard key={l.id} l={l} />)}</div>
    </section>
  );
}

/** No perfil: as listas que a pessoa deixou à vista (públicas; de amigos para amigos). */
export function ProfileLists({ handle }: { handle: string }) {
  const [list, setList] = useState<GameList[] | null>(null);
  useEffect(() => { let alive = true; listsApi.of(handle).then((l) => alive && setList(l)).catch(() => alive && setList([])); return () => { alive = false; }; }, [handle]);
  if (!list || list.length === 0) return null;
  return (
    <section className="pp-lists" aria-labelledby="pp-listas">
      <h2 id="pp-listas" className="kicker">Listas</h2>
      <div className="glist-grid glist-grid--tight">{list.slice(0, 6).map((l) => <ListCard key={l.id} l={l} showOwner={false} />)}</div>
    </section>
  );
}
