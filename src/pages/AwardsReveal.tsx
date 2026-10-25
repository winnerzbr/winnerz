import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '../lib/router';
import { useStore } from '../data/store';
import { awardsApi, awardsPlus, canAdmin, adminResultsOpen, nomineeArt, seloVencedor, TROFEU, type AwardFull } from '../data/awards';
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
  // Suspense: uma luz varre as artes por alguns segundos antes do vencedor se abrir.
  const [suspense, setSuspense] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const reveal = useCallback(() => {
    if (!cat || shown[cat.id] || suspense) return;
    const id = cat.id;
    const calm = document.documentElement.dataset.motion === 'reduzidas';
    setSuspense(id);
    timer.current = window.setTimeout(() => { setShown((x) => ({ ...x, [id]: true })); setSuspense(null); }, calm ? 300 : 2800);
  }, [cat, shown, suspense]);

  // E7.4: o overlay do canal acompanha a apresentação (categoria, suspense e vencedor) durante a live.
  const step = cat ? (shown[cat.id] ? 'vencedor' : suspense === cat.id ? 'indicados' : 'categoria') : 'fim';
  useEffect(() => { if (open && full) void awardsPlus.reveal(full.award.id, cat?.id ?? null, step); }, [open, full, cat?.id, step]);
  useEffect(() => () => { if (full) void awardsPlus.reveal(full.award.id, null, 'fim'); }, [full]);

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
  const isSus = !!cat && suspense === cat.id;
  const tag = seloVencedor(winners.length);
  const full_ = () => { const el = document.documentElement; if (document.fullscreenElement) void document.exitFullscreen(); else void el.requestFullscreen?.(); };
  const pctOf = (id: string) => (total ? Math.round(((res[id] ?? 0) / total) * 100) : 0);

  return (
    <main className="reveal reveal--cine">
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
        <section className="rvc" key={cat.id} aria-live="polite">
          <div className="rvc__head">
            <span className="kicker kicker--now">Categoria {Math.min(i, cats.length - 1) + 1} de {cats.length}</span>
            <h1 className="t rvc__cat">{cat.name}</h1>
            {cat.description && <p className="rvc__desc">{cat.description}</p>}
          </div>
          <div className={`scene rvc__scene${isShown && winners.length ? ' has' : ''}${isSus ? ' is-suspense' : ''}`} style={{ ['--n' as string]: cat.nominees.length }}>
            <div className="scene__row">
              {cat.nominees.map((n, k) => {
                const on = isShown && winners.some((w) => w.id === n.id);
                const pct = pctOf(n.id);
                const sub = n.game.developer || (n.game.year ? String(n.game.year) : '');
                return (
                  <div key={n.id} className={`scene__p rvc__p${on ? ' on' : ''}`} style={{ ['--k' as string]: k }}>
                    <img className="scene__img" src={nomineeArt(n)} alt="" style={{ objectPosition: n.focus || '50% 50%' }} />
                    <span className="scene__shade" aria-hidden="true" />
                    <span className="rvc__scan" aria-hidden="true" />
                    {on && <span className="scene__leak" aria-hidden="true" />}
                    <span className="scene__name">
                      <b>{n.game.title}</b>
                      {sub && <span>{sub}</span>}
                    </span>
                    <span className="scene__vt" aria-hidden="true">{pct}% · {n.game.title}</span>
                    {isShown && !winners.length && <span className="rvc__pct">{pct}%</span>}
                    {on && (
                      <span className="scene__ttl">
                        <span className="scene__tag rvc__tag"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z" /></svg>{tag}</span>
                        <span className="scene__nm">{n.game.title}</span>
                        <span className="scene__sub">{[sub, `${pct}% dos votos`].filter(Boolean).join(' · ')}</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <span className="scene__grain" aria-hidden="true" />
            {isSus && <span className="rvc__beam" aria-hidden="true" />}
            {isShown && winners.length > 0 && <>
              <span className="scene__flare" aria-hidden="true" />
              <span className="scene__ghost" aria-hidden="true" />
              <span className="scene__ghost scene__ghost--2" aria-hidden="true" />
              <span className="scene__flash" aria-hidden="true" />
            </>}
            <span className="scene__lb scene__lb--t" aria-hidden="true" />
            <span className="scene__lb scene__lb--b" aria-hidden="true" />
            {isShown && (
              <div className="scene__bottom">
                <span className="scene__desc">{total ? `${total.toLocaleString('pt-BR')} ${total === 1 ? 'voto' : 'votos'} na categoria` : 'Sem votos nesta categoria'}</span>
              </div>
            )}
          </div>
          <div className="reveal__actions rvc__actions">
            <button className="btn ghost" disabled={i === 0} onClick={() => setI(i - 1)}>← Anterior</button>
            {isShown ? <span className="reveal__hint">Revelado</span>
              : isSus ? <span className="reveal__hint rvc__wait">E o {TROFEU} vai para…</span>
              : <button className="btn primary lg" onClick={reveal}>Revelar o vencedor</button>}
            <button className="btn ghost" disabled={i >= cats.length - 1} onClick={() => setI(i + 1)}>Próxima →</button>
          </div>
        </section>
      )}
    </main>
  );
}
