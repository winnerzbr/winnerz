/**
 * Álbum de figurinhas: a estante com os álbuns da Temporada (o primeiro chega lacrado), o livro aberto (com Minhas
 * páginas no fim do primeiro), a coleção inteira (Figurinhas), o Cofre das repetidas e os pacotes. As figurinhas são
 * da família Coroa; o álbum, Forja.
 */
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { Link, navigate } from '../lib/router';
import { useStore } from '../data/store';
import { albumApi, reloadAlbum, useAlbum, type AlbumBook as Book, type AlbumState, type Pack, type Sticker } from '../data/albumApi';
import { pastedCount, personalStickers, RULE_TEXT, RULE_TITLE, TIER_LABEL } from '../lib/album';
import { whenLabel } from '../lib/dates';
import type { DatePrecision } from '../data/types';
import { Collection } from '../components/album/Collection';
import { Vault } from '../components/album/Vault';
import { Trades } from '../components/album/Trades';
import { AlbumBook, bookPages } from '../components/album/AlbumBook';
import { PackOpening } from '../components/album/PackOpening';
import { StickerView, StickerZoom } from '../components/album/StickerView';
import { Redeem } from '../components/album/Redeem';
import { GaleraAlbum, GaleraVolume } from '../components/galera/GaleraSection';
import { coverHTML, ensureDefs, logoSvg } from '../components/album/render';
import { burst, GOLD, HOLO, reduceMotion, setSound, sfx, useSound } from '../components/album/fx';

const SEAL_KEY = (id: string, who: string) => `wz.album.lacre.${who}.${id}`;
const sealed = (id: string, who: string) => { try { return localStorage.getItem(SEAL_KEY(id, who)) !== '1'; } catch { return false; } };
const unsealSave = (id: string, who: string) => { try { localStorage.setItem(SEAL_KEY(id, who), '1'); } catch { /* sem armazenamento */ } };
const dateLabel = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');

function useCatalogMaps(state: AlbumState | null) {
  return useMemo(() => {
    const byId: Record<string, Sticker> = {}, section: Record<string, string> = {}, bookOf: Record<string, Book> = {};
    if (!state) return { byId, section, bookOf };
    for (const s of state.stickers) byId[s.id] = s;
    for (const b of state.books) for (const p of b.pages) for (const s of state.stickers) if (s.pageId === p.id) { section[s.id] = p.title; bookOf[s.id] = b; }
    return { byId, section, bookOf };
  }, [state]);
}

type View = 'pacotes' | 'figurinhas' | 'cofre' | 'trocas' | 'galera';
const TITLE: Record<View, string> = { pacotes: 'Pacotes', figurinhas: 'Figurinhas', cofre: 'Cofre', trocas: 'Trocas', galera: 'Galera' };

/** As figurinhas pessoais (jogos zerados), da Jornada da própria pessoa. */
function usePersonal() {
  const histories = useStore((s) => s.histories);
  const journeys = useStore((s) => s.journeys);
  const games = useStore((s) => s.games);
  const events = useStore((s) => s.events);
  return useMemo(() => personalStickers(histories, journeys, games, events, (iso, p) => whenLabel(iso, (p as DatePrecision | undefined) ?? 'dia')), [histories, journeys, games, events]);
}

