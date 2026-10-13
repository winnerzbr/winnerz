import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, navigate } from '../lib/router';
import { actions, useStore, journeyForGame, currentHistory, myGame, historiesOf } from '../data/store';
import type { Copy, CopyKind, State } from '../data/types';
import { FavoriteButton, useFavorite } from '../components/FavoriteCover';
import { Icon } from '../components/Icon';
import { AddGameDialog } from '../components/AddGameDialog';
import { GameSwap } from '../components/GameSwap';
import { SubNav } from '../components/SubNav';
import { CoverArt } from '../components/CoverArt';
import { Sheet, ConfirmButton } from '../components/Sheet';
import { PastButton } from '../components/PastPlay';
import { STATE_LABEL } from '../components/JourneyManage';
import { canonicalPlatform, platformRank, shortPlatform } from '../lib/platforms';
import { titleKey } from '../lib/importer';
import { collectionCsv, download } from '../lib/exportData';

type Status = 'tudo' | 'nunca' | 'jogando' | 'zerados' | 'largados' | 'naovou' | 'prioridade' | 'favoritos' | 'especial';
type Sort = 'az' | 'plataforma' | 'prioridade' | 'curtos' | 'recentes';
const STATUS: [Status, string][] = [
  ['tudo', 'Tudo'], ['nunca', 'Nunca joguei'], ['prioridade', 'Prioridade alta'], ['jogando', 'Jogando ou pausados'],
  ['zerados', 'Zerados'], ['largados', 'Largados ou encerrados'], ['naovou', 'Não vou jogar'], ['favoritos', 'Favoritos'], ['especial', 'Especial para mim'],
];
const SORTS: [Sort, string][] = [['az', 'A a Z'], ['plataforma', 'Plataforma'], ['prioridade', 'Prioridade'], ['curtos', 'Mais curtos primeiro'], ['recentes', 'Adicionados por último']];
const PAGE = 48;

const VIEW_KEY = 'wz.colecao.view';
function loadView(): { sort: Sort; group: boolean } {
  try { return { sort: 'az', group: false, ...JSON.parse(localStorage.getItem(VIEW_KEY) || '{}') }; } catch { return { sort: 'az', group: false }; }
}

/** Situação do jogo para filtros e selos. */
function situation(s: State, gameId: string) {
  const j = journeyForGame(s, gameId);
  const h = j ? currentHistory(s, j.id) : null;
  const zerou = j ? historiesOf(s, j.id).some((x) => x.state === 'concluida') : false;
  return { j, h, zerou, open: h?.state === 'ativa' || h?.state === 'pausada', left: h?.state === 'dropada' || h?.state === 'encerrada' };
}

