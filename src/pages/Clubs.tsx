import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, navigate } from '../lib/router';
import { actions, getState, useStore } from '../data/store';
import { communityApi, slugOk, slugify, type Community, type GameMini } from '../data/communityApi';
import {
  ACCESS, FORMATS, FORMAT_LABEL, FORMAT_SHORT, clubApi,
  type Club, type ClubAccess, type ClubDraft, type ClubFormat, type ClubFull, type ClubLocked, type ClubPart, type ClubPerson,
} from '../data/clubApi';
import { clubLabel, jogatinaApi, type Jogatina } from '../data/jogatinaApi';
import { ensureRules } from '../data/moderationApi';
import { refreshNotifs } from '../data/notifApi';
import { ReportButton } from '../components/Moderation';
import { GroupChat, type ChatCtx } from '../components/GroupChat';
import { InviteBox, inviteSummary } from '../components/InviteBox';
import { GameSearchPick, PersonAvatar, PersonLink, ago, useProgressOf } from '../components/Posts';
import { CoverArt } from '../components/CoverArt';
import { Icon } from '../components/Icon';
import { gameBySlug } from '../components/AddGameDialog';
import { JogatinaTile, GameJogatinas } from './Jogatina';
import { dateOf, dateShort, whenLabel, TZ } from '../lib/when';
import { safeHref } from '../lib/safeHref';
import { FEATURES } from '../lib/features';

export { whenLabel } from '../lib/when';
const errOf = (e: unknown) => (e instanceof Error ? e.message : 'Não deu certo agora.');

/** Põe o jogo do clube na Jornada (se ainda não estiver). */
async function addToJourney(game: GameMini | null, clubName: string) {
  if (!game) return;
  const s = getState();
  if (s.journeys.some((j) => j.gameId === game.id)) return;
  const g = s.games[game.id] ?? (await gameBySlug(game.slug));
  if (!g) return;
  if (!s.games[g.id]) actions.mergeGames([g]);
  actions.ensureJourney(g.id, `Entrou no clube “${clubName}”.`);
}

/* ------------------------------------------------------------------ */
/* Cartão do clube (listas)                                             */
/* ------------------------------------------------------------------ */
export function ClubTile({ c }: { c: Club }) {
  return (
    <Link to={`/clube/${c.slug}`} className={`club-tile club-tile--${c.format}`}>
      <span className="club-tile__cv" aria-hidden="true">{c.game ? <CoverArt game={{ title: c.game.title, cover: c.game.cover ?? '' }} /> : null}</span>
      <span className="club-tile__tx">
        <span className="club-tile__top">
          <span className={`club-chip club-chip--${c.format}`}>{FORMAT_SHORT[c.format]}</span>
          {c.access !== 'aberto' && <span className="club-chip">{c.access === 'amigos' ? 'Só amigos' : 'Convite'}</span>}
        </span>
        <b className="club-tile__name">{c.name}</b>
        <small className="muted">{c.game?.title}{c.schedule ? ` · ${c.schedule}` : ''}</small>
        <small className="faint">{c.members} {c.members === 1 ? 'pessoa' : 'pessoas'}{c.next ? ` · próxima: ${whenLabel(c.next.startsAt)}` : ''}{c.me ? ' · você participa' : ''}</small>
      </span>
    </Link>
  );
}