export function AlbumPage({ slug, view, with: withHandle }: { slug?: string; view?: View; with?: string }) {
  const { state, error } = useAlbum();
  const mode = useStore((s) => s.mode);
  const profile = useStore((s) => s.profile);
  const sound = useSound();
  const maps = useCatalogMaps(state);
  const [zoom, setZoom] = useState<{ s: Sticker; el: HTMLElement | null } | null>(null);
  useEffect(() => { ensureDefs(); }, []);
  useEffect(() => { if (mode === 'supabase' && profile) void reloadAlbum().catch(() => {}); }, [mode, profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const closed = state?.packs.filter((p) => p.state === 'fechado') ?? [];
  const books = state ? [...state.books].sort((a, b) => a.season - b.season || a.position - b.position) : [];
  const book = slug ? books.find((b) => b.slug === slug) : undefined;
  const personal = usePersonal();
  const mineBook = books.find((b) => b.published);
  const tabs: [string, string, boolean, number][] = [
    ['/album', 'Estante', !view || view === 'galera', 0], ['/album/figurinhas', 'Figurinhas', view === 'figurinhas', 0], ['/album/cofre', 'Cofre', view === 'cofre', 0], ['/album/trocas', 'Trocas', view === 'trocas', state?.tradesIn ?? 0], ['/album/pacotes', 'Pacotes', view === 'pacotes', closed.length],
  ];

  const head = (
    <header className="alb-head">
      <div><span className="alb-kick">Temporada 1 · Álbum WinnerZ</span><h1 className="t big">{view ? TITLE[view] : 'Álbum'}</h1></div>
      <div className="alb-head__tools">
        {view !== 'pacotes' && <Link className="btn quiet" to="/album/pacotes#codigo">Tenho um código</Link>}
        <button className="btn quiet" aria-pressed={sound} onClick={() => setSound(!sound)}>{sound ? 'Som ligado' : 'Som desligado'}</button>
      </div>
      <nav className="subnav alb-tabs" aria-label="Seções do álbum">
        {tabs.map(([to, label, on, n]) => <Link key={to} to={to} className={`alb-tabs__a${on ? ' is-on' : ''}`} aria-current={on ? 'page' : undefined}>{label}{n > 0 && <span className="alb-tabs__n" aria-label={to.endsWith('trocas') ? `${n} recebidas` : `${n} para abrir`}>{n}</span>}</Link>)}
      </nav>
    </header>
  );

  if (mode === 'supabase' && !profile) return (
    <main className="page pad alb">{head}<div className="alb-empty"><b>Entre para ver o seu álbum.</b><p className="muted">Cada jogo que você zera na Jornada vira um pacote de figurinhas.</p><Link className="btn now" to="/entrar">Entrar</Link></div></main>
  );
  if (!state) return <main className="page pad alb">{head}{error ? <p className="awards__error" role="alert">{error}</p> : <p className="faint">Abrindo o álbum…</p>}</main>;

  return (
    <main className="page pad alb">
      {head}
      {error && <p className="awards__error" role="alert">{error}</p>}
      {view === 'galera'
        ? <GaleraAlbum vol={books.length + 1} />
        : view === 'pacotes'
        ? <PacksView state={state} maps={maps} />
        : view === 'figurinhas'
          ? <Collection state={state} personalCount={personal.length} personalBook={mineBook} onZoom={(s, el) => setZoom({ s, el })} />
          : view === 'trocas'
            ? <Trades key={withHandle ?? ''} state={state} section={maps.section} bookOf={maps.bookOf} start={withHandle} />
          : view === 'cofre'
            ? <Vault state={state} section={maps.section} bookOf={maps.bookOf} />
            : book
              ? <AlbumBook key={book.id} book={book} vol={books.indexOf(book) + 1} state={state} personal={book.id === mineBook?.id ? personal : undefined} onZoom={(s, el) => setZoom({ s, el })} onBack={() => navigate('/album')} />
              : <Shelf books={books} state={state} closed={closed.length} who={profile?.id ?? 'demo'} />}
      {zoom && <StickerZoom s={zoom.s} section={maps.section[zoom.s.id]} from={zoom.el} onClose={() => setZoom(null)} />}
    </main>
  );
}

/* ---- Estante ---- */
function Shelf({ books, state, closed, who }: { books: Book[]; state: AlbumState; closed: number; who: string }) {
  const items = useMemo(() => Object.fromEntries(state.items.map((i) => [i.id, i])), [state.items]);
  if (!books.length) return (
    <div className="alb-empty"><b>O álbum da Temporada 1 está sendo montado.</b><p className="muted">Quando ele abrir, cada jogo que você zera na Jornada vira um pacote de figurinhas. Os pacotes que você ganhar até lá ficam guardados.</p>{closed > 0 && <Link className="btn ghost" to="/album/pacotes">Ver pacotes ({closed})</Link>}</div>
  );
  return (
    <>
      {closed > 0 && (
        <div className="alb-note alb-note--now"><span><b>{closed === 1 ? 'Você tem 1 pacote para abrir.' : `Você tem ${closed} pacotes para abrir.`}</b> <span className="muted">Puxe a fita e veja o que saiu.</span></span><Link className="btn now" to="/album/pacotes">Abrir</Link></div>
      )}
      <div className="alb-shelf">
        {books.map((b, i) => {
          const ids = bookPages(b, state.stickers).flatMap((p) => p.stickers.map((s) => s.id));
          return <Volume key={b.id} book={b} vol={i + 1} have={pastedCount(ids, items)} total={ids.length} who={who} />;
        })}
        <GaleraVolume vol={books.length + 1} />
      </div>
    </>
  );
}

function Volume({ book, vol, have, total, who }: { book: Book; vol: number; have: number; total: number; who: string }) {
  const [isSealed, setSealed] = useState(() => sealed(book.id, who));
  const [fresh, setFresh] = useState(false);
  const bookRef = useRef<HTMLDivElement>(null);
  const band = useRef<HTMLButtonElement>(null);
  const open = () => { if (isSealed) { unseal(); return; } navigate(`/album/${book.slug}`); };
  function unseal() {
    if (!isSealed) return;
    const b = band.current; sfx('rip'); b?.classList.add('is-off');
    setTimeout(() => {
      sfx('legend');
      const r = bookRef.current?.getBoundingClientRect();
      if (r) { burst(r.left + r.width / 2, r.top + r.height * 0.45, GOLD, 80, 8); burst(r.left + r.width / 2, r.top + r.height * 0.45, HOLO, 40, 6); }
      unsealSave(book.id, who); setSealed(false); setFresh(true);
    }, reduceMotion() ? 0 : 450);
  }
  const onBandDown = (e: RPointerEvent<HTMLButtonElement>) => {
    e.stopPropagation(); e.preventDefault(); const b = e.currentTarget; b.setPointerCapture(e.pointerId); b.classList.add('is-drag');
    const x0 = e.clientX, w = b.getBoundingClientRect().width; let dx = 0, moved = false, last = 0;
    const mv = (ev: PointerEvent) => { dx = Math.max(0, ev.clientX - x0); if (dx > 4) moved = true; b.style.setProperty('--sx', `${dx}px`); if (dx - last > w * 0.08) { sfx('tick'); last = dx; } };
    const up = () => { b.removeEventListener('pointermove', mv); b.removeEventListener('pointerup', up); b.removeEventListener('pointercancel', up); b.classList.remove('is-drag'); if (!moved || dx > w * 0.4) unseal(); else b.style.setProperty('--sx', '0px'); };
    b.addEventListener('pointermove', mv); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
  };
  return (
    <div className={`alb-vol${isSealed ? ' is-sealed' : ''}${fresh ? ' is-fresh' : ''}`}>
      <div ref={bookRef} className="alb-vol__book">
        <button className="alb-vol__open" aria-label={isSealed ? `Tirar o lacre de ${book.title}` : `Abrir ${book.title}`} onClick={open} dangerouslySetInnerHTML={{ __html: coverHTML(book, vol) }} />
        {isSealed && (
          <span className="alb-seal">
            <button ref={band} type="button" className="alb-seal__band" aria-label="Puxar o lacre" onPointerDown={onBandDown} onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
              <span>Temporada {book.season}</span><span className="alb-seal__medal" dangerouslySetInnerHTML={{ __html: logoSvg('#e2be84') }} /><span>Puxe →</span>
            </button>
          </span>
        )}
      </div>
      <div className="alb-vol__meta"><span className="alb-bar"><i style={{ width: `${total ? Math.round((have / total) * 100) : 0}%` }} /></span>{have}/{total}</div>
      {!book.published && <span className="alb-vol__draft">Rascunho · só a administração vê</span>}
      <button className="btn ghost sm" onClick={open}>{isSealed ? 'Tirar o lacre' : 'Abrir'}</button>
      {fresh && <span className="alb-kick">Temporada aberta</span>}
    </div>
  );
}

/* ---- Pacotes ---- */
type Maps = ReturnType<typeof useCatalogMaps>;
function PacksView({ state, maps }: { state: AlbumState; maps: Maps }) {
  const [opening, setOpening] = useState<Pack | null>(null);
  const closed = state.packs.filter((p) => p.state === 'fechado');
  const held = state.packs.filter((p) => p.state === 'retido' || p.state === 'negado');
  const opened = state.packs.filter((p) => p.state === 'aberto').slice(0, 12);
  const live = state.stickers.some((s) => s.active && state.books.some((b) => b.published && b.pages.some((pg) => pg.id === s.pageId)));

  if (opening) {
    const rest = closed.filter((p) => p.id !== opening.id);
    return <PackOpening key={opening.id} pack={opening} stickers={maps.byId} sections={maps.section} more={rest.length}
      onPaste={(c) => { const first = c.find((d) => !d.dup) ?? c[0]; const b = first ? maps.bookOf[first.id] : undefined; navigate(b ? `/album/${b.slug}` : '/album'); }}
      onNext={() => setOpening(rest[0] ?? null)} onClose={() => setOpening(null)} />;
  }
  return (
    <div className="alb-packs">
      <Redeem bookOf={maps.bookOf} section={maps.section} onPacks={(ps) => { if (live && ps[0]) setOpening(ps[0]); }} />
      <section className="alb-packs__sec">
        <h2 className="t">Para abrir</h2>
        {!live && closed.length > 0 && <p className="alb-note" style={{ marginTop: 12 }}><span><b>O álbum ainda não abriu.</b> <span className="muted">Seus pacotes ficam guardados e podem ser abertos assim que as figurinhas da Temporada forem publicadas.</span></span></p>}
        {closed.length === 0
          ? <p className="muted">Nenhum pacote fechado. Zere um jogo na Jornada para ganhar o próximo.</p>
          : <ul className="alb-packlist">{closed.map((p, i) => (
            <li key={p.id} className="alb-packrow">
              <PackThumb p={p} />
              <div className="alb-packrow__body">
                <b>{packTitle(p)}</b>
                <p className="muted">{packWhy(p)} · {dateLabel(p.createdAt)}</p>
                <div className="alb-packrow__acts"><button className="btn now sm" disabled={!live} data-tv-primeiro={i === 0 ? '' : undefined} onClick={() => setOpening(p)}>Abrir</button></div>
              </div>
            </li>))}</ul>}
      </section>
      {held.length > 0 && (
        <section className="alb-packs__sec">
          <h2 className="t">Guardados para revisão</h2>
          <ul className="alb-packlist">{held.map((p) => <HeldRow key={p.id} p={p} />)}</ul>
        </section>
      )}
      {opened.length > 0 && (
        <section className="alb-packs__sec">
          <h2 className="t">Abertos</h2>
          <ul className="alb-packlist">{opened.map((p) => (
            <li key={p.id} className="alb-packrow">
              <PackThumb p={p} />
              <div className="alb-packrow__body">
                <b>{packTitle(p)}</b>
                <p className="muted">{packWhy(p)} · aberto em {dateLabel(p.openedAt ?? p.createdAt)}</p>
                <div className="alb-packrow__mini">{(p.contents ?? []).map((d, i) => maps.byId[d.id] ? <StickerView key={i} s={maps.byId[d.id]} /> : null)}</div>
                {p.contents && <p className="faint" style={{ fontSize: 12 }}>{p.contents.map((d) => maps.byId[d.id] ? `${maps.byId[d.id].name} (${TIER_LABEL[d.tier]}${d.dup ? ', repetida' : ''})` : `figurinha retirada do álbum (${TIER_LABEL[d.tier]})`).join(' · ')}</p>}
              </div>
            </li>))}</ul>
        </section>
      )}
    </div>
  );
}
const packTitle = (p: Pack) => p.origin === 'boas_vindas' ? 'Pacote de boas-vindas' : (p.kind === 'prisma' ? 'Pacote especial' : 'Pacote') + (p.origin === 'memoria' ? ' de memória' : '');
const packWhy = (p: Pack) => p.origin === 'boas_vindas' ? 'Presente da sua chegada ao WinnerZ' : p.origin === 'codigo' ? `Código${p.reason ? `: ${p.reason}` : ''}` : p.origin === 'twitch' ? 'Pontos do canal na Twitch' : p.origin === 'jornada' ? (p.game ? `Por zerar ${p.game.title}` : 'Pela Jornada') : p.origin === 'memoria' ? 'Pelos jogos que você já tinha zerado' : (p.reason ? `Presente do WinnerZ: ${p.reason}` : 'Presente do WinnerZ');
function PackThumb({ p }: { p: Pack }) {
  return <span className={`alb-packrow__img${p.kind === 'prisma' ? ' alb-packrow__img--prisma' : ''}`} aria-hidden="true" dangerouslySetInnerHTML={{ __html: logoSvg(p.kind === 'prisma' ? '#16121f' : '#e2be84') }} />;
}

function HeldRow({ p }: { p: Pack }) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const send = async () => {
    setBusy(true); setErr('');
    try { await albumApi.reviewAsk(p.id, text); setOpen(false); setText(''); } catch (e) { setErr(e instanceof Error ? e.message : 'Não deu certo agora.'); } finally { setBusy(false); }
  };
  const r = p.review;
  return (
    <li className="alb-packrow">
      <PackThumb p={p} />
      <div className="alb-packrow__body">
        <b>{p.rule ? RULE_TITLE[p.rule] : 'Pacote guardado'}{p.game ? ` · ${p.game.title}` : ''}</b>
        <p className="alb-held">{p.state === 'negado' ? `A revisão não liberou este pacote${p.note ? `: ${p.note}` : '.'}` : p.rule ? RULE_TEXT[p.rule] : 'Este pacote ficou guardado.'}</p>
        {r?.state === 'aberta' && <p className="faint" style={{ fontSize: 13 }}>Revisão pedida em {dateLabel(r.createdAt)}. A administração vai olhar e você recebe um aviso.</p>}
        {r?.state === 'respondida' && p.state === 'negado' && <p className="faint" style={{ fontSize: 13 }}>Resposta: {r.answer}</p>}
        {p.state === 'retido' && r?.state !== 'aberta' && !open && <div className="alb-packrow__acts"><button className="btn ghost sm" onClick={() => setOpen(true)}>Pedir revisão</button></div>}
        {open && (
          <div className="alb-review">
            <label className="faint" htmlFor={`rv-${p.id}`} style={{ fontSize: 13 }}>Conte o que aconteceu (por exemplo: joguei o fim de semana inteiro, ou comecei em outro aparelho).</label>
            <textarea id={`rv-${p.id}`} className="field" maxLength={400} value={text} onChange={(e) => setText(e.target.value)} />
            {err && <p className="awards__error" role="alert">{err}</p>}
            <div className="alb-packrow__acts"><button className="btn now sm" disabled={busy || text.trim().length < 3} onClick={() => void send()}>{busy ? 'Enviando…' : 'Enviar'}</button><button className="btn quiet sm" onClick={() => setOpen(false)}>Cancelar</button></div>
          </div>
        )}
      </div>
    </li>
  );
}
