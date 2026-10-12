import { useCallback, useEffect, useState } from 'react';
import { Link } from '../lib/router';
import { useStore } from '../data/store';
import { awardsApi, canAdmin, phaseOf, type Award, type AwardFull, type Category, type Phase } from '../data/awards';
import { CoverArt } from '../components/CoverArt';
import { track } from '../lib/track';

const tz = 'America/Sao_Paulo';
export const fmtWhen = (iso?: string, withTime = false) => (iso ? new Date(iso).toLocaleString('pt-BR', { day: 'numeric', month: 'long', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}), timeZone: tz }) : '');

function phaseLine(a: Award, p: Phase): string {
  switch (p) {
    case 'rascunho': return 'Rascunho: só a administração vê esta edição.';
    case 'antes': return a.votingOpens ? `A votação abre em ${fmtWhen(a.votingOpens, true)}.` : 'A data da votação ainda vai ser anunciada.';
    case 'aberta': return a.votingCloses ? `Votação aberta até ${fmtWhen(a.votingCloses, true)}.` : 'Votação aberta.';
    case 'apurando': return a.resultsAt ? `Votação encerrada. O resultado sai em ${fmtWhen(a.resultsAt, true)}.` : 'Votação encerrada. O resultado sai em breve.';
    case 'resultado': return 'Resultado.';
  }
}

/** A edição mais recente que esta pessoa pode ver (publicada, ou rascunho para a administração). */
function useLatestAward() {
  const mode = useStore((s) => s.mode);
  const [award, setAward] = useState<Award | null | undefined>(undefined);
  useEffect(() => { awardsApi().list().then((l) => setAward(l[0] ?? null)).catch(() => setAward(null)); }, [mode]);
  return award;
}

/** Pilar Eventos: por enquanto, o WinnerZ Awards. */
export function EventsIndex() {
  const award = useLatestAward();
  const p = award ? phaseOf(award) : null;
  return (
    <main className="page pad">
      <h1 className="t big">Eventos</h1>
      <p className="muted lead">Os momentos em que a comunidade se encontra. O álbum de figurinhas e os códigos das lives chegam depois.</p>
      <Link to="/eventos/awards" className="card awards-card on-photo">
        <span className="awards-card__kicker">WinnerZ Awards</span>
        <span className="t awards-card__title">{award?.title ?? 'WinnerZ Awards'}</span>
        <span className="awards-card__line">{award && p ? phaseLine(award, p) : award === null ? 'A próxima edição ainda vai ser anunciada.' : 'Carregando…'}</span>
        <span className="btn primary">{p === 'aberta' ? 'Votar' : p === 'resultado' ? 'Ver o resultado' : 'Abrir'}</span>
      </Link>
    </main>
  );
}

