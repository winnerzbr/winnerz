/**
 * Studio → Álbum → Criador (migração 0092): montar as figurinhas e os álbuns arrastando.
 *
 *  · Biblioteca: as artes originais (arraste os arquivos do computador para cá; vão reduzidas para 2400 px).
 *  · Mesa: arraste uma arte para a moldura da raridade (prata, ouro, ametista ou holográfica). A figurinha nasce
 *    nessa raridade; dá para trocar depois soltando a arte em outra moldura. Na mesa, arraste a pintura dentro da
 *    moldura para enquadrar e use o zoom (ou a rodinha do mouse). Nome, número, seção, posição e crédito ao lado.
 *  · Quadro do álbum: capa (também enquadrável), título, figurinhas por página e as seções, com as figurinhas em
 *    ordem. Arraste figurinhas entre seções e posições; solte uma arte numa seção para criar a figurinha ali.
 * Ao salvar, o navegador gera o recorte 5:7 (1000 × 1400) a partir da original e envia; a original e o
 * enquadramento ficam guardados para reenquadrar quando quiser.
 * Sem mouse (celular): toque numa arte para escolher e depois toque na moldura ou no "+" da seção.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import { artSrc, miniPath, reloadAlbum, studioAlbumApi, type AlbumArt, type AlbumBook, type AlbumPage, type Catalog, type Sticker } from '../../data/albumApi';
import { TIER_LABEL, TIER_MATERIAL, TIERS, type Tier } from '../../lib/album';
import { clampFraming, clampPos, COVER_ASPECT, coversAll, cropRect, FRAMING_INICIAL, leafMode, OVERSCAN, pan, placeInBox, sectionLeaves, STICKER_ASPECT, STICKER_ASPECT_H, ZOOM_MAX, ZOOM_MIN, type Framing, type Pos } from '../../lib/enquadrar';
import { bookLeaves, leafHTML } from './AlbumBook';
import type { StickerOrder } from '../../data/albumApi';
import { coverHTML, ensureDefs, num3, stickerHTML } from './render';
import { StickerView } from './StickerView';
import { ConfirmButton } from '../Sheet';

type Say = { say: (m: string) => void; fail: (e: unknown) => void };
interface Draft { id?: string; number: number; name: string; tier: Tier; pageId: string | null; slot: number; credit: string; active: boolean; season: number; art: string | null; source: string | null; framing: Framing; changed: boolean; landscape: boolean; leaf: number | null; pos: Pos | null }
/** Onde a figurinha nova entra: a página da seção e o lugar nela (quando a arte é solta numa página). */
interface Lugar { leaf: number | null; pos: Pos | null }

const T_ART = 'application/x-wz-art';
const T_STICKER = 'application/x-wz-sticker';
const CREDIT_KEY = 'wz.criador.credito';
const lastCredit = () => { try { return localStorage.getItem(CREDIT_KEY) ?? ''; } catch { return ''; } };
const saveCredit = (c: string) => { try { localStorage.setItem(CREDIT_KEY, c); } catch { /* sem armazenamento */ } };
/** Nome de arquivo de câmera não vira nome de figurinha. */
const nomeDaArte = (n: string) => (/^(img|dsc|pxl|mvimg|whatsapp|screenshot|captura|foto|image|photo)[\s_-]?\d|^[\d\s_()[\].-]+$|^\d{6,}/i.test(n.trim()) ? '' : n.replace(/[_-]+/g, ' ').trim().slice(0, 40));
const hasType = (e: DragEvent, t: string) => Array.from(e.dataTransfer?.types ?? []).includes(t);
const isFiles = (e: DragEvent) => hasType(e, 'Files');

/** Gera o recorte final a partir da original (no navegador) e devolve o JPEG. */
async function renderCrop(src: string, aspect: number, f: Framing, outW: number): Promise<Blob> {
  const url = artSrc(src)!;
  const img = await new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = () => bad(new Error('Não consegui abrir a arte original para recortar.')); i.src = url; });
  const r = cropRect(img.naturalWidth, img.naturalHeight, aspect, f);
  const c = document.createElement('canvas');
  c.width = outW; c.height = Math.round(outW / aspect);
  const g = c.getContext('2d')!;
  g.imageSmoothingQuality = 'high';
  const W = img.naturalWidth, H = img.naturalHeight;
  if (!coversAll(W, H, r)) {
    // Sobra além da pintura: preenche com a própria pintura, ampliada e desfocada (como no Criador).
    const k = Math.max(c.width / W, c.height / H) * 1.15;
    g.filter = `blur(${Math.round(c.width / 28)}px) brightness(0.72) saturate(1.1)`;
    g.drawImage(img, (c.width - W * k) / 2, (c.height - H * k) / 2, W * k, H * k);
    g.filter = 'none';
  }
  // A pintura no lugar escolhido (o recorte pode começar fora dela).
  const sx = c.width / r.sw, sy = c.height / r.sh;
  g.drawImage(img, -r.sx * sx, -r.sy * sy, W * sx, H * sy);
  return await new Promise<Blob>((ok, bad) => c.toBlob((b) => (b ? ok(b) : bad(new Error('Não consegui gerar o recorte.'))), 'image/jpeg', 0.9));
}

