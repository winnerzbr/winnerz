/**
 * Studio · Álbum: o catálogo da Temporada (álbuns, páginas e figurinhas com a arte), dar pacotes à mão, a fila dos
 * pacotes retidos pelas regras e os pedidos de revisão, com o histórico do que foi feito, e o histórico das trocas.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from '../lib/router';
import { useStore } from '../data/store';
import { canReview } from '../data/fixesApi';
import { artSrc, reloadAlbum, studioAlbumApi, tradeApi, type Trade, type AlbumBook, type AlbumPage, type Catalog, type PackKind, type Sticker, type StudioPack, type StudioView } from '../data/albumApi';
import { RULE_TITLE, signalsLine, TIER_LABEL, TIERS, type Tier } from '../lib/album';
import { ConfirmButton } from '../components/Sheet';
import { StickerView } from '../components/album/StickerView';
import { ensureDefs, num3 } from '../components/album/render';

type Tab = 'catalogo' | 'dar' | StudioView | 'trocas';
const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).replace('.', '') : '');
const at = (h?: string | null) => (h ? `@${h}` : 'alguém');

export function StudioAlbumPage() {
  useStore((s) => s.isAdmin);
  const mode = useStore((s) => s.mode);
  const [tab, setTab] = useState<Tab>('catalogo');
  const [counts, setCounts] = useState<{ retidos: number; revisoes: number } | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => { ensureDefs(); }, []);
  const refreshCounts = useCallback(() => { studioAlbumApi.counts().then(setCounts).catch(() => setCounts(null)); }, []);
  useEffect(() => { if (canReview()) refreshCounts(); }, [mode, refreshCounts]);
  if (!canReview()) return <main className="page pad narrow"><h1 className="t big">Studio</h1><p className="muted lead">Esta área é só da administração do WinnerZ.</p><Link className="btn ghost" to="/">Ir para o início</Link></main>;
  const say = (m: string) => { setErr(''); setMsg(m); };
  const fail = (e: unknown) => { setMsg(''); setErr(e instanceof Error ? e.message : 'Não deu certo agora.'); };
  const T = (k: Tab, label: string) => <button role="tab" aria-selected={tab === k} aria-pressed={tab === k} onClick={() => { setTab(k); setMsg(''); setErr(''); }}>{label}</button>;
  return (
    <main className="page pad studio">
      <header className="studio__head">
        <Link to="/studio" className="faint">← Studio</Link>
        <h1 className="t big">Álbum</h1>
        <p className="muted lead">Catálogo da Temporada, pacotes dados à mão e os pacotes que as regras seguraram.</p>
        {mode === 'demo' && <p className="faint">Na demonstração, tudo fica só neste navegador.</p>}
      </header>
      <div className="seg studio__tabs" role="tablist" aria-label="Seções">
        {T('catalogo', 'Catálogo')}{T('dar', 'Dar pacote')}{T('retidos', `Retidos${counts?.retidos ? ` (${counts.retidos})` : ''}`)}{T('revisoes', `Revisões${counts?.revisoes ? ` (${counts.revisoes})` : ''}`)}{T('historico', 'Histórico')}{T('trocas', 'Trocas')}
      </div>
      {msg && <p className="studio__msg" role="status">{msg}</p>}
      {err && <p className="awards__error" role="alert">{err}</p>}
      {tab === 'catalogo' && <CatalogPanel say={say} fail={fail} />}
      {tab === 'dar' && <GivePanel say={say} fail={fail} />}
      {(tab === 'retidos' || tab === 'revisoes' || tab === 'historico') && <PacksPanel key={tab} view={tab} say={say} fail={fail} onChange={refreshCounts} />}
      {tab === 'trocas' && <TradesPanel fail={fail} />}
    </main>
  );
}

type Say = { say: (m: string) => void; fail: (e: unknown) => void };

/* ---- Catálogo ---- */
function CatalogPanel({ say, fail }: Say) {
  const [cat, setCat] = useState<Catalog | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<Sticker> | null>(null);
  useEffect(() => { studioAlbumApi.catalog().then((c) => { setCat(c); setSel((s) => s ?? c.books[0]?.id ?? null); }).catch(fail); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const apply = async (p: Promise<Catalog>, m: string) => { try { const c = await p; setCat(c); say(m); void reloadAlbum().catch(() => {}); return c; } catch (e) { fail(e); return null; } };
  if (!cat) return <p className="faint">Carregando…</p>;
  const book = cat.books.find((b) => b.id === sel) ?? null;
  const nextNumber = (cat.stickers.reduce((m, s) => Math.max(m, s.number), 0) || 0) + 1;
  const loose = cat.stickers.filter((s) => !s.pageId || !cat.books.some((b) => b.pages.some((p) => p.id === s.pageId)));
  return (
    <div className="sa-grid">
      <aside className="sa-side">
        {cat.books.map((b) => (
          <button key={b.id} className="sa-book" aria-pressed={b.id === sel} onClick={() => setSel(b.id)}>
            <b>{b.title}</b><small>{b.published ? 'Publicado' : 'Rascunho'} · {b.pages.length} {b.pages.length === 1 ? 'página' : 'páginas'} · {cat.stickers.filter((s) => b.pages.some((p) => p.id === s.pageId)).length} figurinhas</small>
          </button>
        ))}
        <button className="btn ghost" onClick={async () => { const c = await apply(studioAlbumApi.saveBook({ slug: `album-${Date.now().toString(36)}`, title: 'Novo álbum', subtitle: 'Temporada 1', season: 1, position: cat.books.length + 1, published: false }), 'Álbum criado (como rascunho).'); if (c) setSel(c.books[c.books.length - 1]?.id ?? null); }}>Novo álbum</button>
        <p className="faint" style={{ fontSize: 13 }}>{cat.stickers.length} figurinhas no catálogo. Só os álbuns publicados entram nos pacotes.</p>
      </aside>
      <div className="sa-pages">
        {book ? <BookForm key={book.id} book={book} onSave={(b, m) => apply(studioAlbumApi.saveBook(b), m)} onDelete={() => apply(studioAlbumApi.deleteBook(book.id), 'Álbum apagado.').then(() => setSel(null))} fail={fail} /> : <p className="muted">Crie um álbum para começar.</p>}
        {book && [...book.pages].sort((a, b) => a.position - b.position).map((p) => (
          <PageCard key={p.id} book={book} page={p} stickers={cat.stickers.filter((s) => s.pageId === p.id).sort((a, b) => a.slot - b.slot)} owned={cat.owned}
            onSave={(pg, m) => apply(studioAlbumApi.savePage(book.id, pg), m)} onDelete={() => apply(studioAlbumApi.deletePage(p.id), 'Página apagada. As figurinhas dela ficaram sem página.')}
            onAdd={() => setEditing({ number: nextNumber, tier: 'comum', pageId: p.id, slot: cat.stickers.filter((s) => s.pageId === p.id).length + 1, season: book.season, active: true, name: '', credit: '' })} onEdit={(s) => setEditing(s)} fail={fail} />
        ))}
        {book && <button className="btn ghost" onClick={() => apply(studioAlbumApi.savePage(book.id, { title: 'Nova página', position: book.pages.length + 1 }), 'Página criada.')}>Nova página</button>}
        {loose.length > 0 && (
          <section className="sa-page"><div className="sa-page__head"><b>Sem página</b><span className="faint">Não entram nos pacotes até ganhar uma página.</span></div>
            <div className="sa-stickers">{loose.map((s) => <div className="sa-sticker" key={s.id}><StickerView s={s} onOpen={() => setEditing(s)} /><small>{num3(s.number)} · {s.name}</small></div>)}</div></section>
        )}
        {editing && <StickerForm key={editing.id ?? 'novo'} s={editing} books={cat.books} owned={!!(editing.id && cat.owned[editing.id])} fail={fail}
          onClose={() => setEditing(null)} onSave={async (s) => { const c = await apply(studioAlbumApi.saveSticker(s), s.id ? 'Figurinha salva.' : 'Figurinha criada.'); if (c) setEditing(null); }}
          onDelete={editing.id ? async () => { const c = await apply(studioAlbumApi.deleteSticker(editing.id!), cat.owned[editing.id!] ? 'Figurinha tirada dos pacotes (quem tem continua tendo).' : 'Figurinha apagada.'); if (c) setEditing(null); } : undefined} />}
      </div>
    </div>
  );
}

function ArtField({ label, value, onChange, fail }: { label: string; value: string | null | undefined; onChange: (v: string | null) => void; fail: (e: unknown) => void }) {
  const [busy, setBusy] = useState(false);
  const src = artSrc(value);
  return (
    <div className="sa-art">
      {src ? <img src={src} alt="" /> : null}
      <label className="btn ghost sm" style={{ cursor: 'pointer' }}>{busy ? 'Enviando…' : src ? `Trocar ${label}` : `Enviar ${label}`}
        <input type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; setBusy(true); try { onChange(await studioAlbumApi.upload(f)); } catch (er) { fail(er); } finally { setBusy(false); } }} />
      </label>
      {src && <button className="btn quiet sm" onClick={() => onChange(null)}>Tirar</button>}
    </div>
  );
}

