import { useEffect, useState } from 'react';
import { Link, usePath } from '../lib/router';
import { profileApi, type PublicJourney } from '../data/profileApi';
import { whenLabel } from '../lib/dates';
import { igdbSize } from '../lib/backdrop';
import { ReportButton } from '../components/Moderation';

const KIND: Record<string, string> = { inicio: 'Início', momento: 'Momento', marco: 'Marco', sessao: 'Sessão' };
const STATE: Record<string, string> = { ativa: 'Em andamento', pausada: 'Pausada', concluida: 'Zerada', encerrada: 'Encerrada', dropada: 'Largada' };
const day = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Sao_Paulo' }).replace('.', '');

type Ev = PublicJourney['events'][number];
type Row = { kind: 'ev'; ev: Ev } | { kind: 'sessions'; n: number; from: string; to: string; id: string };

/** Sessões seguidas viram uma linha só ("4 sessões, de 2 a 9 out"); o que importa na vitrine são os momentos. */
function rowsOf(evs: Ev[]): Row[] {
  const out: Row[] = [];
  for (const e of evs) {
    const last = out[out.length - 1];
    if (e.kind === 'sessao') {
      if (last?.kind === 'sessions') { last.n++; last.to = e.at; } else out.push({ kind: 'sessions', n: 1, from: e.at, to: e.at, id: e.id });
    } else out.push({ kind: 'ev', ev: e });
  }
  return out;
}

/** Uma Jornada mostrada no perfil: a história de um jogo contada pelos momentos, para quem acompanha o canal. */
export function PublicJourneyPage({ handle, slug }: { handle: string; slug: string }) {
  usePath();
  const key = new URLSearchParams(location.search).get('k');
  const [data, setData] = useState<PublicJourney | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    setData(undefined); setError('');
    profileApi.journeyOf(handle, key, slug).then(setData).catch((e) => { setError(e instanceof Error ? e.message : 'Não consegui carregar.'); setData(null); });
  }, [handle, slug, key]);
  useEffect(() => { document.title = data ? `${data.game.title} · a Jornada de @${data.handle} · WinnerZ` : 'Jornada · WinnerZ'; }, [data]);

  const back = `/@${handle.toLowerCase()}${key ? `?k=${key}` : ''}`;
  if (data === undefined) return <main className="page pad"><p className="muted">Carregando a Jornada…</p></main>;
  if (!data) return (
    <main className="page pad narrow pp-empty">
      <h1 className="t big">Jornada não encontrada</h1>
      <p className="muted lead">{error && error !== 'not_found' ? error : 'Esta Jornada não está no perfil, ou não foi aberta para você.'}</p>
      <Link className="btn ghost" to={back}>Ver o perfil</Link>
    </main>
  );

  const bg = data.game.backdrop ? igdbSize(data.game.backdrop, 't_1080p') : data.game.cover ? igdbSize(data.game.cover, 't_1080p') : null;
  const moments = data.events.filter((e) => e.kind === 'momento').length;
  const sessions = data.events.filter((e) => e.kind === 'sessao').length;
  const multi = data.histories.length > 1;

  return (
    <main className="pj">
      <section className="pjh on-photo">
        {bg && <img className="pjh__bg" src={bg} alt="" />}
        <div className="pjh__shade" aria-hidden="true" />
        <div className="page pjh__inner">
          <Link to={back} className="kicker pjh__back">← A Jornada de @{data.handle}</Link>
          <h1 className="t pjh__title">{data.game.title}</h1>
          <p className="pjh__meta">{[data.game.developer, data.game.year].filter(Boolean).join(', ')}</p>
          <ReportButton kind="jornada" handle={data.handle} refId={data.game.slug} snapshot={{ game: data.game.title, slug: data.game.slug }} what={`A Jornada de @${data.handle} com ${data.game.title}: os textos, as fotos e os marcos.`} label="Denunciar a Jornada" className="pjh__report" />
          <dl className="pjh__stats">
            <div><dt>{data.histories.length === 1 ? 'História' : 'Histórias'}</dt><dd className="t">{data.histories.length}</dd></div>
            <div><dt>Sessões</dt><dd className="t">{sessions}</dd></div>
            <div><dt>Momentos</dt><dd className="t">{moments}</dd></div>
          </dl>
        </div>
      </section>

      <div className="page pj__body">
        {data.histories.map((h) => {
          const evs = data.events.filter((e) => e.historyId === h.id);
          if (!evs.length) return null;
          return (
            <section key={h.id} className="pj__hist" aria-label={h.title}>
              {multi && (
                <header className="pj__hhead">
                  <h2 className="t">{h.title}</h2>
                  <span className="kicker">{STATE[h.state] ?? h.state} · {whenLabel(h.startedAt, h.startedPrecision, { short: true })}{h.completedAt ? ` → ${whenLabel(h.completedAt, h.completedPrecision, { short: true })}` : ''}</span>
                </header>
              )}
              <ol className="pjt">
                {rowsOf(evs).map((r) => r.kind === 'sessions' ? (
                  <li key={r.id} className="pjt__item pjt__item--sess">
                    <span className="pjt__mk" aria-hidden="true" />
                    <span className="pjt__date mono">{r.n === 1 ? day(r.from) : `${day(r.from)} a ${day(r.to)}`}</span>
                    <span className="pjt__sess">{r.n} {r.n === 1 ? 'sessão' : 'sessões'}</span>
                  </li>
                ) : (
                  <li key={r.ev.id} className={`pjt__item pjt__item--${r.ev.kind}`}>
                    <span className="pjt__mk" aria-hidden="true" />
                    <span className="pjt__date mono">{r.ev.dateLabel || day(r.ev.at)} · {KIND[r.ev.kind]}</span>
                    <h3 className="pjt__title">{r.ev.title}</h3>
                    {r.ev.quote && <p className="pjt__quote">“{r.ev.quote}”</p>}
                    {r.ev.text && !r.ev.quote && <p className="pjt__text">{r.ev.text}</p>}
                    {r.ev.image && <button className="pjt__photo" onClick={() => setPhoto(r.ev.image!)} aria-label={`Ampliar a foto: ${r.ev.title}`}><img src={r.ev.image} alt="" loading="lazy" /></button>}
                    {(r.ev.image || r.ev.quote || r.ev.text) && r.ev.kind !== 'inicio' && (
                      <ReportButton kind="momento" handle={data.handle} refId={r.ev.id} snapshot={{ title: r.ev.title, quote: r.ev.quote ?? null, text: r.ev.text ?? null, game: data.game.title, slug: data.game.slug, photo: !!r.ev.image }}
                        what={`O momento “${r.ev.title}”, da Jornada de @${data.handle} com ${data.game.title}.`} className="pjt__report" />
                    )}
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
        <p className="pj__foot muted">Recados, pontos para voltar e anotações das sessões ficam só com @{data.handle}.</p>
      </div>

      {photo && (
        <div className="pj-lightbox" role="dialog" aria-modal="true" aria-label="Foto ampliada" onClick={() => setPhoto(null)}>
          <img src={photo} alt="" />
          <button className="btn quiet pj-lightbox__x" onClick={() => setPhoto(null)}>Fechar</button>
        </div>
      )}
    </main>
  );
}
