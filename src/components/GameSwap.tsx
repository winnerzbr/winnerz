import { useEffect, useMemo, useState } from 'react';
import { actions, getState, useStore, journeyForGame } from '../data/store';
import type { Copy, Game } from '../data/types';
import { searchGames, loadGame, type Hit } from './AddGameDialog';
import { canonicalPlatform, shortPlatform } from '../lib/platforms';
import { navigate } from '../lib/router';

/**
 * "Jogo errado?": procura no catálogo e troca o jogo sem apagar nada.
 * Com um exemplar (vindo da Estante), dá para trocar só ele ou tudo o que é deste jogo.
 * Sem exemplar (ficha do jogo), troca tudo: exemplares, Jornada, nota, prioridade, favorito, desejo.
 */
export function GameSwap({ game, copy, onDone, onCancel }: { game: Game; copy?: Copy; onDone: (g: Game, scope: 'copia' | 'tudo') => void; onCancel: () => void }) {
  const [q, setQ] = useState(game.title);
  const [hits, setHits] = useState<Hit[]>([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [chosen, setChosen] = useState<Game | null>(null);
  const local = useStore((s) => s.games);
  const copies = useStore((s) => s.copies);
  const others = useMemo(() => copies.filter((c) => c.gameId === game.id && c.id !== copy?.id), [copies, game.id, copy?.id]);
  const hasJourney = useStore((s) => !!journeyForGame(s, game.id));
  const hasReview = useStore((s) => s.reviews.some((r) => r.mine && r.gameId === game.id));
  const plat = copy ? canonicalPlatform(copy.platform) : '';

  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); setSearched(false); return; }
    const t = setTimeout(async () => {
      const r = await searchGames(q.trim(), Object.values(local));
      setHits(r.hits); setSearched(true);
    }, 300);
    return () => clearTimeout(t);
  }, [q, local]);

  // O jogo que tem a plataforma do exemplar vem primeiro.
  const sorted = useMemo(() => {
    if (!plat) return hits;
    const has = (h: Hit) => h.platforms.some((p) => canonicalPlatform(p) === plat);
    return [...hits.filter(has), ...hits.filter((h) => !has(h))];
  }, [hits, plat]);

  const isCurrent = (h: Hit) => (h.local ? h.local.id === game.id : !!game.igdbId && h.igdbId === game.igdbId);

  const pick = async (h: Hit) => {
    setBusy(true); setErr('');
    const g = await loadGame(h);
    setBusy(false);
    if (!g) { setErr('Não foi possível carregar a ficha agora. Tente de novo em instantes.'); return; }
    if (g.id === game.id) { setErr('Esse é o jogo que já está ligado.'); return; }
    actions.mergeGames([g]);
    if (copy && others.length) { setChosen(g); return; }
    apply(g, 'tudo');
  };

  const apply = (g: Game, scope: 'copia' | 'tudo') => {
    if (scope === 'copia' && copy) actions.moveCopy(copy.id, g);
    else actions.relinkGame(game.id, g);
    // Garante que a ficha nova está no estado mesmo se outra tela a tirou.
    if (!getState().games[g.id]) actions.mergeGames([g]);
    onDone(g, scope);
  };

  if (chosen) {
    const extra = [hasJourney && 'a Jornada', hasReview && 'a sua nota', 'prioridade e favorito'].filter(Boolean).join(', ');
    return (
      <div className="gswap">
        <p className="gswap__lead">Trocar por <strong>{chosen.title}</strong>{chosen.year ? ` (${chosen.year})` : ''}. Você tem {others.length + 1} exemplares de <strong>{game.title}</strong>. O que muda?</p>
        <div className="gswap__choices">
          <button className="gswap__choice" onClick={() => apply(chosen, 'copia')}>
            <strong>Só este exemplar</strong>
            <span className="muted">O de {shortPlatform(copy!.platform)} passa para {chosen.title}. Os outros continuam como estão.</span>
          </button>
          <button className="gswap__choice" onClick={() => apply(chosen, 'tudo')}>
            <strong>Tudo deste jogo</strong>
            <span className="muted">Os {others.length + 1} exemplares e também {extra} passam para {chosen.title}.</span>
          </button>
        </div>
        <button className="btn quiet sm" onClick={() => setChosen(null)}>Voltar à busca</button>
      </div>
    );
  }

  return (
    <div className="gswap">
      <p className="gswap__lead">
        {copy ? <>Procure o jogo certo no catálogo. O exemplar continua com a ficha que você preencheu ({shortPlatform(copy.platform)}, estado, compra, nota).</>
          : <>Procure o jogo certo no catálogo. Exemplares, Jornada, nota, prioridade e favorito passam para ele; nada se perde.</>}
      </p>
      <label htmlFor="gswap-q" className="finish__label">Procurar no catálogo</label>
      <input id="gswap-q" className="field" value={q} autoFocus onChange={(e) => setQ(e.target.value)} />
      <ul className="hits gswap__hits">
        {sorted.map((h) => {
          const cur = isCurrent(h);
          const match = plat && h.platforms.some((p) => canonicalPlatform(p) === plat);
          return (
            <li key={h.igdbId ?? h.slug}><button disabled={busy || cur} onClick={() => pick(h)} aria-current={cur || undefined}>
              {h.cover ? <img src={h.cover} alt="" /> : <span className="hits__nocover" />}
              <span>
                <span className="hits__title">{h.title}</span>
                <span className="muted hits__meta">{[h.year, h.platforms.slice(0, 4).map(shortPlatform).join(', ')].filter(Boolean).join(' · ')}</span>
                {cur ? <span className="gswap__tag gswap__tag--cur">Ligado agora</span> : match ? <span className="gswap__tag">Tem versão de {shortPlatform(plat)}</span> : null}
              </span>
            </button></li>
          );
        })}
        {searched && !hits.length && <li className="muted" style={{ padding: 12 }}>Nada encontrado com esse nome. Tente outra grafia ou o nome em inglês.</li>}
      </ul>
      {err && <p role="alert" className="gswap__err">{err}</p>}
      <button className="btn quiet sm" onClick={onCancel}>Cancelar</button>
    </div>
  );
}

/** Na ficha do jogo: "Não é este jogo?" — só aparece se algo seu está ligado a ele. */
export function GameSwapOnPage({ game }: { game: Game }) {
  const [open, setOpen] = useState(false);
  const mine = useStore((s) => s.copies.some((c) => c.gameId === game.id) || !!journeyForGame(s, game.id) || s.reviews.some((r) => r.mine && r.gameId === game.id));
  if (!mine) return null;
  if (!open) return <p className="gswap__ask faint">Não é este jogo? <button className="gswap__link" onClick={() => setOpen(true)}>Trocar pelo jogo certo do catálogo</button></p>;
  return (
    <div className="link-igdb">
      <GameSwap game={game} onCancel={() => setOpen(false)} onDone={(g) => navigate(`/jogos/${g.slug}`, { replace: true })} />
    </div>
  );
}