function BookForm({ book, onSave, onDelete, fail }: { book: AlbumBook; onSave: (b: Partial<AlbumBook>, m: string) => Promise<unknown>; onDelete: () => void; fail: (e: unknown) => void }) {
  const [d, setD] = useState({ title: book.title, subtitle: book.subtitle, slug: book.slug, season: book.season, position: book.position });
  return (
    <section className="sa-form">
      <h3>{book.title} <span className="faint" style={{ fontSize: 14 }}>{book.published ? '· publicado' : '· rascunho'}</span></h3>
      <div className="sa-row">
        <label>Título<input className="field" maxLength={60} value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} /></label>
        <label>Linha de cima<input className="field" maxLength={60} value={d.subtitle} onChange={(e) => setD({ ...d, subtitle: e.target.value })} /></label>
      </div>
      <div className="sa-row">
        <label>Endereço (/album/…)<input className="field" maxLength={40} value={d.slug} onChange={(e) => setD({ ...d, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} /></label>
        <label className="sa-short">Temporada<input className="field" type="number" min={1} max={99} value={d.season} onChange={(e) => setD({ ...d, season: Number(e.target.value) || 1 })} /></label>
        <label className="sa-short">Ordem<input className="field" type="number" value={d.position} onChange={(e) => setD({ ...d, position: Number(e.target.value) || 0 })} /></label>
      </div>
      <ArtField label="capa" value={book.cover} onChange={(v) => void onSave({ id: book.id, cover: v }, 'Capa trocada.')} fail={fail} />
      <div className="sa-row">
        <button className="btn now sm" onClick={() => void onSave({ id: book.id, ...d }, 'Álbum salvo.')}>Salvar</button>
        <button className="btn ghost sm" onClick={() => void onSave({ id: book.id, published: !book.published }, book.published ? 'Álbum voltou a ser rascunho.' : 'Álbum publicado: já entra nos pacotes.')}>{book.published ? 'Despublicar' : 'Publicar'}</button>
        <ConfirmButton label="Apagar álbum" confirm="Apagar mesmo?" onConfirm={onDelete} />
      </div>
    </section>
  );
}

function PageCard({ page, stickers, owned, onSave, onDelete, onAdd, onEdit, fail }: { book: AlbumBook; page: AlbumPage; stickers: Sticker[]; owned: Record<string, number>; onSave: (p: Partial<AlbumPage>, m: string) => Promise<unknown>; onDelete: () => void; onAdd: () => void; onEdit: (s: Sticker) => void; fail: (e: unknown) => void }) {
  const [d, setD] = useState({ kicker: page.kicker, title: page.title, body: page.body, position: page.position, legendary: page.legendary });
  const dirty = d.kicker !== page.kicker || d.title !== page.title || d.body !== page.body || d.position !== page.position || d.legendary !== page.legendary;
  return (
    <section className="sa-page">
      <div className="sa-page__head"><b>{page.title}</b><span className="faint">{stickers.length} {stickers.length === 1 ? 'figurinha' : 'figurinhas'}{page.legendary ? ' · página lendária' : ''}</span></div>
      <div className="sa-row">
        <label className="sa-short">Ordem<input className="field" type="number" value={d.position} onChange={(e) => setD({ ...d, position: Number(e.target.value) || 0 })} /></label>
        <label>Chamada<input className="field" maxLength={40} value={d.kicker} placeholder="Capítulo 01" onChange={(e) => setD({ ...d, kicker: e.target.value })} /></label>
        <label>Título<input className="field" maxLength={60} value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} /></label>
      </div>
      <div className="sa-row">
        <label>Texto (opcional)<input className="field" maxLength={160} value={d.body} onChange={(e) => setD({ ...d, body: e.target.value })} /></label>
        <label className="sa-short" style={{ alignSelf: 'center' }}><span><input type="checkbox" checked={d.legendary} onChange={(e) => setD({ ...d, legendary: e.target.checked })} /> Lendária</span></label>
      </div>
      <ArtField label="faixa do topo" value={page.banner} onChange={(v) => void onSave({ id: page.id, banner: v }, 'Faixa trocada.')} fail={fail} />
      <div className="sa-row">
        {dirty && <button className="btn now sm" onClick={() => void onSave({ id: page.id, ...d }, 'Página salva.')}>Salvar página</button>}
        <ConfirmButton label="Apagar página" confirm="Apagar mesmo?" onConfirm={onDelete} />
      </div>
      <div className="sa-stickers">
        {stickers.map((s) => <div className="sa-sticker" key={s.id}><StickerView s={s} onOpen={() => onEdit(s)} /><small>{num3(s.number)} · {TIER_LABEL[s.tier]}{owned[s.id] ? ` · ${owned[s.id]} ${owned[s.id] === 1 ? 'pessoa tem' : 'pessoas têm'}` : ''}{s.active ? '' : ' · fora dos pacotes'}</small></div>)}
        <button className="sa-add" onClick={onAdd}>+ Figurinha</button>
      </div>
    </section>
  );
}

