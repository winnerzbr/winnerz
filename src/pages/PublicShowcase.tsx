import { useEffect, useState } from 'react';
import { Link } from '../lib/router';
import { profileApi, type PublicProfile } from '../data/profileApi';
import { Cabinet } from '../components/Showcase';
import { pubShelfItem } from './PublicProfile';

/** Uma vitrine do perfil, aberta: o expositor inteiro, com a porta e as luzes. */
export function PublicShowcasePage({ handle, id }: { handle: string; id: string }) {
  const key = new URLSearchParams(location.search).get('k');
  const [data, setData] = useState<PublicProfile | null | undefined>(undefined);
  useEffect(() => { setData(undefined); profileApi.publicOf(handle, key).then(setData).catch(() => setData(null)); }, [handle, key]);
  const v = data?.vitrines?.find((x) => x.id === id);
  useEffect(() => { document.title = v ? `${v.title} · @${data!.handle} · WinnerZ` : 'Vitrine · WinnerZ'; }, [v, data]);
  const back = `/@${handle.toLowerCase()}${key ? `?k=${key}` : ''}#museu`;
  if (data === undefined) return <main className="page pad"><p className="muted">Abrindo a vitrine…</p></main>;
  if (!v) return (
    <main className="page pad narrow pp-empty">
      <h1 className="t big">Vitrine fechada</h1>
      <p className="muted lead">Esta vitrine não existe, ou não está aberta para você.</p>
      <Link className="btn ghost" to={back}>Ver o perfil</Link>
    </main>
  );
  return (
    <main className="page pad vitrine">
      <Link to={back} className="kicker vitrine__back">← @{data!.handle} · Vitrines</Link>
      <header className="vitrine__head">
        <span className="kicker">Vitrine de @{data!.handle} · {v.items.length} {v.items.length === 1 ? 'peça' : 'peças'}</span>
        <h1 className="t big vitrine__title">{v.title}</h1>
        {v.description && <p className="lead vitrine__desc">{v.description}</p>}
      </header>
      <Cabinet items={v.items.map(pubShelfItem)} owner={data!.handle} />
    </main>
  );
}
