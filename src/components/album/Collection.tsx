/**
 * Aba "Figurinhas": a coleção inteira, álbum por álbum e página por página. Cada figurinha aparece colada, na
 * bandeja (tem, falta colar) ou faltando (só o número). As repetidas mostram quantas sobram. Filtros e contas por
 * raridade no topo.
 */
import { useMemo, useState } from 'react';
import { Link } from '../../lib/router';
import type { AlbumBook as Book, AlbumState, Sticker } from '../../data/albumApi';
import { spares, TIER_LABEL, TIER_MATERIAL, TIERS } from '../../lib/album';
import { bookPages } from './AlbumBook';
import { num3 } from './render';
import { StickerView } from './StickerView';

type Filter = 'todas' | 'faltam' | 'repetidas';
const FILTERS: [Filter, string][] = [['todas', 'Todas'], ['faltam', 'Faltam'], ['repetidas', 'Repetidas']];

export function Collection({ state, personalCount, personalBook, onZoom }: { state: AlbumState; personalCount: number; personalBook?: Book; onZoom: (s: Sticker, el: HTMLElement) => void }) {
  const [filter, setFilter] = useState<Filter>('todas');
  const items = useMemo(() => Object.fromEntries(state.items.map((i) => [i.id, i])), [state.items]);
  const books = useMemo(() => [...state.books].sort((a, b) => a.season - b.season || a.position - b.position), [state.books]);
  const tree = useMemo(() => books.map((b) => ({ b, pages: bookPages(b, state.stickers).map((p) => ({ ...p, stickers: p.stickers.filter((s) => s.active || (items[s.id]?.qty ?? 0) > 0) })) })), [books, state.stickers, items]);
  const all = tree.flatMap((t) => t.pages.flatMap((p) => p.stickers));
  const has = (s: Sticker) => (items[s.id]?.qty ?? 0) > 0;
  const stat = (l: Sticker[]) => ({ total: l.length, have: l.filter(has).length, pasted: l.filter((s) => items[s.id]?.pasted).length, spare: l.reduce((t, s) => t + spares(items[s.id]), 0) });
  const sum = stat(all);
  const byTier = TIERS.map((t) => ({ t, ...stat(all.filter((s) => s.tier === t)) })).filter((x) => x.total > 0);
  const show = (s: Sticker) => filter === 'todas' || (filter === 'faltam' ? !has(s) : spares(items[s.id]) > 0);
  const shown = all.filter(show).length;

  if (!all.length) return (
    <div className="alb-empty"><b>As figurinhas da Temporada ainda não foram publicadas.</b><p className="muted">Quando o álbum abrir, a coleção inteira aparece aqui: o que você já colou, o que falta e as repetidas.</p></div>
  );
  return (
    <div className="alb-col">
      <section className="alb-col__sum" aria-label="Resumo da coleção">
        <div className="alb-col__big"><b>{sum.have}</b><span>de {sum.total} figurinhas</span></div>
        <div className="alb-col__big"><b>{sum.pasted}</b><span>coladas</span></div>
        <div className="alb-col__big"><b>{sum.have - sum.pasted}</b><span>na bandeja</span></div>
        <div className="alb-col__big"><b>{sum.spare}</b><span>{sum.spare === 1 ? 'repetida' : 'repetidas'}</span></div>
        <ul className="alb-col__tiers">
          {byTier.map((x) => (
            <li key={x.t} className={`alb-tier alb-tier--${x.t}`}>
              <span className="alb-tier__name">{TIER_LABEL[x.t]} <small>{TIER_MATERIAL[x.t]}</small></span>
              <span className="alb-bar"><i style={{ width: `${Math.round((x.have / x.total) * 100)}%` }} /></span>
              <span className="alb-tier__n">{x.have}/{x.total}{x.spare ? <small> · {x.spare} rep.</small> : null}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="alb-col__bar">
        <div className="seg seg--sm" role="group" aria-label="Mostrar">
          {FILTERS.map(([k, l]) => <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>)}
        </div>
        <span className="faint" role="status">{shown === 1 ? '1 figurinha' : `${shown} figurinhas`}</span>
        {sum.spare >= 3 && <Link className="btn ghost sm" to="/album/cofre">Levar repetidas ao Cofre</Link>}
      </div>

      {shown === 0 && <p className="muted alb-col__none">{filter === 'faltam' ? 'Não falta nenhuma. Coleção completa!' : 'Nenhuma repetida por enquanto.'}</p>}

      {tree.map(({ b, pages }) => {
        const vis = pages.map((p) => ({ ...p, list: p.stickers.filter(show) })).filter((p) => p.list.length);
        if (!vis.length) return null;
        return (
          <section key={b.id} className="alb-col__book">
            <header className="alb-col__bookhead"><span className="alb-kick">{b.subtitle || `Temporada ${b.season}`}</span><h2 className="t">{b.title}</h2><Link className="btn quiet sm" to={`/album/${b.slug}`}>Abrir o álbum</Link></header>
            {vis.map((p) => (
              <div key={p.id} className="alb-col__page">
                <h3 className="alb-col__pagehead"><span>{p.kicker || (p.legendary ? 'Página lendária' : 'Página')}</span>{p.title}<small>{p.stickers.filter((s) => items[s.id]?.pasted).length}/{p.stickers.length}</small></h3>
                <ul className="alb-col__grid">
                  {p.list.map((s) => <Card key={s.id} s={s} section={p.title} qty={items[s.id]?.qty ?? 0} pasted={!!items[s.id]?.pasted} slug={b.slug} onZoom={onZoom} />)}
                </ul>
              </div>
            ))}
          </section>
        );
      })}

      {personalBook && (
        <section className="alb-note alb-col__mine">
          <span><b>Minhas páginas</b> <span className="muted">{personalCount === 1 ? '1 jogo zerado virou figurinha sua.' : personalCount ? `${personalCount} jogos zerados viraram figurinhas suas.` : 'Cada jogo que você zerar vira uma figurinha sua.'} Elas ficam no fim do álbum e não entram em trocas.</span></span>
          <Link className="btn ghost sm" to={`/album/${personalBook.slug}`}>Ver no álbum</Link>
        </section>
      )}
    </div>
  );
}

function Card({ s, section, qty, pasted, slug, onZoom }: { s: Sticker; section: string; qty: number; pasted: boolean; slug: string; onZoom: (s: Sticker, el: HTMLElement) => void }) {
  const sp = Math.max(0, qty - 1);
  if (qty <= 0) return (
    <li className="alb-card is-miss">
      <div className="alb-miss" role="img" aria-label={`Falta a figurinha ${num3(s.number)}`}><span>{num3(s.number)}</span></div>
      <div className="alb-card__meta"><span className="alb-tag">Falta</span></div>
    </li>
  );
  return (
    <li className={`alb-card${pasted ? ' is-pasted' : ' is-tray'}`}>
      <StickerView s={s} section={section} onOpen={(el) => onZoom(s, el)} />
      <div className="alb-card__meta">
        {pasted ? <span className="alb-tag alb-tag--ok">Colada</span> : <Link className="alb-tag alb-tag--tray" to={`/album/${slug}`} title="Colar no álbum">Na bandeja</Link>}
        {sp > 0 && <span className="alb-tag alb-tag--dup" title={`Você tem ${qty} desta`}>+{sp}</span>}
      </div>
      <small className="alb-card__name">{num3(s.number)} · {s.name}</small>
    </li>
  );
}