export function AwardsPage() {
  const award = useLatestAward();
  const s = useStore((x) => x);
  const [full, setFull] = useState<AwardFull | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const reload = useCallback(() => {
    if (!award) return;
    awardsApi().load(award.id).then(setFull).catch((e) => setError(e instanceof Error ? e.message : 'Não consegui carregar.'));
  }, [award]);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { track('eventos.awards'); }, []);

  if (award === undefined || (award && !full && !error)) return <main className="page pad"><p className="muted">Carregando o WinnerZ Awards…</p></main>;
  if (!award) return (
    <main className="page pad narrow">
      <h1 className="t big">WinnerZ Awards</h1>
      <p className="muted lead">A próxima edição ainda vai ser anunciada.</p>
      {canAdmin() && <Link className="btn primary" to="/eventos/awards/admin">Montar uma edição</Link>}
    </main>
  );
  if (!full) return <main className="page pad"><p className="muted" role="alert">{error}</p></main>;

  const phase = phaseOf(full.award);
  const logged = s.mode === 'demo' || !!s.profile;
  const voted = full.categories.filter((c) => full.myVotes[c.id]).length;
  const withNominees = full.categories.filter((c) => c.nominees.length);

  const vote = async (c: Category, nomineeId: string) => {
    if (phase !== 'aberta' || !logged) return;
    const next = full.myVotes[c.id] === nomineeId ? null : nomineeId;
    setSaving(c.id); setError('');
    const mv = { ...full.myVotes };
    if (next) mv[c.id] = next; else delete mv[c.id];
    setFull({ ...full, myVotes: mv });
    try { await awardsApi().vote(c.id, next); track('awards.voto'); }
    catch (e) { setError(e instanceof Error ? e.message : 'O voto não foi gravado.'); reload(); }
    finally { setSaving(null); }
  };

  return (
    <main className="page pad awards">
      <header className="awards__head">
        <span className="awards-card__kicker">Eventos</span>
        <h1 className="t big">{full.award.title}</h1>
        {full.award.intro && <p className="muted lead">{full.award.intro}</p>}
        <p className={`awards__phase awards__phase--${phase}`}>{phaseLine(full.award, phase)}{full.voters > 0 && phase !== 'antes' && phase !== 'rascunho' ? ` ${full.voters.toLocaleString('pt-BR')} ${full.voters === 1 ? 'pessoa votou' : 'pessoas votaram'}.` : ''}</p>
        {phase === 'aberta' && (logged
          ? <p className="muted">Um voto por categoria. Toque no jogo para votar; toque de novo para tirar o voto. Dá para mudar até o fim da votação. Você votou em {voted} de {withNominees.length}.</p>
          : <p><Link className="btn primary" to="/entrar">Entre para votar</Link> <span className="muted">Uma conta, um voto por categoria.</span></p>)}
        {phase === 'apurando' && <p className="muted">Ninguém vê a contagem antes da revelação, nem a administração do site muda votos.</p>}
        {canAdmin() && <Link className="btn ghost sm" to="/eventos/awards/admin">Montar a edição</Link>}
        {error && <p className="awards__error" role="alert">{error}</p>}
      </header>

      {withNominees.length === 0 && <div className="card tl-empty"><p className="muted">Os indicados ainda vão ser anunciados.</p></div>}

      {withNominees.map((c) => {
        const res = full.results;
        const total = res ? c.nominees.reduce((a, n) => a + (res[n.id] ?? 0), 0) : 0;
        const ordered = res && phase === 'resultado' ? [...c.nominees].sort((a, b) => (res[b.id] ?? 0) - (res[a.id] ?? 0)) : c.nominees;
        const top = res && phase === 'resultado' && total ? Math.max(...c.nominees.map((n) => res[n.id] ?? 0)) : -1;
        return (
          <section key={c.id} className="awards__cat" aria-labelledby={`cat-${c.id}`}>
            <div className="awards__cat-head">
              <h2 id={`cat-${c.id}`} className="t">{c.name}</h2>
              {c.description && <p className="muted">{c.description}</p>}
              {saving === c.id && <span className="faint" role="status">Gravando…</span>}
            </div>
            <ul className="awards__noms" role={phase === 'aberta' ? 'radiogroup' : undefined} aria-labelledby={`cat-${c.id}`}>
              {ordered.map((n) => {
                const mine = full.myVotes[c.id] === n.id;
                const votes = res?.[n.id] ?? 0;
                const winner = top > 0 && votes === top;
                const body = (
                  <>
                    <span className="awards__cover"><CoverArt game={n.game} />{mine && <span className="awards__mine">Seu voto</span>}{winner && <span className="awards__win">Vencedor</span>}</span>
                    <span className="awards__name">{n.game.title}</span>
                    {res && phase === 'resultado' && <span className="awards__bar" aria-label={`${votes} votos`}><span style={{ width: `${total ? Math.round((votes / total) * 100) : 0}%` }} /><em>{total ? Math.round((votes / total) * 100) : 0}%</em></span>}
                  </>
                );
                return (
                  <li key={n.id}>
                    {phase === 'aberta' && logged
                      ? <button role="radio" aria-checked={mine} className={`awards__nom${mine ? ' is-mine' : ''}`} onClick={() => vote(c, n.id)} disabled={saving === c.id}>{body}</button>
                      : <Link to={`/jogos/${n.game.slug}`} className={`awards__nom${mine ? ' is-mine' : ''}${winner ? ' is-winner' : ''}`}>{body}</Link>}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
