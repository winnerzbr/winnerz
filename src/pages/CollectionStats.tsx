import { useMemo, useState } from 'react';
import { Link } from '../lib/router';
import { actions, useStore, getState, myGame, journeyForGame, historiesOf } from '../data/store';
import type { CopyKind, State } from '../data/types';
import { SubNav } from '../components/SubNav';
import { canonicalPlatform, platformRank, shortPlatform } from '../lib/platforms';
import { pt } from '../lib/igdbPt';
import { partsOf } from '../lib/dates';
import { CoverArt } from '../components/CoverArt';
import { Backdrop } from '../components/Backdrop';
import { Sheet, ConfirmButton } from '../components/Sheet';

type Row = { label: string; n: number; to?: string };

/** Lista de barras: uma cor, valor escrito ao lado, ordem do maior para o menor (ou a ordem natural). */
function BarList({ title, rows, unit = 'jogos', note, sorted = true }: { title: string; rows: Row[]; unit?: string; note?: string; sorted?: boolean }) {
  const list = sorted ? [...rows].sort((a, b) => b.n - a.n) : rows;
  const max = Math.max(1, ...list.map((r) => r.n));
  const total = list.reduce((a, r) => a + r.n, 0);
  if (!list.length) return null;
  return (
    <section className="card stat-card" aria-labelledby={`st-${title}`}>
      <h2 id={`st-${title}`} className="t stat-card__title">{title}</h2>
      {note && <p className="faint stat-card__note">{note}</p>}
      <ul className="barlist">
        {list.map((r) => (
          <li key={r.label} className={r.n === max && list.filter((x) => x.n === max).length === 1 ? 'is-top' : undefined} title={`${r.label}: ${r.n} ${unit} (${Math.round((r.n / Math.max(1, total)) * 100)}%)`}>
            <span className="barlist__label">{r.label}</span>
            <span className="barlist__track" aria-hidden="true"><span className="barlist__bar" style={{ width: `${(r.n / max) * 100}%` }} /></span>
            <span className="barlist__n">{r.n.toLocaleString('pt-BR')}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function countBy<T>(items: T[], key: (x: T) => string | null | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const x of items) { const k = key(x); if (k) out[k] = (out[k] ?? 0) + 1; }
  return out;
}

function compute(s: State) {
  const gameIds = [...new Set(s.copies.map((c) => c.gameId))].filter((g) => s.games[g]);
  const physical = s.copies.filter((c) => c.kind === 'fisico').length;
  const digital = s.copies.filter((c) => c.kind === 'digital').length;
  const zeradosIds = s.journeys.filter((j) => historiesOf(s, j.id).some((h) => h.state === 'concluida')).map((j) => j.gameId);
  const zeradosOwned = gameIds.filter((g) => zeradosIds.includes(g));
  const never = gameIds.filter((g) => !journeyForGame(s, g) && !myGame(s, g).wontPlay);
  const backlogHours = never.reduce((a, g) => a + (myGame(s, g).estHours ?? 0), 0);
  const paid = s.copies.reduce((a, c) => a + (c.pricePaid ?? 0), 0);
  const now = s.copies.reduce((a, c) => a + (c.priceNow ?? 0), 0);

  const byPlatform = Object.entries(countBy(s.copies, (c) => canonicalPlatform(c.platform)))
    .sort((a, b) => platformRank(a[0]) - platformRank(b[0])).map(([p, n]) => ({ label: shortPlatform(p), n }));
  const genreOf = (g: string) => myGame(s, g).genre ?? (s.games[g].genres ? pt(s.games[g].genres!.split(', ')[0]) : null);
  const genres = Object.entries(countBy(gameIds, genreOf)).map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n);
  // Os 11 maiores e o resto junto, para a lista caber num olhar.
  const rest = genres.slice(11);
  const byGenre = rest.length > 1 ? [...genres.slice(0, 11), { label: `Outros (${rest.length} gêneros)`, n: rest.reduce((a, r) => a + r.n, 0) }] : genres;
  const dur = (g: string) => { const h = myGame(s, g).estHours; return h == null ? 'Sem estimativa' : h < 10 ? 'Menos de 10 h' : h <= 50 ? '10 a 50 h' : 'Mais de 50 h'; };
  const durCount = countBy(never, dur);
  const byDuration = ['Menos de 10 h', '10 a 50 h', 'Mais de 50 h', 'Sem estimativa'].filter((k) => durCount[k]).map((label) => ({ label, n: durCount[label] }));
  const prCount = countBy(never, (g) => { const p = myGame(s, g).priority; return p === 1 ? 'Alta' : p === 2 ? 'Média' : p === 3 ? 'Baixa' : 'Sem prioridade'; });
  const byPriority = ['Alta', 'Média', 'Baixa', 'Sem prioridade'].filter((k) => prCount[k]).map((label) => ({ label, n: prCount[label] }));
  const done = s.histories.filter((h) => h.state === 'concluida');
  const yearCount = countBy(done, (h) => (h.completedAt && h.completedPrecision !== 'desconhecida' ? String(partsOf(h.completedAt).y) : 'Sem data'));
  const byYear = Object.keys(yearCount).sort((a, b) => (a === 'Sem data' ? 1 : b === 'Sem data' ? -1 : Number(b) - Number(a))).map((label) => ({ label, n: yearCount[label] }));

  return { games: gameIds.length, copies: s.copies.length, physical, digital, zerados: zeradosIds.length, zeradosOwned: zeradosOwned.length, never: never.length, backlogHours, paid, now, byPlatform, byGenre, byDuration, byPriority, byYear, wishes: s.wishes.length };
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function CollectionStats() {
  const s = useStore((x) => x);
  const k = useMemo(() => compute(s), [s]);
  const pctDone = k.games ? Math.round((k.zeradosOwned / k.games) * 100) : 0;

  return (
    <main className="page pad stats">
      <header className="page-head">
        <div className="page-head__text">
          <h1 className="t big">Estatísticas</h1>
          <p className="muted lead">Contadas a partir do que você registrou. Nada estimado pelo site.</p>
        </div>
        <SubNav pillar="colecao" />
      </header>
      {k.copies === 0 ? (
        <div className="card tl-empty"><p className="muted">Sem jogos na coleção ainda. <Link to="/colecao/importar">Importe sua planilha</Link> ou adicione o primeiro jogo.</p></div>
      ) : (
        <>
          <div className="kpis">
            <div className="kpi"><span className="kpi__n t">{k.games.toLocaleString('pt-BR')}</span><span className="kpi__l">jogos na coleção</span><span className="kpi__s">{k.physical} físicos, {k.digital} digitais</span></div>
            <div className="kpi"><span className="kpi__n t">{k.zerados}</span><span className="kpi__l">jogos zerados</span><span className="kpi__s">{pctDone}% da coleção</span></div>
            <div className="kpi"><span className="kpi__n t">{k.never.toLocaleString('pt-BR')}</span><span className="kpi__l">nunca jogados</span><span className="kpi__s">{k.backlogHours ? `cerca de ${Math.round(k.backlogHours).toLocaleString('pt-BR')} h somando suas estimativas` : 'sem pressa'}</span></div>
            {k.paid > 0 ? (
              <div className="kpi"><span className="kpi__n t">{brl(k.paid)}</span><span className="kpi__l">pagos, nas cópias com valor</span><span className="kpi__s">{k.now ? `${brl(k.now)} no valor atual estimado` : 'valor atual não informado'}</span></div>
            ) : (
              <div className="kpi"><span className="kpi__n t">{k.wishes}</span><span className="kpi__l">desejos</span><span className="kpi__s">{k.wishes ? 'na sua lista' : 'nenhum por enquanto'}</span></div>
            )}
          </div>
          <div className="stats__grid">
            <BarList title="Por plataforma" rows={k.byPlatform} unit="cópias" sorted={false} />
            <BarList title="Por gênero" rows={k.byGenre} sorted={false} note="Seu gênero quando veio da planilha; senão, o primeiro do IGDB." />
            <BarList title="Nunca jogados, por duração" rows={k.byDuration} sorted={false} note="Pelo tempo estimado para zerar que você informou." />
            <BarList title="Nunca jogados, por prioridade" rows={k.byPriority} sorted={false} />
            <BarList title="Zerados por ano" rows={k.byYear} unit="Histórias" sorted={false} />
          </div>
        </>
      )}
    </main>
  );
}

export function Wishes() {
  const s = useStore((x) => x);
  const list = s.wishes.filter((w) => s.games[w.gameId]);
  const [owning, setOwning] = useState<string | null>(null);
  return (
    <main className="page pad">
      <header className="page-head">
        <div className="page-head__text">
          <h1 className="t big">Desejos</h1>
          <p className="muted lead">Ainda não são seus. Nenhuma pressa.</p>
        </div>
        <SubNav pillar="colecao" />
      </header>
      {list.length === 0 ? (
        <div className="card tl-empty"><p className="muted">Nada na lista. Em qualquer ficha de jogo, toque em Desejar.</p><Link className="btn ghost" to="/jogos">Buscar um jogo</Link></div>
      ) : (
        <div className="wish-cards">
          {list.map((w) => {
            const g = s.games[w.gameId];
            const rel = g.releasedOn ? new Date(`${g.releasedOn.slice(0, 10)}T12:00:00-03:00`) : null;
            const days = rel ? Math.ceil((rel.getTime() - Date.now()) / 86_400_000) : null;
            const future = days != null && days > 0;
            return (
              <article key={w.gameId} className={`wish-card on-photo${future ? ' is-soon' : ''}`}>
                <Backdrop game={g} className="wish-card__bg" />
                <span className="wish-card__shade" aria-hidden="true" />
                <Link to={`/jogos/${g.slug}`} className="wish-card__link" aria-label={`Abrir a ficha de ${g.title}`} />
                <div className="wish-card__body">
                  <span className="wish-card__top">
                    <span className={`kicker${future ? ' kicker--now' : ''}`}>{future ? `Lança em ${rel!.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' })}` : 'Desejo'}</span>
                    {future && <span className="wish-card__days"><span className="t">{days}</span><span className="kicker">{days === 1 ? 'dia' : 'dias'}</span></span>}
                  </span>
                  <span className="wish-card__main">
                    <span className="wish-card__cover"><CoverArt game={g} /></span>
                    <span className="wish-card__text">
                      <span className="t wish-card__title">{g.title}</span>
                      <span className="wish-card__meta">{w.note ?? [g.year, g.platforms.slice(0, 2).map(shortPlatform).join(', ')].filter(Boolean).join(' · ')}</span>
                    </span>
                  </span>
                  <div className="wish-card__actions">
                    <button className="btn primary sm" onClick={() => setOwning(g.id)}>Já é meu</button>
                    <Link className="btn ghost sm" to={`/jogos/${g.slug}`}>Ver ficha</Link>
                    <ConfirmButton className="btn quiet sm" label="Remover" confirm="Toque de novo para remover" onConfirm={() => actions.toggleWish(g.id)} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {owning && s.games[owning] && <OwnedSheet gameId={owning} onClose={() => setOwning(null)} />}
    </main>
  );
}

/** "Já é meu": vira uma cópia na estante e sai dos Desejos. */
function OwnedSheet({ gameId, onClose }: { gameId: string; onClose: () => void }) {
  const g = useStore((x) => x.games[gameId]);
  const plats = [...new Set([...(g?.platforms ?? []), 'Outra plataforma'])];
  const [platform, setPlatform] = useState(plats[0]);
  const [kind, setKind] = useState<CopyKind>('fisico');
  if (!g) return null;
  const save = () => {
    actions.addCopy({ gameId, platform, kind });
    if (getState().wishes.some((w) => w.gameId === gameId)) actions.toggleWish(gameId);
    onClose();
  };
  return (
    <Sheet title={`${g.title} já é seu`} onClose={onClose} labelId="ja-e-meu">
      <p className="muted" style={{ margin: '0 0 8px' }}>Entra na sua estante e sai dos Desejos.</p>
      <label htmlFor="own-plat" className="finish__label">Plataforma</label>
      <select id="own-plat" className="field" value={platform} onChange={(e) => setPlatform(e.target.value)}>
        {plats.map((p) => <option key={p} value={p}>{shortPlatform(p)}</option>)}
      </select>
      <div className="finish__label">Formato</div>
      <div className="seg" role="group" aria-label="Formato">
        {([['fisico', 'Mídia física'], ['digital', 'Digital'], ['assinatura', 'Assinatura']] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>{l}</button>)}
      </div>
      <div className="sheet__actions"><button className="btn primary lg" onClick={save}>Guardar na estante</button><button className="btn quiet" onClick={onClose}>Cancelar</button></div>
    </Sheet>
  );
}
