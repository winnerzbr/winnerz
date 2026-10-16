import { useEffect, useMemo, useRef, useState, type KeyboardEvent as RKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { navigate } from '../lib/router';
import { useStore } from '../data/store';
import { searchGames, type Hit } from './AddGameDialog';
import { CoverArt } from './CoverArt';
import { Icon } from './Icon';
import { norm } from '../lib/importer';
import { shortPlatform } from '../lib/platforms';
import { track } from '../lib/track';
import { searchApi, EMPTY_HITS, type CommunityHits } from '../data/searchApi';

type Item = { key: string; group: string; title: string; meta?: string; to: string; cover?: { title: string; cover: string }; icon?: string };

const PAGES: [string, string, string][] = [
  ['Estante', '/colecao', 'estante coleção jogos'], ['Estatísticas da coleção', '/colecao/estatisticas', 'estatisticas numeros'], ['Desejos', '/colecao/desejos', 'desejos lista'],
  ['Importar planilha', '/colecao/importar', 'importar planilha excel csv'], ['Importar da Steam', '/colecao/steam', 'importar steam pc horas'], ['Jornada', '/jornada', 'jornada jogando foco'], ['Histórias concluídas', '/jornada/concluidas', 'zerados concluidas historias'], ['Linha do tempo geral', '/jornada/linha-do-tempo', 'linha do tempo tudo historico'], ['Meu ritmo', '/jornada/ritmo', 'ritmo semana estatisticas jornada'],
  ['Explorar jogos', '/jogos/explorar', 'explorar catalogo genero'], ['Radar de lançamentos', '/jogos/radar', 'radar lancamentos calendario'], ['Trilhas', '/jogos/trilhas', 'trilhas sequencia saga ordem'], ['Preferências', '/preferencias', 'preferencias tema escala'],
  ['WinnerZ Awards', '/eventos/awards', 'awards premio votacao eventos'], ['Álbum de figurinhas', '/album', 'album figurinhas colecionar temporada'], ['Pacotes de figurinhas', '/album/pacotes', 'pacotes abrir figurinhas'], ['Minhas figurinhas', '/album/figurinhas', 'figurinhas colecao repetidas faltam'], ['Cofre do álbum', '/album/cofre', 'cofre repetidas trocar figurinha'], ['Trocas de figurinhas', '/album/trocas', 'trocas trocar figurinhas repetidas propostas'],
];

export const openSearch = () => window.dispatchEvent(new Event('wz:search'));

/** Busca universal (Ctrl+K ou /): jogos do seu acervo, Jornadas, momentos, páginas e o IGDB, num campo só. */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const typing = /input|textarea|select/i.test((e.target as HTMLElement)?.tagName ?? '') || (e.target as HTMLElement)?.isContentEditable;
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); setOpen((v) => !v); }
      else if (e.key === '/' && !typing) { e.preventDefault(); setOpen(true); }
    };
    const ev = () => setOpen(true);
    document.addEventListener('keydown', key);
    window.addEventListener('wz:search', ev);
    return () => { document.removeEventListener('keydown', key); window.removeEventListener('wz:search', ev); };
  }, []);
  if (!open) return null;
  return createPortal(<Palette onClose={() => setOpen(false)} />, document.body);
}

