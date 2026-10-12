import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from '../lib/router';
import { useStore } from '../data/store';
import { awardsApi, canAdmin, adminResultsOpen, type AwardFull } from '../data/awards';
import { CoverArt } from '../components/CoverArt';
import { fmtWhen } from './Awards';

/**
 * Apresentação da revelação (para gravar o vídeo): uma categoria por vez, indicados na tela,
 * e o vencedor só aparece quando você toca em "Revelar". Antes da data marcada, fica trancada.
 * Setas ← → trocam de categoria; espaço ou Enter revela.
 */
export function AwardsRevealPage() {
  useStore((s) => s.isAdmin);
  const [full, setFull] = useState<AwardFull | null | undefined>(undefined);
  const [i, setI] = useState(0);
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [a] = await awardsApi().list();
        setFull(a ? await awardsApi().load(a.id) : null);
      } catch (e) { setError(e instanceof Error ? e.message : 'Não consegui carregar.'); setFull(null); }
    })();
  }, []);

  const cats = useMemo(() => (full?.categories ?? []).filter((c) => c.nominees.length), [full]);
  const open = !!full && adminResultsOpen(full.award) && !!full.results;
  const cat = cats[Math.min(i, Math.max(0, cats.length - 1))];
  const reveal = useCallback(() => cat && setShown((x) => ({ ...x, [cat.id]: true })), [cat]);

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, select')) return;
      if (e.key === 'ArrowRight') setI((n) => Math.min(cats.length - 1, n + 1));
      else if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1));
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); reveal(); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [open, cats.length, reveal]);

  if (!canAdmin()) return <main className="page pad narrow"><h1 className="t big">Revelação</h1><p className="muted lead">Esta tela é só da administração do WinnerZ.</p></main>;
  if (full === undefined) return <main className="page pad"><p className="muted">Carregando…</p></main>;
  if (!full) return <main className="page pad narrow"><h1 className="t big">Revelação</h1><p className="muted lead">{error || 'Nenhuma edição do Awards ainda.'}</p></main>;

  if (!open) return (
    <main className="reveal reveal--locked">
      <div className="reveal__locked">
        <span className="awards-card__kicker">{full.award.title}</span>
        <h1 className="t">Resultado trancado</h1>
        <p>{full.award.resultsAt ? `Abre em ${fmtWhen(full.award.resultsAt, true)}. Até lá, ninguém vê a contagem, nem você.` : 'Marque, na tela de montar a edição, quando o resultado chega para você.'}</p>
        <Link className="btn ghost" to="/eventos/awards/admin">Voltar para a montagem</Link>
      </div>
    </main>
  );

  const res = full.results!;
  const total = cat ? cat.nominees.reduce((a, n) => a + (res[n.id] ?? 0), 0) : 0;
  const top = cat ? Math.max(0, ...cat.nominees.map((n) => res[n.id] ?? 0)) : 0;
  const winners = cat ? cat.nominees.filter((n) => top > 0 && (res[n.id] ?? 0) === top) : [];
  const isShown = !!cat && !!shown[cat.id];
  const full_ = () => { const el = document.documentElement; if (document.fullscreenElement) void document.exitFullscreen(); else void el.requestFullscreen?.(); };

  return (
    <main className="reveal">
      <header className="reveal__top">
        <span className="awards-card__kicker">{full.award.title}</span>
        <span className="reveal__count">{cats.length ? `${Math.min(i, cats.length - 1) + 1} de ${cats.length}` : ''}</span>
        <button className="btn quiet sm" onClick={full_}>Tela cheia</button>
        <Link className="btn quiet sm" to="/eventos/awards/admin">Sair</Link>
      </header>
      {!cat ? <p className="reveal__empty">Nenhuma categoria com indicados.</p> : (
        <section className={`reveal__stage${isShown ? ' is-shown' : ''}`} key={cat.id} aria-live="polite">
          <h1 className="t reveal__cat">{cat.name}</h1>
          {cat.description && <p className="reveal__desc">{cat.description}</p>}
          <ul className="reveal__noms" style={{ ['--n' as string]: cat.nominees.length }}>
            {cat.nominees.map((n, k) => {
              const v = res[n.id] ?? 0;
              const win = isShown && winners.some((w) => w.id === n.id);
              return (
                <li key={n.id} className={`reveal__nom${win ? ' is-win' : isShown ? ' is-out' : ''}`} style={{ animationDelay: `${0.12 * k}s` }}>
                  <span className="reveal__cover"><CoverArt game={n.game} />{win && <span className="reveal__badge">{winners.length > 1 ? 'Empate' : 'Vencedor'}</span>}</span>
                  <span className="reveal__name">{n.game.title}</span>
                  {isShown && <span className="reveal__bar"><span style={{ width: `${total ? Math.round((v / total) * 100) : 0}%` }} /><em>{total ? Math.round((v / total) * 100) : 0}%</em></span>}
                </li>
              );
            })}
          </ul>
          {isShown && (
            <div className="reveal__winner" aria-label="Vencedor">
              <svg className="reveal__rays" viewBox="0 0 400 400" aria-hidden="true">{Array.from({ length: 24 }, (_, r) => <line key={r} x1="200" y1="200" x2={200 + 190 * Math.cos((r * Math.PI) / 12)} y2={200 + 190 * Math.sin((r * Math.PI) / 12)} />)}</svg>
              <p className="t">{winners.length ? winners.map((w) => w.game.title).join(' e ') : 'Sem votos nesta categoria'}</p>
              <p className="reveal__votes">{total ? `${total.toLocaleString('pt-BR')} ${total === 1 ? 'voto' : 'votos'} na categoria` : ''}</p>
            </div>
          )}
          <div className="reveal__actions">
            <button className="btn ghost" disabled={i === 0} onClick={() => setI(i - 1)}>← Anterior</button>
            {!isShown ? <button className="btn primary lg" onClick={reveal}>Revelar o vencedor</button> : <span className="reveal__hint">Revelado</span>}
            <button className="btn ghost" disabled={i >= cats.length - 1} onClick={() => setI(i + 1)}>Próxima →</button>
          </div>
        </section>
      )}
    </main>
  );
}
