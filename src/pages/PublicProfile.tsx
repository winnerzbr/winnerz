import { useEffect, useState } from 'react';
import { Link, usePath } from '../lib/router';
import { useStore } from '../data/store';
import { CoverArt } from '../components/CoverArt';
import { linkLabel, profileApi, type PublicProfile } from '../data/profileApi';
import { whenLabel } from '../lib/dates';
import { formatScore, scaleMax } from '../lib/rating';
import { shortPlatform } from '../lib/platforms';

const since = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });

/** O perfil como os outros veem: só os pilares que a pessoa liberou (todo mundo, ou quem tem o link). */
export function PublicProfilePage({ handle }: { handle: string }) {
  usePath();
  const mode = useStore((s) => s.mode);
  const scale = useStore((s) => s.prefs.scale);
  const me = useStore((s) => s.profile);
  const key = new URLSearchParams(location.search).get('k');
  const [data, setData] = useState<PublicProfile | null | undefined>(undefined);
  const [mine, setMine] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(undefined); setError('');
    profileApi.publicOf(handle, key).then(setData).catch((e) => { setError(e instanceof Error ? e.message : 'Não consegui carregar.'); setData(null); });
    if (mode === 'demo' || me) profileApi.mine().then((p) => setMine(!!p?.handle && p.handle.toLowerCase() === handle.toLowerCase())).catch(() => setMine(false));
  }, [handle, key, mode, me]);

  useEffect(() => {
    document.title = data ? `${data.name} (@${data.handle}) · WinnerZ` : 'Perfil · WinnerZ';
    // Perfil só com link não deve aparecer em buscadores.
    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (data?.onlyLink || key) {
      if (!meta) { meta = document.createElement('meta'); meta.name = 'robots'; document.head.appendChild(meta); }
      meta.content = 'noindex';
    }
    return () => { document.querySelector('meta[name="robots"]')?.remove(); };
  }, [data, key]);

  if (data === undefined) return <main className="page pad"><p className="muted">Carregando o perfil…</p></main>;
  if (!data) return (
    <main className="page pad narrow pp-empty">
      <h1 className="t big">Perfil não encontrado</h1>
      <p className="muted lead">{error || 'Este endereço não existe, ou a pessoa ainda não abriu nada do perfil para você.'}</p>
      {mine && <Link className="btn primary" to="/preferencias#perfil">Abrir algum pilar do seu perfil</Link>}
    </main>
  );

  const j = data.jornada, c = data.colecao, n = data.notas;
  return (
    <main className="pp">
      {mine && (
        <div className="pp-owner"><div className="page pp-owner__row">
          <span>É assim que {key ? 'quem tem o seu link vê' : 'todo mundo vê'} o seu perfil.</span>
          <Link to="/preferencias#perfil">Mudar o que aparece</Link>
        </div></div>
      )}
      <section className="pph">
        <div className="pph__line" aria-hidden="true" />
        <div className="page pph__inner">
          <span className="pph__avatar" aria-hidden="true">{data.name.slice(0, 1).toUpperCase()}</span>
          <div className="pph__text">
            <span className="kicker">Perfil no WinnerZ · @{data.handle}</span>
            <h1 className="t pph__name">{data.name}</h1>
            {data.bio && <p className="pph__bio">{data.bio}</p>}
            <p className="pph__since">No WinnerZ desde {since(data.since)}</p>
            {!!data.links?.length && <div className="pph__links">{data.links.map((l) => <a key={l.url} className="btn ghost sm" href={l.url} target="_blank" rel="noopener noreferrer me">{linkLabel(l)}</a>)}</div>}
          </div>
          <dl className="pph__stats">
            {j && <><div><dt>Jornadas</dt><dd className="t">{j.journeys}</dd></div><div><dt>Zerados</dt><dd className="t">{j.finished}</dd></div></>}
            {c && <div><dt>Na coleção</dt><dd className="t">{c.count}</dd></div>}
            {n && <div><dt>Análises</dt><dd className="t">{n.length}</dd></div>}
          </dl>
        </div>
      </section>

      <div className="page pp__body">
        {data.live && (
          <Link to={`/jogos/${data.live.slug}`} className="pp-live">
            <span className="pp-live__dot" aria-hidden="true" />
            <span className="pp-live__cover"><CoverArt game={{ title: data.live.title, cover: data.live.cover ?? '' }} /></span>
            <span className="pp-live__text"><span className="kicker kicker--now">Jogando agora</span><b>{data.live.title}</b><span className="muted">Sessão aberta desde {new Date(data.live.since).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}</span></span>
          </Link>
        )}

        {!!data.showcase?.length && (
          <section className="pp__sec" aria-labelledby="pp-s">
            <h2 id="pp-s" className="t pp__h">Jornadas em destaque</h2>
            <ul className="pp-show">
              {data.showcase.map((g) => (
                <li key={g.slug}><Link to={`/@${data.handle.toLowerCase()}/${g.slug}${key ? `?k=${key}` : ''}`} className="pp-show__card on-photo">
                  {(g.backdrop || g.cover) && <img className="pp-show__bg" src={g.backdrop || g.cover!} alt="" loading="lazy" />}
                  <span className="pp-show__shade" aria-hidden="true" />
                  <span className="pp-show__text">
                    <span className="kicker">{g.finished ? 'Zerado' : 'Em andamento'}{g.stories > 1 ? ` · ${g.stories} Histórias` : ''}</span>
                    <b className="t">{g.title}</b>
                    <span className="pp-show__meta">{g.moments} {g.moments === 1 ? 'momento guardado' : 'momentos guardados'} · Ver a linha do tempo →</span>
                  </span>
                </Link></li>
              ))}
            </ul>
          </section>
        )}

        {j && (
          <section className="pp__sec" aria-labelledby="pp-j">
            <h2 id="pp-j" className="t pp__h">Jornada</h2>
            {j.playing.length > 0 && <>
              <h3 className="kicker kicker--now pp__sub">Jogando agora</h3>
              <ul className="pp-play">
                {j.playing.map((g) => (
                  <li key={g.slug + g.ordinal}><Link to={`/jogos/${g.slug}`} className="pp-play__card">
                    <span className="pp-play__cover"><CoverArt game={{ title: g.title, cover: g.cover ?? "" }} /></span>
                    <span className="pp-play__text">
                      <b>{g.title}</b>
                      <span className="mono">{g.ordinal > 1 ? `História ${g.ordinal} · ` : ''}desde {whenLabel(g.startedAt, g.startedPrecision, { short: true })}</span>
                      {g.progress != null && <span className="hline pp-play__prog" aria-label={`${g.progress}%`}><i style={{ width: `${g.progress}%` }} /><b style={{ left: `${g.progress}%` }} /></span>}
                    </span>
                  </Link></li>
                ))}
              </ul>
            </>}
            {j.completed.length > 0 && <>
              <h3 className="kicker pp__sub">Zerados</h3>
              <ul className="pp-grid">
                {j.completed.map((g) => (
                  <li key={g.slug + g.ordinal}><Link to={`/jogos/${g.slug}`} className="pp-grid__item">
                    <span className="pp-grid__cover"><CoverArt game={{ title: g.title, cover: g.cover ?? "" }} /></span>
                    <span className="pp-grid__t">{g.title}</span>
                    <span className="mono pp-grid__d"><i aria-hidden="true" />{whenLabel(g.completedAt ?? undefined, g.completedPrecision, { short: true })}</span>
                  </Link></li>
                ))}
              </ul>
            </>}
            {!j.playing.length && !j.completed.length && <p className="muted">Nenhuma Jornada para mostrar ainda.</p>}
          </section>
        )}

        {c && (
          <section className="pp__sec" aria-labelledby="pp-c">
            <h2 id="pp-c" className="t pp__h">Coleção</h2>
            <div className="pp-plats">{c.platforms.map((p) => <span key={p.platform} className="chip">{shortPlatform(p.platform)} <small>{p.n}</small></span>)}</div>
            <ul className="pp-grid pp-grid--dense">
              {c.items.map((g, k) => (
                <li key={g.slug + k}><Link to={`/jogos/${g.slug}`} className="pp-grid__item" title={g.title}>
                  <span className="pp-grid__cover"><CoverArt game={{ title: g.title, cover: g.cover ?? "" }} platform={g.platform} /></span>
                </Link></li>
              ))}
            </ul>
            {c.count > c.items.length && <p className="muted pp__more">E mais {c.count - c.items.length}.</p>}
          </section>
        )}

        {n && (
          <section className="pp__sec" aria-labelledby="pp-n">
            <h2 id="pp-n" className="t pp__h">Notas e análises</h2>
            {n.length === 0 ? <p className="muted">Nenhuma análise ainda.</p> : (
              <ul className="pp-notes">
                {n.map((r) => (
                  <li key={r.slug}><Link to={`/jogos/${r.slug}`} className="pp-note">
                    <span className="pp-note__cover"><CoverArt game={{ title: r.title, cover: r.cover ?? "" }} /></span>
                    <span className="pp-note__body">
                      <span className="pp-note__game">{r.title}</span>
                      {r.reviewTitle && <b className="pp-note__title">{r.reviewTitle}</b>}
                      {r.spoiler ? <span className="pp-note__spoiler">Contém spoiler · leia na ficha do jogo</span> : r.text && <span className="pp-note__text">{r.text}</span>}
                    </span>
                    <span className="pp-note__score"><span className="t">{formatScore(r.normalized, scale)}</span><small>/{scaleMax(scale)}</small></span>
                  </Link></li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
