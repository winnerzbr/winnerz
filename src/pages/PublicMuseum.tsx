import { useEffect, useState } from 'react';
import { Link } from '../lib/router';
import { profileApi, type PublicMuseum, type PublicMuseumPiece } from '../data/profileApi';
import { ExhibitView, RoomView } from '../components/MuseumView';
import { MuseumTour } from '../components/MuseumTour';
import { ReportButton } from '../components/Moderation';
import type { Exhibit } from '../lib/museum';
import { shortPlatform } from '../lib/platforms';

const day = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });

export function publicExhibit(p: PublicMuseumPiece, k: number): Exhibit | null {
  const caption = p.caption || undefined;
  switch (p.t) {
    case 'c': return { key: `c${k}`, t: 'c', title: p.title, sub: [shortPlatform(p.platform), p.year].filter(Boolean).join(' · '), cover: p.cover ?? '', platform: p.platform, slug: p.slug, caption };
    case 'h': return { key: `h${k}`, t: 'h', title: p.name, sub: p.platform ? shortPlatform(p.platform) : undefined, platform: p.platform ?? undefined, hwKind: p.kind, caption };
    case 'm': return { key: `m${k}`, t: 'm', title: p.title, sub: `${p.game} · ${day(p.at)}`, img: p.image, cover: p.cover ?? '', quote: p.quote ?? undefined, caption };
    case 'f': return p.image ? { key: `f${k}`, t: 'f', title: '', img: p.image, caption } : null;
  }
  return null;
}

/** O Museu aberto no perfil: só o que a pessoa pendurou, como está nas salas dela. */
export function PublicMuseumPage({ handle }: { handle: string }) {
  const key = new URLSearchParams(location.search).get('k');
  const [data, setData] = useState<PublicMuseum | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [list, setList] = useState(false);
  useEffect(() => {
    setData(undefined);
    profileApi.museumOf(handle, key).then(setData).catch((e) => { setError(e instanceof Error ? e.message : 'Não consegui carregar.'); setData(null); });
  }, [handle, key]);
  useEffect(() => { document.title = data ? `${data.title || 'Museu'} · @${data.handle} · WinnerZ` : 'Museu · WinnerZ'; }, [data]);
  const back = `/@${handle.toLowerCase()}${key ? `?k=${key}` : ''}`;

  if (data === undefined) return <main className="page pad"><p className="muted">Abrindo o museu…</p></main>;
  if (!data) return (
    <main className="page pad narrow pp-empty">
      <h1 className="t big">Museu fechado</h1>
      <p className="muted lead">{error || 'Este museu não existe, ou não está aberto para você.'}</p>
      <Link className="btn ghost" to={back}>Ver o perfil</Link>
    </main>
  );
  if (!list) {
    return (
      <main className="pmuseum-tour">
        <MuseumTour title={data.title || `O museu de ${data.name}`} intro={data.intro} owner={data.handle} back={back} onList={() => { setList(true); scrollTo(0, 0); }}
          rooms={data.rooms.map((r) => ({ title: r.title, text: r.text, exhibits: r.pieces.map(publicExhibit).filter((x): x is Exhibit => !!x) }))} />
        <div className="page pd-modline"><ReportButton kind="museu" handle={data.handle} snapshot={{ title: data.title ?? undefined, intro: data.intro }} what={`O Museu de @${data.handle}: as salas, os textos e as fotos.`} label="Denunciar o Museu" /></div>
      </main>
    );
  }
  return (
    <main className="page pad museum pmuseum">
      <span className="pmuseum__nav"><Link to={back} className="kicker vitrine__back">← @{data.handle}</Link><button className="btn ghost sm" onClick={() => { setList(false); scrollTo(0, 0); }}>Fazer a visita guiada</button></span>
      <header className="museum__hero">
        <span className="kicker">Museu pessoal de @{data.handle}</span>
        <h1 className="t museum__title">{data.title || `O museu de ${data.name}`}</h1>
        {data.intro && <p className="museum__intro">{data.intro}</p>}
        <ReportButton kind="museu" handle={data.handle} snapshot={{ title: data.title ?? undefined, intro: data.intro }} what={`O Museu de @${data.handle}: as salas, os textos e as fotos.`} label="Denunciar o Museu" />
      </header>
      {data.rooms.map((r, i) => {
        const ex = r.pieces.map(publicExhibit).filter((x): x is Exhibit => !!x);
        return (
          <RoomView key={r.id} index={i} title={<h2 className="t mroom__title">{r.title}</h2>} text={r.text ? <p className="mroom__text">{r.text}</p> : null}
            exhibits={ex.length ? ex.map((x) => <ExhibitView key={x.key} ex={x} />) : <p className="muted mroom__empty">Sala em montagem.</p>} />
        );
      })}
    </main>
  );
}