function StickerForm({ s, books, owned, onSave, onDelete, onClose, fail }: { s: Partial<Sticker>; books: AlbumBook[]; owned: boolean; onSave: (s: Partial<Sticker>) => void; onDelete?: () => void; onClose: () => void; fail: (e: unknown) => void }) {
  const [d, setD] = useState<Partial<Sticker>>(s);
  const preview: Sticker = { id: d.id ?? 'preview', season: d.season ?? 1, number: d.number ?? 0, name: d.name || 'Nome da figurinha', tier: (d.tier ?? 'comum') as Tier, art: d.art ?? null, credit: d.credit ?? '', pageId: d.pageId ?? null, slot: d.slot ?? 0, active: d.active ?? true };
  const pages = useMemo(() => books.flatMap((b) => [...b.pages].sort((a, c) => a.position - c.position).map((p) => ({ id: p.id, label: `${b.title} · ${p.title}` }))), [books]);
  return (
    <section className="sa-form" aria-label="Figurinha">
      <h3>{s.id ? `Figurinha ${num3(s.number ?? 0)}` : 'Nova figurinha'}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,180px) minmax(0,1fr)', gap: 18, alignItems: 'start' }}>
        <StickerView s={preview} />
        <div style={{ display: 'grid', gap: 12 }}>
          <div className="sa-row">
            <label className="sa-short">Número<input className="field" type="number" min={1} max={999} value={d.number ?? ''} onChange={(e) => setD({ ...d, number: Number(e.target.value) || undefined })} /></label>
            <label>Nome<input className="field" maxLength={40} value={d.name ?? ''} onChange={(e) => setD({ ...d, name: e.target.value })} /></label>
          </div>
          <div className="sa-row">
            <label>Raridade<select className="field" value={d.tier} onChange={(e) => setD({ ...d, tier: e.target.value as Tier })}>{TIERS.map((t) => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}</select></label>
            <label>Página<select className="field" value={d.pageId ?? ''} onChange={(e) => setD({ ...d, pageId: e.target.value || null })}><option value="">Sem página</option>{pages.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
            <label className="sa-short">Posição<input className="field" type="number" min={0} max={99} value={d.slot ?? 0} onChange={(e) => setD({ ...d, slot: Number(e.target.value) || 0 })} /></label>
          </div>
          <div className="sa-row"><label>Crédito da arte<input className="field" maxLength={80} value={d.credit ?? ''} placeholder="Arte: …" onChange={(e) => setD({ ...d, credit: e.target.value })} /></label></div>
          <ArtField label="arte" value={d.art} onChange={(v) => setD({ ...d, art: v })} fail={fail} />
          <label className="faint" style={{ fontSize: 13 }}><input type="checkbox" checked={d.active ?? true} onChange={(e) => setD({ ...d, active: e.target.checked })} /> Entra nos pacotes</label>
          <p className="faint" style={{ fontSize: 13, margin: 0 }}>A arte ideal tem proporção 5:7 (por exemplo 1000 × 1400). O nome e o número ficam por cima, como texto.</p>
          <div className="sa-row">
            <button className="btn now sm" disabled={!d.name || (d.name?.trim().length ?? 0) < 2 || !d.number} onClick={() => onSave(d)}>Salvar</button>
            <button className="btn quiet sm" onClick={onClose}>Cancelar</button>
            {onDelete && <ConfirmButton label={owned ? 'Tirar dos pacotes' : 'Apagar'} confirm={owned ? 'Já tem gente com ela. Tirar dos pacotes?' : 'Apagar mesmo?'} onConfirm={onDelete} />}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---- Dar pacote ---- */
function GivePanel({ say, fail }: Say) {
  const [handle, setHandle] = useState('');
  const [qty, setQty] = useState(1);
  const [kind, setKind] = useState<PackKind>('onix');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try { await studioAlbumApi.give(handle, qty, kind, reason); say(`${qty === 1 ? 'Pacote dado' : `${qty} pacotes dados`} para @${handle.replace(/^@/, '')}. A pessoa recebe um aviso. Dá para desfazer no Histórico enquanto ninguém abrir.`); setReason(''); }
    catch (e) { fail(e); } finally { setBusy(false); }
  };
  return (
    <section className="sa-form" style={{ maxWidth: 620 }}>
      <h3>Dar pacote</h3>
      <p className="muted" style={{ margin: 0 }}>Para quando um pacote não veio por erro técnico, ou quando uma regra segurou um caso justo (um jogo de 100 horas zerado de verdade, por exemplo).</p>
      <div className="sa-row">
        <label>Para quem (@)<input className="field" value={handle} placeholder="@pessoa" onChange={(e) => setHandle(e.target.value)} /></label>
        <label className="sa-short">Quantos<input className="field" type="number" min={1} max={20} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} /></label>
      </div>
      <div className="seg" role="group" aria-label="Tipo"><button aria-pressed={kind === 'onix'} onClick={() => setKind('onix')}>Ônix (padrão)</button><button aria-pressed={kind === 'prisma'} onClick={() => setKind('prisma')}>Prisma (especial)</button></div>
      <label className="sa-row" style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--muted)' }}>Motivo (a pessoa vê)<textarea className="field" maxLength={200} value={reason} placeholder="Ex.: o pacote de Elden Ring não veio por um erro nosso." onChange={(e) => setReason(e.target.value)} /></label>
      <div className="sa-row"><button className="btn now" disabled={busy || !handle.trim() || reason.trim().length < 3} onClick={() => void go()}>{busy ? 'Dando…' : qty === 1 ? 'Dar pacote' : `Dar ${qty} pacotes`}</button></div>
    </section>
  );
}

