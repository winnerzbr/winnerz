import { useEffect, useMemo, useState } from 'react';
import { Link, navigate } from '../lib/router';
import { useStore } from '../data/store';
import { avatarUrl, profileApi, type PublicCollectionItem, type PublicProfile } from '../data/profileApi';
import { socialApi, type Activity, type FollowState } from '../data/socialApi';
import { affinity, type GameRef } from '../lib/affinity';
import { CoverArt } from './CoverArt';
import { useMyHandle } from './Moderation';
import { useBlocks } from '../data/moderationApi';

const short = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'America/Sao_Paulo' }).replace('.', '');

/* ------------------------------------------------------------------ */
/* Seguir                                                               */
/* ------------------------------------------------------------------ */
export function useFollow(handle: string) {
  const mode = useStore((s) => s.mode);
  const signed = useStore((s) => !!s.profile);
  const [st, setSt] = useState<FollowState | null | undefined>(undefined);
  useEffect(() => {
    if (mode === 'supabase' && !signed) { setSt(null); return; }
    let alive = true;
    setSt(undefined);
    socialApi.state(handle).then((x) => alive && setSt(x)).catch(() => alive && setSt(null));
    return () => { alive = false; };
  }, [handle, mode, signed]);
  return [st, setSt] as const;
}

/** Seguir / Seguindo / Amigos / Seguir de volta. Deixar de seguir pede um segundo toque. */
export function FollowButton({ handle, onChange, className = '' }: { handle: string; onChange?: (s: FollowState) => void; className?: string }) {
  const mine = useMyHandle();
  const signedOut = useStore((s) => s.mode === 'supabase' && !s.profile);
  const [st, setSt] = useFollow(handle);
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 4000); return () => clearTimeout(t); }, [armed]);
  if (mine && mine.toLowerCase() === handle.toLowerCase()) return null;
  if (signedOut) return <button className={`btn primary ${className}`} onClick={() => navigate('/entrar')}>Seguir</button>;
  if (!st || st.self || st.blocked) return null;
  const run = async (fn: () => Promise<FollowState | null>) => {
    setBusy(true); setErr(''); setArmed(false);
    try { const n = await fn(); if (n) { setSt(n); onChange?.(n); } }
    catch (e) { setErr(e instanceof Error ? e.message : 'Não deu certo agora.'); }
    finally { setBusy(false); }
  };
  const friends = st.following && st.followedBy;
  const label = armed ? 'Deixar de seguir' : friends ? 'Amigos' : st.following ? 'Seguindo' : st.followedBy ? 'Seguir de volta' : 'Seguir';
  const onClick = () => {
    if (!st.following) return void run(() => socialApi.follow(handle));
    if (!armed) return setArmed(true);
    void run(() => socialApi.unfollow(handle));
  };
  return (
    <span className="follow">
      <button className={`btn ${st.following ? 'ghost' : 'primary'} follow__btn${friends ? ' is-friends' : ''}${armed ? ' is-armed' : ''} ${className}`} disabled={busy} onClick={onClick} aria-pressed={st.following}>
        {friends && !armed && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>}
        {label}
      </button>
      {err && <span className="awards__error follow__err" role="alert">{err}</span>}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Afinidade (no perfil de outra pessoa)                                */
/* ------------------------------------------------------------------ */
export function AffinityCard({ data }: { data: PublicProfile }) {
  const mode = useStore((s) => s.mode);
  const profile = useStore((s) => s.profile);
  const games = useStore((s) => s.games);
  const journeys = useStore((s) => s.journeys);
  const histories = useStore((s) => s.histories);
  const copies = useStore((s) => s.copies);
  const wishes = useStore((s) => s.wishes);
  const [shelf, setShelf] = useState<PublicCollectionItem[] | null>(null);
  useEffect(() => {
    if (!data.colecao) { setShelf(null); return; }
    let alive = true;
    const key = new URLSearchParams(location.search).get('k');
    profileApi.collectionOf(data.handle, key).then((l) => alive && setShelf(l)).catch(() => alive && setShelf(null));
    return () => { alive = false; };
  }, [data.handle, data.colecao]);

  const a = useMemo(() => {
    const ref = (id: string): GameRef | null => { const g = games[id]; return g ? { slug: g.slug, title: g.title, cover: g.cover ?? null } : null; };
    const jGame = (jid: string) => journeys.find((x) => x.id === jid)?.gameId ?? '';
    const pick = (l: (GameRef | null)[]) => l.filter((x): x is GameRef => !!x);
    const st = data.stage;
    return affinity({
      mine: {
        done: pick(histories.filter((h) => h.state === 'concluida').map((h) => ref(jGame(h.journeyId)))),
        playing: pick(histories.filter((h) => h.state === 'ativa' || h.state === 'pausada').map((h) => ref(jGame(h.journeyId)))),
        shelf: pick(copies.map((c) => ref(c.gameId))),
        wishes: pick(wishes.map((w) => ref(w.gameId))),
      },
      theirs: {
        done: (data.jornada?.completed ?? []).map((g) => ({ slug: g.slug, title: g.title, cover: g.cover })),
        playing: [...(data.jornada?.playing ?? []), ...(data.jornada?.paused ?? [])].map((g) => ({ slug: g.slug, title: g.title, cover: g.cover })),
        shelf: (shelf ?? data.colecao?.items ?? []).map((g) => ({ slug: g.slug, title: g.title, cover: g.cover })),
        loved: [...(st?.defining ? [st.defining] : []), ...(st?.top ?? [])].map((g) => ({ slug: g.slug, title: g.title, cover: g.cover })),
      },
    });
  }, [data, shelf, games, journeys, histories, copies, wishes]);

  if (mode === 'supabase' && !profile) return null;
  if (!a.common.length && !a.tips.length) return null;
  const lines: string[] = [];
  if (a.playingSame.length) lines.push(`Vocês dois estão jogando ${a.playingSame.map((g) => g.title).slice(0, 2).join(' e ')}.`);
  if (a.lovedCommon.length) lines.push(`${a.lovedCommon.length === 1 ? 'Um' : a.lovedCommon.length} dos jogos que marcaram @${data.handle} ${a.lovedCommon.length === 1 ? 'também é seu' : 'também são seus'}: ${a.lovedCommon.map((g) => g.title).slice(0, 2).join(', ')}.`);
  if (a.bothDone.length) lines.push(`Vocês dois zeraram ${a.bothDone.length} ${a.bothDone.length === 1 ? 'jogo' : 'jogos'}.`);
  if (a.tips.length) lines.push(`@${data.handle} já zerou ${a.tips.length === 1 ? `${a.tips[0].title}, que está` : `${a.tips.length} jogos que estão`} nos seus desejos.`);
  return (
    <div className="pd-common aff">
      <div className="aff__head">
        <span className="kicker">Você e @{data.handle}</span>
        {a.score != null && <span className="aff__score"><b className="t">{a.score}</b><small>%</small></span>}
      </div>
      {a.label && <p className="aff__label">{a.label}{a.common.length ? ` · ${a.common.length} ${a.common.length === 1 ? 'jogo' : 'jogos'} em comum` : ''}</p>}
      {a.score != null && <span className="aff__bar" aria-hidden="true"><i style={{ width: `${Math.max(4, a.score)}%` }} /></span>}
      {lines.length > 0 && <ul className="aff__lines">{lines.map((l) => <li key={l}>{l}</li>)}</ul>}
      {a.common.length > 0 && <div className="pd-common__cv">{a.common.slice(0, 6).map((g) => <Link key={g.slug} to={`/jogos/${g.slug}`} title={g.title}><CoverArt game={{ title: g.title, cover: g.cover ?? '' }} /></Link>)}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pessoa (linha das listas)                                            */
/* ------------------------------------------------------------------ */
export function Avatar({ handle, avatar, size = 40 }: { handle: string | null; avatar?: string | null; size?: number }) {
  return (
    <span className="soc-av" style={{ width: size, height: size }} aria-hidden="true">
      {avatar ? <img src={avatarUrl(avatar) ?? ''} alt="" /> : (handle ?? '?').slice(0, 1).toUpperCase()}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Atividade dos amigos (Comunidade)                                    */
/* ------------------------------------------------------------------ */
const VERB: Record<Activity['kind'], string> = { jogando: 'começou a jogar', zerou: 'zerou', momento: 'guardou um momento em' };

export function FriendsActivity() {
  const [list, setList] = useState<Activity[] | null>(null);
  const [err, setErr] = useState('');
  const blocks = useBlocks();
  useEffect(() => {
    let alive = true;
    socialApi.activity().then((l) => alive && setList(l)).catch((e) => { if (alive) { setErr(e instanceof Error ? e.message : 'Não deu certo agora.'); setList([]); } });
    return () => { alive = false; };
  }, []);
  const muted = new Set((blocks ?? []).map((b) => (b.handle ?? '').toLowerCase()));
  const shown = (list ?? []).filter((x) => !muted.has(x.handle.toLowerCase()));
  if (list == null) return <p className="faint">Carregando…</p>;
  if (err) return <p className="awards__error" role="alert">{err}</p>;
  if (!shown.length) return (
    <div className="soc-empty">
      <b>Nada por aqui ainda.</b>
      <p className="muted">Quando você e alguém se seguirem, vocês viram amigos, e o que cada um jogar (o que deixou ver) aparece aqui.</p>
    </div>
  );
  return (
    <ol className="soc-feed">
      {shown.map((x, i) => (
        <li key={`${x.handle}-${x.kind}-${x.slug}-${i}`} className="soc-feed__it">
          <Link to={`/@${x.handle.toLowerCase()}`} aria-label={`Perfil de @${x.handle}`}><Avatar handle={x.handle} avatar={x.avatar} /></Link>
          <span className="soc-feed__tx">
            <span><Link to={`/@${x.handle.toLowerCase()}`} className="soc-feed__who">@{x.handle}</Link> {VERB[x.kind]} <Link to={x.shared ? `/@${x.handle.toLowerCase()}/${x.slug}` : `/jogos/${x.slug}`}>{x.title}</Link></span>
            {x.detail && <q className="soc-feed__q">{x.detail}</q>}
            <small className="mono faint">{short(x.at)}</small>
          </span>
          <Link to={`/jogos/${x.slug}`} className="soc-feed__cv" tabIndex={-1} aria-hidden="true"><CoverArt game={{ title: x.title, cover: x.cover ?? '' }} /></Link>
        </li>
      ))}
    </ol>
  );
}

/** Ir direto para um perfil pelo @. */
export function GoToProfile() {
  const [h, setH] = useState('');
  const clean = h.replace(/^@/, '').trim();
  return (
    <form className="soc-go" onSubmit={(e) => { e.preventDefault(); if (/^[A-Za-z0-9_]{3,24}$/.test(clean)) navigate(`/@${clean.toLowerCase()}`); }}>
      <label className="soc-go__f"><span aria-hidden="true">@</span><input className="field" value={h} onChange={(e) => setH(e.target.value.replace(/\s/g, ''))} placeholder="nome de usuário" aria-label="Ir para o perfil pelo @" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={25} /></label>
      <button className="btn ghost" disabled={!/^[A-Za-z0-9_]{3,24}$/.test(clean)}>Abrir perfil</button>
    </form>
  );
}
