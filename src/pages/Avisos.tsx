import { useCallback, useEffect, useState } from 'react';
import { Link, navigate, usePath } from '../lib/router';
import { useStore } from '../data/store';
import { FILTERS, notifApi, type Notif, type NotifFilter } from '../data/notifApi';
import { NotifItem } from '../components/Notifications';
import { dayKey } from '../lib/when';

const isFilter = (x: string | null): x is NotifFilter => !!x && FILTERS.some((f) => f.k === x);

/** Hoje, Ontem, Esta semana, Antes. */
function bucket(iso: string): string {
  const k = dayKey(new Date(iso));
  if (k === dayKey(new Date())) return 'Hoje';
  if (k === dayKey(new Date(Date.now() - 86_400_000))) return 'Ontem';
  if (Date.now() - Date.parse(iso) < 7 * 86_400_000) return 'Esta semana';
  return 'Antes';
}

export function AvisosPage() {
  const path = usePath();
  const signedOut = useStore((s) => s.mode === 'supabase' && !s.profile);
  const q = new URLSearchParams(path.split('?')[1] ?? '');
  const f: NotifFilter = isFilter(q.get('f')) ? (q.get('f') as NotifFilter) : 'tudo';
  const [items, setItems] = useState<Notif[] | null>(null);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { document.title = 'Avisos · WinnerZ'; }, []);
  const load = useCallback(async () => {
    setItems(null); setErr('');
    try { const r = await notifApi.list(f, null, 30); setItems(r.items); setMore(r.more); void notifApi.seen(); } catch (e) { setErr(e instanceof Error ? e.message : 'Não deu para carregar.'); setItems([]); }
  }, [f]);
  useEffect(() => { void load(); }, [load]);
  if (signedOut) return <main className="page pad narrow"><h1 className="t big">Avisos</h1><p className="muted lead">Entre na sua conta para ver os seus avisos.</p><Link className="btn primary" to="/entrar">Entrar</Link></main>;
  const next = async () => {
    if (!items?.length) return;
    setBusy(true);
    try { const r = await notifApi.list(f, items[items.length - 1].at, 30); setItems([...items, ...r.items]); setMore(r.more); } catch (e) { setErr(e instanceof Error ? e.message : 'Não deu para carregar.'); } finally { setBusy(false); }
  };
  const toggle = async (n: Notif) => { await notifApi.read(n.ids, !n.read); setItems((l) => l?.map((x) => (x.id === n.id ? { ...x, read: !x.read } : x)) ?? l); };
  const readAll = async () => { await notifApi.readAll(f); setItems((l) => l?.map((x) => ({ ...x, read: true })) ?? l); };
  const groups: [string, Notif[]][] = [];
  (items ?? []).forEach((n) => { const b = bucket(n.at); const g = groups.find(([k]) => k === b); if (g) g[1].push(n); else groups.push([b, [n]]); });
  const unread = (items ?? []).some((n) => !n.read);
  return (
    <main className="page pad avisos">
      <header className="studio__head avisos__head">
        <div>
          <h1 className="t big">Avisos</h1>
          <p className="muted lead">Respostas, convites, jogatinas, amigos, lançamentos e recados do site, tudo num lugar só.</p>
        </div>
        <div className="avisos__acts">
          {unread && <button className="btn ghost sm" onClick={() => void readAll()}>Marcar {f === 'tudo' || f === 'naolidos' ? 'tudo' : 'estes'} como lido</button>}
          <Link className="btn quiet sm" to="/preferencias#avisos">Escolher os avisos</Link>
        </div>
      </header>
      <nav className="avisos__chips" aria-label="Filtrar avisos">
        {FILTERS.map((x) => <button key={x.k} className={`chip${f === x.k ? ' is-on' : ''}`} aria-pressed={f === x.k} onClick={() => navigate(x.k === 'tudo' ? '/avisos' : `/avisos?f=${x.k}`, { replace: true, keepScroll: true })}>{x.label}</button>)}
      </nav>
      {err && <p className="awards__error" role="alert">{err}</p>}
      {items == null ? <p className="faint">Carregando…</p> : items.length === 0
        ? <div className="soc-empty"><b>{f === 'naolidos' ? 'Tudo lido.' : 'Nenhum aviso aqui ainda.'}</b><p className="muted">Quando alguém responder, mencionar, convidar ou seguir você, o aviso aparece aqui e no sino.</p></div>
        : groups.map(([g, l]) => (
          <section key={g} className="avisos__g" aria-label={g}>
            <h2 className="club__h3">{g}</h2>
            <ul className="notif-list">{l.map((n) => <NotifItem key={n.id} n={n} onToggle={() => void toggle(n)} />)}</ul>
          </section>
        ))}
      {more && <button className="btn ghost avisos__more" disabled={busy} onClick={() => void next()}>{busy ? 'Carregando…' : 'Mostrar mais'}</button>}
    </main>
  );
}