export function Collection() {
  const s = useStore((x) => x);
  const [q, setQ] = useState('');
  const [platform, setPlatform] = useState(() => new URLSearchParams(location.search).get('plataforma') ?? '');
  const [kind, setKind] = useState<'tudo' | CopyKind>('tudo');
  const [status, setStatus] = useState<Status>('tudo');
  const [view, setView] = useState(loadView);
  const [adding, setAdding] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => { try { localStorage.setItem(VIEW_KEY, JSON.stringify(view)); } catch { /* nada */ } }, [view]);
  useEffect(() => setLimit(PAGE), [q, platform, kind, status, view]);

  const platforms = useMemo(() => {
    const n: Record<string, number> = {};
    for (const c of s.copies) { const p = canonicalPlatform(c.platform); n[p] = (n[p] ?? 0) + 1; }
    return Object.entries(n).sort((a, b) => platformRank(a[0]) - platformRank(b[0]) || a[0].localeCompare(b[0]));
  }, [s.copies]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const out = s.copies.filter((c) => {
      const g = s.games[c.gameId];
      if (!g) return false;
      if (t && !g.title.toLowerCase().includes(t)) return false;
      if (platform && canonicalPlatform(c.platform) !== platform) return false;
      if (kind !== 'tudo' && c.kind !== kind) return false;
      if (status === 'tudo') return true;
      const m = myGame(s, c.gameId);
      const st = situation(s, c.gameId);
      switch (status) {
        case 'nunca': return !st.j && !m.wontPlay;
        case 'prioridade': return m.priority === 1 && !st.zerou;
        case 'jogando': return st.open;
        case 'zerados': return st.zerou;
        case 'largados': return st.left;
        case 'naovou': return !!m.wontPlay;
        case 'favoritos': return s.favorites.includes(c.gameId);
        case 'especial': return !!c.special;
      }
      return true;
    });
    const title = (c: Copy) => s.games[c.gameId].title;
    const by: Record<Sort, (a: Copy, b: Copy) => number> = {
      az: (a, b) => title(a).localeCompare(title(b), 'pt-BR'),
      plataforma: (a, b) => platformRank(a.platform) - platformRank(b.platform) || title(a).localeCompare(title(b), 'pt-BR'),
      prioridade: (a, b) => (myGame(s, a.gameId).priority ?? 4) - (myGame(s, b.gameId).priority ?? 4) || title(a).localeCompare(title(b), 'pt-BR'),
      curtos: (a, b) => (myGame(s, a.gameId).estHours ?? 999) - (myGame(s, b.gameId).estHours ?? 999) || title(a).localeCompare(title(b), 'pt-BR'),
      recentes: () => 0,
    };
    if (view.sort === 'recentes') return out.reverse();
    return out.sort(view.group ? (a, b) => platformRank(a.platform) - platformRank(b.platform) || by[view.sort](a, b) : by[view.sort]);
  }, [s, q, platform, kind, status, view]);

  // Rolagem infinita: mais capas aparecem quando o fim da grade chega perto da tela.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || limit >= list.length) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) setLimit((n) => n + PAGE); }, { rootMargin: '800px' });
    io.observe(el);
    return () => io.disconnect();
  }, [limit, list.length]);

  // Sinal barato de repetidos (mesmo nome com e sem ficha); a tela de reparo faz a conta completa.
  const dupHint = useMemo(() => {
    const owned = new Set(s.copies.map((c) => c.gameId));
    const igdb = new Set<string>(), manual: string[] = [];
    for (const id of owned) { const g = s.games[id]; if (!g) continue; if (g.source === 'manual') manual.push(titleKey(g.title)); else igdb.add(titleKey(g.title)); }
    return manual.filter((k) => igdb.has(k)).length;
  }, [s.copies, s.games]);

  const shown = list.slice(0, limit);
  const uniqueGames = new Set(s.copies.map((c) => c.gameId)).size;
  const filtered = q || platform || kind !== 'tudo' || status !== 'tudo';

  // Agrupado por plataforma: um título antes da primeira capa de cada plataforma.
  const cells: ({ type: 'head'; platform: string; n: number } | { type: 'copy'; c: Copy })[] = [];
  let lastP = '';
  for (const c of shown) {
    const p = canonicalPlatform(c.platform);
    if (view.group && p !== lastP) { cells.push({ type: 'head', platform: p, n: list.filter((x) => canonicalPlatform(x.platform) === p).length }); lastP = p; }
    cells.push({ type: 'copy', c });
  }

  return (
    <main className="page pad collection">
      <header className="page-head">
        <div className="page-head__text">
          <h1 className="t big">Coleção</h1>
          <p className="muted lead">{!uniqueGames ? 'Nenhum jogo ainda.' : <><span className="lead__strong">{uniqueGames} {uniqueGames === 1 ? 'jogo' : 'jogos'}</span> em {platforms.length} {platforms.length === 1 ? 'plataforma' : 'plataformas'}{s.wishes.length ? `, mais ${s.wishes.length} ${s.wishes.length === 1 ? 'desejo' : 'desejos'}` : ''}.</>}</p>
        </div>
        <div className="page-head__side">
          <div className="collection__tools">
            <Link className="btn ghost" to="/colecao/importar">Importar planilha</Link>
            <button className="btn ghost" onClick={() => download(new Blob([collectionCsv(s)], { type: 'text/csv;charset=utf-8' }), `winnerz-colecao-${new Date().toISOString().slice(0, 10)}.csv`)} disabled={!s.copies.length}>Exportar planilha</button>
            <button className="btn primary" onClick={() => setAdding(true)}><Icon name="mais" size={16} />Adicionar jogo</button>
          </div>
          <SubNav pillar="colecao" />
        </div>
      </header>

      {dupHint > 0 && (
        <div className="card repair-banner" role="status">
          <p><strong>Alguns jogos estão repetidos</strong> <span className="muted">(com e sem ficha do IGDB). Dá para juntar cada par em um só, sem perder nada.</span></p>
          <Link className="btn primary sm" to="/colecao/reparar">Arrumar repetidos</Link>
        </div>
      )}

      <div className={`collection__body${s.copies.length ? '' : ' is-empty'}`}>
      {s.copies.length > 0 && (
        <aside className={`cfilters${showFilters ? ' is-open' : ''}`} role="search" aria-label="Filtros da estante">
          <div className="cfilters__top">
            <div className="cfilters__q">
              <Icon name="busca" size={16} />
              <label htmlFor="busca" className="sr-only">Buscar na estante</label>
              <input id="busca" className="field" placeholder="Buscar na estante" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <button className={`icon-btn cfilters__toggle${filtered ? ' has-dot' : ''}`} aria-expanded={showFilters} aria-controls="cfilters-body" aria-label="Filtros e ordem" onClick={() => setShowFilters(!showFilters)}><Icon name="filtro" size={18} /></button>
          </div>
          <div className="cfilters__body" id="cfilters-body">
            <div className="cfilters__group">
              <span className="kicker">Plataforma</span>
              <div className="cfilters__chips" role="group" aria-label="Plataforma">
                {platforms.map(([p, n]) => <button key={p} className="chip" aria-pressed={platform === p} onClick={() => setPlatform(platform === p ? '' : p)}>{shortPlatform(p)} <small>{n}</small></button>)}
              </div>
            </div>
            <div className="cfilters__group">
              <span className="kicker">Situação</span>
              <div className="cfilters__chips" role="group" aria-label="Situação">
                {STATUS.filter(([id]) => id !== 'tudo').map(([id, l]) => <button key={id} className="chip" aria-pressed={status === id} onClick={() => setStatus(status === id ? 'tudo' : id)}>{l}</button>)}
              </div>
            </div>
            <div className="cfilters__group">
              <span className="kicker">Formato</span>
              <div className="seg" role="group" aria-label="Formato">
                {([['tudo', 'Tudo'], ['fisico', 'Físico'], ['digital', 'Digital']] as const).map(([k, l]) => <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)}>{l}</button>)}
              </div>
            </div>
            <div className="cfilters__group">
              <label className="kicker" htmlFor="ordem">Ordem</label>
              <select id="ordem" className="field" value={view.sort} onChange={(e) => setView({ ...view, sort: e.target.value as Sort })}>
                {SORTS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
              </select>
            </div>
            <label className="cfilters__switch">
              <span>Separar por plataforma</span>
              <input type="checkbox" role="switch" className="switch" checked={view.group} onChange={() => setView({ ...view, group: !view.group })} />
            </label>
            {filtered && <p className="muted cbar__count">{list.length} {list.length === 1 ? 'cópia' : 'cópias'} com esses filtros. <button className="linklike" onClick={() => { setQ(''); setPlatform(''); setKind('tudo'); setStatus('tudo'); }}>Limpar filtros</button></p>}
          </div>
        </aside>
      )}

      <div className="collection__main">
      {s.copies.length === 0 ? (
        <div className="card tl-empty">
          <p className="t" style={{ fontSize: 30, color: 'var(--ink)' }}>Sua estante está vazia</p>
          <p className="muted">Comece pelo jogo que está na sua mesa agora, ou traga sua planilha inteira de uma vez.</p>
          <div className="hero__actions">
            <button className="btn primary" onClick={() => setAdding(true)}><Icon name="mais" size={16} />Adicionar o primeiro jogo</button>
            <Link className="btn ghost" to="/colecao/importar">Importar planilha</Link>
          </div>
        </div>
      ) : list.length === 0 ? (
        <p className="card tl-empty">Nada aqui com esses filtros.</p>
      ) : (
        <div className="cgrid">
          {cells.map((cell) => cell.type === 'head' ? (
            <h2 key={`h-${cell.platform}`} className="cgrid__head t">{shortPlatform(cell.platform)} <span className="faint">{cell.n}</span></h2>
          ) : (
            <CopyTile key={cell.c.id} s={s} c={cell.c} onOpen={() => setOpen(cell.c.id)} />
          ))}
          <div ref={sentinel} className="cgrid__sentinel" aria-hidden="true" />
        </div>
      )}
      {limit < list.length && <p className="faint cgrid__more">Mostrando {limit} de {list.length}. Role para ver mais.</p>}
      {(s.trashCopies?.length ?? 0) + (s.trashHardware?.length ?? 0) > 0 && <p className="collection__trash"><Link to="/colecao/lixeira">Lixeira ({(s.trashCopies?.length ?? 0) + (s.trashHardware?.length ?? 0)})</Link> · o que você tirou da coleção nos últimos 30 dias</p>}
      </div>
      </div>

      {open && <CopySheet copyId={open} onClose={() => setOpen(null)} />}
      {adding && <AddGameDialog onClose={() => setAdding(false)} />}
    </main>
  );
}