/** Ficha do jogo: jogatinas marcadas e clubes deste jogo. */
export function GameClubs({ gameId, slug, title, onCount }: { gameId: string; slug: string; title: string; /** Quantos itens há (a ficha recolhe a parte da comunidade quando tudo está vazio). */ onCount?: (n: number) => void }) {
  const [list, setList] = useState<Club[] | null>(null);
  useEffect(() => { if (list) onCount?.(list.length); }, [list]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let alive = true;
    clubApi.list('todos', gameId).then((l) => alive && setList(l)).catch(() => alive && setList([]));
    return () => { alive = false; };
  }, [gameId]);
  if (list == null) return null;
  return (
    <section aria-labelledby="clubes-jogo" className="cm-gamesec">
      <div className="sec-head"><h2 id="clubes-jogo" className="t sec-title">Jogar junto</h2>
        <span className="club-sec__links"><Link to={`/jogatina/criar?jogo=${encodeURIComponent(slug)}`} className="btn ghost sm">Marcar jogatina</Link></span>
      </div>
      <GameJogatinas gameId={gameId} />
      {!FEATURES.clubes ? null : list.length === 0
        ? <p className="muted">Nenhum clube de {title} agora. <Link to={`/comunidade/clubes/criar?jogo=${encodeURIComponent(slug)}`}>Criar um clube</Link></p>
        : <div className="club-tiles">{list.slice(0, 6).map((c) => <ClubTile key={c.id} c={c} />)}</div>}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Todos os clubes                                                      */
/* ------------------------------------------------------------------ */
export function ClubsIndexPage() {
  const signed = useStore((s) => s.mode === 'demo' || !!s.profile);
  const [tab, setTab] = useState<'todos' | 'meus'>('todos');
  const [list, setList] = useState<Club[] | null>(null);
  const [fmt, setFmt] = useState<ClubFormat | ''>('');
  useEffect(() => { document.title = 'Clubes · WinnerZ'; }, []);
  useEffect(() => { setList(null); clubApi.list(tab).then(setList).catch(() => setList([])); }, [tab]);
  const shown = (list ?? []).filter((c) => !fmt || c.format === fmt);
  return (
    <main className="page pad cm-index">
      <header className="studio__head">
        <Link to="/comunidade" className="back">← Comunidade</Link>
        <h1 className="t big">Clubes</h1>
        <p className="muted lead">Grupos que continuam: um jogo de cada vez, no ritmo de cada clube, com agenda de jogatinas e as memórias de cada jogo. Para uma noite só, <Link to="/jogatina/criar">marque uma jogatina</Link>.</p>
      </header>
      <div className="cm-index__bar">
        <div className="seg" role="tablist" aria-label="Quais clubes">
          {([['todos', 'Abertos'], ...(signed ? [['meus', 'Os seus']] : [])] as [typeof tab, string][]).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} aria-pressed={tab === k} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        <Link className="btn primary" to="/comunidade/clubes/criar">Criar clube</Link>
      </div>
      <div className="club-filter" role="group" aria-label="Ritmo">
        <button className={`club-chip${!fmt ? ' is-on' : ''}`} aria-pressed={!fmt} onClick={() => setFmt('')}>Todos os ritmos</button>
        {FORMATS.map((f) => <button key={f.k} className={`club-chip club-chip--${f.k}${fmt === f.k ? ' is-on' : ''}`} aria-pressed={fmt === f.k} onClick={() => setFmt(f.k)}>{f.label}</button>)}
      </div>
      {list == null ? <p className="faint">Carregando…</p> : shown.length === 0
        ? <div className="soc-empty"><b>{tab === 'meus' ? 'Você ainda não está em nenhum clube.' : 'Nenhum clube aberto agora.'}</b><p className="muted"><Link to="/comunidade/clubes/criar">Criar um clube</Link></p></div>
        : <div className="club-tiles">{shown.map((c) => <ClubTile key={c.id} c={c} />)}</div>}
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Criar e editar                                                       */
/* ------------------------------------------------------------------ */
function PartsEditor({ parts, setParts, hint }: { parts: ClubPart[]; setParts: (f: (l: ClubPart[]) => ClubPart[]) => void; hint: string }) {
  const setPart = (i: number, patch: Partial<ClubPart>) => setParts((l) => l.map((p, k) => (k === i ? { ...p, ...patch } : p)));
  return (
    <>
      <small className="faint">{hint}</small>
      <ol className="club-parts-edit">
        {parts.map((p, i) => (
          <li key={i}>
            <span className="mono faint">{String(i + 1).padStart(2, '0')}</span>
            <input className="field" value={p.title} maxLength={80} onChange={(e) => setPart(i, { title: e.target.value })} placeholder={i === 0 ? 'Ex.: Até o primeiro chefe' : i === parts.length - 1 ? 'Ex.: Até o final' : 'Ex.: Capítulos 4 a 6'} aria-label={`Parte ${i + 1}`} />
            <input className="field" type="date" value={p.suggestedOn ?? ''} onChange={(e) => setPart(i, { suggestedOn: e.target.value || null })} aria-label={`Data sugerida da parte ${i + 1}`} />
            <button type="button" className="icon-btn" aria-label={`Tirar a parte ${i + 1}`} onClick={() => setParts((l) => l.filter((_, k) => k !== i))}><Icon name="fechar" size={14} /></button>
          </li>
        ))}
      </ol>
      {parts.length < 30 && <button type="button" className="btn quiet sm club-parts-edit__add" onClick={() => setParts((l) => [...l, { ordinal: l.length + 1, title: '' }])}>+ {parts.length ? 'Mais uma parte' : 'Dividir em partes'}</button>}
    </>
  );
}

function ClubForm({ initial, editing, busy, err, onSubmit }: { initial: ClubDraft & { game?: GameMini | null }; editing?: Club; busy: boolean; err: string; onSubmit: (d: ClubDraft) => void }) {
  const [format, setFormat] = useState<ClubFormat>(initial.format);
  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(!!editing);
  const [description, setDescription] = useState(initial.description);
  const [game, setGame] = useState<GameMini | null>(initial.game ?? null);
  const [access, setAccess] = useState<ClubAccess>(initial.access);
  const [max, setMax] = useState(initial.maxMembers ? String(initial.maxMembers) : '');
  const [schedule, setSchedule] = useState(initial.schedule ?? '');
  const [live, setLive] = useState(initial.liveUrl ?? '');
  const [parts, setParts] = useState<ClubPart[]>(initial.parts.length ? initial.parts : initial.format === 'sem_pressa' ? [{ ordinal: 1, title: '' }, { ordinal: 2, title: '' }, { ordinal: 3, title: '' }] : []);
  const [firstTime, setFirstTime] = useState(initial.firstTime ?? false);
  const [communityId, setCommunityId] = useState(initial.communityId ?? '');
  const [mine, setMine] = useState<Community[]>([]);
  useEffect(() => { communityApi.mine().then(setMine).catch(() => {}); }, []);
  useEffect(() => { if (!game && initial.game) setGame(initial.game); }, [initial.game]); // eslint-disable-line react-hooks/exhaustive-deps
  const pickFormat = (f: ClubFormat) => { setFormat(f); if (f === 'sem_pressa' && !parts.length) setParts(() => [{ ordinal: 1, title: '' }, { ordinal: 2, title: '' }, { ordinal: 3, title: '' }]); };
  const s = slugTouched ? slug : slugify(name);
  const slugBad = !editing && s.length > 0 && !slugOk(s);
  const liveBad = live.trim() !== '' && !/^https:\/\/\S{4,}$/.test(live.trim());
  const ready = name.trim().length >= 3 && !!game && !slugBad && !!s && !liveBad && (format !== 'sem_pressa' || parts.some((p) => p.title.trim()));
  return (
    <form className="cm-form club-form" onSubmit={(e) => {
      e.preventDefault();
      onSubmit({ slug: s, name, description, format, gameId: game?.id ?? null, access, maxMembers: max ? Math.max(2, Math.min(500, Number(max))) : null, communityId: communityId || null,
        schedule: schedule.trim() || null, liveUrl: live.trim() || null, parts: parts.filter((p) => p.title.trim()).map((p, i) => ({ ...p, ordinal: i + 1 })), firstTime });
    }}>
      <fieldset className="cm-form__f cm-kinds">
        <legend className="kicker">Ritmo</legend>
        <div className="cm-kinds__opts club-formats">
          {FORMATS.map((f) => (
            <label key={f.k} className={`cm-kinds__o${format === f.k ? ' is-on' : ''}`}>
              <input type="radio" name="fmt" checked={format === f.k} onChange={() => pickFormat(f.k)} />
              <b>{f.label}</b><small>{f.hint}</small>
            </label>
          ))}
        </div>
        <small className="faint">Para uma noite só, sem continuar depois, <Link to="/jogatina/criar">marque uma jogatina</Link>.</small>
      </fieldset>

      <div className="cm-form__f"><span className="kicker">{editing ? 'Jogo atual' : 'Primeiro jogo'}</span>
        {editing ? <p className="muted">{editing.game?.title}. Para trocar, use “Trocar o jogo” na página do clube.</p> : <GameSearchPick value={game} onChange={setGame} label="Jogo do clube" />}
      </div>

      <label className="cm-form__f"><span className="kicker">Nome</span>
        <input className="field" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder={format === 'recorrente' ? 'Ex.: Clube Retrô' : format === 'mes' ? 'Ex.: O jogo do mês' : format === 'sem_pressa' ? 'Ex.: Elden Ring sem pressa' : 'Ex.: Primeira vez em Hollow Knight'} />
      </label>
      {!editing && (
        <label className="cm-form__f"><span className="kicker">Endereço</span>
          <span className="cm-form__slug"><span className="mono faint">winnerz.com.br/clube/</span><input className="field" value={s} maxLength={32} onChange={(e) => { setSlugTouched(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }} aria-invalid={slugBad} /></span>
          {slugBad && <small className="awards__error">De 3 a 32 letras minúsculas, números ou hífens.</small>}
        </label>
      )}
      <label className="cm-form__f"><span className="kicker">Sobre o clube</span>
        <textarea className="field" rows={3} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="O combinado: para quem é, como funciona." />
      </label>
      <div className="club-form__row">
        <label className="cm-form__f"><span className="kicker">Combinado de dia e hora (opcional)</span>
          <input className="field" value={schedule} maxLength={80} onChange={(e) => setSchedule(e.target.value)} placeholder={format === 'mes' ? 'Ex.: um jogo por mês, conversa às quintas' : 'Ex.: sábados, 21h'} />
        </label>
        <label className="cm-form__f"><span className="kicker">Discord ou grupo (opcional)</span>
          <input className="field" value={live} onChange={(e) => setLive(e.target.value)} placeholder="https://discord.gg/…" inputMode="url" aria-invalid={liveBad} />
          {liveBad && <small className="awards__error">Cole o endereço completo, começando com https://</small>}
        </label>
      </div>

      <div className="cm-form__f"><span className="kicker">Partes do jogo{format === 'sem_pressa' ? '' : ' (opcional)'}</span>
        <PartsEditor parts={parts} setParts={setParts} hint={format === 'sem_pressa' ? 'Quem passar de uma parte abre a conversa dela. As datas são só sugestão.' : 'Se quiser, divida o jogo em partes: a conversa de cada parte só abre para quem passou dela.'} />
      </div>

      {format === 'primeira_vez' && !editing && (
        <fieldset className="cm-form__f cm-spoil"><legend className="kicker">E você?</legend>
          <label className={`cm-spoil__o${firstTime ? ' is-on' : ''}`}><input type="radio" name="ft" checked={firstTime} onChange={() => setFirstTime(true)} /><b>Também é a minha primeira vez</b></label>
          <label className={`cm-spoil__o${!firstTime ? ' is-on' : ''}`}><input type="radio" name="ft" checked={!firstTime} onChange={() => setFirstTime(false)} /><b>Já zerei: entro como guia</b></label>
        </fieldset>
      )}

      <fieldset className="cm-form__f cm-spoil"><legend className="kicker">Quem pode entrar</legend>
        {ACCESS.map((a) => <label key={a.k} className={`cm-spoil__o${access === a.k ? ' is-on' : ''}`}><input type="radio" name="acc" checked={access === a.k} onChange={() => setAccess(a.k)} /><b>{a.label}</b><small>{a.hint}</small></label>)}
      </fieldset>
      <div className="club-form__row">
        <label className="cm-form__f"><span className="kicker">Limite de pessoas (opcional)</span><input className="field" type="number" min={2} max={500} value={max} onChange={(e) => setMax(e.target.value)} placeholder="Sem limite" /></label>
        {mine.length > 0 && (
          <label className="cm-form__f"><span className="kicker">Ligar a uma comunidade (opcional)</span>
            <select className="field" value={communityId} onChange={(e) => setCommunityId(e.target.value)}><option value="">Nenhuma</option>{mine.map((c) => <option key={c.id} value={c.id}>w/{c.slug}</option>)}</select>
          </label>
        )}
      </div>
      {err && <p className="awards__error" role="alert">{err}</p>}
      <div className="cm-form__acts"><button className="btn primary" disabled={busy || !ready}>{busy ? 'Gravando…' : editing ? 'Salvar' : 'Criar clube'}</button></div>
    </form>
  );
}

export function ClubNewPage() {
  const signedOut = useStore((s) => s.mode === 'supabase' && !s.profile);
  const games = useStore((s) => s.games);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const q = new URLSearchParams(location.search);
  const slugQ = q.get('jogo');
  const local = slugQ ? Object.values(games).find((g) => g.slug === slugQ) : undefined;
  const [pre, setPre] = useState<GameMini | null>(local ? { id: local.id, slug: local.slug, title: local.title, cover: local.cover } : null);
  useEffect(() => { document.title = 'Criar clube · WinnerZ'; }, []);
  useEffect(() => {
    if (!slugQ || local) return;
    gameBySlug(slugQ).then((g) => g && setPre({ id: g.id, slug: g.slug, title: g.title, cover: g.cover })).catch(() => {});
  }, [slugQ]); // eslint-disable-line react-hooks/exhaustive-deps
  const fmtQ = q.get('formato') as ClubFormat | null;
  const fmt: ClubFormat = fmtQ && FORMATS.some((f) => f.k === fmtQ) ? fmtQ : 'sem_pressa';
  if (signedOut) return <main className="page pad narrow"><h1 className="t big">Criar clube</h1><p className="muted lead">Entre na sua conta para criar um clube.</p><Link className="btn primary" to="/entrar">Entrar</Link></main>;
  const submit = async (d: ClubDraft) => {
    setErr('');
    if (!(await ensureRules())) return;
    setBusy(true);
    try { const c = await clubApi.create(d); await addToJourney(c.game, c.name); navigate(`/clube/${c.slug}`); } catch (e) { setErr(errOf(e)); setBusy(false); }
  };
  return (
    <main className="page pad narrow cm-new">
      <header className="studio__head">
        <Link to="/comunidade/clubes" className="back">← Clubes</Link>
        <h1 className="t big">Criar clube</h1>
        <p className="muted lead">Um grupo que continua: começa com um jogo e pode trocar depois. Quem entra ganha o jogo na Jornada, e o progresso de cada um aparece no clube (se a pessoa deixar).</p>
      </header>
      <ClubForm initial={{ slug: '', name: q.get('nome') ?? '', description: '', format: fmt, gameId: pre?.id ?? null, game: pre, access: 'aberto', maxMembers: null, communityId: null, schedule: null, liveUrl: null, parts: [] }}
        busy={busy} err={err} onSubmit={(d) => void submit(d)} />
    </main>
  );
}

export function ClubEditPage({ slug }: { slug: string }) {
  const isAdmin = useStore((s) => !!s.isAdmin);
  const [c, setC] = useState<Awaited<ReturnType<typeof clubApi.get>> | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { clubApi.get(slug).then(setC).catch(() => setC(null)); }, [slug]);
  if (c === undefined) return <main className="page pad"><p className="faint">Carregando…</p></main>;
  if (!c || 'moved' in c || c.locked || (c.me?.role !== 'dono' && !isAdmin)) return <main className="page pad narrow"><h1 className="t big">Editar</h1><p className="muted lead">Só quem criou o clube pode editar.</p><Link to={`/clube/${slug}`}>Voltar</Link></main>;
  const submit = async (d: ClubDraft) => {
    setBusy(true); setErr('');
    try { await clubApi.update(c.id, d); navigate(`/clube/${c.slug}`); } catch (e) { setErr(errOf(e)); setBusy(false); }
  };
  return (
    <main className="page pad narrow cm-new">
      <header className="studio__head"><Link to={`/clube/${c.slug}`} className="back">← {c.name}</Link><h1 className="t big">Editar</h1></header>
      <ClubForm initial={{ slug: c.slug, name: c.name, description: c.description, format: c.format, gameId: c.game?.id ?? null, game: c.game, access: c.access, maxMembers: c.maxMembers ?? null, communityId: null, schedule: c.schedule ?? null, liveUrl: c.liveUrl ?? null, parts: c.parts }}
        editing={c} busy={busy} err={err} onSubmit={(d) => void submit(d)} />
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* A página do clube (horizonte)                                        */
/* ------------------------------------------------------------------ */
export function ClubPage({ slug }: { slug: string }) {
  const code = new URLSearchParams(location.search).get('c');
  const [c, setC] = useState<ClubFull | ClubLocked | null | undefined>(undefined);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    try {
      const x = await clubApi.get(slug, code);
      if (x && 'moved' in x) { navigate(`/jogatina/${x.moved}${location.hash}`, { replace: true }); return; }
      setC(x);
    } catch (e) { setErr(errOf(e)); setC(null); }
  }, [slug, code]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (c) document.title = `${c.name} · Clubes · WinnerZ`; }, [c]);
  if (c === undefined) return <main className="page pad"><p className="faint">Carregando…</p></main>;
  if (!c) return <main className="page pad narrow"><h1 className="t big">Clube</h1><p className="muted lead">{err || 'Esse clube não existe (ou saiu do ar).'}</p><Link to="/comunidade/clubes">Ver os clubes</Link></main>;
  if (c.locked) return (
    <main className="page pad narrow club-locked">
      <span className={`club-chip club-chip--${c.format}`}>{FORMAT_LABEL[c.format] ?? 'Clube'}</span>
      <h1 className="t big">{c.name}</h1>
      {c.game && <p className="muted">{c.game.title}</p>}
      <div className="soc-empty"><b>{c.access === 'amigos' ? `Este clube é só para os amigos de @${c.owner?.handle ?? 'quem criou'}.` : 'Este clube é por convite.'}</b>
        <p className="muted">{c.access === 'amigos' ? 'Quando vocês se seguirem, você consegue entrar.' : 'Peça o link a quem criou o clube.'}</p>
        {c.access === 'amigos' && c.owner?.handle && <Link className="btn ghost sm" to={`/@${c.owner.handle.toLowerCase()}`}>Ver o perfil de @{c.owner.handle}</Link>}
      </div>
    </main>
  );
  return <ClubView c={c} code={code} reload={load} />;
}

type Tab = 'geral' | 'agenda' | 'memorias' | number;
const tabFromHash = (): Tab => {
  const h = location.hash.slice(1);
  if (h === 'agenda' || h === 'memorias') return h;
  const m = /^parte-(\d+)$/.exec(h); return m ? Number(m[1]) : 'geral';
};

function ClubView({ c, code, reload }: { c: ClubFull; code: string | null; reload: () => Promise<void> }) {
  const isAdmin = useStore((s) => !!s.isAdmin);
  const signedOut = useStore((s) => s.mode === 'supabase' && !s.profile);
  const meId = useStore((s) => (s.mode === 'demo' ? 'demo-me' : s.profile?.id ?? null));
  const me = c.me;
  const owner = me?.role === 'dono';
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [askFirst, setAskFirst] = useState(false);
  const [menu, setMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTabState] = useState<Tab>(tabFromHash);
  const setTab = (t: Tab) => { setTabState(t); history.replaceState(null, '', `${location.pathname}${location.search}${t === 'geral' ? '' : `#${typeof t === 'number' ? `parte-${t}` : t}`}`); };
  useEffect(() => {
    if (!location.hash.startsWith('#m-')) return;
    const id = location.hash.slice(3);
    const m = c.messages.find((x) => x.id === id);
    if (m && m.part !== (typeof tab === 'number' ? tab : 0)) setTabState(m.part || 'geral');
    setTimeout(() => document.getElementById(`m-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 200);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const run = async (f: () => Promise<unknown>) => { setErr(''); setBusy(true); try { await f(); await reload(); void refreshNotifs(); } catch (e) { setErr(errOf(e)); } finally { setBusy(false); } };
  const join = async (firstTime: boolean | null) => {
    if (signedOut) return navigate('/entrar');
    setErr(''); setAskFirst(false);
    if (!(await ensureRules())) return;
    await run(async () => { await clubApi.join(c.slug, code, firstTime); await addToJourney(c.game, c.name); });
  };
  const patchMe = (p: Parameters<typeof clubApi.me>[1]) => run(() => clubApi.me(c.id, p));
  const invite = c.inviteCode ? `${location.origin}/clube/${c.slug}?c=${c.inviteCode}` : `${location.origin}/clube/${c.slug}`;
  const copy = async () => { try { await navigator.clipboard.writeText(invite); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { window.prompt('Copie o link:', invite); } };
  const art = c.game?.backdrop ?? c.game?.cover ?? null;
  const n = c.parts.length;
  const stage = me?.stage ?? 0;
  const since = c.history.length ? (c.history[0].endedAt ?? c.createdAt) : c.createdAt;
  const people = useMemo(() => c.people.filter((p) => p.handle && !p.gone && p.id !== meId).map((p) => p.handle!), [c.people, meId]);
  const fmt = FORMATS.find((f) => f.k === c.format);

  return (
    <main className={`club2 club--${c.format}`}>
      <section className="club2-hero">
        {art && <img className="club2-hero__bg" src={art} alt="" aria-hidden="true" />}
        <div className="club2-hero__shade" aria-hidden="true" />
        <div className="page club2-hero__in">
          <Link to="/comunidade/clubes" className="back cm-hero__back">← Clubes</Link>
          <span className="club2-hero__kicker mono">Clube · ritmo {fmt?.label.toLowerCase()}{c.community ? <> · ligado a <Link to={`/w/${c.community.slug}`}>w/{c.community.slug}</Link></> : null}{c.access !== 'aberto' ? ` · ${c.access === 'amigos' ? 'só amigos' : 'por convite'}` : ''}</span>
          <h1 className="t club2-hero__t">{c.name}</h1>
          <div className="club2-hero__row">
            <p className="club2-hero__sub">
              Jogo atual: {c.game ? <Link to={`/jogos/${c.game.slug}`}>{c.game.title}</Link> : '—'}, desde {dateOf(since)} · {c.members} {c.members === 1 ? 'pessoa' : 'pessoas'}{c.maxMembers ? ` de ${c.maxMembers}` : ''}{c.owner?.handle ? <> · criado por <Link to={`/@${c.owner.handle.toLowerCase()}`}>@{c.owner.handle}</Link></> : null}
              {c.schedule && <><br /><span className="club2-hero__sched"><Icon name="calendario" size={14} /> {c.schedule}</span></>}
            </p>
            <div className="club2-hero__acts">
              {!me && c.invitedBy && <span className="jog-answer__invited club2-hero__invited"><PersonAvatar p={c.invitedBy} size={22} /><span><b>@{c.invitedBy.handle ?? 'alguém'}</b> convidou você.</span></span>}
              {!me && (c.format === 'primeira_vez'
                ? (askFirst
                  ? <><button className="btn primary" disabled={busy} onClick={() => void join(true)}>É a minha primeira vez</button><button className="btn ghost" disabled={busy} onClick={() => void join(false)}>Já zerei: entro como guia</button></>
                  : <button className="btn primary" disabled={busy} onClick={() => (signedOut ? navigate('/entrar') : setAskFirst(true))}>Entrar no clube</button>)
                : <button className="btn primary" disabled={busy} onClick={() => void join(null)}>Entrar no clube</button>)}
              {me && (
                <span className="club2-menu">
                  <button className="btn ghost" aria-expanded={menu} onClick={() => setMenu((x) => !x)}>Você está no clube <Icon name="check" size={14} /></button>
                  {menu && (
                    <span className="club2-menu__pop" role="menu">
                      <button role="menuitem" onClick={() => { setMenu(false); void copy(); }}>{copied ? 'Link copiado' : 'Copiar o convite'}</button>
                      {(owner || isAdmin) && <Link role="menuitem" to={`/clube/${c.slug}/editar`}>Editar o clube</Link>}
                      {!owner && <button role="menuitem" onClick={() => { setMenu(false); void run(() => clubApi.leave(c.id)); }}>Sair do clube</button>}
                    </span>
                  )}
                </span>
              )}
              {me && n > 0 && stage < n && <button className="btn primary" disabled={busy} onClick={() => void patchMe({ stage: stage + 1 })}>Passei da parte {stage + 1}</button>}
              {me && c.format === 'primeira_vez' && me.firstTime && !me.finishedAt && <button className="btn primary" disabled={busy} onClick={() => void patchMe({ finished: true })}>Zerei!</button>}
            </div>
          </div>
          {c.hidden && <p className="cm-hero__hidden">Fora do ar por decisão da moderação. Só você ainda consegue abrir.</p>}
          {err && <p className="awards__error" role="alert">{err}</p>}
        </div>
      </section>

      {n > 0 && <Horizon c={c} onUndo={() => void patchMe({ stage: Math.max(0, stage - 1) })} />}
      {c.format === 'primeira_vez' && me && <div className="page"><FirstTimeBar c={c} onFinish={(v) => void patchMe({ finished: v })} /></div>}

      <nav className="club2-tabs" aria-label="Seções do clube">
        <div className="page club2-tabs__in" role="tablist">
          <button role="tab" aria-selected={tab === 'geral'} onClick={() => setTab('geral')}>Conversa geral</button>
          {c.parts.map((p) => {
            const open = !!me && stage >= p.ordinal;
            return <button key={p.ordinal} role="tab" aria-selected={tab === p.ordinal} onClick={() => setTab(p.ordinal)} title={p.title}>{!open && <Icon name="cadeado" size={12} />}Parte {p.ordinal}</button>;
          })}
          <button role="tab" aria-selected={tab === 'agenda'} onClick={() => setTab('agenda')}>Agenda{c.agenda.length ? <small className="mono"> {c.agenda.length}</small> : null}</button>
          <button role="tab" aria-selected={tab === 'memorias'} onClick={() => setTab('memorias')}>Memórias</button>
        </div>
      </nav>

      <div className="page club__grid club2__grid">
        <div className="club__main">
          {tab === 'agenda' ? <AgendaTab c={c} />
            : tab === 'memorias' ? <MemoriesTab c={c} />
              : <ClubConversation c={c} part={tab === 'geral' ? 0 : tab} people={people} reload={reload} />}
        </div>
        <aside className="club__side">
          <NextCard c={c} reload={reload} />
          <section className="cm-side">
            <span className="kicker">Ritmo do clube</span>
            <p className="muted">{fmt?.side}</p>
            {c.liveUrl && <a className="cm-link" href={safeHref(c.liveUrl)} target="_blank" rel="noopener noreferrer nofollow">{/discord/.test(c.liveUrl) ? 'Discord do clube' : 'Link do clube'} ↗</a>}
          </section>
          {me && <InviteCard c={c} reload={reload} copy={copy} copied={copied} />}
          <AfterCard c={c} owner={owner || isAdmin} reload={reload} />
          <People c={c} />
          <section className="cm-side cm-side--quiet">
            <p className="faint">Valem as <Link to="/regras">regras do WinnerZ</Link>. Ao entrar, o jogo vai para a sua Jornada; o seu progresso aparece aqui só se a sua Jornada estiver aberta.</p>
            {!me && <button className="cm-link" onClick={() => void copy()}>{copied ? 'Link copiado' : 'Copiar o link do clube'}</button>}
            {!owner && c.owner?.handle && <ReportButton kind="clube" handle={c.owner.handle} refId={c.id} snapshot={{ title: c.name, slug: c.slug, description: c.description, game: c.game?.title }} what={`O clube “${c.name}”: o nome e a descrição.`} label="Denunciar o clube" className="cm-side__report" />}
          </section>
        </aside>
      </div>
    </main>
  );
}

/* ---- O horizonte: as partes como marcos, cada pessoa na altura em que está ---- */
function Horizon({ c, onUndo }: { c: ClubFull; onUndo: () => void }) {
  const progressOf = useProgressOf();
  const meId = useStore((s) => (s.mode === 'demo' ? 'demo-me' : s.profile?.id ?? null));
  const me = c.me;
  const n = c.parts.length;
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: TZ });
  const pos = (i: number) => ((i + 0.5) / n) * 100;
  /** Onde a pessoa está: na parte que está jogando (a seguinte à última que passou). */
  const at = (stage: number) => Math.min(n, stage + 1);
  const mine = me ? at(me.stage) : 0;
  const box = useRef<HTMLDivElement>(null);
  // No celular o horizonte rola de lado: começa mostrando onde você está.
  useEffect(() => {
    const el = box.current; const m = el?.querySelector<HTMLElement>('.club2-hz__m.is-me');
    if (el && m && el.scrollWidth > el.clientWidth) el.scrollLeft = Math.max(0, m.offsetLeft - el.clientWidth / 2);
  }, [mine]);
  const prog = (p: ClubPerson) => {
    if (p.id === meId && c.game) { const x = progressOf(c.game.id); return x ? (x.completed ? 'zerou' : `${x.progress ?? 0}%`) : null; }
    return p.journey?.completed ? 'zerou' : p.journey?.progress != null ? `${p.journey.progress}%` : null;
  };
  return (
    <section className="club2-hz" aria-label="Onde cada um está">
      <div className="page club2-hz__in" ref={box}>
        <div className="club2-hz__people">
          {c.parts.map((p) => {
            const here = c.people.filter((x) => at(x.stage) === p.ordinal);
            return (
              <span key={p.ordinal} className="club2-hz__who" style={{ left: `${pos(p.ordinal - 1)}%` }}>
                {here.slice(0, 4).map((x) => {
                  const done = x.stage >= n;
                  const pr = prog(x);
                  return <span key={x.id} className={`club2-hz__p${x.id === meId ? ' is-me' : ''}`}><PersonAvatar p={x} size={22} /><small>{x.id === meId ? 'você' : `@${x.handle ?? '?'}`}{done ? ' zerou' : pr ? ` · ${pr}` : ''}</small></span>;
                })}
                {here.length > 4 && <small className="faint">+{here.length - 4}</small>}
              </span>
            );
          })}
        </div>
        <div className="club2-hz__line" aria-hidden="true"><span style={{ width: me ? `${me.stage >= n ? 100 : pos(mine - 1)}%` : 0 }} /></div>
        <ol className="club2-hz__marks">
          {c.parts.map((p) => {
            const passed = !!me && me.stage >= p.ordinal;
            const isMe = !!me && mine === p.ordinal && me.stage < n;
            const due = p.suggestedOn === today;
            const waiting = c.hiddenParts[String(p.ordinal)];
            return (
              <li key={p.ordinal} className={`club2-hz__m${passed ? ' is-done' : ''}${isMe ? ' is-me' : ''}`} style={{ left: `${pos(p.ordinal - 1)}%` }}>
                <span className="club2-hz__dot" aria-hidden="true" />
                <span className="mono club2-hz__k">{String(p.ordinal).padStart(2, '0')} · {passed ? 'passou' : isMe ? 'você' : due ? 'sugerida hoje' : p.suggestedOn ? dateShort(p.suggestedOn) : 'sem data'}</span>
                <b>{p.title}</b>
                {!passed && waiting ? <small className="faint"><Icon name="cadeado" size={11} /> {waiting} {waiting === 1 ? 'mensagem esperando' : 'mensagens esperando'}</small> : null}
              </li>
            );
          })}
        </ol>
        {me && me.stage > 0 && <button className="cm-link club2-hz__undo" onClick={onUndo}>Desmarcar a parte {me.stage}</button>}
        {!me && <p className="faint club2-hz__note">Entre no clube para marcar onde você está e abrir a conversa de cada parte.</p>}
      </div>
    </section>
  );
}

/* ---- Primeira vez: guia ou primeira vez, e o "zerei" ---- */
function FirstTimeBar({ c, onFinish }: { c: ClubFull; onFinish: (v: boolean) => void }) {
  const me = c.me!;
  const finished = c.people.filter((p) => p.firstTime && p.finishedAt);
  return (
    <section className="club-first">
      <div className="club-first__me">
        {me.firstTime ? (
          me.finishedAt
            ? <><span className="club-first__star" aria-hidden="true">★</span><p><b>Você zerou pela primeira vez.</b> Agora pode ajudar quem está começando.</p><button className="btn quiet sm" onClick={() => onFinish(false)}>Desfazer</button></>
            : <p>Você está aqui pela <b>primeira vez</b>. Pergunte à vontade: os guias respondem sem entregar a história.</p>
        ) : <p>Você é <b>guia</b> neste clube: responda sem spoiler. Se precisar contar algo, esconda o trecho entre <span className="mono">||barras||</span>.</p>}
      </div>
      {finished.length > 0 && (
        <div className="club-first__stars">
          <span className="kicker">Zeraram pela primeira vez aqui</span>
          <ul>{finished.map((p) => <li key={p.id}><PersonLink p={p} /><small className="faint">{ago(p.finishedAt)}</small></li>)}</ul>
        </div>
      )}
    </section>
  );
}

/* ---- Conversa (geral ou de uma parte) ---- */
function ClubConversation({ c, part, people, reload }: { c: ClubFull; part: number; people: string[]; reload: () => Promise<void> }) {
  const isAdmin = useStore((s) => !!s.isAdmin);
  const me = c.me;
  const isFirst = c.format === 'primeira_vez' && me?.firstTime !== false;
  const locked = part > 0 && (!me || me.stage < part) && !isAdmin;
  const list = c.messages.filter((m) => m.part === part);
  const tops = list.filter((m) => !m.parentId);
  const guides = useMemo(() => new Set(c.people.filter((p) => p.firstTime === false).map((p) => p.id)), [c.people]);
  const questions = c.format === 'primeira_vez' ? tops.filter((m) => m.question) : [];
  const rest = c.format === 'primeira_vez' ? tops.filter((m) => !m.question) : tops;
  const pt = c.parts.find((p) => p.ordinal === part);
  const ctx: ChatCtx = {
    where: clubLabel(c.name), report: { slug: c.slug, club: c.slug }, game: c.game, canWrite: !!me, people,
    guides: c.format === 'primeira_vez' ? guides : undefined,
    linkFor: (id) => `${location.origin}/clube/${c.slug}#m-${id}`,
    send: (parent, body, q, images) => clubApi.message(c.id, part, parent, body, q, images),
    edit: (id, body) => clubApi.editMessage(id, body), del: (id) => clubApi.deleteMessage(id), reload,
  };
  const guideHint = !isFirst && c.format === 'primeira_vez' ? 'Guia: esconda o que entrega a história entre ||barras||.' : undefined;
  return (
    <section className="cm-thread club-thread" id="conversa" aria-labelledby="club-thread-t">
      <h2 id="club-thread-t" className="club__h">{part > 0 ? `Parte ${part}${pt ? `: ${pt.title}` : ''}` : c.format === 'primeira_vez' ? 'Perguntas e conversa' : 'Conversa geral'}</h2>
      {locked ? (
        <div className="cm-shield"><Icon name="cadeado" size={20} /><p><b>A conversa da parte {part} está trancada para você.</b> {me ? `Marque "Passei da parte" até a ${part} para abrir; assim ninguém leva spoiler de quem está na frente.` : 'Entre no clube e marque onde você está.'}{c.hiddenParts[String(part)] ? ` ${c.hiddenParts[String(part)]} ${c.hiddenParts[String(part)] === 1 ? 'mensagem esperando' : 'mensagens esperando'}.` : ''}</p></div>
      ) : (
        <>
          {!me && <p className="cm-thread__login">Entre no clube para participar da conversa.</p>}
          <GroupChat ctx={ctx} messages={list} replyHint={guideHint}
            composer={{ placeholder: isFirst ? 'Pergunte o que quiser: os guias respondem sem spoiler' : part > 0 ? `Sobre a parte ${part}: pode falar sem medo, só quem passou dela vê` : 'Escreva para o clube', question: isFirst, questionToggle: c.format === 'primeira_vez', hint: guideHint }}
            sections={[{ key: 'q', title: questions.length ? 'Perguntas' : undefined, tops: questions }, { key: 'c', title: questions.length && rest.length ? 'Conversa' : undefined, tops: rest }]}
            empty={part > 0 ? 'Ninguém escreveu sobre esta parte ainda.' : 'Nada por aqui ainda.'} />
        </>
      )}
    </section>
  );
}

/* ---- Agenda: as jogatinas do clube ---- */
function AgendaTab({ c }: { c: ClubFull }) {
  return (
    <section className="club-agenda" aria-labelledby="club-agenda-t">
      <div className="club2-sechead">
        <h2 id="club-agenda-t" className="club__h">Agenda do clube</h2>
        {c.me && <Link className="btn primary sm" to={`/jogatina/criar?clube=${c.slug}&jogo=${encodeURIComponent(c.game?.slug ?? '')}`}>Marcar jogatina do clube</Link>}
      </div>
      {c.schedule && <p className="muted"><Icon name="calendario" size={14} /> Combinado: {c.schedule}</p>}
      {c.agenda.length === 0
        ? <div className="soc-empty"><p className="muted">Nada marcado ainda.{c.me ? ' Marque a próxima noite do clube: quem está no clube vê e confirma.' : ''}</p></div>
        : <div className="jog-cards">{c.agenda.map((j) => <JogatinaTile key={j.id} j={j} />)}</div>}
    </section>
  );
}

/* ---- Memórias: jogatinas que já aconteceram e os jogos anteriores ---- */
function MemoriesTab({ c }: { c: ClubFull }) {
  const [past, setPast] = useState<Jogatina[] | null>(null);
  useEffect(() => { jogatinaApi.list('passadas', { club: c.slug }).then(setPast).catch(() => setPast([])); }, [c.slug]);
  return (
    <section className="club-mem" aria-labelledby="club-mem-t">
      <h2 id="club-mem-t" className="club__h">Memórias</h2>
      <h3 className="club__h3">Noites que aconteceram</h3>
      {past == null ? <p className="faint">Carregando…</p> : past.length === 0
        ? <p className="muted">Nenhuma jogatina do clube aconteceu ainda.</p>
        : <div className="jog-cards">{past.map((j) => <JogatinaTile key={j.id} j={j} />)}</div>}
      <h3 className="club__h3">Jogos do clube</h3>
      <ol className="club-rounds">
        <li className="club-round is-now">
          <span className="club-round__cv">{c.game ? <CoverArt game={{ title: c.game.title, cover: c.game.cover ?? '' }} /> : null}</span>
          <span><b>{c.game?.title}</b><small className="faint">Agora · desde {dateOf(c.history[0]?.endedAt ?? c.createdAt)}</small></span>
        </li>
        {c.history.map((r) => (
          <li key={r.round} className="club-round">
            <span className="club-round__cv">{r.game ? <CoverArt game={{ title: r.game.title, cover: r.game.cover ?? '' }} /> : null}</span>
            <span><b>{r.game?.title ?? 'Jogo'}</b><small className="faint">{dateOf(r.startedAt)} a {dateOf(r.endedAt)} · {r.messages} {r.messages === 1 ? 'conversa' : 'conversas'} · {r.jogatinas} {r.jogatinas === 1 ? 'jogatina' : 'jogatinas'}</small></span>
          </li>
        ))}
      </ol>
      {c.history.length === 0 && <p className="faint">Quando o clube trocar de jogo, o anterior fica guardado aqui.</p>}
    </section>
  );
}

/* ---- Lateral: a próxima jogatina ---- */
function NextCard({ c, reload }: { c: ClubFull; reload: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const j = c.agenda[0];
  if (!j) return (
    <section className="cm-side club2-next is-empty">
      <span className="kicker">Agenda do clube</span>
      <p className="muted">Nada marcado.{c.schedule ? ` O combinado é ${c.schedule.toLowerCase()}.` : ''}</p>
      {c.me && <Link className="btn ghost sm" to={`/jogatina/criar?clube=${c.slug}&jogo=${encodeURIComponent(c.game?.slug ?? '')}`}>Marcar jogatina</Link>}
    </section>
  );
  const vou = async () => {
    setBusy(true); setErr('');
    try { if (!(await ensureRules())) return; await jogatinaApi.rsvp(j.id, null, 'vou'); await reload(); } catch (e) { setErr(errOf(e)); } finally { setBusy(false); }
  };
  return (
    <section className="cm-side club2-next">
      <span className="kicker">Agenda do clube</span>
      <Link to={`/jogatina/${j.id}`} className="club2-next__t">{j.title}</Link>
      <small className="muted">{whenLabel(j.startsAt)} · {j.going} {j.going === 1 ? 'vai' : 'vão'}{j.platform ? ` · ${j.platform}` : ''}</small>
      {c.me && (j.me?.rsvp === 'vou'
        ? <span className="club2-next__ok"><Icon name="check" size={14} /> Você vai</span>
        : <button className="btn primary sm" disabled={busy} onClick={() => void vou()}>Vou</button>)}
      {err && <p className="awards__error" role="alert">{err}</p>}
      {c.agenda.length > 1 && <small className="faint">e mais {c.agenda.length - 1} na agenda</small>}
    </section>
  );
}

/* ---- Lateral: convidar pelo @ ---- */
function InviteCard({ c, reload, copy, copied }: { c: ClubFull; reload: () => Promise<void>; copy: () => Promise<void>; copied: boolean }) {
  const [handles, setHandles] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const send = async () => {
    setBusy(true); setErr('');
    try { setNote(inviteSummary(await clubApi.invite(c.id, handles))); setHandles([]); await reload(); } catch (e) { setErr(errOf(e)); } finally { setBusy(false); }
  };
  return (
    <section className="cm-side">
      <span className="kicker">Convidar</span>
      <p className="muted">Pelo @: a pessoa recebe o aviso e consegue entrar{c.access !== 'aberto' ? `, mesmo o clube sendo ${c.access === 'amigos' ? 'só para amigos' : 'por convite'}` : ''}.</p>
      <InviteBox value={handles} onChange={setHandles} exclude={c.people.map((p) => (p.handle ?? '').toLowerCase())} />
      {note && <p className="jog-invite__note" role="status"><Icon name="check" size={14} /> {note}</p>}
      {err && <p className="awards__error" role="alert">{err}</p>}
      <span className="jog-invite__acts">
        <button className="btn primary sm" disabled={busy || !handles.length} onClick={() => void send()}>{handles.length > 1 ? `Convidar ${handles.length}` : 'Convidar'}</button>
        <button className="btn ghost sm" onClick={() => void copy()}>{copied ? 'Link copiado' : 'Copiar o link'}</button>
      </span>
    </section>
  );
}

/* ---- Lateral: depois deste jogo (trocar o jogo atual) ---- */
function AfterCard({ c, owner, reload }: { c: ClubFull; owner: boolean; reload: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [game, setGame] = useState<GameMini | null>(null);
  const [parts, setParts] = useState<ClubPart[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const save = async () => {
    if (!game) return;
    setBusy(true); setErr('');
    try { await clubApi.setGame(c.id, game.id, parts.filter((p) => p.title.trim()).map((p, i) => ({ ...p, ordinal: i + 1 }))); await addToJourney(game, c.name); setOpen(false); setGame(null); setParts([]); await reload(); }
    catch (e) { setErr(errOf(e)); } finally { setBusy(false); }
  };
  return (
    <section className="cm-side">
      <span className="kicker">Depois de {c.game?.title ?? 'este jogo'}</span>
      <p className="muted">{owner ? 'Quando o grupo decidir o próximo, troque o jogo: começa uma rodada nova e a conversa deste fica guardada nas memórias.' : 'Quem criou o clube troca o jogo quando o grupo decidir; as memórias deste ficam guardadas no clube.'}</p>
      {owner && !open && <button className="btn ghost sm" onClick={() => setOpen(true)}>Trocar o jogo</button>}
      {owner && open && (
        <div className="club2-swap">
          <GameSearchPick value={game} onChange={setGame} label="Próximo jogo do clube" />
          <PartsEditor parts={parts} setParts={setParts} hint="Partes do novo jogo (opcional). Cada pessoa recomeça do zero." />
          {err && <p className="awards__error" role="alert">{err}</p>}
          <span className="cm-compose__acts"><button className="btn quiet sm" onClick={() => setOpen(false)}>Cancelar</button><button className="btn primary sm" disabled={busy || !game || game.id === c.game?.id} onClick={() => void save()}>{busy ? 'Trocando…' : 'Começar o novo jogo'}</button></span>
        </div>
      )}
    </section>
  );
}

/* ---- Pessoas ---- */
function People({ c }: { c: ClubFull }) {
  const progressOf = useProgressOf();
  const meId = useStore((s) => (s.mode === 'demo' ? 'demo-me' : s.profile?.id ?? null));
  const prog = (p: ClubPerson) => {
    if (p.id === meId && c.game) { const x = progressOf(c.game.id); return x ? (x.completed ? 'zerou' : `${x.progress ?? 0}%`) : null; }
    if (!p.journey || p.journey.progress == null && !p.journey.completed) return null;
    return p.journey.completed ? 'zerou' : `${p.journey.progress ?? 0}%`;
  };
  const groups: [string, ClubPerson[]][] = c.format === 'primeira_vez'
    ? [['Guias', c.people.filter((p) => p.firstTime === false)], ['Primeira vez', c.people.filter((p) => p.firstTime !== false)]]
    : [['Quem está no clube', c.people]];
  return (
    <section className="cm-side club-people">
      {groups.filter(([, l]) => l.length).map(([t, l]) => (
        <div key={t} className="club-people__g">
          <span className="kicker">{t} · {l.length}</span>
          <ul>
            {l.map((p) => {
              const pr = prog(p);
              return (
                <li key={p.id}>
                  <PersonLink p={p} />
                  {p.role === 'dono' && <span className="cm-badge cm-badge--op">Criou</span>}
                  {c.format === 'primeira_vez' && p.firstTime === false && <span className="cm-badge club-badge--guia">Guia</span>}
                  {c.parts.length > 0 && <small className="faint">{p.stage >= c.parts.length ? 'terminou' : p.stage ? `passou da ${p.stage}` : 'começando'}</small>}
                  {pr && <small className="mono faint club-people__pr">{pr}</small>}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {c.members > c.people.length && <small className="faint">e mais {c.members - c.people.length}</small>}
    </section>
  );
}
