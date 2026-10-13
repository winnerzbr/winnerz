import { useEffect, useState } from 'react';
import { actions } from '../data/store';
import type { Game } from '../data/types';
import { searchGames, loadGame, type Hit } from './AddGameDialog';
import { navigate } from '../lib/router';

/**
 * Jogo cadastrado sem ficha do IGDB (ex.: vindo da planilha): procura a ficha e liga.
 * Coleção, Jornada, nota e prioridade passam para a ficha encontrada.
 */
export function LinkToIgdb({ game }: { game: Game }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(game.title);
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open || q.trim().length < 2) return;
    const t = setTimeout(async () => { const r = await searchGames(q.trim(), []); setHits(r.source === 'igdb' ? r.hits : []); }, 300);
    return () => clearTimeout(t);
  }, [open, q]);

  const pick = async (h: Hit) => {
    setBusy(true); setErr('');
    const g = await loadGame(h);
    setBusy(false);
    if (!g) { setErr('Não foi possível carregar a ficha agora. Tente de novo em instantes.'); return; }
    actions.mergeGames([g]);
    actions.relinkGame(game.id, g);
    navigate(`/jogos/${g.slug}`, { replace: true });
  };

  if (!open) {
    return (
      <div className="link-igdb">
        <p className="muted">Este jogo ainda não está ligado ao catálogo, por isso não tem capa nem informações.</p>
        <button className="btn ghost sm" onClick={() => setOpen(true)}>Procurar a ficha no catálogo</button>
      </div>
    );
  }
  return (
    <div className="link-igdb">
      <label htmlFor="link-q" className="finish__label">Procurar no catálogo</label>
      <input id="link-q" className="field" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="hits">
        {hits.map((h) => (
          <li key={h.igdbId ?? h.slug}><button disabled={busy} onClick={() => pick(h)}>
            {h.cover ? <img src={h.cover} alt="" /> : <span className="hits__nocover" />}
            <span><span className="hits__title">{h.title}</span><span className="muted hits__meta">{[h.year, h.platforms.slice(0, 3).join(', ')].filter(Boolean).join(' · ')}</span></span>
          </button></li>
        ))}
        {q.length >= 2 && !hits.length && <li className="muted" style={{ padding: 12 }}>Nada encontrado com esse nome. Tente outra grafia.</li>}
      </ul>
      {err && <p role="alert">{err}</p>}
      <button className="btn quiet sm" onClick={() => setOpen(false)}>Cancelar</button>
    </div>
  );
}