function CopyTile({ s, c, onOpen }: { s: State; c: Copy; onOpen: () => void }) {
  const g = s.games[c.gameId];
  const st = situation(s, c.gameId);
  const m = myGame(s, c.gameId);
  const fav = s.favorites.includes(g.id);
  const badge = st.zerou ? 'Zerado' : st.h?.state === 'ativa' ? 'Jogando' : st.h?.state === 'pausada' ? 'Pausado' : st.left ? 'Largado' : m.wontPlay ? 'Não vou jogar' : null;
  return (
    <button className={`ctile${m.wontPlay ? ' is-muted' : ''}`} onClick={onOpen} aria-label={`${g.title}, ${shortPlatform(c.platform)}${badge ? `, ${badge.toLowerCase()}` : ''}${fav ? ', favorito' : ''}`}>
      <span className="ctile__cover"><CoverArt game={g} platform={c.platform} /></span>
      {badge && <span className={`ctile__badge ctile__badge--${st.zerou ? 'ok' : st.open ? 'now' : 'off'}`} aria-hidden="true">{badge}</span>}
      {fav && <span className="ctile__fav" aria-hidden="true"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" /></svg></span>}
      <span className="ctile__meta" aria-hidden="true"><span className="ctile__title">{g.title}</span><span className="ctile__plat">{shortPlatform(c.platform)} · {c.kind === 'digital' ? 'digital' : c.kind === 'fisico' ? 'físico' : c.kind === 'assinatura' ? 'assinatura' : 'outro'}</span></span>
    </button>
  );
}

const money = (n?: number) => (n == null ? '' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
const dateBr = (d?: string) => (d ? new Date(`${d}T12:00:00-03:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

/** A cópia aberta: tudo sobre o exemplar, a relação com o jogo e a edição da ficha. */
function CopySheet({ copyId, onClose }: { copyId: string; onClose: () => void }) {
  const s = useStore((x) => x);
  const c = s.copies.find((x) => x.id === copyId);
  const [editing, setEditing] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [swapped, setSwapped] = useState('');
  const fav = useFavorite(c?.gameId ?? '');
  if (!c) return null;
  const g = s.games[c.gameId];
  if (!g) return null;
  const st = situation(s, c.gameId);
  const m = myGame(s, c.gameId);
  const kindLabel = c.kind === 'fisico' ? 'Mídia física' : c.kind === 'digital' ? 'Digital' : c.kind === 'assinatura' ? 'Pelo serviço de assinatura' : 'Outro';
  const rows: [string, string | undefined][] = [
    ['Região', c.region], ['Edição', c.edition], ['Condição da mídia', c.condition], ['Caixa e encarte', c.boxCondition],
    ['Itens inclusos', c.items], ['Comprado em', dateBr(c.purchasedOn)], ['Onde comprou', c.purchasePlace],
    ['Valor pago', money(c.pricePaid)], ['Valor atual (estimado)', money(c.priceNow)], ['Como chegou', c.origin],
  ];
  const journeyText = !st.j ? (m.wontPlay ? 'Marcado como “não vou jogar”. Ter não obriga a jogar.' : 'Nenhuma Jornada com este jogo ainda. Ter não obriga a jogar.')
    : `${STATE_LABEL[st.h!.state]}${st.h?.state === 'ativa' && st.h.progress != null ? `, ${st.h.progress}%` : ''}.${st.zerou && st.h?.state !== 'concluida' ? ' Já zerou antes.' : ''}`;

  return (
    <Sheet title={g.title} onClose={onClose} labelId="copia" wide>
      {swapping ? (
        <GameSwap game={g} copy={c} onCancel={() => setSwapping(false)}
          onDone={(ng, scope) => { setSwapping(false); setSwapped(scope === 'copia' ? `Pronto: este exemplar agora é ${ng.title}.` : `Pronto: tudo o que era deste jogo agora é ${ng.title}.`); }} />
      ) : !editing ? (
        <div className="csheet">
          <div className="csheet__top">
            <span className="csheet__cover"><CoverArt game={g} platform={c.platform} lazy={false} /></span>
            <div>
              <div className="muted">{kindLabel}, {shortPlatform(c.platform)}</div>
              {c.special && <div className="copy-panel__special"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5l2.4 7.1 7.1 2.4-7.1 2.4-2.4 7.1-2.4-7.1L2.5 12l7.1-2.4z" /></svg>Especial para mim</div>}
              <p className="csheet__journey">{journeyText}</p>
              <div className="csheet__actions">
                {st.j ? <Link className="btn primary sm" to={`/jornada/${g.slug}`} onClick={onClose}>Abrir a Jornada</Link>
                  : <button className="btn primary sm" onClick={() => { actions.play(g.id); onClose(); navigate('/sessao'); }}><Icon name="play" size={13} />Começar a jogar</button>}
                {!st.zerou && <PastButton gameId={g.id} className="btn ghost sm" />}
                <FavoriteButton fav={fav.fav} burst={fav.burst} onClick={fav.toggle} labels={['Favoritar', 'Favorito']} className="btn ghost sm" />
              </div>
            </div>
          </div>

          <div className="relation__mine">
            <div className="relation__row">
              <span className="muted">Prioridade</span>
              <div className="chips chips--sm" role="group" aria-label="Prioridade">
                {([1, 2, 3] as const).map((p) => <button key={p} className="chip" aria-pressed={m.priority === p} onClick={() => actions.setMyGame(g.id, { priority: m.priority === p ? undefined : p })}>{p === 1 ? 'Alta' : p === 2 ? 'Média' : 'Baixa'}</button>)}
              </div>
            </div>
            {m.estHours != null && <div className="relation__row"><span className="muted">Tempo estimado para zerar</span><span>{String(m.estHours).replace('.', ',')} h</span></div>}
            {m.genre && <div className="relation__row"><span className="muted">Seu gênero</span><span>{m.genre}</span></div>}
            {!st.open && <button className="btn quiet sm" aria-pressed={!!m.wontPlay} onClick={() => actions.toggleWontPlay(g.id)}>{m.wontPlay ? 'Não vou jogar (desfazer)' : 'Não vou jogar'}</button>}
          </div>

          {rows.some(([, v]) => v) ? (
            <dl className="csheet__dl">{rows.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          ) : <p className="faint">A ficha deste exemplar está em branco. Região, edição, condição e compra são opcionais.</p>}
          {c.note && <div className="copy-panel__note"><div className="faint"><Icon name="cadeado" size={12} /> Nota só sua</div><p className="quote">“{c.note}”</p></div>}

          {swapped && <p className="gswap__ok" role="status">{swapped}</p>}
          <div className="sheet__actions">
            <button className="btn ghost" onClick={() => setEditing(true)}>Editar ficha do exemplar</button>
            <Link className="btn quiet" to={`/jogos/${g.slug}`} onClick={onClose}>Abrir a ficha do jogo</Link>
          </div>
          <p className="gswap__ask faint">Não é este jogo? <button className="gswap__link" onClick={() => { setSwapped(''); setSwapping(true); }}>Trocar pelo jogo certo do catálogo</button></p>
        </div>
      ) : (
        <CopyForm copy={c} onDone={() => setEditing(false)} onDeleted={onClose} />
      )}
    </Sheet>
  );
}

const CONDITIONS = ['Lacrado', 'Novo', 'Muito bom', 'Bom', 'Regular', 'Ruim'];

function CopyForm({ copy, onDone, onDeleted }: { copy: Copy; onDone: () => void; onDeleted: () => void }) {
  const g = useStore((s) => s.games[copy.gameId]);
  const trash = useStore((s) => s.mode === 'demo' || !!s.schemaV14);
  const [f, setF] = useState({
    platform: copy.platform, kind: copy.kind, region: copy.region ?? '', edition: copy.edition ?? '', condition: copy.condition ?? '',
    boxCondition: copy.boxCondition ?? '', items: copy.items ?? '', purchasedOn: copy.purchasedOn ?? '', purchasePlace: copy.purchasePlace ?? '',
    pricePaid: copy.pricePaid != null ? String(copy.pricePaid).replace('.', ',') : '', priceNow: copy.priceNow != null ? String(copy.priceNow).replace('.', ',') : '',
    origin: copy.origin ?? '', note: copy.note ?? '', special: !!copy.special,
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const num = (v: string) => { const n = Number(v.replace(/\./g, '').replace(',', '.')); return v.trim() && isFinite(n) ? n : undefined; };
  const txt = (v: string) => v.trim() || undefined;
  const save = () => {
    actions.updateCopy(copy.id, {
      platform: f.platform, kind: f.kind, region: txt(f.region), edition: txt(f.edition), condition: txt(f.condition), boxCondition: txt(f.boxCondition),
      items: txt(f.items), purchasedOn: txt(f.purchasedOn), purchasePlace: txt(f.purchasePlace), pricePaid: num(f.pricePaid), priceNow: num(f.priceNow),
      origin: txt(f.origin), note: txt(f.note), special: f.special,
    });
    onDone();
  };
  const plats = [...new Set([canonicalPlatform(copy.platform), ...(g?.platforms ?? []).map(canonicalPlatform)])];
  return (
    <form className="cform" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <p className="muted sheet__lead">Tudo é opcional. Preencha só o que você sabe.</p>
      <div className="cform__grid">
        <label>Plataforma<select className="field" value={canonicalPlatform(f.platform)} onChange={set('platform')}>{plats.map((p) => <option key={p} value={p}>{shortPlatform(p)}</option>)}</select></label>
        <label>Formato<select className="field" value={f.kind} onChange={set('kind')}><option value="fisico">Mídia física</option><option value="digital">Digital</option><option value="assinatura">Assinatura</option><option value="outro">Outro</option></select></label>
        <label>Região<input className="field" value={f.region} onChange={set('region')} placeholder="Ex.: BR, US, JP" list="regions" /></label>
        <label>Edição<input className="field" value={f.edition} onChange={set('edition')} placeholder="Ex.: Greatest Hits" /></label>
        <label>Condição da mídia<input className="field" value={f.condition} onChange={set('condition')} list="conds" /></label>
        <label>Caixa e encarte<input className="field" value={f.boxCondition} onChange={set('boxCondition')} list="conds" /></label>
        <label className="cform__wide">Itens inclusos<input className="field" value={f.items} onChange={set('items')} placeholder="Ex.: caixa, disco, manual, pôster" /></label>
        <label>Data da compra<input className="field" type="date" value={f.purchasedOn} onChange={set('purchasedOn')} /></label>
        <label>Onde comprou<input className="field" value={f.purchasePlace} onChange={set('purchasePlace')} /></label>
        <label>Valor pago (R$)<input className="field" inputMode="decimal" value={f.pricePaid} onChange={set('pricePaid')} /></label>
        <label>Valor atual estimado (R$)<input className="field" inputMode="decimal" value={f.priceNow} onChange={set('priceNow')} /></label>
        <label className="cform__wide">Como chegou<input className="field" value={f.origin} onChange={set('origin')} placeholder="Ex.: presente do meu irmão, 2009" /></label>
        <label className="cform__wide">Nota só sua<textarea className="field" rows={2} value={f.note} onChange={set('note')} /></label>
      </div>
      <label className="cform__check"><input type="checkbox" checked={f.special} onChange={(e) => setF({ ...f, special: e.target.checked })} /> Especial para mim</label>
      <datalist id="conds">{CONDITIONS.map((c) => <option key={c} value={c} />)}</datalist>
      <datalist id="regions">{['BR', 'US', 'EU', 'JP', 'Asia'].map((c) => <option key={c} value={c} />)}</datalist>
      <div className="sheet__actions">
        <button type="submit" className="btn primary lg">Salvar</button>
        <button type="button" className="btn quiet" onClick={onDone}>Cancelar</button>
      </div>
      <div className="sheet__danger">
        <ConfirmButton label={trash ? 'Mover para a lixeira' : 'Tirar este exemplar da coleção'} confirm={trash ? 'Toque de novo para mover' : 'Toque de novo para tirar'} onConfirm={() => { actions.deleteCopy(copy.id); onDeleted(); }} />
        <p className="faint">{trash ? 'Fica 30 dias na lixeira e volta com um toque. ' : ''}A Jornada e as notas do jogo continuam.</p>
      </div>
    </form>
  );
}