/* ================================================================================================================ */
export function Criador({ say, fail }: Say) {
  const [cat, setCat] = useState<Catalog | null>(null);
  const [arts, setArts] = useState<AlbumArt[]>([]);
  const [bookId, setBookId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [picked, setPicked] = useState<AlbumArt | null>(null);
  const [dragging, setDragging] = useState<'art' | 'sticker' | null>(null);
  const [saving, setSaving] = useState(false);
  /** Formato das figurinhas novas (a escolha da mesa). */
  const [deitada, setDeitada] = useState(false);
  const mesa = useRef<HTMLElement>(null);
  /** A seção da última figurinha salva: a próxima nasce nela. */
  const lastPage = useRef<string | null>(null);

  useEffect(() => { ensureDefs(); }, []);
  useEffect(() => {
    studioAlbumApi.catalog().then((c) => { setCat(c); setBookId((b) => b ?? c.books[0]?.id ?? null); }).catch(fail);
    studioAlbumApi.arts().then(setArts).catch(fail);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = useCallback(async (p: Promise<Catalog>, m?: string) => {
    try { const c = await p; setCat(c); if (m) say(m); void reloadAlbum().catch(() => {}); return c; } catch (e) { fail(e); return null; }
  }, [say, fail]);

  const book = cat?.books.find((b) => b.id === bookId) ?? null;
  const pages = useMemo(() => (book ? [...book.pages].sort((a, b) => a.position - b.position) : []), [book]);
  const pageOf = useMemo(() => Object.fromEntries((cat?.books ?? []).flatMap((b) => b.pages.map((p) => [p.id, { book: b, page: p }]))), [cat]);
  /** Quantas figurinhas, capas e faixas usam cada arte original. */
  const usage = useMemo(() => {
    const u: Record<string, number> = {};
    for (const s of cat?.stickers ?? []) { const k = s.source ?? s.art; if (k) u[k] = (u[k] ?? 0) + 1; }
    for (const b of cat?.books ?? []) { if (b.coverSource) u[b.coverSource] = (u[b.coverSource] ?? 0) + 1; for (const p of b.pages) if (p.banner) u[p.banner] = (u[p.banner] ?? 0) + 1; }
    return u;
  }, [cat]);
  const nextNumber = useCallback((season: number) => (cat?.stickers.filter((s) => s.season === season).reduce((m, s) => Math.max(m, s.number), 0) ?? 0) + 1, [cat]);
  const artByPath = useMemo(() => Object.fromEntries(arts.map((a) => [a.path, a])), [arts]);

  /* ---- começar uma figurinha ---- */
  const busyDraft = () => { if (draft?.changed) { fail(new Error('Salve ou cancele a figurinha que está na mesa antes de começar outra.')); mesa.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return true; } return false; };
  const startFromArt = (a: AlbumArt, tier: Tier, pageId?: string | null, lugar?: Lugar) => {
    if (busyDraft()) return;
    const season = book?.season ?? 1;
    const pg = pageId !== undefined ? pageId : (lastPage.current && pages.some((p) => p.id === lastPage.current) ? lastPage.current : pages.find((p) => !p.legendary)?.id ?? pages[0]?.id ?? null);
    const slot = (cat?.stickers.filter((s) => s.pageId === pg).reduce((m, s) => Math.max(m, s.slot), 0) ?? 0) + 1;
    const land = lugar ? a.width > a.height * 1.15 : deitada;
    setDraft({ number: nextNumber(season), name: nomeDaArte(a.name), tier, pageId: pg, slot, credit: lastCredit(), active: true, season, art: null, source: a.path, framing: { ...FRAMING_INICIAL }, changed: true, landscape: land, leaf: lugar?.leaf ?? null, pos: lugar?.pos ?? null });
    setPicked(null);
    mesa.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const edit = (s: Sticker) => {
    if (busyDraft()) return;
    setDraft({ id: s.id, number: s.number, name: s.name, tier: s.tier, pageId: s.pageId, slot: s.slot, credit: s.credit, active: s.active, season: s.season, art: s.art, source: s.source ?? s.art, framing: s.framing ?? { ...FRAMING_INICIAL }, changed: false, landscape: !!s.landscape, leaf: s.leaf ?? null, pos: s.pos ?? null });
    mesa.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const artFromDrop = (e: DragEvent): AlbumArt | null => { const id = e.dataTransfer.getData(T_ART); return arts.find((a) => a.id === id) ?? null; };

  /* ---- enviar arquivos ---- */
  const [sending, setSending] = useState<{ done: number; total: number } | null>(null);
  const upload = async (files: File[]): Promise<AlbumArt[]> => {
    const imgs = files.filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type));
    if (!imgs.length) { fail(new Error('Solte imagens JPG, PNG ou WebP.')); return []; }
    const out: AlbumArt[] = [];
    setSending({ done: 0, total: imgs.length });
    for (const f of imgs) {
      try { const a = await studioAlbumApi.addArt(f); out.push(a); setArts((l) => [...l, a]); } catch (e) { fail(e); }
      setSending((s) => (s ? { ...s, done: s.done + 1 } : s));
    }
    setSending(null);
    if (out.length) say(out.length === 1 ? 'Arte adicionada à biblioteca.' : `${out.length} artes adicionadas à biblioteca.`);
    return out;
  };

  /* ---- salvar a figurinha da mesa ---- */
  const salvar = async (andNext = false) => {
    if (!draft) return;
    if (draft.name.trim().length < 2) { fail(new Error('Dê um nome à figurinha (pelo menos 2 letras).')); return; }
    if (!draft.number || draft.number < 1 || draft.number > 999) { fail(new Error('O número vai de 1 a 999.')); return; }
    setSaving(true);
    try {
      let art = draft.art;
      if (draft.source && (draft.changed || !art)) art = await studioAlbumApi.uploadCrop(await renderCrop(draft.source, draft.landscape ? STICKER_ASPECT_H : STICKER_ASPECT, draft.framing, draft.landscape ? 1400 : 1000));
      saveCredit(draft.credit);
      lastPage.current = draft.pageId;
      const c = await apply(studioAlbumApi.saveSticker({ id: draft.id, number: draft.number, name: draft.name.trim(), tier: draft.tier, pageId: draft.pageId, slot: draft.slot, credit: draft.credit.trim(), active: draft.active, season: draft.season, art, source: draft.source, framing: draft.framing, landscape: draft.landscape, ...(draft.id ? {} : { leaf: draft.leaf, pos: draft.pos }) }),
        draft.id ? `Figurinha ${num3(draft.number)} salva.` : `Figurinha ${num3(draft.number)} criada.`);
      if (c) {
        setDraft(null);
        if (andNext) {
          const used = new Set(c.stickers.map((s) => s.source ?? s.art));
          const next = arts.find((a) => !used.has(a.path));
          if (next) setPicked(next);
        }
      }
    } catch (e) { fail(e); } finally { setSaving(false); }
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && draft) { e.preventDefault(); void salvar(); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  if (!cat) return <p className="faint">Carregando…</p>;
  const draftPage = draft?.pageId ? pageOf[draft.pageId]?.page : null;

  return (
    <div className={`cr${dragging ? ` cr--drag-${dragging}` : ''}`} onDragEnd={() => setDragging(null)} onDrop={() => setDragging(null)}>
      <Biblioteca arts={arts} usage={usage} picked={picked} sending={sending}
        onPick={(a) => setPicked((p) => (p?.id === a.id ? null : a))} onUpload={(f) => void upload(f)} onDragArt={() => setDragging('art')}
        onRename={async (a, name) => { try { await studioAlbumApi.renameArt(a.id, name); setArts((l) => l.map((x) => (x.id === a.id ? { ...x, name } : x))); } catch (e) { fail(e); } }}
        onRemove={async (a) => { try { await studioAlbumApi.removeArt(a, !!usage[a.path]); setArts((l) => l.filter((x) => x.id !== a.id)); if (picked?.id === a.id) setPicked(null); say('Arte tirada da biblioteca.'); } catch (e) { fail(e); } }} />

      <div className="cr-main">
        <section className="cr-mesa" ref={mesa} aria-label="Mesa">
          {!draft ? (
            <>
              <header className="cr-mesa__head">
                <h2>Mesa</h2>
                <p className="muted">{picked ? <>Arte escolhida: <b>{picked.name || 'sem nome'}</b>. Agora toque na moldura da raridade.</> : 'Arraste uma arte da biblioteca para a moldura da raridade. A figurinha nasce nessa raridade e nesse formato.'}</p>
                <div className="seg cr-formato" role="group" aria-label="Formato">
                  <button aria-pressed={!deitada} onClick={() => setDeitada(false)}>Em pé</button>
                  <button aria-pressed={deitada} onClick={() => setDeitada(true)}>Deitada</button>
                </div>
              </header>
              <div className={`cr-molduras${deitada ? ' is-h' : ''}`}>
                {[...TIERS].reverse().map((t) => (
                  <DropFrame key={t} tier={t} picked={!!picked} deitada={deitada}
                    onArt={(e) => { const a = artFromDrop(e); if (a) startFromArt(a, t); }}
                    onFiles={async (f) => { const l = await upload(f); if (l[0]) startFromArt(l[0], t); }}
                    onClick={() => { if (picked) startFromArt(picked, t); }} />
                ))}
              </div>
            </>
          ) : (
            <Editor d={draft} set={(p) => setDraft((d) => (d ? { ...d, ...p } : d))} books={cat.books} section={draftPage?.title ?? ''} saving={saving}
              owned={draft.id ? cat.owned[draft.id] ?? 0 : 0} numberTaken={cat.stickers.some((s) => s.season === draft.season && s.number === draft.number && s.id !== draft.id)}
              artFromDrop={artFromDrop} upload={upload} pickedArt={picked} takePicked={() => { if (picked) { setDraft((d) => (d ? { ...d, source: picked.path, framing: { ...FRAMING_INICIAL }, changed: true } : d)); setPicked(null); } }}
              onSave={(n) => void salvar(n)} onCancel={() => setDraft(null)}
              onDelete={draft.id ? async () => { const c = await apply(studioAlbumApi.deleteSticker(draft.id!), cat.owned[draft.id!] ? 'Figurinha tirada dos pacotes (quem tem continua tendo).' : 'Figurinha apagada.'); if (c) setDraft(null); } : undefined} />
          )}
        </section>

        <Quadro cat={cat} book={book} pages={pages} setBook={setBookId} apply={apply} fail={fail} say={say} arts={artByPath} picked={picked} setPicked={setPicked}
          editing={draft?.id ?? null} onEdit={edit} onNewIn={(a, pageId, lugar) => startFromArt(a, 'comum', pageId, lugar)} artFromDrop={artFromDrop} upload={upload}
          onDragSticker={() => setDragging('sticker')} nextNumber={nextNumber} />
      </div>
    </div>
  );
}

/** Miniatura leve de uma arte (480 px). Se ainda não existe, mostra a original e gera a miniatura para a próxima vez. */
function ArtThumb({ path, className }: { path: string; className?: string }) {
  const mini = miniPath(path);
  const [src, setSrc] = useState(() => artSrc(mini ?? path) ?? '');
  useEffect(() => { setSrc(artSrc(miniPath(path) ?? path) ?? ''); }, [path]);
  return <img className={className} src={src} alt="" loading="lazy" decoding="async" draggable={false}
    onError={() => { const orig = artSrc(path) ?? ''; if (src !== orig) { setSrc(orig); void studioAlbumApi.ensureMini(path); } }} />;
}

/* ---- Biblioteca de artes ---------------------------------------------------------------------------------------- */
function Biblioteca({ arts, usage, picked, sending, onPick, onUpload, onDragArt, onRename, onRemove }: {
  arts: AlbumArt[]; usage: Record<string, number>; picked: AlbumArt | null; sending: { done: number; total: number } | null;
  onPick: (a: AlbumArt) => void; onUpload: (f: File[]) => void; onDragArt: () => void; onRename: (a: AlbumArt, name: string) => void; onRemove: (a: AlbumArt) => void;
}) {
  const [over, setOver] = useState(false);
  const [filter, setFilter] = useState<'livres' | 'usadas' | 'todas'>('livres');
  const [open, setOpen] = useState<string | null>(null);
  const livres = arts.filter((a) => !usage[a.path]);
  const list = filter === 'livres' ? livres : filter === 'usadas' ? arts.filter((a) => usage[a.path]) : arts;
  return (
    <aside className={`cr-lib${over ? ' is-over' : ''}`} aria-label="Biblioteca de artes"
      onDragOver={(e) => { if (isFiles(e)) { e.preventDefault(); setOver(true); } }} onDragLeave={(e) => { if (e.currentTarget === e.target) setOver(false); }}
      onDrop={(e) => { if (isFiles(e)) { e.preventDefault(); setOver(false); onUpload(Array.from(e.dataTransfer.files)); } }}>
      <header className="cr-lib__head">
        <h2>Artes</h2>
        <label className="btn ghost sm" style={{ cursor: 'pointer' }}>Enviar
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ''; if (f.length) onUpload(f); }} />
        </label>
      </header>
      <p className="cr-lib__drop">{sending ? `Enviando ${sending.done + 1} de ${sending.total}…` : 'Arraste as imagens do computador para cá. Pode soltar várias de uma vez.'}</p>
      {sending && <progress className="cr-lib__bar" max={sending.total} value={sending.done} />}
      <div className="seg cr-lib__seg" role="group" aria-label="Mostrar">
        <button aria-pressed={filter === 'livres'} onClick={() => setFilter('livres')}>Sem uso ({livres.length})</button>
        <button aria-pressed={filter === 'usadas'} onClick={() => setFilter('usadas')}>Usadas</button>
        <button aria-pressed={filter === 'todas'} onClick={() => setFilter('todas')}>Todas</button>
      </div>
      {!arts.length ? <p className="faint cr-lib__empty">Nenhuma arte ainda.</p> : !list.length ? <p className="faint cr-lib__empty">{filter === 'livres' ? 'Todas as artes já viraram figurinha.' : 'Nada aqui.'}</p> : (
        <ul className="cr-lib__grid">
          {list.map((a) => (
            <li key={a.id} className={`cr-art${picked?.id === a.id ? ' is-picked' : ''}`}>
              <button type="button" className="cr-art__img" draggable aria-pressed={picked?.id === a.id} aria-label={`${a.name || 'Arte'}${usage[a.path] ? `, usada ${usage[a.path]} ${usage[a.path] === 1 ? 'vez' : 'vezes'}` : ''}. Arraste para uma moldura ou toque para escolher`}
                onDragStart={(e) => { e.dataTransfer.setData(T_ART, a.id); e.dataTransfer.effectAllowed = 'copy'; onDragArt(); }} onClick={() => onPick(a)}>
                <ArtThumb path={a.path} />
                {usage[a.path] ? <span className="cr-art__used">{usage[a.path]}×</span> : null}
              </button>
              <button type="button" className="cr-art__more" aria-expanded={open === a.id} aria-label="Opções da arte" onClick={() => setOpen(open === a.id ? null : a.id)}>⋯</button>
              {open === a.id && (
                <div className="cr-art__menu">
                  <input className="field" defaultValue={a.name} maxLength={120} aria-label="Nome da arte" onBlur={(e) => { if (e.target.value !== a.name) onRename(a, e.target.value.trim()); }} />
                  <small className="faint">{a.width} × {a.height}</small>
                  <ConfirmButton label="Tirar da biblioteca" confirm={usage[a.path] ? 'Em uso. Tirar mesmo?' : 'Tirar mesmo?'} onConfirm={() => onRemove(a)} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

/* ---- Moldura vazia (alvo para soltar a arte) ------------------------------------------------------------------- */
function DropFrame({ tier, picked, onArt, onFiles, onClick, small, active, deitada = false }: { tier: Tier; picked?: boolean; onArt: (e: DragEvent) => void; onFiles: (f: File[]) => void; onClick: () => void; small?: boolean; active?: boolean; deitada?: boolean }) {
  const [over, setOver] = useState(false);
  const html = useMemo(() => stickerHTML({ id: `molde-${tier}`, season: 1, number: 0, name: TIER_MATERIAL[tier], tier, art: null, credit: '', pageId: null, slot: 0, active: true, landscape: deitada }, TIER_LABEL[tier]), [tier, deitada]);
  return (
    <button type="button" className={`cr-drop${deitada ? ' is-h' : ''}${small ? ' cr-drop--sm' : ''}${over ? ' is-over' : ''}${active ? ' is-active' : ''}${picked ? ' is-ready' : ''}`}
      aria-label={`Moldura ${TIER_LABEL[tier]} (${TIER_MATERIAL[tier]})${small ? '' : '. Solte uma arte aqui'}`} aria-pressed={small ? !!active : undefined}
      onDragOver={(e) => { if (hasType(e, T_ART) || isFiles(e)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setOver(true); } }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { setOver(false); if (hasType(e, T_ART)) { e.preventDefault(); onArt(e); } else if (isFiles(e)) { e.preventDefault(); onFiles(Array.from(e.dataTransfer.files)); } }}
      onClick={onClick}>
      <span className="wsw" dangerouslySetInnerHTML={{ __html: html }} />
      <span className="cr-drop__lbl"><b>{TIER_LABEL[tier]}</b><small>{TIER_MATERIAL[tier]}</small></span>
    </button>
  );
}

/* ---- Enquadrar: arrastar a pintura dentro da moldura e dar zoom ------------------------------------------------- */
function Framer({ html, src, aspect, overscan, imgSel, boxSel, framing, onChange, label, className = '', onDropArt }: {
  html: string; src: string | null; aspect: number; overscan: number; imgSel: string; boxSel: string; framing: Framing; onChange: (f: Framing) => void; label: string; className?: string;
  onDropArt?: (e: DragEvent) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [over, setOver] = useState(false);
  const live = useRef({ framing, nat, onChange });
  live.current = { framing, nat, onChange };
  useEffect(() => {
    setNat(null);
    if (!src) return;
    let ok = true;
    const i = new Image(); i.onload = () => { if (ok) setNat({ w: i.naturalWidth, h: i.naturalHeight }); }; i.src = artSrc(src) ?? '';
    return () => { ok = false; };
  }, [src]);
  useLayoutEffect(() => {
    const img = ref.current?.querySelector<HTMLImageElement>(imgSel);
    if (!img) return;
    img.loading = 'eager';
    if (!nat) { img.style.visibility = 'hidden'; return; }
    const p = placeInBox(nat.w, nat.h, aspect, framing, overscan);
    // Com !important: as regras da figurinha (posição e tamanho fixos da arte) não podem vencer o enquadramento.
    img.style.visibility = '';
    img.style.setProperty('left', `${p.left}%`, 'important'); img.style.setProperty('top', `${p.top}%`, 'important');
    img.style.setProperty('width', `${p.width}%`, 'important'); img.style.setProperty('height', `${p.height}%`, 'important');
    // A sobra além da pintura aparece preenchida com ela mesma, desfocada (igual ao recorte que vai ser gerado).
    let fill = img.parentElement?.querySelector<HTMLImageElement>('img.cr-fill');
    if (!fill) { fill = document.createElement('img'); fill.className = 'cr-fill'; fill.alt = ''; fill.draggable = false; img.before(fill); }
    // O preenchimento é desfocado: a miniatura basta e pesa muito menos que a original (com a original de reserva).
    if (fill.dataset.for !== img.src) {
      const f = fill, full = img.src, mini = src ? artSrc(miniPath(src)) : null;
      f.dataset.for = full; f.onerror = () => { f.onerror = null; f.src = full; }; f.src = mini ?? full;
    }
    fill.hidden = coversAll(nat.w, nat.h, cropRect(nat.w, nat.h, aspect, framing));
    // A pintura inteira, apagada, por fora da moldura: mostra o que fica de fora e para onde ela está indo.
    const stage = ref.current!, box = stage.querySelector<HTMLElement>(boxSel);
    let ghost = stage.querySelector<HTMLImageElement>(':scope > img.cr-ghost');
    if (!ghost) { ghost = document.createElement('img'); ghost.className = 'cr-ghost'; ghost.alt = ''; ghost.draggable = false; stage.prepend(ghost); }
    if (ghost.src !== img.src) ghost.src = img.src;
    if (box) {
      const sr = stage.getBoundingClientRect(), br = box.getBoundingClientRect();
      Object.assign(ghost.style, { left: `${br.left - sr.left + (p.left / 100) * br.width}px`, top: `${br.top - sr.top + (p.top / 100) * br.height}px`, width: `${(p.width / 100) * br.width}px`, height: `${(p.height / 100) * br.height}px` });
    }
  });
  // Rodinha do mouse: zoom (precisa de ouvinte não passivo para não rolar a página).
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const w = (e: WheelEvent) => {
      const { nat: n, framing: f, onChange: ch } = live.current; if (!n) return;
      e.preventDefault();
      ch(clampFraming(n.w, n.h, aspect, { ...f, z: f.z * (e.deltaY < 0 ? 1.06 : 1 / 1.06) }));
    };
    el.addEventListener('wheel', w, { passive: false });
    return () => el.removeEventListener('wheel', w);
  }, [aspect]);
  const drag = useRef<{ x: number; y: number; f: Framing; id: number } | null>(null);
  const [moving, setMoving] = useState(false);
  const box = () => ref.current?.querySelector<HTMLElement>(boxSel)?.getBoundingClientRect() ?? ref.current!.getBoundingClientRect();
  return (
    <div className={`cr-framer ${className}${over ? ' is-over' : ''}${nat ? '' : ' is-loading'}${moving ? ' is-moving' : ''}`}>
      <div ref={ref} className="cr-framer__stage" role="application" tabIndex={0} aria-label={`${label}. Arraste para enquadrar; setas movem, + e − dão zoom`}
        dangerouslySetInnerHTML={{ __html: html }}
        onPointerDown={(e) => { if (!nat || e.button > 0) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, f: framing, id: e.pointerId }; setMoving(true); }}
        onPointerMove={(e) => { const d = drag.current; if (!d || !nat || d.id !== e.pointerId) return; const b = box(); onChange(pan(nat.w, nat.h, aspect, d.f, e.clientX - d.x, e.clientY - d.y, b.width, b.height, overscan)); }}
        onPointerUp={() => { drag.current = null; setMoving(false); }} onPointerCancel={() => { drag.current = null; setMoving(false); }}
        onKeyDown={(e) => {
          if (!nat) return;
          const b = box(); const step = e.shiftKey ? 20 : 4;
          const mv: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
          if (mv[e.key]) { e.preventDefault(); onChange(pan(nat.w, nat.h, aspect, framing, mv[e.key][0], mv[e.key][1], b.width, b.height, overscan)); }
          else if (e.key === '+' || e.key === '=') { e.preventDefault(); onChange(clampFraming(nat.w, nat.h, aspect, { ...framing, z: framing.z * 1.1 })); }
          else if (e.key === '-') { e.preventDefault(); onChange(clampFraming(nat.w, nat.h, aspect, { ...framing, z: framing.z / 1.1 })); }
        }}
        onDragOver={(e) => { if (onDropArt && hasType(e, T_ART)) { e.preventDefault(); setOver(true); } }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { setOver(false); if (onDropArt && hasType(e, T_ART)) { e.preventDefault(); onDropArt(e); } }} />
      {nat && <span className="cr-framer__tip" aria-hidden="true">Arraste para mover · rodinha para zoom</span>}
      <div className="cr-zoom">
        <span aria-hidden="true">−</span>
        <input type="range" min={ZOOM_MIN} max={ZOOM_MAX} step={0.01} value={framing.z} aria-label="Zoom" disabled={!nat}
          onChange={(e) => nat && onChange(clampFraming(nat.w, nat.h, aspect, { ...framing, z: Number(e.target.value) }))} />
        <span aria-hidden="true">+</span>
        <button type="button" className="btn quiet sm" disabled={!nat} onClick={() => onChange({ ...FRAMING_INICIAL })}>Encaixar</button>
        <button type="button" className="btn quiet sm" disabled={!nat} title="Afasta até a pintura caber inteira na moldura"
          onClick={() => { if (!nat) return; const b = cropRect(nat.w, nat.h, aspect, { x: 0.5, y: 0.5, z: 1 }); onChange(clampFraming(nat.w, nat.h, aspect, { x: 0.5, y: 0.5, z: Math.min(b.sw / nat.w, b.sh / nat.h) / overscan })); }}>Pintura inteira</button>
      </div>
    </div>
  );
}

/* ---- Editor da figurinha (na mesa) ------------------------------------------------------------------------------ */
function Editor({ d, set, books, section, saving, owned, numberTaken, artFromDrop, upload, pickedArt, takePicked, onSave, onCancel, onDelete }: {
  d: Draft; set: (p: Partial<Draft>) => void; books: AlbumBook[]; section: string; saving: boolean; owned: number; numberTaken: boolean;
  artFromDrop: (e: DragEvent) => AlbumArt | null; upload: (f: File[]) => Promise<AlbumArt[]>; pickedArt: AlbumArt | null; takePicked: () => void;
  onSave: (next: boolean) => void; onCancel: () => void; onDelete?: () => void;
}) {
  const preview: Sticker = { id: d.id ?? 'mesa', season: d.season, number: d.number || 0, name: d.name.trim() || 'Nome da figurinha', tier: d.tier, art: d.source ?? d.art, credit: d.credit, pageId: d.pageId, slot: d.slot, active: d.active, landscape: d.landscape };
  const html = `<div class="wsw">${stickerHTML(preview, section)}</div>`;
  const pages = useMemo(() => books.flatMap((b) => [...b.pages].sort((a, c) => a.position - c.position).map((p) => ({ id: p.id, label: `${b.title} · ${p.title}` }))), [books]);
  const setArt = (a: AlbumArt | null) => { if (a) set({ source: a.path, framing: { ...FRAMING_INICIAL }, changed: true }); };
  return (
    <div className="cr-ed">
      <header className="cr-mesa__head">
        <h2>{d.id ? `Figurinha ${num3(d.number)}` : 'Nova figurinha'}{d.changed && <span className="cr-dot" title="Mudanças não salvas" aria-label="Mudanças não salvas" />}</h2>
        <p className="muted">Arraste a pintura dentro da moldura para enquadrar. Rodinha do mouse ou a barra dão zoom. Solte outra arte na moldura para trocar a pintura.</p>
      </header>
      <div className={`cr-ed__body${d.landscape ? ' is-h' : ''}`}>
        <div className="cr-ed__stage">
          <Framer key={d.landscape ? 'h' : 'v'} html={html} src={d.source} aspect={d.landscape ? STICKER_ASPECT_H : STICKER_ASPECT} overscan={OVERSCAN} imgSel=".wst__art" boxSel=".sk-art" framing={d.framing} label="Enquadramento da figurinha"
            onChange={(f) => set({ framing: f, changed: true })} onDropArt={(e) => setArt(artFromDrop(e))} className="cr-framer--sticker" />
          {pickedArt && <button type="button" className="btn ghost sm" onClick={takePicked}>Usar a arte escolhida ({pickedArt.name || 'sem nome'})</button>}
          {!d.source && <p className="faint" style={{ margin: 0 }}>Sem arte. Solte uma arte da biblioteca na moldura.</p>}
        </div>
        <div className="cr-ed__form">
          <div className="seg cr-formato" role="group" aria-label="Formato">
            <button aria-pressed={!d.landscape} onClick={() => set({ landscape: false, framing: { ...FRAMING_INICIAL }, changed: true })}>Em pé</button>
            <button aria-pressed={d.landscape} onClick={() => set({ landscape: true, framing: { ...FRAMING_INICIAL }, changed: true })}>Deitada</button>
          </div>
          <div className="cr-tiers" role="group" aria-label="Raridade (moldura)">
            {[...TIERS].reverse().map((t) => (
              <DropFrame key={t} tier={t} small active={d.tier === t} deitada={d.landscape}
                onArt={(e) => { const a = artFromDrop(e); set({ tier: t, ...(a ? { source: a.path, framing: { ...FRAMING_INICIAL } } : {}), changed: true }); }}
                onFiles={async (f) => { const l = await upload(f); set({ tier: t, ...(l[0] ? { source: l[0].path, framing: { ...FRAMING_INICIAL } } : {}), changed: true }); }}
                onClick={() => set({ tier: t, changed: true })} />
            ))}
          </div>
          <div className="sa-row">
            <label>Nome<input className="field" maxLength={40} value={d.name} placeholder="Ex.: Pico ao Entardecer" onChange={(e) => set({ name: e.target.value, changed: true })} /></label>
            <label className="sa-short">Número<input className="field" type="number" min={1} max={999} value={d.number || ''} aria-invalid={numberTaken} onChange={(e) => set({ number: Number(e.target.value) || 0, changed: true })} /></label>
          </div>
          {numberTaken && <p className="cr-warn" role="alert">Já existe outra figurinha com o número {num3(d.number)} nesta Temporada.</p>}
          <div className="sa-row">
            <label>Seção<select className="field" value={d.pageId ?? ''} onChange={(e) => set({ pageId: e.target.value || null, changed: true })}><option value="">Sem seção (fica fora do álbum)</option>{pages.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
            <label className="sa-short">Posição<input className="field" type="number" min={0} max={99} value={d.slot} onChange={(e) => set({ slot: Number(e.target.value) || 0, changed: true })} /></label>
          </div>
          <div className="sa-row">
            <label>Crédito da arte<input className="field" maxLength={80} value={d.credit} placeholder="Arte: …" onChange={(e) => set({ credit: e.target.value, changed: true })} /></label>
            <label className="sa-short">Temporada<input className="field" type="number" min={1} max={99} value={d.season} onChange={(e) => set({ season: Number(e.target.value) || 1, changed: true })} /></label>
          </div>
          <label className="cr-check"><input type="checkbox" checked={d.active} onChange={(e) => set({ active: e.target.checked, changed: true })} /> Entra nos pacotes</label>
          {owned > 0 && <p className="faint" style={{ margin: 0, fontSize: 13 }}>{owned} {owned === 1 ? 'pessoa já tem' : 'pessoas já têm'} esta figurinha. Mudanças de arte e nome aparecem para elas também.</p>}
          <div className="sa-row">
            <button className="btn primary" disabled={saving || numberTaken} onClick={() => onSave(false)}>{saving ? 'Salvando…' : 'Salvar figurinha'}</button>
            {!d.id && <button className="btn ghost" disabled={saving || numberTaken} onClick={() => onSave(true)}>Salvar e escolher a próxima arte</button>}
            <button className="btn quiet" disabled={saving} onClick={onCancel}>{d.changed ? 'Descartar' : 'Fechar'}</button>
            {onDelete && <ConfirmButton label={owned ? 'Tirar dos pacotes' : 'Apagar'} confirm={owned ? 'Já tem gente com ela. Tirar dos pacotes?' : 'Apagar mesmo?'} onConfirm={onDelete} />}
          </div>
          <p className="faint cr-hint">Ctrl + S salva. O recorte final sai em {d.landscape ? '1400 × 1000' : '1000 × 1400'}.</p>
        </div>
      </div>
    </div>
  );
}

/* ---- Quadro do álbum: capa, ajustes e as seções com as páginas ------------------------------------------------- */
type Alvo = { sec: string; leaf: number; pos: Pos } | { loose: true };
function Quadro({ cat, book, pages, setBook, apply, say, fail, arts, picked, setPicked, editing, onEdit, onNewIn, artFromDrop, upload, onDragSticker, nextNumber }: Say & {
  cat: Catalog; book: AlbumBook | null; pages: AlbumPage[]; setBook: (id: string) => void; apply: (p: Promise<Catalog>, m?: string) => Promise<Catalog | null>;
  arts: Record<string, AlbumArt>; picked: AlbumArt | null; setPicked: (a: AlbumArt | null) => void; editing: string | null; onEdit: (s: Sticker) => void;
  onNewIn: (a: AlbumArt, pageId: string, lugar?: Lugar) => void; artFromDrop: (e: DragEvent) => AlbumArt | null; upload: (f: File[]) => Promise<AlbumArt[]>; onDragSticker: () => void; nextNumber: (season: number) => number;
}) {
  const byPage = useMemo(() => {
    const m: Record<string, Sticker[]> = {};
    for (const s of cat.stickers) if (s.pageId) (m[s.pageId] ??= []).push(s);
    for (const k of Object.keys(m)) m[k].sort((a, b) => a.slot - b.slot || a.number - b.number);
    return m;
  }, [cat]);
  const loose = cat.stickers.filter((s) => !s.pageId || !cat.books.some((b) => b.pages.some((p) => p.id === s.pageId)));
  const byId = useMemo(() => Object.fromEntries(cat.stickers.map((s) => [s.id, s])), [cat]);
  const leaves = useMemo(() => (book ? bookLeaves(book, cat.stickers) : []), [book, cat.stickers]);

  /**
   * Solta uma figurinha numa página (ou fora do álbum). As páginas das seções envolvidas passam a ser "escolhidas à mão"
   * (leaf), e a página de destino vira livre: as que já estavam nela ficam exatamente onde apareciam.
   */
  const drop = async (id: string, alvo: Alvo) => {
    const s = byId[id]; if (!s || !book) return;
    const per = book.perPage ?? 6;
    const leavesOf = (sec: string) => { const pg = pages.find((p) => p.id === sec); const st = byPage[sec] ?? []; return pg?.legendary ? [st] : sectionLeaves(st, per); };
    const ups = new Map<string, StickerOrder>();
    const up = (sid: string, patch: Partial<StickerOrder>) => ups.set(sid, { ...(ups.get(sid) ?? { id: sid }), ...patch });
    const secs = new Set<string>([s.pageId ?? '', 'sec' in alvo ? alvo.sec : ''].filter(Boolean));
    for (const sec of secs) leavesOf(sec).forEach((lf, i) => lf.forEach((x) => { if (x.id !== id) up(x.id, { pageId: sec, leaf: i + 1 }); }));
    if ('sec' in alvo) {
      const atual = leavesOf(alvo.sec)[alvo.leaf - 1] ?? [];
      const pg = document.querySelector<HTMLElement>(`[data-cr-leaf="${alvo.sec}:${alvo.leaf}"] .alb-pg`);
      if (pg) {
        const r = pg.getBoundingClientRect();
        for (const x of atual) {
          if (x.id === id || x.pos) continue;
          const el = pg.querySelector<HTMLElement>(`.alb-slot[data-slot="${x.id}"]`); if (!el) continue;
          const b = el.getBoundingClientRect();
          up(x.id, { pos: clampPos({ x: ((b.left + b.width / 2 - r.left) / r.width) * 100, y: ((b.top + b.height / 2 - r.top) / r.height) * 100 }) });
        }
      }
      up(id, { pageId: alvo.sec, leaf: alvo.leaf, pos: clampPos(alvo.pos) });
    } else up(id, { pageId: null, leaf: null, pos: null });
    // Ordem dentro da seção: página, depois de cima para baixo e da esquerda para a direita.
    for (const sec of secs) {
      const final = cat.stickers.map((x) => ({ ...x, ...(ups.get(x.id) ?? {}) })).filter((x) => x.pageId === sec);
      final.sort((p, q) => (p.leaf ?? 99) - (q.leaf ?? 99) || (p.pos?.y ?? 0) - (q.pos?.y ?? 0) || (p.pos?.x ?? 0) - (q.pos?.x ?? 0) || p.slot - q.slot);
      final.forEach((x, i) => up(x.id, { slot: i + 1 }));
    }
    await apply(studioAlbumApi.order([...ups.values()]));
  };
  const automatico = async (sec: string, leaf: number) => {
    const lf = leaves.filter((l) => l.section === sec)[leaf - 1]?.stickers ?? [];
    await apply(studioAlbumApi.order(lf.map((x) => ({ id: x.id, pos: null }))), 'Página voltou a se organizar sozinha, em fileiras.');
  };
  const renumber = async (from: number) => {
    if (!book) return;
    const list = pages.flatMap((p) => byPage[p.id] ?? []);
    await apply(studioAlbumApi.order(list.map((s, i) => ({ id: s.id, number: from + i }))), `Figurinhas numeradas de ${num3(from)} a ${num3(from + list.length - 1)}, na ordem do álbum.`);
  };
  const newBook = async () => {
    const c = await apply(studioAlbumApi.saveBook({ slug: `album-${Date.now().toString(36)}`, title: 'Novo álbum', subtitle: 'Temporada 1', season: 1, position: cat.books.length + 1, published: false, perPage: 6 }), 'Álbum criado (como rascunho).');
    const b = c?.books[c.books.length - 1]; if (b) setBook(b.id);
  };

  /* ---- arrastar as figurinhas nas páginas (com o mouse, sem o arrastar do navegador) ---- */
  const live = useRef({ drop, onEdit, byId });
  live.current = { drop, onEdit, byId };
  const arrasto = useRef<{ id: string; x0: number; y0: number; el: HTMLElement; dx: number; dy: number; w: number; h: number; cap: number; moved: boolean; ghost?: HTMLElement; alvo?: HTMLElement | null } | null>(null);
  const alvoEm = (x: number, y: number) => document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-cr-leaf], [data-cr-loose]') ?? null;
  const onDown = (e: RPointerEvent) => {
    if (e.button > 0) return;
    const slot = (e.target as HTMLElement).closest<HTMLElement>('.cr-leaf .alb-slot[data-slot]'); if (!slot) return;
    e.preventDefault();
    const st = slot.querySelector<HTMLElement>('.wsw') ?? slot;
    const r = st.getBoundingClientRect(), rs = slot.getBoundingClientRect();
    arrasto.current = { id: slot.dataset.slot!, x0: e.clientX, y0: e.clientY, el: slot, dx: e.clientX - r.left, dy: e.clientY - r.top, w: r.width, h: r.height, cap: (rs.top + rs.height / 2) - (r.top + r.height / 2), moved: false };
    const move = (ev: PointerEvent) => {
      const d = arrasto.current; if (!d) return;
      if (!d.moved && Math.hypot(ev.clientX - d.x0, ev.clientY - d.y0) < 5) return;
      if (!d.moved) {
        d.moved = true;
        const g = document.createElement('div'); g.className = 'cr-lift';
        g.style.width = `${d.w}px`;
        g.innerHTML = (d.el.querySelector('.wsw')?.outerHTML) ?? '';
        document.body.append(g); d.ghost = g; d.el.classList.add('is-lifted');
      }
      d.ghost!.style.transform = `translate(${ev.clientX - d.dx}px, ${ev.clientY - d.dy}px)`;
      const a = alvoEm(ev.clientX, ev.clientY);
      if (a !== d.alvo) { d.alvo?.classList.remove('is-target'); a?.classList.add('is-target'); d.alvo = a; }
    };
    const end = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end);
      const d = arrasto.current; arrasto.current = null; if (!d) return;
      d.ghost?.remove(); d.el.classList.remove('is-lifted'); d.alvo?.classList.remove('is-target');
      if (!d.moved) { const s = live.current.byId[d.id]; if (s) live.current.onEdit(s); return; }
      if (ev.type === 'pointercancel') return;
      const a = alvoEm(ev.clientX, ev.clientY); if (!a) return;
      if (a.dataset.crLoose !== undefined) { void live.current.drop(d.id, { loose: true }); return; }
      const [sec, leaf] = (a.dataset.crLeaf ?? '').split(':');
      const pg = a.querySelector<HTMLElement>('.alb-pg'); if (!pg || !sec) return;
      const r = pg.getBoundingClientRect();
      const cx = ev.clientX - d.dx + d.w / 2, cy = ev.clientY - d.dy + d.h / 2 + d.cap;
      void live.current.drop(d.id, { sec, leaf: Number(leaf), pos: { x: ((cx - r.left) / r.width) * 100, y: ((cy - r.top) / r.height) * 100 } });
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
  };

  return (
    <section className="cr-quadro" aria-label="Álbum">
      <div className="cr-books" role="tablist" aria-label="Álbuns">
        {cat.books.map((b) => (
          <button key={b.id} role="tab" aria-selected={b.id === book?.id} className="cr-book" onClick={() => setBook(b.id)}>
            <b>{b.title}</b><small>{b.published ? 'Publicado' : 'Rascunho'} · Temporada {b.season}</small>
          </button>
        ))}
        <button className="btn ghost sm" onClick={() => void newBook()}>Novo álbum</button>
      </div>
      {!book ? <p className="muted">Crie um álbum para começar.</p> : (
        <>
          <AjustesDoAlbum key={book.id} book={book} pages={pages} byPage={byPage} apply={apply} fail={fail} artFromDrop={artFromDrop} upload={upload} picked={picked} setPicked={setPicked} onRenumber={renumber}
            firstNumber={Math.min(...pages.flatMap((p) => (byPage[p.id] ?? []).map((s) => s.number)), nextNumber(book.season))} />
          <p className="muted cr-dica">Arraste as figurinhas dentro das páginas para colocar cada uma onde quiser, ou leve para outra página (ou para "Nova página"). Clique numa figurinha para editar. Solte uma arte da biblioteca numa página para criar a figurinha ali.</p>
          <div className="cr-secs" onPointerDown={onDown}>
            {pages.map((p, i) => (
              <Secao key={p.id} book={book} page={p} index={i} total={pages.length} stickers={byPage[p.id] ?? []} leaves={leaves.filter((l) => l.section === p.id)} editing={editing} picked={picked} setPicked={setPicked}
                apply={apply} fail={fail} onNewIn={onNewIn} artFromDrop={artFromDrop} onDropSticker={(id, alvo) => void drop(id, alvo)} onAuto={(leaf) => void automatico(p.id, leaf)}
                onMove={(dir) => { const other = pages[i + dir]; if (!other) return; void (async () => { await studioAlbumApi.savePage(book.id, { id: p.id, position: other.position }); await apply(studioAlbumApi.savePage(book.id, { id: other.id, position: p.position })); })(); }} />
            ))}
            <button className="btn ghost" onClick={() => void apply(studioAlbumApi.savePage(book.id, { title: 'Nova seção', kicker: '', position: (pages[pages.length - 1]?.position ?? 0) + 1 }), 'Seção criada.')}>Nova seção</button>
          </div>
          <div data-cr-loose="" className="cr-loose">
            <StripDrop label="Sem seção" hint={loose.length ? 'Não entram no álbum nem nos pacotes até ganhar uma página. Arraste para uma página.' : 'Arraste uma figurinha para cá para tirá-la do álbum (ela continua salva).'} onSticker={(id) => void drop(id, { loose: true })}>
              {loose.map((s) => <Mini key={s.id} s={s} section="" editing={editing === s.id} onEdit={() => onEdit(s)} onDragSticker={onDragSticker} owned={cat.owned[s.id] ?? 0} />)}
            </StripDrop>
          </div>
        </>
      )}
    </section>
  );
}

function AjustesDoAlbum({ book, pages, byPage, apply, fail, artFromDrop, upload, picked, setPicked, onRenumber, firstNumber }: {
  book: AlbumBook; pages: AlbumPage[]; byPage: Record<string, Sticker[]>; apply: (p: Promise<Catalog>, m?: string) => Promise<Catalog | null>; fail: (e: unknown) => void;
  artFromDrop: (e: DragEvent) => AlbumArt | null; upload: (f: File[]) => Promise<AlbumArt[]>; picked: AlbumArt | null; setPicked: (a: AlbumArt | null) => void; onRenumber: (from: number) => void; firstNumber: number;
}) {
  const [d, setD] = useState({ title: book.title, subtitle: book.subtitle, slug: book.slug, season: book.season, position: book.position, perPage: book.perPage ?? 6 });
  const [cover, setCover] = useState<{ source: string | null; framing: Framing; changed: boolean }>({ source: book.coverSource ?? book.cover, framing: book.coverFraming ?? { ...FRAMING_INICIAL }, changed: false });
  const [busy, setBusy] = useState(false);
  const [from, setFrom] = useState(firstNumber);
  const dirty = d.title !== book.title || d.subtitle !== book.subtitle || d.slug !== book.slug || d.season !== book.season || d.position !== book.position || d.perPage !== (book.perPage ?? 6);
  const total = pages.reduce((n, p) => n + (byPage[p.id]?.length ?? 0), 0);
  const leaves = pages.reduce((n, p) => n + (p.legendary ? 1 : sectionLeaves(byPage[p.id] ?? [], d.perPage).length), 0);
  const html = coverHTML({ title: d.title, subtitle: d.subtitle, cover: cover.source }, book.position || 1);
  const salvarCapa = async () => {
    if (!cover.source) { await apply(studioAlbumApi.saveBook({ id: book.id, cover: null, coverSource: null, coverFraming: null }), 'Capa tirada.'); setCover((c) => ({ ...c, changed: false })); return; }
    setBusy(true);
    try {
      const path = await studioAlbumApi.uploadCrop(await renderCrop(cover.source, COVER_ASPECT, cover.framing, 920));
      const c = await apply(studioAlbumApi.saveBook({ id: book.id, cover: path, coverSource: cover.source, coverFraming: cover.framing }), 'Capa salva.');
      if (c) setCover((x) => ({ ...x, changed: false }));
    } catch (e) { fail(e); } finally { setBusy(false); }
  };
  return (
    <div className="cr-ajustes">
      <div className="cr-ajustes__capa">
        <Framer html={html} src={cover.source} aspect={COVER_ASPECT} overscan={1} imgSel=".alb-cover__img" boxSel=".alb-cover" framing={cover.framing} label="Enquadramento da capa"
          onChange={(f) => setCover((c) => ({ ...c, framing: f, changed: true }))} className="cr-framer--cover"
          onDropArt={(e) => { const a = artFromDrop(e); if (a) setCover({ source: a.path, framing: { ...FRAMING_INICIAL }, changed: true }); }} />
        <div className="sa-row">
          {picked && <button type="button" className="btn ghost sm" onClick={() => { setCover({ source: picked.path, framing: { ...FRAMING_INICIAL }, changed: true }); setPicked(null); }}>Usar a arte escolhida</button>}
          <label className="btn ghost sm" style={{ cursor: 'pointer' }}>Enviar capa<input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={async (e) => { const f = Array.from(e.target.files ?? []); e.target.value = ''; const l = await upload(f); if (l[0]) setCover({ source: l[0].path, framing: { ...FRAMING_INICIAL }, changed: true }); }} /></label>
          {cover.changed && <button className="btn primary sm" disabled={busy} onClick={() => void salvarCapa()}>{busy ? 'Salvando…' : 'Salvar capa'}</button>}
          {cover.source && <button className="btn quiet sm" onClick={() => setCover({ source: null, framing: { ...FRAMING_INICIAL }, changed: true })}>Tirar</button>}
        </div>
      </div>
      <div className="cr-ajustes__form">
        <h2>{book.title} <span className="faint">{book.published ? '· publicado' : '· rascunho'}</span></h2>
        <p className="muted" style={{ margin: 0 }}>{total} {total === 1 ? 'figurinha' : 'figurinhas'} em {pages.length} {pages.length === 1 ? 'seção' : 'seções'} · {leaves} {leaves === 1 ? 'página' : 'páginas'} de figurinhas. Arraste uma arte para a capa para trocar.</p>
        <div className="sa-row">
          <label>Título<input className="field" maxLength={60} value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} /></label>
          <label>Linha de cima<input className="field" maxLength={60} value={d.subtitle} onChange={(e) => setD({ ...d, subtitle: e.target.value })} /></label>
        </div>
        <div className="sa-row">
          <label>Figurinhas por página
            <select className="field" value={d.perPage} onChange={(e) => setD({ ...d, perPage: Number(e.target.value) })}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="sa-short">Temporada<input className="field" type="number" min={1} max={99} value={d.season} onChange={(e) => setD({ ...d, season: Number(e.target.value) || 1 })} /></label>
          <label className="sa-short">Ordem<input className="field" type="number" value={d.position} onChange={(e) => setD({ ...d, position: Number(e.target.value) || 0 })} /></label>
        </div>
        <div className="sa-row">
          <label>Endereço (/album/…)<input className="field" maxLength={40} value={d.slug} onChange={(e) => setD({ ...d, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} /></label>
        </div>
        <div className="cr-pgbox"><PaginaPreview perPage={d.perPage} /><span>Seções divididas sozinhas usam {d.perPage} {d.perPage === 1 ? 'figurinha' : 'figurinhas'} por página. As páginas que você monta à mão, arrastando, ficam do seu jeito.</span></div>
        <div className="sa-row">
          {dirty && <button className="btn primary sm" onClick={() => void apply(studioAlbumApi.saveBook({ id: book.id, ...d }), 'Álbum salvo.')}>Salvar álbum</button>}
          <button className="btn ghost sm" onClick={() => void apply(studioAlbumApi.saveBook({ id: book.id, published: !book.published }), book.published ? 'Álbum voltou a ser rascunho.' : 'Álbum publicado: já entra nos pacotes.')}>{book.published ? 'Despublicar' : 'Publicar'}</button>
          <ConfirmButton label="Apagar álbum" confirm="Apagar mesmo?" onConfirm={() => void apply(studioAlbumApi.deleteBook(book.id), 'Álbum apagado.')} />
        </div>
        {total > 0 && (
          <div className="sa-row cr-renum">
            <label className="sa-short">Numerar a partir de<input className="field" type="number" min={1} max={999} value={from} onChange={(e) => setFrom(Number(e.target.value) || 1)} /></label>
            <ConfirmButton className="btn ghost sm" label="Numerar na ordem do álbum" confirm={`Numerar ${num3(from)} a ${num3(from + total - 1)}?`} onConfirm={() => onRenumber(from)} />
          </div>
        )}
      </div>
    </div>
  );
}

/** Miniatura de uma página do álbum com N espaços, para ver como fica antes de salvar. */
function PaginaPreview({ perPage }: { perPage: number }) {
  return (
    <div className="cr-pgprev" aria-label={`Uma página com ${perPage} ${perPage === 1 ? 'figurinha' : 'figurinhas'}`} role="img">
      <span className="cr-pgprev__ttl" />
      <span className="cr-pgprev__grid" style={{ ['--n' as string]: perPage, gridTemplateColumns: `repeat(${perPage <= 1 ? 1 : perPage <= 2 ? 2 : perPage <= 6 ? 3 : 4}, 1fr)` }}>
        {Array.from({ length: perPage }, (_, i) => <i key={i} />)}
      </span>
    </div>
  );
}

function Secao({ book, page, index, total, stickers, leaves, editing, picked, setPicked, apply, fail, onNewIn, artFromDrop, onDropSticker, onAuto, onMove }: {
  book: AlbumBook; page: AlbumPage; index: number; total: number; stickers: Sticker[]; leaves: ReturnType<typeof bookLeaves>; editing: string | null;
  picked: AlbumArt | null; setPicked: (a: AlbumArt | null) => void; apply: (p: Promise<Catalog>, m?: string) => Promise<Catalog | null>; fail: (e: unknown) => void;
  onNewIn: (a: AlbumArt, pageId: string, lugar?: Lugar) => void; artFromDrop: (e: DragEvent) => AlbumArt | null;
  onDropSticker: (id: string, alvo: Alvo) => void; onAuto: (leaf: number) => void; onMove: (dir: -1 | 1) => void;
}) {
  const [d, setD] = useState({ kicker: page.kicker, title: page.title, body: page.body });
  useEffect(() => { setD({ kicker: page.kicker, title: page.title, body: page.body }); }, [page.kicker, page.title, page.body]);
  const commit = (k: 'kicker' | 'title' | 'body') => {
    const v = d[k].trim();
    if (v === page[k]) return;
    if (k === 'title' && v.length < 1) { setD({ ...d, title: page.title }); fail(new Error('A seção precisa de um título.')); return; }
    void apply(studioAlbumApi.savePage(book.id, { id: page.id, [k]: v }), 'Seção salva.');
  };
  const [bannerOver, setBannerOver] = useState(false);
  const novo = leaves.length + (stickers.length ? 1 : 0);
  return (
    <article className="cr-sec">
      <header className="cr-sec__head">
        <div className="cr-sec__move">
          <button type="button" className="btn quiet sm" disabled={index === 0} aria-label="Subir seção" onClick={() => onMove(-1)}>↑</button>
          <button type="button" className="btn quiet sm" disabled={index === total - 1} aria-label="Descer seção" onClick={() => onMove(1)}>↓</button>
        </div>
        <div className={`cr-sec__banner${bannerOver ? ' is-over' : ''}${page.banner ? ' has-img' : ''}`}
          onDragOver={(e) => { if (hasType(e, T_ART)) { e.preventDefault(); setBannerOver(true); } }} onDragLeave={() => setBannerOver(false)}
          onDrop={(e) => { setBannerOver(false); const a = artFromDrop(e); if (a) { e.preventDefault(); void apply(studioAlbumApi.savePage(book.id, { id: page.id, banner: a.path }), 'Faixa da seção trocada.'); } }}>
          {page.banner && <ArtThumb path={page.banner} className="cr-sec__bimg" />}
          {picked ? <button type="button" className="btn quiet sm" onClick={() => { void apply(studioAlbumApi.savePage(book.id, { id: page.id, banner: picked.path }), 'Faixa da seção trocada.'); setPicked(null); }}>Usar como faixa</button>
            : page.banner ? <button type="button" className="btn quiet sm" onClick={() => void apply(studioAlbumApi.savePage(book.id, { id: page.id, banner: null }), 'Faixa tirada.')}>Tirar faixa</button>
              : <span>Faixa: solte uma arte</span>}
        </div>
        <div className="cr-sec__fields">
          <input className="field cr-sec__kicker" maxLength={40} value={d.kicker} placeholder="Chamada (ex.: Seção 2)" aria-label="Chamada" onChange={(e) => setD({ ...d, kicker: e.target.value })} onBlur={() => commit('kicker')} />
          <input className="field cr-sec__title" maxLength={60} value={d.title} aria-label="Título da seção" onChange={(e) => setD({ ...d, title: e.target.value })} onBlur={() => commit('title')} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
          <input className="field" maxLength={160} value={d.body} placeholder="Texto da seção (opcional)" aria-label="Texto da seção" onChange={(e) => setD({ ...d, body: e.target.value })} onBlur={() => commit('body')} />
        </div>
        <div className="cr-sec__meta">
          <span className="faint">{stickers.length} {stickers.length === 1 ? 'figurinha' : 'figurinhas'} · {leaves.length} {leaves.length === 1 ? 'página' : 'páginas'}</span>
          <label className="cr-check"><input type="checkbox" checked={page.legendary} onChange={(e) => void apply(studioAlbumApi.savePage(book.id, { id: page.id, legendary: e.target.checked }), e.target.checked ? 'Seção marcada como página lendária.' : 'Seção voltou ao normal.')} /> Página lendária</label>
          <ConfirmButton label="Apagar seção" confirm="Apagar? As figurinhas ficam sem seção." onConfirm={() => void apply(studioAlbumApi.deletePage(page.id), 'Seção apagada. As figurinhas dela ficaram sem seção.')} />
        </div>
      </header>
      <div className="cr-leaves">
        {leaves.map((lf, i) => (
          <Folha key={lf.id} leaf={lf} num={i + 1} sec={page.id} editing={editing} picked={picked} onNewIn={onNewIn} artFromDrop={artFromDrop} onDropSticker={onDropSticker}
            onAuto={!page.legendary && leafMode(lf.stickers) === 'free' ? () => onAuto(i + 1) : undefined} />
        ))}
        {!page.legendary && stickers.length > 0 && (
          <Folha leaf={{ id: `${page.id}~novo`, section: page.id, part: novo, kicker: '', title: '', body: '', banner: null, legendary: false, stickers: [] }} num={novo} sec={page.id} editing={null} picked={picked}
            onNewIn={onNewIn} artFromDrop={artFromDrop} onDropSticker={onDropSticker} nova />
        )}
      </div>
    </article>
  );
}

/** Uma página da seção, igual à do álbum. Recebe figurinhas arrastadas e artes da biblioteca. */
function Folha({ leaf, num, sec, editing, picked, onNewIn, artFromDrop, onDropSticker, onAuto, nova = false }: {
  leaf: ReturnType<typeof bookLeaves>[number]; num: number; sec: string; editing: string | null; picked: AlbumArt | null;
  onNewIn: (a: AlbumArt, pageId: string, lugar?: Lugar) => void; artFromDrop: (e: DragEvent) => AlbumArt | null; onDropSticker: (id: string, alvo: Alvo) => void; onAuto?: () => void; nova?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [over, setOver] = useState(false);
  const html = useMemo(() => nova ? '<div class="alb-pg alb-pg--center"><span class="alb-pg__kick">Nova página</span><p class="alb-pg__desc">Arraste uma figurinha para cá para começar outra página nesta seção.</p></div>'
    : leafHTML(leaf, num, () => true, false, (s) => `<div class="wsw">${stickerHTML(s, leaf.title)}</div>`), [leaf, num, nova]);
  useEffect(() => {
    ref.current?.querySelectorAll('.alb-slot.is-editing').forEach((x) => x.classList.remove('is-editing'));
    if (editing) ref.current?.querySelector(`.alb-slot[data-slot="${editing}"]`)?.classList.add('is-editing');
  });
  const posAt = (e: { clientX: number; clientY: number }): Pos => {
    const r = ref.current!.querySelector<HTMLElement>('.alb-pg')!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
  };
  return (
    <div className={`cr-leaf${nova ? ' cr-leaf--new' : ''}${over ? ' is-target' : ''}`} data-cr-leaf={`${sec}:${num}`} ref={ref}
      onDragOver={(e) => { if (hasType(e, T_ART) || hasType(e, T_STICKER)) { e.preventDefault(); setOver(true); } }} onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false);
        if (hasType(e, T_STICKER)) { e.preventDefault(); onDropSticker(e.dataTransfer.getData(T_STICKER), { sec, leaf: num, pos: posAt(e) }); return; }
        const a = artFromDrop(e); if (a) { e.preventDefault(); onNewIn(a, sec, { leaf: num, pos: clampPos(posAt(e)) }); }
      }}
      onClick={(e) => { if (picked && !(e.target as HTMLElement).closest('.alb-slot, button')) onNewIn(picked, sec, { leaf: num, pos: clampPos(posAt(e)) }); }}>
      <div className="alb-page" dangerouslySetInnerHTML={{ __html: html }} />
      <div className="cr-leaf__bar">
        <span>{nova ? 'Nova página' : `Página ${num}`}{!nova && <span className="faint"> · {leafMode(leaf.stickers) === 'free' ? 'montada à mão' : 'automática'}</span>}</span>
        {onAuto && <button type="button" className="btn quiet sm" onClick={onAuto}>Automático</button>}
      </div>
    </div>
  );
}

/** Faixa de figurinhas que aceita soltar figurinhas (reordenar) e artes (criar). Marca onde a página do álbum vira. */
function StripDrop({ label, hint, children, onSticker, onArt, breaks = [] }: { label: string; hint?: string; children: ReactNode; onSticker: (id: string, before: string | null) => void; onArt?: (e: DragEvent) => void; breaks?: string[] }) {
  const [over, setOver] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [mark, setMark] = useState<string | null>(null);
  /** A figurinha sob o mouse: soltar antes dela. */
  const beforeAt = (e: DragEvent): string | null => {
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('[data-sid]') ?? []);
    for (const it of items) { const r = it.getBoundingClientRect(); if (e.clientY < r.bottom && e.clientX < r.left + r.width / 2 && e.clientY > r.top - 8) return it.dataset.sid!; }
    return null;
  };
  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.querySelectorAll('.cr-mini.is-break').forEach((x) => x.classList.remove('is-break'));
    for (const id of breaks) el.querySelector(`[data-sid="${id}"]`)?.classList.add('is-break');
  });
  return (
    <div className={`cr-strip${over ? ' is-over' : ''}`}>
      {label && <p className="cr-strip__lbl"><b>{label}</b>{hint ? <span className="faint"> {hint}</span> : null}</p>}
      <div ref={ref} className="cr-strip__row"
        onDragOver={(e) => { const st = hasType(e, T_STICKER), ar = !!onArt && hasType(e, T_ART); if (!st && !ar) return; e.preventDefault(); setOver(true); if (st) setMark(beforeAt(e) ?? 'fim'); }}
        onDragLeave={(e) => { if (!ref.current?.contains(e.relatedTarget as Node)) { setOver(false); setMark(null); } }}
        onDrop={(e) => { setOver(false); setMark(null); if (hasType(e, T_STICKER)) { e.preventDefault(); onSticker(e.dataTransfer.getData(T_STICKER), beforeAt(e)); } else if (onArt && hasType(e, T_ART)) { e.preventDefault(); onArt(e); } }}
        data-mark={mark ?? undefined}>
        {children}
      </div>
      <style>{mark && mark !== 'fim' ? `.cr-strip__row [data-sid="${CSS.escape(mark)}"]::before{opacity:1}` : ''}</style>
    </div>
  );
}

function Mini({ s, section, editing, onEdit, onDragSticker, owned }: { s: Sticker; section: string; editing: boolean; onEdit: () => void; onDragSticker: () => void; owned: number }) {
  return (
    <div className={`cr-mini${editing ? ' is-editing' : ''}${s.active ? '' : ' is-off'}`} data-sid={s.id} draggable
      onDragStart={(e) => { e.dataTransfer.setData(T_STICKER, s.id); e.dataTransfer.effectAllowed = 'move'; onDragSticker(); }}>
      <StickerView s={s} section={section} onOpen={onEdit} />
      <small title={owned ? `${owned} ${owned === 1 ? 'pessoa tem' : 'pessoas têm'}` : undefined}>{num3(s.number)} · {TIER_LABEL[s.tier]}{s.active ? '' : ' · fora'}</small>
    </div>
  );
}