function Palette({ onClose }: { onClose: () => void }) {
  const s = useStore((x) => x);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const [remote, setRemote] = useState<Hit[]>([]);
  const [cm, setCm] = useState<CommunityHits>(EMPTY_HITS);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  useEffect(() => { input.current?.focus(); track('busca.universal'); }, []);

  useEffect(() => {
    if (q.trim().length < 2) { setRemote([]); setCm(EMPTY_HITS); return; }
    const t = setTimeout(async () => {
      const [r, c] = await Promise.all([searchGames(q.trim(), []), searchApi.community(q.trim(), 3).catch(() => EMPTY_HITS)]);
      setRemote(r.source === 'igdb' ? r.hits.slice(0, 6) : []); setCm(c);
    }, 280);
    return () => clearTimeout(t);
  }, [q]);

  const items = useMemo<Item[]>(() => {
    const t = norm(q);
    const out: Item[] = [];
    if (!t) {
      // Sem texto: atalhos para o que está em andamento e as páginas.
      for (const j of s.journeys.slice(-5).reverse()) { const g = s.games[j.gameId]; if (g) out.push({ key: `j-${j.id}`, group: 'Jornadas', title: g.title, to: `/jornada/${g.slug}`, cover: g }); }
      for (const [title, to] of PAGES.slice(0, 6)) out.push({ key: `p-${to}`, group: 'Ir para', title, to });
      return out;
    }
    const has = (x?: string) => !!x && norm(x).includes(t);
    const owned = new Set(s.copies.map((c) => c.gameId));
    const journeyOf = new Map(s.journeys.map((j) => [j.gameId, j]));
    const mine = Object.values(s.games).filter((g) => (owned.has(g.id) || journeyOf.has(g.id) || s.wishes.some((w) => w.gameId === g.id)) && has(g.title))
      .sort((a, b) => Number(norm(b.title).startsWith(t)) - Number(norm(a.title).startsWith(t)) || a.title.localeCompare(b.title, 'pt-BR')).slice(0, 8);
    for (const g of mine) {
      const j = journeyOf.get(g.id);
      const c = s.copies.find((x) => x.gameId === g.id);
      out.push({ key: `g-${g.id}`, group: 'No seu acervo', title: g.title, meta: [c && shortPlatform(c.platform), j ? 'tem Jornada' : null].filter(Boolean).join(', '), to: j ? `/jornada/${g.slug}` : `/jogos/${g.slug}`, cover: g });
    }
    const moments = s.events.filter((e) => (e.kind === 'momento' || e.kind === 'ponto' || e.kind === 'sessao') && (has(e.title) || has(e.quote) || has(e.text))).slice(-6).reverse();
    for (const e of moments) {
      const j = s.journeys.find((x) => x.id === e.journeyId); const g = j && s.games[j.gameId];
      if (g) out.push({ key: `e-${e.id}`, group: 'Momentos e recados', title: e.quote ? `“${e.quote}”` : e.title, meta: g.title, to: `/jornada/${g.slug}` });
    }
    for (const [title, to, words] of PAGES) if (has(title) || norm(words).includes(t)) out.push({ key: `p-${to}`, group: 'Ir para', title, to });
    const known = new Set(mine.map((g) => g.slug));
    for (const h of remote) if (!known.has(h.slug)) out.push({ key: `r-${h.slug}`, group: 'No catálogo', title: h.title, meta: [h.year, h.platforms.slice(0, 2).map(shortPlatform).join(', ')].filter(Boolean).join(' · '), to: `/jogos/${h.slug}`, cover: { title: h.title, cover: h.cover } });
    for (const p of cm.pessoas) out.push({ key: `u-${p.id}`, group: 'Pessoas', title: `@${p.handle}`, meta: p.bio || undefined, to: `/@${(p.handle ?? '').toLowerCase()}`, icon: 'pessoas' });
    for (const c of cm.comunidades) out.push({ key: `c-${c.slug}`, group: 'Na comunidade', title: c.name, meta: `Comunidade · ${c.members} ${c.members === 1 ? 'pessoa' : 'pessoas'}`, to: `/w/${c.slug}`, icon: 'comunidade' });
    for (const p of cm.conversas) out.push({ key: `v-${p.id}`, group: 'Na comunidade', title: p.title, meta: `${p.place}${p.author?.handle ? ` · @${p.author.handle}` : ''}`, to: `/conversa/${p.id}`, icon: 'mensagem' });
    for (const k of cm.clubes) out.push({ key: `k-${k.slug}`, group: 'Na comunidade', title: k.name, meta: `Clube${k.game ? ` · ${k.game.title}` : ''}`, to: `/clube/${k.slug}`, cover: k.game?.cover ? { title: k.game.title, cover: k.game.cover } : undefined, icon: 'pessoas' });
    for (const j of cm.jogatinas) out.push({ key: `jg-${j.id}`, group: 'Na comunidade', title: j.title, meta: `Jogatina${j.game ? ` · ${j.game.title}` : ''}`, to: `/jogatina/${j.id}`, cover: j.game?.cover ? { title: j.game.title, cover: j.game.cover } : undefined, icon: 'calendario' });
    for (const l of cm.listas ?? []) out.push({ key: `l-${l.id}`, group: 'Na comunidade', title: l.title, meta: `Lista${l.owner.handle ? ` de @${l.owner.handle}` : ''} · ${l.count} ${l.count === 1 ? 'jogo' : 'jogos'}`, to: `/lista/${l.id}`, cover: l.covers[0] ? { title: l.covers[0].title, cover: l.covers[0].cover ?? '' } : undefined, icon: 'estante' });
    if (q.trim().length >= 2) out.push({ key: 'all', group: 'Mais', title: `Ver todos os resultados para “${q.trim()}”`, to: `/busca?q=${encodeURIComponent(q.trim())}`, icon: 'busca' });
    return out;
  }, [q, s, remote, cm]);

  useEffect(() => setSel(0), [q]);
  useEffect(() => { list.current?.querySelector<HTMLElement>(`[data-i="${sel}"]`)?.scrollIntoView({ block: 'nearest' }); }, [sel]);
  const go = (it?: Item) => { if (!it) return; onClose(); navigate(it.to); };
  const key = (e: RKeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((n) => Math.min(items.length - 1, n + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((n) => Math.max(0, n - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(items[sel]); }
  };

  let lastGroup = '';
  return (
    <div className="palette-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Busca">
        <div className="palette__field">
          <Icon name="busca" size={18} />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={key} placeholder="Buscar jogo, pessoa, conversa, comunidade ou página" aria-label="Buscar" role="combobox" aria-expanded="true" aria-controls="palette-list" aria-activedescendant={items[sel] ? `pal-${sel}` : undefined} />
          <kbd>Esc</kbd>
        </div>
        <ul id="palette-list" ref={list} className="palette__list" role="listbox">
          {items.map((it, i) => {
            const head = it.group !== lastGroup ? it.group : null;
            lastGroup = it.group;
            return [
              head && <li key={`h-${head}`} className="palette__group" role="presentation">{head}</li>,
              <li key={it.key} id={`pal-${i}`} data-i={i} role="option" aria-selected={i === sel} className="palette__item" onMouseMove={() => setSel(i)} onClick={() => go(it)}>
                {it.cover ? <span className="palette__cover"><CoverArt game={it.cover} /></span> : <span className="palette__icon"><Icon name={it.icon ?? 'avancar'} size={14} /></span>}
                <span className="palette__text"><span className="palette__title">{it.title}</span>{it.meta && <span className="faint">{it.meta}</span>}</span>
              </li>,
            ];
          })}
          {q.trim().length >= 2 && items.length === 0 && <li className="palette__empty muted">Nada encontrado. O catálogo ainda pode estar respondendo…</li>}
        </ul>
        <div className="palette__foot faint"><span><kbd>↑</kbd><kbd>↓</kbd> navegar</span><span><kbd>Enter</kbd> abrir</span><span><kbd>Ctrl</kbd>+<kbd>K</kbd> de qualquer lugar</span></div>
      </div>
    </div>
  );
}