/* ---- Retidos, revisões e histórico ---- */
const STATE_LABEL: Record<string, string> = { retido: 'retido', fechado: 'fechado', aberto: 'aberto', desfeito: 'desfeito', negado: 'negado' };
function PacksPanel({ view, say, fail, onChange }: Say & { view: StudioView; onChange: () => void }) {
  const [list, setList] = useState<StudioPack[] | null>(null);
  const load = useCallback(() => { studioAlbumApi.packs(view).then(setList).catch(fail); }, [view]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(load, [load]);
  if (!list) return <p className="faint">Carregando…</p>;
  if (!list.length) return <div className="studio__empty"><b>{view === 'retidos' ? 'Nenhum pacote retido.' : view === 'revisoes' ? 'Nenhum pedido de revisão.' : 'Nada por aqui ainda.'}</b><p className="muted">{view === 'historico' ? 'Os pacotes dados à mão e as decisões sobre retidos aparecem aqui.' : 'Quando uma regra segurar um pacote, ele aparece aqui com o motivo.'}</p></div>;
  const after = (m: string) => { say(m); load(); onChange(); void reloadAlbum().catch(() => {}); };
  return <ul className="sa-packs">{list.map((p) => <PackItem key={p.id} p={p} view={view} after={after} fail={fail} />)}</ul>;
}
function PackItem({ p, view, after, fail }: { p: StudioPack; view: StudioView; after: (m: string) => void; fail: (e: unknown) => void }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const act = async (f: () => Promise<void>, m: string) => { setBusy(true); try { await f(); after(m); } catch (e) { fail(e); } finally { setBusy(false); } };
  const held = p.state === 'retido' || p.state === 'negado';
  return (
    <li className="sa-pack">
      <p><b>{at(p.person?.handle)}</b> · {p.kind === 'prisma' ? 'Prisma' : 'Ônix'} · {p.origin === 'studio' ? `dado por ${at(p.grantedBy?.handle)}` : p.origin === 'memoria' ? 'memória' : p.game ? `zerou ${p.game.title}` : 'Jornada'} · {STATE_LABEL[p.state]} · {when(p.createdAt)}</p>
      {p.rule && <p><b>{RULE_TITLE[p.rule]}</b> <span className="sa-signals">{signalsLine(p.signals ?? {})}</span></p>}
      {p.reason && <p className="muted">Motivo: {p.reason}</p>}
      {p.review && <p className="muted">Pedido de revisão ({when(p.review.createdAt)}): “{p.review.message}”{p.review.answer ? ` · Resposta: ${p.review.answer}` : ''}</p>}
      {p.decidedBy && <p className="faint" style={{ fontSize: 13 }}>Decidido por {at(p.decidedBy.handle)} em {when(p.decidedAt)}{p.note ? `: ${p.note}` : ''}</p>}
      {held && view !== 'historico' && (
        <div className="sa-pack__acts">
          <input className="field" style={{ flex: '1 1 220px' }} maxLength={300} value={note} placeholder="Nota para a pessoa (obrigatória para negar)" onChange={(e) => setNote(e.target.value)} />
          <button className="btn now sm" disabled={busy} onClick={() => void act(() => studioAlbumApi.decide(p.id, true, note), `Pacote liberado para ${at(p.person?.handle)}.`)}>Liberar</button>
          {p.state === 'retido' && <button className="btn ghost sm" disabled={busy || note.trim().length < 3} onClick={() => void act(() => studioAlbumApi.decide(p.id, false, note), 'Pacote negado. A pessoa recebe a nota.')}>Negar</button>}
        </div>
      )}
      {view === 'historico' && p.origin === 'studio' && p.state === 'fechado' && (
        <div className="sa-pack__acts"><ConfirmButton label="Desfazer" confirm="Desfazer este pacote?" onConfirm={() => void act(() => studioAlbumApi.undo(p.id), 'Pacote desfeito.')} /></div>
      )}
    </li>
  );
}

/* ---- Trocas (só consulta) ---- */
const TRADE_STATE: Record<Trade['state'], string> = { aberta: 'Em aberto', aceita: 'Feita', recusada: 'Recusada', cancelada: 'Cancelada', expirada: 'Expirou', falhou: 'Não deu certo' };
function TradesPanel({ fail }: { fail: (e: unknown) => void }) {
  const [list, setList] = useState<Trade[] | null>(null);
  const [cat, setCat] = useState<Record<string, Sticker>>({});
  useEffect(() => {
    tradeApi.studio().then(setList).catch((e) => { fail(e); setList([]); });
    studioAlbumApi.catalog().then((c) => setCat(Object.fromEntries(c.stickers.map((s) => [s.id, s])))).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!list) return <p className="faint">Carregando…</p>;
  if (!list.length) return <div className="studio__empty"><b>Nenhuma troca ainda.</b><p className="muted">As propostas entre as pessoas aparecem aqui, com o que cada lado deu e o resultado.</p></div>;
  const names = (ids: string[]) => ids.map((id) => (cat[id] ? `${num3(cat[id].number)} ${cat[id].name}` : '?')).join(', ');
  return (
    <ul className="sa-packs">{list.map((t) => (
      <li key={t.id} className="sa-pack">
        <p><b>{at(t.from?.handle)}</b> → <b>{at(t.to?.handle)}</b> · {TRADE_STATE[t.state]} · {when(t.createdAt)}{t.decidedAt ? ` · respondida ${when(t.decidedAt)}` : ''}</p>
        <p className="sa-signals">{at(t.from?.handle)} dá: {names(t.give)}</p>
        <p className="sa-signals">{at(t.to?.handle)} dá: {names(t.take)}</p>
        {t.message && <p className="muted">“{t.message}”</p>}
      </li>))}</ul>
  );
}
