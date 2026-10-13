import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from '../lib/router';
import { useStore } from '../data/store';
import { awardsApi, canAdmin, adminResultsOpen, type AwardFull } from '../data/awards';
import { CoverArt } from '../components/CoverArt';
import { fmtWhen, fmtDay, Countdown } from './Awards';
import { BrandMark } from '../components/Brand';

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

  if (!open) {
    const a = full.award;
    const start = Date.parse(a.votingOpens ?? '') || Date.now();
    const end = Date.parse(a.resultsAt ?? '');
    const pos = (t: number) => Math.min(100, Math.max(0, ((t - start) / (end - start)) * 100));
    const ruler = !!a.resultsAt && end > start;
    const closes = Date.parse(a.votingCloses ?? '');
    return (
      <main className="reveal reveal--locked">
        <div className="reveal__glow" aria-hidden="true" />
        <header className="reveal__bar-top">
          <Link className="reveal__back" to="/eventos/awards/admin">← Voltar para a montagem</Link>
          <BrandMark width={44} className="reveal__logo" />
          <span className="kicker">{full.award.title} · Revelação</span>
        </header>
        <div className="reveal__locked">
          <span className="reveal__lock" aria-hidden="true"><svg width="24" height="26" viewBox="0 0 24 26" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="11" width="18" height="13" rx="3" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></span>
          <h1 className="t">Resultado trancado</h1>
          <p>{a.resultsAt ? <>Abre em {fmtWhen(a.resultsAt, true)}.<br />Até lá, ninguém vê a contagem. Nem você.</> : 'Marque, na tela de montar a edição, quando o resultado chega para você.'}</p>
          {a.resultsAt && <Countdown to={a.resultsAt} big />}
        </div>
        {ruler && (
          <section className="reveal__ruler" aria-label="Até a revelação">
            <div className="rvr">
              <span className="rvr__line" aria-hidden="true" />
              <span className="rvr__fill" style={{ width: `${pos(Date.now())}%` }} aria-hidden="true" />
              <span className="rvr__now" style={{ left: `${pos(Date.now())}%` }} aria-hidden="true" />
              <span className="kicker rvr__lbl rvr__lbl--now" style={{ left: `${pos(Date.now())}%` }}>Hoje</span>
              {!Number.isNaN(closes) && closes < end && <>
                <span className="rvr__mk" style={{ left: `${pos(closes)}%` }} aria-hidden="true" />
                <span className="kicker rvr__lbl" style={{ left: `${pos(closes)}%` }}>{fmtDay(a.votingCloses!).toLowerCase()} · fim dos votos</span>
              </>}
              <span className="rvr__end" aria-hidden="true" />
              <span className="kicker rvr__lbl rvr__lbl--end">{fmtDay(a.resultsAt!).toLowerCase()} · revelação</span>
            </div>
          </section>
        )}
      </main>
    );
  }

  const res = full.results!;
  const total = cat ? cat.nominees.reduce((a, n) => a + (res[n.id] ?? 0), 0) : 0;
  const top = cat ? Math.max(0, ...cat.nominees.map((n) => res[n.id] ?? 0)) : 0;
  const winners = cat ? cat.nominees.filter((n) => top > 0 && (res[n.id] ?? 0) === top) : [];
  const isShown = !!cat && !!shown[cat.id];
  const full_ = () => { const el = document.documentElement; if (document.fullscreenElement) void document.exitFullscreen(); else void el.requestFullscreen?.(); };

  return (
    <main className="reveal">
      <div className="reveal__glow" aria-hidden="true" />
      <header className="reveal__bar-top">
        <Link className="reveal__back" to="/eventos/awards/admin">← Sair</Link>
        <BrandMark width={44} className="reveal__logo" />
        <span className="reveal__right">
          <span className="kicker">{full.award.title}{cats.length ? ` · ${Math.min(i, cats.length - 1) + 1} de ${cats.length}` : ''}</span>
          <button className="btn quiet sm" onClick={full_}>Tela cheia</button>
        </span>
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
