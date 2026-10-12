import { Link } from '../lib/router';
import { useStore, currentHistory, historiesOf, lastNote } from '../data/store';
import { ago } from '../lib/format';

export function JourneyIndex() {
  const s = useStore((x) => x);
  const rows = s.journeys.map((j) => {
    const h = currentHistory(s, j.id);
    const last = [...s.sessions].filter((x) => x.journeyId === j.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
    return { j, g: s.games[j.gameId], h, n: historiesOf(s, j.id).length, last, note: lastNote(s, j.id) };
  }).filter((r) => r.g);
  const going = rows.filter((r) => r.h && r.h.state === 'ativa' && r.j.mood !== 'pausado');
  const paused = rows.filter((r) => r.h && (r.h.state === 'pausada' || r.j.mood === 'pausado'));
  const done = rows.filter((r) => r.h && r.h.state === 'concluida');

  const Group = ({ title, list, hint }: { title: string; list: typeof rows; hint?: string }) => list.length ? (
    <section className="block">
      <div className="block__head"><h2 className="t">{title}</h2>{hint && <span className="muted">{hint}</span>}</div>
      <div className="jgrid">
        {list.map(({ j, g, h, n, last, note }) => (
          <Link key={j.id} to={`/jornada/${g.slug}`} className="jcard on-photo">
            <img src={g.backdrop ?? g.cover} alt="" />
            <div className="jcard__shade" aria-hidden="true" />
            <div className="jcard__body">
              <div className="jcard__meta">{n > 1 ? `${n} Histórias` : 'Primeira História'}{last ? `, última sessão ${ago(last.startedAt)}` : ''}</div>
              <div className="t jcard__title">{g.title}</div>
              {note?.note && <div className="quote jcard__note">“{note.note}”</div>}
              {h?.progress != null && h.state !== 'concluida' && <div className="bar bar--thin"><span style={{ width: `${h.progress}%` }} /></div>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  ) : null;

  return (
    <main className="page pad">
      <h1 className="t big">Jornada</h1>
      <p className="muted lead">Toda história tem um próximo instante. O resto pode esperar.</p>
      {rows.length === 0 && <p className="card tl-empty">Nenhuma Jornada ainda. Escolha um jogo na <Link to="/colecao">estante</Link> e toque em Jogar.</p>}
      <Group title="Jogando agora" list={going} />
      <Group title="Pausados" list={paused} hint="Sem pressa. Eles esperam." />
      <Group title="Histórias concluídas" list={done} />
    </main>
  );
}
