import { useCallback, useEffect, useState } from 'react';
import { FriendsNow } from '../components/Presence';
import { MessageButton } from './Messages';
import { Link } from '../lib/router';
import { useStore } from '../data/store';
import { socialApi, type People, type Person } from '../data/socialApi';
import { Avatar, GoToProfile } from '../components/Social';

type Tab = 'amigos' | 'seguindo' | 'seguidores';
const TABS: { k: Tab; label: string }[] = [{ k: 'amigos', label: 'Amigos' }, { k: 'seguindo', label: 'Seguindo' }, { k: 'seguidores', label: 'Seguidores' }];

/** Comunidade · Pessoas: amigos, quem você segue e quem te segue. Só a própria pessoa vê as listas. */
export function PeoplePage() {
  const mode = useStore((s) => s.mode);
  const signed = useStore((s) => !!s.profile);
  const [tab, setTab] = useState<Tab>(() => ((location.hash.slice(1) as Tab) || 'amigos'));
  const [data, setData] = useState<People | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const load = useCallback(async () => {
    setErr('');
    try { setData(await socialApi.people()); } catch (e) { setErr(e instanceof Error ? e.message : 'Não deu certo agora.'); setData({ following: [], followers: [] }); }
  }, []);
  useEffect(() => { document.title = 'Pessoas · Comunidade · WinnerZ'; }, []);
  useEffect(() => { if (mode === 'demo' || signed) void load(); }, [mode, signed, load]);

  if (mode === 'supabase' && !signed) return (
    <main className="page pad narrow"><h1 className="t big">Pessoas</h1><p className="muted lead">Entre na sua conta para seguir pessoas e ver seus amigos.</p><Link className="btn primary" to="/entrar">Entrar</Link></main>
  );

  const friends = (data?.following ?? []).filter((p) => p.mutual);
  const lists: Record<Tab, Person[]> = { amigos: friends, seguindo: data?.following ?? [], seguidores: data?.followers ?? [] };
  const list = lists[tab];
  const pick = (t: Tab) => { setTab(t); history.replaceState(history.state, '', `${location.pathname}#${t}`); };
  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id); setErr('');
    try { await fn(); await load(); } catch (e) { setErr(e instanceof Error ? e.message : 'Não deu certo agora.'); } finally { setBusy(''); }
  };
  const EMPTY: Record<Tab, string> = {
    amigos: 'Amigos são pessoas que você segue e que seguem você de volta. Elas veem o que você deixou "só para amigos".',
    seguindo: 'Você ainda não segue ninguém. Abra o perfil de alguém pelo @ e toque em Seguir.',
    seguidores: 'Ninguém segue você ainda. Compartilhe o seu perfil para os amigos acharem você.',
  };

  return (
    <main className="page pad people">
      <header className="studio__head">
        <Link to="/comunidade" className="faint">← Comunidade</Link>
        <h1 className="t big">Pessoas</h1>
        <p className="muted lead">Seguir não precisa de aprovação. Quando os dois se seguem, vocês viram amigos.</p>
        {mode === 'demo' && <p className="faint">Na demonstração, @duda, @carol e @rafa são pessoas de exemplo.</p>}
      </header>
      <GoToProfile />
      <div className="people__now"><FriendsNow compact /></div>
      <div className="seg studio__tabs people__tabs" role="tablist" aria-label="Listas">
        {TABS.map((t) => <button key={t.k} role="tab" aria-selected={tab === t.k} aria-pressed={tab === t.k} onClick={() => pick(t.k)}>{t.label}{data ? ` (${lists[t.k].length})` : ''}</button>)}
      </div>
      {err && <p className="awards__error" role="alert">{err}</p>}
      {data == null ? <p className="faint">Carregando…</p> : list.length === 0 ? <div className="soc-empty"><p className="muted">{EMPTY[tab]}</p></div> : (
        <ul className="people__list">
          {list.map((p) => (
            <li key={p.id} className="people__row">
              <Avatar handle={p.handle} avatar={p.avatar} size={48} />
              <span className="people__who">
                {p.handle ? <Link to={`/@${p.handle.toLowerCase()}`}>@{p.handle}</Link> : <span className="muted">Conta sem @</span>}
                {p.bio && <small className="muted">{p.bio}</small>}
                <small className="faint">{tab === 'seguidores' ? (p.mutual ? 'Amigos' : 'Segue você') : p.mutual ? 'Amigos' : 'Você segue'}</small>
              </span>
              <span className="people__acts">
                {p.handle && <MessageButton handle={p.handle} className="btn sm ghost" />}
                {tab === 'seguidores' && !p.mutual && p.handle && <button className="btn sm primary" disabled={busy === p.id} onClick={() => void act(p.id, () => socialApi.follow(p.handle!))}>Seguir de volta</button>}
                {tab === 'seguidores' && <button className="btn sm quiet" disabled={busy === p.id} onClick={() => void act(p.id, () => socialApi.removeFollower(p.id, p.handle))} title="A pessoa não é avisada e pode seguir de novo">Remover</button>}
                {tab !== 'seguidores' && p.handle && <button className="btn sm ghost" disabled={busy === p.id} onClick={() => void act(p.id, () => socialApi.unfollow(p.handle!))}>Deixar de seguir</button>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
